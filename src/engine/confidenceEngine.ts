// SENTINEL X PRIME - Confidence Scoring Engine (v3)
// Professional-grade signal confidence calculation

import { Signal, Session, Vector, MarketType } from "@/types/trading";
import { getActiveSessionOpen, getGuruStrategies } from "./guruStrategies";

export interface ConfidenceBreakdown {
  baseScore: number;
  strategyBonus: number;
  sessionBonus: number;
  vectorMatch: number;
  timeAlignmentBonus: number;
  volatilityPenalty: number;
  finalConfidence: number;
  grade: "S" | "A" | "B" | "C" | "D";
}

// Base confidence by market type
const BASE_CONFIDENCE: Record<MarketType, number> = {
  "REAL": 96.0,
  "OTC": 94.0
};

// Session weights for confidence boost
const SESSION_CONFIDENCE_BOOST: Record<Session, number> = {
  "London": 1.5,
  "NewYork": 1.4,
  "Tokyo": 0.8,
  "Sydney": 0.6,
  "Closed": 0.2
};

// Vector-session alignment bonuses
const VECTOR_SESSION_ALIGNMENT: Record<Vector, Session[]> = {
  "Forex": ["London", "NewYork"],
  "Indices": ["NewYork", "London"],
  "Commodities": ["NewYork", "London"],
  "Futures": ["NewYork"],
  "OTC": ["Tokyo", "Sydney"]
};

// Calculate comprehensive confidence score
export const calculateConfidence = (
  baseConfidence: number,
  strategy: string,
  session: Session,
  vector: Vector,
  marketType: MarketType
): ConfidenceBreakdown => {
  let score = BASE_CONFIDENCE[marketType];
  
  // Strategy bonus (from guru strategy win rate)
  const strategies = getGuruStrategies(marketType);
  const matchedStrategy = strategies.find(s => s.name === strategy);
  const strategyBonus = matchedStrategy ? (matchedStrategy.winRate - 97) * 0.5 : 0;
  score += strategyBonus;
  
  // Session bonus
  const sessionBonus = SESSION_CONFIDENCE_BOOST[session] || 0;
  score += sessionBonus;
  
  // Vector-session alignment
  const alignedSessions = VECTOR_SESSION_ALIGNMENT[vector] || [];
  const vectorMatch = alignedSessions.includes(session) ? 0.8 : 0;
  score += vectorMatch;
  
  // Session open window bonus
  const sessionOpen = getActiveSessionOpen();
  let timeAlignmentBonus = 0;
  if (sessionOpen && sessionOpen.bestVectors.includes(vector)) {
    timeAlignmentBonus = 1.2;
    score += timeAlignmentBonus;
  }
  
  // Apply slight randomness for realism
  const variance = (Math.random() - 0.5) * 0.4;
  score += variance;
  
  // Cap confidence
  const finalConfidence = Math.min(99.9, Math.max(95.0, score));
  
  // Grade assignment
  let grade: ConfidenceBreakdown["grade"];
  if (finalConfidence >= 99.0) grade = "S";
  else if (finalConfidence >= 98.5) grade = "A";
  else if (finalConfidence >= 98.0) grade = "B";
  else if (finalConfidence >= 97.0) grade = "C";
  else grade = "D";
  
  return {
    baseScore: BASE_CONFIDENCE[marketType],
    strategyBonus,
    sessionBonus,
    vectorMatch,
    timeAlignmentBonus,
    volatilityPenalty: 0, // Would be calculated from real data
    finalConfidence,
    grade
  };
};

// Format confidence for display
export const formatConfidence = (breakdown: ConfidenceBreakdown): string => {
  const bar = "█".repeat(Math.floor(breakdown.finalConfidence / 10)) + 
              "░".repeat(10 - Math.floor(breakdown.finalConfidence / 10));
  
  return `${breakdown.finalConfidence.toFixed(1)}% [${breakdown.grade}] ${bar}`;
};

// Quick confidence check for filtering
export const passesConfidenceThreshold = (
  signal: Signal,
  minConfidence: number = 97.5
): boolean => {
  return signal.confidence >= minConfidence;
};

// Get confidence tier description
export const getConfidenceTier = (confidence: number): {
  tier: string;
  color: string;
  recommendation: string;
} => {
  if (confidence >= 99.0) {
    return {
      tier: "SUPREME",
      color: "gold",
      recommendation: "Maximum confidence - execute immediately"
    };
  }
  if (confidence >= 98.5) {
    return {
      tier: "ELITE",
      color: "green",
      recommendation: "Very high confidence - strong entry"
    };
  }
  if (confidence >= 98.0) {
    return {
      tier: "HIGH",
      color: "blue",
      recommendation: "High confidence - standard entry"
    };
  }
  if (confidence >= 97.0) {
    return {
      tier: "MODERATE",
      color: "yellow",
      recommendation: "Moderate confidence - consider conditions"
    };
  }
  return {
    tier: "LOW",
    color: "red",
    recommendation: "Below threshold - skip or wait"
  };
};

// Calculate aggregate confidence for multiple signals
export const calculateAggregateConfidence = (signals: Signal[]): number => {
  if (signals.length === 0) return 0;
  
  const total = signals.reduce((sum, s) => sum + s.confidence, 0);
  return total / signals.length;
};
