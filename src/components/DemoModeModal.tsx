import React from "react";
import { X, Play, Satellite, Radio, CheckCircle, Flame, ShieldAlert } from "lucide-react";
import { DemoSample } from "../types";

interface DemoModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  demoSamples: DemoSample[];
  onSelectScenario: (scenario: string) => void;
  isLoading: boolean;
}

export const DemoModeModal: React.FC<DemoModeModalProps> = ({
  isOpen,
  onClose,
  demoSamples,
  onSelectScenario,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-2xl rounded-2xl border border-cyan-500/30 bg-[#0a1628] p-6 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-[#132742] hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-950/80 text-cyan-400 border border-cyan-700/60">
            <Satellite className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">OILWATCH Interactive Demo Hub</h3>
            <p className="text-xs text-slate-400">
              One-click autonomous pipeline execution on benchmark SAR acquisition scenarios.
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-300 mt-2 mb-4 leading-relaxed">
          Select any pre-configured Sentinel-1 C-band synthetic radar scenario below. The backend pipeline will execute real speckle suppression, adaptive Otsu thresholding, contour extraction, weathering assessment, and AI intelligence synthesis.
        </p>

        {/* Scenarios List */}
        <div className="space-y-3">
          {demoSamples.map((sample) => (
            <div
              key={sample.id}
              className="flex flex-col justify-between gap-3 rounded-xl border border-[#132742] bg-[#060e1c]/80 p-4 transition hover:border-cyan-500/50 hover:bg-[#081324] sm:flex-row sm:items-center"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{sample.title}</span>
                  <span className="rounded bg-[#132742] px-1.5 py-0.5 text-[10px] font-mono text-cyan-300">
                    {sample.sensor}
                  </span>
                </div>
                <p className="text-xs text-slate-400 max-w-md">{sample.description}</p>
              </div>

              <button
                id={`run-demo-${sample.scenario}`}
                disabled={isLoading}
                onClick={() => {
                  onSelectScenario(sample.scenario);
                  onClose();
                }}
                className="flex items-center justify-center gap-1.5 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition hover:bg-cyan-500 shrink-0"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Launch Scenario</span>
              </button>
            </div>
          ))}
        </div>

        {/* Footer info */}
        <div className="mt-5 pt-3 border-t border-[#132742] flex items-center justify-between text-[11px] text-slate-400">
          <span>Pre-calibrated Sentinel-1 SAR Evaluation Datasets</span>
          <span className="font-mono text-cyan-400">SAR Benchmark Suite v2.4</span>
        </div>
      </div>
    </div>
  );
};
