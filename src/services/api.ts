import { AnalysisResponse, ChangeDetectionResponse, DemoSample } from "../types";

const API_BASE = "/api";
const DEFAULT_TIMEOUT_MS = 25000;

// Suppress benign Vite dev server websocket disconnection messages from crashing or alerting
if (typeof window !== "undefined") {
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason?.message || String(event?.reason || "");
    if (
      reason.includes("failed to connect to websocket") ||
      reason.includes("WebSocket") ||
      reason.includes("NetworkError when attempting to fetch resource")
    ) {
      // Prevent uncaught error bubble for background dev server websocket polls
      event.preventDefault();
      console.warn("[OILWATCH Telemetry] Handled background network/websocket event:", reason);
    }
  });

  window.addEventListener("error", (event) => {
    const msg = event?.message || "";
    if (msg.includes("websocket") || msg.includes("WebSocket")) {
      event.preventDefault();
      console.warn("[OILWATCH Telemetry] Handled background websocket error:", msg);
    }
  });
}

/**
 * Robust fetch wrapper with timeout and informative error extraction
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (err: any) {
    clearTimeout(id);
    if (err.name === "AbortError") {
      throw new Error(`Request timed out after ${Math.round(timeoutMs / 1000)}s. The SAR pipeline is taking longer than expected.`);
    }
    if (err instanceof TypeError && err.message.includes("Failed to fetch")) {
      throw new Error("Unable to establish connection to the remote sensing backend. Please verify your connection.");
    }
    throw err;
  }
}

/**
 * Safely parse JSON or extract text detail
 */
async function parseResponseOrThrow(res: Response, fallbackErrorMsg: string): Promise<any> {
  const contentType = res.headers.get("content-type") || "";
  let data: any = null;

  try {
    if (contentType.includes("application/json")) {
      data = await res.json();
    } else {
      const text = await res.text();
      data = { detail: text || fallbackErrorMsg };
    }
  } catch {
    data = { detail: fallbackErrorMsg };
  }

  if (!res.ok) {
    const errMsg = data?.detail || data?.error || data?.message || `${fallbackErrorMsg} (HTTP ${res.status})`;
    throw new Error(errMsg);
  }

  return data;
}

// Fallback demo scenarios if backend is rebooting or temporarily unreachable
const FALLBACK_DEMO_SAMPLES: DemoSample[] = [
  {
    id: "medium_slick",
    title: "Cohesive Crude Slick",
    description: "Distinct elongated dark patch anomaly with high capillary wave suppression.",
    scenario: "medium_slick",
    sensor: "Sentinel-1 C-band SAR (VV)"
  },
  {
    id: "weathered",
    title: "Weathered & Dispersed Slick",
    description: "Multi-ribbon emulsified slick showing higher spatial dispersion and diffuse edges.",
    scenario: "weathered",
    sensor: "Sentinel-1 C-band SAR (VV)"
  },
  {
    id: "clean_ocean",
    title: "Clean Oceanic Baseline",
    description: "Uniform sea clutter backscatter without anomalous capillary damping signatures.",
    scenario: "clean_ocean",
    sensor: "Sentinel-1 C-band SAR (VV)"
  }
];

export async function checkHealth(): Promise<{ status: string; service: string; version: string; pipeline_stages?: string[] }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 6000);
    if (!res.ok) {
      return {
        status: "offline",
        service: "OILWATCH Remote Sensing Intelligence Engine",
        version: "1.0.0-resilient",
      };
    }
    return await res.json();
  } catch (err) {
    console.warn("API health check notice:", err);
    return {
      status: "offline",
      service: "OILWATCH Remote Sensing Intelligence Engine",
      version: "1.0.0-resilient",
    };
  }
}

export async function getDemoSamples(): Promise<DemoSample[]> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/demo-samples`, {}, 8000);
    if (!res.ok) {
      return FALLBACK_DEMO_SAMPLES;
    }
    const samples = await res.json();
    return Array.isArray(samples) && samples.length > 0 ? samples : FALLBACK_DEMO_SAMPLES;
  } catch (err) {
    console.warn("Using resilient fallback demo samples:", err);
    return FALLBACK_DEMO_SAMPLES;
  }
}

export async function getDemoSampleImage(scenario: string): Promise<{ scenario: string; image_data: string }> {
  try {
    const res = await fetchWithTimeout(`${API_BASE}/demo-sample/${scenario}`, {}, 12000);
    return await parseResponseOrThrow(res, `Failed to load demo scenario: ${scenario}`);
  } catch (err: any) {
    console.warn(`Primary demo scenario fetch notice for ${scenario}:`, err.message);
    // If backend is momentarily initializing, generate client-side synthetic fallback SAR raster
    const fallbackB64 = generateClientSyntheticSarBase64(scenario);
    return {
      scenario,
      image_data: fallbackB64,
    };
  }
}

export async function analyzeImage(
  imageDataBase64: string,
  spatialResolutionM: number = 10.0,
  generateAiReport: boolean = true
): Promise<AnalysisResponse> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/analyze`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image_data: imageDataBase64,
          spatial_resolution_m: spatialResolutionM,
          generate_ai_report: generateAiReport,
        }),
      },
      35000 // 35s timeout for AI + radiometric pipeline execution
    );

    return await parseResponseOrThrow(res, "SAR image analysis pipeline failed");
  } catch (err: any) {
    console.error("SAR analysis error:", err);
    throw new Error(err.message || "An unexpected error occurred during SAR radiometric analysis.");
  }
}

export async function compareImages(
  previousImageBase64: string,
  currentImageBase64: string
): Promise<ChangeDetectionResponse> {
  try {
    const res = await fetchWithTimeout(
      `${API_BASE}/change-detection`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          previous_image: previousImageBase64,
          current_image: currentImageBase64,
        }),
      },
      30000
    );

    return await parseResponseOrThrow(res, "Multi-temporal change detection computation failed");
  } catch (err: any) {
    console.error("Change detection error:", err);
    throw new Error(err.message || "An unexpected error occurred while computing change detection.");
  }
}

/**
 * Fallback synthetic SAR generator in browser canvas in case backend connectivity is interrupted
 */
function generateClientSyntheticSarBase64(scenario: string): string {
  if (typeof document === "undefined") return "";

  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) return "";

  // Fill with Rayleigh speckle sea clutter
  const imgData = ctx.createImageData(512, 512);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    // Generate exponential/Rayleigh distributed intensity around mean 125
    const u1 = Math.max(0.0001, Math.random());
    const u2 = Math.random();
    const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    let val = Math.round(128 + z * 32);
    val = Math.max(20, Math.min(240, val));
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);

  if (scenario !== "clean_ocean") {
    // Draw low backscatter dark patch
    ctx.save();
    ctx.fillStyle = "rgba(22, 28, 38, 0.85)";
    ctx.filter = "blur(8px)";
    ctx.beginPath();
    ctx.ellipse(256, 256, scenario === "weathered" ? 140 : 100, scenario === "weathered" ? 45 : 65, 0.4, 0, 2 * Math.PI);
    ctx.fill();

    if (scenario === "weathered") {
      ctx.beginPath();
      ctx.ellipse(200, 310, 60, 20, -0.3, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.restore();
  }

  return canvas.toDataURL("image/png");
}
