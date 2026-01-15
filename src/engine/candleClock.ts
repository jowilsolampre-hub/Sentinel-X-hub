// SENTINEL X PRIME - Candle Clock (Broker-Aligned Timing)
// Ensures signals are issued and executed at exact candle boundaries
// ±2 second tolerance for professional-grade accuracy

import { Timeframe } from "@/types/trading";

export interface CandleClockState {
  currentCandleStart: Date;
  nextCandleStart: Date;
  timeframe: Timeframe;
  secondsUntilNextCandle: number;
  secondsIntoCurrentCandle: number;
  isAtBoundary: boolean;
  syncQuality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
}

export interface T4ProtocolTiming {
  signalTime: Date;      // When signal is issued (T+0)
  prepEndTime: Date;     // End of prep window (T+3:55)
  executeTime: Date;     // Exact entry time (T+4)
  expiryTime: Date;      // Trade expiry
  timeframe: Timeframe;
  prepSeconds: number;
  expirySeconds: number;
  isValid: boolean;
  syncedToCandle: boolean;
}

// Timeframe to milliseconds mapping
const TIMEFRAME_MS: Record<Timeframe, number> = {
  "1M": 60 * 1000,
  "5M": 5 * 60 * 1000,
  "15M": 15 * 60 * 1000,
  "30M": 30 * 60 * 1000,
  "1H": 60 * 60 * 1000,
  "4H": 4 * 60 * 60 * 1000,
  "1D": 24 * 60 * 60 * 1000,
};

// Boundary tolerance in milliseconds (±2 seconds)
const BOUNDARY_TOLERANCE_MS = 2000;

// Get the start of the current candle for a given timeframe
export const getCandleStart = (time: Date, timeframe: Timeframe): Date => {
  const ms = time.getTime();
  const tfMs = TIMEFRAME_MS[timeframe];
  const candleStartMs = Math.floor(ms / tfMs) * tfMs;
  return new Date(candleStartMs);
};

// Get the start of the next candle
export const getNextCandleStart = (time: Date, timeframe: Timeframe): Date => {
  const currentStart = getCandleStart(time, timeframe);
  return new Date(currentStart.getTime() + TIMEFRAME_MS[timeframe]);
};

// Check if current time is at a candle boundary (within tolerance)
export const isAtCandleBoundary = (time: Date, timeframe: Timeframe): boolean => {
  const candleStart = getCandleStart(time, timeframe);
  const timeSinceBoundary = Math.abs(time.getTime() - candleStart.getTime());
  return timeSinceBoundary <= BOUNDARY_TOLERANCE_MS;
};

// Get current candle clock state
export const getCandleClockState = (timeframe: Timeframe = "5M"): CandleClockState => {
  const now = new Date();
  const currentCandleStart = getCandleStart(now, timeframe);
  const nextCandleStart = getNextCandleStart(now, timeframe);
  
  const msIntoCandle = now.getTime() - currentCandleStart.getTime();
  const msUntilNext = nextCandleStart.getTime() - now.getTime();
  
  const secondsIntoCurrentCandle = Math.floor(msIntoCandle / 1000);
  const secondsUntilNextCandle = Math.floor(msUntilNext / 1000);
  
  const isAtBoundary = isAtCandleBoundary(now, timeframe);
  
  // Calculate sync quality
  let syncQuality: CandleClockState["syncQuality"] = "GOOD";
  if (secondsUntilNextCandle <= 2 || secondsIntoCurrentCandle <= 2) {
    syncQuality = "EXCELLENT";
  } else if (secondsUntilNextCandle <= 10 || secondsIntoCurrentCandle <= 10) {
    syncQuality = "GOOD";
  } else if (secondsUntilNextCandle <= 30) {
    syncQuality = "FAIR";
  } else {
    syncQuality = "POOR";
  }
  
  return {
    currentCandleStart,
    nextCandleStart,
    timeframe,
    secondsUntilNextCandle,
    secondsIntoCurrentCandle,
    isAtBoundary,
    syncQuality
  };
};

