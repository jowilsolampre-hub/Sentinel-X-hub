// SENTINEL X - Signal Engine Hook (v5 PROTOCOL)
// STRICT PROTOCOL: 45s-1min analysis → Signal pop → T+4 entry timing
// Respects ALL selected options: market category, vector, timeframe

import { useState, useEffect, useCallback, useRef } from "react";
import { Signal, Vector, EngineStats, RiskGate, Session } from "@/types/trading";
import { MarketCategory } from "@/components/trading/MarketCategorySelector";
import { TimeframeOption } from "@/components/trading/TimeframeSelector";
import { 
  getCurrentSession, 
  updateSignalStatus, 
  resetCooldowns,
  startEngineWithSessionLock,
  stopEngineWithSessionRelease,
  acknowledgeSignalExecution,
  getSessionLockState,
  canScanInCurrentSession
} from "@/engine/signalEngine";
import { protocolScan, getScanState, resetScanState, ScanConfig } from "@/engine/protocolEngine";
import { initializeAllBrokers } from "@/engine/fastBrokerBridge";
import { getAllCooldowns } from "@/engine/assetCooldown";
import { clearHistory as clearPerformanceHistory } from "@/engine/performanceTracker";

// Desktop notification helper
const sendDesktopNotification = (signal: Signal) => {
  if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
    const notification = new Notification(`🚀 ${signal.direction} Signal: ${signal.asset}`, {
      body: `Confidence: ${signal.confidence.toFixed(1)}% | Strategy: ${signal.strategy}\nExecute at: ${signal.executeAt.toLocaleTimeString()}`,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `signal-${signal.id}`,
      requireInteraction: true,
      silent: false
    });

    notification.onclick = () => {
      window.focus();
      notification.close();
    };

    setTimeout(() => notification.close(), 60000);
  }
};

interface SessionLockInfo {
  isLocked: boolean;
  lockedSession: Session | null;
  lockTime: Date | null;
  canScan: boolean;
  scanBlockReason: string;
}

export interface UseSignalEngineOptions {
  selectedVector?: Vector;
  marketCategory?: MarketCategory;
  timeframe?: TimeframeOption;
  selectedPairs?: string[];
  maxSignals?: number;
}

interface UseSignalEngineReturn {
  signals: Signal[];
  stats: EngineStats;
  riskGate: RiskGate;
  isRunning: boolean;
  isScanning: boolean;
  scanProgress: number;
  scanPhase: string;
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
  updateConfig: (config: Partial<UseSignalEngineOptions>) => void;
}

