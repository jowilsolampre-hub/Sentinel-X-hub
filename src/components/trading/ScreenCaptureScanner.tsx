// SENTINEL X - Screen Capture Scanner (Windows Overlay Mode)
// Disciplined, confluence-based, entry-timing expert scanner
// Full 14-point guru protocol with 3-gate system

import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor, Camera, Loader2, TrendingUp, TrendingDown, Minus, X, Play, Square,
  GripVertical, Maximize2, Minimize2, Clock, AlertTriangle, Timer, Shield,
  Target, Zap, BarChart3,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { MarketCategory } from "@/components/trading/MarketCategorySelector";
import type { VectorOption } from "@/components/trading/VectorSelector";
import type { TimeframeOption } from "@/components/trading/TimeframeSelector";
import { getTimeframeMinutes } from "@/components/trading/TimeframeSelector";

interface AnalysisResult {
  analysis: string;
  direction: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  signalStrength: "high" | "medium" | "low" | "wait" | "conditional";
  setupGrade?: string;
  entryAction?: string;
  confluenceScore?: number;
  executionQuality?: number;
  marketRegime?: string;
  strategyUsed?: string;
  expirySuggestion?: string;
  triggerCondition?: string;
  timestamp: string;
  // 7-Gate fields
  gatesPassed?: number | null;
  gateScores?: {
    regime: number; location: number; trigger: number;
    memory: number; shift: number; prediction: number; community: number;
  } | null;
  // Indicator optimization fields
  indicatorsViable?: string | null;
  bestIndicatorStack?: string | null;
  suggestedIndicators?: string[];
  optimalTimeframe?: string | null;
  timeframeReason?: string | null;
}

interface Position { x: number; y: number; }

interface ScreenCaptureScannerProps {
  market?: MarketCategory;
  vector?: VectorOption;
  timeframe?: TimeframeOption;
}

