// SENTINEL X - Institutional Signal Card (Large Display)

import { useEffect, useState } from "react";
import { Signal } from "@/types/trading";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Clock,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle
} from "lucide-react";

interface InstitutionalCardProps {
  signal: Signal | null;
}

export const InstitutionalCard = ({ signal }: InstitutionalCardProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  
  useEffect(() => {
    if (!signal) return;
    
    const updateTimer = () => {
      const now = new Date().getTime();
      const exec = new Date(signal.executeAt).getTime();
      const remaining = Math.max(0, Math.floor((exec - now) / 1000));
      setTimeLeft(remaining);
    };
    
    updateTimer();
    const interval = setInterval(updateTimer, 500);
    return () => clearInterval(interval);
  }, [signal]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (!signal) {
    return (
      <Card className="p-8 border-2 border-dashed border-border/50 bg-secondary/20">
        <div className="flex flex-col items-center justify-center text-center py-12">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <Clock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-xl font-bold text-muted-foreground mb-2">Awaiting Signal</h3>
          <p className="text-sm text-muted-foreground">Engine is scanning markets...</p>
        </div>
      </Card>
    );
  }

  const isBuy = signal.direction === "BUY";
  const isPending = signal.status === "PENDING";
  const isExecuted = signal.status === "EXECUTED";

  return (
    <Card className={cn(
      "relative overflow-hidden border-2 transition-all duration-500",
      isBuy 
        ? "border-buy bg-gradient-to-br from-buy/20 via-buy/10 to-transparent" 
        : "border-sell bg-gradient-to-br from-sell/20 via-sell/10 to-transparent",
      isPending && "animate-pulse-slow"
    )}>
      {/* Top gradient bar */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-1.5",
        isBuy ? "bg-buy" : "bg-sell"
      )} />

      <div className="p-6 pt-8">
        {/* Main Direction Display */}
        <div className="flex items-center justify-center mb-6">
          <div className={cn(
            "flex items-center gap-4 px-8 py-6 rounded-2xl",
            isBuy ? "gradient-buy" : "gradient-sell"
          )}>
            {isBuy ? (
              <TrendingUp className="w-12 h-12 text-foreground" />
            ) : (
              <TrendingDown className="w-12 h-12 text-foreground" />
            )}
            <span className="text-5xl font-bold text-foreground tracking-tight">
              {signal.direction}
            </span>
          </div>
        </div>

        {/* Asset and Vector */}
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold mb-1">{signal.asset}</h2>
          <p className="text-lg text-muted-foreground">{signal.vector} • {signal.strategy}</p>
        </div>

        {/* Timing Display */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-secondary/50 rounded-xl p-4 text-center">
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Target className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wide">Entry (T+4)</span>
            </div>
            <p className="font-mono text-2xl font-bold">
              {new Date(signal.executeAt).toLocaleTimeString()}
            </p>
          </div>

          <div className={cn(
            "rounded-xl p-4 text-center",
            isPending 
              ? timeLeft <= 30 
                ? "bg-warning/20 border border-warning/50" 
                : "bg-secondary/50"
              : isExecuted 
                ? "bg-success/20 border border-success/50"
                : "bg-destructive/20 border border-destructive/50"
          )}>
            <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
              <Clock className="w-5 h-5" />
              <span className="text-sm uppercase tracking-wide">
                {isPending ? "Countdown" : "Status"}
              </span>
            </div>
            {isPending ? (
              <p className={cn(
                "font-mono text-3xl font-bold",
                timeLeft <= 30 && "text-warning animate-pulse"
              )}>
                {formatTime(timeLeft)}
              </p>
            ) : isExecuted ? (
              <div className="flex items-center justify-center gap-2 text-success">
                <CheckCircle2 className="w-6 h-6" />
                <span className="text-xl font-bold">EXECUTED</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-2 text-destructive">
                <XCircle className="w-6 h-6" />
                <span className="text-xl font-bold">{signal.status}</span>
              </div>
            )}
          </div>
        </div>

        {/* Additional Info */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4">
            <span className="text-muted-foreground">
              TF: <span className="text-foreground font-medium">{signal.timeframe}</span>
            </span>
            <span className="text-muted-foreground">
              Session: <span className="text-foreground font-medium">{signal.session}</span>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground">Confidence:</span>
            <span className={cn(
              "font-mono font-bold text-lg",
              signal.confidence >= 98 ? "text-success" : "text-warning"
            )}>
              {signal.confidence.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Execution Warning */}
        {isPending && timeLeft > 0 && timeLeft <= 30 && (
          <div className="mt-6 flex items-center justify-center gap-3 bg-warning/20 text-warning rounded-xl p-4 border border-warning/50">
            <AlertTriangle className="w-6 h-6 animate-bounce" />
            <span className="text-lg font-bold">PREPARE FOR EXECUTION</span>
          </div>
        )}
      </div>
    </Card>
  );
};
