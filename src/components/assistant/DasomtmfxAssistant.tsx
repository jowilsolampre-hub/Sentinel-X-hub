// DASOMTMFX - Master Brain AI Assistant (Full App Control)
import { useState, useRef, useCallback, useEffect, Suspense } from "react";
import { RobotScene, type RobotState } from "./RobotCharacter";
import { ChatPanel } from "./ChatPanel";
import { Button } from "@/components/ui/button";
import { MessageSquare, Minimize2, Maximize2, X, GripVertical } from "lucide-react";
import type { Signal } from "@/types/trading";

// Full app state the assistant can READ
export interface AssistantContext {
  // Market selection
  pair?: string;
  timeframe?: string;
  marketMode?: string;
  selectedVector?: string;
  selectedBroker?: string;
  selectedTimeframes?: string[];
  // Engine state
  engineStatus?: string;
  isPaused?: boolean;
  isRunning?: boolean;
  isScanning?: boolean;
  scanPhase?: string;
  scanProgress?: number;
  // Signal state
  signals?: Signal[];
  lastSignal?: string;
  signalDirection?: "BUY" | "SELL" | null;
  setupGrade?: string;
  confidence?: number;
  pendingAcknowledgment?: Signal | null;
  // Stats
  winRate?: number;
  totalSignals?: number;
  pendingSignals?: number;
  executedSignals?: number;
  // Risk
  riskLocked?: boolean;
  maxDailyTrades?: number;
  currentDailyTrades?: number;
  consecutiveLosses?: number;
  maxConsecutiveLosses?: number;
  currentDailyLoss?: number;
  maxDailyLoss?: number;
  // Session
  session?: string;
  sessionLocked?: boolean;
  sessionCanScan?: boolean;
  sessionBlockReason?: string;
  activeCooldowns?: number;
  // Connections
  tvConnected?: boolean;
  activeTab?: string;
  scanStatus?: string;
}

// Actions the assistant can PERFORM on the app
export interface AssistantActions {
  startEngine: () => void;
  stopEngine: () => void;
  pauseEngine: () => void;
  clearSignals: () => void;
  clearAllHistory: () => void;
  toggleRiskLock: () => void;
  acknowledgeSignal: (id: string) => void;
  cancelSignal: (id: string) => void;
  setMarketCategory: (cat: string) => void;
  setSelectedVector: (vec: string) => void;
  setSelectedTimeframes: (tfs: string[]) => void;
  setSelectedBroker: (broker: string) => void;
  setActiveTab: (tab: string) => void;
}

interface DasomtmfxAssistantProps {
  context?: AssistantContext;
  actions?: AssistantActions;
}

type DisplayMode = "full" | "compact" | "orb" | "hidden";

const STORAGE_KEY = "dasomtmfx_position";
const MODE_KEY = "dasomtmfx_mode";

function loadPosition(): { x: number; y: number } {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return { x: window.innerWidth - 200, y: window.innerHeight - 300 };
}

function savePosition(pos: { x: number; y: number }) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)); } catch {}
}

