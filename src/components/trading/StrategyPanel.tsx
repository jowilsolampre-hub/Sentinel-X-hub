// SENTINEL X - Strategy Information Panel

import { STRATEGIES, MarketType } from "@/types/trading";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Target, 
  Zap,
  TrendingUp,
  Clock
} from "lucide-react";

interface StrategyPanelProps {
  marketType?: MarketType;
}

export const StrategyPanel = ({ marketType }: StrategyPanelProps) => {
  const filteredStrategies = marketType 
    ? STRATEGIES.filter(s => s.marketType === marketType)
    : STRATEGIES;

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center gap-2 mb-4">
        <Target className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Active Strategies</h3>
        <Badge variant="secondary" className="ml-auto text-xs">
          {filteredStrategies.length} loaded
        </Badge>
      </div>

      <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
        {filteredStrategies.map((strategy) => (
          <div 
            key={strategy.id}
            className={cn(
              "p-3 rounded-lg border transition-all hover:bg-secondary/50",
              strategy.marketType === "REAL" 
                ? "border-primary/20 bg-primary/5" 
                : "border-accent/20 bg-accent/5"
            )}
          >
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {strategy.marketType === "REAL" ? (
                  <TrendingUp className="w-4 h-4 text-primary" />
                ) : (
                  <Clock className="w-4 h-4 text-accent" />
                )}
                <span className="font-medium text-sm">{strategy.name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-warning" />
                <span className="text-xs text-muted-foreground">P{strategy.priority}</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pl-6">{strategy.description}</p>
            <div className="flex items-center gap-2 mt-2 pl-6">
              <Badge variant="outline" className="text-xs">
                {strategy.vector}
              </Badge>
              <Badge 
                variant="outline" 
                className={cn(
                  "text-xs",
                  strategy.marketType === "REAL" 
                    ? "border-primary/50 text-primary" 
                    : "border-accent/50 text-accent"
                )}
              >
                {strategy.marketType}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
