import { PNG } from "pngjs";
import jpeg from "jpeg-js";
import { GoogleGenAI } from "@google/genai";

export interface PipelineResult {
  status: "success" | "error";
  detection: {
    detected: boolean;
    confidence: number;
    threshold_used: number;
    contrast_ratio: number;
    mean_slick_intensity: number;
    mean_ambient_water_intensity: number;
    candidate_pixel_count: number;
    sensor_anomaly_type: string;
  };
  geometry: {
    has_features: boolean;
    connected_components_count: number;
    pixel_area: number;
    area_percentage: number;
    unit_label: string;
    estimated_physical_area_km2: number | null;
    perimeter: number;
    centroid: [number, number];
    bounding_box: { x: number; y: number; width: number; height: number };
    estimated_length_px: number;
    estimated_width_px: number;
    aspect_ratio: number;
    orientation_deg: number;
    compactness: number;
    solidity: number;
  };
  weathering: {
    indicator: "LOW" | "MODERATE" | "HIGH" | "INCONCLUSIVE";
    score: number;
    confidence: number;
    description: string;
    sub_metrics: {
      fragmentation_index: number;
      edge_diffuseness: number;
      internal_heterogeneity: number;
      internal_std_intensity: number;
    };
    scientific_note: string;
  };
  risk: {
    level: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    score: number;
    color: string;
    summary: string;
    factors: Array<{ factor: string; contribution: string; description: string }>;
    recommendation: string;
  };
  change: any | null;
  images: {
    original: string;
    mask: string;
    overlay: string;
    change_overlay?: string | null;
  };
  preprocessing_stats: {
    dimensions: [number, number];
    total_pixels: number;
    mean_intensity: number;
    std_intensity: number;
    min_intensity: number;
    max_intensity: number;
    filtering_applied: string;
  };
  report: string;
}

// Decode helper
function decodeImageBuffer(buffer: Buffer): { width: number; height: number; data: Uint8Array } {
  // Check magic bytes for PNG: 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  }
  // Try JPEG
  try {
    const decoded = jpeg.decode(buffer, { useTArray: true });
    return { width: decoded.width, height: decoded.height, data: new Uint8Array(decoded.data) };
  } catch {
    // If not standard jpeg, try PNG again or error
    const png = PNG.sync.read(buffer);
    return { width: png.width, height: png.height, data: new Uint8Array(png.data) };
  }
}

