import React, { useState, useRef, useEffect } from "react";
import {
  Upload,
  Radio,
  FileImage,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle,
  Eye,
  Crosshair,
  Maximize2,
  Layers
} from "lucide-react";
import { AnalysisResponse, DemoSample } from "../types";
import { analyzeImage, getDemoSampleImage } from "../services/api";

interface ImageAnalyzerProps {
  onAnalysisComplete: (result: AnalysisResponse) => void;
  demoSamples: DemoSample[];
}

export const ImageAnalyzer: React.FC<ImageAnalyzerProps> = ({
  onAnalysisComplete,
  demoSamples,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [base64Data, setBase64Data] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [spatialResolution, setSpatialResolution] = useState<number>(10.0);
  const [enableAiReport, setEnableAiReport] = useState<boolean>(true);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Latest analysis results
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);
  const [activeLayer, setActiveLayer] = useState<"overlay" | "mask" | "original">("overlay");

  // Pixel inspection coordinates
  const [inspectCoord, setInspectCoord] = useState<{ x: number; y: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle file conversion to base64
  const handleFileLoad = (file: File) => {
    setErrorMsg(null);
    setSelectedFile(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setBase64Data(b64);
      setPreviewUrl(b64);
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileLoad(e.dataTransfer.files[0]);
    }
  };

  const handleSelectSample = async (scenario: string) => {
    try {
      setIsProcessing(true);
      setProcessingStage("Retrieving synthetic SAR tile...");
      setProgressPercent(20);
      const data = await getDemoSampleImage(scenario);
      setBase64Data(data.image_data);
      setPreviewUrl(data.image_data);
      setSelectedFile(new File([], `sentinel1_sar_${scenario}.png`, { type: "image/png" }));
      setIsProcessing(false);
      setProgressPercent(0);
    } catch (err: any) {
      setErrorMsg(err?.message || "Failed to load sample scenario");
      setIsProcessing(false);
    }
  };

  const handleRunAnalysis = async () => {
    if (!base64Data) {
      setErrorMsg("Please upload an image or select a sample SAR tile first.");
      return;
    }

    try {
      setIsProcessing(true);
      setErrorMsg(null);
      setProgressPercent(15);
      setProcessingStage("Bilateral speckle filtering & CLAHE radiometric enhancement...");

      setTimeout(() => {
        setProgressPercent(45);
        setProcessingStage("Adaptive low-backscatter candidate thresholding...");
      }, 400);

      setTimeout(() => {
        setProgressPercent(75);
        setProcessingStage("Morphological closing, contour extraction & weathering profiling...");
      }, 800);

      const result = await analyzeImage(base64Data, spatialResolution, enableAiReport);

      setProgressPercent(100);
      setProcessingStage("Analysis complete! Rendering inspection overlays...");
      setAnalysisResult(result);
      onAnalysisComplete(result);
      setIsProcessing(false);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Pipeline processing encountered a fatal error.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Upload and Control Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Upload & Configuration (5 cols) */}
        <div className="space-y-4 lg:col-span-5">
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 shadow-sm backdrop-blur">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Radio className="h-4 w-4 text-cyan-400" />
              <span>SAR Tile Ingestion</span>
            </h2>
            <p className="mt-1 text-xs text-slate-400">
              Ingest single-look or multi-look Sentinel-1 C-band SAR amplitude rasters (PNG/JPEG/TIFF).
            </p>

            {/* Drag and Drop Zone */}
            <div
              id="sar-dropzone"
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`mt-4 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition ${
                isDragging
                  ? "border-cyan-400 bg-cyan-950/20"
                  : "border-[#1c3658] bg-[#060e1c]/60 hover:border-cyan-500/50 hover:bg-[#081324]/80"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/tiff"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileLoad(e.target.files[0]);
                  }
                }}
              />
              <div className="rounded-full border border-[#1d385c] bg-[#0b1a30] p-3 text-cyan-400 shadow">
                <Upload className="h-6 w-6" />
              </div>
              <p className="mt-3 text-xs font-semibold text-slate-200">
                Click to browse or drag & drop SAR image
              </p>
              <p className="mt-1 text-[11px] text-slate-400">
                Supports Sentinel-1 GRD, SLC amplitude, and synthetic test tiles
              </p>
            </div>

            {/* Quick Sample Selector */}
            <div className="mt-4 pt-4 border-t border-[#132742]">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                Or Load Benchmark SAR Tile:
              </span>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                {demoSamples.map((sample) => (
                  <button
                    key={sample.id}
                    id={`load-sample-${sample.id}`}
                    onClick={() => handleSelectSample(sample.scenario)}
                    className="flex flex-col items-start rounded-lg border border-[#132742] bg-[#060e1c]/60 p-2 text-left transition hover:border-cyan-500/50 hover:bg-[#0c1b32]"
                  >
                    <span className="text-[11px] font-semibold text-cyan-300 line-clamp-1">
                      {sample.title.split(" - ")[1] || sample.title}
                    </span>
                    <span className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {sample.scenario}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Resolution Calibration Settings */}
            <div className="mt-4 rounded-lg border border-[#132742] bg-[#060e1c]/60 p-3 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-300 flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-cyan-400" />
                  Ground Sampling Distance (GSD):
                </span>
                <span className="font-mono text-cyan-400">{spatialResolution} m/px</span>
              </div>
              <input
                type="range"
                min="5"
                max="50"
                step="5"
                value={spatialResolution}
                onChange={(e) => setSpatialResolution(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>5m (High Res)</span>
                <span>10m (Sentinel-1 Default)</span>
                <span>50m (Quicklook)</span>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-[#132742]">
                <label className="text-xs text-slate-300 cursor-pointer flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={enableAiReport}
                    onChange={(e) => setEnableAiReport(e.target.checked)}
                    className="rounded border-[#1c3658] bg-[#071120] text-cyan-500 accent-cyan-500"
                  />
                  <span>Generate AI Intelligence Briefing</span>
                </label>
              </div>
            </div>

            {/* Error Display */}
            {errorMsg && (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-rose-800 bg-rose-950/40 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Analyze Action Button */}
            <button
              id="execute-analyze-btn"
              disabled={!base64Data || isProcessing}
              onClick={handleRunAnalysis}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white shadow-lg transition ${
                !base64Data || isProcessing
                  ? "cursor-not-allowed border border-[#132742] bg-[#0a1526]/50 text-slate-500"
                  : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-950/50"
              }`}
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin text-white" />
                  <span>Processing SAR Pipeline...</span>
                </>
              ) : (
                <>
                  <Radio className="h-4 w-4" />
                  <span>Analyze Satellite Spill</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Interactive Image Inspection Viewport (7 cols) */}
        <div className="space-y-4 lg:col-span-7">
          <div className="rounded-xl border border-[#132742] bg-[#0a1526]/80 p-5 shadow-sm backdrop-blur">
            <div className="flex items-center justify-between border-b border-[#132742] pb-3">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Radar Visualizer & Multi-Layer Inspector
                </h3>
              </div>

              {/* Layer switch buttons */}
              {analysisResult && (
                <div className="flex items-center rounded-lg border border-[#132742] bg-[#060e1c] p-1 text-xs">
                  <button
                    id="layer-overlay-btn"
                    onClick={() => setActiveLayer("overlay")}
                    className={`rounded px-2.5 py-1 font-medium transition ${
                      activeLayer === "overlay"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Overlay
                  </button>
                  <button
                    id="layer-mask-btn"
                    onClick={() => setActiveLayer("mask")}
                    className={`rounded px-2.5 py-1 font-medium transition ${
                      activeLayer === "mask"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Spill Mask
                  </button>
                  <button
                    id="layer-original-btn"
                    onClick={() => setActiveLayer("original")}
                    className={`rounded px-2.5 py-1 font-medium transition ${
                      activeLayer === "original"
                        ? "bg-cyan-600 text-white shadow"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Original SAR
                  </button>
                </div>
              )}
            </div>

            {/* Display Viewport */}
            <div className="relative mt-4 flex min-h-[380px] w-full items-center justify-center overflow-hidden rounded-xl border border-[#132742] bg-[#030710] p-2">
              {/* Radar Grid Backdrop */}
              <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:32px_32px] opacity-20" />

              {/* Image Preview / Inspection */}
              {previewUrl ? (
                <div
                  className="relative max-h-[460px] max-w-full overflow-hidden rounded-lg cursor-crosshair"
                  onMouseMove={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.round(((e.clientX - rect.left) / rect.width) * 512);
                    const y = Math.round(((e.clientY - rect.top) / rect.height) * 512);
                    setInspectCoord({ x, y });
                  }}
                  onMouseLeave={() => setInspectCoord(null)}
                >
                  <img
                    src={
                      analysisResult
                        ? activeLayer === "overlay"
                          ? analysisResult.images.overlay
                          : activeLayer === "mask"
                          ? analysisResult.images.mask
                          : analysisResult.images.original
                        : previewUrl
                    }
                    alt="Radar Analysis Target"
                    className="max-h-[440px] w-auto object-contain select-none shadow-2xl"
                  />

                  {/* Centroid Reticle Overlay if analyzed */}
                  {analysisResult && analysisResult.detection.detected && activeLayer === "overlay" && (
                    <div
                      className="absolute pointer-events-none -translate-x-1/2 -translate-y-1/2"
                      style={{
                        left: `${(analysisResult.geometry.centroid[0] / 512) * 100}%`,
                        top: `${(analysisResult.geometry.centroid[1] / 512) * 100}%`,
                      }}
                    >
                      <div className="relative flex h-6 w-6 items-center justify-center">
                        <Crosshair className="h-6 w-6 text-cyan-300 animate-spin-slow" />
                        <span className="absolute -top-4 left-6 whitespace-nowrap rounded bg-slate-900/90 px-1 py-0.5 font-mono text-[9px] text-cyan-300 border border-cyan-700">
                          Centroid [{analysisResult.geometry.centroid[0]}, {analysisResult.geometry.centroid[1]}]
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Interactive Cursor Coordinate Tooltip */}
                  {inspectCoord && (
                    <div className="absolute bottom-2 left-2 rounded bg-slate-900/90 px-2 py-1 font-mono text-[10px] text-cyan-300 border border-slate-700 backdrop-blur">
                      Raster X: {inspectCoord.x} px | Y: {inspectCoord.y} px
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 text-center text-slate-500">
                  <FileImage className="h-12 w-12 stroke-[1.5] text-slate-600 mb-2" />
                  <p className="text-xs font-semibold text-slate-400">No Satellite SAR Raster Loaded</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1">
                    Upload an image or select a benchmark scenario to initialize the radiometric pipeline.
                  </p>
                </div>
              )}

              {/* In-progress processing status overlay */}
              {isProcessing && (
                <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-950/85 p-6 backdrop-blur-sm">
                  <div className="relative mb-4 flex h-14 w-14 items-center justify-center">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cyan-500 opacity-40" />
                    <Radio className="h-7 w-7 animate-pulse text-cyan-400" />
                  </div>
                  <h4 className="text-sm font-bold text-white">Running Oil-Spill Intelligence Pipeline</h4>
                  <p className="mt-1 text-xs text-cyan-300 font-mono">{processingStage}</p>

                  <div className="mt-4 h-2 w-64 overflow-hidden rounded-full bg-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <span className="mt-1 text-[10px] text-slate-400">{progressPercent}% Completed</span>
                </div>
              )}
            </div>

            {/* Visualizer Legend & Scientific Disclaimer */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                  <span>Candidate Spill Overlay</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
                  <span>Centroid Reticle</span>
                </span>
              </div>
              <span className="text-[10px] text-slate-400">
                Image-space coordinates • Geodetic calibration pending ephemeris metadata
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
