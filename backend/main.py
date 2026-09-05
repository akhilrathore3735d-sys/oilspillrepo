"""
OILWATCH Backend Server Entrypoint (FastAPI)
Command-center remote-sensing oil spill intelligence service.
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from backend.api.routes import router as api_router

app = FastAPI(
    title="OILWATCH - Satellite Oil Spill Intelligence API",
    description="Automated Sentinel-1 SAR oil spill candidate detection, segmentation, weathering, and risk intelligence pipeline.",
    version="1.0.0-mvp"
)

# Enable CORS for local Vite dev server and external hosting
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes under /api
app.include_router(api_router, prefix="/api")


@app.get("/")
def root():
    return {
        "platform": "OILWATCH",
        "description": "Satellite-Based Oil Spill Intelligence & Monitoring Platform",
        "api_docs": "/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    # Bind to port 8000 for standard FastAPI standalone execution
    port = int(os.environ.get("BACKEND_PORT", 8000))
    uvicorn.run("backend.main:app", host="0.0.0.0", port=port, reload=True)
