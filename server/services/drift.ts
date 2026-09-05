/**
 * OILWATCH - Hydrodynamic Oil Spill Drift Solver
 * Implements Fay & Mackay oil transport model with Runge-Kutta 4th-order (RK4) integration
 */

import {
  DriftPoint,
  DriftTrajectory,
  EnvironmentalDataConfig,
  BackwardDriftPoint,
} from "../../src/types/hindcast";

/**
 * Standard environmental defaults (Arabian Sea / Indian Ocean / Global Marine)
 */
export function getOceanCurrents(lat: number, lon: number, _date?: Date): { u: number; v: number } {
  // Typical surface current: ~0.25 m/s eastward, -0.12 m/s northward
  const latVar = Math.sin((lat * Math.PI) / 180) * 0.05;
  const lonVar = Math.cos((lon * Math.PI) / 180) * 0.04;
  return { u: 0.23 + lonVar, v: -0.15 + latVar };
}

export function getWindVector(lat: number, lon: number, _date?: Date): { speed: number; direction: number } {
  // Typical maritime surface wind: ~8.5 m/s from 270° (Westerlies / Trade winds)
  const latJitter = Math.cos(lat * 0.1) * 0.8;
  return { speed: Math.max(3.0, 8.5 + latJitter), direction: 275 };
}

export function getWaveSpectra(_lat: number, _lon: number, _date?: Date): { significant: number; meanPeriod: number } {
  // Wave climate: Hs = 2.1m, Tp = 8.3s
  return { significant: 2.1, meanPeriod: 8.3 };
}

/**
 * Computes velocity derivatives in m/s converted to degrees/sec
 * 1 degree latitude ~ 111,139 meters
 * 1 degree longitude ~ 111,139 * cos(lat) meters
 */
function computeDriftVelocity(
  lat: number,
  lon: number,
  env: EnvironmentalDataConfig,
  date: Date
): { u_total: number; v_total: number; u_curr: number; v_curr: number; u_wind: number; v_wind: number; u_stokes: number; v_stokes: number } {
  const currents = env.currentVector || getOceanCurrents(lat, lon, date);
  const wind = env.windVector || getWindVector(lat, lon, date);
  const wave = env.waveHeight || getWaveSpectra(lat, lon, date);

  // 1. Ocean Currents component
  const u_curr = currents.u;
  const v_curr = currents.v;

  // 2. Wind-driven surface drift:
  // Fay / Mackay standard: 3.0% - 3.5% of wind speed at 10m.
  // Direction: wind blows TO direction (direction + 180).
  const windDirRad = ((wind.direction + 180) * Math.PI) / 180;
  const windDriftFactor = 0.032; // 3.2%
  const u_wind = wind.speed * windDriftFactor * Math.sin(windDirRad);
  const v_wind = wind.speed * windDriftFactor * Math.cos(windDirRad);

  // 3. Wave Stokes Drift:
  // Stokes velocity approx: Us ~ 0.015 * Hs * (2 * PI / Tp)
  const waveStokesFactor = 0.018 * wave.significant * ((2 * Math.PI) / Math.max(4, wave.meanPeriod));
  const u_stokes = waveStokesFactor * Math.sin(windDirRad);
  const v_stokes = waveStokesFactor * Math.cos(windDirRad);

  // Total transport velocity vector (m/s)
  const u_total = u_curr + u_wind + u_stokes;
  const v_total = v_curr + v_wind + v_stokes;

  return { u_total, v_total, u_curr, v_curr, u_wind, v_wind, u_stokes, v_stokes };
}

/**
 * Runge-Kutta 4th Order Integrator for Geodetic Coordinate Propagation
 */