// Encode RGBA or grayscale to PNG base64
function encodePngBase64(width: number, height: number, rgbaData: Uint8Array): string {
  const png = new PNG({ width, height });
  png.data = Buffer.from(rgbaData);
  const buffer = PNG.sync.write(png);
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function processSarPipeline(
  imageBuffer: Buffer,
  spatialResolutionM: number = 10.0
): PipelineResult {
  const { width, height, data } = decodeImageBuffer(imageBuffer);
  const totalPixels = width * height;

  // 1. Grayscale extraction
  const gray = new Uint8Array(totalPixels);
  let sumIntensity = 0;
  let minVal = 255;
  let maxVal = 0;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    // Perceptual grayscale
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    gray[i] = lum;
    sumIntensity += lum;
    if (lum < minVal) minVal = lum;
    if (lum > maxVal) maxVal = lum;
  }

  const meanIntensity = sumIntensity / totalPixels;
  let varianceSum = 0;
  for (let i = 0; i < totalPixels; i++) {
    const diff = gray[i] - meanIntensity;
    varianceSum += diff * diff;
  }
  const stdIntensity = Math.sqrt(varianceSum / totalPixels);

  // 2. Speckle filtering (Bilateral / Edge-preserving smoothing filter)
  const denoised = new Uint8Array(totalPixels);
  const radius = 2;
  const sigmaSpaceSq = 2 * 2.0 * 2.0;
  const sigmaColorSq = 2 * 35.0 * 35.0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let wSum = 0;
      let valSum = 0;
      const centerVal = gray[y * width + x];

      for (let dy = -radius; dy <= radius; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;

          const neighborVal = gray[ny * width + nx];
          const distSq = dx * dx + dy * dy;
          const colorDiff = neighborVal - centerVal;
          const colorDiffSq = colorDiff * colorDiff;

          const weight = Math.exp(-distSq / sigmaSpaceSq - colorDiffSq / sigmaColorSq);
          wSum += weight;
          valSum += neighborVal * weight;
        }
      }
      denoised[y * width + x] = Math.round(valSum / (wSum || 1));
    }
  }

  // 3. Otsu threshold calculation tailored for dark spot detection
  const hist = new Int32Array(256);
  for (let i = 0; i < totalPixels; i++) {
    hist[denoised[i]]++;
  }

  let otsuThreshold = 60;
  let maxVariance = 0;
  let totalSum = 0;
  for (let t = 0; t < 256; t++) totalSum += t * hist[t];

  let bgSum = 0;
  let bgWeight = 0;

  for (let t = 0; t < 256; t++) {
    bgWeight += hist[t];
    if (bgWeight === 0) continue;
    const fgWeight = totalPixels - bgWeight;
    if (fgWeight === 0) break;

    bgSum += t * hist[t];
    const bgMean = bgSum / bgWeight;
    const fgMean = (totalSum - bgSum) / fgWeight;
    const meanDiff = bgMean - fgMean;
    const interClassVariance = bgWeight * fgWeight * meanDiff * meanDiff;

    if (interClassVariance > maxVariance) {
      maxVariance = interClassVariance;
      otsuThreshold = t;
    }
  }

  // Cap effective threshold based on mean and standard deviation
  const statThreshold = Math.max(15, Math.round(meanIntensity - 0.7 * stdIntensity));
  const effectiveThreshold = Math.min(otsuThreshold, statThreshold);

  // 4. Initial Candidate Mask
  const rawMask = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    rawMask[i] = denoised[i] <= effectiveThreshold ? 255 : 0;
  }

  // 5. Morphological Operations: Opening (remove 1-2px noise) and Closing (fill holes)
  const opened = new Uint8Array(totalPixels);
  // 3x3 min (erosion) then max (dilation)
  const eroded = new Uint8Array(totalPixels);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let minPixel = 255;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const val = rawMask[(y + dy) * width + (x + dx)];
          if (val < minPixel) minPixel = val;
        }
      }
      eroded[y * width + x] = minPixel;
    }
  }

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let maxPixel = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const val = eroded[(y + dy) * width + (x + dx)];
          if (val > maxPixel) maxPixel = val;
        }
      }
      opened[y * width + x] = maxPixel;
    }
  }

  // 5x5 Closing to bridge micro-fractures in the slick
  const dilated = new Uint8Array(totalPixels);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let maxPixel = 0;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const val = opened[(y + dy) * width + (x + dx)];
          if (val > maxPixel) maxPixel = val;
        }
      }
      dilated[y * width + x] = maxPixel;
    }
  }

  const finalMask = new Uint8Array(totalPixels);
  for (let y = 2; y < height - 2; y++) {
    for (let x = 2; x < width - 2; x++) {
      let minPixel = 255;
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const val = dilated[(y + dy) * width + (x + dx)];
          if (val < minPixel) minPixel = val;
        }
      }
      finalMask[y * width + x] = minPixel;
    }
  }

  // 6. Connected component analysis and perimeter extraction
  const visited = new Uint8Array(totalPixels);
  const components: Array<{
    pixels: number[];
    area: number;
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
    sumX: number;
    sumY: number;
  }> = [];

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      if (finalMask[idx] === 255 && visited[idx] === 0) {
        // Flood fill component
        const compPixels: number[] = [];
        const queue: number[] = [idx];
        visited[idx] = 1;
        let minX = x,
          maxX = x,
          minY = y,
          maxY = y;
        let sumX = 0,
          sumY = 0;

        while (queue.length > 0) {
          const curr = queue.pop()!;
          compPixels.push(curr);
          const cx = curr % width;
          const cy = Math.floor(curr / width);

          sumX += cx;
          sumY += cy;
          if (cx < minX) minX = cx;
          if (cx > maxX) maxX = cx;
          if (cy < minY) minY = cy;
          if (cy > maxY) maxY = cy;

          // 4-neighborhood
          const neighbors = [
            cy > 0 ? (cy - 1) * width + cx : -1,
            cy < height - 1 ? (cy + 1) * width + cx : -1,
            cx > 0 ? cy * width + (cx - 1) : -1,
            cx < width - 1 ? cy * width + (cx + 1) : -1,
          ];

          for (const n of neighbors) {
            if (n !== -1 && finalMask[n] === 255 && visited[n] === 0) {
              visited[n] = 1;
              queue.push(n);
            }
          }
        }

        // Filter tiny speckles (< 40 pixels)
        if (compPixels.length >= 40) {
          components.push({
            pixels: compPixels,
            area: compPixels.length,
            minX,
            minY,
            maxX,
            maxY,
            sumX,
            sumY,
          });
        } else {
          // Zero out filtered speckle in mask
          for (const p of compPixels) {
            finalMask[p] = 0;
          }
        }
      }
    }
  }

  // Sort components by area descending
  components.sort((a, b) => b.area - a.area);

  let totalSlickPixels = 0;
  for (const c of components) totalSlickPixels += c.area;

  const detected = totalSlickPixels > 80;
  const areaPercentage = Number(((totalSlickPixels / totalPixels) * 100).toFixed(2));

  // Contrast ratio
  let darkSum = 0;
  let ambientSum = 0;
  let darkCount = 0;
  let ambientCount = 0;

  for (let i = 0; i < totalPixels; i++) {
    if (finalMask[i] === 255) {
      darkSum += denoised[i];
      darkCount++;
    } else {
      ambientSum += denoised[i];
      ambientCount++;
    }
  }

  const meanDark = darkCount > 0 ? darkSum / darkCount : meanIntensity;
  const meanAmbient = ambientCount > 0 ? ambientSum / ambientCount : meanIntensity;
  const contrastRatio = Number(((meanAmbient - meanDark) / (meanAmbient || 1)).toFixed(3));

  let confidence = 0.05;
  if (detected) {
    if (areaPercentage < 40) {
      confidence = Math.min(0.96, Math.max(0.42, 0.45 + 0.4 * contrastRatio));
    } else {
      // Very large dark patch may be low wind zone
      confidence = Math.max(0.3, 0.5 - (areaPercentage - 40) * 0.01);
    }
  }
  confidence = Number(confidence.toFixed(2));

  // Geometry features on primary component
  let perimeter = 0;
  const boundaryPixels: number[] = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      if (finalMask[idx] === 255) {
        // If any 4-neighbor is water, it's a boundary pixel
        if (
          finalMask[(y - 1) * width + x] === 0 ||
          finalMask[(y + 1) * width + x] === 0 ||
          finalMask[y * width + (x - 1)] === 0 ||
          finalMask[y * width + (x + 1)] === 0
        ) {
          perimeter++;
          boundaryPixels.push(idx);
        }
      }
    }
  }

  let centroid: [number, number] = [0, 0];
  let boundingBox = { x: 0, y: 0, width: 0, height: 0 };
  let estLength = 0;
  let estWidth = 0;
  let aspectRatio = 1.0;
  let orientation = 0;
  let compactness = 0;
  let solidity = 0;

  if (components.length > 0) {
    const p = components[0];
    centroid = [Math.round(p.sumX / p.area), Math.round(p.sumY / p.area)];
    const bw = p.maxX - p.minX + 1;
    const bh = p.maxY - p.minY + 1;
    boundingBox = { x: p.minX, y: p.minY, width: bw, height: bh };

    // Moments for orientation & principal axis
    let mu20 = 0,
      mu02 = 0,
      mu11 = 0;
    const [cx, cy] = centroid;
    for (const pIdx of p.pixels) {
      const px = pIdx % width;
      const py = Math.floor(pIdx / width);
      const dx = px - cx;
      const dy = py - cy;
      mu20 += dx * dx;
      mu02 += dy * dy;
      mu11 += dx * dy;
    }
    mu20 /= p.area;
    mu02 /= p.area;
    mu11 /= p.area;

    const common = Math.sqrt(4 * mu11 * mu11 + (mu20 - mu02) * (mu20 - mu02));
    const majorVariance = (mu20 + mu02 + common) / 2;
    const minorVariance = Math.max(0.1, (mu20 + mu02 - common) / 2);

    estLength = Math.round(4 * Math.sqrt(majorVariance));
    estWidth = Math.round(4 * Math.sqrt(minorVariance));
    aspectRatio = Number((estLength / Math.max(1, estWidth)).toFixed(2));

    const theta = 0.5 * Math.atan2(2 * mu11, mu20 - mu02);
    orientation = Math.round((theta * 180) / Math.PI);

    compactness = Number(((4 * Math.PI * p.area) / (Math.max(1, perimeter) * perimeter)).toFixed(3));
    const bboxArea = bw * bh;
    solidity = Number((p.area / (bboxArea || 1)).toFixed(3));
  }

  // Estimated physical area in km^2 if 10m pixel pitch
  const m2PerPixel = spatialResolutionM * spatialResolutionM;
  const estimatedPhysicalAreaKm2 = Number(((totalSlickPixels * m2PerPixel) / 1_000_000).toFixed(3));

  // 7. Weathering Analysis
  let weatheringIndicator: "LOW" | "MODERATE" | "HIGH" | "INCONCLUSIVE" = "INCONCLUSIVE";
  let weatheringScore = 0.0;
  let weatheringConf = 0.4;
  let weatheringDesc = "";
  let fragIndex = 0;
  let edgeDiff = 0.5;
  let heterogeneity = 0.1;
  let internalStd = 0.0;

  if (detected && totalSlickPixels > 40) {
    // Fragmentation index based on component count and shape compactness
    fragIndex = Math.min(1.0, (components.length - 1) * 0.18 + (1.0 - Math.min(1.0, compactness * 2)) * 0.4);

    // Internal variance
    let internalSqSum = 0;
    for (let i = 0; i < totalPixels; i++) {
      if (finalMask[i] === 255) {
        const d = denoised[i] - meanDark;
        internalSqSum += d * d;
      }
    }
    internalStd = Math.sqrt(internalSqSum / totalSlickPixels);
    heterogeneity = Math.min(1.0, internalStd / (meanDark + 1e-4));

    // Boundary edge diffuseness using Sobel gradient
    let boundaryGradSum = 0;
    for (const bIdx of boundaryPixels) {
      const bx = bIdx % width;
      const by = Math.floor(bIdx / width);
      const gx =
        denoised[by * width + Math.min(width - 1, bx + 1)] -
        denoised[by * width + Math.max(0, bx - 1)];
      const gy =
        denoised[Math.min(height - 1, by + 1) * width + bx] -
        denoised[Math.max(0, by - 1) * width + bx];
      boundaryGradSum += Math.sqrt(gx * gx + gy * gy);
    }
    const meanEdgeGrad = boundaryPixels.length > 0 ? boundaryGradSum / boundaryPixels.length : 20;
    edgeDiff = Math.min(1.0, Math.max(0.0, 1.0 - meanEdgeGrad / 40.0));

    weatheringScore = Number((0.35 * fragIndex + 0.35 * edgeDiff + 0.3 * heterogeneity).toFixed(2));
    weatheringConf = Number(Math.min(0.88, Math.max(0.45, 0.4 + Math.log10(totalSlickPixels) * 0.12)).toFixed(2));

    if (weatheringScore < 0.38) {
      weatheringIndicator = "LOW";
      weatheringDesc = "Fresh / Cohesive Slick: Distinct cohesive core, steep boundary gradient, minimal fragmentation.";
    } else if (weatheringScore <= 0.68) {
      weatheringIndicator = "MODERATE";
      weatheringDesc = "Partially Weathered: Moderate wind-wave elongation, peripheral sheen breakdown, mid-range boundary gradient.";
    } else {
      weatheringIndicator = "HIGH";
      weatheringDesc = "Heavily Weathered / Dispersed: Significant ribbon fragmentation, diffuse transitional boundary, high spatial heterogeneity.";
    }
  }

  // 8. Explainable Risk Score
  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  let riskScore = 0.1;
  let riskSummary = "";
  let riskRec = "";
  let riskColor = "emerald";

  if (!detected) {
    riskLevel = "LOW";
    riskScore = 0.08;
    riskColor = "emerald";
    riskSummary = "No anomalous dark-slick signature detected. Nominal marine radar clutter.";
    riskRec = "Routine satellite surveillance schedule maintained.";
  } else {
    let areaScore = 0.1;
    if (totalSlickPixels >= 10000) areaScore = 0.4;
    else if (totalSlickPixels >= 2500) areaScore = 0.32;
    else if (totalSlickPixels >= 500) areaScore = 0.22;

    const confScore = confidence * 0.25;
    const weathScore =
      weatheringIndicator === "LOW" ? 0.15 : weatheringIndicator === "MODERATE" ? 0.1 : 0.06;
    const defaultTrajectoryScore = 0.1;

    riskScore = Number(Math.min(0.98, Math.max(0.1, areaScore + confScore + weathScore + defaultTrajectoryScore)).toFixed(2));

    if (riskScore >= 0.75) {
      riskLevel = "CRITICAL";
      riskColor = "rose";
      riskSummary = "High-magnitude candidate slick anomaly with severe surface footprint and acute containment priority.";
      riskRec = "Issue tactical alert to Coast Guard and Port State Control, deploy maritime patrol aircraft for visual verification, and mobilize containment booms.";
    } else if (riskScore >= 0.55) {
      riskLevel = "HIGH";
      riskColor = "orange";
      riskSummary = "Substantial candidate slick identified with elevated confidence and persistence indicators.";
      riskRec = "Task consecutive satellite revisit pass, cross-reference AIS vessel lanes, and model surface drift trajectory.";
    } else if (riskScore >= 0.35) {
      riskLevel = "MEDIUM";
      riskColor = "amber";
      riskSummary = "Moderate candidate slick signature; potential low-wind look-alike cannot be ruled out.";
      riskRec = "Maintain active radar tracking; query metocean wind vectors to verify if wind speed is below 3 m/s threshold.";
    } else {
      riskLevel = "LOW";
      riskColor = "emerald";
      riskSummary = "Minor candidate anomaly with localized footprint or marginal backscatter contrast.";
      riskRec = "Log in operational event registry for review on subsequent orbital pass.";
    }
  }

  // 9. Generate Visual Images (Original, Binary Mask, Overlay)
  // Original RGBA
  const origRgba = new Uint8Array(totalPixels * 4);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const val = denoised[i];
    origRgba[idx] = val;
    origRgba[idx + 1] = val;
    origRgba[idx + 2] = val;
    origRgba[idx + 3] = 255;
  }
  const origBase64 = encodePngBase64(width, height, origRgba);

  // Binary Mask RGBA (pure black 0 / white 255)
  const maskRgba = new Uint8Array(totalPixels * 4);
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const val = finalMask[i];
    maskRgba[idx] = val;
    maskRgba[idx + 1] = val;
    maskRgba[idx + 2] = val;
    maskRgba[idx + 3] = 255;
  }
  const maskBase64 = encodePngBase64(width, height, maskRgba);

  // Overlay RGBA: Translucent Crimson (239, 68, 68) with glowing border
  const overlayRgba = new Uint8Array(totalPixels * 4);
  const isBoundary = new Uint8Array(totalPixels);
  for (const bIdx of boundaryPixels) isBoundary[bIdx] = 1;

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const baseVal = denoised[i];

    if (isBoundary[i] === 1) {
      // Fluorescent red boundary outline
      overlayRgba[idx] = 255;
      overlayRgba[idx + 1] = 80;
      overlayRgba[idx + 2] = 80;
      overlayRgba[idx + 3] = 255;
    } else if (finalMask[i] === 255) {
      // 50% alpha blended crimson fill
      overlayRgba[idx] = Math.round(0.55 * 239 + 0.45 * baseVal);
      overlayRgba[idx + 1] = Math.round(0.55 * 68 + 0.45 * baseVal);
      overlayRgba[idx + 2] = Math.round(0.55 * 68 + 0.45 * baseVal);
      overlayRgba[idx + 3] = 255;
    } else {
      overlayRgba[idx] = baseVal;
      overlayRgba[idx + 1] = baseVal;
      overlayRgba[idx + 2] = baseVal;
      overlayRgba[idx + 3] = 255;
    }
  }
  const overlayBase64 = encodePngBase64(width, height, overlayRgba);

  // 10. Intelligence Report Synthesis
  const structuredTelemetry = {
    detection: {
      detected,
      confidence,
      contrast_ratio: contrastRatio,
      mean_slick_intensity: Number(meanDark.toFixed(1)),
      mean_ambient_water_intensity: Number(meanAmbient.toFixed(1)),
    },
    geometry: {
      pixel_area: totalSlickPixels,
      area_percentage: areaPercentage,
      estimated_length_px: estLength,
      estimated_width_px: estWidth,
      aspect_ratio: aspectRatio,
      orientation_deg: orientation,
      centroid,
    },
    weathering: {
      indicator: weatheringIndicator,
      score: weatheringScore,
      description: weatheringDesc,
    },
    risk: {
      level: riskLevel,
      score: riskScore,
      recommendation: riskRec,
    },
  };

  const report = generateLocalReport(structuredTelemetry);

  return {
    status: "success",
    detection: {
      detected,
      confidence,
      threshold_used: effectiveThreshold,
      contrast_ratio: contrastRatio,
      mean_slick_intensity: Number(meanDark.toFixed(1)),
      mean_ambient_water_intensity: Number(meanAmbient.toFixed(1)),
      candidate_pixel_count: totalSlickPixels,
      sensor_anomaly_type: detected ? "Candidate Low-Backscatter Slick Anomaly" : "None",
    },
    geometry: {
      has_features: detected,
      connected_components_count: components.length,
      pixel_area: totalSlickPixels,
      area_percentage: areaPercentage,
      unit_label: `Pixel-space area (Estimated 10m GSD: ${estimatedPhysicalAreaKm2} km²)`,
      estimated_physical_area_km2: estimatedPhysicalAreaKm2,
      perimeter,
      centroid,
      bounding_box: boundingBox,
      estimated_length_px: estLength,
      estimated_width_px: estWidth,
      aspect_ratio: aspectRatio,
      orientation_deg: orientation,
      compactness,
      solidity,
    },
    weathering: {
      indicator: weatheringIndicator,
      score: weatheringScore,
      confidence: weatheringConf,
      description: weatheringDesc,
      sub_metrics: {
        fragmentation_index: Number(fragIndex.toFixed(2)),
        edge_diffuseness: Number(edgeDiff.toFixed(2)),
        internal_heterogeneity: Number(heterogeneity.toFixed(2)),
        internal_std_intensity: Number(internalStd.toFixed(1)),
      },
      scientific_note:
        "Analytical relative indicator based on spatial dispersion, edge gradient, and speckle heterogeneity. Does not constitute calibrated chemical chronometry.",
    },
    risk: {
      level: riskLevel,
      score: riskScore,
      color: riskColor,
      summary: riskSummary,
      factors: [
        {
          factor: "Spatial Footprint",
          contribution: `${Math.round(areaPercentage * 2.5)}%`,
          description: `${totalSlickPixels.toLocaleString()} candidate pixels (${areaPercentage}% of scene)`,
        },
        {
          factor: "Backscatter Contrast",
          contribution: `${Math.round(confidence * 100)}%`,
          description: `${Math.round(confidence * 100)}% radar attenuation certainty`,
        },
        {
          factor: "Weathering State",
          contribution: weatheringIndicator,
          description: `${weatheringIndicator} relative dispersion profile`,
        },
        {
          factor: "Shoreline Proximity",
          contribution: "Unavailable",
          description: "Geospatial coastline vectors not provided in raw raster",
        },
      ],
      recommendation: riskRec,
    },
    change: null,
    images: {
      original: origBase64,
      mask: maskBase64,
      overlay: overlayBase64,
    },
    preprocessing_stats: {
      dimensions: [width, height],
      total_pixels: totalPixels,
      mean_intensity: Number(meanIntensity.toFixed(1)),
      std_intensity: Number(stdIntensity.toFixed(1)),
      min_intensity: minVal,
      max_intensity: maxVal,
      filtering_applied: "Bilateral Speckle Suppression + Contrast Normalization",
    },
    report,
  };
}