export const DasomtmfxAssistant = ({ context = {}, actions }: DasomtmfxAssistantProps) => {
  const [mode, setMode] = useState<DisplayMode>(() => {
    try { return (localStorage.getItem(MODE_KEY) as DisplayMode) || "compact"; } catch { return "compact"; }
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [robotState, setRobotState] = useState<RobotState>("idle");
  const [position, setPosition] = useState(loadPosition);
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try { localStorage.setItem(MODE_KEY, mode); } catch {}
  }, [mode]);

  // Derive robot state from full app context
  useEffect(() => {
    if (context.riskLocked) {
      setRobotState("warning");
    } else if (context.scanStatus === "analyzing" || context.isScanning) {
      setRobotState("thinking");
    } else if (context.scanStatus === "capturing") {
      setRobotState("listening");
    } else if (context.lastSignal && (context.lastSignal === "BUY" || context.lastSignal === "SELL")) {
      setRobotState("alert");
      const timer = setTimeout(() => setRobotState("idle"), 5000);
      return () => clearTimeout(timer);
    } else if (context.engineStatus === "RUNNING" || context.scanStatus === "running") {
      setRobotState("success");
    } else if (context.isPaused) {
      setRobotState("listening");
    } else {
      setRobotState("idle");
    }
  }, [context.scanStatus, context.lastSignal, context.isScanning, context.riskLocked, context.engineStatus, context.isPaused]);

  // Drag handlers
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button, input, [role='button']")) return;
    setIsDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    e.preventDefault();
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      const newX = Math.max(0, Math.min(window.innerWidth - 100, e.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, e.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };
    const onUp = () => { setIsDragging(false); savePosition(position); };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, position]);

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if ((e.target as HTMLElement).closest("button, input, [role='button']")) return;
    const touch = e.touches[0];
    setIsDragging(true);
    dragOffset.current = { x: touch.clientX - position.x, y: touch.clientY - position.y };
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const newX = Math.max(0, Math.min(window.innerWidth - 100, touch.clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(window.innerHeight - 100, touch.clientY - dragOffset.current.y));
      setPosition({ x: newX, y: newY });
    };
    const onUp = () => { setIsDragging(false); savePosition(position); };
    window.addEventListener("touchmove", onMove, { passive: false });
    window.addEventListener("touchend", onUp);
    return () => { window.removeEventListener("touchmove", onMove); window.removeEventListener("touchend", onUp); };
  }, [isDragging, position]);

  if (mode === "hidden") {
    return (
      <Button
        variant="outline"
        size="sm"
        className="fixed bottom-4 right-4 z-[9999] gap-2 bg-card/90 backdrop-blur-sm border-primary/30"
        onClick={() => setMode("compact")}
      >
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        DASOMTMFX
      </Button>
    );
  }

  const robotSize = mode === "full" ? { w: 200, h: 220 } : mode === "compact" ? { w: 140, h: 150 } : { w: 60, h: 60 };
  const statusText = context.isScanning ? "Scanning" : context.engineStatus === "RUNNING" ? "Active" : context.isPaused ? "Paused" : "Idle";
  const statusColor = context.isScanning ? "text-chart-4" : context.engineStatus === "RUNNING" ? "text-chart-2" : "text-muted-foreground";

  return (
    <>
      <div
        ref={containerRef}
        className="fixed z-[9998] select-none"
        style={{ left: position.x, top: position.y, cursor: isDragging ? "grabbing" : "grab" }}
        onMouseDown={onMouseDown}
        onTouchStart={onTouchStart}
      >
        <div className="flex flex-col items-center">
          {mode !== "orb" ? (
            <div className="relative rounded-xl overflow-hidden" style={{ width: robotSize.w, height: robotSize.h }}>
              <Suspense fallback={
                <div className="w-full h-full flex items-center justify-center bg-card/50 rounded-xl border border-border/30">
                  <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              }>
                <RobotScene state={robotState} signalDirection={context.signalDirection || null} />
              </Suspense>
              <div className="absolute top-1 left-1 opacity-30 hover:opacity-70 transition-opacity">
                <GripVertical className="w-3 h-3" />
              </div>
            </div>
          ) : (
            <div
              className="w-14 h-14 rounded-full bg-gradient-to-br from-primary/40 to-chart-4/40 border-2 border-primary/60 flex items-center justify-center cursor-pointer hover:border-primary transition-all shadow-lg hover:scale-110"
              style={{ boxShadow: `0 0 25px hsl(var(--primary) / 0.4)` }}
              onClick={() => setChatOpen(!chatOpen)}
            >
              <div className="w-3.5 h-3.5 rounded-full bg-primary animate-pulse" />
            </div>
          )}

          {mode !== "orb" && (
            <div className="mt-1 text-center">
              <p className="text-[10px] font-bold tracking-wider text-foreground/90">DASOMTMFX</p>
              {mode === "full" && (
                <>
                  <p className="text-[8px] text-muted-foreground">AI Trading Guide</p>
                  <p className={`text-[8px] font-medium ${statusColor}`}>{statusText}</p>
                </>
              )}
            </div>
          )}

          {mode !== "orb" && (
            <div className="flex items-center gap-1 mt-1">
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setChatOpen(!chatOpen); }}>
                <MessageSquare className="w-3 h-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setMode(mode === "full" ? "compact" : "full"); }}>
                {mode === "full" ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setMode("orb"); }}>
                <div className="w-2 h-2 rounded-full bg-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setMode("hidden"); }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>

        {chatOpen && (
          <div className="absolute top-0 right-full mr-2" style={{ transform: position.x < 360 ? "translateX(calc(100% + 200px))" : "none" }}>
            <ChatPanel
              isOpen={chatOpen}
              onClose={() => setChatOpen(false)}
              onMinimize={() => setChatOpen(false)}
              context={context}
              actions={actions}
              voiceEnabled={voiceEnabled}
              onToggleVoice={() => setVoiceEnabled(!voiceEnabled)}
            />
          </div>
        )}
      </div>
    </>
  );
};
