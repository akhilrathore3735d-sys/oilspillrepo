import { GoogleGenAI } from "@google/genai";

export interface SatelliteDetectionInput {
  timestamp: string;
  location: string;
  vessel_type: string;
  length: string | number;
  heading: string | number;
  speed_estimate: string | number;
  confidence: string | number;
}

export interface AisCorrelationInput {
  matched_vessel: string;
  ais_heading?: string | number | null;
  ais_speed?: string | number | null;
  last_ais_report?: string | null;
  status: "ACTIVE" | "INACTIVE" | "MISSING" | string;
}

export interface VesselAnomalyAnalysisResult {
  ais_consistent: boolean;
  discrepancies: string[];
  dark_ship_likelihood: string;
  spoofing_likelihood: string;
  anomalies_detected: string[];
  risk_level: number;
  reason: string;
  recommended_actions: string[];
}

/**
 * Checks if a string contains unpopulated template tokens like [DATE TIME], [LAT, LON]
 */
function isTemplateToken(val: any): boolean {
  if (typeof val !== "string") return false;
  const trimmed = val.trim();
  return (
    (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
    trimmed === "DATE TIME" ||
    trimmed === "LAT, LON" ||
    trimmed === "TYPE" ||
    trimmed === "METERS" ||
    trimmed === "DEGREES" ||
    trimmed === "KNOTS"
  );
}

/**
 * Calculate angular difference in degrees (0 to 180)
 */
function getAngularDelta(deg1: number, deg2: number): number {
  const diff = Math.abs((deg1 % 360) - (deg2 % 360));
  return Math.min(diff, 360 - diff);
}

/**
 * Deterministic rule-based anomaly analyzer grounded in IMO SOLAS maritime regulations
 */
export function analyzeVesselAnomalyRuleBased(
  sat: SatelliteDetectionInput,
  ais: AisCorrelationInput
): VesselAnomalyAnalysisResult {
  // 1. Check for unpopulated template placeholders
  const hasTemplateTokens =
    isTemplateToken(sat.timestamp) ||
    isTemplateToken(sat.location) ||
    isTemplateToken(sat.vessel_type) ||
    isTemplateToken(sat.length) ||
    isTemplateToken(sat.heading) ||
    isTemplateToken(sat.speed_estimate);

  if (hasTemplateTokens) {
    return {
      ais_consistent: false,
      discrepancies: [
        "Input parameters contain unpopulated template placeholders ([DATE TIME], [LAT, LON], [TYPE], [METERS], [DEGREES], [KNOTS])",
        "AIS transponder record status unverified / pending concrete MMSI or broadcast report",
      ],
      dark_ship_likelihood: "0%",
      spoofing_likelihood: "0%",
      anomalies_detected: ["Unpopulated observation telemetry"],
      risk_level: 1,
      reason:
        "The submitted detection contains schema placeholder tokens rather than observed satellite SAR/optical measurements and transponder reports. Anomaly classification, kinematic discrepancy scoring, and dark-ship probability require numerical coordinates, radar-derived dimensions, kinematics (SOG/COG), and AIS transceiver status.",
      recommended_actions: [
        "Populate specific satellite detection coordinates (lat/lon), length, heading, and radar Doppler speed estimate",
        "Provide the corresponding AIS broadcast record (MMSI, reported SOG/COG, last transmission timestamp, and navigational status)",
      ],
    };
  }

  // Parse numerical parameters
  const satLength = typeof sat.length === "number" ? sat.length : parseFloat(String(sat.length).replace(/[^0-9.]/g, "")) || 0;
  const satHeading = typeof sat.heading === "number" ? sat.heading : parseFloat(String(sat.heading).replace(/[^0-9.]/g, "")) || 0;
  const satSpeed = typeof sat.speed_estimate === "number" ? sat.speed_estimate : parseFloat(String(sat.speed_estimate).replace(/[^0-9.]/g, "")) || 0;
  const satConf = typeof sat.confidence === "number" ? sat.confidence : parseFloat(String(sat.confidence).replace(/[^0-9.]/g, "")) || 85;

  const aisHeading =
    ais.ais_heading !== undefined && ais.ais_heading !== null && !isTemplateToken(ais.ais_heading)
      ? typeof ais.ais_heading === "number"
        ? ais.ais_heading
        : parseFloat(String(ais.ais_heading).replace(/[^0-9.]/g, ""))
      : null;

  const aisSpeed =
    ais.ais_speed !== undefined && ais.ais_speed !== null && !isTemplateToken(ais.ais_speed)
      ? typeof ais.ais_speed === "number"
        ? ais.ais_speed
        : parseFloat(String(ais.ais_speed).replace(/[^0-9.]/g, ""))
      : null;

  const matchedVesselStr = (ais.matched_vessel || "").trim().toUpperCase();
  const isNoMatch =
    matchedVesselStr === "" ||
    matchedVesselStr === "NO MATCH" ||
    matchedVesselStr.includes("NO MATCH") ||
    matchedVesselStr === "NONE" ||
    matchedVesselStr === "UNMATCHED";

  const aisStatus = (ais.status || "").trim().toUpperCase();
  const isMissing = aisStatus === "MISSING" || isNoMatch;
  const isInactive = aisStatus === "INACTIVE";
  const isActive = aisStatus === "ACTIVE" && !isNoMatch;

  const discrepancies: string[] = [];
  const anomaliesDetected: string[] = [];

  let darkShipLikelihoodNum = 0;
  let spoofingLikelihoodNum = 0;
  let riskLevel = 1;

  // Evaluation: Dark Vessel Check
  if (isMissing || isNoMatch) {
    discrepancies.push(
      `Positive satellite radar contact (${satLength > 0 ? `${satLength}m ` : ""}${sat.vessel_type || "vessel"}) with zero corresponding AIS broadcast within search correlation radius`
    );

    if (satLength >= 45) {
      discrepancies.push(
        `Vessel size (${satLength}m, estimated >300 Gross Tonnage) falls under mandatory IMO SOLAS Chapter V AIS carriage regulations`
      );
      anomaliesDetected.push("Dark vessel / intentional transponder deactivation in regulated waters");
      anomaliesDetected.push("High-confidence radar contact without active radio beacon (Ghost target)");
      darkShipLikelihoodNum = Math.min(96, Math.max(85, Math.round(satConf * 0.95)));
      spoofingLikelihoodNum = 5;
      riskLevel = 4;
    } else if (satLength >= 20) {
      discrepancies.push(`Mid-sized vessel (${satLength}m) operating without detectable AIS transponder broadcast`);
      anomaliesDetected.push("Unregistered or non-broadcasting maritime traffic");
      darkShipLikelihoodNum = 65;
      spoofingLikelihoodNum = 10;
      riskLevel = 3;
    } else {
      discrepancies.push(`Small craft (${satLength || "<20"}m) not broadcasting AIS (may be exempt from commercial Class A carriage requirements)`);
      anomaliesDetected.push("Non-transmitting coastal or artisanal craft");
      darkShipLikelihoodNum = 25;
      spoofingLikelihoodNum = 5;
      riskLevel = 2;
    }
  } else if (isInactive) {
    discrepancies.push(
      `Correlated vessel (${ais.matched_vessel}) transponder marked INACTIVE (last transmission: ${ais.last_ais_report || "historical"}) while vessel is underway (${satSpeed} kts)`
    );
    anomaliesDetected.push("Transponder powered down / cessation of active radio beacon underway");
    darkShipLikelihoodNum = 78;
    spoofingLikelihoodNum = 15;
    riskLevel = 3;
  } else if (isActive) {
    // Check Kinematic Discrepancies
    let speedDelta: number | null = null;
    let headingDelta: number | null = null;

    if (aisSpeed !== null && !isNaN(aisSpeed)) {
      speedDelta = Math.abs(satSpeed - aisSpeed);
      if (speedDelta > 5.0) {
        discrepancies.push(
          `Significant Speed Discrepancy: Satellite radar Doppler estimate (${satSpeed.toFixed(1)} kts) diverges from AIS reported speed (${aisSpeed.toFixed(1)} kts) by ${speedDelta.toFixed(1)} kts`
        );
        anomaliesDetected.push("Kinematic speed manipulation or false speed reporting");
        spoofingLikelihoodNum += 45;
      } else if (speedDelta > 2.5) {
        discrepancies.push(
          `Minor Speed Discrepancy: Satellite speed estimate (${satSpeed.toFixed(1)} kts) differs from AIS (${aisSpeed.toFixed(1)} kts) by ${speedDelta.toFixed(1)} kts`
        );
        spoofingLikelihoodNum += 20;
      }
    }

    if (aisHeading !== null && !isNaN(aisHeading)) {
      headingDelta = getAngularDelta(satHeading, aisHeading);
      if (headingDelta > 45) {
        discrepancies.push(
          `Severe Course/Heading Divergence: Satellite radar geometry (${satHeading.toFixed(0)}°) diverges from AIS reported heading (${aisHeading.toFixed(0)}°) by ${headingDelta.toFixed(0)}°`
        );
        anomaliesDetected.push("Course falsification or position ghosting / spoofing");
        spoofingLikelihoodNum += 45;
      } else if (headingDelta > 20) {
        discrepancies.push(
          `Heading Mismatch: Satellite course (${satHeading.toFixed(0)}°) differs from AIS heading (${aisHeading.toFixed(0)}°) by ${headingDelta.toFixed(0)}°`
        );
        spoofingLikelihoodNum += 20;
      }
    }

    // Evaluate consistency & spoofing
    if (spoofingLikelihoodNum >= 60) {
      riskLevel = 4;
      darkShipLikelihoodNum = 15;
    } else if (spoofingLikelihoodNum >= 25) {
      riskLevel = 2;
      darkShipLikelihoodNum = 5;
    } else {
      darkShipLikelihoodNum = 2;
      spoofingLikelihoodNum = 3;
      riskLevel = 1;
    }
  }

  const aisConsistent = discrepancies.length === 0 && riskLevel <= 2 && !isNoMatch && !isMissing && !isInactive;

  // Reason generation
  let reason = "";
  if (isMissing || isNoMatch) {
    if (satLength >= 45) {
      reason = `Large commercial vessel contact (${satLength}m, ${satSpeed} kts) detected via satellite SAR with no AIS transmission present. Given vessel dimensions and proximity to international maritime traffic corridors, non-transmission strongly indicates intentional transponder deactivation (dark vessel), illegal transponder shutdown, or catastrophic power failure.`;
    } else {
      reason = `Satellite radar detected vessel contact (${satLength}m) without matching AIS broadcast. While smaller craft may operate under local regulatory exemptions, unmonitored transit in active operational zones requires visual or coastal radar verification.`;
    }
  } else if (isInactive) {
    reason = `Correlated vessel transponder is flagged as inactive while radar kinematics indicate active transit at ${satSpeed} kts. This indicates transponder interruption during voyage, posing collision risk and regulatory non-compliance.`;
  } else if (spoofingLikelihoodNum >= 60) {
    reason = `Matched vessel (${ais.matched_vessel}) exhibits critical kinematic divergence between satellite radar observations (Speed: ${satSpeed} kts, Heading: ${satHeading}°) and reported AIS broadcasts (Speed: ${aisSpeed ?? "N/A"} kts, Heading: ${aisHeading ?? "N/A"}°). This pattern is characteristic of AIS position spoofing, track manipulation, or broadcast transponder cloning.`;
  } else if (discrepancies.length > 0) {
    reason = `Matched vessel (${ais.matched_vessel}) exhibits minor kinematic variations between orbital radar observation and reported transponder telemetry. Variations may be attributable to localized sea state currents, radar Doppler processing tolerance, or course adjustments between sampling epochs.`;
  } else {
    reason = `Satellite radar observation correlates accurately with AIS transponder broadcast for ${ais.matched_vessel}. Kinematics (speed, heading), vessel dimensions, and reporting intervals are consistent with nominal navigation standards.`;
  }

  // Recommended actions
  const recommendedActions: string[] = [];
  if (riskLevel >= 4) {
    recommendedActions.push("Task secondary high-resolution optical/SAR satellite pass to verify vessel superstructure and name stencil");
    recommendedActions.push("Cross-reference historical coastal AIS and voyage tracks to identify point and timestamp of signal disappearance");
    recommendedActions.push("Dispatch immediate priority alert to regional Maritime Rescue Coordination Centre (MRCC) and Coast Guard patrol assets");
    recommendedActions.push("Correlate vessel vector with nearby oil slicks or illicit bunkering / STS (ship-to-ship) transfer clusters");
  } else if (riskLevel === 3) {
    recommendedActions.push("Monitor vessel track via coastal radar and airborne maritime surveillance assets");
    recommendedActions.push("Request radio confirmation of navigational status via VHF Channel 16 / coastal vessel traffic service (VTS)");
    recommendedActions.push("Log anomaly in port state control database for destination inspection upon arrival");
  } else if (riskLevel === 2) {
    recommendedActions.push("Continue routine orbital and transponder tracking over subsequent revisit passes");
    recommendedActions.push("Verify meteorological and current drift vectors to account for localized Doppler kinematic offsets");
  } else {
    recommendedActions.push("Maintain standard routine observation in maritime surveillance database");
    recommendedActions.push("Archive correlated satellite observation alongside AIS telemetry log");
  }

  return {
    ais_consistent: aisConsistent,
    discrepancies: discrepancies.length > 0 ? discrepancies : ["No kinematic or broadcast discrepancies observed"],
    dark_ship_likelihood: `${Math.min(100, Math.max(0, darkShipLikelihoodNum))}%`,
    spoofing_likelihood: `${Math.min(100, Math.max(0, spoofingLikelihoodNum))}%`,
    anomalies_detected: anomaliesDetected.length > 0 ? anomaliesDetected : ["None detected - nominal transit"],
    risk_level: Math.min(5, Math.max(1, riskLevel)),
    reason,
    recommended_actions: recommendedActions,
  };
}

/**
 * Enhanced Gemini AI-powered analysis with rule-based fallback
 */
export async function analyzeVesselAnomalyWithAi(
  sat: SatelliteDetectionInput,
  ais: AisCorrelationInput
): Promise<VesselAnomalyAnalysisResult> {
  const ruleBasedResult = analyzeVesselAnomalyRuleBased(sat, ais);

  // If input contains unpopulated template tokens, return ruleBasedResult immediately
  if (
    isTemplateToken(sat.timestamp) ||
    isTemplateToken(sat.location) ||
    isTemplateToken(sat.vessel_type)
  ) {
    return ruleBasedResult;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return ruleBasedResult;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are a Senior Maritime Intelligence and Satellite Surveillance Officer on the OILWATCH platform.
Analyze this vessel detection for anomalies, AIS correlation mismatches, dark-ship operations, and spoofing indicators.

SATELLITE DETECTION:
- Timestamp: ${sat.timestamp}
- Location: ${sat.location}
- Vessel Type: ${sat.vessel_type}
- Length: ${sat.length}m
- Heading: ${sat.heading}°
- Speed Estimate: ${sat.speed_estimate} kts
- Confidence: ${sat.confidence}%

AIS CORRELATION RESULTS:
- Matched Vessel: ${ais.matched_vessel}
- AIS Heading: ${ais.ais_heading !== undefined && ais.ais_heading !== null ? `${ais.ais_heading}°` : "N/A"}
- AIS Speed: ${ais.ais_speed !== undefined && ais.ais_speed !== null ? `${ais.ais_speed} kts` : "N/A"}
- Last AIS Report: ${ais.last_ais_report || "N/A"}
- Status: ${ais.status}

IMO SOLAS Chapter V CONTEXT:
- Cargo ships >= 300 GT (typically length >= 45m) and passenger ships on international voyages MUST carry and operate Class A AIS transponders continuously.
- Intentional deactivation indicates dark vessel activity (often associated with illicit STS transfers, smuggling, illegal fishing, or oil discharge).
- Active AIS with divergent heading (>25°) or speed (>3 kts) indicates potential GNSS/AIS spoofing or cloned identity.

RESPOND STRICTLY WITH VALID JSON IN THIS EXACT SCHEMA AND NOTHING ELSE:
{
  "ais_consistent": boolean,
  "discrepancies": ["list of string discrepancies"],
  "dark_ship_likelihood": "0-100%",
  "spoofing_likelihood": "0-100%",
  "anomalies_detected": ["list of string anomalies"],
  "risk_level": 1-5,
  "reason": "rigorous concise operational explanation",
  "recommended_actions": ["action1", "action2", "action3"]
}
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    if (response && response.text) {
      const parsed = JSON.parse(response.text.trim());
      if (
        typeof parsed.ais_consistent === "boolean" &&
        Array.isArray(parsed.discrepancies) &&
        typeof parsed.dark_ship_likelihood === "string" &&
        typeof parsed.spoofing_likelihood === "string" &&
        Array.isArray(parsed.anomalies_detected) &&
        typeof parsed.risk_level === "number" &&
        typeof parsed.reason === "string" &&
        Array.isArray(parsed.recommended_actions)
      ) {
        return {
          ais_consistent: parsed.ais_consistent,
          discrepancies: parsed.discrepancies,
          dark_ship_likelihood: parsed.dark_ship_likelihood,
          spoofing_likelihood: parsed.spoofing_likelihood,
          anomalies_detected: parsed.anomalies_detected,
          risk_level: Math.min(5, Math.max(1, Math.round(parsed.risk_level))),
          reason: parsed.reason,
          recommended_actions: parsed.recommended_actions,
        };
      }
    }

    return ruleBasedResult;
  } catch (err: any) {
    console.warn("Gemini AIS Anomaly generation notice (falling back to rule engine):", err?.message);
    return ruleBasedResult;
  }
}
