"""
OILWATCH Segmentation Module
Refines candidate mask using morphological filtering, contour extraction,
and visual overlay synthesis for analytical inspection.
"""

import cv2
import numpy as np
from typing import Tuple, List, Dict, Any


def segment_spill(
    original_image: np.ndarray,
    initial_mask: np.ndarray,
    min_area_pixels: int = 50
) -> Tuple[np.ndarray, np.ndarray, List[np.ndarray], Dict[str, Any]]:
    """
    Cleans candidate mask and produces final segmented binary mask and visual overlay.
    
    Args:
        original_image: 2D or 3D numpy image
        initial_mask: Binary candidate mask from detection
        min_area_pixels: Minimum blob size to retain (filters sensor salt-and-pepper noise)
        
    Returns:
        tuple: (refined_mask, overlay_rgb, filtered_contours, segmentation_stats)
    """
    # 1. Morphological filtering
    # Kernel for opening (noise removal) and closing (hole bridging)
    kernel_small = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    kernel_med = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))

    opened = cv2.morphologyEx(initial_mask, cv2.MORPH_OPEN, kernel_small, iterations=1)
    closed = cv2.morphologyEx(opened, cv2.MORPH_CLOSE, kernel_med, iterations=2)

    # 2. Contour extraction and noise region filtering
    contours, hierarchy = cv2.findContours(closed, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    filtered_mask = np.zeros_like(closed)
    valid_contours = []
    
    for cnt in contours:
        area = cv2.contourArea(cnt)
        if area >= min_area_pixels:
            valid_contours.append(cnt)
            cv2.drawContours(filtered_mask, [cnt], -1, 255, thickness=cv2.FILLED)

    # 3. Generate high-visibility geospatial overlay
    # Convert base image to 3-channel BGR/RGB
    if len(original_image.shape) == 2:
        base_rgb = cv2.cvtColor(original_image, cv2.COLOR_GRAY2RGB)
    else:
        base_rgb = original_image.copy()

    # Create translucent mask overlay: Vivid red/crimson fill (RGB: 239, 68, 68)
    overlay = base_rgb.copy()
    overlay[filtered_mask > 0] = [239, 68, 68]
    alpha = 0.45
    blended = cv2.addWeighted(overlay, alpha, base_rgb, 1 - alpha, 0)

    # Draw sharp fluorescent boundary perimeter contours (RGB: 254, 202, 202)
    cv2.drawContours(blended, valid_contours, -1, (255, 100, 100), thickness=2)

    stats = {
        "valid_components_count": len(valid_contours),
        "total_segmented_pixels": int(np.count_nonzero(filtered_mask)),
        "filter_min_area_applied": min_area_pixels
    }

    return filtered_mask, blended, valid_contours, stats
