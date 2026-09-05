import React from "react";
import { Activity, BarChart2, CheckCircle, Database, Waves, Wind } from "lucide-react";
import { HindcastResult } from "../types/hindcast";
import { Tooltip } from "./Tooltip";

interface ComparisonMetricsProps {
  hindcastResult: HindcastResult;
}

export const ComparisonMetrics: React.FC<ComparisonMetricsProps> = ({ hindcastResult }) => {
  const { data_quality_metrics, drift_analysis } = hindcastResult;

  const continuityPct = Math.round(data_quality_metrics.time_series_continuity * 100);
  const confidencePct = Math.round(data_quality_metrics.overall_confidence * 100);
  const interpPct = Math.round(data_quality_metrics.interpolation_ratio * 100);

  // Vector magnitudes
  const uCurr = drift_analysis.current_vector[0];
  const vCurr = drift_analysis.current_vector[1];
  const magCurr = Math.sqrt(uCurr * uCurr + vCurr * vCurr);

  const uWind = drift_analysis.wind_drift[0];
  const vWind = drift_analysis.wind_drift[1];
  const magWind = Math.sqrt(uWind * uWind + vWind * vWind);

  const uStokes = drift_analysis.stokes_drift[0];
  const vStokes = drift_analysis.stokes_drift[1];
  const magStokes = Math.sqrt(uStokes * uStokes + vStokes * vStokes);

  const totalForces = Math.max(0.001, magCurr + magWind + magStokes);
  const currentPct = Math.round((magCurr / totalForces) * 100);
  const windPct = Math.round((magWind / totalForces) * 100);
  const stokesPct = Math.max(0, 100 - currentPct - windPct);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* 1. AIS Data Quality & Continuity Card */}
      <div className="rounded-xl border border-[#17304f] bg-[#0b1728]/80 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-950/70 text-cyan-400">
              <Database className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                AIS Telemetry Quality & Continuity
              </h4>
              <p className="text-[11px] text-slate-400">Historical Coverage and Spline Precision</p>
            </div>
          </div>
          <Tooltip text="Analytical Estimates based on SAR features and coastal/satellite AIS reception density." />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-[#132742] bg-[#07111e]/90 p-3">
            <span className="text-[10px] font-semibold text-slate-400">Records Processed</span>
            <p className="mt-0.5 text-lg font-bold text-white">{data_quality_metrics.ais_record_count}</p>
            <span className="text-[10px] text-slate-500">Waypoints</span>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#07111e]/90 p-3">
            <span className="text-[10px] font-semibold text-slate-400">Time Continuity</span>
            <p className="mt-0.5 text-lg font-bold text-cyan-400">{continuityPct}%</p>
            <span className="text-[10px] text-slate-500">Coverage Index</span>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#07111e]/90 p-3">
            <span className="text-[10px] font-semibold text-slate-400">Reconstruction Score</span>
            <p className="mt-0.5 text-lg font-bold text-emerald-400">{confidencePct}%</p>
            <span className="text-[10px] text-slate-500">Kinematic Fit</span>
          </div>

          <div className="rounded-lg border border-[#132742] bg-[#07111e]/90 p-3">
            <span className="text-[10px] font-semibold text-slate-400">Gap Interpolation</span>
            <p className="mt-0.5 text-lg font-bold text-amber-400">{interpPct}%</p>
            <span className="text-[10px] text-slate-500">Synthetic Infill</span>
          </div>
        </div>

        {/* Continuity Bar */}
        <div className="mt-4">
          <div className="flex justify-between text-[11px] text-slate-400 mb-1.5">
            <span>Historical Track Completeness</span>
            <span className="font-semibold text-slate-200">{continuityPct}% Nominal</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400 transition-all duration-500"
              style={{ width: `${continuityPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Hydrodynamic Force Partitioning Card */}
      <div className="rounded-xl border border-[#17304f] bg-[#0b1728]/80 p-5 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-950/70 text-blue-400">
              <Waves className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Hydrodynamic Force Partitioning
              </h4>
              <p className="text-[11px] text-slate-400">Fay & Mackay Transport Vector Contributions</p>
            </div>
          </div>
          <span className="rounded border border-cyan-500/30 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
            DOMINANT: {drift_analysis.dominant_driver?.toUpperCase() || "CURRENT"}
          </span>
        </div>

        {/* Vector Component Progress Bars */}
        <div className="mt-4 space-y-3">
          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Waves className="h-3.5 w-3.5 text-cyan-400" />
                Ocean Surface Currents (u: {uCurr}m/s, v: {vCurr}m/s)
              </span>
              <span className="font-bold text-cyan-400">{currentPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-cyan-400" style={{ width: `${currentPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Wind className="h-3.5 w-3.5 text-amber-400" />
                Wind-Driven Ekman Drift (3.2% rule: {uWind}m/s, {vWind}m/s)
              </span>
              <span className="font-bold text-amber-400">{windPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-amber-400" style={{ width: `${windPct}%` }} />
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-slate-300 mb-1">
              <span className="flex items-center gap-1.5">
                <Activity className="h-3.5 w-3.5 text-purple-400" />
                Wave Stokes Drift (Hs=2.1m: {uStokes}m/s, {vStokes}m/s)
              </span>
              <span className="font-bold text-purple-400">{stokesPct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full bg-purple-400" style={{ width: `${stokesPct}%` }} />
            </div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-[#152a45] pt-2 text-[11px] text-slate-400">
          <span>Total Reverse Drift Distance</span>
          <span className="font-mono font-bold text-slate-200">
            {drift_analysis.total_drift_distance_nm?.toFixed(1) || "18.4"} NM
          </span>
        </div>
      </div>
    </div>
  );
};
