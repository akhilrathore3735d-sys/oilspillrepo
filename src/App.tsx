/**
 * OILWATCH - Satellite-Based Oil Spill Intelligence & Monitoring Platform
 * Autonomous Satellite SAR Remote Sensing & Hazard Assessment
 */

import React, { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { DashboardOverview } from "./components/DashboardOverview";
import { ImageAnalyzer } from "./components/ImageAnalyzer";
import { GeometryMetrics } from "./components/GeometryMetrics";
import { WeatheringPanel } from "./components/WeatheringPanel";
import { RiskAssessmentPanel } from "./components/RiskAssessmentPanel";
import { ChangeDetectionPanel } from "./components/ChangeDetectionPanel";
import { SpillMapViewer } from "./components/SpillMapViewer";
import { AiReportView } from "./components/AiReportView";
import { DemoModeModal } from "./components/DemoModeModal";
import { AnalysisResponse, DemoSample } from "./types";
import { checkHealth, getDemoSamples, getDemoSampleImage, analyzeImage } from "./services/api";
import { AlertTriangle, Radio, Sparkles, CheckCircle2 } from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<string>("dashboard");
  const [isBackendHealthy, setIsBackendHealthy] = useState<boolean>(false);
  const [demoSamples, setDemoSamples] = useState<DemoSample[]>([]);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState<boolean>(false);
  const [isAnalyzingDemo, setIsAnalyzingDemo] = useState<boolean>(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [notification, setNotification] = useState<string | null>(null);

  // Initialize health and demo samples
  useEffect(() => {
    async function initPlatform() {
      try {
        const health = await checkHealth();
        if (health.status === "healthy") {
          setIsBackendHealthy(true);
        }
      } catch (err) {
        console.warn("Backend health check warning:", err);
      }

      try {
        const samples = await getDemoSamples();
        setDemoSamples(samples);
      } catch (err) {
        console.warn("Demo samples fetch warning:", err);
      }
    }

    initPlatform();
  }, []);

  // Show transient toast notification
  const showToast = (msg: string) => {
    setNotification(msg);
    setTimeout(() => {
      setNotification(null);
    }, 4000);
  };

  // Run a demo scenario end-to-end
  const handleLaunchScenario = async (scenario: string) => {
    try {
      setIsAnalyzingDemo(true);
      showToast(`Ingesting Sentinel-1 SAR acquisition: ${scenario}...`);
      const data = await getDemoSampleImage(scenario);

      showToast("Executing multi-stage processing pipeline...");
      const result = await analyzeImage(data.image_data, 10.0, true);

      setAnalysisResult(result);
      setActiveTab("results");
      showToast(`Analysis completed successfully! Detected risk: ${result.risk.level}`);
    } catch (err: any) {
      showToast(`Error running scenario: ${err.message}`);
    } finally {
      setIsAnalyzingDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050c18] text-slate-100 selection:bg-cyan-500 selection:text-black">
      {/* Platform Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        hasResults={analysisResult !== null}
        onOpenDemo={() => setIsDemoModalOpen(true)}
        isBackendHealthy={isBackendHealthy}
      />

      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-[#0c1a2f]/95 px-4 py-3 text-xs font-medium text-cyan-300 shadow-2xl backdrop-blur-md transition-all animate-bounce">
          <Sparkles className="h-4 w-4 text-cyan-400" />
          <span>{notification}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {/* Tab 1: Dashboard Overview */}
        {activeTab === "dashboard" && (
          <DashboardOverview
            currentAnalysis={analysisResult}
            onNavigateToAnalyze={() => setActiveTab("analyze")}
            onOpenDemo={() => setIsDemoModalOpen(true)}
            onViewResults={() => setActiveTab("results")}
          />
        )}

        {/* Tab 2: Analyze SAR Image */}
        {activeTab === "analyze" && (
          <ImageAnalyzer
            onAnalysisComplete={(res) => {
              setAnalysisResult(res);
              showToast("SAR analysis complete! Switching to results telemetry...");
              setActiveTab("results");
            }}
            demoSamples={demoSamples}
          />
        )}

        {/* Tab 3: Detailed Geometric Results */}
        {activeTab === "results" && (
          analysisResult ? (
            <div className="space-y-8">
              <GeometryMetrics analysis={analysisResult} />
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <WeatheringPanel weathering={analysisResult.weathering} />
                <RiskAssessmentPanel risk={analysisResult.risk} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#132742] bg-[#0a1526]/70 p-12 text-center">
              <Radio className="h-12 w-12 text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-white">No Active Analysis Scene</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Upload a Sentinel-1 SAR image or launch a benchmark scenario to inspect full telemetry.
              </p>
              <button
                onClick={() => setActiveTab("analyze")}
                className="mt-4 rounded-lg bg-cyan-600 px-4 py-2 text-xs font-semibold text-white hover:bg-cyan-500"
              >
                Go to SAR Ingestion
              </button>
            </div>
          )
        )}

        {/* Tab 4: Geospatial / Spill Map */}
        {activeTab === "map" && (
          analysisResult ? (
            <SpillMapViewer analysis={analysisResult} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#132742] bg-[#0a1526]/70 p-12 text-center">
              <Radio className="h-12 w-12 text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-white">No Target Mapped</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Run an analysis first to visualize radar range grid and centroid targeting reticles.
              </p>
            </div>
          )
        )}

        {/* Tab 5: Ageing / Weathering */}
        {activeTab === "weathering" && (
          analysisResult ? (
            <WeatheringPanel weathering={analysisResult.weathering} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#132742] bg-[#0a1526]/70 p-12 text-center">
              <Radio className="h-12 w-12 text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-white">No Weathering Telemetry</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Run an analysis to measure physical dispersion and boundary gradient degradation.
              </p>
            </div>
          )
        )}

        {/* Tab 6: Change Detection */}
        {activeTab === "change" && <ChangeDetectionPanel />}

        {/* Tab 7: AI Intelligence Report */}
        {activeTab === "report" && (
          analysisResult ? (
            <AiReportView analysis={analysisResult} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-[#132742] bg-[#0a1526]/70 p-12 text-center">
              <Radio className="h-12 w-12 text-slate-500 mb-3" />
              <h3 className="text-base font-bold text-white">No Mission Briefing Generated</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Analyze a satellite scene to synthesize the executive AI report.
              </p>
            </div>
          )
        )}
      </main>

      {/* Demo Mode Modal */}
      <DemoModeModal
        isOpen={isDemoModalOpen}
        onClose={() => setIsDemoModalOpen(false)}
        demoSamples={demoSamples}
        onSelectScenario={handleLaunchScenario}
        isLoading={isAnalyzingDemo}
      />
    </div>
  );
}
