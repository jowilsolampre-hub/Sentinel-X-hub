// SENTINEL X PRIME - Trading Types

export type Vector = "Forex" | "Indices" | "Commodities" | "Futures" | "OTC";
export type MarketType = "REAL" | "OTC";
export type Direction = "BUY" | "SELL";
export type SignalStatus = "PENDING" | "EXECUTED" | "INVALIDATED" | "CANCELLED" | "MISSED";
export type Session = "London" | "NewYork" | "Tokyo" | "Sydney" | "Closed";
export type Timeframe = "1M" | "5M" | "15M" | "30M" | "1H" | "4H" | "1D";

export interface Signal {
  id: string;
  asset: string;
  vector: Vector;
  marketType: MarketType;
  strategy: string;
  direction: Direction;
  issuedAt: Date;
  executeAt: Date;
  timeframe: Timeframe;
  confidence: number;
  status: SignalStatus;
  session: Session;
  result?: "WIN" | "LOSS" | "MISS";
}

export interface AssetState {
  asset: string;
  vector: Vector;
  lastSignal?: Date;
  cooldownUntil?: Date;
  refractoryCount: number;
}

export interface Strategy {
  id: string;
  name: string;
  vector: Vector;
  marketType: MarketType;
  priority: number;
  description: string;
}

export interface EngineStats {
  totalSignals: number;
  pendingSignals: number;
  executedSignals: number;
  winRate: number;
  activeSession: Session;
  engineStatus: "RUNNING" | "PAUSED" | "STOPPED";
  lastScanTime: Date;
}

export interface RiskGate {
  manualLock: boolean;
  maxDailyTrades: number;
  currentDailyTrades: number;
  maxConsecutiveLosses: number;
  currentConsecutiveLosses: number;
  maxDailyLoss: number;
  currentDailyLoss: number;
}

// Asset pools by vector
export const ASSET_POOLS: Record<Vector, string[]> = {
  Forex: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "EUR/GBP", "NZD/USD"],
  Indices: ["NASDAQ", "S&P 500", "DAX 40", "FTSE 100", "Nikkei 225"],
  Commodities: ["Gold", "Silver", "Crude Oil", "Natural Gas", "Copper"],
  Futures: ["ES", "NQ", "YM", "RTY", "CL"],
  OTC: ["EUR/USD (OTC)", "GBP/USD (OTC)", "USD/JPY (OTC)", "Gold (OTC)"]
};

// Strategy definitions
export const STRATEGIES: Strategy[] = [
  // REAL Market Strategies
  { id: "ict-liquidity", name: "ICT Liquidity Sweep", vector: "Forex", marketType: "REAL", priority: 1, description: "Institutional order flow analysis" },
  { id: "wyckoff", name: "Wyckoff Structure", vector: "Forex", marketType: "REAL", priority: 2, description: "Accumulation/Distribution phases" },
  { id: "smc-orderblocks", name: "SMC Order Blocks", vector: "Indices", marketType: "REAL", priority: 1, description: "Smart money concept zones" },
  { id: "liquidity-stop", name: "Liquidity Stop Hunt", vector: "Indices", marketType: "REAL", priority: 3, description: "Stop loss cluster targeting" },
  { id: "structure-cont", name: "Structure Continuation", vector: "Commodities", marketType: "REAL", priority: 1, description: "Trend continuation patterns" },
  { id: "supply-demand", name: "Supply & Demand", vector: "Futures", marketType: "REAL", priority: 1, description: "Institutional supply/demand zones" },
  
  // OTC Market Strategies
  { id: "candle-exhaust", name: "Candle Exhaustion", vector: "OTC", marketType: "OTC", priority: 1, description: "Momentum exhaustion signals" },
  { id: "time-cycle", name: "Time-Cycle Reversion", vector: "OTC", marketType: "OTC", priority: 2, description: "Statistical mean reversion" },
  { id: "false-breakout", name: "False Breakout", vector: "OTC", marketType: "OTC", priority: 3, description: "Trap pattern detection" },
  { id: "snap-strategy", name: "Snap Reversal", vector: "OTC", marketType: "OTC", priority: 4, description: "Rapid reversal patterns" }
];

// Session times (UTC hours)
export const SESSION_TIMES = {
  Sydney: { start: 22, end: 7 },
  Tokyo: { start: 0, end: 9 },
  London: { start: 7, end: 16 },
  NewYork: { start: 12, end: 21 }
};
