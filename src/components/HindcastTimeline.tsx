import React, { useState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  Calendar,
  Clock,
  FastForward,
  Navigation,
  Pause,
  Play,
  RotateCcw,
  ShieldAlert,
  Ship,
  Sparkles,
} from "lucide-react";
import { HindcastResult, HistoricalPosition } from "../types/hindcast";
import { Tooltip } from "./Tooltip";

interface HindcastTimelineProps {
  hindcastResult: HindcastResult;
  onPositionSelect?: (pos: HistoricalPosition) => void;
}

export const HindcastTimeline: React.FC<HindcastTimelineProps> = ({
  hindcastResult,
  onPositionSelect,
}) => {
  const { trajectory, anomaly_assessment } = hindcastResult;
  const positions = trajectory.historical_positions;

  const [currentIndex, setCurrentIndex] = useState(positions.length - 1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1); // 1x, 2x, 5x
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Sync with selected position
  const activePosition = positions[currentIndex] || positions[0];

  useEffect(() => {
    if (isPlaying) {
      const intervalMs = Math.max(100, Math.floor(600 / playbackSpeed));
      timerRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= positions.length - 1) {
            setIsPlaying(false);
            return positions.length - 1;
          }
          return prev + 1;
        });
      }, intervalMs);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, playbackSpeed, positions.length]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const idx = parseInt(e.target.value, 10);
    setCurrentIndex(idx);
    if (onPositionSelect && positions[idx]) {
      onPositionSelect(positions[idx]);
    }
  };

  const handleStep = (direction: -1 | 1) => {
    setCurrentIndex((prev) => {
      const next = Math.max(0, Math.min(positions.length - 1, prev + direction));
      if (onPositionSelect && positions[next]) {
        onPositionSelect(positions[next]);
      }
      return next;
    });
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(0);
  };

  // Find if active point has an anomaly flag nearby
  const activeAnomalies = anomaly_assessment.flags.filter((f) => {
    if (!f.timestamp || !activePosition) return false;
    const fTime = new Date(f.timestamp).getTime();
    const pTime = new Date(activePosition.timestamp).getTime();
    return Math.abs(fTime - pTime) <= 2 * 3600 * 1000;
  });

  return (
    <div
      id="hindcast-timeline-container"
      className="rounded-xl border border-[#17304f] bg-[#0b1728]/90 p-5 shadow-xl"
    >
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold tracking-wide text-white">
              Time-Series Voyage Reconstruction Playback
            </h3>
            <span className="rounded border border-blue-500/40 bg-blue-950/70 px-2 py-0.5 text-[10px] font-bold text-blue-300">
              {hindcastResult.lookback_days} DAYS LOOKBACK
            </span>
            <Tooltip text="Timeline playback interpolating historical AIS telemetry with spline kinematics and GNSS error variance. Analytical Estimates based on SAR features." />
          </div>
          <p className="text-xs text-slate-400">
            Scrub forward/backward to inspect vessel kinematics at any historical epoch
          </p>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handleReset}
            title="Reset to Oldest Position"
            className="rounded-lg border border-[#17304f] bg-[#071324] p-2 text-slate-300 hover:bg-[#0d2038] hover:text-white"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => handleStep(-1)}
            title="Step Backward"
            className="rounded-lg border border-[#17304f] bg-[#071324] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#0d2038] hover:text-white"
          >
            -1h
          </button>

          <button
            type="button"
            onClick={() => setIsPlaying(!isPlaying)}
            className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${
              isPlaying
                ? "bg-amber-600 text-white hover:bg-amber-500"
                : "bg-cyan-600 text-white hover:bg-cyan-500"
            }`}
          >
            {isPlaying ? (
              <>
                <Pause className="h-4 w-4 fill-white" />
                <span>Pause</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Play Voyage</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleStep(1)}
            title="Step Forward"
            className="rounded-lg border border-[#17304f] bg-[#071324] px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-[#0d2038] hover:text-white"
          >
            +1h
          </button>

          {/* Speed Selector */}
          <div className="flex rounded-lg border border-[#17304f] bg-[#071324] p-0.5 text-[11px] font-semibold">
            {[1, 2, 5].map((spd) => (
              <button
                key={spd}
                type="button"
                onClick={() => setPlaybackSpeed(spd)}
                className={`rounded px-2 py-1 transition ${
                  playbackSpeed === spd ? "bg-cyan-600 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {spd}x
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Interactive Timeline Scrubber */}
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-xs font-mono text-slate-400">
          <span>{positions[0]?.timestamp ? new Date(positions[0].timestamp).toLocaleDateString() : "T-Start"}</span>
          <span className="text-cyan-400 font-bold">
            {activePosition?.timestamp
              ? new Date(activePosition.timestamp).toUTCString().replace("GMT", "UTC")
              : "Active Epoch"}
          </span>
          <span>
            {positions[positions.length - 1]?.timestamp
              ? new Date(positions[positions.length - 1].timestamp).toLocaleDateString()
              : "Detection (T0)"}
          </span>
        </div>

        <div className="relative">
          <input
            id="hindcast-timeline-slider"
            type="range"
            min="0"
            max={positions.length - 1}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg"
          />

          {/* Anomaly markers along the timeline rail */}
          <div className="pointer-events-none absolute -top-1 left-0 right-0 flex justify-between px-1">
            {positions.map((p, idx) => {
              const hasAnomaly = anomaly_assessment.flags.some((f) => {
                if (!f.timestamp) return false;
                return (
                  Math.abs(new Date(f.timestamp).getTime() - new Date(p.timestamp).getTime()) <= 3600 * 1000
                );
              });
              if (!hasAnomaly) return null;
              const pct = (idx / (positions.length - 1)) * 100;
              return (
                <span
                  key={`anomaly-tick-${idx}`}
                  style={{ left: `${pct}%` }}
                  className="absolute -top-1 h-3 w-1.5 -translate-x-1/2 rounded-full bg-rose-500 shadow-sm"
                />
              );
            })}
          </div>
        </div>
      </div>

      {/* Active Position Inspector Telemetry Card */}
      {activePosition && (
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-[#142842] bg-[#071221] p-4 sm:grid-cols-5">
          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Reconstructed Position
            </span>
            <p className="mt-0.5 font-mono text-xs font-bold text-emerald-400">
              {activePosition.reconstructed_lat.toFixed(4)}°, {activePosition.reconstructed_lon.toFixed(4)}°
            </p>
            <span className="text-[10px] text-slate-500">
              AIS: {activePosition.ais_lat.toFixed(4)}°, {activePosition.ais_lon.toFixed(4)}°
            </span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Speed Over Ground
            </span>
            <p className="mt-0.5 font-mono text-sm font-bold text-cyan-400">
              {activePosition.vessel_speed.toFixed(1)} kts
            </p>
            <span className="text-[10px] text-slate-500">Doppler Est.</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Vessel Heading
            </span>
            <p className="mt-0.5 font-mono text-sm font-bold text-slate-200">
              {activePosition.heading}°
            </p>
            <span className="text-[10px] text-slate-500">Gyro Compass</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Error / Variance
            </span>
            <p className="mt-0.5 font-mono text-sm font-bold text-amber-400">
              ±{activePosition.error_nm.toFixed(2)} NM
            </p>
            <span className="text-[10px] text-slate-500">Kalman 1-Sigma</span>
          </div>

          <div>
            <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
              Point Confidence
            </span>
            <p className="mt-0.5 font-mono text-sm font-bold text-white">
              {Math.round(activePosition.confidence * 100)}%
            </p>
            <span className="text-[10px] text-slate-500">Data Quality</span>
          </div>
        </div>
      )}

      {/* Active Anomaly Warnings if present at this epoch */}
      {activeAnomalies.length > 0 && (
        <div className="mt-3 space-y-2">
          {activeAnomalies.map((anom, i) => (
            <div
              key={i}
              className="flex items-start gap-2.5 rounded-lg border border-rose-500/40 bg-rose-950/40 p-3 text-xs text-rose-200"
            >
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <div>
                <span className="font-bold uppercase tracking-wider text-rose-300">
                  {anom.type.replace("_", " ")} ({anom.severity}):{" "}
                </span>
                <span>{anom.description}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
