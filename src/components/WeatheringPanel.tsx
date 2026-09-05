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

        <div className="rounded-lg border border-purple-800/60 bg-purple-950/40 px-3 py-1.5 text-[11px] text-purple-300 flex items-center gap-2">
          <Info className="h-4 w-4 shrink-0 text-purple-400" />
          <span>Analytical Estimate • Not Chronological Age</span>
        </div>
      </div>

      {/* Primary Weathering Status Card */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-6 backdrop-blur">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Indicator Badge & Score */}
          <div className="space-y-2 border-b border-[#132742] pb-4 md:border-b-0 md:border-r md:pr-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Estimated Weathering Indicator
            </span>
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
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Physical Dispersion Index
            </span>
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
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-cyan-400" />
          <span>Image-Derived Physical Features Breakdown</span>
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Spatial Fragmentation Index</span>
            <div className="text-lg font-bold font-mono text-cyan-400">
              {sub_metrics.fragmentation_index} <span className="text-xs text-slate-500">/ 1.0</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Measures disintegration of cohesive slick into detached sheen streaks.
            </p>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Boundary Edge Diffuseness</span>
            <div className="text-lg font-bold font-mono text-purple-400">
              {sub_metrics.edge_diffuseness} <span className="text-xs text-slate-500">/ 1.0</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Sobel gradient magnitude across slick perimeter ring. Diffuse = aged.
            </p>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Internal Heterogeneity</span>
            <div className="text-lg font-bold font-mono text-amber-400">
              {sub_metrics.internal_heterogeneity} <span className="text-xs text-slate-500">/ 1.0</span>
            </div>
            <p className="text-[10px] text-slate-400">
              Coefficient of variation in radar backscatter inside candidate mask.
            </p>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
            <span className="text-[11px] text-slate-400 font-medium">Internal Standard Deviation</span>
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
