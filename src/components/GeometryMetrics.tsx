import React from "react";
import {
  Compass,
  Maximize2,
  Box,
  Target,
  Percent,
  TrendingUp,
  ShieldCheck,
  Scale,
  Activity,
  Layers
} from "lucide-react";
import { AnalysisResponse } from "../types";

interface GeometryMetricsProps {
  analysis: AnalysisResponse;
}

export const GeometryMetrics: React.FC<GeometryMetricsProps> = ({ analysis }) => {
  const { detection, geometry, risk } = analysis;

  const cards = [
    {
      label: "Detection Certainty",
      value: `${Math.round(detection.confidence * 100)}%`,
      sub: detection.detected ? "Candidate Dark Slick Anomaly" : "No Anomaly Detected",
      icon: ShieldCheck,
      color: "cyan",
    },
    {
      label: "Spill Footprint",
      value: `${geometry.pixel_area.toLocaleString()} px`,
      sub: geometry.estimated_physical_area_km2
        ? `~${geometry.estimated_physical_area_km2} km² (@ 10m GSD)`
        : "Pixel-space area",
      icon: Maximize2,
      color: "rose",
    },
    {
      label: "Scene Fraction",
      value: `${geometry.area_percentage}%`,
      sub: "Total Scene Area",
      icon: Percent,
      color: "amber",
    },
    {
      label: "Perimeter",
      value: `${geometry.perimeter.toLocaleString()} px`,
      sub: "Contour boundary ring",
      icon: Activity,
      color: "indigo",
    },
    {
      label: "Principal Length",
      value: `~${geometry.estimated_length_px} px`,
      sub: "Major axis (4σ moments)",
      icon: Scale,
      color: "blue",
    },
    {
      label: "Minor Width",
      value: `~${geometry.estimated_width_px} px`,
      sub: `Aspect ratio: ${geometry.aspect_ratio}:1`,
      icon: Box,
      color: "purple",
    },
    {
      label: "Orientation Angle",
      value: `${geometry.orientation_deg}°`,
      sub: "Relative to raster horizontal",
      icon: Compass,
      color: "emerald",
    },
    {
      label: "Centroid Reticle",
      value: `[${geometry.centroid[0]}, ${geometry.centroid[1]}]`,
      sub: "Image-space raster coordinates",
      icon: Target,
      color: "teal",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-cyan-400" />
            <span>Spill Morphology & Geometric Quantification</span>
          </h2>
          <p className="text-xs text-slate-400">
            Rigorous mathematical shape descriptors derived from segmented binary contour moments.
          </p>
        </div>

        {/* Scientific disclaimer badge */}
        <div className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-[11px] text-amber-300">
          ⚠️ <span className="font-semibold">Scientific Notice:</span> Pixel-space area. Physical km² assumes calibrated 10m GSD.
        </div>
      </div>

      {/* Grid of Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-4 shadow-sm backdrop-blur transition hover:border-cyan-500/40"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{card.label}</span>
                <div className="rounded-lg border border-[#173050] bg-[#060e1c] p-2 text-cyan-400">
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-2 text-2xl font-black text-white font-mono tracking-tight">
                {card.value}
              </div>
              <p className="mt-1 text-[11px] text-slate-400 font-sans">{card.sub}</p>
            </div>
          );
        })}
      </div>

      {/* Deep Morphological Diagnostics */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Bounding Box & Centroid Coordinates */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Box className="h-4 w-4 text-cyan-400" />
            <span>Bounding Box & Spatial Extent</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-[#132742] pb-2">
              <span className="text-slate-400">Minimum Bounding Box:</span>
              <span className="font-mono text-slate-200">
                X: {geometry.bounding_box.x}, Y: {geometry.bounding_box.y}, W: {geometry.bounding_box.width} px, H: {geometry.bounding_box.height} px
              </span>
            </div>
            <div className="flex justify-between border-b border-[#132742] pb-2">
              <span className="text-slate-400">Connected Components (Blobs):</span>
              <span className="font-mono text-cyan-400 font-bold">{geometry.connected_components_count} candidate regions</span>
            </div>
            <div className="flex justify-between border-b border-[#132742] pb-2">
              <span className="text-slate-400">Isoperimetric Compactness:</span>
              <span className="font-mono text-slate-200">
                {geometry.compactness} <span className="text-[10px] text-slate-400">(4π·Area / P²; drop = 1.0, streak → 0)</span>
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-400">Solidity Index:</span>
              <span className="font-mono text-slate-200">
                {geometry.solidity} <span className="text-[10px] text-slate-400">(Area / Bounding Box)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Backscatter Radiometric Telemetry */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-cyan-400" />
            <span>Radiometric Backscatter Attenuation</span>
          </h3>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between border-b border-[#132742] pb-2">
              <span className="text-slate-400">Mean Slick Pixel Intensity:</span>
              <span className="font-mono text-rose-400 font-semibold">
                {detection.mean_slick_intensity} <span className="text-slate-400">(Dark Anomaly)</span>
              </span>
            </div>
            <div className="flex justify-between border-b border-[#132742] pb-2">
              <span className="text-slate-400">Ambient Sea Clutter Mean:</span>
              <span className="font-mono text-cyan-400 font-semibold">
                {detection.mean_ambient_water_intensity} <span className="text-slate-400">(Normal Clutter)</span>
              </span>
            </div>
            <div className="flex justify-between border-b border-[#132742] pb-2">
              <span className="text-slate-400">Backscatter Contrast Ratio:</span>
              <span className="font-mono text-emerald-400 font-bold">
                {(detection.contrast_ratio * 100).toFixed(1)}% Attenuation
              </span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-400">Radiometric Threshold:</span>
              <span className="font-mono text-slate-200">{detection.threshold_used} / 255 (Otsu-adapted)</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
