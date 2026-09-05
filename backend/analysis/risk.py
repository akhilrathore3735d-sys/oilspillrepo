"""
OILWATCH Explainable Risk Intelligence Engine
Evaluates spill operational hazard score based on candidate magnitude, confidence,
weathering persistence, and multi-temporal expansion trajectory.
Strictly disclaims unprovided geographic features (e.g. shoreline distance, shipping lanes).
"""

from typing import Dict, Any, Optional


def calculate_risk(
    spill_area_px: int,
    confidence: float,
    weathering_indicator: str,
    area_fraction_pct: float,
    change_pct: Optional[float] = None,
    coastal_distance_km: Optional[float] = None
) -> Dict[str, Any]:
    """
    Computes explainable risk level [LOW, MEDIUM, HIGH, CRITICAL] with constituent factor weights.
    
    Args:
        spill_area_px: Detected candidate pixel area
        confidence: Anomaly detection confidence score [0.0 - 1.0]
        weathering_indicator: LOW, MODERATE, HIGH, or INCONCLUSIVE
        area_fraction_pct: Percentage of scene covered by slick
        change_pct: Optional percentage change if temporal comparison exists
        coastal_distance_km: Optional shoreline proximity if georeferenced
    """
    if spill_area_px == 0 or confidence < 0.2:
        return {
            "level": "LOW",
            "score": 0.1,
            "color": "emerald",
            "summary": "Negligible oil anomaly detected. Low environmental threat profile.",
            "factors": [
                {"factor": "Candidate Magnitude", "contribution": "Low", "description": "Candidate pixels below alert threshold"},
                {"factor": "Detection Confidence", "contribution": "Low", "description": f"{round(confidence*100)}% detection certainty"},
                {"factor": "Geographic Proximity", "contribution": "Unavailable", "description": "No calibrated coastal distance vector"}
            ],
            "recommendation": "Routine satellite surveillance pass scheduled."
        }

    # 1. Area Magnitude Score (0 - 0.40)
    # Scales logarithmically with pixel count
    if spill_area_px < 500:
        area_score = 0.10
    elif spill_area_px < 2500:
        area_score = 0.22
    elif spill_area_px < 10000:
        area_score = 0.32
    else:
        area_score = 0.40

    # 2. Confidence Weight (0 - 0.25)
    conf_score = confidence * 0.25

    # 3. Weathering & Persistence Factor (0 - 0.15)
    # Fresh slicks (LOW weathering) pose immediate volatile toxic risk and cohesive slick drift;
    # Highly weathered slicks (HIGH) may cover wider dispersed areas but lower volatile toxicity.
    if weathering_indicator == "LOW":
        weathering_score = 0.14  # Fresh crude, highest immediate hazard
    elif weathering_indicator == "MODERATE":
        weathering_score = 0.10
    elif weathering_indicator == "HIGH":
        weathering_score = 0.07  # Dispersed sheen
    else:
        weathering_score = 0.05

    # 4. Temporal Trajectory / Expansion Factor (0 - 0.20)
    if change_pct is not None:
        if change_pct > 30.0:
            change_score = 0.20
        elif change_pct > 10.0:
            change_score = 0.14
        elif change_pct >= -10.0:
            change_score = 0.08
        else:
            change_score = 0.04
    else:
        # Default baseline if single pass
        change_score = 0.10

    raw_risk_score = area_score + conf_score + weathering_score + change_score
    risk_score = round(float(min(0.99, max(0.05, raw_risk_score))), 2)

    # Risk level thresholding
    if risk_score >= 0.75:
        level = "CRITICAL"
        color = "rose"
        summary = "Severe candidate slick anomaly with high spatial footprint and rapid dispersion indicators."
        recommendation = "Immediate tactical alert to maritime response teams, launch UAV/aerial verification, and prepare containment booms."
    elif risk_score >= 0.55:
        level = "HIGH"
        color = "orange"
        summary = "Significant candidate slick identified with elevated confidence and persistence metrics."
        recommendation = "Prioritize consecutive satellite revisit passes, notify coast guard monitoring units, and model drift trajectory."
    elif risk_score >= 0.35:
        level = "MEDIUM"
        color = "amber"
        summary = "Moderate candidate slick signature detected; potential low-wind look-alike cannot be fully excluded."
        recommendation = "Maintain active monitoring; cross-reference with AIS vessel transit records and regional meteorological wind models."
    else:
        level = "LOW"
        color = "emerald"
        summary = "Minor candidate anomaly with low persistence profile or marginal spatial extent."
        recommendation = "Log event in surveillance registry and track in subsequent scheduled orbit."

    factors = [
        {
            "factor": "Spatial Extent",
            "contribution": f"{round((area_score/0.40)*100)}%",
            "description": f"{spill_area_px:,} candidate pixels ({area_fraction_pct}% of acquisition footprint)"
        },
        {
            "factor": "Detection Certainty",
            "contribution": f"{round((conf_score/0.25)*100)}%",
            "description": f"{round(confidence*100)}% SAR backscatter contrast confidence"
        },
        {
            "factor": "Weathering State",
            "contribution": weathering_indicator,
            "description": f"{weathering_indicator} physical dispersion profile"
        },
        {
            "factor": "Temporal Evolution",
            "contribution": f"{change_pct:+.1f}%" if change_pct is not None else "Single-Pass",
            "description": "Trajectory derived from multi-temporal comparison" if change_pct is not None else "Awaiting consecutive satellite pass"
        },
        {
            "factor": "Shoreline Proximity",
            "contribution": "Unavailable",
            "description": "Geographic shoreline vector layers not supplied in uncalibrated raster"
        }
    ]

    return {
        "level": level,
        "score": risk_score,
        "color": color,
        "summary": summary,
        "factors": factors,
        "recommendation": recommendation
    }
