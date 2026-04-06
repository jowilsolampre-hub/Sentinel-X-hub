// JOYRIDE PRO PACK - Core Evaluation Engine

import { JoyrideConfig, JoyrideSignal, JoyridePresetId, JoyrideLog } from "./types";
import { getPreset } from "./presets";
import { rankPairs } from "./pairRanker";
import { getSessionInfo } from "./sessionEngine";
import { checkRiskGuard } from "./riskGuard";

// In-memory log store
const joyrideLogStore: JoyrideLog[] = [];

export const getJoyrideLogs = (): JoyrideLog[] => [...joyrideLogStore];
export const clearJoyrideLogs = () => { joyrideLogStore.length = 0; };

export interface ChartState {
  pair?: string;
  timeframe?: string;
  trendDirection?: "up" | "down" | "range" | "chop";
  candleStrength?: number;
  bodyWickRatio?: number;
  volatility?: number;
  rsiValue?: number;
  emaAlignment?: "bullish" | "bearish" | "mixed";
  macdSignal?: "bullish" | "bearish" | "neutral";
  bollingerPosition?: "upper" | "middle" | "lower" | "squeeze";
  patternDetected?: string;
  recentLosses?: number;
  signalsThisSession?: number;
  aiAnalysis?: {
    direction?: string;
    confidence?: number;
    reasons?: string[];
    pattern?: string;
    indicators?: string[];
  };
}

