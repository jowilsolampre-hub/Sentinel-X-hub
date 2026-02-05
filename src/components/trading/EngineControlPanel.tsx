// SENTINEL X - Engine Control Panel (v5 PROTOCOL)
// Start/Stop buttons with session lock status + scan progress

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { 
  Play, 
  Square, 
  Pause, 
  Lock, 
  Unlock,
  Zap,
  AlertCircle,
  Loader2,
  Search,
  CheckCircle2
} from "lucide-react";

interface EngineControlPanelProps {
  isRunning: boolean;
  isPaused: boolean;
  isScanning?: boolean;
  scanProgress?: number;
  scanPhase?: string;
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
  isScanning = false,
  scanProgress = 0,
  scanPhase = "IDLE",
  sessionLock,
  onStart,
  onStop,
  onPause
}: EngineControlPanelProps) => {
  const getPhaseLabel = (phase: string): string => {
    switch (phase) {
      case "ANALYZING": return "Analyzing markets...";
      case "VALIDATING": return "Triple validation...";
      case "SIGNAL_READY": return "Signal ready!";
      default: return "Waiting...";
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case "ANALYZING": return <Search className="w-3 h-3 animate-pulse" />;
      case "VALIDATING": return <Loader2 className="w-3 h-3 animate-spin" />;
      case "SIGNAL_READY": return <CheckCircle2 className="w-3 h-3 text-success" />;
      default: return <Zap className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-lg border border-border/50">
        {/* Engine Status */}
        <div className="flex items-center gap-2">
          <div className={cn(
            "w-3 h-3 rounded-full",
            isScanning && "bg-primary animate-pulse",
            isRunning && !isPaused && !isScanning && "bg-success animate-pulse",
            isRunning && isPaused && "bg-warning",
            !isRunning && "bg-muted-foreground"
          )} />
          <span className="text-sm font-medium">
            {isScanning && "SCANNING"}
            {isRunning && !isPaused && !isScanning && "RUNNING"}
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
                disabled={isScanning}
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

        {/* Protocol Badge */}
        {isRunning && !isPaused && (
          <Badge variant="secondary" className="ml-auto text-xs bg-primary/20 text-primary border-primary/30">
            <Zap className="w-3 h-3 mr-1" />
            T+4 Protocol Active
          </Badge>
        )}
      </div>

      {/* Scan Progress Bar */}
      {isScanning && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm">
              {getPhaseIcon(scanPhase)}
              <span className="font-medium">{getPhaseLabel(scanPhase)}</span>
            </div>
            <span className="text-xs font-mono text-muted-foreground">{scanProgress}%</span>
          </div>
          <Progress value={scanProgress} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            Scanning selected market, vector, and timeframe with triple validation...
          </p>
        </div>
      )}
    </div>
  );
};
