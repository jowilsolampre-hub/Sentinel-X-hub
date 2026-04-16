// SENTINEL X - SMC Engine Types
// Embedded module inside JOYRIDE PRO / TRADESCAN architecture

export interface SMCCandle {
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SwingPoint {
  index: number;
  price: number;
  kind: "high" | "low";
}

export interface StructureEvent {
  index: number;
  kind: "BOS" | "CHOCH";
  side: "bullish" | "bearish";
  brokenPrice: number;
}

export interface SMCZone {
  kind: "supply" | "demand" | "order_block" | "fvg";
  side: "bullish" | "bearish";
  low: number;
  high: number;
  startIndex: number;
  endIndex: number;
  strength: number;
  metadata: Record<string, any>;
}

export interface ConfirmationResult {
  bullish: boolean;
  bearish: boolean;
  pattern: string | null;
  strength: number;
}

export interface TradePlan {
  side: "buy" | "sell";
  entry: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
}

export interface SMCScoreBreakdown {
  higherTimeframeAlignment: number;
  marketStructure: number;
  bosChoch: number;
  zoneRespect: number;
  orderBlock: number;
  fairValueGap: number;
  liquiditySweep: number;
  premiumDiscount: number;
  confirmationCandle: number;
  sessionContext: number;
  atrQuality: number;
  volumeSpike: number;
}

export interface SMCSignalResult {
  symbol: string;
  timeframe: string;
  higherTimeframe: string | null;
  side: "buy" | "sell" | "neutral";
  confidence: number;
  scoreBreakdown: SMCScoreBreakdown;
  tradePlan: TradePlan | null;
  marketBias: "bullish" | "bearish" | "neutral";
  session: string;
  reasons: string[];
  warnings: string[];
  timestamp: number;
}

export interface SMCWeights {
  higherTimeframeAlignment: number;
  marketStructure: number;
  bosChoch: number;
  zoneRespect: number;
  orderBlock: number;
  fairValueGap: number;
  liquiditySweep: number;
  premiumDiscount: number;
  confirmationCandle: number;
  sessionContext: number;
  atrQuality: number;
  volumeSpike: number;
}

export interface SMCConfig {
  swingLookback: number;
  atrPeriod: number;
  volumeMaPeriod: number;
  minRR: number;
  zoneProximityFactorATR: number;
  obImpulseFactor: number;
  fvgMinSizeFactorATR: number;
  confirmationBodyFactor: number;
  confirmationWickFactor: number;
  sweepToleranceFactorATR: number;
  stopBufferATR: number;
  targetRRDefault: number;
  weights: SMCWeights;
  preferredSessions: string[];
}

export const DEFAULT_SMC_CONFIG: SMCConfig = {
  swingLookback: 3,
  atrPeriod: 14,
  volumeMaPeriod: 20,
  minRR: 1.8,
  zoneProximityFactorATR: 0.6,
  obImpulseFactor: 1.2,
  fvgMinSizeFactorATR: 0.08,
  confirmationBodyFactor: 0.45,
  confirmationWickFactor: 0.30,
  sweepToleranceFactorATR: 0.15,
  stopBufferATR: 0.20,
  targetRRDefault: 2.0,
  weights: {
    higherTimeframeAlignment: 15,
    marketStructure: 12,
    bosChoch: 10,
    zoneRespect: 12,
    orderBlock: 10,
    fairValueGap: 8,
    liquiditySweep: 8,
    premiumDiscount: 6,
    confirmationCandle: 8,
    sessionContext: 5,
    atrQuality: 3,
    volumeSpike: 3,
  },
  preferredSessions: ["London", "New York"],
};
