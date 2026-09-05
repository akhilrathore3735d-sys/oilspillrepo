"""
OILWATCH Candidate Detection Module
Identifies low-backscatter anomalies characteristic of oil films on water surfaces.
SAR physics note: Oil dampens wind-generated capillary waves, diminishing radar backscatter
and producing dark signatures.
"""

import cv2
import numpy as np
from typing import Dict, Any, Tuple


def detect_oil_spill(preprocessed_image: np.ndarray) -> Tuple[bool, float, np.ndarray, Dict[str, Any]]:
    """
    Executes baseline candidate anomaly detection using adaptive radiometric thresholding.
    
    Args:
        preprocessed_image: 2D uint8 preprocessed grayscale array
        
    Returns:
        tuple: (detected_bool, confidence_score, initial_mask, detection_metrics)
    """
    img = preprocessed_image
    mean_val = np.mean(img)
    std_val = np.std(img)

    # 1. Adaptive dark thresholding tailored for SAR dark slick anomalies:
    # Capillary wave damping typically pushes oil backscatter into the lower quartile
    otsu_thresh, _ = cv2.threshold(img, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    
    # Statistical upper boundary for candidate dark regions
    stat_thresh = max(15, mean_val - 0.75 * std_val)
    effective_thresh = int(min(otsu_thresh, stat_thresh))

    # Binary mask of candidate dark patches
    _, initial_mask = cv2.threshold(img, effective_thresh, 255, cv2.THRESH_BINARY_INV)

    # Calculate metrics on candidate pixels
    candidate_pixels = int(np.count_nonzero(initial_mask))
    total_pixels = int(img.size)
    spill_fraction = candidate_pixels / (total_pixels + 1e-6)

    # Confidence model based on contrast, separation, and area reasonableness
    if candidate_pixels > 40:
        dark_mean = float(np.mean(img[initial_mask > 0]))
        bright_mean = float(np.mean(img[initial_mask == 0])) if np.count_nonzero(initial_mask == 0) > 0 else 255.0
        contrast_ratio = (bright_mean - dark_mean) / (bright_mean + 1e-6)

        # Baseline confidence formula for MVP
        # Penalize if whole image is dark (e.g. sensor edge or land shadow > 35%)
        if 0.001 < spill_fraction < 0.40:
            confidence = min(0.96, max(0.40, 0.45 + 0.40 * contrast_ratio))
            detected = True
        elif spill_fraction >= 0.40:
            # Massive dark region usually indicates land mask omission or calm wind zone
            confidence = max(0.25, 0.50 - (spill_fraction - 0.40))
            detected = True
        else:
            confidence = 0.20
            detected = False
    else:
        detected = False
        confidence = 0.05
        contrast_ratio = 0.0
        dark_mean = float(mean_val)
        bright_mean = float(mean_val)

    metrics = {
        "detected": detected,
        "confidence": round(float(confidence), 3),
        "threshold_used": effective_thresh,
        "contrast_ratio": round(float(contrast_ratio), 3),
        "mean_slick_intensity": round(dark_mean, 2),
        "mean_ambient_water_intensity": round(bright_mean, 2),
        "candidate_pixel_count": candidate_pixels,
        "sensor_anomaly_type": "Candidate Low-Backscatter Slick Anomaly" if detected else "None"
    }

    return detected, float(confidence), initial_mask, metrics
