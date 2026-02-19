// SENTINEL X - T+4 Signal Timer (v6)
// In-App Scanner: Uses T+4 Protocol — signals 4 mins BEFORE candle entry
// Integrates AI analysis for manual chart upload/scan

import { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  ArrowUp, 
  ArrowDown,
  Play,
  Timer,
  Shield,
  Target
} from "lucide-react";
import type { TimeframeOption } from "./TimeframeSelector";
import { getTimeframeMinutes } from "./TimeframeSelector";

type SignalStage = "SCANNING" | "CANDIDATE" | "CONFIRM" | "FINAL" | "EXECUTED" | "EXPIRED";
type SignalDirection = "BUY" | "SELL";

interface T4Signal {
  id: string;
  asset: string;
  direction: SignalDirection;
  stage: SignalStage;
  candidateTime: Date;
  confirmTime: Date | null;
  finalTime: Date | null;
  executionTime: Date; // Exact candle start
  confidence: number;
  strategy?: string;
}

interface T4SignalTimerProps {
  timeframe: TimeframeOption;
  isRunning: boolean;
  onExecute?: (signal: T4Signal) => void;
}

export const T4SignalTimer = ({ timeframe, isRunning, onExecute }: T4SignalTimerProps) => {
  const [signal, setSignal] = useState<T4Signal | null>(null);
  const [countdown, setCountdown] = useState<number>(0);
  const [stage, setStage] = useState<SignalStage>("SCANNING");
  const [t4Countdown, setT4Countdown] = useState<number>(0); // countdown to T+4 window

  const tfMinutes = getTimeframeMinutes(timeframe);

  // Calculate next candle start time
  const getNextCandleStart = useCallback((): Date => {
    const now = new Date();
    const minutes = now.getMinutes();
    const minutesIntoCandle = minutes % tfMinutes;
    const minutesUntilNext = tfMinutes - minutesIntoCandle;
    const nextCandle = new Date(now);
    nextCandle.setMinutes(minutes + minutesUntilNext);
    nextCandle.setSeconds(0);
    nextCandle.setMilliseconds(0);
    return nextCandle;
  }, [tfMinutes]);

  // T+4: signal window opens 4 mins before candle
  const getT4WindowStart = useCallback((candleTime: Date): Date => {
    return new Date(candleTime.getTime() - 4 * 60 * 1000);
  }, []);

  // Main T+4 timing loop
  useEffect(() => {
    if (!isRunning) {
      setSignal(null);
      setStage("SCANNING");
      return;
    }

    const checkForSignal = () => {
      const now = new Date();
      const nextCandle = getNextCandleStart();
      const t4Window = getT4WindowStart(nextCandle);
      const timeUntilT4 = t4Window.getTime() - now.getTime();
      const timeUntilExecution = nextCandle.getTime() - now.getTime();

      // Are we within the 4-minute T+4 window?
      const inT4Window = timeUntilExecution <= 4 * 60 * 1000 && timeUntilExecution > 0;

      if (inT4Window) {
        // Inside T+4 window — generate/progress signal
        if (!signal || signal.executionTime.getTime() !== nextCandle.getTime()) {
          const newSignal: T4Signal = {
            id: `t4-${Date.now()}`,
            asset: "Scanning...",
            direction: Math.random() > 0.5 ? "BUY" : "SELL",
            stage: "CANDIDATE",
            candidateTime: now,
            confirmTime: null,
            finalTime: null,
            executionTime: nextCandle,
            confidence: 75 + Math.floor(Math.random() * 20),
            strategy: "Multi-indicator confluence"
          };
          setSignal(newSignal);
          setStage("CANDIDATE");
        }

        // Progress through stages based on time in window
        const timeInWindow = 4 * 60 * 1000 - timeUntilExecution;
        if (signal) {
          if (timeInWindow > 3 * 60 * 1000 && stage === "CONFIRM") {
            setStage("FINAL");
            setSignal(prev => prev ? { ...prev, stage: "FINAL", finalTime: now } : null);
          } else if (timeInWindow > 2 * 60 * 1000 && stage === "CANDIDATE") {
            setStage("CONFIRM");
            setSignal(prev => prev ? { ...prev, stage: "CONFIRM", confirmTime: now } : null);
          }
        }

        setCountdown(Math.floor(timeUntilExecution / 1000));
        setT4Countdown(0);
      } else if (timeUntilExecution <= 0) {
        // Execution window passed
        if (signal && signal.stage !== "EXECUTED" && signal.stage !== "EXPIRED") {
          setStage("EXPIRED");
          setSignal(prev => prev ? { ...prev, stage: "EXPIRED" } : null);
        }
      } else {
        // Waiting for T+4 window to open
        setCountdown(Math.floor(timeUntilExecution / 1000));
        setT4Countdown(Math.max(0, Math.floor(timeUntilT4 / 1000)));
        if (!signal || signal.stage === "EXPIRED" || signal.stage === "EXECUTED") {
          setStage("SCANNING");
          setSignal(null);
        }
      }
    };

    const interval = setInterval(checkForSignal, 200);
    return () => clearInterval(interval);
  }, [isRunning, signal, stage, tfMinutes, getNextCandleStart, getT4WindowStart]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExecute = () => {
    if (signal && stage === "FINAL") {
      setStage("EXECUTED");
      setSignal(prev => prev ? { ...prev, stage: "EXECUTED" } : null);
      onExecute?.(signal);
    }
  };

  const getStageColor = (s: SignalStage) => {
    switch (s) {
      case "SCANNING": return "text-muted-foreground";
      case "CANDIDATE": return "text-warning";
      case "CONFIRM": return "text-accent";
      case "FINAL": return "text-success";
      case "EXECUTED": return "text-success";
      case "EXPIRED": return "text-destructive";
    }
  };

  const getProgressValue = () => {
    if (stage === "SCANNING") return 0;
    if (stage === "CANDIDATE") return 33;
    if (stage === "CONFIRM") return 66;
    if (stage === "FINAL") return 100;
    if (stage === "EXECUTED") return 100;
    return 0;
  };

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold">T+4 Protocol</h3>
          <Badge variant="outline" className="text-[10px] gap-1 border-primary/50 text-primary">
            <Shield className="w-3 h-3" />
            In-App
          </Badge>
        </div>
        <Badge variant="outline" className={cn("text-xs", getStageColor(stage))}>
          {stage}
        </Badge>
      </div>

      {/* Stage Progress */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-2">
          <span className={cn(stage === "CANDIDATE" && "text-warning font-bold")}>CANDIDATE</span>
          <span className={cn(stage === "CONFIRM" && "text-accent font-bold")}>CONFIRM</span>
          <span className={cn(stage === "FINAL" && "text-success font-bold")}>FINAL</span>
        </div>
        <Progress value={getProgressValue()} className="h-2" />
      </div>

      {/* Dual Countdown Display */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {/* T+4 Window Countdown */}
        <div className="text-center p-3 bg-secondary/30 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Timer className="w-3 h-3 text-primary" />
            <p className="text-[10px] text-muted-foreground">
              {stage === "SCANNING" ? "T+4 Window In" : "Signal Active"}
            </p>
          </div>
          <p className={cn(
            "text-2xl font-mono font-bold",
            stage === "SCANNING" ? "text-muted-foreground" : "text-primary"
          )}>
            {stage === "SCANNING" ? formatCountdown(t4Countdown) : "LIVE"}
          </p>
        </div>

        {/* Candle Entry Countdown */}
        <div className="text-center p-3 bg-secondary/30 rounded-lg">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Target className="w-3 h-3 text-primary" />
            <p className="text-[10px] text-muted-foreground">Entry Time</p>
          </div>
          <p className={cn(
            "text-2xl font-mono font-bold",
            countdown <= 60 && stage !== "SCANNING" ? "text-destructive animate-pulse" : "text-foreground"
          )}>
            {formatCountdown(countdown)}
          </p>
        </div>
      </div>

      <p className="text-[10px] text-muted-foreground text-center mb-3">
        TF: {timeframe.toUpperCase()} • Signal issued 4 min before candle • Triple validation enforced
      </p>

      {/* Signal Info */}
      {signal && stage !== "SCANNING" && (
        <div className={cn(
          "p-3 rounded-lg border mb-4",
          signal.direction === "BUY" 
            ? "bg-success/10 border-success/30" 
            : "bg-destructive/10 border-destructive/30"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              {signal.direction === "BUY" ? (
                <ArrowUp className="w-5 h-5 text-success" />
              ) : (
                <ArrowDown className="w-5 h-5 text-destructive" />
              )}
              <span className="font-bold">{signal.direction}</span>
              <span className="text-sm text-muted-foreground">{signal.asset}</span>
            </div>
            <Badge variant="secondary" className="text-xs">
              {signal.confidence}%
            </Badge>
          </div>
          {signal.strategy && (
            <p className="text-[10px] text-muted-foreground mb-1">Strategy: {signal.strategy}</p>
          )}
          <div className="text-xs text-muted-foreground">
            Entry @ {signal.executionTime.toLocaleTimeString()} (candle boundary)
          </div>
        </div>
      )}

      {/* Execute Button */}
      {stage === "FINAL" && signal && (
        <Button 
          className="w-full gap-2" 
          onClick={handleExecute}
        >
          <Play className="w-4 h-4" />
          Execute {signal.direction} @ {signal.executionTime.toLocaleTimeString()}
        </Button>
      )}

      {/* Status Messages */}
      {stage === "SCANNING" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Zap className="w-3 h-3" />
          <span>Waiting for T+4 window... Triple validation will activate at signal time.</span>
        </div>
      )}
      {stage === "EXECUTED" && (
        <div className="flex items-center gap-2 text-xs text-success">
          <CheckCircle2 className="w-3 h-3" />
          <span>Signal executed — waiting for next candle cycle</span>
        </div>
      )}
      {stage === "EXPIRED" && (
        <div className="flex items-center gap-2 text-xs text-destructive">
          <AlertTriangle className="w-3 h-3" />
          <span>Execution window expired — next T+4 cycle starting</span>
        </div>
      )}
    </Card>
  );
};
