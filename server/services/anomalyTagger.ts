/**
 * OILWATCH - Anomaly Tagger Service
 * Evaluates AIS time-series records against multi-tier strictness thresholds
 */

import { AISRecord } from "../../src/types/hindcast";
import {
  AnomalyFlag,
  AnomalyStrictness,
  AnomalyThresholdConfig,
  ANOMALY_THRESHOLDS,
} from "../../src/types/anomalyThreshold";

/**
 * Calculates great-circle distance between two coordinates in nautical miles
 */
export function haversineDistanceNm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3440.065; // Earth radius in nautical miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Angular difference between two headings (0-180 degrees)
 */
export function angularDeltaDeg(h1: number, h2: number): number {
  const diff = Math.abs((h1 % 360) - (h2 % 360));
  return Math.min(diff, 360 - diff);
}

export function flagAnomalies(
  records: AISRecord[],
  configOrStrictness?: AnomalyThresholdConfig | AnomalyStrictness | string
): AnomalyFlag[] {
  let config: AnomalyThresholdConfig = ANOMALY_THRESHOLDS[AnomalyStrictness.BALANCED];
  if (typeof configOrStrictness === "string") {
    const key = (configOrStrictness.toLowerCase() as AnomalyStrictness) || AnomalyStrictness.BALANCED;
    config = ANOMALY_THRESHOLDS[key] || ANOMALY_THRESHOLDS[AnomalyStrictness.BALANCED];
  } else if (configOrStrictness && typeof configOrStrictness === "object" && "strictness" in configOrStrictness) {
    config = configOrStrictness;
  }

  const flags: AnomalyFlag[] = [];
  if (!records || records.length < 2) {
    if (records.length === 0) {
      flags.push({
        type: "dark_ship",
        severity: "HIGH",
        confidence: 0.95,
        description: "Zero AIS records available during observation window (Complete dark ship blackout)",
      });
    }
    return flags;
  }

  // Sort ascending by timestamp
  const sorted = [...records].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];

    const prevTime = new Date(prev.timestamp).getTime();
    const currTime = new Date(curr.timestamp).getTime();
    const deltaMs = currTime - prevTime;
    const deltaMinutes = deltaMs / (60 * 1000);
    const deltaHours = deltaMs / (3600 * 1000);

    // Skip invalid time reverses
    if (deltaMinutes <= 0) continue;

    // 1. AIS Transmission Blackout / Gap Check
    if (deltaMinutes > config.minAisGapMinutes) {
      const vesselGT = curr.grossTonnage || prev.grossTonnage || 10000;
      const isSolasMandated = vesselGT >= config.minVesselGTForDarkShipFlag;

      if (isSolasMandated && deltaMinutes >= 120) {
        flags.push({
          type: "dark_ship",
          severity: deltaMinutes > 240 ? "CRITICAL" : "HIGH",
          confidence: 0.92,
          description: `Dark ship blackout: Transponder deactivated for ${(deltaMinutes / 60).toFixed(
            1
          )} hrs while in transit (IMO SOLAS Chapter V violation)`,
          timestamp: prev.timestamp,
          metadata: { gapMinutes: deltaMinutes, lastPosition: [prev.latitude, prev.longitude] },
        });
      } else {
        flags.push({
          type: "ais_gap",
          severity: deltaMinutes > 60 ? "MEDIUM" : "LOW",
          confidence: 0.85,
          description: `Transmission latency gap: No broadcast for ${Math.round(deltaMinutes)} minutes`,
          timestamp: prev.timestamp,
          metadata: { gapMinutes: deltaMinutes },
        });
      }
    }

    // 2. Kinematic Distance & Position Jump / Spoofing Check
    const distNm = haversineDistanceNm(prev.latitude, prev.longitude, curr.latitude, curr.longitude);
    const impliedSpeedKnots = deltaHours > 0 ? distNm / deltaHours : 0;

    if (distNm > 10 && impliedSpeedKnots > 35) {
      flags.push({
        type: "position_jump",
        severity: "CRITICAL",
        confidence: 0.94,
        description: `Unrealistic position jump: ${distNm.toFixed(1)} NM jump in ${Math.round(
          deltaMinutes
        )} min (implied speed: ${impliedSpeedKnots.toFixed(1)} kts - GNSS spoofing indicator)`,
        timestamp: curr.timestamp,
        metadata: { distNm, impliedSpeedKnots },
      });
    }

    // 3. Speed Delta Anomaly
    const speedDelta = Math.abs(curr.speed - prev.speed);
    if (speedDelta > config.maxSpeedDeltaKnots && deltaHours <= 2) {
      flags.push({
        type: "speed_anomaly",
        severity: speedDelta > 8 ? "HIGH" : "MEDIUM",
        confidence: 0.88,
        description: `Rapid kinematic speed shift: Speed surged by ${speedDelta.toFixed(1)} kts (from ${prev.speed} to ${
          curr.speed
        } kts)`,
        timestamp: curr.timestamp,
        metadata: { speedDelta, prevSpeed: prev.speed, currSpeed: curr.speed },
      });
    }

    // 4. Heading Change / Course Deviation Anomaly
    const headingDelta = angularDeltaDeg(prev.heading, curr.heading);
    const headingRatePerHour = deltaHours > 0 ? headingDelta / deltaHours : headingDelta;

    if (headingRatePerHour > config.maxHeadingChangeDegreesPerHour && curr.speed > 3) {
      flags.push({
        type: "heading_anomaly",
        severity: headingDelta > 90 ? "HIGH" : "MEDIUM",
        confidence: 0.86,
        description: `Abrupt course deviation: Heading altered by ${headingDelta.toFixed(0)}° at rate of ${headingRatePerHour.toFixed(
          0
        )}°/hr underway`,
        timestamp: curr.timestamp,
        metadata: { headingDelta, headingRatePerHour },
      });
    }
  }

  return flags;
}
