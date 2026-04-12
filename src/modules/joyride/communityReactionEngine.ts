// JOYRIDE PRO PACK - Community Reaction Engine
// Estimates crowd behavior based on market conditions

import { PredictionInfo } from "./predictionEngine";
import { MarketShift } from "./marketShiftEngine";

export interface CommunityReaction {
  crowdChasingMove: boolean;
  panicPulloutRisk: boolean;
  lateEntryTrapRisk: boolean;
  liquidityGrabRisk: boolean;
  dominantReaction: string;
  reactionSummary: string;
}

export function estimateCommunityReaction(
  state: {
    volatility?: number;
    candleStrength?: number;
    bodyWickRatio?: number;
    rsiValue?: number;
    marketType?: string;
  },
  prediction: PredictionInfo,
  shift: MarketShift
): CommunityReaction {
  const vol = (state.volatility ?? 0.5) * 100;
  const struct = (state.candleStrength ?? 0.5) * 100;
  const fbr = state.bodyWickRatio ? Math.max(0, 100 - state.bodyWickRatio * 40) : 50;
  const exhaustion = state.rsiValue ? (state.rsiValue > 70 || state.rsiValue < 30 ? 70 : 30) : 40;

  const crowdChasing = vol >= 65 && struct >= 58;
  const panicPulloutRisk = exhaustion >= 60 || prediction.pullbackProbability >= 65;
  const lateEntryTrapRisk = fbr >= 55 || shift.shiftType === "clean_to_fakeout_risk";
  const liquidityGrabRisk = state.marketType === "otc" && fbr >= 52;

  let dominant: string;
  let summary: string;

  if (crowdChasing && !panicPulloutRisk) {
    dominant = "momentum_follow_through_possible";
    summary = "Momentum traders may chase the move.";
  } else if (panicPulloutRisk) {
    dominant = "profit_taking_or_pullout_risk";
    summary = "Profit-taking or pullout behaviour may increase.";
  } else if (liquidityGrabRisk) {
    dominant = "liquidity_grab_likely";
    summary = "Liquidity-grab behaviour is possible.";
  } else {
    dominant = "mixed_participation";
    summary = "Participation looks mixed and less decisive.";
  }

  return {
    crowdChasingMove: crowdChasing,
    panicPulloutRisk,
    lateEntryTrapRisk,
    liquidityGrabRisk,
    dominantReaction: dominant,
    reactionSummary: summary,
  };
}
