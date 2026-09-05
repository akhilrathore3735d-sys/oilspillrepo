import React from "react";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  Scale,
  Compass,
  ArrowRight,
  HelpCircle,
  Info
} from "lucide-react";
import { RiskAnalysis } from "../types";
import { Tooltip } from "./Tooltip";

interface RiskAssessmentPanelProps {
  risk: RiskAnalysis;
}

export const RiskAssessmentPanel: React.FC<RiskAssessmentPanelProps> = ({ risk }) => {
  const { level, score, summary, factors, recommendation } = risk;

  const getRiskTheme = (lvl: string) => {
    switch (lvl) {
      case "CRITICAL":
        return {
          badge: "bg-rose-950 text-rose-300 border-rose-800",
          bar: "bg-rose-500",
          border: "border-rose-900/50",
          bg: "from-rose-950/20 via-slate-900 to-slate-900",
          iconColor: "text-rose-400",
        };
      case "HIGH":
        return {
          badge: "bg-orange-950 text-orange-300 border-orange-800",
          bar: "bg-orange-500",
          border: "border-orange-900/50",
          bg: "from-orange-950/20 via-slate-900 to-slate-900",
          iconColor: "text-orange-400",
        };
      case "MEDIUM":
        return {
          badge: "bg-amber-950 text-amber-300 border-amber-800",
          bar: "bg-amber-500",
          border: "border-amber-900/50",
          bg: "from-amber-950/20 via-slate-900 to-slate-900",
          iconColor: "text-amber-400",
        };
      default:
        return {
          badge: "bg-emerald-950 text-emerald-300 border-emerald-800",
          bar: "bg-emerald-500",
          border: "border-emerald-900/50",
          bg: "from-emerald-950/20 via-slate-900 to-slate-900",
          iconColor: "text-emerald-400",
        };
    }
  };

  const theme = getRiskTheme(level);

  return (
    <div className="space-y-6">
      {/* Risk Banner */}
      <div
        className={`rounded-xl border ${theme.border} bg-gradient-to-r ${theme.bg} p-6 shadow-md backdrop-blur`}
      >
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Operational Threat Tier
              </span>
              <Tooltip
                title="Risk Tier Estimate"
                content="Analytical Estimate based on SAR features: Multi-criteria heuristic scoring aggregating candidate footprint size, backscatter contrast damping, and dispersion metrics. Not an absolute environmental toxicological assessment."
                position="top"
                size="md"
              />
            </div>
            <div className="flex items-center gap-3">
              <span className={`rounded-lg border px-3 py-1 text-2xl font-black uppercase ${theme.badge}`}>
                {level} RISK
              </span>
              <span className="text-sm font-mono text-slate-300">
                Score: <strong className="text-white text-lg">{score}</strong> / 1.0
              </span>
            </div>
            <p className="text-sm text-slate-200 max-w-2xl pt-1 font-medium">{summary}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4 min-w-[240px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Composite Hazard Scale
              </span>
              <Tooltip
                title="Hazard Scale"
                content="Analytical Estimate based on SAR features: Weighted composite index normalized from 0.0 (baseline) to 1.0 (severe hazard)."
                position="top"
                size="sm"
              />
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className={`h-full ${theme.bar} transition-all duration-500`}
                style={{ width: `${Math.round(score * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1 font-mono">
              <span>0.0 LOW</span>
              <span>0.35 MED</span>
              <span>0.55 HIGH</span>
              <span>0.75 CRIT</span>
            </div>
          </div>
        </div>
      </div>

      {/* Factor Contribution Breakdown */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Scale className="h-4 w-4 text-cyan-400" />
            <span>Constituent Risk Factors Breakdown</span>
          </h3>
          <Tooltip
            title="Risk Factor Estimation"
            content="Analytical Estimate based on SAR features: Factor weightings represent model inputs from radar amplitude thresholding, not chemical toxicity measurements."
            position="left"
            size="md"
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {factors.map((item, idx) => (
            <div key={idx} className="rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3.5 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">{item.factor}</span>
                <Tooltip
                  title={item.factor}
                  content={`Analytical Estimate based on SAR features: Factor contribution calculated from segmented image telemetry (${item.factor.toLowerCase()}).`}
                  position="top"
                  size="sm"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold font-mono text-cyan-400">{item.contribution}</span>
                {item.contribution === "Unavailable" && (
                  <span className="text-[10px] text-amber-400 border border-amber-800/60 bg-amber-950/40 rounded px-1.5 py-0.5">
                    Unprovided
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400 pt-1 leading-snug">{item.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Actionable Directives */}
      <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 backdrop-blur">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className={`h-5 w-5 ${theme.iconColor}`} />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Maritime Operations & Interdiction Directive
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
          {recommendation}
        </p>
      </div>
    </div>
  );
};
