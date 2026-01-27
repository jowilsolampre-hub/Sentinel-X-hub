// SENTINEL X - T+4 Protocol (Timing Discipline)
// 4-minute preparation window before exact entry time
// Synced to Africa/Lusaka timezone, locked to broker candle boundaries

import { Timeframe } from "@/types/trading";

// T+4 Protocol Configuration
export interface T4Config {
  prepMinutes: number;           // Preparation time (default: 4)
  toleranceSeconds: number;      // Candle boundary tolerance (±2s)
  executionWindowSeconds: number; // Manual execution window (12s)
  timezone: string;              // Africa/Lusaka
}

export const DEFAULT_T4_CONFIG: T4Config = {
  prepMinutes: 4,
  toleranceSeconds: 2,
  executionWindowSeconds: 12,
  timezone: "Africa/Lusaka"
};

// T+4 Signal State
export interface T4Signal {
  id: string;
  symbol: string;
  direction: "BUY" | "SELL";
  issuedAt: Date;
  prepEndAt: Date;      // When prep period ends
  executeAt: Date;      // Exact entry time (candle boundary)
  expiresAt: Date;      // When execution window closes
  stage: "CANDIDATE" | "CONFIRM" | "FINAL" | "EXECUTED" | "EXPIRED" | "CANCELLED";
  candleTimeframe: Timeframe;
  confidence: number;
}

// Calculate T+4 timing from issue time
export const calculateT4Timing = (
  issueTime: Date,
  timeframe: Timeframe,
  config: T4Config = DEFAULT_T4_CONFIG
): { prepEndAt: Date; executeAt: Date; expiresAt: Date } => {
  const tfSeconds = getTimeframeSeconds(timeframe);
  
  // Find next candle boundary
  const issueTimestamp = issueTime.getTime();
  const tfMs = tfSeconds * 1000;
  const candleStart = Math.floor(issueTimestamp / tfMs) * tfMs;
  
  // Calculate the target candle (must be at least 4 minutes away)
  const minExecuteTime = issueTimestamp + (config.prepMinutes * 60 * 1000);
  let targetCandleStart = candleStart + tfMs;
  
  while (targetCandleStart < minExecuteTime) {
    targetCandleStart += tfMs;
  }
  
  const prepEndAt = new Date(targetCandleStart - (config.toleranceSeconds * 1000));
  const executeAt = new Date(targetCandleStart);
  const expiresAt = new Date(targetCandleStart + (config.executionWindowSeconds * 1000));
  
  return { prepEndAt, executeAt, expiresAt };
};

// Get timeframe in seconds
export const getTimeframeSeconds = (tf: Timeframe): number => {
  const map: Record<Timeframe, number> = {
    "1M": 60,
    "5M": 300,
    "15M": 900,
    "30M": 1800,
    "1H": 3600,
    "4H": 14400,
    "1D": 86400
  };
  return map[tf] || 60;
};

// Create a T+4 signal
export const createT4Signal = (
  id: string,
  symbol: string,
  direction: "BUY" | "SELL",
  timeframe: Timeframe,
  confidence: number,
  config: T4Config = DEFAULT_T4_CONFIG
): T4Signal => {
  const now = new Date();
  const timing = calculateT4Timing(now, timeframe, config);
  
  return {
    id,
    symbol,
    direction,
    issuedAt: now,
    prepEndAt: timing.prepEndAt,
    executeAt: timing.executeAt,
    expiresAt: timing.expiresAt,
    stage: "CANDIDATE",
    candleTimeframe: timeframe,
    confidence
  };
};

// Check if signal is in prep phase
export const isInPrepPhase = (signal: T4Signal): boolean => {
  const now = Date.now();
  return now < signal.prepEndAt.getTime() && signal.stage !== "CANCELLED";
};

// Check if signal is ready for execution
export const isReadyToExecute = (signal: T4Signal): boolean => {
  const now = Date.now();
  return (
    now >= signal.prepEndAt.getTime() &&
    now <= signal.expiresAt.getTime() &&
    signal.stage === "FINAL"
  );
};

// Check if signal has expired
export const isExpired = (signal: T4Signal): boolean => {
  const now = Date.now();
  return now > signal.expiresAt.getTime() && signal.stage !== "EXECUTED";
};

// Get remaining prep time in seconds
export const getRemainingPrepTime = (signal: T4Signal): number => {
  const now = Date.now();
  const remaining = signal.prepEndAt.getTime() - now;
  return Math.max(0, Math.floor(remaining / 1000));
};

// Get remaining execution window in seconds
export const getRemainingExecutionTime = (signal: T4Signal): number => {
  const now = Date.now();
  const remaining = signal.expiresAt.getTime() - now;
  return Math.max(0, Math.floor(remaining / 1000));
};

