// JOYRIDE PRO PACK - Preset Selector Engine
// Auto-scores, blocks, and selects the best preset based on live market conditions

import { JoyridePresetId } from "./types";
import { ChartState } from "./engine";
import { getSessionInfo } from "./sessionEngine";

export interface PresetConditionMap {
  bestFor: string[];
  avoidWhen: string[];
  marketTypes: string[];
  allowedTimeframes: string[];
  allowedSessions: string[];
  baseScore: number;
  confidenceBoostConditions: string[];
}

export interface PresetScoreItem {
  presetId: JoyridePresetId;
  presetName: string;
  score: number;
  blocked: boolean;
  reasons: string[];
  penalties: string[];
  blockReasons: string[];
}

export interface PresetSelectorResult {
  selectedPresetId: JoyridePresetId | null;
  selectedPresetName: string | null;
  selectionMode: "auto" | "forced" | "fallback";
  presetScores: PresetScoreItem[];
  blockedPresets: { presetId: string; presetName: string; blockReasons: string[] }[];
  whySelected: string[];
  selectorResult: "SELECTED" | "NO_TRADE" | "FALLBACK_SAFE_MODE";
}

const PRESET_CONDITIONS: Record<JoyridePresetId, PresetConditionMap> = {
  TURBO_10S: {
    bestFor: ["high_volatility", "clean_momentum", "low_lag", "strong_structure"],
    avoidWhen: ["otc_high_lag", "chop", "stale_frame", "high_false_break"],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["10s", "15s", "30s"],
    allowedSessions: ["London", "NewYork", "Overlap"],
    baseScore: 58,
    confidenceBoostConditions: ["session_overlap", "high_structure_clarity"],
  },
  PRECISION_1M: {
    bestFor: ["clean_trend", "moderate_volatility", "good_structure"],
    avoidWhen: ["extreme_chop", "stale_frame"],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["1m"],
    allowedSessions: ["London", "NewYork", "Overlap", "Tokyo"],
    baseScore: 72,
    confidenceBoostConditions: ["session_overlap", "high_structure_clarity"],
  },
  SESSION_HUNTER_2M: {
    bestFor: ["session_open", "breakout_context", "pullback_context", "good_volatility"],
    avoidWhen: ["asian_only", "stale_frame", "high_false_break", "high_lag"],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["1m", "2m"],
    allowedSessions: ["London", "NewYork", "Overlap"],
    baseScore: 70,
    confidenceBoostConditions: ["session_overlap"],
  },
  TREND_SYNC_5M: {
    bestFor: ["strong_trend", "clean_structure", "higher_tf_alignment"],
    avoidWhen: ["range", "chop", "stale_frame"],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["5m"],
    allowedSessions: ["London", "NewYork", "Overlap"],
    baseScore: 73,
    confidenceBoostConditions: ["strong_trend"],
  },
  MA_RSI_FUSION: {
    bestFor: ["balanced_conditions", "moderate_structure", "safer_otc"],
    avoidWhen: ["stale_frame", "extreme_false_break"],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["1m", "2m", "5m"],
    allowedSessions: ["Tokyo", "London", "NewYork", "Overlap", "Sydney"],
    baseScore: 74,
    confidenceBoostConditions: ["session_overlap", "high_structure_clarity"],
  },
  SUPER_INDICATOR_MIX: {
    bestFor: ["very_clean_structure", "confluence", "good_volatility"],
    avoidWhen: ["chop", "stale_frame", "high_lag", "unclear_structure"],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["1m", "2m", "5m"],
    allowedSessions: ["London", "NewYork", "Overlap"],
    baseScore: 68,
    confidenceBoostConditions: ["very_clean_structure"],
  },
  PRIVATE_METHOD: {
    bestFor: ["breakout_context", "volatility_expansion", "session_open"],
    avoidWhen: ["high_false_break", "stale_frame", "otc_high_lag"],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["1m", "2m"],
    allowedSessions: ["London", "NewYork", "Overlap"],
    baseScore: 66,
    confidenceBoostConditions: ["breakout_context"],
  },
  SAFE_MODE: {
    bestFor: ["otc", "lag", "unclear_market", "risk_control"],
    avoidWhen: [],
    marketTypes: ["real", "otc"],
    allowedTimeframes: ["1m", "2m", "5m"],
    allowedSessions: ["Tokyo", "London", "NewYork", "Overlap", "Sydney", "Off-Hours"],
    baseScore: 78,
    confidenceBoostConditions: [],
  },
};

