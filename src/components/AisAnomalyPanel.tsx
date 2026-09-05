import React, { useState } from "react";
import {
  Ship,
  Radio,
  Crosshair,
  Compass,
  Gauge,
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  Copy,
  Check,
  RefreshCw,
  Info,
  Sparkles,
  Sliders,
  ArrowRight,
  HelpCircle,
  FileCode
} from "lucide-react";
import {
  SatelliteDetectionPayload,
  AisCorrelationPayload,
  VesselAnomalyResponse,
} from "../types";
import { analyzeVesselAnomaly } from "../services/api";
import { Tooltip } from "./Tooltip";

interface BenchmarkPreset {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  satellite: SatelliteDetectionPayload;
  ais: AisCorrelationPayload;
}

const PRESETS: BenchmarkPreset[] = [
  {
    id: "dark_tanker",
    name: "Dark Crude Tanker",
    badge: "Risk Level 4 • Dark Ship",
    badgeColor: "bg-rose-950 text-rose-300 border-rose-800",
    description: "245m tanker contact near shipping corridor with transponder powered off (SOLAS Chapter V breach).",
    satellite: {
      timestamp: "2026-09-05 06:42 UTC",
      location: "18°55'N, 72°48'E",
      vessel_type: "Crude Oil Tanker",
      length: 245,
      heading: 215,
      speed_estimate: 12.4,
      confidence: 94,
    },
    ais: {
      matched_vessel: "NO MATCH",
      ais_heading: null,
      ais_speed: null,
      last_ais_report: "N/A",
      status: "MISSING",
    },
  },
  {
    id: "spoofing_container",
    name: "Speed & Course Spoofing",
    badge: "Risk Level 4 • Spoofing Alert",
    badgeColor: "bg-orange-950 text-orange-300 border-orange-800",
    description: "Satellite detects 18.2 kts on heading 290°, but AIS falsely broadcasts 4.1 kts on heading 110°.",
    satellite: {
      timestamp: "2026-09-05 07:15 UTC",
      location: "24°30'N, 57°12'E",
      vessel_type: "Container Ship",
      length: 330,
      heading: 290,
      speed_estimate: 18.2,
      confidence: 91,
    },
    ais: {
      matched_vessel: "IMO 9312844 / PACIFIC TRADER",
      ais_heading: 110,
      ais_speed: 4.1,
      last_ais_report: "2026-09-05 07:12 UTC",
      status: "ACTIVE",
    },
  },
  {
    id: "compliant_bulk",
    name: "Compliant Bulk Carrier",
    badge: "Risk Level 1 • Consistent",
    badgeColor: "bg-emerald-950 text-emerald-300 border-emerald-800",
    description: "Radar Doppler kinematics closely align with active Class A transponder broadcast.",
    satellite: {
      timestamp: "2026-09-05 05:20 UTC",
      location: "22°10'N, 68°45'E",
      vessel_type: "Bulk Carrier",
      length: 190,
      heading: 142,
      speed_estimate: 11.8,
      confidence: 89,
    },
    ais: {
      matched_vessel: "IMO 9548231 / STAR HORIZON",
      ais_heading: 140,
      ais_speed: 12.0,
      last_ais_report: "2026-09-05 05:18 UTC",
      status: "ACTIVE",
    },
  },
  {
    id: "artisanal_fishing",
    name: "Artisanal Fishing Craft",
    badge: "Risk Level 2 • Small Craft",
    badgeColor: "bg-cyan-950 text-cyan-300 border-cyan-800",
    description: "Small 16m wooden hull boat without Class A transponder (non-mandated under SOLAS rules).",
    satellite: {
      timestamp: "2026-09-05 08:00 UTC",
      location: "19°02'N, 72°50'E",
      vessel_type: "Fishing Vessel",
      length: 16,
      heading: 45,
      speed_estimate: 6.5,
      confidence: 82,
    },
    ais: {
      matched_vessel: "NO MATCH",
      ais_heading: null,
      ais_speed: null,
      last_ais_report: "N/A",
      status: "MISSING",
    },
  },
];

