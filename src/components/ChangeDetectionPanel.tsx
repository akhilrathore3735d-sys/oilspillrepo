import React, { useState } from "react";
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Upload,
  Layers,
  ArrowRight,
  Info,
  CheckCircle2
} from "lucide-react";
import { ChangeDetectionResponse } from "../types";
import { compareImages, getDemoSampleImage } from "../services/api";

export const ChangeDetectionPanel: React.FC = () => {
  const [prevImage, setPrevImage] = useState<string | null>(null);
  const [currImage, setCurrImage] = useState<string | null>(null);
  const [isComparing, setIsComparing] = useState<boolean>(false);
  const [result, setResult] = useState<ChangeDetectionResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Quick load benchmark temporal pair
  const handleLoadTemporalPair = async () => {
    try {
      setIsComparing(true);
      setErrorMsg(null);
      // T1: Cohesive Slick
      const t1 = await getDemoSampleImage("medium_slick");
      // T2: Weathered / Expanded Sheen
      const t2 = await getDemoSampleImage("weathered");

      setPrevImage(t1.image_data);
      setCurrImage(t2.image_data);

      const comparison = await compareImages(t1.image_data, t2.image_data);
      setResult(comparison);
      setIsComparing(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to execute multi-temporal comparison.");
      setIsComparing(false);
    }
  };

  const handleRunComparison = async () => {
    if (!prevImage || !currImage) {
      setErrorMsg("Please provide both T1 (Previous) and T2 (Current) satellite images.");
      return;
    }

    try {
      setIsComparing(true);
      setErrorMsg(null);
      const comparison = await compareImages(prevImage, currImage);
      setResult(comparison);
      setIsComparing(false);
    } catch (err: any) {
      setErrorMsg(err?.message || "Change detection computation failed.");
      setIsComparing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isPrev: boolean) => {
    if (e.target.files && e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const b64 = ev.target?.result as string;
        if (isPrev) setPrevImage(b64);
        else setCurrImage(b64);
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Description */}
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <GitCompare className="h-5 w-5 text-cyan-400" />
            <span>Multi-Temporal Satellite Change Detection</span>
          </h2>
          <p className="text-xs text-slate-400">
            Compare sequential Sentinel-1 SAR passes (T1: Previous vs T2: Current) to measure spatial expansion, drift, and dissipation.
          </p>
        </div>

        <button
          id="load-benchmark-pair-btn"
          onClick={handleLoadTemporalPair}
          disabled={isComparing}
          className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isComparing ? "animate-spin" : ""}`} />
          <span>Load Benchmark Temporal Pair</span>
        </button>
      </div>

      {/* Dual Upload Slots */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Pass 1: Previous Image */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              T1: Prior Satellite Acquisition
            </span>
            <label className="cursor-pointer rounded bg-[#060e1c] border border-[#1c3658] px-2.5 py-1 text-xs text-slate-300 transition hover:bg-[#0f233d]">
              Upload T1
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, true)}
              />
            </label>
          </div>

          <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border border-[#132742] bg-[#030710]">
            {prevImage ? (
              <img
                src={result ? result.images.previous_overlay : prevImage}
                alt="T1 Previous"
                className="h-full w-auto object-contain"
              />
            ) : (
              <div className="text-center p-4 text-slate-500 text-xs">
                <Upload className="h-8 w-8 mx-auto mb-1 text-slate-600" />
                <span>Upload prior satellite pass image</span>
              </div>
            )}
          </div>
          {result && (
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>T1 Area:</span>
              <span className="font-mono text-white font-semibold">
                {result.previous_analysis.pixel_area.toLocaleString()} px
              </span>
            </div>
          )}
        </div>

        {/* Pass 2: Current Image */}
        <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
              T2: Current Satellite Acquisition
            </span>
            <label className="cursor-pointer rounded bg-[#060e1c] border border-[#1c3658] px-2.5 py-1 text-xs text-slate-300 transition hover:bg-[#0f233d]">
              Upload T2
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleFileUpload(e, false)}
              />
            </label>
          </div>

          <div className="flex h-56 w-full items-center justify-center overflow-hidden rounded-lg border border-[#132742] bg-[#030710]">
            {currImage ? (
              <img
                src={result ? result.images.current_overlay : currImage}
                alt="T2 Current"
                className="h-full w-auto object-contain"
              />
            ) : (
              <div className="text-center p-4 text-slate-500 text-xs">
                <Upload className="h-8 w-8 mx-auto mb-1 text-slate-600" />
                <span>Upload subsequent satellite pass image</span>
              </div>
            )}
          </div>
          {result && (
            <div className="mt-2 flex justify-between text-xs text-slate-400">
              <span>T2 Area:</span>
              <span className="font-mono text-white font-semibold">
                {result.current_analysis.pixel_area.toLocaleString()} px
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Action Button */}
      <div className="flex justify-center">
        <button
          id="compute-change-detection-btn"
          disabled={!prevImage || !currImage || isComparing}
          onClick={handleRunComparison}
          className={`flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-bold text-white shadow-lg transition ${
            !prevImage || !currImage || isComparing
              ? "cursor-not-allowed border border-[#132742] bg-[#0a1526]/50 text-slate-500"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-950/50"
          }`}
        >
          {isComparing ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Computing Spatial Divergence...</span>
            </>
          ) : (
            <>
              <GitCompare className="h-4 w-4" />
              <span>Compute Change & Spatial Drift Matrix</span>
            </>
          )}
        </button>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
          {errorMsg}
        </div>
      )}

      {/* Change Detection Structured Results */}
      {result && (
        <div className="space-y-6 pt-2">
          {/* Change Metrics Banner */}
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Evolution Trajectory</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-2.5 py-0.5 text-xs font-black uppercase ${
                      result.change_metrics.trend === "EXPANSION"
                        ? "bg-rose-950 text-rose-300 border border-rose-800"
                        : result.change_metrics.trend === "CONTRACTION"
                        ? "bg-emerald-950 text-emerald-300 border border-emerald-800"
                        : "bg-[#060e1c] text-slate-300 border border-[#1c3658]"
                    }`}
                  >
                    {result.change_metrics.trend}
                  </span>
                  <span className="font-mono text-lg font-bold text-white">
                    {result.change_metrics.percentage_change > 0 ? "+" : ""}
                    {result.change_metrics.percentage_change}%
                  </span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Area Delta</span>
                <div className="font-mono text-lg font-bold text-cyan-400">
                  {result.change_metrics.area_difference_pixels > 0 ? "+" : ""}
                  {result.change_metrics.area_difference_pixels.toLocaleString()} px
                </div>
                <span className="text-[10px] text-slate-400">Pixel-space net difference</span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Spatial Overlap (IoU)</span>
                <div className="font-mono text-lg font-bold text-purple-400">
                  {result.change_metrics.intersection_over_union}
                </div>
                <span className="text-[10px] text-slate-400">
                  {result.change_metrics.overlap_pixels.toLocaleString()} overlapping pixels
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-xs text-slate-400 font-medium">Newly Expanded Zone</span>
                <div className="font-mono text-lg font-bold text-rose-400">
                  +{result.change_metrics.newly_expanded_pixels.toLocaleString()} px
                </div>
                <span className="text-[10px] text-slate-400">
                  Dissipated: -{result.change_metrics.dissipated_pixels.toLocaleString()} px
                </span>
              </div>
            </div>

            <p className="mt-4 pt-3 border-t border-[#132742] text-xs text-slate-300">
              <strong>Summary:</strong> {result.change_metrics.trend_summary}
            </p>
          </div>

          {/* Visual Change Map Display */}
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              <span>Trichromatic Visual Change Difference Map</span>
            </h3>

            <div className="flex justify-center rounded-lg border border-[#132742] bg-[#030710] p-4">
              <img
                src={result.images.change_overlay}
                alt="Change Visual Difference"
                className="max-h-[440px] w-auto object-contain rounded-md shadow-2xl"
              />
            </div>

            {/* Legend */}
            <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]" />
                <span className="font-medium">Newly Expanded Spill (T2 only)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                <span className="font-medium">Persistent / Overlapping Core (T1 & T2)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                <span className="font-medium">Dissipated / Drifted Away (T1 only)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
