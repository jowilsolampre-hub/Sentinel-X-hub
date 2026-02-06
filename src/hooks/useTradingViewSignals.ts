// SENTINEL X - TradingView Realtime Signal Hook
// Subscribes to incoming webhook signals via Supabase Realtime

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Signal, Vector, MarketType, Session, Timeframe } from "@/types/trading";
import { toast } from "sonner";

interface TVSignalRow {
  id: string;
  market_id: string;
  symbol: string;
  direction: string;
  stage: string;
  status: string;
  timeframe: string | null;
  score: number;
  score_detail_json: {
    tripleScore?: number;
    biasScore?: number;
    structureScore?: number;
    triggerScore?: number;
    crossValidator?: string;
    crossConfidence?: number;
    prepTimeMinutes?: number;
    executeAt?: string;
  };
  strategy: string | null;
  notes: string | null;
  expires_at: string | null;
  created_at: string;
}

// Convert database row to Signal type
const rowToSignal = (row: TVSignalRow): Signal => {
  const detail = row.score_detail_json || {};
  const executeAt = detail.executeAt ? new Date(detail.executeAt) : new Date(Date.now() + 4 * 60 * 1000);
  
  // Map market_id to MarketType
  const marketType: MarketType = row.market_id.includes("OTC") ? "OTC" : "REAL";
  
  // Map market_id to Vector
  const vectorMap: Record<string, Vector> = {
    "BINANCE": "Futures",
    "MT5_FOREX": "Forex",
    "PO_OTC": "OTC",
    "QX_OTC": "OTC",
  };
  const vector: Vector = vectorMap[row.market_id] || "Forex";
  
  // Map timeframe
  const tfMap: Record<string, Timeframe> = {
    "1m": "1M", "5m": "5M", "15m": "15M", "30m": "30M",
    "1h": "1H", "4h": "4H", "24h": "1D", "1D": "1D",
  };
  const timeframe: Timeframe = tfMap[row.timeframe || "5m"] || "5M";
  
  // Detect session from time
  const hour = new Date().getUTCHours();
  let session: Session = "Tokyo";
  if (hour >= 7 && hour < 16) session = "London";
  else if (hour >= 12 && hour < 21) session = "NewYork";
  else if (hour >= 22 || hour < 7) session = "Sydney";
  
  return {
    id: row.id,
    asset: row.symbol,
    vector,
    marketType,
    strategy: row.strategy || "TradingView Alert",
    direction: row.direction as "BUY" | "SELL",
    issuedAt: new Date(row.created_at),
    executeAt,
    timeframe,
    confidence: row.score,
    status: row.status === "FINAL" ? "PENDING" : 
            row.status === "EXECUTED" ? "EXECUTED" : 
            row.status === "EXPIRED" ? "INVALIDATED" : 
            row.status === "REJECTED" ? "CANCELLED" : "PENDING",
    session,
  };
};

export const useTradingViewSignals = (onNewSignal?: (signal: Signal) => void) => {
  const [tvSignals, setTvSignals] = useState<Signal[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [lastSignal, setLastSignal] = useState<Signal | null>(null);

  // Play notification sound
  const playNotification = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Play two tones for TV signals
      oscillator.frequency.value = 1000;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.4, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.3);
      
      // Second tone
      setTimeout(() => {
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 1200;
        osc2.type = "sine";
        gain2.gain.setValueAtTime(0.4, audioCtx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc2.start(audioCtx.currentTime);
        osc2.stop(audioCtx.currentTime + 0.3);
      }, 150);
    } catch {
      // Silent fallback
    }
  }, []);

  // Subscribe to realtime signals
  useEffect(() => {
    console.log("[TV-SIGNALS] Setting up realtime subscription...");
    
    const channel = supabase
      .channel('tv-signals')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'signals',
        },
        (payload) => {
          console.log("[TV-SIGNALS] New signal received:", payload);
          
          const row = payload.new as TVSignalRow;
          
          // Only process FINAL signals for popup
          if (row.status !== "FINAL") {
            console.log("[TV-SIGNALS] Skipping non-FINAL signal:", row.status);
            return;
          }
          
          const signal = rowToSignal(row);
          
          setTvSignals(prev => [signal, ...prev].slice(0, 50));
          setLastSignal(signal);
          
          // Notify
          playNotification();
          toast.success(`📺 TradingView: ${signal.direction} ${signal.asset}`, {
            description: `Confidence: ${signal.confidence}% | ${signal.strategy}`,
            duration: 10000,
          });
          
          // Desktop notification
          if (Notification.permission === "granted") {
            new Notification(`📺 TradingView Signal: ${signal.direction}`, {
              body: `${signal.asset} @ ${signal.confidence}% | Execute: ${signal.executeAt.toLocaleTimeString()}`,
              icon: "/favicon.ico",
              requireInteraction: true,
            });
          }
          
          // Callback for parent component
          onNewSignal?.(signal);
        }
      )
      .subscribe((status) => {
        console.log("[TV-SIGNALS] Subscription status:", status);
        setIsConnected(status === "SUBSCRIBED");
      });

    return () => {
      console.log("[TV-SIGNALS] Cleaning up subscription...");
      supabase.removeChannel(channel);
    };
  }, [onNewSignal, playNotification]);

  // Fetch recent signals on mount
  useEffect(() => {
    const fetchRecent = async () => {
      const { data, error } = await supabase
        .from('signals')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error("[TV-SIGNALS] Fetch error:", error);
        return;
      }
      
      if (data) {
        const signals = data.map(row => rowToSignal(row as TVSignalRow));
        setTvSignals(signals);
        console.log("[TV-SIGNALS] Loaded recent signals:", signals.length);
      }
    };
    
    fetchRecent();
  }, []);

  // Request notification permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission();
      }
    }
  }, []);

  return {
    tvSignals,
    lastSignal,
    isConnected,
  };
};