export function solveRK4(
  startLat: number,
  startLon: number,
  startDate: Date,
  totalHours: number,
  direction: "forward" | "backward",
  env: EnvironmentalDataConfig = {},
  timeStepMinutes: number = 60
): DriftPoint[] {
  const points: DriftPoint[] = [];
  const dtSec = timeStepMinutes * 60;
  const sign = direction === "backward" ? -1 : 1;
  const totalSteps = Math.max(1, Math.floor((totalHours * 60) / timeStepMinutes));

  let curLat = startLat;
  let curLon = startLon;
  let curTime = new Date(startDate.getTime());

  // Record initial position (step 0)
  points.push({
    timestamp: curTime.toISOString(),
    lat: parseFloat(curLat.toFixed(5)),
    lon: parseFloat(curLon.toFixed(5)),
    uncertainty: {
      stdDev: 0.2,
      ellipse: {
        majorAxis: 0.4,
        minorAxis: 0.2,
        rotation: 45,
      },
    },
  });

  for (let i = 1; i <= totalSteps; i++) {
    const latRad = (curLat * Math.PI) / 180;
    const mPerDegLat = 111139.0;
    const mPerDegLon = Math.max(1000.0, 111139.0 * Math.cos(latRad));

    // RK4 Step 1: k1
    const v1 = computeDriftVelocity(curLat, curLon, env, curTime);
    const k1_lat = sign * (v1.v_total / mPerDegLat) * dtSec;
    const k1_lon = sign * (v1.u_total / mPerDegLon) * dtSec;

    // RK4 Step 2: k2
    const lat2 = curLat + k1_lat * 0.5;
    const lon2 = curLon + k1_lon * 0.5;
    const v2 = computeDriftVelocity(lat2, lon2, env, new Date(curTime.getTime() + sign * (dtSec * 500)));
    const k2_lat = sign * (v2.v_total / mPerDegLat) * dtSec;
    const k2_lon = sign * (v2.u_total / mPerDegLon) * dtSec;

    // RK4 Step 3: k3
    const lat3 = curLat + k2_lat * 0.5;
    const lon3 = curLon + k2_lon * 0.5;
    const v3 = computeDriftVelocity(lat3, lon3, env, new Date(curTime.getTime() + sign * (dtSec * 500)));
    const k3_lat = sign * (v3.v_total / mPerDegLat) * dtSec;
    const k3_lon = sign * (v3.u_total / mPerDegLon) * dtSec;

    // RK4 Step 4: k4
    const lat4 = curLat + k3_lat;
    const lon4 = curLon + k3_lon;
    const v4 = computeDriftVelocity(lat4, lon4, env, new Date(curTime.getTime() + sign * (dtSec * 1000)));
    const k4_lat = sign * (v4.v_total / mPerDegLat) * dtSec;
    const k4_lon = sign * (v4.u_total / mPerDegLon) * dtSec;

    // Weighted average
    const dLat = (k1_lat + 2 * k2_lat + 2 * k3_lat + k4_lat) / 6;
    const dLon = (k1_lon + 2 * k2_lon + 2 * k3_lon + k4_lon) / 6;

    curLat += dLat;
    curLon += dLon;
    curTime = new Date(curTime.getTime() + sign * dtSec * 1000);

    // Uncertainty grows as square root of time elapsed (diffusion + turbulent dispersion)
    const hoursElapsed = (i * timeStepMinutes) / 60;
    const spreadNm = parseFloat((0.25 + 0.18 * Math.sqrt(hoursElapsed)).toFixed(2));
    const majorAxis = parseFloat((spreadNm * 1.8).toFixed(2));
    const minorAxis = parseFloat((spreadNm * 0.9).toFixed(2));

    // Calculate drift angle for ellipse rotation
    const rotDeg = Math.round(((Math.atan2(dLon, dLat) * 180) / Math.PI + 360) % 360);

    points.push({
      timestamp: curTime.toISOString(),
      lat: parseFloat(curLat.toFixed(5)),
      lon: parseFloat(curLon.toFixed(5)),
      uncertainty: {
        stdDev: spreadNm,
        ellipse: {
          majorAxis,
          minorAxis,
          rotation: rotDeg,
        },
      },
    });
  }

  return points;
}

/**
 * Sensitivity Analysis: Measures relative contributions of Current, Wind, and Stokes drift
 */