// Format time for display (Africa/Lusaka)
export const formatLusakaTime = (date: Date): string => {
  // Africa/Lusaka is CAT (UTC+2)
  const offset = 2 * 60; // UTC+2 in minutes
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  const lusakaTime = new Date(utcTime + (offset * 60000));
  
  return lusakaTime.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
};

// Validate candle boundary alignment
export const validateCandleBoundary = (
  targetTime: Date,
  timeframe: Timeframe,
  toleranceSeconds: number = DEFAULT_T4_CONFIG.toleranceSeconds
): { valid: boolean; offset: number; reason: string } => {
  const tfSeconds = getTimeframeSeconds(timeframe);
  const tfMs = tfSeconds * 1000;
  const targetMs = targetTime.getTime();
  
  // Calculate expected candle boundary
  const expectedBoundary = Math.round(targetMs / tfMs) * tfMs;
  const offset = Math.abs(targetMs - expectedBoundary) / 1000;
  
  if (offset <= toleranceSeconds) {
    return {
      valid: true,
      offset,
      reason: `Within ±${toleranceSeconds}s tolerance (${offset.toFixed(1)}s offset)`
    };
  }
  
  return {
    valid: false,
    offset,
    reason: `Outside tolerance: ${offset.toFixed(1)}s offset (max: ±${toleranceSeconds}s)`
  };
};

// T+4 Signal Manager
class T4SignalManager {
  private signals: Map<string, T4Signal> = new Map();
  private listeners: ((signal: T4Signal) => void)[] = [];

  add(signal: T4Signal): void {
    this.signals.set(signal.id, signal);
    this.notifyListeners(signal);
  }

  get(id: string): T4Signal | undefined {
    return this.signals.get(id);
  }

  updateStage(id: string, stage: T4Signal["stage"]): void {
    const signal = this.signals.get(id);
    if (signal) {
      signal.stage = stage;
      this.notifyListeners(signal);
    }
  }

  confirm(id: string): void {
    this.updateStage(id, "CONFIRM");
  }

  finalize(id: string): void {
    this.updateStage(id, "FINAL");
  }

  execute(id: string): void {
    this.updateStage(id, "EXECUTED");
  }

  cancel(id: string): void {
    this.updateStage(id, "CANCELLED");
  }

  expire(id: string): void {
    this.updateStage(id, "EXPIRED");
  }

  getActive(): T4Signal[] {
    const now = Date.now();
    return Array.from(this.signals.values()).filter(s => 
      s.stage !== "EXECUTED" && 
      s.stage !== "CANCELLED" && 
      s.stage !== "EXPIRED" &&
      now <= s.expiresAt.getTime()
    );
  }

  getPending(): T4Signal[] {
    return this.getActive().filter(s => s.stage === "CANDIDATE" || s.stage === "CONFIRM");
  }

  getReadyToExecute(): T4Signal[] {
    return this.getActive().filter(s => isReadyToExecute(s));
  }

  onUpdate(callback: (signal: T4Signal) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(signal: T4Signal): void {
    this.listeners.forEach(l => l(signal));
  }

  // Auto-expire check
  checkExpired(): void {
    const now = Date.now();
    this.signals.forEach(signal => {
      if (now > signal.expiresAt.getTime() && 
          signal.stage !== "EXECUTED" && 
          signal.stage !== "CANCELLED" &&
          signal.stage !== "EXPIRED") {
        this.expire(signal.id);
      }
    });
  }

  clear(): void {
    this.signals.clear();
  }
}

// Singleton instance
export const t4Manager = new T4SignalManager();

// Auto-check expired signals every second
setInterval(() => t4Manager.checkExpired(), 1000);

// Multi-Timeframe Analysis Support
export interface MTFAnalysis {
  bias: {
    timeframe: "1H" | "30M";
    direction: "BUY" | "SELL" | "NEUTRAL";
  };
  structure: {
    timeframe: "15M";
    confirmed: boolean;
  };
  setup: {
    timeframe: "5M";
    valid: boolean;
  };
  entry: {
    timeframe: "1M";
    triggered: boolean;
  };
  overallValid: boolean;
}

export const runMTFAnalysis = (): MTFAnalysis => {
  // Simulated MTF analysis (in real implementation, would analyze actual candles)
  const biasDirection = Math.random() > 0.5 ? "BUY" : Math.random() > 0.3 ? "SELL" : "NEUTRAL";
  const structureConfirmed = biasDirection !== "NEUTRAL" && Math.random() > 0.3;
  const setupValid = structureConfirmed && Math.random() > 0.4;
  const entryTriggered = setupValid && Math.random() > 0.5;
  
  return {
    bias: { timeframe: "1H", direction: biasDirection as "BUY" | "SELL" | "NEUTRAL" },
    structure: { timeframe: "15M", confirmed: structureConfirmed },
    setup: { timeframe: "5M", valid: setupValid },
    entry: { timeframe: "1M", triggered: entryTriggered },
    overallValid: entryTriggered
  };
};