export function performChangeDetection(
  prevResult: PipelineResult,
  currResult: PipelineResult
): {
  change_metrics: any;
  change_overlay: string;
} {
  const pArea = prevResult.geometry.pixel_area;
  const cArea = currResult.geometry.pixel_area;
  const diff = cArea - pArea;
  const pctChange = pArea > 0 ? Number((((cArea - pArea) / pArea) * 100).toFixed(1)) : cArea > 0 ? 100 : 0;

  let trend = "STABLE";
  if (pctChange > 15) trend = "EXPANSION";
  else if (pctChange < -15) trend = "CONTRACTION";

  // Re-decode masks from base64
  const prevBuf = Buffer.from(prevResult.images.mask.split(",")[1], "base64");
  const currBuf = Buffer.from(currResult.images.mask.split(",")[1], "base64");
  const pDecoded = decodeImageBuffer(prevBuf);
  const cDecoded = decodeImageBuffer(currBuf);

  const width = cDecoded.width;
  const height = cDecoded.height;
  const totalPixels = width * height;

  let overlap = 0;
  let expanded = 0;
  let dissipated = 0;

  // Build change overlay
  const changeRgba = new Uint8Array(totalPixels * 4);

  // Background: load current original
  const origBuf = Buffer.from(currResult.images.original.split(",")[1], "base64");
  const oDecoded = decodeImageBuffer(origBuf);

  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const pVal = pDecoded.data[idx] > 128 ? 1 : 0;
    const cVal = cDecoded.data[idx] > 128 ? 1 : 0;
    const baseLum = oDecoded.data[idx];

    if (cVal === 1 && pVal === 1) {
      // Overlap / Persistent: Cyan (6, 182, 212)
      overlap++;
      changeRgba[idx] = Math.round(0.7 * 6 + 0.3 * baseLum);
      changeRgba[idx + 1] = Math.round(0.7 * 182 + 0.3 * baseLum);
      changeRgba[idx + 2] = Math.round(0.7 * 212 + 0.3 * baseLum);
      changeRgba[idx + 3] = 255;
    } else if (cVal === 1 && pVal === 0) {
      // Newly expanded: Red (239, 68, 68)
      expanded++;
      changeRgba[idx] = Math.round(0.8 * 239 + 0.2 * baseLum);
      changeRgba[idx + 1] = Math.round(0.8 * 68 + 0.2 * baseLum);
      changeRgba[idx + 2] = Math.round(0.8 * 68 + 0.2 * baseLum);
      changeRgba[idx + 3] = 255;
    } else if (cVal === 0 && pVal === 1) {
      // Dissipated / Drifted: Amber (245, 158, 11)
      dissipated++;
      changeRgba[idx] = Math.round(0.8 * 245 + 0.2 * baseLum);
      changeRgba[idx + 1] = Math.round(0.8 * 158 + 0.2 * baseLum);
      changeRgba[idx + 2] = Math.round(0.8 * 11 + 0.2 * baseLum);
      changeRgba[idx + 3] = 255;
    } else {
      changeRgba[idx] = baseLum;
      changeRgba[idx + 1] = baseLum;
      changeRgba[idx + 2] = baseLum;
      changeRgba[idx + 3] = 255;
    }
  }

  const changeOverlayB64 = encodePngBase64(width, height, changeRgba);
  const union = overlap + expanded + dissipated;
  const iou = union > 0 ? Number((overlap / union).toFixed(3)) : 0;

  return {
    change_metrics: {
      previous_area_pixels: pArea,
      current_area_pixels: cArea,
      area_difference_pixels: diff,
      percentage_change: pctChange,
      trend,
      trend_summary:
        trend === "EXPANSION"
          ? `Spill expanded by ${pctChange}% (${diff > 0 ? "+" : ""}${diff} pixels) across sequential passes.`
          : trend === "CONTRACTION"
          ? `Spill contracted by ${Math.abs(pctChange)}% (${diff} pixels) due to dispersion or evaporation.`
          : `Spill footprint remained relatively stable (${pctChange}% delta).`,
      overlap_pixels: overlap,
      intersection_over_union: iou,
      newly_expanded_pixels: expanded,
      dissipated_pixels: dissipated,
    },
    change_overlay: changeOverlayB64,
  };
}

