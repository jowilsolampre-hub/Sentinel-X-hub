// SENTINEL X - Engine Control Panel (v5)
// Start/Stop buttons with session lock status

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Square, 
  Pause, 
  Lock, 
  Unlock,
  Zap,
  AlertCircle
} from "lucide-react";

interface EngineControlPanelProps {
  isRunning: boolean;
  isPaused: boolean;
  sessionLock: {
    isLocked: boolean;
    lockedSession: string | null;
    canScan: boolean;
    scanBlockReason: string;
  };
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
}

export const EngineControlPanel = ({
  isRunning,
  isPaused,
  sessionLock,
  onStart,
  onStop,
  onPause
}: EngineControlPanelProps) => {
  return (
    <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
      {/* Engine Status */}
      <div className="flex items-center gap-2">
        <div className={cn(
          "w-3 h-3 rounded-full",
          isRunning && !isPaused && "bg-success animate-pulse",
          isRunning && isPaused && "bg-warning",
          !isRunning && "bg-muted-foreground"
        )} />
        <span className="text-sm font-medium">
          {isRunning && !isPaused && "RUNNING"}
          {isRunning && isPaused && "PAUSED"}
          {!isRunning && "STOPPED"}
        </span>
      </div>

      {/* Control Buttons */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button
            onClick={onStart}
            size="sm"
            className="gap-2 bg-success hover:bg-success/90 text-success-foreground"
          >
            <Play className="w-4 h-4" />
            START
          </Button>
        ) : (
          <>
            <Button
              onClick={onPause}
              variant={isPaused ? "default" : "outline"}
              size="sm"
              className="gap-2"
            >
              {isPaused ? (
                <>
                  <Play className="w-4 h-4" />
                  RESUME
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4" />
                  PAUSE
                </>
              )}
            </Button>
            <Button
              onClick={onStop}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Square className="w-4 h-4" />
              STOP
            </Button>
          </>
        )}
      </div>

      {/* Session Lock Status */}
      {sessionLock.isLocked && (
        <div className="flex items-center gap-2 ml-auto">
          <Lock className="w-4 h-4 text-success" />
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              sessionLock.canScan 
                ? "border-success/50 text-success" 
                : "border-warning/50 text-warning"
            )}
          >
            {sessionLock.lockedSession}
          </Badge>
          {!sessionLock.canScan && (
            <span className="text-xs text-warning flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {sessionLock.scanBlockReason}
            </span>
          )}
        </div>
      )}

      {/* Triple Validation Badge */}
      {isRunning && !isPaused && (
        <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary border-primary/30">
          <Zap className="w-3 h-3 mr-1" />
          Triple Validation Active
        </Badge>
      )}
    </div>
  );
};
