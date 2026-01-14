// SENTINEL X PRIME - Signal Engine Hook (v2 PATCHED)
// Includes: Session-lock, Asset cooldowns, Missed-trade invalidation, OTC honesty

import { useState, useEffect, useCallback, useRef } from "react";
import { Signal, Vector, EngineStats, RiskGate, Session } from "@/types/trading";
import { 
  scanAllVectors, 
  getCurrentSession, 
  updateSignalStatus, 
  resetCooldowns,
  startEngineWithSessionLock,
  stopEngineWithSessionRelease,
  acknowledgeSignalExecution,
  getSessionLockState,
  canScanInCurrentSession
} from "@/engine/signalEngine";
import { getAllCooldowns } from "@/engine/assetCooldown";
import { clearHistory as clearPerformanceHistory } from "@/engine/performanceTracker";

interface SessionLockInfo {
  isLocked: boolean;
  lockedSession: Session | null;
  lockTime: Date | null;
  canScan: boolean;
  scanBlockReason: string;
}

interface UseSignalEngineOptions {
  selectedVector?: Vector;
  scanInterval?: number;
  maxSignals?: number;
}

interface UseSignalEngineReturn {
  signals: Signal[];
  stats: EngineStats;
  riskGate: RiskGate;
  isRunning: boolean;
  sessionLock: SessionLockInfo;
  activeCooldowns: number;
  pendingAcknowledgment: Signal | null;
  startEngine: () => { success: boolean; reason: string };
  stopEngine: () => void;
  pauseEngine: () => void;
  clearSignals: () => void;
  toggleRiskLock: () => void;
  setSelectedVector: (vector: Vector | undefined) => void;
  acknowledgeSignal: (signalId: string) => void;
  cancelSignal: (signalId: string) => void;
  clearAllHistory: () => void;
}

