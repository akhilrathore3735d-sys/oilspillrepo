import React, { useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Clock,
  Code2,
  Copy,
  Download,
  Filter,
  History,
  Layers,
  Loader2,
  Navigation,
  RefreshCw,
  Search,
  Share2,
  ShieldAlert,
  Ship,
  Sparkles,
  Target,
  Waves,
} from "lucide-react";
import { HindcastResult } from "../types/hindcast";
import { AnomalyStrictness, AnomalyThresholdConfig } from "../types/anomalyThreshold";
import { hindcastVesselApi, updateAnomalyThresholdApi } from "../services/api";
import { OriginHypothesisCard } from "./OriginHypothesisCard";
import { ComparisonMetrics } from "./ComparisonMetrics";
import { AnomalyThresholdControl } from "./AnomalyThresholdControl";
import { DriftVisualization } from "./DriftVisualization";
import { HindcastTimeline } from "./HindcastTimeline";
import { Tooltip } from "./Tooltip";

const BENCHMARK_VESSEL_PRESETS = [
  {
    id: "353161000",
    name: "PACIFIC TITAN",
    type: "Crude Oil Tanker",
    flag: "Panama",
    desc: "Intentional transponder shutoff (Dark ship window) & oil discharge origin",
    defaultLookback: 7,
  },
  {
    id: "211284560",
    name: "NORDIC VOYAGER",
    type: "Container Ship",
    flag: "Marshall Islands",
    desc: "High-speed international corridor transit with minor course jitter",
    defaultLookback: 7,
  },
  {
    id: "413982000",
    name: "STAR HORIZON",
    type: "Bulk Carrier",
    flag: "Liberia",
    desc: "Nominal coastal transit within SOLAS kinematic guidelines",
    defaultLookback: 7,
  },
];

