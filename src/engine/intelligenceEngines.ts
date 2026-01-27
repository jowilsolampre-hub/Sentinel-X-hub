// SENTINEL X - Intelligence Engines (Modular Architecture)
// Named engines: Bias, Volatility, Session, Confidence, Confluence
// Institutional-grade decision framework

import { Vector, MarketType, Session, Timeframe, Direction } from "@/types/trading";
import { detectActiveSession } from "./sessionLock";

// ============= BIAS ENGINE =============
// Determines directional context from higher timeframes

export interface BiasResult {
  direction: Direction | "NEUTRAL";
  strength: number; // 0-100
  htfTrend: "BULLISH" | "BEARISH" | "RANGING";
  confidence: number;
  timeframe: Timeframe;
}

export const analyzeBias = (
  htfCandles: { open: number; close: number; high: number; low: number }[],
  timeframe: Timeframe
): BiasResult => {
  if (htfCandles.length < 3) {
    return { direction: "NEUTRAL", strength: 0, htfTrend: "RANGING", confidence: 50, timeframe };
  }

  const recentCandles = htfCandles.slice(-10);
  const bullishCandles = recentCandles.filter(c => c.close > c.open).length;
  const bearishCandles = recentCandles.filter(c => c.close < c.open).length;
  
  // Check for higher highs / higher lows (bullish) or lower highs / lower lows (bearish)
  let higherHighs = 0;
  let higherLows = 0;
  let lowerHighs = 0;
  let lowerLows = 0;
  
  for (let i = 1; i < recentCandles.length; i++) {
    if (recentCandles[i].high > recentCandles[i - 1].high) higherHighs++;
    if (recentCandles[i].low > recentCandles[i - 1].low) higherLows++;
    if (recentCandles[i].high < recentCandles[i - 1].high) lowerHighs++;
    if (recentCandles[i].low < recentCandles[i - 1].low) lowerLows++;
  }
  
  const bullishScore = higherHighs + higherLows + bullishCandles;
  const bearishScore = lowerHighs + lowerLows + bearishCandles;
  
  let direction: Direction | "NEUTRAL" = "NEUTRAL";
  let htfTrend: "BULLISH" | "BEARISH" | "RANGING" = "RANGING";
  let strength = 0;
  
  if (bullishScore > bearishScore + 3) {
    direction = "BUY";
    htfTrend = "BULLISH";
    strength = Math.min(100, 50 + (bullishScore - bearishScore) * 5);
  } else if (bearishScore > bullishScore + 3) {
    direction = "SELL";
    htfTrend = "BEARISH";
    strength = Math.min(100, 50 + (bearishScore - bullishScore) * 5);
  } else {
    strength = 30 + Math.random() * 20;
  }
  
  return {
    direction,
    strength,
    htfTrend,
    confidence: 50 + strength * 0.4,
    timeframe
  };
};

// ============= VOLATILITY ENGINE =============
// Filters market regime and identifies optimal trading conditions

export type VolatilityRegime = "LOW" | "NORMAL" | "HIGH" | "EXTREME";

export interface VolatilityResult {
  regime: VolatilityRegime;
  atr: number;
  atrPercent: number;
  isOptimal: boolean;
  tradingAdvice: string;
}

export const analyzeVolatility = (
  candles: { high: number; low: number; close: number }[],
  asset: string
): VolatilityResult => {
  if (candles.length < 14) {
    return {
      regime: "NORMAL",
      atr: 0,
      atrPercent: 0,
      isOptimal: true,
      tradingAdvice: "Insufficient data for volatility analysis"
    };
  }

  // Calculate ATR
  let tr = 0;
  for (let i = 1; i < Math.min(candles.length, 14); i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    const trueRange = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    tr += trueRange;
  }
  const atr = tr / 14;
  const currentPrice = candles[candles.length - 1].close;
  const atrPercent = (atr / currentPrice) * 100;

  // Determine regime based on asset type
  const isForex = asset.includes("/") && !asset.includes("XAU");
  const isGold = asset.includes("XAU") || asset.includes("Gold");
  
  let regime: VolatilityRegime = "NORMAL";
  let isOptimal = true;
  let tradingAdvice = "Normal conditions - proceed with standard risk";

  if (isForex) {
    if (atrPercent < 0.05) {
      regime = "LOW";
      isOptimal = false;
      tradingAdvice = "Very low volatility - avoid breakout strategies";
    } else if (atrPercent > 0.3) {
      regime = "EXTREME";
      isOptimal = false;
      tradingAdvice = "Extreme volatility - reduce position size or wait";
    } else if (atrPercent > 0.15) {
      regime = "HIGH";
      tradingAdvice = "High volatility - use wider stops";
    }
  } else if (isGold) {
    if (atrPercent < 0.3) {
      regime = "LOW";
    } else if (atrPercent > 2) {
      regime = "EXTREME";
      isOptimal = false;
      tradingAdvice = "Gold volatility extreme - wait for consolidation";
    } else if (atrPercent > 1) {
      regime = "HIGH";
    }
  }

  return { regime, atr, atrPercent, isOptimal, tradingAdvice };
};

