import React, { useState } from "react";
import {
  MapPin,
  Compass,
  Crosshair,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Layers,
  Info,
  ShieldAlert
} from "lucide-react";
import { AnalysisResponse } from "../types";

interface SpillMapViewerProps {
  analysis: AnalysisResponse;
}

export const SpillMapViewer: React.FC<SpillMapViewerProps> = ({ analysis }) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [showReticle, setShowReticle] = useState<boolean>(true);
  const [showGrid, setShowGrid] = useState<boolean>(true);

  const { geometry, detection, risk, images } = analysis;

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <MapPin className="h-5 w-5 text-cyan-400" />
            <span>Spill Geospatial / Radar Mapping Viewport</span>
          </h2>
          <p className="text-xs text-slate-400">
            Image-space spatial grid projection for range-azimuth orientation and centroid targeting.
          </p>
        </div>

        {/* Scientific Disclaimer Badge */}
        <div className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-[11px] text-amber-300 flex items-center gap-1.5">
          <Info className="h-4 w-4 shrink-0 text-amber-400" />
          <span>Image-Space Radar Coordinates • Ungeoreferenced Raster</span>
        </div>
      </div>

      {/* Map Display Card */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
        {/* Map Controls Bar */}
        <div className="flex items-center justify-between border-b border-[#132742] pb-3 text-xs">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Radar Range Grid</span>
            </label>
            <label className="flex items-center gap-1.5 text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={showReticle}
                onChange={(e) => setShowReticle(e.target.checked)}
                className="rounded accent-cyan-500"
              />
              <span>Centroid Targeting Reticle</span>
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
              className="rounded border border-[#1c3658] bg-[#060e1c] p-1.5 text-slate-200 transition hover:bg-[#0f233d]"
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
              className="rounded border border-[#1c3658] bg-[#060e1c] p-1.5 text-slate-200 transition hover:bg-[#0f233d]"
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="rounded border border-[#1c3658] bg-[#060e1c] px-2 py-1 font-mono text-[11px] text-slate-300 hover:bg-[#0f233d]"
            >
              {Math.round(zoomLevel * 100)}%
            </button>
          </div>
        </div>

        {/* Map Canvas Frame */}
        <div className="relative mt-4 flex min-h-[480px] w-full items-center justify-center overflow-hidden rounded-xl border border-[#132742] bg-[#030710] p-4">
          {/* Simulated Coordinate Axes Ticks */}
          <div className="absolute top-2 left-4 font-mono text-[10px] text-slate-500">
            SAR Range Axis → [Ground Sampling: 10m]
          </div>
          <div className="absolute top-8 left-2 -rotate-90 origin-top-left font-mono text-[10px] text-slate-500">
            Azimuth Track ↓
          </div>

          {/* Radar Range Rings */}
          {showGrid && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-48 w-48 rounded-full border border-cyan-500/10" />
              <div className="h-96 w-96 rounded-full border border-cyan-500/10" />
              <div className="h-[480px] w-[480px] rounded-full border border-cyan-500/10" />
              {/* Radial cross lines */}
              <div className="absolute h-full w-[1px] bg-cyan-500/10" />
              <div className="absolute h-[1px] w-full bg-cyan-500/10" />
            </div>
          )}

          {/* Interactive Zoomable Image View */}
          <div
            className="relative transition-transform duration-200"
            style={{ transform: `scale(${zoomLevel})` }}
          >
            <img
              src={images.overlay}
              alt="Geospatial Spill View"
              className="max-h-[450px] w-auto rounded-lg shadow-2xl select-none"
            />

            {/* Bounding Box Visualizer */}
            {geometry.has_features && (
              <div
                className="pointer-events-none absolute border-2 border-dashed border-cyan-400/70"
                style={{
                  left: `${(geometry.bounding_box.x / 512) * 100}%`,
                  top: `${(geometry.bounding_box.y / 512) * 100}%`,
                  width: `${(geometry.bounding_box.width / 512) * 100}%`,
                  height: `${(geometry.bounding_box.height / 512) * 100}%`,
                }}
              >
                <span className="absolute -top-5 left-0 rounded bg-cyan-950 px-1 py-0.2 font-mono text-[9px] text-cyan-300 border border-cyan-700">
                  BBox [{geometry.bounding_box.width}×{geometry.bounding_box.height} px]
                </span>
              </div>
            )}

            {/* Centroid Reticle */}
            {showReticle && geometry.has_features && (
              <div
                className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: `${(geometry.centroid[0] / 512) * 100}%`,
                  top: `${(geometry.centroid[1] / 512) * 100}%`,
                }}
              >
                <div className="relative flex h-8 w-8 items-center justify-center">
                  <span className="absolute h-8 w-8 rounded-full border border-cyan-400 animate-ping opacity-60" />
                  <Crosshair className="h-6 w-6 text-cyan-300" />
                  <div className="absolute top-7 whitespace-nowrap rounded bg-[#0a1526] px-1.5 py-0.5 font-mono text-[9px] text-cyan-300 border border-cyan-700">
                    TARGET: [{geometry.centroid[0]}, {geometry.centroid[1]}]
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Compass Rose */}
          <div className="absolute top-4 right-4 flex flex-col items-center rounded-lg border border-[#132742] bg-[#060e1c]/80 p-2 text-slate-400">
            <Compass className="h-5 w-5 text-cyan-400" />
            <span className="font-mono text-[9px] text-white font-bold mt-0.5">N (0°)</span>
            <span className="text-[8px] text-slate-500">Azimuth Flight</span>
          </div>

          {/* Spatial Legend Card */}
          <div className="absolute bottom-4 left-4 rounded-lg border border-[#132742] bg-[#060e1c]/90 p-2.5 text-[11px] text-slate-300 backdrop-blur space-y-1">
            <div className="font-semibold text-white">Coordinate System Status</div>
            <div className="font-mono text-[10px] text-slate-400">
              Raster Dimension: 512 × 512 px
            </div>
            <div className="font-mono text-[10px] text-slate-400">
              Centroid: X={geometry.centroid[0]}, Y={geometry.centroid[1]}
            </div>
            <div className="text-[9px] text-amber-400 pt-0.5">
              ⚠️ Geographic WGS84 Lat/Long unavailable without SAR orbit metadata
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