export const ScreenCaptureScanner = ({ market, vector, timeframe }: ScreenCaptureScannerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [autoInterval, setAutoInterval] = useState(30);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });
  const [nextCandleCountdown, setNextCandleCountdown] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const tfMinutes = getTimeframeMinutes(timeframe || "5m");

  const getNextCandleStart = useCallback((): Date => {
    const now = new Date();
    const minutes = now.getMinutes();
    const minutesIntoCandle = minutes % tfMinutes;
    const minutesUntilNext = tfMinutes - minutesIntoCandle;
    const nextCandle = new Date(now);
    nextCandle.setMinutes(minutes + minutesUntilNext);
    nextCandle.setSeconds(0);
    nextCandle.setMilliseconds(0);
    return nextCandle;
  }, [tfMinutes]);

  useEffect(() => {
    if (!isCapturing) return;
    const timer = setInterval(() => {
      const next = getNextCandleStart();
      const remaining = Math.max(0, Math.floor((next.getTime() - Date.now()) / 1000));
      setNextCandleCountdown(remaining);
    }, 200);
    return () => clearInterval(timer);
  }, [isCapturing, getNextCandleStart]);

  const startCapture = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: { cursor: "never" } as any, audio: false });
      streamRef.current = stream;
      if (videoRef.current) { videoRef.current.srcObject = stream; await videoRef.current.play(); }
      setIsCapturing(true);
      toast.success("Screen capture started — position over your chart");
      stream.getVideoTracks()[0].onended = () => stopCapture();
    } catch { toast.error("Screen capture failed — please allow screen sharing"); }
  }, []);

  const stopCapture = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCapturing(false); setAutoScan(false);
    if (autoScanTimerRef.current) { clearInterval(autoScanTimerRef.current); autoScanTimerRef.current = null; }
  }, []);

  const grabFrame = useCallback((): string | null => {
    const video = videoRef.current; const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    canvas.width = video.videoWidth; canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d"); if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/png", 0.9);
  }, []);

  const analyzeFrame = useCallback(async () => {
    const frame = grabFrame();
    if (!frame) { toast.error("No frame — start screen capture first"); return; }
    setIsAnalyzing(true); setResult(null);
    const nextCandle = getNextCandleStart();

    try {
      const { data, error } = await supabase.functions.invoke("analyze-trend", {
        body: {
          imageBase64: frame,
          market: market || "REAL",
          vector: vector || "Hybrid",
          timeframe: timeframe || "5m",
          mode: "next-candle",
          marketContext: `WINDOWS OVERLAY | Next candle: ${nextCandle.toLocaleTimeString()} | Market: ${market || "REAL"} | Vector: ${vector || "Hybrid"} | TF: ${timeframe || "5m"}`,
        },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      setResult(data);

      // Audio + toast for signals
      if (data.signalStrength === "high" || data.signalStrength === "medium") {
        const actionText = data.entryAction?.includes("NEXT_CANDLE") ? "ENTER NEXT CANDLE" : data.entryAction?.includes("WAIT") ? "WAIT FOR CONFIRMATION" : data.direction === "BUY" ? ">>> ENTER UP <<<" : ">>> ENTER DOWN <<<";
        toast.success(`🎯 ${actionText} — ${data.confidence}% [${data.setupGrade}] | ${data.entryAction}`, { duration: 15000 });
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator(); const gain = audioCtx.createGain();
          osc.connect(gain); gain.connect(audioCtx.destination);
          osc.frequency.value = data.direction === "BUY" ? 880 : 440;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
          osc.start(audioCtx.currentTime); osc.stop(audioCtx.currentTime + 0.8);
        } catch {}
      } else if (data.signalStrength === "conditional") {
        toast.info(`⏳ CONDITIONAL: ${data.entryAction} — ${data.confidence}%`, { duration: 10000 });
      } else if (data.direction === "NEUTRAL") {
        toast.info("NO TRADE — All 4 fallback modes checked");
      } else {
        toast.info(`${data.direction} (${data.confidence}%) — low quality, consider waiting`);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally { setIsAnalyzing(false); }
  }, [grabFrame, getNextCandleStart, market, vector, timeframe]);

  const toggleAutoScan = useCallback(() => {
    if (autoScan) {
      setAutoScan(false);
      if (autoScanTimerRef.current) { clearInterval(autoScanTimerRef.current); autoScanTimerRef.current = null; }
      toast.info("Auto-scan stopped");
    } else {
      if (!isCapturing) { toast.error("Start screen capture first"); return; }
      setAutoScan(true); analyzeFrame();
      autoScanTimerRef.current = setInterval(() => analyzeFrame(), autoInterval * 1000);
      toast.success(`Auto-scan every ${autoInterval}s`);
    }
  }, [autoScan, isCapturing, analyzeFrame, autoInterval]);

  useEffect(() => { return () => stopCapture(); }, [stopCapture]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true); setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove); window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [isDragging, dragOffset]);

  const formatCountdown = (seconds: number) => `${Math.floor(seconds / 60)}:${(seconds % 60).toString().padStart(2, '0')}`;

  // Grade color helper
  const getGradeColor = (grade?: string) => {
    if (grade === "A_SETUP") return "text-success";
    if (grade === "B_SETUP") return "text-primary";
    if (grade === "C_SETUP") return "text-warning";
    return "text-destructive";
  };

  const getGradeBg = (grade?: string) => {
    if (grade === "A_SETUP") return "bg-success/15 border-success/50";
    if (grade === "B_SETUP") return "bg-primary/15 border-primary/50";
    if (grade === "C_SETUP") return "bg-warning/15 border-warning/50";
    return "bg-destructive/15 border-destructive/50";
  };

  const getSignalColor = () => {
    if (!result) return "";
    if (result.signalStrength === "high") return "text-success";
    if (result.signalStrength === "medium") return "text-success";
    if (result.signalStrength === "conditional") return "text-warning";
    if (result.signalStrength === "wait") return "text-muted-foreground";
    if (result.direction === "SELL") return "text-destructive";
    return "text-muted-foreground";
  };

  const getSignalBg = () => {
    if (!result) return "";
    if (result.signalStrength === "conditional") return "bg-warning/15 border-warning/40";
    if (result.direction === "BUY") return "bg-success/15 border-success/40";
    if (result.direction === "SELL") return "bg-destructive/15 border-destructive/40";
    return "bg-secondary/30 border-border/50";
  };

  const getSignalText = () => {
    if (!result) return "";
    if (result.direction === "NEUTRAL") return "NO TRADE";
    if (result.entryAction?.includes("NEXT_CANDLE")) return `${result.direction} — NEXT CANDLE`;
    if (result.entryAction?.includes("WAIT")) return `${result.direction} — WAIT`;
    if (result.entryAction?.includes("BREAK")) return `${result.direction} — ON BREAK`;
    if (result.entryAction?.includes("RETEST")) return `${result.direction} — ON RETEST`;
    if (result.direction === "BUY") return ">>> ENTER UP <<<";
    if (result.direction === "SELL") return ">>> ENTER DOWN <<<";
    return "NO TRADE";
  };

  const getEntryIcon = () => {
    if (!result) return null;
    if (result.entryAction === "ENTER_NOW") return <Zap className="w-5 h-5" />;
    if (result.entryAction?.includes("WAIT") || result.entryAction?.includes("NEXT")) return <Clock className="w-5 h-5" />;
    if (result.entryAction?.includes("BREAK")) return <Target className="w-5 h-5" />;
    if (result.direction === "BUY") return <TrendingUp className="w-5 h-5" />;
    if (result.direction === "SELL") return <TrendingDown className="w-5 h-5" />;
    return <Minus className="w-5 h-5" />;
  };

  if (!isOpen) {
    return (
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setIsOpen(true)}>
        <Monitor className="w-4 h-4" />
        Screen Scanner
      </Button>
    );
  }

  return (
    <>
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      <div className="fixed z-50 shadow-2xl" style={{ left: position.x, top: position.y, width: isMinimized ? 300 : 460, transition: isDragging ? "none" : "width 0.2s ease" }}>
        <Card className="border border-primary/40 bg-card overflow-hidden">
          {/* Title bar */}
          <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border/50 cursor-grab active:cursor-grabbing select-none" onMouseDown={handleMouseDown}>
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <Shield className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">SENTINEL X — Guru Scanner</span>
              {isCapturing && (
                <Badge variant="outline" className="text-[10px] h-4 gap-1 border-success/50 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> LIVE
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsMinimized(!isMinimized)}>
                {isMinimized ? <Maximize2 className="w-3 h-3" /> : <Minimize2 className="w-3 h-3" />}
              </Button>
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={() => { stopCapture(); setIsOpen(false); }}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="p-3 space-y-3 max-h-[85vh] overflow-y-auto">
              {/* Scan context */}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <Badge variant="secondary" className="h-5">{market || "REAL"}</Badge>
                <Badge variant="secondary" className="h-5">{vector || "Hybrid"}</Badge>
                <Badge variant="secondary" className="h-5">TF: {timeframe || "5m"}</Badge>
                <Badge variant="outline" className="h-5 text-primary border-primary/50">7-Gate • Guru Protocol</Badge>
              </div>

              {/* Next Candle Countdown */}
              {isCapturing && (
                <div className="p-3 bg-secondary/40 rounded-lg border border-border/50 text-center">
                  <div className="flex items-center justify-center gap-2 mb-1">
                    <Timer className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground font-medium">Next Candle Opens In</span>
                  </div>
                  <p className={`text-3xl font-mono font-bold ${nextCandleCountdown <= 30 ? "text-destructive animate-pulse" : "text-foreground"}`}>
                    {formatCountdown(nextCandleCountdown)}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Entry @ {getNextCandleStart().toLocaleTimeString()} • {(timeframe || "5m").toUpperCase()}
                  </p>
                </div>
              )}

              {/* Capture preview */}
              {isCapturing && (
                <div className="relative rounded-md overflow-hidden border border-border/50 bg-secondary/30">
                  <video ref={(el) => { if (el && streamRef.current) { el.srcObject = streamRef.current; el.play().catch(() => {}); } }} className="w-full h-28 object-contain" muted playsInline />
                  <div className="absolute top-1 right-1">
                    <Badge className="text-[10px] bg-destructive/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse mr-1" /> REC
                    </Badge>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-wrap gap-2">
                {!isCapturing ? (
                  <Button size="sm" className="gap-1.5 flex-1" onClick={startCapture}>
                    <Monitor className="w-3.5 h-3.5" /> Start Capture
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={stopCapture}>
                      <Square className="w-3 h-3" /> Stop
                    </Button>
                    <Button size="sm" className="gap-1.5 flex-1" onClick={analyzeFrame} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {isAnalyzing ? "Analyzing..." : "Scan Now"}
                    </Button>
                    <Button size="sm" variant={autoScan ? "destructive" : "outline"} className="gap-1.5" onClick={toggleAutoScan}>
                      {autoScan ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {autoScan ? "Stop" : "Auto"}
                    </Button>
                  </>
                )}
              </div>

              {/* Auto-scan interval */}
              {isCapturing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" /> <span>Interval:</span>
                  {[15, 30, 60].map((s) => (
                    <Button key={s} variant={autoInterval === s ? "default" : "ghost"} size="sm" className="h-5 px-2 text-[10px]" onClick={() => setAutoInterval(s)}>{s}s</Button>
                  ))}
                </div>
              )}

              {/* SIGNAL RESULT */}
              {result && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                  {/* Main signal banner */}
                  <div className={`p-3 rounded-lg border-2 text-center ${getSignalBg()}`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      <span className={getSignalColor()}>{getEntryIcon()}</span>
                      <span className={`font-black text-lg ${getSignalColor()}`}>{getSignalText()}</span>
                    </div>
                    <span className={`font-mono text-2xl font-black ${getSignalColor()}`}>{result.confidence}%</span>
                    {result.entryAction && result.entryAction !== "NO_TRADE" && (
                      <p className="text-[10px] text-muted-foreground mt-1">
                        Entry @ {getNextCandleStart().toLocaleTimeString()} • Action: {result.entryAction}
                      </p>
                    )}
                  </div>

                  {/* Scores row */}
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className={`p-1.5 rounded border ${getGradeBg(result.setupGrade)}`}>
                      <p className="text-[9px] text-muted-foreground">Grade</p>
                      <p className={`text-xs font-bold ${getGradeColor(result.setupGrade)}`}>{result.setupGrade?.replace("_", " ") || "—"}</p>
                    </div>
                    <div className="p-1.5 rounded border border-border/50 bg-secondary/30">
                      <p className="text-[9px] text-muted-foreground">Confluence</p>
                      <p className="text-xs font-bold">{result.confluenceScore ?? "—"}/10</p>
                    </div>
                    <div className="p-1.5 rounded border border-border/50 bg-secondary/30">
                      <p className="text-[9px] text-muted-foreground">Exec Quality</p>
                      <p className="text-xs font-bold">{result.executionQuality ?? "—"}/10</p>
                    </div>
                    <div className="p-1.5 rounded border border-border/50 bg-secondary/30">
                      <p className="text-[9px] text-muted-foreground">Gates</p>
                      <p className={`text-xs font-bold ${(result.gatesPassed ?? 0) >= 5 ? "text-success" : (result.gatesPassed ?? 0) >= 3 ? "text-warning" : "text-destructive"}`}>{result.gatesPassed ?? "—"}/7</p>
                    </div>
                  </div>

                  {/* 7-Gate Detail Row */}
                  {result.gateScores && (
                    <div className="grid grid-cols-7 gap-1 text-center">
                      {[
                        { label: "Regime", score: result.gateScores.regime },
                        { label: "Location", score: result.gateScores.location },
                        { label: "Trigger", score: result.gateScores.trigger },
                        { label: "Memory", score: result.gateScores.memory },
                        { label: "Shift", score: result.gateScores.shift },
                        { label: "Predict", score: result.gateScores.prediction },
                        { label: "Crowd", score: result.gateScores.community },
                      ].map((gate) => (
                        <div key={gate.label} className={`p-1 rounded border text-[9px] ${
                          gate.score >= 2 ? "border-success/40 bg-success/10 text-success" :
                          gate.score >= 1 ? "border-warning/40 bg-warning/10 text-warning" :
                          "border-destructive/40 bg-destructive/10 text-destructive"
                        }`}>
                          <p className="text-[8px] text-muted-foreground truncate">{gate.label}</p>
                          <p className="font-bold">{gate.score}/3</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Strategy + Expiry */}
                  {result.strategyUsed && (
                    <div className="px-2 py-1.5 bg-primary/10 rounded border border-primary/20">
                      <div className="flex items-center gap-1.5">
                        <BarChart3 className="w-3 h-3 text-primary" />
                        <p className="text-[10px] text-muted-foreground">Strategy</p>
                      </div>
                      <p className="text-xs font-medium">{result.strategyUsed}</p>
                    </div>
                  )}

                  {/* Trigger condition (for conditional entries) */}
                  {result.triggerCondition && result.signalStrength === "conditional" && (
                    <div className="px-2 py-1.5 bg-warning/10 rounded border border-warning/30">
                      <div className="flex items-center gap-1.5">
                        <Target className="w-3 h-3 text-warning" />
                        <p className="text-[10px] text-warning font-medium">Trigger Condition</p>
                      </div>
                      <p className="text-xs">{result.triggerCondition}</p>
                    </div>
                  )}

                  {result.expirySuggestion && (
                    <div className="px-2 py-1 bg-secondary/30 rounded border border-border/30">
                      <p className="text-[10px] text-muted-foreground">Expiry: <span className="text-foreground font-medium">{result.expirySuggestion}</span></p>
                    </div>
                  )}

                  {/* Indicator Optimization */}
                  {result.suggestedIndicators && result.suggestedIndicators.length > 0 && (
                    <div className="px-2 py-2 bg-accent/10 rounded-lg border border-accent/30">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <BarChart3 className="w-3 h-3 text-accent" />
                        <p className="text-[10px] font-bold text-accent">
                          {result.indicatorsViable === "NO" ? "⚠️ WRONG INDICATORS" : result.indicatorsViable === "PARTIAL" ? "📊 ADD THESE INDICATORS" : "💡 SUGGESTED INDICATORS"}
                        </p>
                        {result.bestIndicatorStack && (
                          <Badge variant="outline" className="text-[9px] h-4 ml-auto border-accent/50 text-accent">
                            Stack {result.bestIndicatorStack}
                          </Badge>
                        )}
                      </div>
                      {result.suggestedIndicators.map((ind, i) => (
                        <p key={i} className="text-[10px] text-muted-foreground ml-2">• {ind}</p>
                      ))}
                    </div>
                  )}

                  {/* Optimal Timeframe Suggestion */}
                  {result.optimalTimeframe && result.timeframeReason && (
                    <div className="px-2 py-1.5 bg-primary/10 rounded border border-primary/20">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3 h-3 text-primary" />
                        <p className="text-[10px] text-primary font-medium">Optimal TF: {result.optimalTimeframe}</p>
                      </div>
                      <p className="text-[10px] text-muted-foreground ml-4">{result.timeframeReason}</p>
                    </div>
                  )}

                  {/* Full analysis */}
                  <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/50 max-h-48 overflow-y-auto">
                    <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">{result.analysis}</pre>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    <span className="flex items-center gap-1">
                      <Shield className="w-3 h-3" /> SENTINEL X • 7-Gate Guru Protocol
                    </span>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isAnalyzing && !result && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">7-Gate Guru Analysis...</p>
                  <p className="text-[10px] text-muted-foreground">Regime → Location → Trigger → Memory → Shift → Prediction → Crowd</p>
                </div>
              )}
            </div>
          )}

          {/* Minimized strip */}
          {isMinimized && (
            <div className={`px-3 py-2 flex items-center justify-between ${result ? getSignalBg() : "bg-secondary/30"}`}>
              {result ? (
                <>
                  <div className="flex items-center gap-2">
                    <span className={getSignalColor()}>{getEntryIcon()}</span>
                    <span className={`font-bold text-xs ${getSignalColor()}`}>{getSignalText()}</span>
                    {result.setupGrade && <Badge variant="outline" className={`text-[9px] h-4 ${getGradeColor(result.setupGrade)}`}>{result.setupGrade?.replace("_", " ")}</Badge>}
                  </div>
                  <span className={`font-mono text-sm font-bold ${getSignalColor()}`}>{result.confidence}%</span>
                </>
              ) : (
                <div className="flex items-center gap-2 w-full justify-between">
                  <span className="text-xs text-muted-foreground">Next candle</span>
                  <span className="font-mono text-sm font-bold">{formatCountdown(nextCandleCountdown)}</span>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </>
  );
};
