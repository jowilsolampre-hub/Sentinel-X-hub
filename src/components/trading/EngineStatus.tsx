// SENTINEL X - Engine Status Component

import { EngineStats, RiskGate } from "@/types/trading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Activity, 
  Pause, 
  Play, 
  Square,
  Shield,
  ShieldAlert,
  TrendingUp,
  Clock,
  Target,
  Zap
} from "lucide-react";

interface EngineStatusProps {
  stats: EngineStats;
  riskGate: RiskGate;
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onToggleLock: () => void;
}

export const EngineStatus = ({
  stats,
  riskGate,
  isRunning,
  onStart,
  onStop,
  onPause,
  onToggleLock
}: EngineStatusProps) => {
  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        {/* Engine Status */}
        <div className="flex items-center gap-4">
          <div className={cn(
            "relative p-3 rounded-lg",
            stats.engineStatus === "AWAITING_ACK" ? "bg-warning/20" :
            isRunning ? "bg-success/20" : "bg-muted"
          )}>
            <Activity className={cn(
              "w-6 h-6",
              stats.engineStatus === "AWAITING_ACK" ? "text-warning animate-pulse" :
              isRunning ? "text-success animate-pulse" : "text-muted-foreground"
            )} />
            {isRunning && stats.engineStatus !== "AWAITING_ACK" && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-success rounded-full animate-ping" />
            )}
            {stats.engineStatus === "AWAITING_ACK" && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-warning rounded-full animate-pulse" />
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-lg">Signal Engine</h3>
              <Badge 
                variant={isRunning ? "default" : "secondary"}
                className={cn(
                  stats.engineStatus === "AWAITING_ACK" && "bg-warning text-warning-foreground",
                  stats.engineStatus === "RUNNING" && "bg-success text-success-foreground"
                )}
              >
                {stats.engineStatus === "AWAITING_ACK" ? "AWAITING ACK" : stats.engineStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              Session: <span className="text-foreground font-medium">{stats.activeSession}</span>
              {stats.engineStatus === "AWAITING_ACK" && (
                <span className="ml-2 text-warning font-medium">• Acknowledge signal to continue</span>
              )}
            </p>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
            <Zap className="w-4 h-4 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground">Total</p>
              <p className="font-mono font-bold">{stats.totalSignals}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground">Pending</p>
              <p className="font-mono font-bold">{stats.pendingSignals}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
            <Target className="w-4 h-4 text-success" />
            <div>
              <p className="text-xs text-muted-foreground">Executed</p>
              <p className="font-mono font-bold">{stats.executedSignals}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 bg-secondary/50 rounded-lg px-3 py-2">
            <TrendingUp className="w-4 h-4 text-accent" />
            <div>
              <p className="text-xs text-muted-foreground">Win Rate</p>
              <p className="font-mono font-bold">{stats.winRate.toFixed(1)}%</p>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant={riskGate.manualLock ? "destructive" : "outline"}
            size="icon"
            onClick={onToggleLock}
            title={riskGate.manualLock ? "Unlock" : "Lock"}
          >
            {riskGate.manualLock ? (
              <ShieldAlert className="w-4 h-4" />
            ) : (
              <Shield className="w-4 h-4" />
            )}
          </Button>
          
          {isRunning ? (
            <>
              <Button variant="outline" size="icon" onClick={onPause}>
                <Pause className="w-4 h-4" />
              </Button>
              <Button variant="destructive" size="icon" onClick={onStop}>
                <Square className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <Button variant="default" size="icon" onClick={onStart}>
              <Play className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Risk Gate Warning */}
      {riskGate.manualLock && (
        <div className="mt-4 flex items-center gap-2 bg-destructive/10 text-destructive rounded-lg p-3">
          <ShieldAlert className="w-5 h-5" />
          <span className="font-medium">Manual Kill Switch Engaged - All signals paused</span>
        </div>
      )}
    </Card>
  );
};