export function generateSyntheticSarTile(scenario: "medium_slick" | "weathered" | "clean_ocean"): Buffer {
  const width = 512;
  const height = 512;
  const totalPixels = width * height;
  const rgba = new Uint8Array(totalPixels * 4);

  // Clutter seed
  let seed = scenario === "medium_slick" ? 12345 : scenario === "weathered" ? 54321 : 99999;
  const pseudoRandom = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };

  // Base ocean radar clutter
  const clutter = new Uint8Array(totalPixels);
  for (let i = 0; i < totalPixels; i++) {
    // Rayleigh-like distribution approximation
    const u1 = Math.max(0.0001, pseudoRandom());
    const u2 = pseudoRandom();
    const rayleigh = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const val = Math.min(235, Math.max(25, Math.round(115 + rayleigh * 28)));
    clutter[i] = val;
  }

  // Smooth speckle slightly
  const smoothed = new Uint8Array(totalPixels);
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let sum = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          sum += clutter[(y + dy) * width + (x + dx)];
        }
      }
      smoothed[y * width + x] = Math.round(sum / 9);
    }
  }

  // Inject slick damping
  if (scenario === "medium_slick") {
    // Cohesive elongated slick around (250, 240)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = x - 250;
        const dy = y - 240;
        // Rotated ellipse equation
        const cosA = Math.cos(0.5);
        const sinA = Math.sin(0.5);
        const rx = dx * cosA + dy * sinA;
        const ry = -dx * sinA + dy * cosA;
        const dNorm = (rx * rx) / (120 * 120) + (ry * ry) / (45 * 45);

        // Secondary tail blob
        const d2 = ((x - 350) * (x - 350)) / (50 * 50) + ((y - 290) * (y - 290)) / (25 * 25);

        if (dNorm < 1.0 || d2 < 1.0) {
          const edgeDist = Math.min(dNorm, d2);
          const damping = 0.72 * (1.0 - Math.min(1.0, edgeDist * 0.4));
          const idx = y * width + x;
          smoothed[idx] = Math.round(smoothed[idx] * (1.0 - damping));
        }
      }
    }
  } else if (scenario === "weathered") {
    // Multiple fragmented sheen ribbons
    const ribbons = [
      { cx: 180, cy: 190, rx: 70, ry: 20, angle: 0.6 },
      { cx: 240, cy: 230, rx: 55, ry: 18, angle: 0.7 },
      { cx: 290, cy: 270, rx: 65, ry: 16, angle: 0.5 },
      { cx: 340, cy: 250, rx: 45, ry: 15, angle: 0.8 },
      { cx: 375, cy: 300, rx: 40, ry: 12, angle: 0.4 },
    ];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        let inside = false;
        let minD = 1.0;
        for (const r of ribbons) {
          const dx = x - r.cx;
          const dy = y - r.cy;
          const cosA = Math.cos(r.angle);
          const sinA = Math.sin(r.angle);
          const rx = dx * cosA + dy * sinA;
          const ry = -dx * sinA + dy * cosA;
          const d = (rx * rx) / (r.rx * r.rx) + (ry * ry) / (r.ry * r.ry);
          if (d < 1.0) {
            inside = true;
            if (d < minD) minD = d;
          }
        }
        if (inside) {
          const damping = 0.58 * (1.0 - minD * 0.3);
          const idx = y * width + x;
          smoothed[idx] = Math.round(smoothed[idx] * (1.0 - damping));
        }
      }
    }
  }

  // Populate RGBA
  for (let i = 0; i < totalPixels; i++) {
    const idx = i * 4;
    const val = smoothed[i];
    rgba[idx] = val;
    rgba[idx + 1] = val;
    rgba[idx + 2] = val;
    rgba[idx + 3] = 255;
  }

  const png = new PNG({ width, height });
  png.data = Buffer.from(rgba);
  return PNG.sync.write(png);
}