export const useSignalEngine = (options: UseSignalEngineOptions = {}): UseSignalEngineReturn => {
  const { 
    scanInterval = 2000, 
    maxSignals = 50 
  } = options;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedVector, setSelectedVector] = useState<Vector | undefined>(options.selectedVector);
  const [isRunning, setIsRunning] = useState(false);  // Start stopped (require explicit start)
  const [isPaused, setIsPaused] = useState(false);
  const [activeCooldowns, setActiveCooldowns] = useState(0);
  const [pendingAcknowledgment, setPendingAcknowledgment] = useState<Signal | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
  const [sessionLock, setSessionLock] = useState<SessionLockInfo>({
    isLocked: false,
    lockedSession: null,
    lockTime: null,
    canScan: false,
    scanBlockReason: "Engine not started"
  });
  
  const [riskGate, setRiskGate] = useState<RiskGate>({
    manualLock: false,
    maxDailyTrades: 50,
    currentDailyTrades: 0,
    maxConsecutiveLosses: 3,
    currentConsecutiveLosses: 0,
    maxDailyLoss: 500,
    currentDailyLoss: 0
  });

  const [stats, setStats] = useState<EngineStats>({
    totalSignals: 0,
    pendingSignals: 0,
    executedSignals: 0,
    winRate: 0,
    activeSession: getCurrentSession(),
    engineStatus: "STOPPED",
    lastScanTime: new Date()
  });

  // Update session lock state
  const updateSessionLockState = useCallback(() => {
    const lockState = getSessionLockState();
    const scanCheck = canScanInCurrentSession();
    
    setSessionLock({
      isLocked: lockState.isLocked,
      lockedSession: lockState.lockedSession,
      lockTime: lockState.lockTime,
      canScan: scanCheck.canScan,
      scanBlockReason: scanCheck.reason
    });
  }, []);

  // Update signal statuses (with missed-trade detection)
  const updateSignals = useCallback(() => {
    setSignals(prev => prev.map(signal => updateSignalStatus(signal)));
  }, []);

  // Update cooldown count
  const updateCooldownCount = useCallback(() => {
    const cooldowns = getAllCooldowns();
    setActiveCooldowns(cooldowns.length);
  }, []);

  // Engine scan loop
  const runScan = useCallback(() => {
    // CRITICAL: Don't scan if waiting for acknowledgment
    if (pendingAcknowledgment) {
      console.log(`[HOOK] Scan paused: Waiting for signal acknowledgment`);
      return;
    }
    
    if (riskGate.manualLock) return;
    if (riskGate.currentDailyTrades >= riskGate.maxDailyTrades) return;
    if (riskGate.currentConsecutiveLosses >= riskGate.maxConsecutiveLosses) return;

    // Check session lock before scanning
    const scanCheck = canScanInCurrentSession();
    if (!scanCheck.canScan) {
      console.log(`[HOOK] Scan blocked: ${scanCheck.reason}`);
      updateSessionLockState();
      return;
    }

    const newSignals = scanAllVectors(selectedVector);
    
    if (newSignals.length > 0) {
      // Take only the first signal and set it as pending acknowledgment
      const topSignal = newSignals[0];
      setPendingAcknowledgment(topSignal);
      setSignals(prev => [topSignal, ...prev].slice(0, maxSignals));
      setRiskGate(prev => ({
        ...prev,
        currentDailyTrades: prev.currentDailyTrades + 1
      }));
      
      // Update stats
      setStats(prev => ({
        ...prev,
        totalSignals: prev.totalSignals + 1,
        activeSession: getCurrentSession(),
        lastScanTime: new Date(),
        engineStatus: "AWAITING_ACK"
      }));
    } else {
      // Update stats even if no signals
      setStats(prev => ({
        ...prev,
        activeSession: getCurrentSession(),
        lastScanTime: new Date()
      }));
    }
    
    updateCooldownCount();
    updateSessionLockState();
  }, [selectedVector, maxSignals, riskGate, pendingAcknowledgment, updateSessionLockState, updateCooldownCount]);

  // Start engine with session lock
  const startEngine = useCallback(() => {
    const result = startEngineWithSessionLock();
    
    if (result.success) {
      setIsRunning(true);
      setIsPaused(false);
      setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));
    }
    
    updateSessionLockState();
    
    return { success: result.success, reason: result.reason };
  }, [updateSessionLockState]);

  // Stop engine with session release
  const stopEngine = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    stopEngineWithSessionRelease();
    setStats(prev => ({ ...prev, engineStatus: "STOPPED" }));
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    updateSessionLockState();
  }, [updateSessionLockState]);

  // Pause engine
  const pauseEngine = useCallback(() => {
    setIsPaused(true);
    setStats(prev => ({ ...prev, engineStatus: "PAUSED" }));
  }, []);

  // Clear signals
  const clearSignals = useCallback(() => {
    setSignals([]);
    resetCooldowns();
    setRiskGate(prev => ({
      ...prev,
      currentDailyTrades: 0,
      currentConsecutiveLosses: 0,
      currentDailyLoss: 0
    }));
    updateCooldownCount();
  }, [updateCooldownCount]);

  // Toggle risk lock
  const toggleRiskLock = useCallback(() => {
    setRiskGate(prev => ({
      ...prev,
      manualLock: !prev.manualLock
    }));
  }, []);

  // Acknowledge signal - marks as executed and resumes scanning
  const acknowledgeSignal = useCallback((signalId: string): void => {
    acknowledgeSignalExecution(signalId);
    setSignals(prev => prev.map(s => 
      s.id === signalId ? { ...s, status: "EXECUTED" as const } : s
    ));
    setPendingAcknowledgment(null);
    setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));
    console.log(`[HOOK] Signal ${signalId} acknowledged - resuming scan`);
  }, []);

  // Cancel signal - removes it and resumes scanning
  const cancelSignal = useCallback((signalId: string): void => {
    setSignals(prev => prev.filter(s => s.id !== signalId));
    setPendingAcknowledgment(null);
    setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));
    console.log(`[HOOK] Signal ${signalId} cancelled - resuming scan`);
  }, []);

  // Clear all history (signals + performance tracker)
  const clearAllHistory = useCallback(() => {
    setSignals([]);
    resetCooldowns();
    clearPerformanceHistory();
    setRiskGate(prev => ({
      ...prev,
      currentDailyTrades: 0,
      currentConsecutiveLosses: 0,
      currentDailyLoss: 0
    }));
    setStats(prev => ({
      ...prev,
      totalSignals: 0,
      pendingSignals: 0,
      executedSignals: 0,
      winRate: 0
    }));
    updateCooldownCount();
  }, [updateCooldownCount]);

  // Main effect for engine loop
  useEffect(() => {
    if (isRunning && !isPaused) {
      intervalRef.current = setInterval(() => {
        runScan();
        updateSignals();
      }, scanInterval);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, isPaused, scanInterval, runScan, updateSignals]);

  // Update stats based on signals
  useEffect(() => {
    const pending = signals.filter(s => s.status === "PENDING").length;
    const executed = signals.filter(s => s.status === "EXECUTED").length;
    const missed = signals.filter(s => s.status === "MISSED").length;
    const wins = signals.filter(s => s.result === "WIN").length;
    const total = signals.filter(s => s.result).length;
    
    setStats(prev => ({
      ...prev,
      pendingSignals: pending,
      executedSignals: executed,
      winRate: total > 0 ? (wins / total) * 100 : 0
    }));
  }, [signals]);

  // Initialize session state on mount
  useEffect(() => {
    updateSessionLockState();
  }, [updateSessionLockState]);

  return {
    signals,
    stats,
    riskGate,
    isRunning: isRunning && !isPaused,
    sessionLock,
    activeCooldowns,
    pendingAcknowledgment,
    startEngine,
    stopEngine,
    pauseEngine,
    clearSignals,
    toggleRiskLock,
    setSelectedVector,
    acknowledgeSignal,
    cancelSignal,
    clearAllHistory
  };
};
