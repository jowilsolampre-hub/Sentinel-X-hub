// SENTINEL X PRIME - Guru Strategy Prioritization (v3)
// Ranked strategies by win rate with session-specific matching

import { Vector, MarketType, Session } from "@/types/trading";

export interface GuruStrategy {
  id: string;
  name: string;
  winRate: number; // Percentage
  marketType: MarketType;
  vectors: Vector[];
  priority: number;
  description: string;
  sessionBoost: Session[]; // Sessions where this strategy excels
  isActive: boolean;
}

// REAL Market Guru Strategies (Ranked by Win Rate)
export const REAL_GURU_STRATEGIES: GuruStrategy[] = [
  {
    id: "ict-silver-bullet",
    name: "ICT Silver Bullet",
    winRate: 99.2,
    marketType: "REAL",
    vectors: ["Forex", "Indices"],
    priority: 1,
    description: "Institutional liquidity sweep with precision timing",
    sessionBoost: ["London", "NewYork"],
    isActive: true
  },
  {
    id: "wyckoff-spring",
    name: "Wyckoff Spring",
    winRate: 98.9,
    marketType: "REAL",
    vectors: ["Forex", "Indices"],
    priority: 2,
    description: "Accumulation/Distribution phase detection",
    sessionBoost: ["London"],
    isActive: true
  },
  {
    id: "liquidity-sweep",
    name: "Liquidity Sweep",
    winRate: 98.7,
    marketType: "REAL",
    vectors: ["Forex", "Indices", "Commodities"],
    priority: 3,
    description: "Stop loss cluster targeting",
    sessionBoost: ["NewYork"],
    isActive: true
  },
  {
    id: "smc-order-block",
    name: "SMC Order Block",
    winRate: 98.5,
    marketType: "REAL",
    vectors: ["Indices", "Futures"],
    priority: 4,
    description: "Smart money concept institutional zones",
    sessionBoost: ["London", "NewYork"],
    isActive: true
  },
  {
    id: "bollinger-squeeze",
    name: "Bollinger Squeeze",
    winRate: 97.8,
    marketType: "REAL",
    vectors: ["Forex", "Commodities"],
    priority: 5,
    description: "Volatility compression breakout",
    sessionBoost: ["London"],
    isActive: true
  },
  {
    id: "rumers-box",
    name: "Rumer's Box Theory",
    winRate: 97.5,
    marketType: "REAL",
    vectors: ["Forex", "Indices"],
    priority: 6,
    description: "Range consolidation breakout",
    sessionBoost: ["NewYork"],
    isActive: true
  },
  {
    id: "padders-scalp",
    name: "Padder's Scalp Method",
    winRate: 97.2,
    marketType: "REAL",
    vectors: ["Forex"],
    priority: 7,
    description: "High-frequency momentum scalping",
    sessionBoost: ["London", "NewYork"],
    isActive: true
  }
];

// OTC Market Guru Strategies (Ranked by Win Rate)
export const OTC_GURU_STRATEGIES: GuruStrategy[] = [
  {
    id: "candle-exhaustion",
    name: "Candle Exhaustion",
    winRate: 98.7,
    marketType: "OTC",
    vectors: ["OTC"],
    priority: 1,
    description: "Momentum exhaustion reversal signals",
    sessionBoost: ["Tokyo", "Sydney"],
    isActive: true
  },
  {
    id: "time-cycle-reversion",
    name: "Time-Cycle Reversion",
    winRate: 98.4,
    marketType: "OTC",
    vectors: ["OTC"],
    priority: 2,
    description: "Statistical mean reversion on time cycles",
    sessionBoost: ["Tokyo"],
    isActive: true
  },
  {
    id: "false-breakout-snap",
    name: "False Breakout Snap",
    winRate: 98.3,
    marketType: "OTC",
    vectors: ["OTC"],
    priority: 3,
    description: "Trap pattern detection and snap-back",
    sessionBoost: ["Sydney", "Tokyo"],
    isActive: true
  },
  {
    id: "bollinger-squeeze-otc",
    name: "Bollinger Squeeze (OTC)",
    winRate: 97.9,
    marketType: "OTC",
    vectors: ["OTC"],
    priority: 4,
    description: "Volatility compression for binary timing",
    sessionBoost: ["London"],
    isActive: true
  },
  {
    id: "rumers-box-otc",
    name: "Rumer's Box Theory (OTC)",
    winRate: 97.6,
    marketType: "OTC",
    vectors: ["OTC"],
    priority: 5,
    description: "Range-bound binary entries",
    sessionBoost: ["NewYork"],
    isActive: true
  },
  {
    id: "padders-scalp-otc",
    name: "Padder's Scalp (OTC)",
    winRate: 97.3,
    marketType: "OTC",
    vectors: ["OTC"],
    priority: 6,
    description: "Quick momentum scalps for 1M expiry",
    sessionBoost: ["London", "NewYork"],
    isActive: true
  }
];

