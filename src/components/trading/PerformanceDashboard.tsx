// SENTINEL X PRIME - Performance Dashboard (v3)

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  Award,
  Clock,
  Activity,
  Trash2,
  RefreshCw
} from "lucide-react";
import {
  getPerformanceStats,
  getSessionStats,
  getStrategyStats,
  formatWinRate,
  clearHistory,
  PerformanceStats,
  SessionStats,
  StrategyStats
} from "@/engine/performanceTracker";

interface PerformanceDashboardProps {
  className?: string;
  onClearHistory?: () => void;
}

export const PerformanceDashboard = ({ className, onClearHistory }: PerformanceDashboardProps) => {
  const [refreshKey, setRefreshKey] = useState(0);
  
  const stats = getPerformanceStats();
  const sessionStats = getSessionStats();
  const strategyStats = getStrategyStats();

  const handleClearHistory = () => {
    clearHistory();
    setRefreshKey(prev => prev + 1);
    onClearHistory?.();
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Overview Stats */}
      <Card className="p-4 border border-border/50 gradient-card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h3 className="font-bold">Performance Overview</h3>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleRefresh}
              className="gap-1 h-8"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleClearHistory}
              className="gap-1 h-8"
            >
              <Trash2 className="w-3 h-3" />
              Clear History
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Win Rate */}
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Target className="w-4 h-4 text-success" />
              <span className="text-xs text-muted-foreground">Win Rate</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              stats.winRate >= 90 && "text-success",
              stats.winRate >= 70 && stats.winRate < 90 && "text-primary",
              stats.winRate < 70 && "text-warning"
            )}>
              {stats.winRate.toFixed(1)}%
            </p>
            <Progress 
              value={stats.winRate} 
              className="h-1 mt-2"
            />
          </div>

          {/* Total Signals */}
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Total Signals</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalSignals}</p>
            <div className="flex gap-2 text-xs mt-2">
              <span className="text-success">{stats.wins}W</span>
              <span className="text-destructive">{stats.losses}L</span>
              <span className="text-muted-foreground">{stats.misses}M</span>
            </div>
          </div>

          {/* Win Streak */}
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              {stats.streakCurrent > 0 ? (
                <TrendingUp className="w-4 h-4 text-success" />
              ) : (
                <TrendingDown className="w-4 h-4 text-destructive" />
              )}
              <span className="text-xs text-muted-foreground">Streak</span>
            </div>
            <p className={cn(
              "text-2xl font-bold",
              stats.streakCurrent > 0 && "text-success",
              stats.streakCurrent < 0 && "text-destructive",
              stats.streakCurrent === 0 && "text-muted-foreground"
            )}>
              {stats.streakCurrent > 0 ? `+${stats.streakCurrent}` : stats.streakCurrent}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Best: {stats.streakBest}
            </p>
          </div>

          {/* Avg Confidence */}
          <div className="p-3 bg-secondary/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Avg Confidence</span>
            </div>
            <p className="text-2xl font-bold">{stats.averageConfidence.toFixed(1)}%</p>
            <p className="text-xs text-muted-foreground mt-2">
              PF: {stats.profitFactor.toFixed(2)}
            </p>
          </div>
        </div>
      </Card>

      {/* Session Performance */}
      <Card className="p-4 border border-border/50 gradient-card">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Session Performance</h3>
          {stats.bestSession && (
            <Badge variant="outline" className="ml-auto text-xs text-success border-success/50">
              Best: {stats.bestSession}
            </Badge>
          )}
        </div>

        <div className="space-y-3">
          {sessionStats.length > 0 ? (
            sessionStats.map(session => (
              <div key={session.session} className="flex items-center gap-3">
                <span className="text-sm font-medium w-20">{session.session}</span>
                <div className="flex-1">
                  <Progress 
                    value={session.winRate} 
                    className={cn(
                      "h-2",
                      session.winRate >= 90 && "[&>div]:bg-success",
                      session.winRate >= 70 && session.winRate < 90 && "[&>div]:bg-primary"
                    )}
                  />
                </div>
                <span className="text-xs font-mono w-16 text-right">
                  {session.winRate.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground w-12 text-right">
                  ({session.signals})
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No session data yet
            </p>
          )}
        </div>
      </Card>

      {/* Strategy Performance */}
      <Card className="p-4 border border-border/50 gradient-card">
        <div className="flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Strategy Performance</h3>
          {stats.bestStrategy && (
            <Badge variant="outline" className="ml-auto text-xs text-success border-success/50 truncate max-w-[150px]">
              Best: {stats.bestStrategy}
            </Badge>
          )}
        </div>

        <div className="space-y-2 max-h-[200px] overflow-y-auto">
          {strategyStats.length > 0 ? (
            strategyStats.slice(0, 8).map((strat, index) => (
              <div 
                key={strat.strategy}
                className={cn(
                  "flex items-center gap-2 p-2 rounded-lg",
                  index === 0 && "bg-success/10 border border-success/20",
                  index > 0 && "bg-secondary/20"
                )}
              >
                <span className="text-xs font-mono text-muted-foreground w-4">
                  #{index + 1}
                </span>
                <span className="text-sm font-medium flex-1 truncate" title={strat.strategy}>
                  {strat.strategy}
                </span>
                <span className={cn(
                  "text-xs font-mono font-bold",
                  strat.winRate >= 90 && "text-success",
                  strat.winRate >= 70 && strat.winRate < 90 && "text-primary"
                )}>
                  {strat.winRate.toFixed(1)}%
                </span>
                <span className="text-xs text-muted-foreground">
                  ({strat.signals})
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No strategy data yet
            </p>
          )}
        </div>
      </Card>
    </div>
  );
};
