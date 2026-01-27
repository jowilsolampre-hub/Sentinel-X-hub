// SENTINEL X - Signal Card Component (v5)

import { useEffect, useState } from "react";
import { Signal } from "@/types/trading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock, 
  Target, 
  Zap,
  AlertTriangle,
  Check,
  X
} from "lucide-react";

interface SignalCardProps {
  signal: Signal;
  compact?: boolean;
  isPendingAck?: boolean;
  onAcknowledge?: (signalId: string) => void;
  onCancel?: (signalId: string) => void;
}

export const SignalCard = ({ signal, compact = false, isPendingAck = false, onAcknowledge, onCancel }: SignalCardProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  const isBuy = signal.direction === "BUY";
  const isPending = signal.status === "PENDING";
  
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date().getTime();
      const exec = new Date(signal.executeAt).getTime();
      const remaining = Math.max(0, Math.floor((exec - now) / 1000));
      setTimeLeft(remaining);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [signal.executeAt]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (compact) {
    return (
      <Card className={cn(
        "p-3 border transition-all duration-300",
        isBuy 
          ? "border-buy/30 bg-buy/5 hover:border-buy/50" 
          : "border-sell/30 bg-sell/5 hover:border-sell/50",
        isPending && (isBuy ? "glow-buy" : "glow-sell")
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "p-1.5 rounded-md",
              isBuy ? "bg-buy text-buy-foreground" : "bg-sell text-sell-foreground"
            )}>
              {isBuy ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
            </div>
            <div>
              <p className="font-medium text-sm">{signal.asset}</p>
              <p className="text-xs text-muted-foreground">{signal.strategy}</p>
            </div>
          </div>
          <div className="text-right">
            <Badge variant={isPending ? "default" : "secondary"} className={cn(
              "text-xs",
              isPending && (isBuy ? "bg-buy text-buy-foreground" : "bg-sell text-sell-foreground")
            )}>
              {signal.direction}
            </Badge>
            {isPending && timeLeft > 0 && (
              <p className="text-xs text-muted-foreground mt-1 font-mono">{formatTime(timeLeft)}</p>
            )}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all duration-500",
      isBuy 
        ? "border-buy/40 bg-gradient-to-br from-buy/10 to-buy/5" 
        : "border-sell/40 bg-gradient-to-br from-sell/10 to-sell/5",
      isPending && "animate-pulse-slow",
      isPending && (isBuy ? "glow-buy" : "glow-sell")
    )}>
      {/* Status indicator bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1",
        isBuy ? "bg-buy" : "bg-sell"
      )} />
      
      <div className="p-4 pt-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "p-2.5 rounded-lg",
              isBuy ? "gradient-buy" : "gradient-sell"
            )}>
              {isBuy ? (
                <TrendingUp className="w-6 h-6 text-foreground" />
              ) : (
                <TrendingDown className="w-6 h-6 text-foreground" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg">{signal.asset}</h3>
              <p className="text-sm text-muted-foreground">{signal.vector}</p>
            </div>
          </div>
          
          <div className={cn(
            "px-4 py-2 rounded-lg font-bold text-xl",
            isBuy ? "gradient-buy text-foreground" : "gradient-sell text-foreground"
          )}>
            {signal.direction}
          </div>
        </div>

        {/* Signal Info Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Zap className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Strategy</span>
            </div>
            <p className="font-medium text-sm">{signal.strategy}</p>
          </div>
          
          <div className="bg-secondary/50 rounded-lg p-3">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs uppercase tracking-wide">Timeframe</span>
            </div>
            <p className="font-medium text-sm">{signal.timeframe}</p>
          </div>
        </div>

        {/* Timing Section */}
        <div className="bg-secondary/30 rounded-lg p-3 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-muted-foreground mb-1">
                <Clock className="w-4 h-4" />
                <span className="text-xs uppercase tracking-wide">Entry Time (T+4)</span>
              </div>
              <p className="font-mono font-bold text-lg">
                {new Date(signal.executeAt).toLocaleTimeString()}
              </p>
            </div>
            
            {isPending && timeLeft > 0 && (
              <div className="text-right">
                <p className="text-xs text-muted-foreground uppercase">Countdown</p>
                <p className={cn(
                  "font-mono font-bold text-2xl",
                  timeLeft <= 30 && "text-warning animate-pulse"
                )}>
                  {formatTime(timeLeft)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              {signal.session}
            </Badge>
            <Badge 
              variant={signal.status === "PENDING" ? "default" : "secondary"}
              className={cn(
                "text-xs",
                signal.status === "EXECUTED" && "bg-success text-success-foreground",
                signal.status === "MISSED" && "bg-destructive text-destructive-foreground"
              )}
            >
              {signal.status}
            </Badge>
          </div>
          
          <div className="flex items-center gap-1">
            <span className="text-xs text-muted-foreground">Confidence:</span>
            <span className={cn(
              "font-mono font-bold",
              signal.confidence >= 98 ? "text-success" : "text-warning"
            )}>
              {signal.confidence.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Warning for near execution */}
        {isPending && timeLeft > 0 && timeLeft <= 30 && (
          <div className="mt-3 flex items-center gap-2 text-warning bg-warning/10 rounded-lg p-2">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">Prepare for execution</span>
          </div>
        )}

        {/* Acknowledge/Cancel buttons when pending acknowledgment */}
        {isPendingAck && (
          <div className="mt-4 flex gap-3">
            <Button 
              onClick={() => onAcknowledge?.(signal.id)}
              className="flex-1 bg-success hover:bg-success/90 text-success-foreground"
            >
              <Check className="w-4 h-4 mr-2" />
              Acknowledge
            </Button>
            <Button 
              onClick={() => onCancel?.(signal.id)}
              variant="destructive"
              className="flex-1"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
};
