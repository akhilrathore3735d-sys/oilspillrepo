import React, { useState } from "react";
import Markdown from "react-markdown";
import {
  FileText,
  Copy,
  Check,
  Download,
  Printer,
  Sparkles,
  Info,
  HelpCircle
} from "lucide-react";
import { AnalysisResponse } from "../types";
import { Tooltip } from "./Tooltip";

interface AiReportViewProps {
  analysis: AnalysisResponse;
}

export const AiReportView: React.FC<AiReportViewProps> = ({ analysis }) => {
  const [copied, setCopied] = useState<boolean>(false);
  const { report, risk, detection, geometry } = analysis;

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([report], { type: "text/markdown" });
    element.href = URL.createObjectURL(file);
    element.download = `OILWATCH_Analysis_Briefing_${new Date().toISOString().slice(0, 10)}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Export Actions */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-cyan-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Remote Sensing Analysis & Synthesis
            </span>
          </div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2 mt-0.5">
            <FileText className="h-5 w-5 text-cyan-400" />
            <span>Sentinel-1 SAR Oil Spill Technical Briefing</span>
          </h2>
          <p className="text-xs text-slate-400">
            Synthesized from deterministic SAR telemetry metrics using Gemini API with local heuristic fallback.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            id="copy-report-btn"
            onClick={handleCopy}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}
            <span>{copied ? "Copied" : "Copy Markdown"}</span>
          </button>
          <button
            id="download-report-btn"
            onClick={handleDownload}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            <span>Export .MD</span>
          </button>
          <button
            id="print-report-btn"
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/60 px-3 py-2 text-xs font-semibold text-cyan-300 transition hover:bg-cyan-900/60"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Telemetry Badges */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-[#132742] bg-[#0a1526]/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Risk Tier</span>
            <Tooltip
              title="Risk Tier"
              content="Analytical Estimate based on SAR features: Multi-criteria hazard classification derived from slick area, damping contrast, and weathering metrics."
              position="top"
              size="sm"
            />
          </div>
          <span
            className={`text-sm font-bold uppercase mt-0.5 block ${
              risk.level === "CRITICAL"
                ? "text-rose-400"
                : risk.level === "HIGH"
                ? "text-orange-400"
                : risk.level === "MEDIUM"
                ? "text-amber-400"
                : "text-emerald-400"
            }`}
          >
            {risk.level} ({risk.score}/1.0)
          </span>
        </div>

        <div className="rounded-lg border border-[#132742] bg-[#0a1526]/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Detection Confidence</span>
            <Tooltip
              title="Detection Confidence"
              content="Analytical Estimate based on SAR features: Statistical likelihood that segmented dark anomaly represents an oceanic surface slick rather than radar look-alikes."
              position="top"
              size="sm"
            />
          </div>
          <span className="text-sm font-bold font-mono text-cyan-400 mt-0.5 block">
            {Math.round(detection.confidence * 100)}% Confidence
          </span>
        </div>

        <div className="rounded-lg border border-[#132742] bg-[#0a1526]/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Candidate Footprint</span>
            <Tooltip
              title="Candidate Footprint"
              content="Analytical Estimate based on SAR features: Total contiguous pixel area identified below threshold damping; physical spatial extent subject to local orbital resolution."
              position="top"
              size="sm"
            />
          </div>
          <span className="text-sm font-bold font-mono text-white mt-0.5 block">
            {geometry.pixel_area.toLocaleString()} px
          </span>
        </div>

        <div className="rounded-lg border border-[#132742] bg-[#0a1526]/80 p-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">Synthesis Mode</span>
            <Tooltip
              title="Synthesis Mode"
              content="Analytical synthesis produced by rule-based algorithmic analysis and Gemini 2.5 Flash operational briefing generator."
              position="top"
              size="sm"
            />
          </div>
          <span className="text-sm font-bold text-emerald-400 flex items-center gap-1 mt-0.5">
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI / Rule-Based</span>
          </span>
        </div>
      </div>

      {/* Markdown Document Presentation */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/90 p-8 shadow-xl backdrop-blur">
        <div className="markdown-body max-w-none text-slate-200 text-sm leading-relaxed space-y-4 prose prose-invert prose-headings:text-white prose-headings:font-bold prose-h1:text-xl prose-h2:text-base prose-h2:border-b prose-h2:border-[#132742] prose-h2:pb-2 prose-strong:text-cyan-300 prose-li:text-slate-300">
          <Markdown>{report}</Markdown>
        </div>

        {/* Scientific Honesty Signature */}
        <div className="mt-8 pt-4 border-t border-[#132742] flex flex-col justify-between gap-2 text-[11px] text-slate-400 sm:flex-row sm:items-center">
          <div className="flex items-center gap-1.5 text-cyan-400">
            <Info className="h-4 w-4 shrink-0" />
            <span>Decision-Support Advisory • In-situ or multi-spectral verification recommended</span>
          </div>
          <span className="font-mono text-slate-400">OILWATCH SAR Pipeline v2.4</span>
        </div>
      </div>
    </div>
  );
};
