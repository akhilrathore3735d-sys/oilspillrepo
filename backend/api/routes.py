"""
OILWATCH FastAPI Routes
Endpoints for image analysis, multi-temporal change detection, health checks, and demo mode.
"""

import base64
import cv2
import numpy as np
from fastapi import APIRouter, File, UploadFile, HTTPException, Form
from pydantic import BaseModel
from typing import Optional, Dict, Any

from backend.pipeline import run_pipeline, generate_synthetic_sar_sample
from backend.analysis.change_detection import detect_changes

router = APIRouter()


class AnalyzeBase64Request(BaseModel):
    image_data: str
    previous_mask_data: Optional[str] = None
    spatial_resolution_m: Optional[float] = 10.0


class ChangeDetectionRequest(BaseModel):
    previous_image: str  # Base64
    current_image: str   # Base64


@router.get("/health")
def health_check():
    """System health check and pipeline readiness check."""
    return {
        "status": "healthy",
        "service": "OILWATCH Remote Sensing Intelligence Engine",
        "version": "1.0.0-mvp",
        "pipeline_stages": [
            "preprocessing",
            "candidate_detection",
            "morphological_segmentation",
            "feature_extraction",
            "relative_weathering",
            "change_detection",
            "risk_engine",
            "ai_report_generator"
        ]
    }


@router.post("/analyze")
async def analyze_image_endpoint(
    file: Optional[UploadFile] = File(None),
    payload: Optional[AnalyzeBase64Request] = None
):
    """
    Primary satellite SAR image analysis endpoint.
    Accepts either multipart form-data file upload or JSON payload with base64 encoded image.
    """
    try:
        image_bytes = None
        spatial_res = 10.0

        if file is not None:
            image_bytes = await file.read()
        elif payload is not None and payload.image_data:
            data = payload.image_data
            if "," in data:
                data = data.split(",")[1]
            image_bytes = base64.b64decode(data)
            if payload.spatial_resolution_m:
                spatial_res = payload.spatial_resolution_m
        else:
            raise HTTPException(status_code=400, detail="No image provided. Provide 'file' or 'image_data'.")

        if len(image_bytes) == 0:
            raise HTTPException(status_code=400, detail="Empty image payload received.")

        result = run_pipeline(image_bytes=image_bytes, spatial_resolution_m=spatial_res)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis pipeline error: {str(e)}")


@router.post("/change-detection")
async def change_detection_endpoint(payload: ChangeDetectionRequest):
    """
    Compares two multi-temporal satellite images (T1: previous vs T2: current)
    and computes spatial divergence, expansion/contraction, and visual change map.
    """
    try:
        # Decode previous
        data_prev = payload.previous_image.split(",")[1] if "," in payload.previous_image else payload.previous_image
        bytes_prev = base64.b64decode(data_prev)
        res_prev = run_pipeline(bytes_prev)

        # Decode current
        data_curr = payload.current_image.split(",")[1] if "," in payload.current_image else payload.current_image
        bytes_curr = base64.b64decode(data_curr)
        res_curr = run_pipeline(bytes_curr)

        # Decode masks back to numpy for change overlay
        mask_prev_bytes = base64.b64decode(res_prev["images"]["mask"].split(",")[1])
        mask_curr_bytes = base64.b64decode(res_curr["images"]["mask"].split(",")[1])
        
        m_prev = cv2.imdecode(np.frombuffer(mask_prev_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
        m_curr = cv2.imdecode(np.frombuffer(mask_curr_bytes, np.uint8), cv2.IMREAD_GRAYSCALE)
        
        curr_bgr = cv2.imdecode(np.frombuffer(bytes_curr, np.uint8), cv2.IMREAD_COLOR)

        change_metrics, change_overlay = detect_changes(m_prev, m_curr, base_image=curr_bgr)
        
        # Encode change visual overlay
        _, buf = cv2.imencode(".png", change_overlay)
        change_b64 = f"data:image/png;base64,{base64.b64encode(buf).decode('utf-8')}"

        return {
            "status": "success",
            "previous_analysis": {
                "pixel_area": res_prev["geometry"]["pixel_area"],
                "confidence": res_prev["detection"]["confidence"],
                "risk_level": res_prev["risk"]["level"]
            },
            "current_analysis": {
                "pixel_area": res_curr["geometry"]["pixel_area"],
                "confidence": res_curr["detection"]["confidence"],
                "risk_level": res_curr["risk"]["level"]
            },
            "change_metrics": change_metrics,
            "images": {
                "previous_overlay": res_prev["images"]["overlay"],
                "current_overlay": res_curr["images"]["overlay"],
                "change_overlay": change_b64
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Change detection error: {str(e)}")


@router.get("/demo-samples")
def get_demo_samples():
    """Returns metadata for pre-packaged synthetic/sample Sentinel-1 SAR tiles."""
    return [
        {
            "id": "medium_slick",
            "title": "Sentinel-1 SAR - Cohesive Crude Slick",
            "description": "Distinct elongated dark patch anomaly with high capillary wave suppression.",
            "scenario": "medium_slick"
        },
        {
            "id": "weathered",
            "title": "Sentinel-1 SAR - Weathered/Fragmented Sheen",
            "description": "Multi-ribbon emulsified slick showing higher spatial dispersion and diffuse edges.",
            "scenario": "weathered"
        },
        {
            "id": "clean_ocean",
            "title": "Sentinel-1 SAR - Nominal Sea Surface",
            "description": "Uniform sea clutter backscatter without anomalous capillary damping signatures.",
            "scenario": "clean_ocean"
        }
    ]


@router.get("/demo-sample/{scenario}")
def get_demo_sample_image(scenario: str):
    """Generates and returns base64 PNG data for selected demo scenario."""
    if scenario not in ["medium_slick", "weathered", "clean_ocean"]:
        scenario = "medium_slick"
    img_bytes = generate_synthetic_sar_sample(scenario)
    b64_str = base64.b64encode(img_bytes).decode("utf-8")
    return {
        "scenario": scenario,
        "image_data": f"data:image/png;base64,{b64_str}"
    }