function evaluatePreset(presetId: JoyridePresetId, chart: ChartState, config: JoyrideConfig): JoyrideSignal {
  const preset = getPreset(presetId);
  const session = getSessionInfo();
  let score = 0;
  const reasons: string[] = [];
  const avoidIf: string[] = [];
  const invalidation: string[] = [];
  const setupChecklist: string[] = [];

  // --- AI analysis integration ---
  if (chart.aiAnalysis) {
    const ai = chart.aiAnalysis;
    if (ai.confidence && ai.confidence > 60) {
      score += Math.min(25, Math.round(ai.confidence * 0.3));
      reasons.push(`AI analysis: ${ai.direction} (${ai.confidence}% confidence)`);
    }
    if (ai.pattern) {
      score += 10;
      reasons.push(`AI detected pattern: ${ai.pattern}`);
    }
    if (ai.reasons) {
      ai.reasons.slice(0, 2).forEach(r => reasons.push(`AI: ${r}`));
    }
  }

  // --- Trend alignment ---
  if (chart.trendDirection === "up" || chart.trendDirection === "down") {
    score += 20;
    reasons.push(`Clear ${chart.trendDirection}trend detected`);
  } else if (chart.trendDirection === "range") {
    score += 5;
    reasons.push("Range-bound market — reduced confidence");
  } else if (chart.trendDirection === "chop") {
    score -= 15;
    avoidIf.push("Choppy market detected — high risk of false signals");
  }

  // --- EMA alignment ---
  if (chart.emaAlignment === "bullish" || chart.emaAlignment === "bearish") {
    score += 15;
    reasons.push(`EMA stack ${chart.emaAlignment}`);
  }

  // --- RSI ---
  if (chart.rsiValue !== undefined) {
    if (chart.rsiValue > 30 && chart.rsiValue < 70) {
      score += 10;
      reasons.push(`RSI at ${chart.rsiValue} — within tradeable range`);
    } else {
      avoidIf.push(`RSI extreme at ${chart.rsiValue}`);
      score -= 5;
    }
  }

  // --- MACD ---
  if (chart.macdSignal === "bullish" || chart.macdSignal === "bearish") {
    score += 10;
    reasons.push(`MACD ${chart.macdSignal} momentum`);
  }

  // --- Bollinger ---
  if (chart.bollingerPosition === "squeeze") {
    score += 5;
    reasons.push("Bollinger squeeze — breakout potential");
  }

  // --- Candle strength ---
  if (chart.candleStrength && chart.candleStrength > 0.6) {
    score += 10;
    reasons.push("Strong candle body confirmation");
  }

  // --- Body-to-wick ratio ---
  if (chart.bodyWickRatio && chart.bodyWickRatio > 1.5) {
    score += 5;
    reasons.push("Good body-to-wick ratio");
  } else if (chart.bodyWickRatio && chart.bodyWickRatio < 0.5) {
    avoidIf.push("Wick-heavy candles — indecision");
    score -= 10;
  }

  // --- Volatility ---
  if (chart.volatility !== undefined) {
    if (chart.volatility > 0.3 && chart.volatility < 0.8) {
      score += 10;
      reasons.push("Adequate volatility");
    } else if (chart.volatility >= 0.8) {
      avoidIf.push("Extreme volatility — risky");
      score -= 5;
    } else {
      avoidIf.push("Low volatility — weak moves expected");
      score -= 5;
    }
  }

  // --- Pattern ---
  if (chart.patternDetected) {
    score += 10;
    reasons.push(`Pattern: ${chart.patternDetected}`);
  }

  // --- Session suitability ---
  let sessionScore = 50;
  if (config.sessionAware) {
    const sessionFit = preset.sessionProfile.includes(session.name);
    if (sessionFit) {
      score += 10;
      sessionScore = 80;
      reasons.push(`Active session: ${session.name}`);
    } else {
      score -= 10;
      sessionScore = 30;
      avoidIf.push(`${session.name} session not ideal for this preset`);
    }
    if (session.isOverlap) {
      score += 5;
      sessionScore += 10;
    }
  }

  // --- Aggressiveness modifiers ---
  if (config.aggressiveness === "Safe") {
    score -= 10; // Harder to trigger
  } else if (config.aggressiveness === "High") {
    score += 10; // Easier to trigger
  }

  // --- Strict filter ---
  if (config.strictFilter) {
    score -= 5;
  }

  // --- Safe Mode preset overrides ---
  if (presetId === "SAFE_MODE") {
    score -= 10; // Extra conservative
    if (chart.trendDirection === "chop" || chart.trendDirection === "range") {
      score -= 20;
      avoidIf.push("Safe Mode blocks range/chop markets");
    }
  }

  // Clamp
  const confidence = Math.max(0, Math.min(100, score));

  // Direction
  let direction: "CALL" | "PUT" | "NO_TRADE" = "NO_TRADE";
  if (confidence >= config.confidenceThreshold) {
    if (chart.aiAnalysis?.direction) {
      const d = chart.aiAnalysis.direction.toUpperCase();
      direction = d.includes("BUY") || d.includes("CALL") || d.includes("UP") ? "CALL" : "PUT";
    } else if (chart.trendDirection === "up" || chart.emaAlignment === "bullish") {
      direction = "CALL";
    } else if (chart.trendDirection === "down" || chart.emaAlignment === "bearish") {
      direction = "PUT";
    }
  }

  // Invalidation rules
  invalidation.push("Structure breaks opposite to signal direction");
  invalidation.push("RSI diverges sharply after entry");
  invalidation.push("Price reverses through EMA stack");

  // Setup checklist
  preset.indicators.forEach(ind => {
    const setting = ind.period ? `(${ind.period})` : ind.fast ? `(${ind.fast},${ind.slow},${ind.signal})` : "";
    setupChecklist.push(`Enable ${ind.name} ${setting}`);
  });
  setupChecklist.push(`Set timeframe to ${preset.defaultTimeframe}`);
  setupChecklist.push(`Set expiry to ${preset.defaultExpiry}`);

  const signal: JoyrideSignal = {
    preset: preset.label,
    pair: chart.pair || "Unknown",
    timeframe: preset.defaultTimeframe,
    expiry: preset.defaultExpiry,
    direction,
    confidence,
    reasons: reasons.slice(0, 5),
    avoidIf: avoidIf.slice(0, 3),
    entryWindowSeconds: presetId === "TURBO_10S" ? 5 : 8,
    patternLabel: chart.patternDetected || chart.aiAnalysis?.pattern || "None detected",
    sessionSuitability: Math.min(100, sessionScore),
    invalidation,
    setupChecklist,
  };

  // Log
  joyrideLogStore.push({
    timestamp: new Date().toISOString(),
    preset: presetId,
    pair: signal.pair,
    timeframe: signal.timeframe,
    direction: signal.direction,
    confidence: signal.confidence,
    reasons: signal.reasons,
    noTradeReasons: direction === "NO_TRADE" ? avoidIf : [],
  });

  // Keep log bounded
  if (joyrideLogStore.length > 200) joyrideLogStore.splice(0, 50);

  return signal;
}

export function joyrideEvaluate(chart: ChartState, config: JoyrideConfig): JoyrideSignal | null {
  if (!config.enabled) return null;

  // Risk guard check
  const riskCheck = checkRiskGuard(chart, config);
  if (riskCheck.blocked) {
    const noTradeSignal: JoyrideSignal = {
      preset: getPreset(config.selectedPreset).label,
      pair: chart.pair || "Unknown",
      timeframe: getPreset(config.selectedPreset).defaultTimeframe,
      expiry: getPreset(config.selectedPreset).defaultExpiry,
      direction: "NO_TRADE",
      confidence: 0,
      reasons: [],
      avoidIf: [riskCheck.reason],
      entryWindowSeconds: 0,
      patternLabel: "Blocked by risk guard",
      sessionSuitability: 0,
      invalidation: [],
      setupChecklist: [],
    };
    return noTradeSignal;
  }

  return evaluatePreset(config.selectedPreset, chart, config);
}

export function joyridePairRanking(pairs: string[], chart: Partial<ChartState>) {
  return rankPairs(pairs, chart);
}
