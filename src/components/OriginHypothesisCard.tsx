import React from "react";
import { Compass, MapPin, Play, ShieldAlert, Sparkles, Target } from "lucide-react";
import { OriginHypothesis } from "../types/hindcast";
import { Tooltip } from "./Tooltip";

interface OriginHypothesisCardProps {
  hypothesis: OriginHypothesis;
  onReplayPath?: () => void;
  vesselName?: string;
  mmsi?: string;
}

export const OriginHypothesisCard: React.FC<OriginHypothesisCardProps> = ({
  hypothesis,
  onReplayPath,
  vesselName = "Target Vessel",
  mmsi,
}) => {
  const [lat, lon] = hypothesis.position;
  const confidencePercent = Math.round(hypothesis.confidence * 100);

  return (
    <div
      id="origin-hypothesis-card"
      className="relative overflow-hidden rounded-xl border border-emerald-500/40 bg-gradient-to-br from-emerald-950/40 via-[#0a1b24] to-[#08121e] p-5 shadow-xl transition hover:border-emerald-500/60"
    >
      {/* Background radial accent */}
      <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-500/40 bg-emerald-950/80 text-emerald-400 shadow-inner">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide text-white">
                Discharge Origin Point Hypothesis
              </h3>
              <span className="rounded border border-emerald-500/40 bg-emerald-900/60 px-2 py-0.5 text-[10px] font-bold text-emerald-300">
                PROBABILITY {confidencePercent}%
              </span>
              <Tooltip text="Point-of-closest-approach derived from reverse Runge-Kutta hydrodynamic drift modeling and historical AIS voyage reconstruction. Analytical Estimate based on SAR features." />
            </div>
            <p className="mt-0.5 text-xs text-slate-300">
              Vessel: <span className="font-semibold text-white">{vesselName}</span> {mmsi && `(MMSI ${mmsi})`}
            </p>
          </div>
        </div>

        {onReplayPath && (
          <button
            id="replay-path-btn"
            onClick={onReplayPath}
            className="flex shrink-0 items-center gap-2 rounded-lg border border-emerald-500/60 bg-emerald-900/40 px-3.5 py-2 text-xs font-semibold text-emerald-200 transition hover:bg-emerald-800/60 hover:text-white"
          >
            <Play className="h-3.5 w-3.5 fill-emerald-300 text-emerald-300" />
            <span>Replay Voyage Path</span>
          </button>
        )}
      </div>

      {/* Origin Geodetic & Spatial Telemetry Grid */}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-emerald-900/40 bg-[#061219]/90 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <MapPin className="h-3.5 w-3.5 text-emerald-400" />
            <span>Estimated Origin</span>
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-emerald-300">
            {lat.toFixed(4)}°, {lon.toFixed(4)}°
          </p>
          <span className="text-[10px] text-slate-500">WGS84 Coordinates</span>
        </div>

        <div className="rounded-lg border border-emerald-900/40 bg-[#061219]/90 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span>Discharge Timestamp</span>
          </div>
          <p className="mt-1 font-mono text-xs font-bold text-slate-200">
            {new Date(hypothesis.timestamp).toUTCString().replace("GMT", "UTC")}
          </p>
          <span className="text-[10px] text-slate-500">Reverse Drift Epoch</span>
        </div>

        <div className="rounded-lg border border-emerald-900/40 bg-[#061219]/90 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Uncertainty Ellipse</span>
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-amber-300">
            {hypothesis.uncertaintyEllipse.majorAxisNm.toFixed(1)} × {hypothesis.uncertaintyEllipse.minorAxisNm.toFixed(1)} NM
          </p>
          <span className="text-[10px] text-slate-500">Orientation: {hypothesis.uncertaintyEllipse.rotationDegrees}°</span>
        </div>

        <div className="rounded-lg border border-emerald-900/40 bg-[#061219]/90 p-3">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <ShieldAlert className="h-3.5 w-3.5 text-rose-400" />
            <span>Search Area</span>
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-rose-300">
            {hypothesis.probability_area_nm2.toFixed(1)} NM²
          </p>
          <span className="text-[10px] text-slate-500">95% Confidence Zone</span>
        </div>
      </div>

      {/* Hydrodynamic Reasoning Box */}
      <div className="mt-3.5 rounded-lg border border-emerald-900/50 bg-[#051119]/80 p-3">
        <p className="text-xs leading-relaxed text-slate-300">
          <span className="font-semibold text-emerald-400">Forensic Trajectory Correlation: </span>
          {hypothesis.reasoning}
        </p>
      </div>
    </div>
  );
};
