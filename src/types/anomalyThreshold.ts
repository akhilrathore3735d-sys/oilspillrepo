/**
 * OILWATCH - Anomaly Threshold Configuration & Types
 * Multi-tier anomaly detection sensitivity for maritime vessel & AIS monitoring
 */

export enum AnomalyStrictness {
  HIGH = "high",                      // Only confirmed dark ships (>300 GT), severe anomalies
  BALANCED = "balanced",              // Default - standard SOLAS compliance & moderate sensitivity
  HIGH_SENSITIVITY = "high_sensitivity", // Catch-all - flags minor latency and small discrepancies
}

export interface AnomalyThresholdConfig {
  strictness: AnomalyStrictness;
  minAisGapMinutes: number;
  maxHeadingChangeDegreesPerHour: number;
  maxSpeedDeltaKnots: number;
  minVesselGTForDarkShipFlag: number;
  maxAisSearchRadiusNm: number;
}

export const ANOMALY_THRESHOLDS: Record<AnomalyStrictness, AnomalyThresholdConfig> = {
  [AnomalyStrictness.HIGH]: {
    strictness: AnomalyStrictness.HIGH,
    minAisGapMinutes: 300, // 5 hours
    maxHeadingChangeDegreesPerHour: 45,
    maxSpeedDeltaKnots: 5.0,
    minVesselGTForDarkShipFlag: 300, // Large commercial vessels under mandatory SOLAS Chapter V
    maxAisSearchRadiusNm: 15,
  },
  [AnomalyStrictness.BALANCED]: {
    strictness: AnomalyStrictness.BALANCED,
    minAisGapMinutes: 30, // 30 minutes
    maxHeadingChangeDegreesPerHour: 30,
    maxSpeedDeltaKnots: 3.0,
    minVesselGTForDarkShipFlag: 50,
    maxAisSearchRadiusNm: 30,
  },
  [AnomalyStrictness.HIGH_SENSITIVITY]: {
    strictness: AnomalyStrictness.HIGH_SENSITIVITY,
    minAisGapMinutes: 5, // 5 minutes
    maxHeadingChangeDegreesPerHour: 15,
    maxSpeedDeltaKnots: 1.0,
    minVesselGTForDarkShipFlag: 0, // Any vessel, including artisanal / small crafts
    maxAisSearchRadiusNm: 50,
  },
};

export type AnomalyType =
  | "dark_ship"
  | "spoofing"
  | "speed_anomaly"
  | "heading_anomaly"
  | "ais_gap"
  | "position_jump";

export type AnomalySeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface AnomalyFlag {
  type: AnomalyType;
  severity: AnomalySeverity;
  confidence: number; // 0-1
  description: string;
  timestamp?: string | Date;
  metadata?: Record<string, any>;
}
