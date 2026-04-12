// JOYRIDE PRO PACK - Rolling Frame Analysis

import { MEMORY_STORE } from "./memoryEngine";

export interface RollingAnalysis {
  rollingStatus: string;
  rollingBias: string;
  trendConsistency: number;
  avgConfidenceContext: number;
  recentRegimes: string[];
  message: string;
}

export function buildRollingAnalysis(pair: string, timeframe: string): RollingAnalysis {
  const frames = MEMORY_STORE.recentWindow(pair, timeframe, 8);

  if (frames.length === 0) {
    return {
      rollingStatus: "empty",
      rollingBias: "unknown",
      trendConsistency: 0,
      avgConfidenceContext: 0,
      recentRegimes: [],
      message: "No rolling memory available.",
    };
  }

  const recentRegimes = frames.map(f => f.trendState);
  const upCount = frames.filter(f => f.trendState === "up").length;
  const downCount = frames.filter(f => f.trendState === "down").length;
  const rangeCount = frames.filter(f => f.trendState === "range").length;

  let rollingBias: string;
  if (upCount > downCount && upCount > rangeCount) {
    rollingBias = "bullish";
  } else if (downCount > upCount && downCount > rangeCount) {
    rollingBias = "bearish";
  } else {
    rollingBias = "mixed";
  }

  const trendConsistency = Math.round((Math.max(upCount, downCount, rangeCount) / frames.length) * 100);
  const avgStruct = frames.reduce((s, f) => s + f.structureClarity, 0) / frames.length;
  const avgVol = frames.reduce((s, f) => s + f.volatilityScore, 0) / frames.length;

  return {
    rollingStatus: "ok",
    rollingBias,
    trendConsistency,
    avgConfidenceContext: Math.round((avgStruct + avgVol) / 2),
    recentRegimes,
    message: `Rolling market bias is ${rollingBias} with ${trendConsistency}% consistency.`,
  };
}
