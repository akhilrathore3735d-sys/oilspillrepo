import React from "react";
import {
  Satellite,
  Radio,
  Activity,
  Layers,
  Sparkles,
  GitCompare,
  MapPin,
  Flame,
  FileText,
  PlayCircle
} from "lucide-react";

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  hasResults: boolean;
  onOpenDemo: () => void;
  isBackendHealthy: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  hasResults,
  onOpenDemo,
  isBackendHealthy,
}) => {
  const tabs = [
    { id: "dashboard", label: "Dashboard", icon: Activity },
    { id: "analyze", label: "Analyze SAR", icon: Radio },
    { id: "results", label: "Analysis Results", icon: Layers, disabled: !hasResults },
    { id: "map", label: "Spill Map", icon: MapPin, disabled: !hasResults },
    { id: "weathering", label: "Ageing / Weathering", icon: Flame, disabled: !hasResults },
    { id: "change", label: "Change Detection", icon: GitCompare },
    { id: "report", label: "AI Intelligence Report", icon: FileText, disabled: !hasResults },
  ];

  return (
    <header className="sticky top-0 z-50 border-b border-[#132742] bg-[#060e1d]/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand & Sensor info */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-950/50 text-cyan-400 shadow-inner">
            <Satellite className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-wider text-white">OILWATCH</span>
              <span className="rounded border border-cyan-500/30 bg-cyan-950/60 px-1.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                Satellite SAR Platform
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Satellite-Based Oil Spill Intelligence & Monitoring • <span className="text-cyan-200/80">Sentinel-1 SAR C-band</span>
            </p>
          </div>
        </div>

        {/* Operational Status & Demo Mode Launcher */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="hidden items-center gap-2 rounded-full border border-[#193254] bg-[#0b172a]/90 px-3 py-1 text-xs text-slate-300 md:flex">
            <span
              className={`h-2 w-2 rounded-full ${
                isBackendHealthy ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-amber-400"
              }`}
            />
            <span>Pipeline Engine: {isBackendHealthy ? "Online" : "Connecting..."}</span>
          </div>

          <button
            id="demo-mode-trigger"
            onClick={onOpenDemo}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-500/40 bg-gradient-to-r from-cyan-950/70 to-blue-950/70 px-3 py-1.5 text-xs font-semibold text-cyan-300 shadow-sm transition hover:border-cyan-400 hover:text-cyan-100 hover:shadow-cyan-900/40"
          >
            <PlayCircle className="h-4 w-4 text-cyan-400" />
            <span>Demo Scenarios</span>
          </button>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="mx-auto max-w-7xl overflow-x-auto px-4 sm:px-6">
        <nav className="flex space-x-1 py-1 text-xs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                disabled={tab.disabled}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 rounded-md px-3 py-2 font-medium whitespace-nowrap transition-all ${
                  isActive
                    ? "border-b-2 border-cyan-400 bg-[#0d1e38] text-cyan-300"
                    : tab.disabled
                    ? "cursor-not-allowed text-slate-600"
                    : "text-slate-400 hover:bg-[#0c192f]/70 hover:text-slate-200"
                }`}
              >
                <Icon className={`h-3.5 w-3.5 ${isActive ? "text-cyan-400" : ""}`} />
                <span>{tab.label}</span>
                {tab.id === "results" && hasResults && (
                  <span className="flex h-1.5 w-1.5 rounded-full bg-cyan-400" />
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
};
