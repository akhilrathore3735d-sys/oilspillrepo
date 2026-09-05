import React from "react";
import {
  AlertTriangle,
  Flame,
  Layers,
  Radio,
  Satellite,
  ShieldAlert,
  Clock,
  ArrowRight,
  TrendingUp,
  Cpu
} from "lucide-react";
import { AnalysisResponse } from "../types";

interface DashboardOverviewProps {
  currentAnalysis: AnalysisResponse | null;
  onNavigateToAnalyze: () => void;
  onOpenDemo: () => void;
  onViewResults: () => void;
}

export const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  currentAnalysis,
  onNavigateToAnalyze,
  onOpenDemo,
  onViewResults,
}) => {
  // Simulated historical event log for the dashboard
  const recentEvents = [
    {
      id: "EVT-2026-081",
      timestamp: "2026-09-05 12:30 UTC",
      orbit: "Sentinel-1A Descending (Track 142)",
      location: "Arabian Sea - Sector Bravo",
      riskLevel: "HIGH",
      areaPx: 14280,
      status: "Candidate Verified",
    },
    {
      id: "EVT-2026-079",
      timestamp: "2026-09-04 18:15 UTC",
      orbit: "Sentinel-1B Ascending (Track 064)",
      location: "Bay of Bengal - Offshore Basin",
      riskLevel: "CRITICAL",
      areaPx: 23150,
      status: "Containment Dispatched",
    },
    {
      id: "EVT-2026-077",
      timestamp: "2026-09-03 06:45 UTC",
      orbit: "Sentinel-1A Descending (Track 022)",
      location: "Gulf of Mannar",
      riskLevel: "MEDIUM",
      areaPx: 4890,
      status: "Weathering Dispersed",
    },
    {
      id: "EVT-2026-074",
      timestamp: "2026-09-02 14:10 UTC",
      orbit: "Sentinel-1A Ascending (Track 115)",
      location: "Mumbai Offshore Transit Corridor",
      riskLevel: "LOW",
      areaPx: 920,
      status: "Closed / Look-alike",
    },
  ];

  const activeAlertsCount = currentAnalysis?.detection.detected ? 3 : 2;
  const highRiskCount = currentAnalysis?.risk.level === "CRITICAL" || currentAnalysis?.risk.level === "HIGH" ? 2 : 1;
  const totalAreaPx = (currentAnalysis?.geometry.pixel_area || 0) + 42320;

  return (
    <div className="space-y-6">
      {/* Top Banner / Call to Action */}
      <div className="relative overflow-hidden rounded-xl border border-[#162f50] bg-gradient-to-r from-[#0a172a] via-[#0d1e36] to-[#081527] p-6 shadow-xl">
        <div className="relative z-10 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
              <span className="text-xs font-semibold tracking-wider text-cyan-400 uppercase">
                Operational Surveillance Active
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Sentinel-1 SAR Oil Spill Early Warning System
            </h1>
            <p className="max-w-2xl text-sm text-slate-300">
              Autonomous microwave radar intelligence pipeline for detection, high-resolution morphological segmentation, relative weathering estimation, and multi-temporal anomaly tracking.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              id="dash-analyze-btn"
              onClick={onNavigateToAnalyze}
              className="flex items-center gap-2 rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-cyan-950/40 transition hover:bg-cyan-500"
            >
              <Radio className="h-4 w-4" />
              <span>Analyze New SAR Tile</span>
            </button>
            <button
              id="dash-demo-btn"
              onClick={onOpenDemo}
              className="flex items-center gap-2 rounded-lg border border-[#1b3558] bg-[#0c1a2f] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-[#11233e] hover:text-white"
            >
              <Cpu className="h-4 w-4 text-cyan-400" />
              <span>Run Demo Pipeline</span>
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1 */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Spill Alerts</span>
            <div className="rounded-lg bg-rose-950/60 p-2 text-rose-400 border border-rose-800/40">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{activeAlertsCount}</span>
            <span className="text-xs text-rose-400 font-medium">Candidate Anomalies</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Tracked in consecutive Sentinel-1 orbits</p>
        </div>

        {/* Metric 2 */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Monitored Footprint</span>
            <div className="rounded-lg bg-cyan-950/60 p-2 text-cyan-400 border border-cyan-800/40">
              <Layers className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{totalAreaPx.toLocaleString()}</span>
            <span className="text-xs text-cyan-400 font-medium">pixels (image space)</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Est. ~{(totalAreaPx * 0.0001).toFixed(1)} km² @ 10m spatial resolution</p>
        </div>

        {/* Metric 3 */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">High / Critical Events</span>
            <div className="rounded-lg bg-orange-950/60 p-2 text-orange-400 border border-orange-800/40">
              <ShieldAlert className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{highRiskCount}</span>
            <span className="text-xs text-orange-400 font-medium">Escalated Priority</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Containment directives pending review</p>
        </div>

        {/* Metric 4 */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Constellation Status</span>
            <div className="rounded-lg bg-emerald-950/60 p-2 text-emerald-400 border border-emerald-800/40">
              <Satellite className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-emerald-400">ACTIVE</span>
            <span className="text-xs text-slate-400 font-medium">6-day Revisit</span>
          </div>
          <p className="mt-1 text-xs text-slate-400">Copernicus Sentinel-1 IW Mode VV+VH</p>
        </div>
      </div>

      {/* Active Scene Preview Card (if an image was analyzed) */}
      {currentAnalysis && (
        <div className="rounded-xl border border-cyan-800/50 bg-gradient-to-br from-[#0a172a] via-[#0c1a2e] to-[#071322] p-5 shadow-lg">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="rounded bg-cyan-950/80 px-2 py-0.5 text-xs font-semibold text-cyan-300 border border-cyan-700/50">
                  CURRENT SCENE LOADED
                </span>
                <span
                  className={`rounded px-2 py-0.5 text-xs font-semibold uppercase ${
                    currentAnalysis.risk.level === "CRITICAL"
                      ? "bg-rose-950 text-rose-300 border border-rose-800"
                      : currentAnalysis.risk.level === "HIGH"
                      ? "bg-orange-950 text-orange-300 border border-orange-800"
                      : currentAnalysis.risk.level === "MEDIUM"
                      ? "bg-amber-950 text-amber-300 border border-amber-800"
                      : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                  }`}
                >
                  Risk: {currentAnalysis.risk.level} ({currentAnalysis.risk.score})
                </span>
              </div>
              <h3 className="text-lg font-bold text-white">
                Candidate Anomaly: {currentAnalysis.geometry.pixel_area.toLocaleString()} px ({currentAnalysis.geometry.area_percentage}% of scene)
              </h3>
              <p className="text-xs text-slate-300 max-w-2xl">
                {currentAnalysis.risk.summary}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="h-16 w-16 overflow-hidden rounded-lg border border-[#1a3354] bg-black">
                <img
                  src={currentAnalysis.images.overlay}
                  alt="Current Overlay"
                  className="h-full w-full object-cover"
                />
              </div>
              <button
                id="view-full-telemetry-btn"
                onClick={onViewResults}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500 bg-cyan-950/60 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/60"
              >
                <span>Inspect Full Telemetry</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* System Pipeline Architecture Infographic */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5">
        <h3 className="text-sm font-semibold tracking-wider text-slate-300 uppercase mb-3">
          Integrated Satellite Multi-Stage Processing Pipeline
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
          {[
            { step: "01", name: "Preprocessing", desc: "Speckle suppression & CLAHE" },
            { step: "02", name: "Detection", desc: "Adaptive dark-spot thresholding" },
            { step: "03", name: "Segmentation", desc: "Morphology & contour extraction" },
            { step: "04", name: "Features", desc: "Area, perimeter, moments & centroid" },
            { step: "05", name: "Weathering", desc: "Dispersion & gradient edge analysis" },
            { step: "06", name: "Change Detection", desc: "Multi-temporal T1 vs T2 drift" },
            { step: "07", name: "Risk Engine", desc: "Multi-factor hazard scoring" },
            { step: "08", name: "AI Briefing", desc: "Executive intelligence generation" },
          ].map((item, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-[#152a45] bg-[#060e1d]/80 p-3 text-center transition hover:border-cyan-500/50"
            >
              <span className="text-[10px] font-bold text-cyan-400">{item.step}</span>
              <p className="text-xs font-semibold text-slate-200 mt-1">{item.name}</p>
              <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Surveillance Log Table */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold tracking-wider text-white uppercase">
              Recent Orbit Analyses & Surveillance Log
            </h3>
          </div>
          <span className="text-xs text-slate-400">Synchronized with Copernicus Marine Service</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="border-b border-[#132742] bg-[#07101f] text-[11px] uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Timestamp (UTC)</th>
                <th className="px-4 py-3">Satellite Orbit Track</th>
                <th className="px-4 py-3">Sector</th>
                <th className="px-4 py-3">Risk Level</th>
                <th className="px-4 py-3">Candidate Footprint</th>
                <th className="px-4 py-3">Operational State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#132742]/70 font-mono text-[11px]">
              {recentEvents.map((evt) => (
                <tr key={evt.id} className="transition hover:bg-[#0e1e36]/50">
                  <td className="px-4 py-3 font-semibold text-cyan-400">{evt.id}</td>
                  <td className="px-4 py-3 text-slate-300">{evt.timestamp}</td>
                  <td className="px-4 py-3 text-slate-400">{evt.orbit}</td>
                  <td className="px-4 py-3 text-slate-200">{evt.location}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        evt.riskLevel === "CRITICAL"
                          ? "bg-rose-950 text-rose-300 border border-rose-800"
                          : evt.riskLevel === "HIGH"
                          ? "bg-orange-950 text-orange-300 border border-orange-800"
                          : evt.riskLevel === "MEDIUM"
                          ? "bg-amber-950 text-amber-300 border border-amber-800"
                          : "bg-emerald-950 text-emerald-300 border border-emerald-800"
                      }`}
                    >
                      {evt.riskLevel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-200">{evt.areaPx.toLocaleString()} px</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-[#0e1e36] px-2 py-0.5 text-slate-300 border border-[#1b3558]">
                      {evt.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
