"""
OILWATCH Feature Extraction Module
Extracts geometric, morphological, and statistical features from segmented slick masks.
Adheres strictly to scientific honesty: pixel-space units are explicitly denoted.
"""

import cv2
import numpy as np
from typing import List, Dict, Any


def extract_features(
    mask: np.ndarray,
    contours: List[np.ndarray],
    spatial_resolution_m: float = None
) -> Dict[str, Any]:
    """
    Computes rigorous geometric and morphological descriptors from segmented candidate contours.
    
    Args:
        mask: 2D binary uint8 mask
        contours: List of valid contour arrays
        spatial_resolution_m: Optional ground sampling distance (meters/pixel, e.g. 10m for Sentinel-1 GRD)
        
    Returns:
        Structured dictionary of geometric parameters.
    """
    total_pixels = int(mask.size)
    slick_pixels = int(np.count_nonzero(mask))
    pixel_fraction = round((slick_pixels / (total_pixels + 1e-6)) * 100, 2)

    if slick_pixels == 0 or len(contours) == 0:
        return {
            "has_features": False,
            "connected_components_count": 0,
            "pixel_area": 0,
            "area_percentage": 0.0,
            "unit_label": "Pixel-space area (No geospatial calibration metadata provided)",
            "perimeter": 0.0,
            "centroid": [0, 0],
            "bounding_box": {"x": 0, "y": 0, "width": 0, "height": 0},
            "estimated_length_px": 0.0,
            "estimated_width_px": 0.0,
            "aspect_ratio": 1.0,
            "orientation_deg": 0.0,
            "compactness": 0.0,
            "solidity": 0.0
        }

    # Find the primary (largest) spill contour
    primary_contour = max(contours, key=cv2.contourArea)
    primary_area = cv2.contourArea(primary_contour)
    perimeter = cv2.arcLength(primary_contour, True)

    # Moments & Centroid
    moments = cv2.moments(primary_contour)
    if moments["m00"] != 0:
        cx = int(moments["m10"] / moments["m00"])
        cy = int(moments["m01"] / moments["m00"])
    else:
        cx, cy = 0, 0

    # Axis-aligned Bounding Box
    bx, by, bw, bh = cv2.boundingRect(primary_contour)

    # Minimum Area Rotated Rectangle (gives length, width, orientation)
    if len(primary_contour) >= 5:
        rect = cv2.minAreaRect(primary_contour)
        (center_x, center_y), (dim_w, dim_h), angle = rect
        major_axis = max(dim_w, dim_h)
        minor_axis = min(dim_w, dim_h)
        # Standardize orientation angle
        orientation = round(float(angle), 1)
    else:
        major_axis = float(max(bw, bh))
        minor_axis = float(min(bw, bh))
        orientation = 0.0

    aspect_ratio = round(float(major_axis / (minor_axis + 1e-6)), 2)

    # Compactness (Isoperimetric quotient: 4 * pi * Area / Perimeter^2)
    # Circular drops = 1.0; long thin streaks approach 0.0
    compactness = round(float((4.0 * np.pi * primary_area) / ((perimeter ** 2) + 1e-6)), 3)

    # Convex Hull & Solidity
    hull = cv2.convexHull(primary_contour)
    hull_area = cv2.contourArea(hull)
    solidity = round(float(primary_area / (hull_area + 1e-6)), 3)

    # Geospatial physical conversion ONLY if explicit resolution metadata was provided
    estimated_area_km2 = None
    if spatial_resolution_m is not None and spatial_resolution_m > 0:
        m2_per_pixel = spatial_resolution_m ** 2
        estimated_area_km2 = round((slick_pixels * m2_per_pixel) / 1_000_000, 3)

    return {
        "has_features": True,
        "connected_components_count": len(contours),
        "pixel_area": slick_pixels,
        "area_percentage": pixel_fraction,
        "unit_label": "Pixel-space area (Sentinel-1 default image space; estimated 10m GSD: " + (f"{estimated_area_km2} km²" if estimated_area_km2 else "uncalibrated") + ")",
        "estimated_physical_area_km2": estimated_area_km2,
        "perimeter": round(float(perimeter), 1),
        "centroid": [int(cx), int(cy)],
        "bounding_box": {
            "x": int(bx),
            "y": int(by),
            "width": int(bw),
            "height": int(bh)
        },
        "estimated_length_px": round(float(major_axis), 1),
        "estimated_width_px": round(float(minor_axis), 1),
        "aspect_ratio": aspect_ratio,
        "orientation_deg": orientation,
        "compactness": compactness,
        "solidity": solidity
    }