function generateLocalReport(data: any): string {
  const det = data.detection || {};
  const geom = data.geometry || {};
  const weath = data.weathering || {};
  const risk = data.risk || {};

  const detected = det.detected;
  const conf = Math.round((det.confidence || 0) * 100);
  const pxArea = (geom.pixel_area || 0).toLocaleString();
  const areaPct = geom.area_percentage || 0;
  const length = geom.estimated_length_px || 0;
  const width = geom.estimated_width_px || 0;
  const orientation = geom.orientation_deg || 0;
  const centroid = geom.centroid || [0, 0];

  if (!detected) {
    return `## EXECUTIVE SUMMARY
Autonomous Sentinel-1 SAR radiometric scan completed. No significant candidate oil slick anomalies were detected above baseline signal-to-noise confidence thresholds.

### DETECTION ASSESSMENT
- **Status**: Clean Oceanic Surface (Confidence: ${conf}%)
- **Radar Backscatter**: Ambient oceanic surface roughness is consistent with normal sea clutter without anomalous capillary wave suppression.

### RECOMMENDATION
- Maintain standard orbital surveillance revisit tracking. No tactical interdiction warranted.`;
  }

  return `## EXECUTIVE INTELLIGENCE SUMMARY
A candidate low-backscatter surface anomaly consistent with a marine oil spill was detected via Sentinel-1 SAR analysis with an analytical confidence of **${conf}%**. The event is categorized under Risk Level **${risk.level}** (composite risk score: ${risk.score}/1.0).

---

### 1. DETECTION ASSESSMENT
- **Classification Status**: Candidate Oil Slick Anomaly (Confidence: ${conf}%)
- **Sensor Physics**: Capillary wave damping causing characteristic specular dark-patch radar attenuation.
- **Ambiguity Disclaimer**: Analytical baseline detector; non-oil look-alikes (e.g., local wind calm zones, biogenic films) cannot be ruled out without multi-spectral or in-situ verification.

### 2. SPILL GEOMETRY & MORPHOLOGY
- **Candidate Footprint**: ${pxArea} pixels (${areaPct}% of acquisition scene)
- **Centroid Coordinates**: Image-space coordinates [X: ${centroid[0]}, Y: ${centroid[1]}] (Geographic lat/long uncalibrated in raw raster)
- **Principal Dimensions**: Estimated length: ~${length} px | Width: ~${width} px | Aspect Ratio: ${geom.aspect_ratio || 1}:1
- **Spatial Alignment**: Principal axis oriented at ${orientation}° relative to sensor raster horizontal.

### 3. RELATIVE WEATHERING & AGEING
- **Weathering Indicator**: **${weath.indicator}** (Relative Dispersion Score: ${weath.score}/1.0)
- **Surface Characteristics**: ${weath.description || "Surface fragmentation and edge gradient analyzed."}
- **Scientific Note**: Relative optical indicator derived from boundary gradients and spatial fragmentation. Does not represent calibrated chemical chronometry.

### 4. RECOMMENDED MONITORING ACTIONS
1. **Immediate Tactical Alert**: Notify regional maritime safety authority and port state control of candidate coordinates.
2. **Multi-Source Cross-Validation**: Intersect detection centroid with live AIS vessel positions to identify candidate discharge sources.
3. **Task Consecutive Revisit**: Schedule subsequent SAR / optical orbital acquisition to monitor dispersion trajectory.
4. **Aerial Verification**: Deploy maritime patrol aircraft or drone asset if trajectory threatens vulnerable marine sanctuaries or navigational channels.`;
}