export const AisAnomalyPanel: React.FC = () => {
  // Form State
  const [satTimestamp, setSatTimestamp] = useState<string>("2026-09-05 06:42 UTC");
  const [satLocation, setSatLocation] = useState<string>("18°55'N, 72°48'E");
  const [satVesselType, setSatVesselType] = useState<string>("Crude Oil Tanker");
  const [satLength, setSatLength] = useState<number>(245);
  const [satHeading, setSatHeading] = useState<number>(215);
  const [satSpeed, setSatSpeed] = useState<number>(12.4);
  const [satConfidence, setSatConfidence] = useState<number>(94);

  const [aisMatchedVessel, setAisMatchedVessel] = useState<string>("NO MATCH");
  const [aisHeading, setAisHeading] = useState<string>("");
  const [aisSpeed, setAisSpeed] = useState<string>("");
  const [aisLastReport, setAisLastReport] = useState<string>("N/A");
  const [aisStatus, setAisStatus] = useState<string>("MISSING");

  // Execution & Output State
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [result, setResult] = useState<VesselAnomalyResponse | null>(null);
  const [showJsonRaw, setShowJsonRaw] = useState<boolean>(false);
  const [copiedJson, setCopiedJson] = useState<boolean>(false);

  // Load Preset
  const handleLoadPreset = (preset: BenchmarkPreset) => {
    setErrorMsg(null);
    setSatTimestamp(preset.satellite.timestamp);
    setSatLocation(preset.satellite.location);
    setSatVesselType(preset.satellite.vessel_type);
    setSatLength(preset.satellite.length);
    setSatHeading(preset.satellite.heading);
    setSatSpeed(preset.satellite.speed_estimate);
    setSatConfidence(preset.satellite.confidence);

    setAisMatchedVessel(preset.ais.matched_vessel);
    setAisHeading(preset.ais.ais_heading !== null && preset.ais.ais_heading !== undefined ? String(preset.ais.ais_heading) : "");
    setAisSpeed(preset.ais.ais_speed !== null && preset.ais.ais_speed !== undefined ? String(preset.ais.ais_speed) : "");
    setAisLastReport(preset.ais.last_ais_report || "N/A");
    setAisStatus(preset.ais.status);
  };

  // Run Anomaly Analysis
  const handleRunAnalysis = async () => {
    try {
      setIsLoading(true);
      setErrorMsg(null);

      const satPayload: SatelliteDetectionPayload = {
        timestamp: satTimestamp.trim() || new Date().toISOString().slice(0, 19).replace("T", " ") + " UTC",
        location: satLocation.trim() || "18°55'N, 72°48'E",
        vessel_type: satVesselType.trim() || "Unknown Vessel",
        length: Number(satLength) || 0,
        heading: Number(satHeading) || 0,
        speed_estimate: Number(satSpeed) || 0,
        confidence: Number(satConfidence) || 85,
      };

      const aisPayload: AisCorrelationPayload = {
        matched_vessel: aisMatchedVessel.trim() || "NO MATCH",
        ais_heading: aisHeading.trim() !== "" ? Number(aisHeading) : null,
        ais_speed: aisSpeed.trim() !== "" ? Number(aisSpeed) : null,
        last_ais_report: aisLastReport.trim() !== "" ? aisLastReport : "N/A",
        status: aisStatus,
      };

      const response = await analyzeVesselAnomaly(satPayload, aisPayload);
      setResult(response);
    } catch (err: any) {
      console.error("Analysis execution error:", err);
      setErrorMsg(err?.message || "Failed to complete AIS anomaly correlation.");
    } finally {
      setIsLoading(false);
    }
  };

  // Copy JSON to clipboard
  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  // Determine Risk Theme
  const getRiskColor = (level: number) => {
    switch (level) {
      case 5:
        return {
          badge: "bg-rose-950 text-rose-300 border-rose-800",
          bar: "bg-rose-500",
          label: "LEVEL 5 • CRITICAL THREAT",
        };
      case 4:
        return {
          badge: "bg-rose-950 text-rose-300 border-rose-800",
          bar: "bg-rose-500",
          label: "LEVEL 4 • HIGH HAZARD",
        };
      case 3:
        return {
          badge: "bg-orange-950 text-orange-300 border-orange-800",
          bar: "bg-orange-500",
          label: "LEVEL 3 • ELEVATED ANOMALY",
        };
      case 2:
        return {
          badge: "bg-amber-950 text-amber-300 border-amber-800",
          bar: "bg-amber-500",
          label: "LEVEL 2 • MINOR DISCREPANCY",
        };
      default:
        return {
          badge: "bg-emerald-950 text-emerald-300 border-emerald-800",
          bar: "bg-emerald-500",
          label: "LEVEL 1 • COMPLIANT TRANSIT",
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Viewport Header */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Ship className="h-6 w-6 text-cyan-400" />
              <span>Satellite Vessel Detection & AIS Anomaly Correlation</span>
            </h2>
            <span className="rounded border border-cyan-500/30 bg-cyan-950/60 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
              SOLAS Chapter V
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1 max-w-3xl">
            Correlate orbital radar/optical detections with terrestrial & satellite AIS transponder records to flag dark vessels, transponder shutdowns, and kinematic track spoofing.
          </p>
        </div>

        {/* Scientific Disclaimer Badge with Tooltip */}
        <Tooltip
          title="Vessel Telemetry Assessment"
          content="Analytical Estimate based on SAR features: Kinematic discrepancies and dark-ship probabilities represent multi-sensor orbital cross-correlation. Conclusive legal determination of illicit activity requires boarding or physical maritime interdiction."
          position="bottom"
          size="lg"
        >
          <div className="rounded-lg border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-[11px] text-amber-300 flex items-center gap-1.5 hover:bg-amber-950/60 transition cursor-help">
            <Info className="h-4 w-4 shrink-0 text-amber-400" />
            <span>Analytical Estimates based on SAR features</span>
            <HelpCircle className="h-3.5 w-3.5 text-amber-400" />
          </div>
        </Tooltip>
      </div>

      {/* Preset Scenarios Selector */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-4 backdrop-blur">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-cyan-400" />
            <span>Operational Test Scenarios</span>
          </span>
          <span className="text-[11px] text-slate-400">Click to pre-fill observation telemetry</span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleLoadPreset(p)}
              className="group text-left rounded-lg border border-[#152945] bg-[#060e1d] p-3 transition hover:border-cyan-500/50 hover:bg-[#0c1c36]"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-white group-hover:text-cyan-300">{p.name}</span>
                <span className={`rounded border px-1.5 py-0.5 text-[9px] font-mono font-bold uppercase ${p.badgeColor}`}>
                  {p.badge.split("•")[0].trim()}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">{p.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Input Parameters Form (2 Columns: Satellite vs AIS) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left Card: Satellite Detection */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-[#132742] pb-3">
            <div className="flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                1. Satellite Detection (SAR / Optical)
              </h3>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">SENSOR TELEMETRY</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Acquisition Timestamp</label>
              <input
                type="text"
                value={satTimestamp}
                onChange={(e) => setSatTimestamp(e.target.value)}
                placeholder="YYYY-MM-DD HH:MM UTC"
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Observation Coordinates (Lat, Lon)</label>
              <input
                type="text"
                value={satLocation}
                onChange={(e) => setSatLocation(e.target.value)}
                placeholder="e.g. 18°55'N, 72°48'E"
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Vessel Type Classification</label>
              <select
                value={satVesselType}
                onChange={(e) => setSatVesselType(e.target.value)}
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="Crude Oil Tanker">Crude Oil Tanker</option>
                <option value="Product Tanker">Product Tanker / Chemical</option>
                <option value="Container Ship">Container Ship</option>
                <option value="Bulk Carrier">Bulk Carrier</option>
                <option value="Fishing Vessel">Fishing Vessel</option>
                <option value="Offshore Supply Vessel">Offshore Supply Vessel</option>
                <option value="Unknown Surface Vessel">Unknown Surface Vessel</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Estimated Length (Meters)</label>
              <input
                type="number"
                value={satLength}
                onChange={(e) => setSatLength(Number(e.target.value))}
                min={5}
                max={500}
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
              <span className="text-[10px] text-slate-500">IMO SOLAS Chapter V threshold: ≥45m</span>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Observed Heading (Degrees 0–360°)</label>
              <input
                type="number"
                value={satHeading}
                onChange={(e) => setSatHeading(Number(e.target.value))}
                min={0}
                max={360}
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Doppler Speed Estimate (Knots)</label>
              <input
                type="number"
                step="0.1"
                value={satSpeed}
                onChange={(e) => setSatSpeed(Number(e.target.value))}
                min={0}
                max={45}
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <div className="flex justify-between text-[11px] font-medium text-slate-400 mb-1">
                <span>Radar Detection Confidence</span>
                <span className="font-mono text-cyan-400">{satConfidence}%</span>
              </div>
              <input
                type="range"
                min={40}
                max={100}
                value={satConfidence}
                onChange={(e) => setSatConfidence(Number(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* Right Card: AIS Correlation Results */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur space-y-4">
          <div className="flex items-center justify-between border-b border-[#132742] pb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                2. Correlated AIS Transponder Telemetry
              </h3>
            </div>
            <span className="text-[10px] text-cyan-400 font-mono">TERRESTRIAL / SATELLITE AIS</span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-[11px] font-medium text-slate-400 mb-1">
                Matched Vessel (Name / MMSI or "NO MATCH")
              </label>
              <input
                type="text"
                value={aisMatchedVessel}
                onChange={(e) => setAisMatchedVessel(e.target.value)}
                placeholder="e.g. IMO 9412345 / TITAN EXPLORER or NO MATCH"
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Reported AIS Heading (Degrees or empty)</label>
              <input
                type="text"
                value={aisHeading}
                onChange={(e) => setAisHeading(e.target.value)}
                placeholder="e.g. 215 or leave blank"
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Reported AIS Speed (SOG Knots or empty)</label>
              <input
                type="text"
                value={aisSpeed}
                onChange={(e) => setAisSpeed(e.target.value)}
                placeholder="e.g. 12.4 or leave blank"
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Last AIS Report Time</label>
              <input
                type="text"
                value={aisLastReport}
                onChange={(e) => setAisLastReport(e.target.value)}
                placeholder="e.g. 2026-09-05 06:40 UTC or N/A"
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 font-mono text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-400 mb-1">Transponder Broadcast Status</label>
              <select
                value={aisStatus}
                onChange={(e) => setAisStatus(e.target.value)}
                className="w-full rounded-lg border border-[#1a3354] bg-[#060e1d] px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
              >
                <option value="ACTIVE">ACTIVE (Transponder transmitting)</option>
                <option value="INACTIVE">INACTIVE (Powered down / stationary)</option>
                <option value="MISSING">MISSING (No transponder broadcast detected)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Action Trigger Button */}
      <div className="flex justify-center">
        <button
          id="run-ais-anomaly-btn"
          disabled={isLoading}
          onClick={handleRunAnalysis}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 px-8 py-3 text-sm font-bold text-white shadow-xl shadow-cyan-950/50 transition hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Correlating Orbit Kinematics & Transponder Logs...</span>
            </>
          ) : (
            <>
              <Crosshair className="h-4 w-4" />
              <span>Execute Vessel Anomaly & Dark Ship Analysis</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-800 bg-rose-950/40 p-4 text-xs text-rose-300 flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Structured Analysis Results */}
      {result && (
        <div className="space-y-6 pt-2">
          {/* Top Level Diagnostic Banner */}
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/90 p-6 backdrop-blur shadow-xl">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* Metric 1: AIS Consistency */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">AIS Correlation Status</span>
                  <Tooltip
                    title="AIS Consistency"
                    content="Analytical Estimate based on SAR features: Determines whether satellite radar observation agrees with registered AIS transceiver telemetry."
                    position="top"
                    size="sm"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  {result.ais_consistent ? (
                    <span className="rounded-lg border border-emerald-800 bg-emerald-950 px-3 py-1 text-sm font-bold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Consistent</span>
                    </span>
                  ) : (
                    <span className="rounded-lg border border-rose-800 bg-rose-950 px-3 py-1 text-sm font-bold text-rose-300 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4 text-rose-400" />
                      <span>Discrepant / Uncorrelated</span>
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-mono">
                  {result.ais_consistent ? "Radio beacon matches kinematics" : "Anomalous mismatch detected"}
                </span>
              </div>

              {/* Metric 2: Operational Threat Level */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Threat / Risk Tier</span>
                  <Tooltip
                    title="Risk Tier"
                    content="Analytical Estimate based on SAR features: Multi-criteria risk rating (1 to 5) evaluating transponder shutdown, vessel tonnage, and navigational spoofing."
                    position="top"
                    size="sm"
                  />
                </div>
                <div className="pt-1">
                  <span className={`rounded-lg border px-3 py-1 text-sm font-bold uppercase inline-block ${getRiskColor(result.risk_level).badge}`}>
                    {getRiskColor(result.risk_level).label}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                  <div
                    className={`h-full ${getRiskColor(result.risk_level).bar}`}
                    style={{ width: `${(result.risk_level / 5) * 100}%` }}
                  />
                </div>
              </div>

              {/* Metric 3: Dark Ship Likelihood */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Dark Ship Likelihood</span>
                  <Tooltip
                    title="Dark Ship Probability"
                    content="Analytical Estimate based on SAR features: Probability that vessel is deliberately operating without broadcasting required Class A transponder signals."
                    position="top"
                    size="sm"
                  />
                </div>
                <div className="font-mono text-2xl font-black text-rose-400 pt-0.5">
                  {result.dark_ship_likelihood}
                </div>
                <span className="text-[10px] text-slate-400">
                  {parseInt(result.dark_ship_likelihood) > 50 ? "High probability transponder shutdown" : "Normal transponder visibility"}
                </span>
              </div>

              {/* Metric 4: Spoofing Likelihood */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-medium">Spoofing Likelihood</span>
                  <Tooltip
                    title="Spoofing Probability"
                    content="Analytical Estimate based on SAR features: Likelihood of GNSS manipulation, false speed/heading injection, or cloned transponder transmission."
                    position="top"
                    size="sm"
                  />
                </div>
                <div className="font-mono text-2xl font-black text-purple-400 pt-0.5">
                  {result.spoofing_likelihood}
                </div>
                <span className="text-[10px] text-slate-400">
                  {parseInt(result.spoofing_likelihood) > 40 ? "Kinematic course manipulation flagged" : "Kinematics within tolerance"}
                </span>
              </div>
            </div>
          </div>

          {/* Diagnostic Breakdown: Discrepancies & Anomalies */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Identified Discrepancies */}
            <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <span>Identified Discrepancies ({result.discrepancies.length})</span>
              </h3>

              <div className="space-y-2">
                {result.discrepancies.map((d, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-[#152a45] bg-[#060e1d] p-3 text-xs text-slate-200">
                    <span className="rounded bg-amber-950/80 px-1.5 py-0.5 font-mono text-[10px] text-amber-400 border border-amber-800/60 shrink-0">
                      0{idx + 1}
                    </span>
                    <span className="leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomalies Detected */}
            <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
                <ShieldAlert className="h-4 w-4 text-cyan-400" />
                <span>Detected Anomaly Signatures</span>
              </h3>

              <div className="space-y-2">
                {result.anomalies_detected.map((a, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-[#152a45] bg-[#060e1d] p-3 text-xs text-slate-200">
                    <span className="rounded bg-cyan-950/80 px-1.5 py-0.5 font-mono text-[10px] text-cyan-400 border border-cyan-800/60 shrink-0">
                      TAG
                    </span>
                    <span className="font-semibold text-white">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Detailed Reason Assessment */}
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-400" />
              <span>Operational Maritime Assessment & Technical Reason</span>
            </h3>
            <p className="text-xs text-slate-200 leading-relaxed bg-[#060e1d] p-4 rounded-lg border border-[#152a45]">
              {result.reason}
            </p>
          </div>

          {/* Recommended Operational Directives */}
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-cyan-400" />
              <span>Recommended Operational Interdiction Directives</span>
            </h3>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {result.recommended_actions.map((act, idx) => (
                <div key={idx} className="flex items-start gap-2.5 rounded-lg border border-[#152a45] bg-[#060e1d] p-3 text-xs text-slate-200">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-cyan-400 mt-0.5" />
                  <span className="leading-relaxed">{act}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Raw JSON Inspector */}
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/90 p-5 backdrop-blur">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileCode className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Raw JSON Telemetry Response
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowJsonRaw(!showJsonRaw)}
                  className="rounded border border-[#1b3558] bg-[#060e1d] px-2.5 py-1 text-xs font-semibold text-slate-300 hover:bg-[#0e213b]"
                >
                  {showJsonRaw ? "Collapse JSON" : "Expand JSON"}
                </button>
                <button
                  id="copy-ais-json-btn"
                  onClick={handleCopyJson}
                  className="flex items-center gap-1.5 rounded border border-cyan-500/40 bg-cyan-950/60 px-2.5 py-1 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/60"
                >
                  {copiedJson ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5 text-cyan-400" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {showJsonRaw && (
              <pre className="max-h-96 overflow-auto rounded-lg border border-[#142842] bg-[#030710] p-4 font-mono text-xs text-cyan-300 leading-relaxed">
                {JSON.stringify(result, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