// Session open windows (highest win-rate periods)
export interface SessionOpenWindow {
  session: Session;
  startHour: number;
  endHour: number;
  startMinute: number;
  endMinute: number;
  boost: number; // Multiplier for signal generation probability
  bestVectors: Vector[];
}

export const SESSION_OPEN_WINDOWS: SessionOpenWindow[] = [
  {
    session: "London",
    startHour: 7,
    endHour: 7,
    startMinute: 0,
    endMinute: 15,
    boost: 1.85, // 65% vs 35% normal = ~1.85x
    bestVectors: ["Forex", "Commodities"]
  },
  {
    session: "NewYork",
    startHour: 12,
    endHour: 12,
    startMinute: 0,
    endMinute: 15,
    boost: 1.85,
    bestVectors: ["Indices", "Futures"]
  },
  {
    session: "Tokyo",
    startHour: 0,
    endHour: 0,
    startMinute: 0,
    endMinute: 15,
    boost: 1.5,
    bestVectors: ["OTC"] // Crypto would go here
  }
];

// Check if current time is within a session open window
export const getActiveSessionOpen = (): SessionOpenWindow | null => {
  const now = new Date();
  const hour = now.getUTCHours();
  const minute = now.getUTCMinutes();
  
  for (const window of SESSION_OPEN_WINDOWS) {
    if (
      hour >= window.startHour && 
      hour <= window.endHour &&
      minute >= window.startMinute && 
      minute <= window.endMinute
    ) {
      return window;
    }
  }
  
  return null;
};

// Get strategies for current market type, sorted by win rate
export const getGuruStrategies = (marketType: MarketType): GuruStrategy[] => {
  const strategies = marketType === "OTC" ? OTC_GURU_STRATEGIES : REAL_GURU_STRATEGIES;
  return strategies.filter(s => s.isActive).sort((a, b) => b.winRate - a.winRate);
};

// Get top 3 strategies for session open boost
export const getSessionOpenStrategies = (marketType: MarketType, session: Session): GuruStrategy[] => {
  const strategies = getGuruStrategies(marketType);
  
  // Prioritize strategies with session boost
  const boosted = strategies.filter(s => s.sessionBoost.includes(session));
  const others = strategies.filter(s => !s.sessionBoost.includes(session));
  
  return [...boosted, ...others].slice(0, 3);
};

// Get strategy by ID
export const getStrategyById = (id: string): GuruStrategy | undefined => {
  return [...REAL_GURU_STRATEGIES, ...OTC_GURU_STRATEGIES].find(s => s.id === id);
};

// Calculate signal probability boost
export const calculateProbabilityBoost = (
  baseProb: number,
  session: Session,
  vector: Vector
): number => {
  const sessionOpen = getActiveSessionOpen();
  
  if (!sessionOpen) return baseProb;
  
  // Check if vector matches session open best vectors
  if (sessionOpen.bestVectors.includes(vector)) {
    return Math.min(baseProb * sessionOpen.boost, 0.65); // Cap at 65%
  }
  
  return baseProb;
};

// Session-specific strategy matching
export const getOptimalStrategy = (
  session: Session,
  vector: Vector,
  marketType: MarketType
): GuruStrategy | null => {
  const strategies = getGuruStrategies(marketType)
    .filter(s => s.vectors.includes(vector))
    .filter(s => s.sessionBoost.includes(session) || s.sessionBoost.length === 0);
  
  return strategies[0] || null;
};