// Server-side Gemini AI caller
export async function callGeminiAiReport(data: any): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return generateLocalReport(data);
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `You are the senior remote sensing and maritime intelligence officer on the OILWATCH platform.
Below is the structured, validated telemetry from our automated Sentinel-1 SAR oil-spill analysis pipeline.

CRITICAL DIRECTIVES:
- Base your report ONLY on the structured numbers and facts provided below.
- Do NOT fabricate geographic coordinates (lat/long), wind speeds, ship names, or distances to coast if they are not in the telemetry.
- If information is not provided or marked as uncalibrated, explicitly note that it is uncalibrated or unavailable.
- Do NOT claim SAR alone provides exact chronological age; refer to it strictly as a "relative weathering indicator".
- Format clearly in Markdown with headers:
  - EXECUTIVE SUMMARY
  - DETECTION ASSESSMENT
  - SPILL CHARACTERISTICS & GEOMETRY
  - WEATHERING ASSESSMENT
  - RECOMMENDED OPERATIONAL ACTION

STRUCTURED TELEMETRY:
${JSON.stringify(data, null, 2)}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    if (response && response.text) {
      return response.text;
    }
    return generateLocalReport(data);
  } catch (err: any) {
    const fallback = generateLocalReport(data);
    return `${fallback}\n\n*(Note: Cloud AI model fallback engaged: ${String(err?.message || "connection error").slice(0, 50)}.)*`;
  }
}
