import React from "react";
import {
  Flame,
  Activity,
  AlertCircle,
  HelpCircle,
  BarChart2,
  ShieldAlert,
  Info
} from "lucide-react";
import { WeatheringAnalysis } from "../types";
import { Tooltip } from "./Tooltip";

interface WeatheringPanelProps {
  weathering: WeatheringAnalysis;
}

export const WeatheringPanel: React.FC<WeatheringPanelProps> = ({ weathering }) => {
  const { indicator, score, confidence, description, sub_metrics, scientific_note } = weathering;

  const getIndicatorColor = (lvl: string) => {
    switch (lvl) {
      case "LOW":
        return {
          badge: "bg-emerald-950 text-emerald-300 border-emerald-800",
          bar: "bg-emerald-500",
          desc: "Fresh / Cohesive Slick",
        };
      case "MODERATE":
        return {
          badge: "bg-amber-950 text-amber-300 border-amber-800",
          bar: "bg-amber-500",
          desc: "Intermediate Weathering / Early Sheen Breakdown",
        };
      case "HIGH":
        return {
          badge: "bg-purple-950 text-purple-300 border-purple-800",
          bar: "bg-purple-500",
          desc: "Heavily Weathered / Dispersed Ribbons & Tar Mats",
        };
      default:
        return {
          badge: "bg-slate-800 text-slate-300 border-slate-700",
          bar: "bg-slate-500",
          desc: "Inconclusive / Insufficient Footprint",
        };
    }
  };

  const style = getIndicatorColor(indicator);

  return (
    <div className="space-y-6">
      {/* Header & Scientific Notice */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" />
            <span>Relative Ageing & Weathering Diagnostic</span>
          </h2>
          <p className="text-xs text-slate-400">
            Image-derived physical dispersion and boundary gradient analysis for spill degradation tracking.
          </p>
        </div>

        <Tooltip
          title="Weathering Estimate Clarification"
          content="All weathering indices and dispersion scores are Analytical Estimates based on SAR features (boundary gradient diffuseness, spatial fragmentation, and backscatter variance). They reflect relative physical dispersion rather than chronological elapsed time or laboratory chemical weathering."
          position="bottom"
          size="lg"
        >
          <div className="rounded-lg border border-purple-800/60 bg-purple-950/40 px-3 py-1.5 text-[11px] text-purple-300 flex items-center gap-2 hover:bg-purple-950/60 transition cursor-help">
            <Info className="h-4 w-4 shrink-0 text-purple-400" />
            <span>Analytical Estimates based on SAR features</span>
            <HelpCircle className="h-3.5 w-3.5 text-purple-400" />
          </div>
        </Tooltip>
      </div>

      {/* Primary Weathering Status Card */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-6 backdrop-blur">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Indicator Badge & Score */}
          <div className="space-y-2 border-b border-[#132742] pb-4 md:border-b-0 md:border-r md:pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Estimated Weathering Indicator
              </span>
              <Tooltip
                title="Weathering Stage Indicator"
                content="Analytical Estimate based on SAR features: Categorized into LOW (cohesive), MODERATE (transitional sheen), or HIGH (dispersed ribbons) derived from 2D spatial texture and perimeter decay."
                position="top"
                size="md"
              />
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-lg border px-3 py-1 text-xl font-black uppercase tracking-wider ${style.badge}`}
              >
                {indicator}
              </span>
              <span className="text-xs text-slate-400">
                Score: <strong className="text-white font-mono text-base">{score}</strong> / 1.0
              </span>
            </div>
            <p className="text-xs text-slate-300 pt-1">{description}</p>
          </div>

          {/* Dispersion Progress Gauge */}
          <div className="space-y-2 border-b border-[#132742] pb-4 md:border-b-0 md:border-r md:pr-6">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Physical Dispersion Index
              </span>
              <Tooltip
                title="Physical Dispersion Index"
                content="Analytical Estimate based on SAR features: Mathematical index (0.0 to 1.0) combining edge diffuseness, fragmentation, and compactness. Not an in-situ viscosity or distillation measurement."
                position="top"
                size="md"
              />
            </div>
            <div className="h-3 w-full overflow-hidden rounded-full bg-[#060e1c]">
              <div
                className={`h-full ${style.bar} transition-all duration-500`}
                style={{ width: `${Math.round(score * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400">
              <span>0.0 (Fresh / Cohesive)</span>
              <span>0.5 (Moderate)</span>
              <span>1.0 (Dispersed)</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-300 pt-1">
              <span>Analytical Confidence:</span>
              <span className="font-mono text-cyan-400 font-semibold">{Math.round(confidence * 100)}%</span>
            </div>
          </div>

          {/* Scientific Disclaimer Card */}
          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-4 space-y-1 text-xs">
            <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>Remote Sensing Integrity Note</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {scientific_note} Operational deployment requires coupling satellite SAR with regional drift models (e.g. GNOME, OSCAR) and sea surface temperature telemetry.
            </p>
          </div>
        </div>
      </div>

      {/* Underlying Physical Sub-Metrics */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <BarChart2 className="h-4 w-4 text-cyan-400" />
            <span>Image-Derived Physical Features Breakdown</span>
          </h3>
          <Tooltip
            title="Sub-Metric Feature Clarification"
            content="Analytical Estimate based on SAR features: Sub-metrics are extracted from 2D pixel statistics and spatial gradient filters, not chemical sampling."
            position="left"
            size="md"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Spatial Fragmentation</span>
              <Tooltip
                title="Spatial Fragmentation Index"
                content="Analytical Estimate based on SAR features: Evaluates breakdown of single cohesive slick into detached patches or sheen streamers."
                position="top"
                size="sm"
              />
            </div>
            <div className="text-lg font-bold font-mono text-cyan-400">
              {sub_metrics.fragmentation_index} <span className="text-xs text-slate-500">/ 1.0</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Measures disintegration of cohesive slick into detached sheen streaks.
            </p>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Boundary Edge Diffuseness</span>
              <Tooltip
                title="Boundary Edge Diffuseness"
                content="Analytical Estimate based on SAR features: 2D Sobel gradient transition across the perimeter. Weathered sheens produce diffuse, gradual transition boundaries."
                position="top"
                size="sm"
              />
            </div>
            <div className="text-lg font-bold font-mono text-purple-400">
              {sub_metrics.edge_diffuseness} <span className="text-xs text-slate-500">/ 1.0</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Sobel gradient magnitude across slick perimeter ring. Diffuse = aged.
            </p>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Internal Heterogeneity</span>
              <Tooltip
                title="Internal Heterogeneity"
                content="Analytical Estimate based on SAR features: Normalized coefficient of variation (σ/μ) of backscatter intensity within the oil patch mask."
                position="top"
                size="sm"
              />
            </div>
            <div className="text-lg font-bold font-mono text-amber-400">
              {sub_metrics.internal_heterogeneity} <span className="text-xs text-slate-500">/ 1.0</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Coefficient of variation in radar backscatter inside candidate mask.
            </p>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-slate-400 font-medium">Internal Standard Deviation</span>
              <Tooltip
                title="Internal Standard Deviation"
                content="Analytical Estimate based on SAR features: Raw pixel variance in digital numbers reflecting texture and wave interaction across the oil film."
                position="top"
                size="sm"
              />
            </div>
            <div className="text-lg font-bold font-mono text-emerald-400">
              {sub_metrics.internal_std_intensity} <span className="text-xs text-slate-500">DN</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Speckle texture variance across candidate oil film surface.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
