// JOYRIDE PRO PACK - Prediction Engine
// Estimates next-candle bias and continuation/reversal/pullback probabilities

import { MemoryFrame } from "./memoryEngine";

export interface PredictionInfo {
  predictionStatus: string;
  nextCandleBias: string;
  continuationProbability: number;
  reversalProbability: number;
  pullbackProbability: number;
  predictionReason: string;
}

export function predictNextMove(
  frames: MemoryFrame[],
  currentState: { marketType?: string }
): PredictionInfo {
  if (frames.length === 0) {
    return {
      predictionStatus: "insufficient_memory",
      nextCandleBias: "unknown",
      continuationProbability: 50,
      reversalProbability: 50,
      pullbackProbability: 50,
      predictionReason: "No memory available.",
    };
  }

  const latest = frames[frames.length - 1];
  const recent = frames.slice(-5);

  const avgStruct = recent.reduce((s, f) => s + f.structureClarity, 0) / recent.length;
  const avgFBR = recent.reduce((s, f) => s + f.falseBreakRisk, 0) / recent.length;
  const avgExhaustion = recent.reduce((s, f) => s + f.exhaustionRisk, 0) / recent.length;
  const avgLag = recent.reduce((s, f) => s + f.refreshDelayMs, 0) / recent.length;

  let continuation = 50;
  let reversal = 50;
  let pullback = 50;
  let nextCandleBias = "neutral";
  const reasons: string[] = [];

  if (latest.trendState === "up") {
    continuation += 12;
    reasons.push("Recent trend state is bullish.");
  } else if (latest.trendState === "down") {
    continuation += 12;
    reasons.push("Recent trend state is bearish.");
  }

  if (avgStruct >= 60) {
    continuation += 10;
    reasons.push("Structure clarity supports continuation.");
  } else {
    reversal += 8;
    reasons.push("Weak structure raises reversal risk.");
  }

  if (avgFBR > 55) {
    reversal += 10;
    pullback += 8;
    continuation -= 8;
    reasons.push("False-break risk is elevated.");
  }

  if (avgExhaustion > 55) {
    pullback += 15;
    reversal += 10;
    continuation -= 10;
    reasons.push("Exhaustion risk is elevated.");
  }

  if (avgLag > 800) {
    continuation -= 10;
    reversal += 5;
    pullback += 5;
    reasons.push("Lag reduces confidence in continuation reads.");
  }

  if (currentState.marketType === "otc") {
    continuation -= 5;
    reversal += 5;
    reasons.push("OTC mode adds synthetic noise.");
  }

  if (latest.trendState === "up") {
    nextCandleBias = avgExhaustion > 65 ? "bullish_pullback_risk" : "bullish_continuation";
  } else if (latest.trendState === "down") {
    nextCandleBias = avgExhaustion > 65 ? "bearish_pullback_risk" : "bearish_continuation";
  } else {
    nextCandleBias = "neutral_or_breakout_watch";
  }

  return {
    predictionStatus: "ok",
    nextCandleBias,
    continuationProbability: Math.max(0, Math.min(100, Math.round(continuation))),
    reversalProbability: Math.max(0, Math.min(100, Math.round(reversal))),
    pullbackProbability: Math.max(0, Math.min(100, Math.round(pullback))),
    predictionReason: reasons.slice(0, 4).join(" ") || "Mixed market signals.",
  };
}
