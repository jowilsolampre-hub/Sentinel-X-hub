// SENTINEL X - Performance Tracking & Analytics (v5)
// Win rate dashboard and session performance stats

import { Signal, Session, Vector, MarketType } from "@/types/trading";

export type SignalResult = "WIN" | "LOSS" | "MISS" | "PENDING";

export interface SignalRecord {
  signalId: string;
  asset: string;
  vector: Vector;
  marketType: MarketType;
  strategy: string;
  session: Session;
  direction: string;
  confidence: number;
  result: SignalResult;
  timestamp: Date;
  executedAt?: Date;
  expirySeconds?: number;
}

export interface PerformanceStats {
  totalSignals: number;
  wins: number;
  losses: number;
  misses: number;
  pending: number;
  winRate: number;
  profitFactor: number;
  averageConfidence: number;
  bestSession: Session | null;
  bestVector: Vector | null;
  bestStrategy: string | null;
  streakCurrent: number;
  streakBest: number;
}

export interface SessionStats {
  session: Session;
  signals: number;
  wins: number;
  winRate: number;
}

export interface StrategyStats {
  strategy: string;
  signals: number;
  wins: number;
  winRate: number;
  avgConfidence: number;
}

// In-memory signal history
const signalHistory: SignalRecord[] = [];
const MAX_HISTORY = 500;

// Record a new signal
export const recordSignal = (signal: Signal, result: SignalResult = "PENDING"): void => {
  const record: SignalRecord = {
    signalId: signal.id,
    asset: signal.asset,
    vector: signal.vector,
    marketType: signal.marketType,
    strategy: signal.strategy,
    session: signal.session,
    direction: signal.direction,
    confidence: signal.confidence,
    result,
    timestamp: signal.issuedAt,
    expirySeconds: signal.marketType === "OTC" ? (signal.timeframe === "1M" ? 60 : 300) : undefined
  };
  
  signalHistory.push(record);
  
  // Maintain max size
  if (signalHistory.length > MAX_HISTORY) {
    signalHistory.shift();
  }
};

// Update signal result
export const updateSignalResult = (signalId: string, result: SignalResult): boolean => {
  const record = signalHistory.find(r => r.signalId === signalId);
  if (record) {
    record.result = result;
    if (result !== "PENDING") {
      record.executedAt = new Date();
    }
    return true;
  }
  return false;
};

// Calculate overall performance stats
export const getPerformanceStats = (): PerformanceStats => {
  const completed = signalHistory.filter(r => r.result !== "PENDING");
  const wins = completed.filter(r => r.result === "WIN").length;
  const losses = completed.filter(r => r.result === "LOSS").length;
  const misses = completed.filter(r => r.result === "MISS").length;
  const pending = signalHistory.filter(r => r.result === "PENDING").length;
  
  const winRate = completed.length > 0 ? (wins / completed.length) * 100 : 0;
  const profitFactor = losses > 0 ? wins / losses : wins;
  
  const avgConfidence = signalHistory.length > 0
    ? signalHistory.reduce((sum, r) => sum + r.confidence, 0) / signalHistory.length
    : 0;
  
  // Find best session
  const sessionStats = getSessionStats();
  const bestSession = sessionStats.length > 0
    ? sessionStats.reduce((best, curr) => curr.winRate > best.winRate ? curr : best).session
    : null;
  
  // Find best vector
  const vectorStats = getVectorStats();
  const bestVector = vectorStats.length > 0
    ? vectorStats.reduce((best, curr) => curr.winRate > best.winRate ? curr : best).vector
    : null;
  
  // Find best strategy
  const strategyStats = getStrategyStats();
  const bestStrategy = strategyStats.length > 0
    ? strategyStats.reduce((best, curr) => curr.winRate > best.winRate ? curr : best).strategy
    : null;
  
  // Calculate streaks
  const { current, best } = calculateStreaks();
  
  return {
    totalSignals: signalHistory.length,
    wins,
    losses,
    misses,
    pending,
    winRate,
    profitFactor,
    averageConfidence: avgConfidence,
    bestSession,
    bestVector,
    bestStrategy,
    streakCurrent: current,
    streakBest: best
  };
};

