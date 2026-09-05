"""
OILWATCH Central Analysis Orchestrator Pipeline
Connects all processing and intelligence modules through a unified pipeline.
"""

import base64
import io
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, Optional

from backend.processing.preprocessing import preprocess_image
from backend.processing.detection import detect_oil_spill
from backend.processing.segmentation import segment_spill
from backend.processing.features import extract_features
from backend.analysis.ageing import analyze_weathering
from backend.analysis.change_detection import detect_changes
from backend.analysis.risk import calculate_risk
from backend.ai.report_generator import generate_report


def ndarray_to_base64_png(arr: np.ndarray) -> str:
    """Converts a uint8 numpy array (grayscale or RGB) to a base64 encoded PNG data URI."""
    if len(arr.shape) == 2:
        pil_img = Image.fromarray(arr, mode="L")
    else:
        # Assumes RGB order for PIL
        pil_img = Image.fromarray(arr, mode="RGB")
    
    buffer = io.BytesIO()
    pil_img.save(buffer, format="PNG")
    b64_str = base64.b64encode(buffer.getvalue()).decode("utf-8")
    return f"data:image/png;base64,{b64_str}"


def run_pipeline(
    image_bytes: bytes,
    previous_mask: Optional[np.ndarray] = None,
    previous_area_px: Optional[int] = None,
    spatial_resolution_m: Optional[float] = 10.0
) -> Dict[str, Any]:
    """
    Orchestrates the end-to-end satellite oil-spill analysis pipeline.
    
    Pipeline stages:
    1. Decode image bytes
    2. Image Preprocessing & Speckle Reduction
    3. Candidate Anomaly Detection
    4. Morphological Segmentation & Boundary Extraction
    5. Geometric & Morphological Feature Extraction
    6. Relative Weathering / Ageing Analysis
    7. Multi-temporal Change Detection (if previous mask provided)
    8. Explainable Operational Risk Scoring
    9. AI Executive Intelligence Report Synthesis
    """
    # 1. Decode image from bytes
    nparr = np.frombuffer(image_bytes, np.uint8)
    img_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    if img_bgr is None:
        raise ValueError("Invalid image format or unreadable image stream.")
    
    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)

    # 2. Preprocessing
    denoised_gray, enhanced_display, prep_stats = preprocess_image(img_bgr)

    # 3. Detection
    detected, confidence, initial_mask, detection_metrics = detect_oil_spill(denoised_gray)

    # 4. Segmentation
    refined_mask, overlay_rgb, contours, seg_stats = segment_spill(img_rgb, initial_mask)

    # 5. Feature Extraction
    geometry = extract_features(refined_mask, contours, spatial_resolution_m=spatial_resolution_m)

    # 6. Ageing / Weathering Analysis
    weathering = analyze_weathering(
        gray_image=denoised_gray,
        mask=refined_mask,
        contours=contours,
        aspect_ratio=geometry.get("aspect_ratio", 1.0),
        compactness=geometry.get("compactness", 0.0)
    )

    # 7. Change Detection (if baseline temporal mask available)
    change_metrics = None
    change_image_b64 = None
    if previous_mask is not None:
        change_metrics, change_overlay = detect_changes(previous_mask, refined_mask, base_image=img_rgb)
        change_image_b64 = ndarray_to_base64_png(change_overlay)

    # 8. Risk Assessment
    ch_pct = change_metrics.get("percentage_change") if change_metrics else None
    risk = calculate_risk(
        spill_area_px=geometry.get("pixel_area", 0),
        confidence=confidence,
        weathering_indicator=weathering.get("indicator", "INCONCLUSIVE"),
        area_fraction_pct=geometry.get("area_percentage", 0.0),
        change_pct=ch_pct
    )

    # Convert visual artifacts to base64 for frontend consumption
    original_b64 = ndarray_to_base64_png(img_rgb)
    mask_b64 = ndarray_to_base64_png(refined_mask)
    overlay_b64 = ndarray_to_base64_png(overlay_rgb)

    # 9. AI Intelligence Report
    structured_payload = {
        "status": "success",
        "detection": detection_metrics,
        "geometry": geometry,
        "weathering": weathering,
        "risk": risk,
        "change": change_metrics
    }
    report_md = generate_report(structured_payload)

    return {
        "status": "success",
        "detection": detection_metrics,
        "geometry": geometry,
        "weathering": weathering,
        "risk": risk,
        "change": change_metrics,
        "images": {
            "original": original_b64,
            "mask": mask_b64,
            "overlay": overlay_b64,
            "change_overlay": change_image_b64
        },
        "preprocessing_stats": prep_stats,
        "report": report_md
    }


def generate_synthetic_sar_sample(scenario: str = "medium_slick") -> bytes:
    """
    Generates a realistic synthetic Sentinel-1 SAR oceanic tile with speckle noise
    and candidate oil damping slicks for instant zero-dependency demonstration.
    """
    width, height = 512, 512
    # 1. Base ocean radar clutter with Rayleigh/speckle distribution
    np.random.seed(42 if scenario == "medium_slick" else (99 if scenario == "weathered" else 7))
    clutter = np.random.gamma(shape=9.0, scale=12.0, size=(height, width)).astype(np.float32)
    clutter = cv2.GaussianBlur(clutter, (3, 3), 1.0)
    clutter = np.clip(clutter, 20, 240).astype(np.uint8)

    # 2. Synthetic slick damping: capillary wave suppression creates dark patches
    mask = np.zeros((height, width), dtype=np.uint8)

    if scenario == "medium_slick":
        # Cohesive elongated slick with minor tail
        pts = np.array([[160, 220], [210, 180], [300, 190], [370, 240], [340, 290], [260, 280], [180, 270]], np.int32)
        cv2.fillPoly(mask, [pts], 255)
        # Add small feeder tail
        cv2.ellipse(mask, (380, 250), (45, 18), 25, 0, 360, 255, -1)
        # Blur mask to simulate capillary transition
        mask_soft = cv2.GaussianBlur(mask, (15, 15), 5.0)
        damping_factor = (mask_soft / 255.0) * 0.72 # Damps backscatter by up to 72%
        sar_sim = (clutter * (1.0 - damping_factor)).astype(np.uint8)

    elif scenario == "weathered":
        # Dispersed, fragmented sheen ribbons
        for center in [(180, 190), (240, 230), (280, 270), (320, 250), (360, 300)]:
            cv2.ellipse(mask, center, (np.random.randint(25, 55), np.random.randint(10, 22)), np.random.randint(20, 60), 0, 360, 255, -1)
        mask_soft = cv2.GaussianBlur(mask, (9, 9), 3.0)
        damping_factor = (mask_soft / 255.0) * 0.60
        sar_sim = (clutter * (1.0 - damping_factor)).astype(np.uint8)

    elif scenario == "clean_ocean":
        # Clean ocean clutter, no slick
        sar_sim = clutter

    else:
        # Default compact slick
        cv2.circle(mask, (256, 256), 65, 255, -1)
        mask_soft = cv2.GaussianBlur(mask, (11, 11), 4.0)
        damping_factor = (mask_soft / 255.0) * 0.68
        sar_sim = (clutter * (1.0 - damping_factor)).astype(np.uint8)

    # Encode as PNG bytes
    is_success, buffer = cv2.imencode(".png", sar_sim)
    return buffer.tobytes()
