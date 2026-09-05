# OILWATCH Architecture & Remote Sensing Pipeline

## 1. System Overview
**OILWATCH** is an operational MVP built for **Smart India Hackathon (Problem Statement 143)**. It provides end-to-end intelligence for satellite-based marine oil spill detection, spatial quantification, relative weathering estimation, multi-temporal change detection, and explainable operational risk classification.

```
Satellite SAR Imagery (Sentinel-1 C-band VV/VH)
              │
              ▼
    [1. Preprocessing]
    ├── Bilateral Speckle Suppression Filter
    ├── CLAHE Radiometric Normalization
    └── Statistical Clutter Profiling
              │
              ▼
    [2. Candidate Detection]
    ├── Adaptive Low-Backscatter Dark Spot Thresholding
    ├── Contrast Ratio vs Background Water Analysis
    └── Detection Confidence Calibration
              │
              ▼
    [3. Morphological Segmentation]
    ├── Dual-Kernel Mathematical Morphology (Open + Close)
    ├── Salt-and-Pepper Anomaly Elimination
    └── Multi-Polygon Contour Extraction & Visual Overlay
              │
              ▼
    [4. Feature Extraction]
    ├── Pixel-space Area & Scene Percentage
    ├── Minimum Bounding Box & Rotated Rectangle
    ├── Major/Minor Axis Dimensions & Aspect Ratio
    ├── Isoperimetric Compactness & Solidity
    └── Spatial Centroid in Image-Space
              │
              ▼
    [5. Weathering & Ageing Engine]
    ├── Spatial Fragmentation Index
    ├── Boundary Gradient & Edge Diffuseness
    └── Internal Backscatter Heterogeneity
              │
              ▼
    [6. Multi-Temporal Change Detection]
    ├── T1 (Previous) vs T2 (Current) Matrix Comparison
    ├── Area Difference & Percentage Evolution Trend
    ├── Spatial Overlap (Intersection-over-Union)
    └── Trichromatic Visual Change Difference Map
              │
              ▼
    [7. Explainable Risk Engine]
    ├── Multi-factor Hazard Weighting (Area + Conf + Weath + Trend)
    ├── Risk Tiers: LOW, MEDIUM, HIGH, CRITICAL
    └── Actionable Operational Directives
              │
              ▼
    [8. AI Intelligence Layer]
    ├── Grounded LLM Prompt (Gemini API Integration)
    └── Deterministic Rule-Based Fallback Synthesis
              │
              ▼
   [Frontend Dashboard UI]
    Interactive Telemetry, Inspection Layers, Charts & Map
```

## 2. SAR Remote Sensing Principles & Scientific Integrity

### 2.1 The Physics of SAR Oil Detection
Synthetic Aperture Radar (SAR) transmits microwave pulses (e.g., C-band 5.4 GHz on Sentinel-1) and measures backscattered power. Capillary and short gravity waves on the sea surface create Bragg scattering. When an oil slick is present, surface tension dampens capillary waves, transforming rough water into a specular reflector that directs microwave energy away from the radar sensor, resulting in distinct dark anomalies.

### 2.2 Look-Alike Ambiguity & Candidate Classification
Dark patches in SAR are not guaranteed to be petroleum hydrocarbon spills. Natural look-alikes include:
- Low-wind areas (< 2–3 m/s) where capillary waves are naturally absent.
- Biogenic surface slicks (plankton/algal blooms).
- Rain cells and grease ice.
- Internal ocean waves and upwelling.

**Scientific Integrity Principle**: The MVP designates detected regions as **Candidate Slicks** and computes confidence based on contrast gradients and boundary morphology. It does not fabricate unmeasured environmental parameters like wind speed, water temperature, or shoreline distance.

## 3. Module Specifications

| Module | Core Function | Output |
|---|---|---|
| `preprocessing.py` | Noise reduction & radiometric calibration | Denoised grayscale array, CLAHE display array, clutter statistics |
| `detection.py` | Dark spot anomaly identification | Candidate flag, confidence [0-1], raw dark mask, contrast ratio |
| `segmentation.py` | Morphological refinement & contour extraction | Binary mask [0, 255], RGB overlay with contour highlight |
| `features.py` | Geometric characterization | Pixel area, perimeter, centroid [X,Y], bounding box, length, width, aspect ratio, compactness |
| `ageing.py` | Heuristic physical weathering indicator | Level (LOW, MODERATE, HIGH), dispersion score, edge diffuseness |
| `change_detection.py` | Multi-pass spatial comparison | Area delta, % change, expansion/contraction trend, trichromatic change overlay |
| `risk.py` | Operational hazard determination | Risk tier (LOW, MEDIUM, HIGH, CRITICAL), factor breakdown, mitigation directive |
| `report_generator.py` | Executive intelligence synthesis | Structured Markdown briefing (via Gemini LLM or local fallback) |
