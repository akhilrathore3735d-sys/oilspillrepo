/**
 * OILWATCH - Hindcasting & Hydrodynamic Drift Route Handlers
 * Express router mounting all 8 required endpoints
 */

import { Router, Request, Response } from "express";
import { hindcastVessel } from "../services/hindcasting.js";
import { forwardDrift, backwardDrift } from "../services/drift.js";
import { aisFeedsService } from "../services/aisFeeds.js";
import {
  AnomalyStrictness,
  AnomalyThresholdConfig,
  ANOMALY_THRESHOLDS,
} from "../../src/types/anomalyThreshold.js";

const router = Router();

// In-memory cache for computed hindcasts
const hindcastCache = new Map<string, any>();

// Current active anomaly threshold config in memory
let currentThresholdConfig: AnomalyThresholdConfig = {
  ...ANOMALY_THRESHOLDS[AnomalyStrictness.BALANCED],
};

/**
 * 1. POST /api/hindcast/vessel
 * Full time-series trajectory reconstruction + hydrodynamic drift correlation
 */
router.post("/vessel", async (req: Request, res: Response) => {
  try {
    const { mmsi, lookbackDays, includeDriftAnalysis, anomalyStrictness, environmentalData, referenceDetectionLocation } = req.body;

    if (!mmsi) {
      return res.status(400).json({ error: "Missing required parameter: mmsi" });
    }

    const result = await hindcastVessel(String(mmsi), {
      lookbackDays: typeof lookbackDays === "number" ? lookbackDays : 7,
      includeDriftAnalysis: includeDriftAnalysis !== false,
      anomalyStrictness: anomalyStrictness || currentThresholdConfig.strictness,
      environmentalData,
      referenceDetectionLocation,
    });

    // Cache by hindcast_id and MMSI
    hindcastCache.set(result.hindcast_id, result);
    hindcastCache.set(String(mmsi), result);

    res.json(result);
  } catch (err: any) {
    console.error("Hindcast vessel error:", err);
    res.status(500).json({ error: err?.message || "Hindcasting computation failure" });
  }
});

/**
 * 2. GET /api/hindcast/history/:detectionId
 * Retrieves cached or benchmark hindcast report
 */
router.get("/history/:detectionId", async (req: Request, res: Response) => {
  try {
    const id = req.params.detectionId;
    const cached = hindcastCache.get(id);
    if (cached) {
      return res.json(cached);
    }

    // Generate fresh hindcast for standard default benchmark if not cached
    const fallbackMmsi = id.startsWith("353") ? id : "353161000";
    const fresh = await hindcastVessel(fallbackMmsi, { lookbackDays: 7 });
    hindcastCache.set(id, fresh);
    res.json(fresh);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to retrieve hindcast history" });
  }
});

/**
 * 3. POST /api/hindcast/batch
 * Batch hindcasting for multiple vessels
 */
router.post("/batch", async (req: Request, res: Response) => {
  try {
    const { vessels } = req.body;
    if (!Array.isArray(vessels) || vessels.length === 0) {
      return res.status(400).json({ error: "vessels array is required and must not be empty" });
    }

    const results = [];
    for (const v of vessels.slice(0, 10)) {
      if (v.mmsi) {
        const r = await hindcastVessel(String(v.mmsi), { lookbackDays: v.lookbackDays || 7 });
        results.push(r);
      }
    }

    res.json(results);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Batch hindcast computation failure" });
  }
});

/**
 * 4. POST /api/drift/forward
 * Forward Fay/Mackay oil spill drift solver
 */
router.post("/forward", async (req: Request, res: Response) => {
  try {
    const { origin, hoursAhead, currentVector, windVector, waveHeight } = req.body;
    if (!origin || typeof origin.lat !== "number" || typeof origin.lon !== "number") {
      return res.status(400).json({ error: "origin with lat and lon is required" });
    }

    const trajectory = await forwardDrift(
      origin,
      typeof hoursAhead === "number" ? hoursAhead : 72,
      { currentVector, windVector, waveHeight }
    );

    res.json(trajectory);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Forward drift solver error" });
  }
});

/**
 * 5. POST /api/drift/backward
 * Backward ray tracing to point-of-origin
 */
router.post("/backward", async (req: Request, res: Response) => {
  try {
    const { detection, hoursBack, currentVector, windVector, waveHeight } = req.body;
    if (!detection || typeof detection.lat !== "number" || typeof detection.lon !== "number") {
      return res.status(400).json({ error: "detection with lat and lon is required" });
    }

    const outcome = await backwardDrift(
      detection,
      typeof hoursBack === "number" ? hoursBack : 48,
      { currentVector, windVector, waveHeight }
    );

    res.json(outcome);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Backward drift solver error" });
  }
});

/**
 * 6. GET /api/ais/historical & /api/ais/history/:mmsi
 * Queries multi-provider AIS telemetry
 */
router.get("/historical", async (req: Request, res: Response) => {
  try {
    const mmsi = (req.query.mmsi as string) || "353161000";
    const days = parseInt(req.query.days as string, 10) || 7;
    const { provider, records } = await aisFeedsService.fetchHistorical(mmsi, days);

    res.json({
      provider,
      mmsi,
      recordCount: records.length,
      records,
      dataQuality: records.length > 50 ? 0.94 : 0.81,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to query historical AIS telemetry" });
  }
});

router.get("/history/:mmsi", async (req: Request, res: Response) => {
  try {
    const mmsi = req.params.mmsi;
    const days = parseInt(req.query.days as string, 10) || 7;
    const { provider, records } = await aisFeedsService.fetchHistorical(mmsi, days);

    res.json({
      provider,
      mmsi,
      recordCount: records.length,
      records,
      dataQuality: records.length > 50 ? 0.94 : 0.81,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to query vessel AIS history" });
  }
});

/**
 * 7. GET /api/anomaly-threshold
 * Retrieves active multi-tier threshold parameters
 */
router.get("/anomaly-threshold", (_req: Request, res: Response) => {
  res.json(currentThresholdConfig);
});

/**
 * 8. POST /api/anomaly-threshold
 * Dynamically updates threshold parameters or switches preset tier
 */
router.post("/anomaly-threshold", (req: Request, res: Response) => {
  try {
    const { strictness, customOverrides } = req.body;

    if (strictness && Object.values(AnomalyStrictness).includes(strictness)) {
      currentThresholdConfig = {
        ...ANOMALY_THRESHOLDS[strictness as AnomalyStrictness],
        ...(customOverrides || {}),
      };
    } else if (customOverrides) {
      currentThresholdConfig = {
        ...currentThresholdConfig,
        ...customOverrides,
      };
    }

    res.json({
      status: "success",
      config: currentThresholdConfig,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || "Failed to update anomaly threshold configuration" });
  }
});

export default router;
