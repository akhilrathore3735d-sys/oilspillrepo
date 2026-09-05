"""
OILWATCH AI Intelligence Report Generator
Synthesizes structured remote sensing telemetry into an executive maritime briefing.
Uses Google Gemini API when configured, with a deterministic local template fallback.
Enforces strict scientific honesty: never fabricates absent coordinates or weather vectors.
"""

import os
import json
from typing import Dict, Any


def generate_local_fallback_report(analysis_data: Dict[str, Any]) -> str:
    """
    Deterministic rule-based report generator that runs without external API dependencies.
    """
    det = analysis_data.get("detection", {})
    geom = analysis_data.get("geometry", {})
    weath = analysis_data.get("weathering", {})
    risk = analysis_data.get("risk", {})
    change = analysis_data.get("change", {})

    detected = det.get("detected", False)
    conf = round(det.get("confidence", 0.0) * 100, 1)
    pixel_area = geom.get("pixel_area", 0)
    pct_area = geom.get("area_percentage", 0.0)
    length = geom.get("estimated_length_px", 0)
    width = geom.get("estimated_width_px", 0)
    orientation = geom.get("orientation_deg", 0)
    aspect = geom.get("aspect_ratio", 1.0)
    centroid = geom.get("centroid", [0, 0])
    
    weath_ind = weath.get("indicator", "UNASSESSED")
    weath_score = weath.get("score", 0.0)
    risk_lvl = risk.get("level", "LOW")
    risk_score = risk.get("score", 0.0)

    if not detected or pixel_area == 0:
        return (
            "## EXECUTIVE SUMMARY\n"
            "Autonomous Sentinel-1 SAR radiometric analysis completed. No significant candidate oil slick "
            "anomalies were detected above baseline signal-to-noise confidence thresholds.\n\n"
            "### DETECTION ASSESSMENT\n"
            f"- Status: No Anomalies Detected (Confidence: {conf}%)\n"
            "- Radar Backscatter: Ambient oceanic surface roughness is consistent with normal sea clutter.\n\n"
            "### RECOMMENDATION\n"
            "- Continue nominal orbital surveillance tracking. No tactical interdiction warranted."
        )

    change_text = "Single-pass acquisition: multi-temporal baseline pending consecutive orbital pass."
    if change and change.get("percentage_change") is not None:
        ch_pct = change.get("percentage_change", 0.0)
        ch_trend = change.get("trend", "STABLE")
        change_text = f"Temporal Trajectory: {ch_trend} ({ch_pct:+.1f}% pixel change across acquisitions)."

    return f"""## EXECUTIVE INTELLIGENCE SUMMARY
A candidate low-backscatter surface anomaly consistent with a marine oil spill was detected via Sentinel-1 SAR analysis with an analytical confidence of **{conf}%**. The event is categorized under Risk Level **{risk_lvl}** (composite risk score: {risk_score}/1.0).

---

### 1. DETECTION ASSESSMENT
- **Classification Status**: Candidate Oil Slick Anomaly (Confidence: {conf}%)
- **Sensor Physics**: Capillary wave damping causing characteristic specular dark-patch radar attenuation.
- **Ambiguity Disclaimer**: Analytical baseline detector; non-oil look-alikes (e.g., local wind calm zones, biogenic films) cannot be ruled out without multi-spectral or in-situ verification.

### 2. SPILL GEOMETRY & MORPHOLOGY
- **Candidate Footprint**: {pixel_area:,} pixels ({pct_area}% of scene area)
- **Centroid Coordinates**: Image-space coordinates [X: {centroid[0]}, Y: {centroid[1]}] (Geographic lat/long uncalibrated in raw raster)
- **Principal Dimensions**: Estimated length: ~{length} px | Width: ~{width} px | Aspect Ratio: {aspect}:1
- **Spatial Alignment**: Principal axis oriented at {orientation}° relative to sensor raster horizontal.

### 3. RELATIVE WEATHERING & AGEING
- **Weathering Indicator**: **{weath_ind}** (Relative Dispersion Score: {weath_score}/1.0)
- **Surface Characteristics**: {weath.get('description', 'Surface fragmentation and edge gradient analyzed.')}
- **Scientific Note**: Relative optical indicator derived from boundary gradients and spatial fragmentation. Does not represent calibrated chemical chronometry.

### 4. MULTI-TEMPORAL EVOLUTION
- **Change Assessment**: {change_text}

### 5. RECOMMENDED MONITORING ACTIONS
1. **Immediate Tactical Alert**: Notify regional maritime safety authority and port state control of candidate coordinates.
2. **Multi-Source Cross-Validation**: Intersect detection centroid with live AIS vessel positions to identify candidate discharge sources.
3. **Task Consecutive Revisit**: Schedule high-resolution optical / subsequent SAR orbital acquisition to monitor dispersion trajectory.
4. **Aerial Verification**: Deploy maritime patrol aircraft or drone asset if trajectory threatens vulnerable marine sanctuaries or navigational channels.
"""


def generate_report(analysis_data: Dict[str, Any]) -> str:
    """
    Main AI report dispatch. Checks for GEMINI_API_KEY.
    If available, prompts Gemini model with pure structured metrics.
    Otherwise, gracefully falls back to deterministic local briefing.
    """
    api_key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return generate_local_fallback_report(analysis_data)

    try:
        from google import genai
        client = genai.Client(api_key=api_key)

        prompt = f"""You are the senior remote sensing and maritime intelligence officer on the OILWATCH platform.
Below is the structured, validated telemetry from our automated Sentinel-1 SAR oil-spill analysis pipeline.

CRITICAL DIRECTIVES:
- Base your report ONLY on the structured numbers and facts provided below.
- Do NOT fabricate geographic coordinates (lat/long), wind speeds, ship names, or distances to coast if they are not in the telemetry.
- If information is not provided or marked as uncalibrated, explicitly note that it is uncalibrated or unavailable.
- Do NOT claim SAR alone provides exact chronological age; refer to it strictly as a "relative weathering indicator".
- Format clearly in Markdown with headers:
  - EXECUTIVE SUMMARY
  - DETECTION ASSESSMENT
  - SPILL CHARACTERISTICS & GEOMETRY
  - WEATHERING ASSESSMENT
  - TEMPORAL EVOLUTION
  - RECOMMENDED OPERATIONAL ACTION

STRUCTURED TELEMETRY:
{json.dumps(analysis_data, indent=2)}
"""
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
        )
        if response and response.text:
            return response.text
        return generate_local_fallback_report(analysis_data)
    except Exception as e:
        # Fallback cleanly without crashing
        fallback = generate_local_fallback_report(analysis_data)
        return f"{fallback}\n\n*(Note: Cloud AI generation unavailable: {str(e)[:60]}. Deterministic briefing displayed.)*"
