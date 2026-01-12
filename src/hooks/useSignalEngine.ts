// SENTINEL X PRIME - Signal Engine Hook

import { useState, useEffect, useCallback, useRef } from "react";
import { Signal, Vector, EngineStats, RiskGate } from "@/types/trading";
import { scanAllVectors, getCurrentSession, updateSignalStatus, resetCooldowns } from "@/engine/signalEngine";

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
  startEngine: () => void;
  stopEngine: () => void;
  pauseEngine: () => void;
  clearSignals: () => void;
  toggleRiskLock: () => void;
  setSelectedVector: (vector: Vector | undefined) => void;
}

export const useSignalEngine = (options: UseSignalEngineOptions = {}): UseSignalEngineReturn => {
  const { 
    scanInterval = 2000, 
    maxSignals = 50 
  } = options;

  const [signals, setSignals] = useState<Signal[]>([]);
  const [selectedVector, setSelectedVector] = useState<Vector | undefined>(options.selectedVector);
  const [isRunning, setIsRunning] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  
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
    engineStatus: "RUNNING",
    lastScanTime: new Date()
  });

  // Update signal statuses
  const updateSignals = useCallback(() => {
    setSignals(prev => prev.map(signal => updateSignalStatus(signal)));
  }, []);

  // Engine scan loop
  const runScan = useCallback(() => {
    if (riskGate.manualLock) return;
    if (riskGate.currentDailyTrades >= riskGate.maxDailyTrades) return;
    if (riskGate.currentConsecutiveLosses >= riskGate.maxConsecutiveLosses) return;

    const newSignals = scanAllVectors(selectedVector);
    
    if (newSignals.length > 0) {
      setSignals(prev => [...newSignals, ...prev].slice(0, maxSignals));
      setRiskGate(prev => ({
        ...prev,
        currentDailyTrades: prev.currentDailyTrades + newSignals.length
      }));
    }

    // Update stats
    setStats(prev => ({
      ...prev,
      totalSignals: prev.totalSignals + newSignals.length,
      activeSession: getCurrentSession(),
      lastScanTime: new Date()
    }));
  }, [selectedVector, maxSignals, riskGate]);

  // Start engine
  const startEngine = useCallback(() => {
    setIsRunning(true);
    setIsPaused(false);
    setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));
  }, []);

  // Stop engine
  const stopEngine = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setStats(prev => ({ ...prev, engineStatus: "STOPPED" }));
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

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
  }, []);

  // Toggle risk lock
  const toggleRiskLock = useCallback(() => {
    setRiskGate(prev => ({
      ...prev,
      manualLock: !prev.manualLock
    }));
  }, []);

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
    const wins = signals.filter(s => s.result === "WIN").length;
    const total = signals.filter(s => s.result).length;
    
    setStats(prev => ({
      ...prev,
      pendingSignals: pending,
      executedSignals: executed,
      winRate: total > 0 ? (wins / total) * 100 : 0
    }));
  }, [signals]);

  return {
    signals,
    stats,
    riskGate,
    isRunning: isRunning && !isPaused,
    startEngine,
    stopEngine,
    pauseEngine,
    clearSignals,
    toggleRiskLock,
    setSelectedVector
  };
};