interface MarketFlags {
  high_volatility: boolean;
  good_volatility: boolean;
  moderate_volatility: boolean;
  strong_structure: boolean;
  very_clean_structure: boolean;
  good_structure: boolean;
  moderate_structure: boolean;
  unclear_structure: boolean;
  clean_trend: boolean;
  strong_trend: boolean;
  range: boolean;
  chop: boolean;
  extreme_chop: boolean;
  clean_momentum: boolean;
  session_open: boolean;
  asian_only: boolean;
  breakout_context: boolean;
  pullback_context: boolean;
  higher_tf_alignment: boolean;
  stale_frame: boolean;
  low_lag: boolean;
  high_lag: boolean;
  lag: boolean;
  high_false_break: boolean;
  extreme_false_break: boolean;
  otc: boolean;
  otc_high_lag: boolean;
  unclear_market: boolean;
  risk_control: boolean;
  volatility_expansion: boolean;
  balanced_conditions: boolean;
  safer_otc: boolean;
  confluence: boolean;
  session_overlap: boolean;
  high_structure_clarity: boolean;
  [key: string]: boolean;
}

function deriveMarketFlags(chart: ChartState): MarketFlags {
  const vol = chart.volatility ?? 0.5;
  const volScore = vol * 100;
  const structureClarity = (chart.candleStrength ?? 0.5) * 100;
  const falseBreakRisk = chart.bodyWickRatio ? Math.max(0, 100 - chart.bodyWickRatio * 40) : 50;
  const isOtc = false; // Would come from market context
  const session = getSessionInfo();

  const trendDir = chart.trendDirection;
  const isChop = trendDir === "chop";
  const isRange = trendDir === "range";
  const isTrend = trendDir === "up" || trendDir === "down";

  return {
    high_volatility: volScore >= 70,
    good_volatility: volScore >= 58,
    moderate_volatility: volScore >= 50 && volScore < 70,
    strong_structure: structureClarity >= 72,
    very_clean_structure: structureClarity >= 68,
    good_structure: structureClarity >= 58,
    moderate_structure: structureClarity >= 48 && structureClarity < 68,
    unclear_structure: structureClarity < 50,
    clean_trend: isTrend && structureClarity >= 58,
    strong_trend: isTrend && structureClarity >= 68,
    range: isRange,
    chop: isChop,
    extreme_chop: isChop && structureClarity < 40,
    clean_momentum: isTrend && volScore >= 65,
    session_open: session.isActive,
    asian_only: session.name === "Tokyo" && !session.isOverlap,
    breakout_context: chart.bollingerPosition === "squeeze" || (chart.volatility ?? 0) > 0.7,
    pullback_context: chart.emaAlignment === "bullish" || chart.emaAlignment === "bearish",
    higher_tf_alignment: isTrend,
    stale_frame: false,
    low_lag: true,
    high_lag: false,
    lag: false,
    high_false_break: falseBreakRisk > 55,
    extreme_false_break: falseBreakRisk > 70,
    otc: isOtc,
    otc_high_lag: false,
    unclear_market: structureClarity < 55 || isChop,
    risk_control: true,
    volatility_expansion: volScore >= 65 && !isChop,
    balanced_conditions: volScore >= 45 && volScore <= 70 && structureClarity >= 48,
    safer_otc: isOtc && structureClarity >= 55,
    confluence: structureClarity >= 60 && isTrend,
    session_overlap: session.isOverlap,
    high_structure_clarity: structureClarity >= 70,
  };
}

function getBlockReasons(presetId: JoyridePresetId, cond: PresetConditionMap, flags: MarketFlags): string[] {
  const reasons: string[] = [];

  if (flags.stale_frame && ["TURBO_10S", "SESSION_HUNTER_2M", "PRIVATE_METHOD", "SUPER_INDICATOR_MIX"].includes(presetId)) {
    reasons.push("Stale frame blocks fast/aggressive presets");
  }
  if (flags.otc_high_lag && ["TURBO_10S", "SESSION_HUNTER_2M", "PRIVATE_METHOD"].includes(presetId)) {
    reasons.push("OTC + high lag blocks aggressive presets");
  }
  if (flags.extreme_chop && presetId !== "SAFE_MODE") {
    reasons.push("Extreme chop blocks non-safe presets");
  }
  if (flags.extreme_false_break && ["PRIVATE_METHOD", "SESSION_HUNTER_2M", "TURBO_10S"].includes(presetId)) {
    reasons.push("Extreme false-break risk blocks breakout-heavy presets");
  }
  if (flags.unclear_structure && presetId === "SUPER_INDICATOR_MIX") {
    reasons.push("Super Indicator Mix requires structure clarity > 65");
  }

  return reasons;
}