export const useSignalEngine = (options: UseSignalEngineOptions = {}): UseSignalEngineReturn => {
  const { maxSignals = 50 } = options;

  // === STATE ===
  const [signals, setSignals] = useState<Signal[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [scanPhase, setScanPhase] = useState<string>("IDLE");
  const [activeCooldowns, setActiveCooldowns] = useState(0);
  const [pendingAcknowledgment, setPendingAcknowledgment] = useState<Signal | null>(null);
  
  // Config state
  const [config, setConfig] = useState<UseSignalEngineOptions>({
    selectedVector: options.selectedVector,
    marketCategory: options.marketCategory || "REAL",
    timeframe: options.timeframe || "5m",
    selectedPairs: options.selectedPairs
  });

  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
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

  // === HELPERS ===
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

  const updateSignals = useCallback(() => {
    setSignals(prev => prev.map(signal => updateSignalStatus(signal)));
  }, []);

  const updateCooldownCount = useCallback(() => {
    const cooldowns = getAllCooldowns();
    setActiveCooldowns(cooldowns.length);
  }, []);

  // === PROTOCOL SCAN ===
  const runProtocolScan = useCallback(async () => {
    // CRITICAL: Don't scan if waiting for acknowledgment
    if (pendingAcknowledgment) {
      console.log(`[HOOK] Scan paused: Waiting for signal acknowledgment`);
      return;
    }
    
    if (riskGate.manualLock) return;
    if (riskGate.currentDailyTrades >= riskGate.maxDailyTrades) return;
    if (isScanning) return;

    // Check session lock
    const scanCheck = canScanInCurrentSession();
    if (!scanCheck.canScan) {
      console.log(`[HOOK] Scan blocked: ${scanCheck.reason}`);
      updateSessionLockState();
      return;
    }

    setIsScanning(true);
    setScanProgress(0);
    setScanPhase("ANALYZING");
    setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));

    console.log(`[HOOK] Starting protocol scan: ${config.marketCategory} | ${config.selectedVector || "Hybrid"} | ${config.timeframe}`);

    try {
      // Build scan config
      const scanConfig: ScanConfig = {
        marketCategory: config.marketCategory || "REAL",
        vector: config.selectedVector || "Hybrid",
        timeframe: config.timeframe || "5m",
        selectedPairs: config.selectedPairs
      };

      // Run protocol scan with progress callback
      const result = await protocolScan(scanConfig, (progress, phase) => {
        setScanProgress(progress);
        setScanPhase(phase);
      });

      // Process results
      if (result.signals.length > 0) {
        // Take the top signal for acknowledgment
        const topSignal = result.signals[0];
        setPendingAcknowledgment(topSignal);
        setSignals(prev => [...result.signals, ...prev].slice(0, maxSignals));
        
        setRiskGate(prev => ({
          ...prev,
          currentDailyTrades: prev.currentDailyTrades + result.signals.length
        }));
        
        // Desktop notification
        sendDesktopNotification(topSignal);
        
        setStats(prev => ({
          ...prev,
          totalSignals: prev.totalSignals + result.signals.length,
          activeSession: getCurrentSession(),
          lastScanTime: new Date(),
          engineStatus: "AWAITING_ACK"
        }));

        console.log(`[HOOK] Signals ready: ${result.signals.length} | Top: ${topSignal.asset} ${topSignal.direction}`);
      } else {
        setStats(prev => ({
          ...prev,
          activeSession: getCurrentSession(),
          lastScanTime: new Date()
        }));
        console.log(`[HOOK] No signals this cycle (${result.validationsFailed} failed validation)`);
      }
    } catch (error) {
      console.error("[HOOK] Scan error:", error);
    } finally {
      setIsScanning(false);
      setScanProgress(0);
      setScanPhase("IDLE");
      updateCooldownCount();
      updateSessionLockState();
    }
  }, [config, maxSignals, riskGate, pendingAcknowledgment, isScanning, updateSessionLockState, updateCooldownCount]);

  // === ENGINE CONTROLS ===
  const startEngine = useCallback(() => {
    initializeAllBrokers();
    const result = startEngineWithSessionLock();
    
    if (result.success) {
      setIsRunning(true);
      setIsPaused(false);
      setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));
      console.log("[PROTOCOL] ⚡ Engine started - Protocol mode active");
      
      // Run initial scan after 45s-1min (simulated as 2s for demo)
      setTimeout(() => {
        runProtocolScan();
      }, 2000);
    }
    
    updateSessionLockState();
    return { success: result.success, reason: result.reason };
  }, [updateSessionLockState, runProtocolScan]);

  const stopEngine = useCallback(() => {
    setIsRunning(false);
    setIsPaused(false);
    setIsScanning(false);
    stopEngineWithSessionRelease();
    resetScanState();
    setStats(prev => ({ ...prev, engineStatus: "STOPPED" }));
    
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }
    
    updateSessionLockState();
  }, [updateSessionLockState]);

  const pauseEngine = useCallback(() => {
    setIsPaused(true);
    setStats(prev => ({ ...prev, engineStatus: "PAUSED" }));
  }, []);

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

  const toggleRiskLock = useCallback(() => {
    setRiskGate(prev => ({ ...prev, manualLock: !prev.manualLock }));
  }, []);

  const acknowledgeSignal = useCallback((signalId: string): void => {
    acknowledgeSignalExecution(signalId);
    setSignals(prev => prev.map(s => 
      s.id === signalId ? { ...s, status: "EXECUTED" as const } : s
    ));
    setPendingAcknowledgment(null);
    setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));
    console.log(`[HOOK] Signal ${signalId} acknowledged - resuming scan`);
    
    // Resume scanning after acknowledgment
    setTimeout(() => {
      runProtocolScan();
    }, 3000);
  }, [runProtocolScan]);

  const cancelSignal = useCallback((signalId: string): void => {
    setSignals(prev => prev.filter(s => s.id !== signalId));
    setPendingAcknowledgment(null);
    setStats(prev => ({ ...prev, engineStatus: "RUNNING" }));
    console.log(`[HOOK] Signal ${signalId} cancelled - resuming scan`);
    
    // Resume scanning after cancel
    setTimeout(() => {
      runProtocolScan();
    }, 3000);
  }, [runProtocolScan]);

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

  const setSelectedVector = useCallback((vector: Vector | undefined) => {
    setConfig(prev => ({ ...prev, selectedVector: vector }));
  }, []);

  const updateConfig = useCallback((newConfig: Partial<UseSignalEngineOptions>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    console.log(`[HOOK] Config updated:`, newConfig);
  }, []);

  // === SCAN LOOP ===
  useEffect(() => {
    if (isRunning && !isPaused && !pendingAcknowledgment) {
      // Run scan every 60-90 seconds when no pending acknowledgment
      scanIntervalRef.current = setInterval(() => {
        runProtocolScan();
      }, 75000); // 75 seconds between scans

      // Update signal statuses every second
      updateIntervalRef.current = setInterval(() => {
        updateSignals();
      }, 1000);
    }

    return () => {
      if (scanIntervalRef.current) clearInterval(scanIntervalRef.current);
      if (updateIntervalRef.current) clearInterval(updateIntervalRef.current);
    };
  }, [isRunning, isPaused, pendingAcknowledgment, runProtocolScan, updateSignals]);

  // === STATS UPDATE ===
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

  // === INIT ===
  useEffect(() => {
    updateSessionLockState();
  }, [updateSessionLockState]);

  // Update config when options change
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      selectedVector: options.selectedVector,
      marketCategory: options.marketCategory || prev.marketCategory,
      timeframe: options.timeframe || prev.timeframe
    }));
  }, [options.selectedVector, options.marketCategory, options.timeframe]);

  return {
    signals,
    stats,
    riskGate,
    isRunning: isRunning && !isPaused,
    isScanning,
    scanProgress,
    scanPhase,
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
    clearAllHistory,
    updateConfig
  };
};
