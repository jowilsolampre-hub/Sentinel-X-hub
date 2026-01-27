// SENTINEL X - Missed Trade Invalidation Logic (v5)
// If execution window expires without acknowledgment, signal becomes MISSED

import { Signal, SignalStatus } from "@/types/trading";
import { setAssetCooldown } from "./assetCooldown";

export interface MissedTradeResult {
  signal: Signal;
  reason: string;
  missedAt: Date;
  windowDuration: number;
}

// Configuration
const EXECUTION_WINDOW_MS = 20000;  // 20 seconds to execute
const GRACE_PERIOD_MS = 5000;       // 5 second grace period before invalidation

// Track acknowledged signals
const acknowledgedSignals: Set<string> = new Set();

// Acknowledge a signal (admin/bot confirmed entry)
export const acknowledgeSignal = (signalId: string): boolean => {
  if (acknowledgedSignals.has(signalId)) {
    return false; // Already acknowledged
  }
  
  acknowledgedSignals.add(signalId);
  console.log(`[MISSED-TRADE] Signal ${signalId} acknowledged`);
  return true;
};

// Check if signal was acknowledged
export const isSignalAcknowledged = (signalId: string): boolean => {
  return acknowledgedSignals.has(signalId);
};

// Check if signal has missed its execution window
export const checkMissedTrade = (signal: Signal): MissedTradeResult | null => {
  if (signal.status !== "PENDING" && signal.status !== "EXECUTED") {
    return null;
  }
  
  const now = new Date();
  const executeTime = new Date(signal.executeAt);
  const windowEnd = new Date(executeTime.getTime() + EXECUTION_WINDOW_MS + GRACE_PERIOD_MS);
  
  // Not yet past execution window
  if (now <= windowEnd) {
    return null;
  }
  
  // Signal was acknowledged - not missed
  if (acknowledgedSignals.has(signal.id)) {
    return null;
  }
  
  // Signal is MISSED
  return {
    signal,
    reason: "Execution window expired without acknowledgment",
    missedAt: now,
    windowDuration: EXECUTION_WINDOW_MS
  };
};

// Process missed trade and update signal
export const processMissedTrade = (signal: Signal): Signal => {
  const missedResult = checkMissedTrade(signal);
  
  if (!missedResult) {
    return signal;
  }
  
  // Set cooldown for the asset due to missed trade
  setAssetCooldown(signal.asset, signal.vector, "INVALIDATION", signal.id);
  
  console.log(`[MISSED-TRADE] Signal ${signal.id} for ${signal.asset} marked as MISSED`);
  console.log(`[MISSED-TRADE] Reason: ${missedResult.reason}`);
  
  // Return updated signal with MISSED status
  return {
    ...signal,
    status: "MISSED" as SignalStatus,
    result: "MISS"
  };
};

// Update signal status with missed trade detection
export const updateSignalWithMissedCheck = (signal: Signal): Signal => {
  const now = new Date();
  const executeTime = new Date(signal.executeAt);
  const windowEnd = new Date(executeTime.getTime() + EXECUTION_WINDOW_MS);
  const graceEnd = new Date(windowEnd.getTime() + GRACE_PERIOD_MS);
  
  // Still pending and not at execution time
  if (signal.status === "PENDING" && now < executeTime) {
    return signal;
  }
  
  // Within execution window
  if (signal.status === "PENDING" && now >= executeTime && now <= windowEnd) {
    return { ...signal, status: "EXECUTED" };
  }
  
  // Past execution window - check for missed trade
  if (now > graceEnd && signal.status !== "MISSED" && signal.status !== "INVALIDATED") {
    return processMissedTrade(signal);
  }
  
  return signal;
};

// Get all missed trades from signal list
export const getMissedTrades = (signals: Signal[]): Signal[] => {
  return signals.filter(s => s.status === "MISSED" || s.result === "MISS");
};

// Clear acknowledgment history
export const clearAcknowledgments = (): void => {
  const count = acknowledgedSignals.size;
  acknowledgedSignals.clear();
  console.log(`[MISSED-TRADE] Cleared ${count} acknowledgments`);
};

// Get execution window status
export const getExecutionWindowStatus = (signal: Signal): {
  isInWindow: boolean;
  isExpired: boolean;
  remainingMs: number;
  phase: "PRE_EXECUTION" | "EXECUTING" | "GRACE" | "EXPIRED";
} => {
  const now = new Date();
  const executeTime = new Date(signal.executeAt);
  const windowEnd = new Date(executeTime.getTime() + EXECUTION_WINDOW_MS);
  const graceEnd = new Date(windowEnd.getTime() + GRACE_PERIOD_MS);
  
  if (now < executeTime) {
    return {
      isInWindow: false,
      isExpired: false,
      remainingMs: executeTime.getTime() - now.getTime(),
      phase: "PRE_EXECUTION"
    };
  }
  
  if (now >= executeTime && now <= windowEnd) {
    return {
      isInWindow: true,
      isExpired: false,
      remainingMs: windowEnd.getTime() - now.getTime(),
      phase: "EXECUTING"
    };
  }
  
  if (now > windowEnd && now <= graceEnd) {
    return {
      isInWindow: false,
      isExpired: false,
      remainingMs: graceEnd.getTime() - now.getTime(),
      phase: "GRACE"
    };
  }
  
  return {
    isInWindow: false,
    isExpired: true,
    remainingMs: 0,
    phase: "EXPIRED"
  };
};