// Get stats by session
export const getSessionStats = (): SessionStats[] => {
  const sessions: Session[] = ["London", "NewYork", "Tokyo", "Sydney"];
  
  return sessions.map(session => {
    const sessionRecords = signalHistory.filter(r => r.session === session && r.result !== "PENDING");
    const wins = sessionRecords.filter(r => r.result === "WIN").length;
    
    return {
      session,
      signals: sessionRecords.length,
      wins,
      winRate: sessionRecords.length > 0 ? (wins / sessionRecords.length) * 100 : 0
    };
  }).filter(s => s.signals > 0);
};

// Get stats by vector
export const getVectorStats = (): { vector: Vector; signals: number; wins: number; winRate: number }[] => {
  const vectors: Vector[] = ["Forex", "Indices", "Commodities", "Futures", "OTC"];
  
  return vectors.map(vector => {
    const vectorRecords = signalHistory.filter(r => r.vector === vector && r.result !== "PENDING");
    const wins = vectorRecords.filter(r => r.result === "WIN").length;
    
    return {
      vector,
      signals: vectorRecords.length,
      wins,
      winRate: vectorRecords.length > 0 ? (wins / vectorRecords.length) * 100 : 0
    };
  }).filter(v => v.signals > 0);
};

// Get stats by strategy
export const getStrategyStats = (): StrategyStats[] => {
  const strategies = [...new Set(signalHistory.map(r => r.strategy))];
  
  return strategies.map(strategy => {
    const stratRecords = signalHistory.filter(r => r.strategy === strategy && r.result !== "PENDING");
    const wins = stratRecords.filter(r => r.result === "WIN").length;
    const allRecords = signalHistory.filter(r => r.strategy === strategy);
    const avgConfidence = allRecords.length > 0
      ? allRecords.reduce((sum, r) => sum + r.confidence, 0) / allRecords.length
      : 0;
    
    return {
      strategy,
      signals: stratRecords.length,
      wins,
      winRate: stratRecords.length > 0 ? (wins / stratRecords.length) * 100 : 0,
      avgConfidence
    };
  }).filter(s => s.signals > 0).sort((a, b) => b.winRate - a.winRate);
};

// Calculate win/loss streaks
const calculateStreaks = (): { current: number; best: number } => {
  const completed = signalHistory
    .filter(r => r.result === "WIN" || r.result === "LOSS")
    .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  
  if (completed.length === 0) return { current: 0, best: 0 };
  
  let current = 0;
  let best = 0;
  let streak = 0;
  let lastResult: SignalResult | null = null;
  
  for (const record of completed) {
    if (record.result === lastResult) {
      streak++;
    } else {
      streak = 1;
      lastResult = record.result;
    }
    
    if (record.result === "WIN") {
      current = streak;
      if (streak > best) best = streak;
    } else {
      current = -streak;
    }
  }
  
  return { current, best };
};

// Get signal history
export const getSignalHistory = (limit?: number): SignalRecord[] => {
  const sorted = [...signalHistory].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  return limit ? sorted.slice(0, limit) : sorted;
};

// Clear history
export const clearHistory = (): void => {
  signalHistory.length = 0;
};

// Format stats for display
export const formatWinRate = (winRate: number): string => {
  if (winRate >= 98) return `🔥 ${winRate.toFixed(1)}%`;
  if (winRate >= 95) return `⚡ ${winRate.toFixed(1)}%`;
  if (winRate >= 90) return `✅ ${winRate.toFixed(1)}%`;
  if (winRate >= 80) return `📊 ${winRate.toFixed(1)}%`;
  return `📉 ${winRate.toFixed(1)}%`;
};
