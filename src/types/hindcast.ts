/**
 * OILWATCH - Trajectory Hindcasting & Hydrodynamic Drift Modeling Types
 */

import { AnomalyFlag, AnomalyStrictness } from "./anomalyThreshold";

export interface AISRecord {
  mmsi: string;
  timestamp: string; // ISO 8601 UTC
  latitude: number;
  longitude: number;
  speed: number; // knots
  heading: number; // 0-360 degrees
  courseOverGround: number;
  vesselName: string;
  vesselType: string;
  callSign: string;
  imo: string;
  status: string; // "Under way", "Moored", "Engaged in fishing", etc.
  destination: string;
  grossTonnage?: number;
}

export interface HistoricalPosition {
  timestamp: string;
  ais_lat: number;
  ais_lon: number;
  reconstructed_lat: number;
  reconstructed_lon: number;
  error_nm: number;
  vessel_speed: number;
  heading: number;
  confidence: number;
}

export interface UncertaintyEllipse {
  centerLat: number;
  centerLon: number;
  majorAxisNm: number;
  minorAxisNm: number;
  rotationDegrees: number;
}

export interface OriginHypothesis {
  position: [number, number]; // [lat, lon]
  timestamp: string;
  confidence: number; // 0-1
  probability_area_nm2: number;
  uncertaintyEllipse: UncertaintyEllipse;
  reasoning: string;
}

export interface BackwardDriftPoint {
  time_hours_ago: number;
  lat: number;
  lon: number;
  timestamp?: string;
  uncertainty_nm?: number;
}

export interface DriftAnalysisSummary {
  current_vector: [number, number]; // [u, v] in m/s
  stokes_drift: [number, number];   // [u, v] in m/s
  wind_drift: [number, number];     // [u, v] in m/s
  backward_drift_path: BackwardDriftPoint[];
  dominant_driver?: "current" | "wind" | "stokes";
  total_drift_distance_nm?: number;
}

export interface HindcastResult {
  hindcast_id: string;
  vessel_id: string;
  vessel_name?: string;
  vessel_type?: string;
  detection_timestamp: string;
  lookback_days: number;
  ais_data_points: number;
  trajectory: {
    historical_positions: HistoricalPosition[];
    origin_hypothesis: OriginHypothesis;
  };
  drift_analysis: DriftAnalysisSummary;
  anomaly_assessment: {
    strictness_level: AnomalyStrictness | string;
    flags: AnomalyFlag[];
    confidence_score: number;
  };
  data_quality_metrics: {
    ais_record_count: number;
    time_series_continuity: number; // 0-1
    overall_confidence: number;    // 0-1
    interpolation_ratio: number;   // 0-1
  };
}

export interface EnvironmentalDataConfig {
  currentVector?: { u: number; v: number };
  windVector?: { speed: number; direction: number };
  waveHeight?: { significant: number; meanPeriod: number };
  oilViscosity?: number;  // cSt (default 100)
  slickThickness?: number; // mm (default 1)
  density?: number;        // kg/m3 (default 860)
}

export interface DriftPoint {
  timestamp: string;
  lat: number;
  lon: number;
  uncertainty: {
    stdDev: number; // nm (1-sigma)
    ellipse: {
      majorAxis: number;
      minorAxis: number;
      rotation: number;
    };
  };
}

export interface DriftTrajectory {
  points: DriftPoint[];
  totalDrift: {
    distanceNm: number;
    direction: number;
  };
  dominantDriver: "current" | "wind" | "stokes";
  sensitivity: {
    currentImpact: number;
    windImpact: number;
    stokesImpact: number;
    primaryDriver: string;
  };
}