// ============= SESSION ENGINE =============
// Time-of-day as an indicator with session-specific logic

export interface SessionResult {
  currentSession: Session;
  isSessionOpen: boolean;
  sessionOpenMinutes: number;
  optimalTrading: boolean;
  sessionStrength: number; // 0-100
  bestVectors: Vector[];
  advice: string;
}

export const analyzeSession = (): SessionResult => {
  const session = detectActiveSession();
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  
  // Session open detection (first 30 minutes)
  const sessionOpens: Record<Session, number> = {
    London: 7,
    NewYork: 12,
    Tokyo: 0,
    Sydney: 22,
    Closed: -1
  };
  
  let isSessionOpen = false;
  let sessionOpenMinutes = 0;
  
  if (session !== "Closed") {
    const openHour = sessionOpens[session];
    if (hour === openHour && minute < 30) {
      isSessionOpen = true;
      sessionOpenMinutes = minute;
    }
  }

  // Session strength scoring
  let sessionStrength = 50;
  let bestVectors: Vector[] = [];
  let advice = "";
  
  switch (session) {
    case "London":
      sessionStrength = 85;
      bestVectors = ["Forex", "Commodities", "Indices"];
      advice = isSessionOpen 
        ? "London Open - MAXIMUM liquidity window!" 
        : "London session - excellent Forex conditions";
      break;
    case "NewYork":
      sessionStrength = 80;
      bestVectors = ["Indices", "Forex", "Futures"];
      advice = isSessionOpen 
        ? "NY Open - Stock indices momentum!" 
        : "New York session - strong US market activity";
      break;
    case "Tokyo":
      sessionStrength = 65;
      bestVectors = ["Forex", "OTC"];
      advice = isSessionOpen 
        ? "Tokyo Open - JPY pairs active" 
        : "Asian session - moderate volatility";
      break;
    case "Sydney":
      sessionStrength = 55;
      bestVectors = ["OTC", "Forex"];
      advice = "Sydney session - OTC favorable, lower real market activity";
      break;
    case "Closed":
      sessionStrength = 30;
      bestVectors = ["OTC"];
      advice = "Off-hours - OTC only recommended";
      break;
  }

  return {
    currentSession: session,
    isSessionOpen,
    sessionOpenMinutes,
    optimalTrading: sessionStrength >= 65,
    sessionStrength,
    bestVectors,
    advice
  };
};

// ============= CONFIDENCE ENGINE =============
// Signal strength scoring based on multiple factors

export interface ConfidenceInput {
  biasStrength: number;
  volatilityOptimal: boolean;
  sessionStrength: number;
  strategyWinRate: number;
  confluenceScore: number;
  isSessionOpen: boolean;
}

export interface ConfidenceResult {
  finalConfidence: number;
  grade: "A+" | "A" | "B" | "C" | "D" | "F";
  breakdown: {
    bias: number;
    volatility: number;
    session: number;
    strategy: number;
    confluence: number;
  };
  recommendation: "STRONG_TRADE" | "TRADE" | "CAUTION" | "SKIP";
}

export const calculateFinalConfidence = (input: ConfidenceInput): ConfidenceResult => {
  // Weight each factor
  const weights = {
    bias: 0.2,
    volatility: 0.15,
    session: 0.2,
    strategy: 0.25,
    confluence: 0.2
  };

  const breakdown = {
    bias: input.biasStrength,
    volatility: input.volatilityOptimal ? 90 : 50,
    session: input.sessionStrength + (input.isSessionOpen ? 10 : 0),
    strategy: input.strategyWinRate,
    confluence: input.confluenceScore
  };

  const finalConfidence = 
    breakdown.bias * weights.bias +
    breakdown.volatility * weights.volatility +
    breakdown.session * weights.session +
    breakdown.strategy * weights.strategy +
    breakdown.confluence * weights.confluence;

  // Determine grade and recommendation
  let grade: ConfidenceResult["grade"] = "F";
  let recommendation: ConfidenceResult["recommendation"] = "SKIP";

  if (finalConfidence >= 95) {
    grade = "A+";
    recommendation = "STRONG_TRADE";
  } else if (finalConfidence >= 90) {
    grade = "A";
    recommendation = "STRONG_TRADE";
  } else if (finalConfidence >= 80) {
    grade = "B";
    recommendation = "TRADE";
  } else if (finalConfidence >= 70) {
    grade = "C";
    recommendation = "CAUTION";
  } else if (finalConfidence >= 60) {
    grade = "D";
    recommendation = "SKIP";
  }

  return { finalConfidence, grade, breakdown, recommendation };
};

