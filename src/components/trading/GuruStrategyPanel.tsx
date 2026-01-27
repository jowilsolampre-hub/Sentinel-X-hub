// SENTINEL X - Guru Strategy Panel (v5)

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Trophy,
  Flame,
  Star,
  Zap,
  Clock,
  TrendingUp
} from "lucide-react";
import { MarketType, Session } from "@/types/trading";
import {
  getGuruStrategies,
  getActiveSessionOpen,
  getSessionOpenStrategies,
  GuruStrategy,
  SessionOpenWindow
} from "@/engine/guruStrategies";

interface GuruStrategyPanelProps {
  marketType: MarketType;
  currentSession: Session;
}

export const GuruStrategyPanel = ({ marketType, currentSession }: GuruStrategyPanelProps) => {
  const strategies = getGuruStrategies(marketType);
  const sessionOpen = getActiveSessionOpen();
  const boostedStrategies = sessionOpen 
    ? getSessionOpenStrategies(marketType, currentSession).map(s => s.id)
    : [];

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-warning" />
          <h3 className="font-bold">Guru Strategies</h3>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            marketType === "OTC" ? "text-accent border-accent/50" : "text-primary border-primary/50"
          )}
        >
          {marketType}
        </Badge>
      </div>

      {/* Session Open Alert */}
      {sessionOpen && (
        <div className="mb-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Flame className="w-4 h-4 text-warning animate-pulse" />
            <span className="text-sm font-bold text-warning">
              SESSION OPEN ACTIVE
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {sessionOpen.session} session open window • {sessionOpen.boost.toFixed(2)}x signal boost
          </p>
        </div>
      )}

      {/* Strategy List */}
      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2">
        {strategies.slice(0, 6).map((strategy, index) => {
          const isBoosted = boostedStrategies.includes(strategy.id);
          const isTop3 = index < 3;
          
          return (
            <div
              key={strategy.id}
              className={cn(
                "p-3 rounded-lg border transition-all",
                isBoosted && "ring-1 ring-warning/50 bg-warning/5",
                isTop3 
                  ? "border-primary/30 bg-primary/5" 
                  : "border-border/30 bg-secondary/20"
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {index === 0 && <Star className="w-4 h-4 text-warning fill-warning" />}
                  {index === 1 && <Star className="w-4 h-4 text-muted-foreground fill-muted-foreground" />}
                  {index === 2 && <Star className="w-4 h-4 text-amber-700 fill-amber-700" />}
                  {index > 2 && <Zap className="w-3 h-3 text-muted-foreground" />}
                  
                  <span className={cn(
                    "font-medium text-sm",
                    isTop3 && "text-foreground",
                    !isTop3 && "text-muted-foreground"
                  )}>
                    {strategy.name}
                  </span>
                  
                  {isBoosted && (
                    <Badge variant="outline" className="text-[10px] h-4 text-warning border-warning/50">
                      BOOSTED
                    </Badge>
                  )}
                </div>
                
                <div className="flex items-center gap-1">
                  <span className={cn(
                    "text-xs font-mono font-bold",
                    strategy.winRate >= 99 && "text-success",
                    strategy.winRate >= 98 && strategy.winRate < 99 && "text-primary",
                    strategy.winRate < 98 && "text-muted-foreground"
                  )}>
                    {strategy.winRate.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Win Rate Bar */}
              <div className="mb-2">
                <Progress 
                  value={strategy.winRate} 
                  className={cn(
                    "h-1.5",
                    strategy.winRate >= 99 && "[&>div]:bg-success",
                    strategy.winRate >= 98 && strategy.winRate < 99 && "[&>div]:bg-primary",
                    strategy.winRate < 98 && "[&>div]:bg-muted-foreground"
                  )} 
                />
              </div>

              <p className="text-xs text-muted-foreground mb-2">
                {strategy.description}
              </p>

              <div className="flex items-center gap-2 flex-wrap">
                {strategy.sessionBoost.map(session => (
                  <Badge 
                    key={session} 
                    variant="outline" 
                    className={cn(
                      "text-[10px] h-5",
                      session === currentSession && "bg-success/20 text-success border-success/50"
                    )}
                  >
                    {session === currentSession && <TrendingUp className="w-2 h-2 mr-1" />}
                    {session}
                  </Badge>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-border/30">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="w-3 h-3 text-warning fill-warning" />
            <span>Gold = #1</span>
          </div>
          <div className="flex items-center gap-1">
            <Flame className="w-3 h-3 text-warning" />
            <span>Boosted = Session priority</span>
          </div>
        </div>
      </div>
    </Card>
  );
};
