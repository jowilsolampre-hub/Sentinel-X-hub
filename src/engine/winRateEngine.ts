// SENTINEL X - Win Rate Tracking Engine (v5)
// Pair-specific performance tracking, auto-filtering, and analytics

import { Vector, MarketType, Session, Direction, Timeframe } from "@/types/trading";

export interface PairStats {
  pair: string;
  vector: Vector;
  marketType: MarketType;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgConfidence: number;
  lastTrade: Date | null;
  streak: number; // Positive = wins, negative = losses
  isBlacklisted: boolean;
  blacklistReason?: string;
  cooldownUntil?: Date;
}

export interface StrategyStats {
  strategyId: string;
  strategyName: string;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgConfidence: number;
  bestSession: Session | null;
  bestVector: Vector | null;
}

export interface SessionPerformance {
  session: Session;
  totalTrades: number;
  wins: number;
  winRate: number;
  avgConfidence: number;
  bestPairs: string[];
}

export interface TradeRecord {
  id: string;
  pair: string;
  vector: Vector;
  marketType: MarketType;
  strategy: string;
  direction: Direction;
  confidence: number;
  session: Session;
  timeframe: Timeframe;
  result: "WIN" | "LOSS" | "PENDING";
  issuedAt: Date;
  executedAt?: Date;
  closedAt?: Date;
  isMartingale: boolean;
  martingaleLevel: number; // 0, 1, or 2
}

// Configuration
const MIN_TRADES_FOR_STATS = 5;
const BLACKLIST_THRESHOLD = 0.40; // Below 40% win rate
const COOLDOWN_AFTER_LOSS_MS = 60000; // 1 minute
const MAX_CONSECUTIVE_LOSSES = 3;
const AUTO_FILTER_ENABLED = true;

// In-memory storage
const pairStats: Map<string, PairStats> = new Map();
const strategyStats: Map<string, StrategyStats> = new Map();
const tradeHistory: TradeRecord[] = [];
const MAX_HISTORY = 1000;

// Initialize pair stats
const initPairStats = (pair: string, vector: Vector, marketType: MarketType): PairStats => {
  const stats: PairStats = {
    pair,
    vector,
    marketType,
    totalTrades: 0,
    wins: 0,
    losses: 0,
    winRate: 0,
    avgConfidence: 0,
    lastTrade: null,
    streak: 0,
    isBlacklisted: false
  };
  pairStats.set(`${marketType}:${pair}`, stats);
  return stats;
};

// Get pair stats
export const getPairStats = (pair: string, marketType: MarketType): PairStats => {
  const key = `${marketType}:${pair}`;
  return pairStats.get(key) || initPairStats(pair, "OTC", marketType);
};

