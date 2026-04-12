// JOYRIDE PRO PACK - Memory Orchestrator
// Ties memory, shift, prediction, and community reaction together

import { MEMORY_STORE, buildMemoryFrame } from "./memoryEngine";
import { detectMarketShift, MarketShift } from "./marketShiftEngine";
import { predictNextMove, PredictionInfo } from "./predictionEngine";
import { estimateCommunityReaction, CommunityReaction } from "./communityReactionEngine";
import { buildRollingAnalysis, RollingAnalysis } from "./rollingAnalysis";
import { ChartState } from "./engine";

export interface MemoryEnrichedState {
  marketShift: MarketShift;
  prediction: PredictionInfo;
  communityReaction: CommunityReaction;
  rollingAnalysis: RollingAnalysis;
}

export function enrichWithMemory(chart: ChartState): MemoryEnrichedState {
  const pair = chart.pair || "UNKNOWN";
  const timeframe = chart.timeframe || "1m";

  const framesBefore = MEMORY_STORE.recentWindow(pair, timeframe, 5);
  const shift = detectMarketShift(framesBefore);
  const prediction = predictNextMove(framesBefore, { marketType: chart.marketType });
  const reaction = estimateCommunityReaction(chart, prediction, shift);
  const rolling = buildRollingAnalysis(pair, timeframe);

  return {
    marketShift: shift,
    prediction,
    communityReaction: reaction,
    rollingAnalysis: rolling,
  };
}

export function commitMemory(
  chart: ChartState,
  preset?: string | null,
  direction?: string | null,
  confidence?: number | null
): void {
  const frame = buildMemoryFrame(
    {
      pair: chart.pair,
      timeframe: chart.timeframe,
      session: chart.session,
      marketType: chart.marketType,
      trendDirection: chart.trendDirection,
      volatility: chart.volatility,
      candleStrength: chart.candleStrength,
      bodyWickRatio: chart.bodyWickRatio,
      rsiValue: chart.rsiValue,
    },
    preset,
    direction,
    confidence
  );
  MEMORY_STORE.addFrame(frame);
}

export function getMemoryStats(): { totalFrames: number } {
  return { totalFrames: MEMORY_STORE.totalFrames };
}
