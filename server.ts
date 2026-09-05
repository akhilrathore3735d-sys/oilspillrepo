import express from "express";
import http from "http";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  processSarPipeline,
  performChangeDetection,
  generateSyntheticSarTile,
  callGeminiAiReport,
} from "./server/pipeline.js";

dotenv.config();

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const PORT = 3000;

  // JSON parser with high payload ceiling for base64 satellite imagery
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({
      status: "healthy",
      service: "OILWATCH Remote Sensing Intelligence Engine",
      version: "1.0.0-mvp",
      pipeline_stages: [
        "preprocessing",
        "candidate_detection",
        "morphological_segmentation",
        "feature_extraction",
        "relative_weathering",
        "change_detection",
        "risk_engine",
        "ai_report_generator",
      ],
      ai_provider: process.env.GEMINI_API_KEY ? "Gemini 3.8 Flash (Active)" : "Local Heuristic Fallback (Active)",
    });
  });

  // API Demo Samples
  app.get("/api/demo-samples", (req, res) => {
    res.json([
      {
        id: "medium_slick",
        title: "Sentinel-1 SAR - Cohesive Crude Slick",
        description: "Distinct elongated dark patch anomaly with high capillary wave suppression.",
        scenario: "medium_slick",
        sensor: "Sentinel-1 C-band SAR (VV)",
      },
      {
        id: "weathered",
        title: "Sentinel-1 SAR - Weathered / Dispersed Sheen",
        description: "Multi-ribbon emulsified slick showing high spatial dispersion and diffuse edges.",
        scenario: "weathered",
        sensor: "Sentinel-1 C-band SAR (VV)",
      },
      {
        id: "clean_ocean",
        title: "Sentinel-1 SAR - Nominal Sea Surface",
        description: "Uniform sea clutter backscatter without anomalous capillary damping signatures.",
        scenario: "clean_ocean",
        sensor: "Sentinel-1 C-band SAR (VV)",
      },
    ]);
  });

  // Fetch demo sample base64 PNG
  app.get("/api/demo-sample/:scenario", (req, res) => {
    const scenario = (req.params.scenario as any) || "medium_slick";
    const validScenarios = ["medium_slick", "weathered", "clean_ocean"] as const;
    const selected = validScenarios.includes(scenario) ? scenario : "medium_slick";
    const pngBuffer = generateSyntheticSarTile(selected);
    const b64 = `data:image/png;base64,${pngBuffer.toString("base64")}`;
    res.json({
      scenario: selected,
      image_data: b64,
    });
  });

  // POST /api/analyze: Full SAR processing pipeline
  app.post("/api/analyze", async (req, res) => {
    try {
      const { image_data, spatial_resolution_m, generate_ai_report } = req.body;
      if (!image_data) {
        return res.status(400).json({ status: "error", error: "Missing image_data payload." });
      }

      // Strip data URI prefix if present
      const base64Data = image_data.includes(",") ? image_data.split(",")[1] : image_data;
      const buffer = Buffer.from(base64Data, "base64");

      if (buffer.length === 0) {
        return res.status(400).json({ status: "error", error: "Empty image buffer received." });
      }

      const spatialRes = typeof spatial_resolution_m === "number" ? spatial_resolution_m : 10.0;
      const result = processSarPipeline(buffer, spatialRes);

      // If user requested AI report and API key is present, enhance report
      if (generate_ai_report !== false && process.env.GEMINI_API_KEY) {
        result.report = await callGeminiAiReport({
          detection: result.detection,
          geometry: result.geometry,
          weathering: result.weathering,
          risk: result.risk,
        });
      }

      res.json(result);
    } catch (err: any) {
      console.error("Pipeline analysis error:", err);
      res.status(500).json({ status: "error", error: err?.message || "Internal analysis pipeline failure" });
    }
  });

  // POST /api/change-detection: Multi-temporal comparison
  app.post("/api/change-detection", async (req, res) => {
    try {
      const { previous_image, current_image } = req.body;
      if (!previous_image || !current_image) {
        return res.status(400).json({ status: "error", error: "Missing previous_image or current_image." });
      }

      const prevB64 = previous_image.includes(",") ? previous_image.split(",")[1] : previous_image;
      const currB64 = current_image.includes(",") ? current_image.split(",")[1] : current_image;

      const prevBuf = Buffer.from(prevB64, "base64");
      const currBuf = Buffer.from(currB64, "base64");

      const prevResult = processSarPipeline(prevBuf);
      const currResult = processSarPipeline(currBuf);

      const changeOutcome = performChangeDetection(prevResult, currResult);

      res.json({
        status: "success",
        previous_analysis: {
          pixel_area: prevResult.geometry.pixel_area,
          confidence: prevResult.detection.confidence,
          risk_level: prevResult.risk.level,
        },
        current_analysis: {
          pixel_area: currResult.geometry.pixel_area,
          confidence: currResult.detection.confidence,
          risk_level: currResult.risk.level,
        },
        change_metrics: changeOutcome.change_metrics,
        images: {
          previous_overlay: prevResult.images.overlay,
          current_overlay: currResult.images.overlay,
          change_overlay: changeOutcome.change_overlay,
        },
      });
    } catch (err: any) {
      console.error("Change detection error:", err);
      res.status(500).json({ status: "error", error: err?.message || "Change detection computation failed" });
    }
  });

  // Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server,
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`OILWATCH Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
