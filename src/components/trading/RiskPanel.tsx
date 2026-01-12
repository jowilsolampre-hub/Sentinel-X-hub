// SENTINEL X PRIME - Risk Management Panel

import { RiskGate } from "@/types/trading";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  AlertTriangle, 
  TrendingDown,
  Ban,
  Activity
} from "lucide-react";

interface RiskPanelProps {
  riskGate: RiskGate;
}

export const RiskPanel = ({ riskGate }: RiskPanelProps) => {
  const tradeUsage = (riskGate.currentDailyTrades / riskGate.maxDailyTrades) * 100;
  const lossUsage = (riskGate.currentDailyLoss / riskGate.maxDailyLoss) * 100;
  const consecutiveProgress = (riskGate.currentConsecutiveLosses / riskGate.maxConsecutiveLosses) * 100;

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Risk Gate</h3>
        {riskGate.manualLock && (
          <span className="ml-auto flex items-center gap-1 text-destructive text-sm">
            <Ban className="w-4 h-4" />
            LOCKED
          </span>
        )}
      </div>

      <div className="space-y-4">
        {/* Daily Trades */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Daily Trades</span>
            </div>
            <span className="font-mono text-sm">
              {riskGate.currentDailyTrades}/{riskGate.maxDailyTrades}
            </span>
          </div>
          <Progress 
            value={tradeUsage} 
            className={cn(
              "h-2",
              tradeUsage >= 80 && "[&>div]:bg-warning",
              tradeUsage >= 95 && "[&>div]:bg-destructive"
            )}
          />
        </div>

        {/* Consecutive Losses */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Loss Streak</span>
            </div>
            <span className="font-mono text-sm">
              {riskGate.currentConsecutiveLosses}/{riskGate.maxConsecutiveLosses}
            </span>
          </div>
          <Progress 
            value={consecutiveProgress} 
            className={cn(
              "h-2",
              consecutiveProgress >= 66 && "[&>div]:bg-warning",
              consecutiveProgress >= 100 && "[&>div]:bg-destructive"
            )}
          />
        </div>

        {/* Daily Loss */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Daily Loss</span>
            </div>
            <span className="font-mono text-sm">
              ${riskGate.currentDailyLoss}/${riskGate.maxDailyLoss}
            </span>
          </div>
          <Progress 
            value={lossUsage} 
            className={cn(
              "h-2",
              lossUsage >= 60 && "[&>div]:bg-warning",
              lossUsage >= 80 && "[&>div]:bg-destructive"
            )}
          />
        </div>

        {/* Warning Messages */}
        {(tradeUsage >= 80 || consecutiveProgress >= 66 || lossUsage >= 60) && (
          <div className="mt-4 p-3 bg-warning/10 border border-warning/30 rounded-lg">
            <div className="flex items-center gap-2 text-warning">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">Risk levels approaching limits</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