export function calculateSensitivity(env: EnvironmentalDataConfig = {}): {
  currentImpact: number;
  windImpact: number;
  stokesImpact: number;
  primaryDriver: string;
} {
  const v = computeDriftVelocity(20.0, 70.0, env, new Date());
  const magCurr = Math.sqrt(v.u_curr * v.u_curr + v.v_curr * v.v_curr);
  const magWind = Math.sqrt(v.u_wind * v.u_wind + v.v_wind * v.v_wind);
  const magStokes = Math.sqrt(v.u_stokes * v.u_stokes + v.v_stokes * v.v_stokes);

  const totalMag = Math.max(0.001, magCurr + magWind + magStokes);
  const currentImpact = Math.round((magCurr / totalMag) * 100);
  const windImpact = Math.round((magWind / totalMag) * 100);
  const stokesImpact = Math.max(0, 100 - currentImpact - windImpact);

  let primaryDriver = "Ocean Surface Currents";
  if (windImpact >= currentImpact && windImpact >= stokesImpact) {
    primaryDriver = "Wind-Driven Ekman Transport";
  } else if (stokesImpact >= currentImpact && stokesImpact >= windImpact) {
    primaryDriver = "Wave Stokes Drift";
  }

  return { currentImpact, windImpact, stokesImpact, primaryDriver };
}

/**
 * Forward Drift Modeling
 */
export async function forwardDrift(
  origin: { lat: number; lon: number; timestamp?: string | Date },
  hoursAhead: number = 72,
  env: EnvironmentalDataConfig = {}
): Promise<DriftTrajectory> {
  const startDate = origin.timestamp ? new Date(origin.timestamp) : new Date();
  const points = solveRK4(origin.lat, origin.lon, startDate, hoursAhead, "forward", env);

  const first = points[0];
  const last = points[points.length - 1];

  const dLatNm = (last.lat - first.lat) * 60;
  const dLonNm = (last.lon - first.lon) * 60 * Math.cos((origin.lat * Math.PI) / 180);
  const distanceNm = parseFloat(Math.sqrt(dLatNm * dLatNm + dLonNm * dLonNm).toFixed(2));
  const direction = Math.round(((Math.atan2(dLonNm, dLatNm) * 180) / Math.PI + 360) % 360);

  const sensitivity = calculateSensitivity(env);
  const dominantDriver =
    sensitivity.currentImpact >= sensitivity.windImpact ? "current" : "wind";

  return {
    points,
    totalDrift: { distanceNm, direction },
    dominantDriver,
    sensitivity,
  };
}

/**
 * Backward Drift Modeling (Ray tracing to point-of-origin)
 */
export async function backwardDrift(
  detection: { lat: number; lon: number; timestamp?: string | Date },
  hoursBack: number = 48,
  env: EnvironmentalDataConfig = {}
): Promise<{ trajectory: DriftTrajectory; backwardPoints: BackwardDriftPoint[] }> {
  const startDate = detection.timestamp ? new Date(detection.timestamp) : new Date();
  const points = solveRK4(detection.lat, detection.lon, startDate, hoursBack, "backward", env);

  const first = points[0];
  const last = points[points.length - 1];

  const dLatNm = (last.lat - first.lat) * 60;
  const dLonNm = (last.lon - first.lon) * 60 * Math.cos((detection.lat * Math.PI) / 180);
  const distanceNm = parseFloat(Math.sqrt(dLatNm * dLatNm + dLonNm * dLonNm).toFixed(2));
  const direction = Math.round(((Math.atan2(dLonNm, dLatNm) * 180) / Math.PI + 360) % 360);

  const sensitivity = calculateSensitivity(env);
  const dominantDriver =
    sensitivity.currentImpact >= sensitivity.windImpact ? "current" : "wind";

  const backwardPoints: BackwardDriftPoint[] = points.map((p, idx) => ({
    time_hours_ago: idx,
    lat: p.lat,
    lon: p.lon,
    timestamp: p.timestamp,
    uncertainty_nm: p.uncertainty.stdDev,
  }));

  return {
    trajectory: {
      points,
      totalDrift: { distanceNm, direction },
      dominantDriver,
      sensitivity,
    },
    backwardPoints,
  };
}