// ============= CONFLUENCE ENGINE =============
// Final gatekeeper - combines all factors

export interface ConfluenceInput {
  bias: BiasResult;
  volatility: VolatilityResult;
  session: SessionResult;
  strategyMatch: boolean;
  structureConfirmed: boolean;
  triggerValid: boolean;
}

export interface ConfluenceResult {
  score: number;
  passed: boolean;
  factors: {
    name: string;
    passed: boolean;
    weight: number;
  }[];
  reason: string;
}

export const evaluateConfluence = (input: ConfluenceInput): ConfluenceResult => {
  const factors = [
    {
      name: "HTF Bias Alignment",
      passed: input.bias.direction !== "NEUTRAL" && input.bias.strength >= 60,
      weight: 20
    },
    {
      name: "Volatility Optimal",
      passed: input.volatility.isOptimal,
      weight: 15
    },
    {
      name: "Session Active",
      passed: input.session.optimalTrading,
      weight: 15
    },
    {
      name: "Strategy Match",
      passed: input.strategyMatch,
      weight: 20
    },
    {
      name: "Structure Confirmed",
      passed: input.structureConfirmed,
      weight: 15
    },
    {
      name: "Trigger Valid",
      passed: input.triggerValid,
      weight: 15
    }
  ];

  const score = factors.reduce((sum, f) => sum + (f.passed ? f.weight : 0), 0);
  const passed = score >= 70; // Need 70% confluence to proceed

  const failedFactors = factors.filter(f => !f.passed);
  const reason = passed 
    ? `Confluence achieved (${score}%)`
    : `Confluence failed: ${failedFactors.map(f => f.name).join(", ")}`;

  return { score, passed, factors, reason };
};

// ============= SAFE STATES =============
// Engine states that prevent overtrading

export type EngineState = "ACTIVE" | "IDLE" | "WAIT" | "NO_TRADE" | "COOLDOWN";

export interface SafeStateResult {
  state: EngineState;
  reason: string;
  resumeAt?: Date;
  canTrade: boolean;
}

let currentEngineState: EngineState = "IDLE";
let stateReason = "Engine not started";
let resumeTime: Date | null = null;

export const getEngineState = (): SafeStateResult => {
  return {
    state: currentEngineState,
    reason: stateReason,
    resumeAt: resumeTime || undefined,
    canTrade: currentEngineState === "ACTIVE"
  };
};

export const setEngineState = (
  state: EngineState, 
  reason: string, 
  resumeAfterMs?: number
): void => {
  currentEngineState = state;
  stateReason = reason;
  
  if (resumeAfterMs) {
    resumeTime = new Date(Date.now() + resumeAfterMs);
    setTimeout(() => {
      if (currentEngineState === state) {
        currentEngineState = "ACTIVE";
        stateReason = "Resumed from " + state;
        resumeTime = null;
      }
    }, resumeAfterMs);
  } else {
    resumeTime = null;
  }
  
  console.log(`[SENTINEL X] Engine state: ${state} - ${reason}`);
};

export const activateEngine = (): void => {
  setEngineState("ACTIVE", "Engine activated and scanning");
};

export const pauseEngine = (reason: string, resumeAfterMs?: number): void => {
  setEngineState("WAIT", reason, resumeAfterMs);
};

export const enterNoTrade = (reason: string): void => {
  setEngineState("NO_TRADE", reason);
};

export const enterCooldown = (reason: string, durationMs: number): void => {
  setEngineState("COOLDOWN", reason, durationMs);
};

// ============= TIMEZONE SUPPORT =============
// Africa/Lusaka timezone sync

export const getLusakaTime = (): Date => {
  // Africa/Lusaka is UTC+2
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (2 * 3600000));
};

export const formatLusakaTime = (date: Date): string => {
  const lusaka = new Date(date.getTime() + (2 * 3600000) - (date.getTimezoneOffset() * 60000));
  return lusaka.toLocaleTimeString('en-GB', { 
    hour: '2-digit', 
    minute: '2-digit', 
    second: '2-digit',
    hour12: false 
  });
};
