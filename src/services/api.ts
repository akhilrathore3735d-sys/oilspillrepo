import { AnalysisResponse, ChangeDetectionResponse, DemoSample } from "../types";

const API_BASE = "/api";

export async function checkHealth(): Promise<any> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function getDemoSamples(): Promise<DemoSample[]> {
  const res = await fetch(`${API_BASE}/demo-samples`);
  if (!res.ok) throw new Error(`Failed to fetch demo samples: ${res.statusText}`);
  return res.json();
}

export async function getDemoSampleImage(scenario: string): Promise<{ scenario: string; image_data: string }> {
  const res = await fetch(`${API_BASE}/demo-sample/${scenario}`);
  if (!res.ok) throw new Error(`Failed to load demo scenario: ${res.statusText}`);
  return res.json();
}

export async function analyzeImage(
  imageDataBase64: string,
  spatialResolutionM: number = 10.0,
  generateAiReport: boolean = true
): Promise<AnalysisResponse> {
  const res = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      image_data: imageDataBase64,
      spatial_resolution_m: spatialResolutionM,
      generate_ai_report: generateAiReport,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Analysis failed with status ${res.status}`);
  }

  return res.json();
}

export async function compareImages(
  previousImageBase64: string,
  currentImageBase64: string
): Promise<ChangeDetectionResponse> {
  const res = await fetch(`${API_BASE}/change-detection`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      previous_image: previousImageBase64,
      current_image: currentImageBase64,
    }),
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.error || `Change detection failed with status ${res.status}`);
  }

  return res.json();
}
