export type RiskLevel = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type WeatheringLevel = "LOW" | "MODERATE" | "HIGH" | "INCONCLUSIVE";

export interface DetectionMetrics {
  detected: boolean;
  confidence: number;
  threshold_used: number;
  contrast_ratio: number;
  mean_slick_intensity: number;
  mean_ambient_water_intensity: number;
  candidate_pixel_count: number;
  sensor_anomaly_type: string;
}

export interface GeometryFeatures {
  has_features: boolean;
  connected_components_count: number;
  pixel_area: number;
  area_percentage: number;
  unit_label: string;
  estimated_physical_area_km2: number | null;
  perimeter: number;
  centroid: [number, number];
  bounding_box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  estimated_length_px: number;
  estimated_width_px: number;
  aspect_ratio: number;
  orientation_deg: number;
  compactness: number;
  solidity: number;
}

export interface WeatheringAnalysis {
  indicator: WeatheringLevel;
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
}

export interface RiskFactor {
  factor: string;
  contribution: string;
  description: string;
}

export interface RiskAnalysis {
  level: RiskLevel;
  score: number;
  color: string;
  summary: string;
  factors: RiskFactor[];
  recommendation: string;
}

export interface PreprocessingStats {
  dimensions: [number, number];
  total_pixels: number;
  mean_intensity: number;
  std_intensity: number;
  min_intensity: number;
  max_intensity: number;
  filtering_applied: string;
}

export interface AnalysisImages {
  original: string;
  mask: string;
  overlay: string;
  change_overlay?: string | null;
}

export interface AnalysisResponse {
  status: "success" | "error";
  error?: string;
  detection: DetectionMetrics;
  geometry: GeometryFeatures;
  weathering: WeatheringAnalysis;
  risk: RiskAnalysis;
  change?: ChangeDetectionMetrics | null;
  images: AnalysisImages;
  preprocessing_stats: PreprocessingStats;
  report: string;
}

export interface ChangeDetectionMetrics {
  previous_area_pixels: number;
  current_area_pixels: number;
  area_difference_pixels: number;
  percentage_change: number;
  trend: "EXPANSION" | "CONTRACTION" | "STABLE";
  trend_summary: string;
  overlap_pixels: number;
  intersection_over_union: number;
  newly_expanded_pixels: number;
  dissipated_pixels: number;
}

export interface ChangeDetectionResponse {
  status: "success" | "error";
  error?: string;
  previous_analysis: {
    pixel_area: number;
    confidence: number;
    risk_level: RiskLevel;
  };
  current_analysis: {
    pixel_area: number;
    confidence: number;
    risk_level: RiskLevel;
  };
  change_metrics: ChangeDetectionMetrics;
  images: {
    previous_overlay: string;
    current_overlay: string;
    change_overlay: string;
  };
}

export interface DemoSample {
  id: string;
  title: string;
  description: string;
  scenario: "medium_slick" | "weathered" | "clean_ocean";
  sensor: string;
}