// Record a trade
export const recordTrade = (trade: Omit<TradeRecord, "id">): string => {
  const id = `TR-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
  const record: TradeRecord = { ...trade, id };
  
  tradeHistory.push(record);
  if (tradeHistory.length > MAX_HISTORY) {
    tradeHistory.shift();
  }
  
  // Update pair stats if result is known
  if (trade.result !== "PENDING") {
    updatePairStats(trade.pair, trade.marketType, trade.vector, trade.result, trade.confidence);
  }
  
  // Update strategy stats
  updateStrategyStats(trade.strategy, trade.result, trade.confidence, trade.session, trade.vector);
  
  console.log(`[WIN-RATE] Trade recorded: ${id} - ${trade.pair} ${trade.direction} -> ${trade.result}`);
  return id;
};

// Update trade result
export const updateTradeResult = (tradeId: string, result: "WIN" | "LOSS"): boolean => {
  const trade = tradeHistory.find(t => t.id === tradeId);
  if (!trade || trade.result !== "PENDING") return false;
  
  trade.result = result;
  trade.closedAt = new Date();
  
  // Update pair stats
  updatePairStats(trade.pair, trade.marketType, trade.vector, result, trade.confidence);
  
  // Update strategy stats
  updateStrategyStats(trade.strategy, result, trade.confidence, trade.session, trade.vector);
  
  console.log(`[WIN-RATE] Trade updated: ${tradeId} -> ${result}`);
  return true;
};

// Update pair statistics
const updatePairStats = (
  pair: string,
  marketType: MarketType,
  vector: Vector,
  result: "WIN" | "LOSS" | "PENDING",
  confidence: number
): void => {
  if (result === "PENDING") return;
  
  const key = `${marketType}:${pair}`;
  let stats = pairStats.get(key);
  
  if (!stats) {
    stats = initPairStats(pair, vector, marketType);
  }
  
  stats.totalTrades++;
  if (result === "WIN") {
    stats.wins++;
    stats.streak = stats.streak >= 0 ? stats.streak + 1 : 1;
  } else {
    stats.losses++;
    stats.streak = stats.streak <= 0 ? stats.streak - 1 : -1;
    
    // Apply cooldown after loss
    stats.cooldownUntil = new Date(Date.now() + COOLDOWN_AFTER_LOSS_MS);
  }
  
  stats.winRate = stats.totalTrades > 0 ? (stats.wins / stats.totalTrades) * 100 : 0;
  stats.avgConfidence = ((stats.avgConfidence * (stats.totalTrades - 1)) + confidence) / stats.totalTrades;
  stats.lastTrade = new Date();
  
  // Auto-blacklist logic
  if (AUTO_FILTER_ENABLED && stats.totalTrades >= MIN_TRADES_FOR_STATS) {
    if (stats.winRate < BLACKLIST_THRESHOLD * 100) {
      stats.isBlacklisted = true;
      stats.blacklistReason = `Win rate ${stats.winRate.toFixed(1)}% below ${BLACKLIST_THRESHOLD * 100}% threshold`;
      console.log(`[WIN-RATE] ⚠️ ${pair} BLACKLISTED: ${stats.blacklistReason}`);
    }
    
    if (stats.streak <= -MAX_CONSECUTIVE_LOSSES) {
      stats.isBlacklisted = true;
      stats.blacklistReason = `${Math.abs(stats.streak)} consecutive losses`;
      console.log(`[WIN-RATE] ⚠️ ${pair} BLACKLISTED: ${stats.blacklistReason}`);
    }
  }
  
  pairStats.set(key, stats);
};

// Update strategy statistics
const updateStrategyStats = (
  strategyName: string,
  result: "WIN" | "LOSS" | "PENDING",
  confidence: number,
  session: Session,
  vector: Vector
): void => {
  if (result === "PENDING") return;
  
  let stats = strategyStats.get(strategyName);
  
  if (!stats) {
    stats = {
      strategyId: strategyName.toLowerCase().replace(/\s+/g, "-"),
      strategyName,
      totalTrades: 0,
      wins: 0,
      losses: 0,
      winRate: 0,
      avgConfidence: 0,
      bestSession: null,
      bestVector: null
    };
  }
  
  stats.totalTrades++;
  if (result === "WIN") {
    stats.wins++;
  } else {
    stats.losses++;
  }
  
  stats.winRate = (stats.wins / stats.totalTrades) * 100;
  stats.avgConfidence = ((stats.avgConfidence * (stats.totalTrades - 1)) + confidence) / stats.totalTrades;
  
  strategyStats.set(strategyName, stats);
};

// Check if pair is tradeable
export const isPairTradeable = (pair: string, marketType: MarketType): {
  tradeable: boolean;
  reason?: string;
} => {
  const stats = getPairStats(pair, marketType);
  
  if (stats.isBlacklisted) {
    return { tradeable: false, reason: stats.blacklistReason };
  }
  
  if (stats.cooldownUntil && new Date() < stats.cooldownUntil) {
    const secondsLeft = Math.ceil((stats.cooldownUntil.getTime() - Date.now()) / 1000);
    return { tradeable: false, reason: `Cooldown: ${secondsLeft}s remaining` };
  }
  
  return { tradeable: true };
};

// Get top performing pairs
export const getTopPairs = (marketType: MarketType, limit: number = 5): PairStats[] => {
  return Array.from(pairStats.values())
    .filter(s => s.marketType === marketType && !s.isBlacklisted && s.totalTrades >= MIN_TRADES_FOR_STATS)
    .sort((a, b) => b.winRate - a.winRate)
    .slice(0, limit);
};

// Get blacklisted pairs
export const getBlacklistedPairs = (marketType: MarketType): PairStats[] => {
  return Array.from(pairStats.values())
    .filter(s => s.marketType === marketType && s.isBlacklisted);
};

// Get session performance
export const getSessionPerformance = (): SessionPerformance[] => {
  const sessions: Session[] = ["London", "NewYork", "Tokyo", "Sydney"];
  
  return sessions.map(session => {
    const sessionTrades = tradeHistory.filter(t => t.session === session && t.result !== "PENDING");
    const wins = sessionTrades.filter(t => t.result === "WIN").length;
    const avgConfidence = sessionTrades.length > 0
      ? sessionTrades.reduce((sum, t) => sum + t.confidence, 0) / sessionTrades.length
      : 0;
    
    // Get best pairs for this session
    const pairWinRates = new Map<string, { wins: number; total: number }>();
    sessionTrades.forEach(t => {
      const current = pairWinRates.get(t.pair) || { wins: 0, total: 0 };
      current.total++;
      if (t.result === "WIN") current.wins++;
      pairWinRates.set(t.pair, current);
    });
    
    const bestPairs = Array.from(pairWinRates.entries())
      .filter(([_, stats]) => stats.total >= 3)
      .sort((a, b) => (b[1].wins / b[1].total) - (a[1].wins / a[1].total))
      .slice(0, 3)
      .map(([pair]) => pair);
    
    return {
      session,
      totalTrades: sessionTrades.length,
      wins,
      winRate: sessionTrades.length > 0 ? (wins / sessionTrades.length) * 100 : 0,
      avgConfidence,
      bestPairs
    };
  }).filter(s => s.totalTrades > 0);
};

// Get overall statistics
export const getOverallStats = (): {
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgConfidence: number;
  profitFactor: number;
  bestStreak: number;
  currentStreak: number;
} => {
  const completed = tradeHistory.filter(t => t.result !== "PENDING");
  const wins = completed.filter(t => t.result === "WIN").length;
  const losses = completed.filter(t => t.result === "LOSS").length;
  
  // Calculate streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  
  for (const trade of completed.sort((a, b) => a.issuedAt.getTime() - b.issuedAt.getTime())) {
    if (trade.result === "WIN") {
      tempStreak = tempStreak >= 0 ? tempStreak + 1 : 1;
      if (tempStreak > bestStreak) bestStreak = tempStreak;
    } else {
      tempStreak = tempStreak <= 0 ? tempStreak - 1 : -1;
    }
    currentStreak = tempStreak;
  }
  
  return {
    totalTrades: completed.length,
    wins,
    losses,
    winRate: completed.length > 0 ? (wins / completed.length) * 100 : 0,
    avgConfidence: completed.length > 0
      ? completed.reduce((sum, t) => sum + t.confidence, 0) / completed.length
      : 0,
    profitFactor: losses > 0 ? wins / losses : wins,
    bestStreak,
    currentStreak
  };
};

// Get martingale statistics
export const getMartingaleStats = (): {
  m1Trades: number;
  m1Wins: number;
  m1WinRate: number;
  m2Trades: number;
  m2Wins: number;
  m2WinRate: number;
} => {
  const m1Trades = tradeHistory.filter(t => t.martingaleLevel === 1 && t.result !== "PENDING");
  const m2Trades = tradeHistory.filter(t => t.martingaleLevel === 2 && t.result !== "PENDING");
  
  return {
    m1Trades: m1Trades.length,
    m1Wins: m1Trades.filter(t => t.result === "WIN").length,
    m1WinRate: m1Trades.length > 0 
      ? (m1Trades.filter(t => t.result === "WIN").length / m1Trades.length) * 100 
      : 0,
    m2Trades: m2Trades.length,
    m2Wins: m2Trades.filter(t => t.result === "WIN").length,
    m2WinRate: m2Trades.length > 0 
      ? (m2Trades.filter(t => t.result === "WIN").length / m2Trades.length) * 100 
      : 0
  };
};

// Clear blacklist for a pair
export const clearBlacklist = (pair: string, marketType: MarketType): void => {
  const stats = getPairStats(pair, marketType);
  stats.isBlacklisted = false;
  stats.blacklistReason = undefined;
  stats.streak = 0;
  console.log(`[WIN-RATE] ✅ ${pair} removed from blacklist`);
};

// Reset all statistics
export const resetAllStats = (): void => {
  pairStats.clear();
  strategyStats.clear();
  tradeHistory.length = 0;
  console.log("[WIN-RATE] All statistics reset");
};

// Get trade history
export const getTradeHistory = (limit?: number): TradeRecord[] => {
  const sorted = [...tradeHistory].sort((a, b) => b.issuedAt.getTime() - a.issuedAt.getTime());
  return limit ? sorted.slice(0, limit) : sorted;
};

// Export statistics for Telegram reports
export const exportStatsForTelegram = (): string => {
  const overall = getOverallStats();
  const martingale = getMartingaleStats();
  
  return `
📊 SENTINEL X STATS

✅ Win Rate: ${overall.winRate.toFixed(1)}%
📈 Total Trades: ${overall.totalTrades}
💚 Wins: ${overall.wins}
❌ Losses: ${overall.losses}
🔥 Best Streak: ${overall.bestStreak}
📍 Current Streak: ${overall.currentStreak >= 0 ? `+${overall.currentStreak}` : overall.currentStreak}

🎯 Martingale Stats:
• M1: ${martingale.m1WinRate.toFixed(1)}% (${martingale.m1Trades} trades)
• M2: ${martingale.m2WinRate.toFixed(1)}% (${martingale.m2Trades} trades)

💪 Avg Confidence: ${overall.avgConfidence.toFixed(1)}%
📊 Profit Factor: ${overall.profitFactor.toFixed(2)}
  `.trim();
};
