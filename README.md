# OILWATCH: Satellite-Based Oil Spill Intelligence & Monitoring Platform
### Smart India Hackathon (SIH) — Problem Statement 143 (PS 143) MVP

[![Version](https://img.shields.io/badge/version-1.0.0--mvp-cyan.svg)](https://github.com)
[![Sensor](https://img.shields.io/badge/Sensor-Copernicus%20Sentinel--1%20C--band%20SAR-blue.svg)](https://sentinel.esa.int/web/sentinel/missions/sentinel-1)
[![SIH](https://img.shields.io/badge/SIH-Problem%20Statement%20143-emerald.svg)](https://sih.gov.in)
[![License](https://img.shields.io/badge/License-Apache%202.0-slate.svg)](LICENSE)

---

## 🛰️ 1. Executive Summary

**OILWATCH** is an autonomous, end-to-end remote-sensing intelligence platform engineered to detect, segment, quantify, and track marine oil slicks from satellite synthetic aperture radar (**SAR**) imagery. 

Built specifically for **Smart India Hackathon Problem Statement 143**, the platform addresses the challenge of maritime environmental surveillance across India's Exclusive Economic Zone (EEZ), including the Arabian Sea, Bay of Bengal, and high-traffic Indian Ocean tanker transit lanes.

---

## 🔬 2. Remote Sensing & Physics Principles

### Why Synthetic Aperture Radar (SAR)?
Unlike optical sensors (e.g., Sentinel-2, Landsat-8) which are hindered by cloud cover, night conditions, and atmospheric haze, **C-band Synthetic Aperture Radar** (e.g., Sentinel-1):
- Penetrates clouds, squalls, and precipitation.
- Operates 24/7 in day and night acquisitions.
- Detects the **Bragg scattering damping effect**: oil films damp short-gravity and capillary ocean waves (wavelengths 5–10 cm), creating a specular surface that scatters microwave radar pulses away from the antenna. Consequently, oil slicks appear as distinctive **low-backscatter dark anomalies** against bright wind-roughened sea clutter.

---

## ⚙️ 3. Multi-Stage Pipeline Architecture

```
                      [ Raw Sentinel-1 SAR Raster ]
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 1: Radiometric Enhancement & Filtering           │
       │   • Bilateral / Median filter (Speckle suppression)    │
       │   • CLAHE (Contrast-Limited Adaptive Histogram Eq)    │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 2: Adaptive Candidate Anomaly Detection          │
       │   • Otsu dual-distribution dark-spot thresholding      │
       │   • Statistical backscatter attenuation contrast ratio │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 3: Morphological Segmentation                    │
       │   • Morphological closing & opening (hole fill)        │
       │   • Connected-component labeling & contour tracking    │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 4: Geometric Feature Extraction                  │
       │   • Pixel area & Physical area (km² @ GSD 10m)         │
       │   • Green's theorem perimeter & centroid reticle       │
       │   • Central moments (aspect ratio, length, orientation)│
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 5: Relative Weathering & Ageing Profiling        │
       │   • Boundary gradient diffuseness (Sobel perimeter)    │
       │   • Spatial fragmentation & internal texture variance  │
       │   • Categorization: LOW / MODERATE / HIGH              │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 6: Multi-Temporal Change Detection (T1 vs T2)    │
       │   • Pixel-by-pixel spatial intersection & delta        │
       │   • Expansion / Contraction / Drift tracking           │
       │   • Trichromatic change map (Red/Cyan/Amber)           │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 7: Explainable Maritime Risk Engine              │
       │   • Multi-factor scoring (Area, Confidence, Weathering)│
       │   • Tiers: LOW / MEDIUM / HIGH / CRITICAL              │
       └────────────────────────────┬───────────────────────────┘
                                    │
                                    ▼
       ┌────────────────────────────────────────────────────────┐
       │ Stage 8: Executive AI Intelligence Report              │
       │   • Gemini 3.8 Flash multimodal briefing               │
       │   • Deterministic heuristic fallback                   │
       └────────────────────────────────────────────────────────┘
```

---

## 🚀 4. Quickstart & Installation

### Option A: Node.js / Full-Stack Ingress (Default Platform Server)
```bash
# Clone the repository
git clone https://github.com/your-org/oilwatch-ps143.git
cd oilwatch-ps143

# Install dependencies
npm install

# Start full-stack development server (Express API + Vite React)
npm run dev
```
The application will be accessible at `http://localhost:3000`.

### Option B: Dedicated Python FastAPI Backend (Modular Microservice)
```bash
cd backend
python -m venv venv
source venv/bin/activate   # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Start FastAPI server
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
Interactive Swagger docs available at `http://localhost:8000/docs`.

---

## 📡 5. REST API Specifications

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Service health, pipeline readiness, and AI provider status |
| `GET` | `/api/demo-samples` | List benchmark Sentinel-1 SAR acquisition scenarios |
| `GET` | `/api/demo-sample/:scenario` | Retrieve synthetic SAR raster data for a given scenario |
| `POST` | `/api/analyze` | Execute complete 8-stage pipeline on an uploaded SAR raster |
| `POST` | `/api/change-detection` | Multi-temporal analysis comparing T1 (prior) and T2 (current) |

---

## ⚖️ 6. Scientific Honesty & MVP Declarations

In compliance with strict remote-sensing scientific standards:
1. **Radar vs Look-alikes**: Natural biogenic slicks, low-wind calm waters (<2–3 m/s), upwelling zones, and grease ice can create dark radar signatures mimicking mineral oil. Operational deployment requires ancillary wind vector validation (ECMWF / ASCAT scatterometer data).
2. **Coordinate Reference System**: Unless explicit georeferencing tie-points (GCPs or GeoTIFF affine transform matrices) are present in the uploaded raster, all spatial analyses operate strictly in **unprojected image-space coordinates**. Lat/Long coordinates are **never fabricated**.
3. **Relative Weathering**: SAR backscatter alone cannot definitively date oil chronologically. The weathering indicator represents an **analytical physical estimate** based on spatial disintegration, internal backscatter variance, and boundary gradient diffuseness.

---

## 👥 Authors & Acknowledgments
Developed for **Smart India Hackathon 2024** | **Problem Statement 143**.
- Space Application Centre (ISRO) & Copernicus Sentinel Data Access.
- Built with React, TypeScript, Tailwind CSS, Express, OpenCV, and Gemini AI.