// Calculate T+4 Protocol timing (aligned to candle boundaries)
export const calculateT4Timing = (
  timeframe: Timeframe = "5M",
  prepMinutes: number = 4
): T4ProtocolTiming => {
  const now = new Date();
  const tfMs = TIMEFRAME_MS[timeframe];
  
  // For OTC (1M/5M), we sync to the candle cycle
  // Signal is issued now, execution is at the next aligned candle after prep period
  
  // Calculate the execute time: now + prepMinutes, aligned to next candle
  const rawExecuteTime = new Date(now.getTime() + prepMinutes * 60 * 1000);
  const executeTime = getNextCandleStart(rawExecuteTime, timeframe);
  
  // Prep ends 5 seconds before execute
  const prepEndTime = new Date(executeTime.getTime() - 5000);
  
  // Expiry based on timeframe
  let expirySeconds = 60; // Default 1 minute for OTC
  if (timeframe === "5M") expirySeconds = 300;
  if (timeframe === "15M") expirySeconds = 900;
  if (timeframe === "30M") expirySeconds = 1800;
  if (timeframe === "1H") expirySeconds = 3600;
  
  const expiryTime = new Date(executeTime.getTime() + expirySeconds * 1000);
  
  // Validate timing
  const prepSeconds = Math.floor((executeTime.getTime() - now.getTime()) / 1000);
  const isValid = prepSeconds >= 180 && prepSeconds <= 300; // 3-5 minutes prep is valid
  
  // Check if properly synced to candle
  const syncedToCandle = isAtCandleBoundary(executeTime, timeframe);
  
  return {
    signalTime: now,
    prepEndTime,
    executeTime,
    expiryTime,
    timeframe,
    prepSeconds,
    expirySeconds,
    isValid,
    syncedToCandle
  };
};

// Get optimal signal window (when to issue signals for best timing)
export const getOptimalSignalWindow = (timeframe: Timeframe): {
  isOptimal: boolean;
  reason: string;
  secondsUntilOptimal: number;
} => {
  const state = getCandleClockState(timeframe);
  const tfSeconds = TIMEFRAME_MS[timeframe] / 1000;
  
  // Optimal window: within first 20 seconds of candle OR 4+ minutes before next candle
  const earlyWindow = state.secondsIntoCurrentCandle <= 20;
  const prepWindow = state.secondsUntilNextCandle >= 240; // 4+ minutes
  
  if (earlyWindow) {
    return {
      isOptimal: true,
      reason: "Early candle window - optimal for signal issuance",
      secondsUntilOptimal: 0
    };
  }
  
  if (prepWindow) {
    return {
      isOptimal: true,
      reason: "Sufficient prep time for T+4 execution",
      secondsUntilOptimal: 0
    };
  }
  
  // Calculate seconds until next optimal window
  const secondsUntilOptimal = state.secondsUntilNextCandle;
  
  return {
    isOptimal: false,
    reason: `Wait ${secondsUntilOptimal}s for next candle open`,
    secondsUntilOptimal
  };
};

// Format countdown display
export const formatCountdown = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Get candle progress percentage
export const getCandleProgress = (timeframe: Timeframe): number => {
  const state = getCandleClockState(timeframe);
  const tfSeconds = TIMEFRAME_MS[timeframe] / 1000;
  return (state.secondsIntoCurrentCandle / tfSeconds) * 100;
};

// Wait for next candle boundary (returns promise that resolves at boundary)
export const waitForCandleBoundary = (timeframe: Timeframe): Promise<Date> => {
  return new Promise((resolve) => {
    const state = getCandleClockState(timeframe);
    if (state.isAtBoundary) {
      resolve(new Date());
      return;
    }
    
    setTimeout(() => {
      resolve(state.nextCandleStart);
    }, state.secondsUntilNextCandle * 1000);
  });
};

// Validate signal timing for broker alignment
export const validateSignalTiming = (
  executeAt: Date,
  timeframe: Timeframe
): { valid: boolean; reason: string; adjustment?: Date } => {
  const isAligned = isAtCandleBoundary(executeAt, timeframe);
  
  if (isAligned) {
    return { valid: true, reason: "Execution aligned to candle boundary" };
  }
  
  // Suggest adjustment
  const adjustedTime = getNextCandleStart(executeAt, timeframe);
  return {
    valid: false,
    reason: "Execution not aligned - adjustment recommended",
    adjustment: adjustedTime
  };
};

// Get all candle boundaries in a time range (for scheduling)
export const getCandleBoundaries = (
  start: Date,
  end: Date,
  timeframe: Timeframe
): Date[] => {
  const boundaries: Date[] = [];
  let current = getCandleStart(start, timeframe);
  
  while (current.getTime() <= end.getTime()) {
    if (current.getTime() >= start.getTime()) {
      boundaries.push(new Date(current));
    }
    current = new Date(current.getTime() + TIMEFRAME_MS[timeframe]);
  }
  
  return boundaries;
};
