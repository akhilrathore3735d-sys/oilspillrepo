"""
OILWATCH Weathering & Relative Ageing Analysis Module
Computes a relative weathering indicator from image-derived physical characteristics:
- Spatial fragmentation (weathered slicks fragment into smaller sheen streaks and patches)
- Boundary diffuse gradients (evaporative weathering and wave emulsification soften edges)
- Internal backscatter variance (fresh crude forms thicker, uniform damping layers; aged films display heterogeneous sheen)
- Shape elongation and dispersion

DISCLAIMER: Remote sensing SAR alone cannot determine absolute chronological age.
This is an analytical heuristic indicator reflecting dispersion and physical degradation.
"""

import cv2
import numpy as np
from typing import Dict, Any, List


def analyze_weathering(
    gray_image: np.ndarray,
    mask: np.ndarray,
    contours: List[np.ndarray],
    aspect_ratio: float,
    compactness: float
) -> Dict[str, Any]:
    """
    Computes a relative weathering indicator score [0.0 - 1.0] and categorization.
    
    LOW: Fresh, cohesive slick with sharp boundary contrast and minimal fragmentation.
    MODERATE: Intermediate weathering with moderate elongation, peripheral emulsification or breakdown.
    HIGH: Highly dispersed, fragmented sheen / weathered tar balls with diffuse boundary transitions.
    """
    slick_pixels = int(np.count_nonzero(mask))
    if slick_pixels < 20:
        return {
            "indicator": "INCONCLUSIVE",
            "score": 0.0,
            "confidence": 0.1,
            "sub_metrics": {},
            "scientific_note": "Insufficient candidate pixels to compute reliable weathering dispersion profile."
        }

    # 1. Fragmentation Index: Ratio of distinct connected blobs relative to area
    num_blobs = len(contours)
    # Higher blob count per unit area indicates fragmentation into sheen ribbons
    fragmentation_score = min(1.0, (num_blobs - 1) * 0.15 + (1.0 - min(1.0, compactness * 2.0)) * 0.5)

    # 2. Internal Heterogeneity (standard deviation inside the slick vs mean)
    slick_intensities = gray_image[mask > 0]
    internal_std = float(np.std(slick_intensities))
    internal_mean = float(np.mean(slick_intensities))
    # Normalized coefficient of variation inside the slick
    heterogeneity_score = min(1.0, internal_std / (internal_mean + 1e-6))

    # 3. Boundary Gradient / Edge Diffuseness:
    # Fresh slicks have steep gradient edges; aged slicks show blurred transitional boundaries
    sobelx = cv2.Sobel(gray_image, cv2.CV_64F, 1, 0, ksize=3)
    sobely = cv2.Sobel(gray_image, cv2.CV_64F, 0, 1, ksize=3)
    gradient_mag = np.sqrt(sobelx ** 2 + sobely ** 2)
    
    # Extract gradient on the boundary of the slick
    edge_kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (3, 3))
    boundary_ring = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, edge_kernel)
    
    if np.count_nonzero(boundary_ring) > 0:
        mean_edge_gradient = float(np.mean(gradient_mag[boundary_ring > 0]))
        # Lower edge gradient implies diffuse, aged boundaries
        edge_diffuseness = min(1.0, max(0.0, 1.0 - (mean_edge_gradient / 45.0)))
    else:
        edge_diffuseness = 0.5

    # 4. Composite Weathering Score [0.0 - 1.0]
    # Weightings: 35% fragmentation, 35% boundary diffuseness, 30% internal heterogeneity
    composite_score = (
        0.35 * fragmentation_score +
        0.35 * edge_diffuseness +
        0.30 * heterogeneity_score
    )
    composite_score = round(float(np.clip(composite_score, 0.05, 0.95)), 2)

    # Classification
    if composite_score < 0.38:
        indicator = "LOW"
        description = "Fresh / Cohesive Slick: Distinct cohesive core, sharp boundary gradient, low fragmentation."
    elif composite_score <= 0.68:
        indicator = "MODERATE"
        description = "Partially Weathered: Moderate wind-wave elongation, peripheral sheen breakdown, mid-range boundary gradient."
    else:
        indicator = "HIGH"
        description = "Heavily Weathered / Dispersed: Significant ribbon fragmentation, diffuse transitional boundary, high spatial heterogeneity."

    # Analytical confidence based on pixel count sample size
    confidence = min(0.88, max(0.40, 0.40 + np.log10(max(10, slick_pixels)) * 0.12))

    return {
        "indicator": indicator,
        "score": composite_score,
        "confidence": round(float(confidence), 2),
        "description": description,
        "sub_metrics": {
            "fragmentation_index": round(float(fragmentation_score), 2),
            "edge_diffuseness": round(float(edge_diffuseness), 2),
            "internal_heterogeneity": round(float(heterogeneity_score), 2),
            "internal_std_intensity": round(internal_std, 2)
        },
        "scientific_note": "Analytical relative indicator based on spatial dispersion, edge contrast gradient, and speckle heterogeneity. Does not constitute calibrated chemical chronometry."
    }