function scorePreset(
  presetId: JoyridePresetId,
  cond: PresetConditionMap,
  flags: MarketFlags
): { score: number; reasons: string[]; penalties: string[] } {
  let score = cond.baseScore;
  const reasons: string[] = [];
  const penalties: string[] = [];

  // Boost for matching conditions
  for (const c of cond.bestFor) {
    if (flags[c]) {
      score += 8;
      reasons.push(`✓ ${c.replace(/_/g, " ")}`);
    }
  }

  // Penalize for avoid conditions
  for (const c of cond.avoidWhen) {
    if (flags[c]) {
      score -= 15;
      penalties.push(`✕ ${c.replace(/_/g, " ")}`);
    }
  }

  // Confidence boost conditions
  for (const c of cond.confidenceBoostConditions) {
    if (flags[c]) {
      score += 5;
      reasons.push(`⚡ ${c.replace(/_/g, " ")}`);
    }
  }

  // Global adjustments
  if (flags.otc && ["SAFE_MODE", "MA_RSI_FUSION", "PRECISION_1M"].includes(presetId)) {
    score += 10;
    reasons.push("✓ OTC-friendly preset");
  }
  if (flags.otc && ["TURBO_10S", "PRIVATE_METHOD"].includes(presetId)) {
    score -= 12;
    penalties.push("✕ Risky for OTC");
  }
  if (flags.high_lag && presetId === "SAFE_MODE") {
    score += 12;
    reasons.push("✓ Best fallback during lag");
  }
  if (flags.strong_trend && ["TREND_SYNC_5M", "PRECISION_1M"].includes(presetId)) {
    score += 10;
    reasons.push("✓ Strong trend fit");
  }
  if (flags.breakout_context && ["SESSION_HUNTER_2M", "PRIVATE_METHOD"].includes(presetId)) {
    score += 9;
    reasons.push("✓ Breakout context fit");
  }
  if (flags.chop && presetId === "SAFE_MODE") {
    score += 8;
    reasons.push("✓ Safe mode preferred in chop");
  }
  if (flags.unclear_market && presetId !== "SAFE_MODE") {
    score -= 10;
    penalties.push("✕ Unclear market");
  }

  return { score: Math.round(score * 100) / 100, reasons, penalties };
}

const PRESET_NAMES: Record<JoyridePresetId, string> = {
  TURBO_10S: "Turbo 10s",
  PRECISION_1M: "Precision 1m",
  SESSION_HUNTER_2M: "Session Hunter 2m",
  TREND_SYNC_5M: "Trend Sync 5m",
  MA_RSI_FUSION: "MA + RSI Fusion",
  SUPER_INDICATOR_MIX: "Super Indicator Mix",
  PRIVATE_METHOD: "Private Method",
  SAFE_MODE: "Safe Mode",
};

export function selectBestPreset(
  chart: ChartState,
  forcedPreset?: JoyridePresetId | null
): PresetSelectorResult {
  // Forced mode
  if (forcedPreset) {
    return {
      selectedPresetId: forcedPreset,
      selectedPresetName: PRESET_NAMES[forcedPreset],
      selectionMode: "forced",
      presetScores: [{
        presetId: forcedPreset,
        presetName: PRESET_NAMES[forcedPreset],
        score: 85,
        blocked: false,
        reasons: ["User selected preset manually"],
        penalties: [],
        blockReasons: [],
      }],
      blockedPresets: [],
      whySelected: [`Preset manually selected: ${PRESET_NAMES[forcedPreset]}`],
      selectorResult: "SELECTED",
    };
  }

  const flags = deriveMarketFlags(chart);
  const scores: PresetScoreItem[] = [];
  const blocked: { presetId: string; presetName: string; blockReasons: string[] }[] = [];

  for (const [id, cond] of Object.entries(PRESET_CONDITIONS)) {
    const presetId = id as JoyridePresetId;
    const blockReasons = getBlockReasons(presetId, cond, flags);

    if (blockReasons.length > 0) {
      blocked.push({ presetId: id, presetName: PRESET_NAMES[presetId], blockReasons });
      scores.push({
        presetId,
        presetName: PRESET_NAMES[presetId],
        score: 0,
        blocked: true,
        reasons: [],
        penalties: [],
        blockReasons,
      });
      continue;
    }

    const { score, reasons, penalties } = scorePreset(presetId, cond, flags);
    scores.push({
      presetId,
      presetName: PRESET_NAMES[presetId],
      score,
      blocked: false,
      reasons,
      penalties,
      blockReasons: [],
    });
  }

  scores.sort((a, b) => b.score - a.score);

  const valid = scores.filter(s => !s.blocked);

  if (valid.length === 0) {
    return {
      selectedPresetId: "SAFE_MODE",
      selectedPresetName: "Safe Mode",
      selectionMode: "fallback",
      presetScores: scores,
      blockedPresets: blocked,
      whySelected: ["All presets blocked → forcing Safe Mode"],
      selectorResult: "FALLBACK_SAFE_MODE",
    };
  }

  const best = valid[0];

  if (best.score < 60) {
    return {
      selectedPresetId: null,
      selectedPresetName: null,
      selectionMode: "auto",
      presetScores: scores,
      blockedPresets: blocked,
      whySelected: ["No preset reached minimum quality threshold (60)"],
      selectorResult: "NO_TRADE",
    };
  }

  return {
    selectedPresetId: best.presetId,
    selectedPresetName: best.presetName,
    selectionMode: "auto",
    presetScores: scores,
    blockedPresets: blocked,
    whySelected: [
      `Highest scoring preset: ${best.presetName} (${best.score})`,
      ...best.reasons.slice(0, 4),
    ],
    selectorResult: "SELECTED",
  };
}
