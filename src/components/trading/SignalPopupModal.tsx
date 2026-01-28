// SENTINEL X - Signal Popup Modal (v5)
// Prominent modal for FINAL signals with BUY/SELL direction, asset, confidence, strategy, countdown

import { useState, useEffect } from "react";
import { Signal } from "@/types/trading";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  TrendingUp,
  TrendingDown,
  Clock,
  Target,
  Zap,
  Check,
  X,
  AlertTriangle,
  Volume2,
} from "lucide-react";

interface SignalPopupModalProps {
  signal: Signal | null;
  isOpen: boolean;
  onAcknowledge: (signalId: string) => void;
  onCancel: (signalId: string) => void;
}

export const SignalPopupModal = ({
  signal,
  isOpen,
  onAcknowledge,
  onCancel,
}: SignalPopupModalProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [progress, setProgress] = useState<number>(100);
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    if (!signal) return;

    const updateTimer = () => {
      const now = new Date().getTime();
      const exec = new Date(signal.executeAt).getTime();
      const issued = new Date(signal.issuedAt).getTime();
      const remaining = Math.max(0, Math.floor((exec - now) / 1000));
      const total = Math.floor((exec - issued) / 1000);
      
      setTimeLeft(remaining);
      setProgress(total > 0 ? (remaining / total) * 100 : 0);
      setIsUrgent(remaining <= 60);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [signal]);

  if (!signal) return null;

  const isBuy = signal.direction === "BUY";

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAcknowledge = () => {
    onAcknowledge(signal.id);
  };

  const handleCancel = () => {
    onCancel(signal.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className={cn(
          "max-w-md border-2 shadow-2xl",
          isBuy 
            ? "border-buy bg-gradient-to-br from-buy/20 via-background to-buy/10" 
            : "border-sell bg-gradient-to-br from-sell/20 via-background to-sell/10",
          isUrgent && "animate-pulse"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center space-y-3">
          {/* Header Badge */}
          <div className="flex justify-center">
            <Badge 
              className={cn(
                "px-4 py-1 text-sm font-bold uppercase tracking-wider",
                isBuy ? "bg-buy text-buy-foreground" : "bg-sell text-sell-foreground"
              )}
            >
              <Volume2 className="w-4 h-4 mr-2 animate-pulse" />
              FINAL SIGNAL
            </Badge>
          </div>

          {/* Direction + Asset */}
          <div className="flex items-center justify-center gap-4">
            <div className={cn(
              "p-4 rounded-xl",
              isBuy ? "bg-buy/30" : "bg-sell/30"
            )}>
              {isBuy ? (
                <TrendingUp className="w-12 h-12 text-buy" />
              ) : (
                <TrendingDown className="w-12 h-12 text-sell" />
              )}
            </div>
            <div className="text-left">
              <DialogTitle className={cn(
                "text-4xl font-black tracking-tight",
                isBuy ? "text-buy" : "text-sell"
              )}>
                {signal.direction}
              </DialogTitle>
              <DialogDescription className="text-xl font-bold text-foreground">
                {signal.asset}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Signal Details Grid */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3 bg-secondary/50 rounded-lg flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Strategy</p>
              <p className="font-semibold text-sm">{signal.strategy}</p>
            </div>
          </div>
          <div className="p-3 bg-secondary/50 rounded-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-warning" />
            <div>
              <p className="text-xs text-muted-foreground uppercase">Confidence</p>
              <p className={cn(
                "font-bold text-lg",
                signal.confidence >= 98 ? "text-success" : "text-warning"
              )}>
                {signal.confidence.toFixed(1)}%
              </p>
            </div>
          </div>
        </div>

        {/* Execution Countdown */}
        <div className={cn(
          "p-4 rounded-lg border-2",
          isUrgent 
            ? "border-warning bg-warning/10" 
            : "border-primary/30 bg-primary/5"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className={cn(
                "w-5 h-5",
                isUrgent ? "text-warning animate-pulse" : "text-primary"
              )} />
              <span className="text-sm font-medium">Execute At (T+4)</span>
            </div>
            <span className="font-mono font-bold">
              {new Date(signal.executeAt).toLocaleTimeString()}
            </span>
          </div>
          
          <Progress 
            value={progress} 
            className={cn(
              "h-3 mb-2",
              isUrgent && "animate-pulse"
            )}
          />
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Time Remaining</span>
            <span className={cn(
              "font-mono font-bold text-2xl",
              isUrgent ? "text-warning" : "text-foreground"
            )}>
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>

        {/* Urgent Warning */}
        {isUrgent && (
          <div className="flex items-center gap-2 p-3 bg-warning/20 rounded-lg border border-warning/50">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-sm font-medium text-warning">
              Prepare for execution NOW!
            </span>
          </div>
        )}

        {/* Session + Timeframe Info */}
        <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Badge variant="outline">{signal.session}</Badge>
          <Badge variant="outline">{signal.timeframe}</Badge>
          <Badge variant="outline">{signal.marketType}</Badge>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 mt-4">
          <Button
            onClick={handleAcknowledge}
            className={cn(
              "flex-1 h-14 text-lg font-bold gap-2",
              isBuy 
                ? "bg-buy hover:bg-buy/90 text-buy-foreground" 
                : "bg-sell hover:bg-sell/90 text-sell-foreground"
            )}
          >
            <Check className="w-6 h-6" />
            EXECUTE
          </Button>
          <Button
            onClick={handleCancel}
            variant="outline"
            className="h-14 px-6 border-destructive text-destructive hover:bg-destructive/10"
          >
            <X className="w-6 h-6" />
          </Button>
        </div>

        {/* Footer Warning */}
        <p className="text-xs text-center text-muted-foreground mt-2">
          Signal will auto-expire if not acknowledged. Execute at exact entry time.
        </p>
      </DialogContent>
    </Dialog>
  );
};
