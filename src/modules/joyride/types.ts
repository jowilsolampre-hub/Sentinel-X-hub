// JOYRIDE PRO PACK - Type Definitions

export type JoyridePresetId = 
  | "TURBO_10S"
  | "PRECISION_1M"
  | "SESSION_HUNTER_2M"
  | "TREND_SYNC_5M"
  | "MA_RSI_FUSION"
  | "SUPER_INDICATOR_MIX"
  | "PRIVATE_METHOD"
  | "SAFE_MODE";

export type Aggressiveness = "Safe" | "Standard" | "High";

export interface JoyrideIndicator {
  name: string;
  period?: number;
  fast?: number;
  slow?: number;
  signal?: number;
  stdDev?: number;
  levels?: number[];
}

export interface JoyridePreset {
  id: JoyridePresetId;
  label: string;
  description: string;
  indicators: JoyrideIndicator[];
  minConfirmations: number;
  defaultTimeframe: string;
  defaultExpiry: string;
  sessionProfile: string[];
}

export interface JoyrideSignal {
  preset: string;
  pair: string;
  timeframe: string;
  expiry: string;
  direction: "CALL" | "PUT" | "NO_TRADE";
  confidence: number;
  reasons: string[];
  avoidIf: string[];
  entryWindowSeconds: number;
  patternLabel: string;
  sessionSuitability: number;
  invalidation: string[];
  setupChecklist: string[];
}

export interface JoyrideConfig {
  enabled: boolean;
  selectedPreset: JoyridePresetId;
  aggressiveness: Aggressiveness;
  sessionAware: boolean;
  pairRanking: boolean;
  autoSetupHelper: boolean;
  explainSignal: boolean;
  screenshotAuditLog: boolean;
  strictFilter: boolean;
  confidenceThreshold: number;
  maxSignalsPerSession: number;
  cooldownAfterLosses: boolean;
}

export interface PairRank {
  symbol: string;
  score: number;
  trendCleanliness: number;
  bodyWickRatio: number;
  volatility: number;
  falseBreaks: number;
  structureClarity: number;
  sessionFit: number;
  recommendation: "TOP" | "OK" | "AVOID";
}

export interface JoyrideSetupHelper {
  timeframeToSet: string;
  expiryToSet: string;
  indicatorsToEnable: JoyrideIndicator[];
  idealPair: string;
  sessionSuitable: boolean;
  sessionLabel: string;
}

export interface JoyrideLog {
  timestamp: string;
  preset: JoyridePresetId;
  pair: string;
  timeframe: string;
  direction: string;
  confidence: number;
  reasons: string[];
  noTradeReasons: string[];
  screenshotRef?: string;
}