export const HindcastEngineView: React.FC = () => {
  const [selectedMmsi, setSelectedMmsi] = useState("353161000");
  const [customMmsiInput, setCustomMmsiInput] = useState("");
  const [lookbackDays, setLookbackDays] = useState(7);
  const [strictness, setStrictness] = useState<AnomalyStrictness>(AnomalyStrictness.BALANCED);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hindcastResult, setHindcastResult] = useState<HindcastResult | null>(null);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-run initial benchmark on mount
  useEffect(() => {
    handleRunHindcast("353161000", 7, AnomalyStrictness.BALANCED);
  }, []);

  const handleRunHindcast = async (
    mmsi: string,
    days: number = lookbackDays,
    str: AnomalyStrictness = strictness
  ) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await hindcastVesselApi({
        mmsi,
        lookbackDays: days,
        includeDriftAnalysis: true,
        anomalyStrictness: str,
      });
      setHindcastResult(data);
    } catch (err: any) {
      setError(err?.message || "Failed to execute trajectory hindcasting and drift solver.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleStrictnessChange = async (newStrictness: AnomalyStrictness) => {
    setStrictness(newStrictness);
    try {
      await updateAnomalyThresholdApi(newStrictness);
    } catch (err) {
      console.warn("Could not sync threshold to backend:", err);
    }
    if (hindcastResult) {
      handleRunHindcast(selectedMmsi, lookbackDays, newStrictness);
    }
  };

  const handleCustomConfigApply = async (config: Partial<AnomalyThresholdConfig>) => {
    try {
      await updateAnomalyThresholdApi(strictness, config);
      handleRunHindcast(selectedMmsi, lookbackDays, strictness);
    } catch (err: any) {
      console.warn("Failed to apply custom threshold:", err);
    }
  };

  const handleSelectPreset = (preset: (typeof BENCHMARK_VESSEL_PRESETS)[0]) => {
    setSelectedMmsi(preset.id);
    setCustomMmsiInput("");
    setLookbackDays(preset.defaultLookback);
    handleRunHindcast(preset.id, preset.defaultLookback, strictness);
  };

  const handleCustomSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customMmsiInput.trim()) return;
    setSelectedMmsi(customMmsiInput.trim());
    handleRunHindcast(customMmsiInput.trim(), lookbackDays, strictness);
  };

  const handleCopyJson = () => {
    if (!hindcastResult) return;
    navigator.clipboard.writeText(JSON.stringify(hindcastResult, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-[#0a1829] to-[#071324] p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-cyan-500/50 bg-cyan-950/90 text-cyan-400 shadow-md">
              <Waves className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold tracking-wide text-white">
                  Trajectory Hindcasting & Hydrodynamic Drift Engine
                </h2>
                <span className="rounded border border-cyan-500/40 bg-cyan-950/80 px-2 py-0.5 text-[10px] font-bold text-cyan-300">
                  FAY & MACKAY SOLVER
                </span>
                <Tooltip text="Multi-day time-series voyage reconstruction correlated with Runge-Kutta 4th-order hydrodynamic oil spill reverse transport. Analytical Estimates based on SAR features." />
              </div>
              <p className="mt-1 text-xs text-slate-300 max-w-3xl">
                Reconstruct historical vessel voyages backward in time (1–28 days) using multi-provider AIS telemetry. Correlate ocean currents, wind-driven surface Ekman transport, and Stokes wave drift to pinpoint the discharge point of origin with uncertainty ellipses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleRunHindcast(selectedMmsi, lookbackDays, strictness)}
              disabled={isLoading}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-cyan-500 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              <span>Recompute Hindcast</span>
            </button>
          </div>
        </div>

        {/* Preset Vessel Selector & Controls Bar */}
        <div className="mt-6 border-t border-[#152e4d] pt-5">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Benchmark Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 mr-1">Benchmark Vessels:</span>
              {BENCHMARK_VESSEL_PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                    selectedMmsi === p.id && !customMmsiInput
                      ? "border-cyan-500 bg-cyan-950 text-white font-bold"
                      : "border-[#142842] bg-[#071324] text-slate-300 hover:border-slate-600"
                  }`}
                >
                  <span className="text-cyan-400 font-bold mr-1.5">●</span>
                  {p.name} ({p.type})
                </button>
              ))}
            </div>

            {/* Lookback & Custom MMSI Search */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Lookback Window Selector */}
              <div className="flex items-center gap-1.5 text-xs text-slate-300">
                <Clock className="h-3.5 w-3.5 text-cyan-400" />
                <span>Lookback:</span>
                <select
                  value={lookbackDays}
                  onChange={(e) => {
                    const days = parseInt(e.target.value, 10);
                    setLookbackDays(days);
                    handleRunHindcast(selectedMmsi, days, strictness);
                  }}
                  className="rounded-lg border border-[#142842] bg-[#071324] px-2.5 py-1.5 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value={1}>1 Day (24h)</option>
                  <option value={3}>3 Days (72h)</option>
                  <option value={7}>7 Days (1 Week)</option>
                  <option value={14}>14 Days (2 Weeks)</option>
                  <option value={28}>28 Days (4 Weeks)</option>
                </select>
              </div>

              {/* Custom MMSI Form */}
              <form onSubmit={handleCustomSearch} className="flex items-center gap-1.5">
                <input
                  type="text"
                  placeholder="Enter MMSI (e.g. 353161000)..."
                  value={customMmsiInput}
                  onChange={(e) => setCustomMmsiInput(e.target.value)}
                  className="w-48 rounded-lg border border-[#142842] bg-[#071324] px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-[#142842] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:bg-cyan-600 hover:text-white"
                >
                  Query
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="rounded-xl border border-rose-500/40 bg-rose-950/40 p-4 text-xs text-rose-200 flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Loading Skeleton */}
      {isLoading && !hindcastResult && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-[#17304f] bg-[#0a1526]/80 p-16 text-center shadow-lg">
          <Loader2 className="h-10 w-10 animate-spin text-cyan-400 mb-4" />
          <h3 className="text-base font-bold text-white">
            Reconstructing Vessel Trajectory & Solving Hydrodynamic Drift...
          </h3>
          <p className="mt-1 text-xs text-slate-400 max-w-md">
            Querying historical AIS transponder logs, interpolating transmission blackouts, and calculating Runge-Kutta 4th-order backward ray tracing vectors.
          </p>
        </div>
      )}

      {/* Main Hindcast Results Display */}
      {hindcastResult && (
        <div className="space-y-6">
          {/* 1. Origin Hypothesis Card */}
          <OriginHypothesisCard
            hypothesis={hindcastResult.trajectory.origin_hypothesis}
            vesselName={hindcastResult.vessel_name}
            mmsi={hindcastResult.vessel_id}
            onReplayPath={() => {
              const el = document.getElementById("hindcast-timeline-container");
              if (el) el.scrollIntoView({ behavior: "smooth" });
            }}
          />

          {/* 2. Hydrodynamic Drift & Vector Map Stage */}
          <DriftVisualization
            driftAnalysis={hindcastResult.drift_analysis}
            originHypothesis={hindcastResult.trajectory.origin_hypothesis}
            historicalPositions={hindcastResult.trajectory.historical_positions}
            vesselName={hindcastResult.vessel_name}
          />

          {/* 3. Interactive Voyage Playback Timeline */}
          <HindcastTimeline hindcastResult={hindcastResult} />

          {/* 4. Multi-Tier Anomaly Threshold Control */}
          <AnomalyThresholdControl
            currentStrictness={strictness}
            onStrictnessChange={handleStrictnessChange}
            onCustomConfigApply={handleCustomConfigApply}
            detectedCount={hindcastResult.anomaly_assessment.flags.length}
          />

          {/* 5. Comparison & Hydrodynamic Metrics */}
          <ComparisonMetrics hindcastResult={hindcastResult} />

          {/* 6. Anomaly Log Table & JSON Inspector Toggle */}
          <div className="rounded-xl border border-[#17304f] bg-[#0b1728]/90 p-5 shadow-lg">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold tracking-wide text-white">
                    Chronological Anomaly Audit & SOLAS Compliance Flags
                  </h3>
                  <span className="rounded border border-rose-500/40 bg-rose-950/70 px-2 py-0.5 text-[10px] font-bold text-rose-300">
                    {hindcastResult.anomaly_assessment.flags.length} FLAGS IDENTIFIED
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Evaluated with {hindcastResult.anomaly_assessment.strictness_level.toUpperCase()} sensitivity profile
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonInspector(!showJsonInspector)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#17304f] bg-[#071324] px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-cyan-500 hover:text-white"
                >
                  <Code2 className="h-3.5 w-3.5 text-cyan-400" />
                  <span>{showJsonInspector ? "Hide JSON" : "Inspect Raw JSON"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-500"
                >
                  <Copy className="h-3.5 w-3.5" />
                  <span>{copied ? "Copied!" : "Copy JSON"}</span>
                </button>
              </div>
            </div>

            {/* Anomaly Table */}
            {hindcastResult.anomaly_assessment.flags.length === 0 ? (
              <div className="rounded-lg border border-[#132742] bg-[#071221] p-6 text-center text-xs text-slate-400">
                Nominal navigation: No anomalies flagged under the active threshold strictness.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-[#152e4d] text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <tr>
                      <th className="pb-2.5">Severity</th>
                      <th className="pb-2.5">Anomaly Type</th>
                      <th className="pb-2.5">Timestamp</th>
                      <th className="pb-2.5">Description & Evidence</th>
                      <th className="pb-2.5">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132742]">
                    {hindcastResult.anomaly_assessment.flags.map((flag, idx) => {
                      const badgeColor =
                        flag.severity === "CRITICAL"
                          ? "border-rose-500/50 bg-rose-950/70 text-rose-300"
                          : flag.severity === "HIGH"
                          ? "border-orange-500/50 bg-orange-950/70 text-orange-300"
                          : flag.severity === "MEDIUM"
                          ? "border-amber-500/50 bg-amber-950/70 text-amber-300"
                          : "border-cyan-500/50 bg-cyan-950/70 text-cyan-300";

                      return (
                        <tr key={idx} className="hover:bg-[#091526]/60 transition">
                          <td className="py-3">
                            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${badgeColor}`}>
                              {flag.severity}
                            </span>
                          </td>
                          <td className="py-3 font-semibold text-white uppercase text-[11px]">
                            {flag.type.replace("_", " ")}
                          </td>
                          <td className="py-3 font-mono text-[11px] text-slate-400">
                            {flag.timestamp
                              ? new Date(flag.timestamp).toUTCString().replace("GMT", "UTC")
                              : "During transit"}
                          </td>
                          <td className="py-3 text-slate-200 max-w-md">{flag.description}</td>
                          <td className="py-3 font-mono text-cyan-400 font-bold">
                            {Math.round(flag.confidence * 100)}%
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Raw JSON Code Inspector Modal/Box */}
            {showJsonInspector && (
              <div className="mt-4 rounded-lg border border-[#17304f] bg-[#050c17] p-4">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-xs text-slate-400">
                  <span className="font-mono">POST /api/hindcast/vessel Response Schema</span>
                  <button
                    type="button"
                    onClick={handleCopyJson}
                    className="text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" />
                    <span>{copied ? "Copied" : "Copy Raw JSON"}</span>
                  </button>
                </div>
                <pre className="max-h-96 overflow-auto font-mono text-[11px] text-emerald-300 leading-relaxed">
                  {JSON.stringify(hindcastResult, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
