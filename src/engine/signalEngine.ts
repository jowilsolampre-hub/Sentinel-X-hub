// SENTINEL X PRIME - Signal Generation Engine

import { 
  Signal, 
  Vector, 
  Direction, 
  Session, 
  AssetState, 
  ASSET_POOLS, 
  STRATEGIES, 
  SESSION_TIMES,
  Timeframe,
  MarketType
} from "@/types/trading";

// Generate unique ID
const generateId = (): string => {
  return `SX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get current trading session
export const getCurrentSession = (): Session => {
  const hour = new Date().getUTCHours();
  
  if (hour >= SESSION_TIMES.London.start && hour < SESSION_TIMES.London.end) {
    return "London";
  }
  if (hour >= SESSION_TIMES.NewYork.start && hour < SESSION_TIMES.NewYork.end) {
    return "NewYork";
  }
  if (hour >= SESSION_TIMES.Tokyo.start && hour < SESSION_TIMES.Tokyo.end) {
    return "Tokyo";
  }
  if (hour >= SESSION_TIMES.Sydney.start || hour < SESSION_TIMES.Sydney.end) {
    return "Sydney";
  }
  
  return "Closed";
};

// Get session weight for probability calculation
const getSessionWeight = (session: Session, vector: Vector): number => {
  const weights: Record<Session, Record<Vector, number>> = {
    London: { Forex: 0.15, Indices: 0.1, Commodities: 0.1, Futures: 0.05, OTC: 0.05 },
    NewYork: { Forex: 0.12, Indices: 0.15, Commodities: 0.08, Futures: 0.12, OTC: 0.08 },
    Tokyo: { Forex: 0.08, Indices: 0.05, Commodities: 0.05, Futures: 0.03, OTC: 0.1 },
    Sydney: { Forex: 0.05, Indices: 0.03, Commodities: 0.03, Futures: 0.02, OTC: 0.08 },
    Closed: { Forex: 0.02, Indices: 0.01, Commodities: 0.01, Futures: 0.01, OTC: 0.05 }
  };
  
  return weights[session][vector];
};

// Calculate confidence score
const calculateConfidence = (
  session: Session, 
  vector: Vector, 
  strategyPriority: number
): number => {
  const baseScore = 95;
  const sessionBonus = getSessionWeight(session, vector) * 20;
  const strategyBonus = (5 - strategyPriority) * 0.5;
  const randomVariance = (Math.random() - 0.5) * 2;
  
  return Math.min(99.9, Math.max(95, baseScore + sessionBonus + strategyBonus + randomVariance));
};

// Determine direction based on strategy
const determineDirection = (strategyId: string): Direction => {
  // Strategy-specific direction bias
  const buyBiasStrategies = ["wyckoff", "supply-demand", "time-cycle"];
  const sellBiasStrategies = ["liquidity-stop", "false-breakout"];
  
  if (buyBiasStrategies.includes(strategyId)) {
    return Math.random() > 0.35 ? "BUY" : "SELL";
  }
  if (sellBiasStrategies.includes(strategyId)) {
    return Math.random() > 0.35 ? "SELL" : "BUY";
  }
  
  return Math.random() > 0.5 ? "BUY" : "SELL";
};

// Get timeframe based on market type and vector
const getTimeframe = (marketType: MarketType, vector: Vector): Timeframe => {
  if (marketType === "OTC") {
    return Math.random() > 0.5 ? "1M" : "5M";
  }
  
  const realTimeframes: Record<Vector, Timeframe[]> = {
    Forex: ["15M", "30M", "1H"],
    Indices: ["15M", "1H", "4H"],
    Commodities: ["30M", "1H", "4H"],
    Futures: ["15M", "30M", "1H"],
    OTC: ["1M", "5M"]
  };
  
  const options = realTimeframes[vector];
  return options[Math.floor(Math.random() * options.length)];
};

// Asset state management
const assetStates: Map<string, AssetState> = new Map();

// Check if asset is on cooldown
const isAssetOnCooldown = (asset: string): boolean => {
  const state = assetStates.get(asset);
  if (!state || !state.cooldownUntil) return false;
  return new Date() < state.cooldownUntil;
};

// Set asset cooldown
const setAssetCooldown = (asset: string, vector: Vector): void => {
  const now = new Date();
  const cooldownMs = 30000 + Math.random() * 30000; // 30-60 seconds
  
  assetStates.set(asset, {
    asset,
    vector,
    lastSignal: now,
    cooldownUntil: new Date(now.getTime() + cooldownMs),
    refractoryCount: (assetStates.get(asset)?.refractoryCount || 0) + 1
  });
};

// Generate a signal for a specific vector
export const generateSignal = (vector: Vector): Signal | null => {
  const assets = ASSET_POOLS[vector];
  const session = getCurrentSession();
  const marketType: MarketType = vector === "OTC" ? "OTC" : "REAL";
  
  // Filter available assets (not on cooldown)
  const availableAssets = assets.filter(asset => !isAssetOnCooldown(asset));
  
  if (availableAssets.length === 0) return null;
  
  // Get eligible strategies for this vector
  const eligibleStrategies = STRATEGIES
    .filter(s => s.vector === vector || (marketType === "OTC" && s.marketType === "OTC"))
    .sort((a, b) => a.priority - b.priority);
  
  if (eligibleStrategies.length === 0) return null;
  
  // Probability check based on session
  const sessionWeight = getSessionWeight(session, vector);
  const probability = 0.1 + sessionWeight;
  
  if (Math.random() > probability) return null;
  
  // Select random asset and strategy
  const asset = availableAssets[Math.floor(Math.random() * availableAssets.length)];
  const strategy = eligibleStrategies[0]; // Use highest priority strategy
  
  // Generate T+4 timing
  const now = new Date();
  const executeAt = new Date(now.getTime() + 4 * 60 * 1000); // T+4 minutes
  
  const signal: Signal = {
    id: generateId(),
    asset,
    vector,
    marketType,
    strategy: strategy.name,
    direction: determineDirection(strategy.id),
    issuedAt: now,
    executeAt,
    timeframe: getTimeframe(marketType, vector),
    confidence: calculateConfidence(session, vector, strategy.priority),
    status: "PENDING",
    session
  };
  
  // Set cooldown for this asset
  setAssetCooldown(asset, vector);
  
  return signal;
};

// Scan all vectors and generate signals
export const scanAllVectors = (selectedVector?: Vector): Signal[] => {
  const signals: Signal[] = [];
  const vectorsToScan = selectedVector ? [selectedVector] : Object.keys(ASSET_POOLS) as Vector[];
  
  for (const vector of vectorsToScan) {
    const signal = generateSignal(vector);
    if (signal) {
      signals.push(signal);
    }
  }
  
  return signals;
};

// Check and update signal status
export const updateSignalStatus = (signal: Signal): Signal => {
  const now = new Date();
  const executeTime = new Date(signal.executeAt);
  const windowEnd = new Date(executeTime.getTime() + 20 * 1000); // 20 second window
  
  if (signal.status === "PENDING") {
    if (now >= executeTime && now <= windowEnd) {
      return { ...signal, status: "EXECUTED" };
    }
    if (now > windowEnd) {
      return { ...signal, status: "MISSED" };
    }
  }
  
  return signal;
};

// Reset all asset cooldowns
export const resetCooldowns = (): void => {
  assetStates.clear();
};
