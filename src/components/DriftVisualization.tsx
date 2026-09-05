import React, { useState } from "react";
import {
  Compass,
  Eye,
  Layers,
  MapPin,
  Navigation,
  RotateCcw,
  Sparkles,
  Waves,
  Wind,
  Target,
} from "lucide-react";
import { DriftAnalysisSummary, OriginHypothesis, HistoricalPosition } from "../types/hindcast";
import { Tooltip } from "./Tooltip";

interface DriftVisualizationProps {
  driftAnalysis: DriftAnalysisSummary;
  originHypothesis: OriginHypothesis;
  historicalPositions?: HistoricalPosition[];
  vesselName?: string;
}

export const DriftVisualization: React.FC<DriftVisualizationProps> = ({
  driftAnalysis,
  originHypothesis,
  historicalPositions = [],
  vesselName = "Vessel",
}) => {
  const [showCurrents, setShowCurrents] = useState(true);
  const [showWind, setShowWind] = useState(true);
  const [showStokes, setShowStokes] = useState(true);
  const [showEllipse, setShowEllipse] = useState(true);
  const [showVesselTrack, setShowVesselTrack] = useState(true);
  const [hoveredPoint, setHoveredPoint] = useState<any | null>(null);

  const { backward_drift_path, current_vector, wind_drift, stokes_drift } = driftAnalysis;

  // Compute geodetic bounding box to map coordinates to SVG space [width=800, height=460]
  const allLats = [
    ...backward_drift_path.map((p) => p.lat),
    originHypothesis.position[0],
    ...(showVesselTrack ? historicalPositions.map((p) => p.reconstructed_lat) : []),
  ];
  const allLons = [
    ...backward_drift_path.map((p) => p.lon),
    originHypothesis.position[1],
    ...(showVesselTrack ? historicalPositions.map((p) => p.reconstructed_lon) : []),
  ];

  const minLat = Math.min(...allLats) - 0.08;
  const maxLat = Math.max(...allLats) + 0.08;
  const minLon = Math.min(...allLons) - 0.08;
  const maxLon = Math.max(...allLons) + 0.08;

  const svgWidth = 800;
  const svgHeight = 440;
  const padding = 50;

  const latToY = (lat: number) => {
    const range = maxLat - minLat || 0.1;
    return svgHeight - padding - ((lat - minLat) / range) * (svgHeight - 2 * padding);
  };

  const lonToX = (lon: number) => {
    const range = maxLon - minLon || 0.1;
    return padding + ((lon - minLon) / range) * (svgWidth - 2 * padding);
  };

  // Convert backward path to SVG points string
  const driftSvgPoints = backward_drift_path
    .map((pt) => `${lonToX(pt.lon)},${latToY(pt.lat)}`)
    .join(" ");

  // Convert vessel track to SVG points string
  const vesselSvgPoints = historicalPositions
    .map((pt) => `${lonToX(pt.reconstructed_lon)},${latToY(pt.reconstructed_lat)}`)
    .join(" ");

  const originX = lonToX(originHypothesis.position[1]);
  const originY = latToY(originHypothesis.position[0]);

  const detectionPt = backward_drift_path[0] || { lat: originHypothesis.position[0], lon: originHypothesis.position[1] };
  const detectionX = lonToX(detectionPt.lon);
  const detectionY = latToY(detectionPt.lat);

  // Uncertainty ellipse radii in SVG pixels
  const rx = Math.max(16, (originHypothesis.uncertaintyEllipse.majorAxisNm / 60) * (svgWidth / (maxLon - minLon || 1)));
  const ry = Math.max(9, (originHypothesis.uncertaintyEllipse.minorAxisNm / 60) * (svgHeight / (maxLat - minLat || 1)));

  return (
    <div
      id="drift-visualization-container"
      className="rounded-xl border border-[#17304f] bg-[#08121e]/90 p-5 shadow-xl"
    >
      {/* Header & Layer Controls */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide text-white">
              Hydrodynamic Vector Field & Backward Ray Tracing
            </h3>
            <Tooltip text="Fay & Mackay oil transport trajectory solver displaying ocean currents, wind Ekman drift, and Stokes wave drift back to origin. Analytical Estimates based on SAR features." />
          </div>
          <p className="text-xs text-slate-400">
            Cross-referencing reverse transport vectors against historical voyage trajectory
          </p>
        </div>

        {/* Layer Toggles */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowCurrents(!showCurrents)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              showCurrents
                ? "border-cyan-500/50 bg-cyan-950/70 text-cyan-300"
                : "border-slate-800 bg-slate-900/50 text-slate-500"
            }`}
          >
            <Waves className="h-3 w-3" />
            <span>Currents</span>
          </button>

          <button
            type="button"
            onClick={() => setShowWind(!showWind)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              showWind
                ? "border-amber-500/50 bg-amber-950/70 text-amber-300"
                : "border-slate-800 bg-slate-900/50 text-slate-500"
            }`}
          >
            <Wind className="h-3 w-3" />
            <span>Wind (3.2%)</span>
          </button>

          <button
            type="button"
            onClick={() => setShowStokes(!showStokes)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              showStokes
                ? "border-purple-500/50 bg-purple-950/70 text-purple-300"
                : "border-slate-800 bg-slate-900/50 text-slate-500"
            }`}
          >
            <Sparkles className="h-3 w-3" />
            <span>Stokes Wave</span>
          </button>

          <button
            type="button"
            onClick={() => setShowEllipse(!showEllipse)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              showEllipse
                ? "border-emerald-500/50 bg-emerald-950/70 text-emerald-300"
                : "border-slate-800 bg-slate-900/50 text-slate-500"
            }`}
          >
            <Target className="h-3 w-3" />
            <span>Origin Ellipse</span>
          </button>

          <button
            type="button"
            onClick={() => setShowVesselTrack(!showVesselTrack)}
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-semibold transition ${
              showVesselTrack
                ? "border-blue-500/50 bg-blue-950/70 text-blue-300"
                : "border-slate-800 bg-slate-900/50 text-slate-500"
            }`}
          >
            <Navigation className="h-3 w-3" />
            <span>AIS Voyage Track</span>
          </button>
        </div>
      </div>

      {/* SVG Canvas Map Stage */}
      <div className="relative mt-4 overflow-hidden rounded-xl border border-[#142842] bg-[#050c17]">
        {/* Geodetic Grid Lines & Water Texture */}
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-full w-full select-none"
          style={{ minHeight: "360px" }}
        >
          <defs>
            {/* Grid Pattern */}
            <pattern id="nautical-grid" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#0d1e33" strokeWidth="1" />
              <circle cx="60" cy="0" r="1.5" fill="#132a48" />
            </pattern>

            {/* Gradient for Drift Path */}
            <linearGradient id="drift-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#f43f5e" />
            </linearGradient>

            {/* Arrow Marker */}
            <marker id="arrow-cyan" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
            </marker>
            <marker id="arrow-amber" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#f59e0b" />
            </marker>
            <marker id="arrow-purple" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
            </marker>
          </defs>

          {/* Grid Background */}
          <rect width="100%" height="100%" fill="#050c17" />
          <rect width="100%" height="100%" fill="url(#nautical-grid)" />

          {/* Environmental Vector Field Indicators (Sampled Across Canvas) */}
          {showCurrents && (
            <g opacity="0.6">
              {[0.25, 0.5, 0.75].map((xFrac) =>
                [0.25, 0.5, 0.75].map((yFrac) => {
                  const gx = svgWidth * xFrac;
                  const gy = svgHeight * yFrac;
                  const uScale = current_vector[0] * 120;
                  const vScale = -current_vector[1] * 120;
                  return (
                    <line
                      key={`curr-${xFrac}-${yFrac}`}
                      x1={gx}
                      y1={gy}
                      x2={gx + uScale}
                      y2={gy + vScale}
                      stroke="#06b6d4"
                      strokeWidth="1.5"
                      strokeDasharray="3,3"
                      markerEnd="url(#arrow-cyan)"
                    />
                  );
                })
              )}
            </g>
          )}

          {showWind && (
            <g opacity="0.5">
              {[0.35, 0.65].map((xFrac) =>
                [0.35, 0.65].map((yFrac) => {
                  const gx = svgWidth * xFrac;
                  const gy = svgHeight * yFrac;
                  const uScale = wind_drift[0] * 140;
                  const vScale = -wind_drift[1] * 140;
                  return (
                    <line
                      key={`wind-${xFrac}-${yFrac}`}
                      x1={gx}
                      y1={gy}
                      x2={gx + uScale}
                      y2={gy + vScale}
                      stroke="#f59e0b"
                      strokeWidth="1.5"
                      markerEnd="url(#arrow-amber)"
                    />
                  );
                })
              )}
            </g>
          )}

          {/* Historical Vessel AIS Track */}
          {showVesselTrack && historicalPositions.length > 1 && (
            <g>
              <polyline
                points={vesselSvgPoints}
                fill="none"
                stroke="#3b82f6"
                strokeWidth="2.5"
                strokeDasharray="4,4"
                opacity="0.8"
              />
              {historicalPositions.map((p, idx) => {
                const px = lonToX(p.reconstructed_lon);
                const py = latToY(p.reconstructed_lat);
                return (
                  <circle
                    key={`vpos-${idx}`}
                    cx={px}
                    cy={py}
                    r={3}
                    fill="#60a5fa"
                    className="transition hover:r-5 cursor-pointer"
                    onMouseEnter={() => setHoveredPoint({ ...p, type: "AIS Position" })}
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </g>
          )}

          {/* Reverse Hydrodynamic Drift Ray Tracing Path */}
          {backward_drift_path.length > 1 && (
            <g>
              <polyline
                points={driftSvgPoints}
                fill="none"
                stroke="url(#drift-gradient)"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {backward_drift_path.map((pt, idx) => {
                const px = lonToX(pt.lon);
                const py = latToY(pt.lat);
                return (
                  <circle
                    key={`dpt-${idx}`}
                    cx={px}
                    cy={py}
                    r={pt.time_hours_ago === 0 ? 5 : 3}
                    fill={pt.time_hours_ago === 0 ? "#f43f5e" : "#06b6d4"}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="cursor-pointer"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        lat: pt.lat,
                        lon: pt.lon,
                        time_hours_ago: pt.time_hours_ago,
                        uncertainty_nm: pt.uncertainty_nm,
                        type: "Drift Ray Waypoint",
                      })
                    }
                    onMouseLeave={() => setHoveredPoint(null)}
                  />
                );
              })}
            </g>
          )}

          {/* Origin Hypothesis Point & Uncertainty Ellipse */}
          {showEllipse && (
            <g transform={`rotate(${originHypothesis.uncertaintyEllipse.rotationDegrees - 180}, ${originX}, ${originY})`}>
              <ellipse
                cx={originX}
                cy={originY}
                rx={rx}
                ry={ry}
                fill="rgba(16, 185, 129, 0.15)"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="5,3"
              />
            </g>
          )}

          {/* Origin Marker (Green Star Pin) */}
          <g transform={`translate(${originX - 12}, ${originY - 24})`}>
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill="#10b981"
              stroke="#042f2e"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
          </g>
          <text
            x={originX + 16}
            y={originY - 10}
            fill="#34d399"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            ORIGIN HYPOTHESIS ({Math.round(originHypothesis.confidence * 100)}%)
          </text>

          {/* Satellite Detected Oil Slick Marker (Red Pin) */}
          <g transform={`translate(${detectionX - 12}, ${detectionY - 24})`}>
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
              fill="#f43f5e"
              stroke="#4c0519"
              strokeWidth="1.5"
            />
            <circle cx="12" cy="9" r="2.5" fill="#ffffff" />
          </g>
          <text
            x={detectionX + 16}
            y={detectionY + 12}
            fill="#fb7185"
            fontSize="11"
            fontWeight="bold"
            fontFamily="monospace"
          >
            OIL SLICK DETECTED (T0)
          </text>
        </svg>

        {/* Floating Telemetry Tooltip when Hovering Waypoints */}
        {hoveredPoint && (
          <div className="pointer-events-none absolute bottom-4 left-4 z-20 rounded-lg border border-cyan-500/60 bg-[#071324]/95 p-3 text-xs shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 text-cyan-400 font-bold mb-1">
              <MapPin className="h-3.5 w-3.5" />
              <span>{hoveredPoint.type || "Waypoint Telemetry"}</span>
            </div>
            <div className="space-y-0.5 font-mono text-[11px] text-slate-200">
              <p>Lat: {hoveredPoint.lat || hoveredPoint.reconstructed_lat}°</p>
              <p>Lon: {hoveredPoint.lon || hoveredPoint.reconstructed_lon}°</p>
              {typeof hoveredPoint.time_hours_ago === "number" && (
                <p className="text-amber-400">Drift Epoch: -{hoveredPoint.time_hours_ago} hours ago</p>
              )}
              {hoveredPoint.vessel_speed && <p>Speed: {hoveredPoint.vessel_speed} kts</p>}
              {hoveredPoint.heading && <p>Heading: {hoveredPoint.heading}°</p>}
              {hoveredPoint.uncertainty_nm && (
                <p className="text-emerald-400">Diffusion ±{hoveredPoint.uncertainty_nm} NM</p>
              )}
            </div>
          </div>
        )}

        {/* Compass Rose & Scale Indicator */}
        <div className="absolute right-4 bottom-4 flex items-center gap-3 rounded-lg border border-[#17304f] bg-[#071221]/90 px-3 py-1.5 text-[11px] text-slate-300">
          <div className="flex items-center gap-1 font-mono">
            <Compass className="h-3.5 w-3.5 text-cyan-400" />
            <span>N ↑</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <span className="font-mono text-[10px] text-slate-400">10 NM ━━━</span>
        </div>
      </div>

      {/* Legend & Vector Legend Bar */}
      <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 border-t border-[#142842] pt-3 text-xs text-slate-400">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
            <span className="text-slate-200">Detected Slick (T0)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            <span className="text-slate-200">Origin Point</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 bg-gradient-to-r from-emerald-400 to-rose-500" />
            <span className="text-slate-200">Reverse Ray Trace</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-0.5 w-4 border-b-2 border-dashed border-blue-400" />
            <span className="text-slate-200">{vesselName} AIS Track</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-cyan-400">Currents: {current_vector[0]}m/s E, {current_vector[1]}m/s N</span>
          <span className="text-amber-400">Wind: {wind_drift[0]}m/s E, {wind_drift[1]}m/s N</span>
        </div>
      </div>
    </div>
  );
};
