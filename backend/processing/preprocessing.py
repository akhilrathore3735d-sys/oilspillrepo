"""
OILWATCH Preprocessing Module
Handles Sentinel-1 SAR imagery preparation:
- Speckle noise filtering (Bilateral / Lee filter approximation)
- Contrast enhancement (Adaptive Histogram Equalization - CLAHE)
- Radiometric normalization (intensity scaling to [0, 255])
"""

import cv2
import numpy as np
from typing import Tuple, Dict, Any


def preprocess_image(image_input: np.ndarray) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """
    Preprocess raw satellite image for oil-spill candidate segmentation.
    
    Args:
        image_input: Raw image as numpy array (grayscale or BGR)
        
    Returns:
        tuple: (preprocessed_gray, enhanced_display, stats_dict)
    """
    # 1. Convert to single-channel 8-bit grayscale if needed
    if len(image_input.shape) == 3:
        gray = cv2.cvtColor(image_input, cv2.COLOR_BGR2GRAY)
    else:
        gray = image_input.copy()

    # Ensure uint8
    if gray.dtype != np.uint8:
        gray = cv2.normalize(gray, None, 0, 255, cv2.NORM_MINMAX).astype(np.uint8)

    h, w = gray.shape[:2]

    # 2. Speckle reduction: Bilateral filter preserves sharp oil-water boundary edges
    # while smoothing SAR granular speckle noise
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

    # 3. Contrast enhancement: CLAHE (Contrast Limited Adaptive Histogram Equalization)
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # 4. Statistical profiling
    stats = {
        "dimensions": [w, h],
        "total_pixels": int(w * h),
        "mean_intensity": float(np.mean(gray)),
        "std_intensity": float(np.std(gray)),
        "min_intensity": int(np.min(gray)),
        "max_intensity": int(np.max(gray)),
        "filtering_applied": "Bilateral Speckle Suppression + CLAHE Equalization"
    }

    return denoised, enhanced, stats
