// SENTINEL X - Signal Generation Engine (v5)
// Modular architecture: Session-lock, Asset cooldowns, T+4 Protocol, Cross-validation

import { 
  Signal, 
  Vector, 
  Direction, 
  Session, 
  ASSET_POOLS, 
  STRATEGIES, 
  SESSION_TIMES,
  Timeframe,
  MarketType
} from "@/types/trading";

// Import v2 modules
import { 
  lockToCurrentSession, 
  releaseSessionLock, 
  canScanInCurrentSession, 
  getSessionLockState,
  detectActiveSession 
} from "./sessionLock";
import { 
  setAssetCooldown as setCooldown, 
  isAssetOnCooldown as checkCooldown, 
  getAvailableAssets, 
  resetAllCooldowns,
  CooldownReason
} from "./assetCooldown";
import { 
  updateSignalWithMissedCheck, 
  acknowledgeSignal,
  clearAcknowledgments 
} from "./missedTradeHandler";
import { 
  validateOTCSignal, 
  adjustOTCConfidence, 
  enrichSignalWithMetadata,
  generateOTCAuditEntry,
  OTCAuditEntry
} from "./otcHonestyLayer";

// Audit log for transparency
const auditLog: OTCAuditEntry[] = [];

// Generate unique ID
const generateId = (): string => {
  return `SX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Get current trading session (using session lock module)
export const getCurrentSession = (): Session => {
  const lockState = getSessionLockState();
  if (lockState.isLocked && lockState.lockedSession) {
    return lockState.lockedSession;
  }
  return detectActiveSession();
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

// Check if session favors OTC trading
const sessionFavorsOTC = (session: Session): boolean => {
  // OTC is more favorable during off-hours or Asian session
  return session === "Tokyo" || session === "Sydney" || session === "Closed";
};

// Calculate confidence score with OTC honesty adjustments
const calculateConfidence = (
  session: Session, 
  vector: Vector, 
  strategyPriority: number,
  marketType: MarketType
): number => {
  const baseScore = 95;
  const sessionBonus = getSessionWeight(session, vector) * 20;
  const strategyBonus = (5 - strategyPriority) * 0.5;
  const randomVariance = (Math.random() - 0.5) * 2;
  
  let rawConfidence = Math.min(99.9, Math.max(95, baseScore + sessionBonus + strategyBonus + randomVariance));
  
  // Apply OTC honesty adjustments
  if (marketType === "OTC") {
    const { adjustedConfidence } = adjustOTCConfidence(
      rawConfidence / 100,
      marketType,
      false,  // volatility check would go here
      sessionFavorsOTC(session)
    );
    rawConfidence = adjustedConfidence * 100;
  }
  
  return rawConfidence;
};

// Determine direction based on strategy
const determineDirection = (strategyId: string): Direction => {
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

// Strategy eligibility matrix - validate strategy can run on this context
const isStrategyEligible = (
  strategyId: string, 
  vector: Vector, 
  marketType: MarketType,
  session: Session
): boolean => {
  // OTC-only strategies
  const otcOnlyStrategies = ["candle-exhaust", "time-cycle", "false-breakout", "snap-strategy"];
  if (otcOnlyStrategies.includes(strategyId) && marketType !== "OTC") {
    return false;
  }
  
  // Real-market-only strategies
  const realOnlyStrategies = ["ict-liquidity", "wyckoff", "smc-orderblocks", "liquidity-stop"];
  if (realOnlyStrategies.includes(strategyId) && marketType === "OTC") {
    return false;
  }
  
  // Session-based eligibility
  if (session === "Closed" && marketType === "REAL") {
    return false;  // No real market strategies when closed
  }
  
  return true;
};

// Generate a signal for a specific vector (v2 with full validation)
export const generateSignal = (vector: Vector): Signal | null => {
  const session = getCurrentSession();
  const marketType: MarketType = vector === "OTC" ? "OTC" : "REAL";
  
  // SESSION-LOCK ENFORCEMENT
  const scanCheck = canScanInCurrentSession();
  if (!scanCheck.canScan) {
    console.log(`[ENGINE] Scan blocked: ${scanCheck.reason}`);
    return null;
  }
  
  const assets = ASSET_POOLS[vector];
  
  // ASSET-LEVEL COOLDOWN CHECK
  const availableAssets = getAvailableAssets(assets, vector);
  
  if (availableAssets.length === 0) {
    console.log(`[ENGINE] No available assets for ${vector} - all on cooldown`);
    return null;
  }
  
  // Get eligible strategies with matrix validation
  const eligibleStrategies = STRATEGIES
    .filter(s => {
      const matchesVector = s.vector === vector || (marketType === "OTC" && s.marketType === "OTC");
      const isEligible = isStrategyEligible(s.id, vector, marketType, session);
      return matchesVector && isEligible;
    })
    .sort((a, b) => a.priority - b.priority);
  
  if (eligibleStrategies.length === 0) {
    console.log(`[ENGINE] No eligible strategies for ${vector} in ${session} session`);
    return null;
  }
  
  // Probability check based on session
  const sessionWeight = getSessionWeight(session, vector);
  const probability = 0.1 + sessionWeight;
  
  if (Math.random() > probability) return null;
  
  // Select random asset and highest priority strategy
  const asset = availableAssets[Math.floor(Math.random() * availableAssets.length)];
  const strategy = eligibleStrategies[0];
  
  // Generate T+4 timing
  const now = new Date();
  const executeAt = new Date(now.getTime() + 4 * 60 * 1000);
  
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
    confidence: calculateConfidence(session, vector, strategy.priority, marketType),
    status: "PENDING",
    session
  };
  
  // OTC HONESTY VALIDATION
  if (marketType === "OTC") {
    const validation = validateOTCSignal(signal);
    
    // Generate audit entry
    const auditEntry = generateOTCAuditEntry(signal);
    auditLog.push(auditEntry);
    
    if (!validation.isValid) {
      console.log(`[OTC-HONESTY] Signal rejected: ${validation.reason}`);
      return null;
    }
    
    // Apply adjusted confidence
    signal.confidence = validation.adjustedConfidence;
  }
  
  // Set cooldown for this asset (COMPLETION reason for new signals)
  setCooldown(asset, vector, "COMPLETION", signal.id);
  
  console.log(`[ENGINE] Signal generated: ${signal.id} - ${asset} ${signal.direction} (${signal.confidence.toFixed(1)}%)`);
  
  return signal;
};

// Scan all vectors and generate signals
export const scanAllVectors = (selectedVector?: Vector): Signal[] => {
  // Check session lock before scanning
  const scanCheck = canScanInCurrentSession();
  if (!scanCheck.canScan) {
    console.log(`[ENGINE] Scan blocked globally: ${scanCheck.reason}`);
    return [];
  }
  
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

// Check and update signal status (v2 with missed-trade detection)
export const updateSignalStatus = (signal: Signal): Signal => {
  return updateSignalWithMissedCheck(signal);
};

// Reset all cooldowns and session lock
export const resetCooldowns = (): void => {
  resetAllCooldowns();
  clearAcknowledgments();
};

// Start engine with session lock
export const startEngineWithSessionLock = (): { success: boolean; session: Session; reason: string } => {
  const lockState = lockToCurrentSession();
  
  if (lockState.lockedSession === "Closed") {
    return {
      success: false,
      session: "Closed",
      reason: "No active trading session - engine idle"
    };
  }
  
  return {
    success: true,
    session: lockState.lockedSession!,
    reason: `Engine locked to ${lockState.lockedSession} session`
  };
};

// Stop engine and release session lock
export const stopEngineWithSessionRelease = (): void => {
  releaseSessionLock();
  console.log("[ENGINE] Engine stopped, session lock released");
};

// Acknowledge signal execution (for missed-trade tracking)
export const acknowledgeSignalExecution = (signalId: string): boolean => {
  return acknowledgeSignal(signalId);
};

// Get audit log
export const getAuditLog = (): OTCAuditEntry[] => {
  return [...auditLog];
};

// Clear audit log
export const clearAuditLog = (): void => {
  auditLog.length = 0;
};

// Export session lock state getter
export { getSessionLockState, canScanInCurrentSession } from "./sessionLock";
