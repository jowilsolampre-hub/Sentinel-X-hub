// SENTINEL X PRIME - Performance Statistics Component

import { Signal } from "@/types/trading";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Target,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from "lucide-react";

interface PerformanceStatsProps {
  signals: Signal[];
}

export const PerformanceStats = ({ signals }: PerformanceStatsProps) => {
  const pending = signals.filter(s => s.status === "PENDING").length;
  const executed = signals.filter(s => s.status === "EXECUTED").length;
  const missed = signals.filter(s => s.status === "MISSED").length;
  const cancelled = signals.filter(s => s.status === "CANCELLED" || s.status === "INVALIDATED").length;
  
  const buySignals = signals.filter(s => s.direction === "BUY").length;
  const sellSignals = signals.filter(s => s.direction === "SELL").length;

  const avgConfidence = signals.length > 0 
    ? signals.reduce((acc, s) => acc + s.confidence, 0) / signals.length 
    : 0;

  const stats = [
    { 
      label: "Total Signals", 
      value: signals.length, 
      icon: Activity, 
      color: "text-foreground",
      bg: "bg-secondary/50"
    },
    { 
      label: "Pending", 
      value: pending, 
      icon: Clock, 
      color: "text-warning",
      bg: "bg-warning/10"
    },
    { 
      label: "Executed", 
      value: executed, 
      icon: CheckCircle, 
      color: "text-success",
      bg: "bg-success/10"
    },
    { 
      label: "Missed", 
      value: missed, 
      icon: XCircle, 
      color: "text-destructive",
      bg: "bg-destructive/10"
    },
  ];

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Performance</h3>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className={cn("p-3 rounded-lg", stat.bg)}>
              <div className="flex items-center gap-2 mb-1">
                <Icon className={cn("w-4 h-4", stat.color)} />
                <span className="text-xs text-muted-foreground">{stat.label}</span>
              </div>
              <p className={cn("text-2xl font-bold font-mono", stat.color)}>
                {stat.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Direction Breakdown */}
      <div className="p-3 bg-secondary/30 rounded-lg mb-4">
        <p className="text-xs text-muted-foreground mb-2">Direction Distribution</p>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-buy" />
            <span className="font-mono font-bold text-buy">{buySignals}</span>
            <span className="text-xs text-muted-foreground">BUY</span>
          </div>
          <div className="h-4 w-px bg-border" />
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-sell" />
            <span className="font-mono font-bold text-sell">{sellSignals}</span>
            <span className="text-xs text-muted-foreground">SELL</span>
          </div>
        </div>
        {signals.length > 0 && (
          <div className="mt-2 h-2 rounded-full bg-secondary overflow-hidden flex">
            <div 
              className="h-full bg-buy transition-all" 
              style={{ width: `${(buySignals / signals.length) * 100}%` }}
            />
            <div 
              className="h-full bg-sell transition-all" 
              style={{ width: `${(sellSignals / signals.length) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Average Confidence */}
      <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
        <span className="text-sm text-muted-foreground">Avg. Confidence</span>
        <span className={cn(
          "font-mono font-bold",
          avgConfidence >= 98 ? "text-success" : avgConfidence >= 96 ? "text-warning" : "text-muted-foreground"
        )}>
          {avgConfidence.toFixed(2)}%
        </span>
      </div>

      {/* Warning if many missed */}
      {missed > 5 && (
        <div className="mt-4 flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded-lg text-warning">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">High missed signal rate - review timing</span>
        </div>
      )}
    </Card>
  );
};
