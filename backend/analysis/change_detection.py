"""
OILWATCH Multi-Temporal Change Detection Module
Quantifies spatial expansion, drift, dissipation, and overlap across multi-pass satellite acquisitions.
Generates an analytical RGB change detection map.
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any


def detect_changes(
    mask_previous: np.ndarray,
    mask_current: np.ndarray,
    base_image: np.ndarray = None
) -> Tuple[Dict[str, Any], np.ndarray]:
    """
    Compares two temporal spill masks (T1 and T2).
    
    Args:
        mask_previous: Binary mask from prior acquisition (T1)
        mask_current: Binary mask from current acquisition (T2)
        base_image: Optional background image for change overlay blending
        
    Returns:
        tuple: (metrics_dict, visual_change_overlay_rgb)
    """
    # Standardize dimensions to match current image if needed
    h, w = mask_current.shape[:2]
    if mask_previous.shape[:2] != (h, w):
        mask_prev_res = cv2.resize(mask_previous, (w, h), interpolation=cv2.INTER_NEAREST)
    else:
        mask_prev_res = mask_previous.copy()

    m_prev = (mask_prev_res > 0).astype(np.uint8)
    m_curr = (mask_current > 0).astype(np.uint8)

    area_prev = int(np.count_nonzero(m_prev))
    area_curr = int(np.count_nonzero(m_curr))
    area_diff = area_curr - area_prev

    # Growth percentage calculation
    if area_prev > 0:
        pct_change = round(((area_curr - area_prev) / area_prev) * 100, 2)
    else:
        pct_change = 100.0 if area_curr > 0 else 0.0

    # Overlap and spatial divergence metrics
    intersection = np.logical_and(m_prev, m_curr)
    overlap_px = int(np.count_nonzero(intersection))
    union = np.logical_or(m_prev, m_curr)
    union_px = int(np.count_nonzero(union))
    
    iou = round(float(overlap_px / (union_px + 1e-6)), 3)

    # Change zones
    newly_expanded = np.logical_and(m_curr, np.logical_not(m_prev)) # In T2 but not T1
    dissipated_evaporated = np.logical_and(m_prev, np.logical_not(m_curr)) # In T1 but not T2

    expanded_px = int(np.count_nonzero(newly_expanded))
    dissipated_px = int(np.count_nonzero(dissipated_evaporated))

    # Trend categorization
    if pct_change > 15.0:
        trend = "EXPANSION"
        trend_summary = f"Spill expanded by {abs(pct_change)}% ({area_diff:+d} pixels) between acquisitions."
    elif pct_change < -15.0:
        trend = "CONTRACTION"
        trend_summary = f"Spill contracted / dispersed by {abs(pct_change)}% ({area_diff:+d} pixels)."
    else:
        trend = "STABLE"
        trend_summary = f"Spill area remained relatively stable ({pct_change:+.1f}% change)."

    # 3. Create Multi-Color Visual Change Layer
    # Base background
    if base_image is not None:
        if len(base_image.shape) == 2:
            change_rgb = cv2.cvtColor(base_image, cv2.COLOR_GRAY2RGB)
        else:
            change_rgb = base_image.copy()
        if change_rgb.shape[:2] != (h, w):
            change_rgb = cv2.resize(change_rgb, (w, h))
    else:
        change_rgb = np.zeros((h, w, 3), dtype=np.uint8) + 40 # dark slate base

    # Blend colors:
    # Newly Expanded zone -> Vibrant Red (239, 68, 68)
    # Persistent / Overlap -> Cyan / Teal (6, 182, 212)
    # Dissipated / Drifted -> Yellow / Amber (245, 158, 11)
    overlay = change_rgb.copy()
    overlay[newly_expanded] = [239, 68, 68]
    overlay[intersection] = [6, 182, 212]
    overlay[dissipated_evaporated] = [245, 158, 11]

    blended_change = cv2.addWeighted(overlay, 0.65, change_rgb, 0.35, 0)

    metrics = {
        "previous_area_pixels": area_prev,
        "current_area_pixels": area_curr,
        "area_difference_pixels": area_diff,
        "percentage_change": pct_change,
        "trend": trend,
        "trend_summary": trend_summary,
        "overlap_pixels": overlap_px,
        "intersection_over_union": iou,
        "newly_expanded_pixels": expanded_px,
        "dissipated_pixels": dissipated_px,
        "spatial_drift_noted": bool(iou < 0.65 and area_prev > 0 and area_curr > 0)
    }

    return metrics, blended_change
