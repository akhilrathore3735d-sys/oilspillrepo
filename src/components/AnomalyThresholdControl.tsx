import React, { useState } from "react";
import { ChevronDown, ChevronUp, Filter, Gauge, Info, Sliders, Sparkles } from "lucide-react";
import {
  AnomalyStrictness,
  AnomalyThresholdConfig,
  ANOMALY_THRESHOLDS,
} from "../types/anomalyThreshold";
import { Tooltip } from "./Tooltip";

interface AnomalyThresholdControlProps {
  currentStrictness: AnomalyStrictness | string;
  onStrictnessChange: (newStrictness: AnomalyStrictness) => void;
  onCustomConfigApply?: (config: Partial<AnomalyThresholdConfig>) => void;
  detectedCount?: number;
}

export const AnomalyThresholdControl: React.FC<AnomalyThresholdControlProps> = ({
  currentStrictness,
  onStrictnessChange,
  onCustomConfigApply,
  detectedCount = 0,
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const activeKey =
    (currentStrictness as AnomalyStrictness) in ANOMALY_THRESHOLDS
      ? (currentStrictness as AnomalyStrictness)
      : AnomalyStrictness.BALANCED;

  const currentPreset = ANOMALY_THRESHOLDS[activeKey];
  const [customGap, setCustomGap] = useState(currentPreset.minAisGapMinutes);
  const [customHeading, setCustomHeading] = useState(currentPreset.maxHeadingChangeDegreesPerHour);
  const [customSpeed, setCustomSpeed] = useState(currentPreset.maxSpeedDeltaKnots);

  const handleTierSelect = (tier: AnomalyStrictness) => {
    onStrictnessChange(tier);
    const preset = ANOMALY_THRESHOLDS[tier];
    setCustomGap(preset.minAisGapMinutes);
    setCustomHeading(preset.maxHeadingChangeDegreesPerHour);
    setCustomSpeed(preset.maxSpeedDeltaKnots);
  };

  const handleApplyCustom = () => {
    if (onCustomConfigApply) {
      onCustomConfigApply({
        minAisGapMinutes: customGap,
        maxHeadingChangeDegreesPerHour: customHeading,
        maxSpeedDeltaKnots: customSpeed,
      });
    }
  };

  return (
    <div
      id="anomaly-threshold-control"
      className="rounded-xl border border-[#17304f] bg-[#0b1728]/90 p-5 shadow-lg"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-500/40 bg-cyan-950/70 text-cyan-400">
            <Sliders className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold tracking-wide text-white">
                Multi-Tier Anomaly Threshold Control
              </h3>
              <Tooltip text="Adjusts statistical and regulatory filters for vessel dark ship events, GNSS spoofing, and kinematic track jumps. Analytical Estimates based on SAR features." />
            </div>
            <p className="text-xs text-slate-400">
              Calibrate false-alarm rejection vs. catch-all anomaly sensitivity
            </p>
          </div>
        </div>

        {/* Live Flag Counter Badge */}
        <div className="flex items-center gap-2 self-start rounded-lg border border-cyan-900/60 bg-[#071324] px-3 py-1.5 sm:self-auto">
          <Filter className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-xs text-slate-300">Active Anomalies:</span>
          <span className="font-mono text-xs font-bold text-white">{detectedCount}</span>
        </div>
      </div>

      {/* Preset Strictness Buttons */}
      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {/* Tier 1: HIGH STRICTNESS */}
        <button
          type="button"
          onClick={() => handleTierSelect(AnomalyStrictness.HIGH)}
          className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
            activeKey === AnomalyStrictness.HIGH
              ? "border-emerald-500 bg-emerald-950/40 ring-1 ring-emerald-500"
              : "border-[#142842] bg-[#071221] hover:border-slate-600"
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
              High Strictness
            </span>
            <span className="text-[10px] text-slate-400">Low False Alerts</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-300 leading-tight">
            Only confirmed dark ships (&gt;300 GT, &gt;5h gap), severe jumps (&gt;5 kts, &gt;45°/h)
          </p>
        </button>

        {/* Tier 2: BALANCED (DEFAULT) */}
        <button
          type="button"
          onClick={() => handleTierSelect(AnomalyStrictness.BALANCED)}
          className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
            activeKey === AnomalyStrictness.BALANCED
              ? "border-cyan-500 bg-cyan-950/40 ring-1 ring-cyan-500"
              : "border-[#142842] bg-[#071221] hover:border-slate-600"
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-cyan-400 uppercase tracking-wide">
                Balanced (Default)
              </span>
              <span className="rounded bg-cyan-900/60 px-1.5 py-0.2 text-[9px] font-bold text-cyan-200">
                SOLAS
              </span>
            </div>
            <span className="text-[10px] text-slate-400">Standard</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-300 leading-tight">
            Flags &gt;30 min gaps, commercial vessels (&gt;50 GT), &gt;3 kts surge, &gt;30°/h course shift
          </p>
        </button>

        {/* Tier 3: HIGH SENSITIVITY */}
        <button
          type="button"
          onClick={() => handleTierSelect(AnomalyStrictness.HIGH_SENSITIVITY)}
          className={`flex flex-col items-start rounded-lg border p-3 text-left transition ${
            activeKey === AnomalyStrictness.HIGH_SENSITIVITY
              ? "border-amber-500 bg-amber-950/40 ring-1 ring-amber-500"
              : "border-[#142842] bg-[#071221] hover:border-slate-600"
          }`}
        >
          <div className="flex w-full items-center justify-between">
            <span className="text-xs font-bold text-amber-400 uppercase tracking-wide">
              High Sensitivity
            </span>
            <span className="text-[10px] text-slate-400">Catch-All</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-300 leading-tight">
            Catch everything: &gt;5 min latency, artisanal boats, &gt;1 kt speed delta, minor drift
          </p>
        </button>
      </div>

      {/* Threshold Parameters Summary Bar */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#142842] bg-[#06111f] px-4 py-2.5 text-xs text-slate-300">
        <div>
          <span className="text-slate-400">Blackout Gap: </span>
          <span className="font-semibold text-white">{currentPreset.minAisGapMinutes} min</span>
        </div>
        <div>
          <span className="text-slate-400">Heading Rate: </span>
          <span className="font-semibold text-white">&gt;{currentPreset.maxHeadingChangeDegreesPerHour}°/hr</span>
        </div>
        <div>
          <span className="text-slate-400">Speed Delta: </span>
          <span className="font-semibold text-white">&gt;{currentPreset.maxSpeedDeltaKnots} kts</span>
        </div>
        <div>
          <span className="text-slate-400">Min Vessel Tonnage: </span>
          <span className="font-semibold text-white">{currentPreset.minVesselGTForDarkShipFlag} GT</span>
        </div>
        <div>
          <span className="text-slate-400">Search Radius: </span>
          <span className="font-semibold text-white">{currentPreset.maxAisSearchRadiusNm} NM</span>
        </div>

        <button
          type="button"
          onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
          className="flex items-center gap-1 font-semibold text-cyan-400 transition hover:text-cyan-300"
        >
          <span>Fine-Tune</span>
          {isAdvancedOpen ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Advanced Fine-Tuning Slider Drawer */}
      {isAdvancedOpen && (
        <div className="mt-3 rounded-lg border border-cyan-900/40 bg-[#071324] p-4 text-xs">
          <h4 className="font-semibold uppercase tracking-wider text-slate-300 mb-3">
            Custom Threshold Fine-Tuning
          </h4>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>AIS Blackout Gap Limit:</span>
                <span className="font-bold text-white">{customGap} min</span>
              </div>
              <input
                type="range"
                min="5"
                max="360"
                step="5"
                value={customGap}
                onChange={(e) => setCustomGap(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Max Heading Delta:</span>
                <span className="font-bold text-white">{customHeading}°/hr</span>
              </div>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={customHeading}
                onChange={(e) => setCustomHeading(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-slate-400 mb-1">
                <span>Speed Shift Tolerance:</span>
                <span className="font-bold text-white">{customSpeed} kts</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10"
                step="0.5"
                value={customSpeed}
                onChange={(e) => setCustomSpeed(parseFloat(e.target.value))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={handleApplyCustom}
              className="rounded-lg bg-cyan-600 px-4 py-1.5 font-semibold text-white transition hover:bg-cyan-500"
            >
              Apply Custom Thresholds
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
