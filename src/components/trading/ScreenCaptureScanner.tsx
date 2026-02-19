// SENTINEL X - Screen Capture Scanner (Windows Overlay Mode)
// Captures screen/window, analyzes chart via AI — signals for NEXT candle opening
// Uses full indicator protocol from PDF

import { useState, useRef, useCallback, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Monitor,
  Camera,
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  X,
  Play,
  Square,
  GripVertical,
  Maximize2,
  Minimize2,
  Clock,
  AlertTriangle,
  Timer,
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
  signalStrength: "high" | "medium" | "low" | "wait";
  strategyUsed?: string;
  indicatorsDetected?: string;
  timestamp: string;
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
  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  const tfMinutes = getTimeframeMinutes(timeframe || "5m");

  // Calculate next candle start
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

  // Countdown to next candle
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
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: "never" } as any,
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCapturing(true);
      toast.success("Screen capture started — position over your chart");
      stream.getVideoTracks()[0].onended = () => stopCapture();
    } catch (err) {
      console.error("Screen capture error:", err);
      toast.error("Screen capture failed — please allow screen sharing");
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCapturing(false);
    setAutoScan(false);
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
  }, []);

  const grabFrame = useCallback((): string | null => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL("image/png", 0.85);
  }, []);

  const analyzeFrame = useCallback(async () => {
    const frame = grabFrame();
    if (!frame) {
      toast.error("No frame — start screen capture first");
      return;
    }
    setIsAnalyzing(true);
    setResult(null);

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

      // Audio + toast for high-confidence signals
      if (data.direction !== "NEUTRAL" && data.confidence >= 80) {
        toast.success(
          `🎯 ${data.direction === "BUY" ? ">>> ENTER UP <<<" : ">>> ENTER DOWN <<<"} — ${data.confidence}% | Entry @ ${nextCandle.toLocaleTimeString()}`,
          { duration: 15000 }
        );
        // Beep alert
        try {
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.value = data.direction === "BUY" ? 880 : 440;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.4, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.8);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.8);
        } catch {}
      } else if (data.direction === "NEUTRAL") {
        toast.info("NO CLEAR TRADE — WAIT");
      } else {
        toast.info(`${data.direction} (${data.confidence}%) — weak confluence`);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [grabFrame, getNextCandleStart, market, vector, timeframe]);

  const toggleAutoScan = useCallback(() => {
    if (autoScan) {
      setAutoScan(false);
      if (autoScanTimerRef.current) {
        clearInterval(autoScanTimerRef.current);
        autoScanTimerRef.current = null;
      }
      toast.info("Auto-scan stopped");
    } else {
      if (!isCapturing) {
        toast.error("Start screen capture first");
        return;
      }
      setAutoScan(true);
      analyzeFrame();
      autoScanTimerRef.current = setInterval(() => analyzeFrame(), autoInterval * 1000);
      toast.success(`Auto-scan every ${autoInterval}s`);
    }
  }, [autoScan, isCapturing, analyzeFrame, autoInterval]);

  useEffect(() => {
    return () => stopCapture();
  }, [stopCapture]);

  // Drag logic
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
  }, [position]);

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, dragOffset]);

  const formatCountdown = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Color helpers
  const getSignalColor = () => {
    if (!result) return "";
    if (result.signalStrength === "high") return "text-success";
    if (result.signalStrength === "medium") return "text-success";
    if (result.signalStrength === "wait") return "text-warning";
    if (result.direction === "SELL") return "text-destructive";
    return "text-muted-foreground";
  };

  const getSignalBg = () => {
    if (!result) return "";
    if (result.direction === "BUY") return "bg-success/15 border-success/40";
    if (result.direction === "SELL") return "bg-destructive/15 border-destructive/40";
    return "bg-warning/15 border-warning/40";
  };

  const getSignalText = () => {
    if (!result) return "";
    if (result.direction === "BUY") return ">>> ENTER UP <<<";
    if (result.direction === "SELL") return ">>> ENTER DOWN <<<";
    return "NO CLEAR TRADE — WAIT";
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

      <div
        className="fixed z-50 shadow-2xl"
        style={{ left: position.x, top: position.y, width: isMinimized ? 300 : 440, transition: isDragging ? "none" : "width 0.2s ease" }}
      >
        <Card className="border border-primary/40 bg-card overflow-hidden">
          {/* Title bar */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border/50 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <Monitor className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">AI Float Trader</span>
              {isCapturing && (
                <Badge variant="outline" className="text-[10px] h-4 gap-1 border-success/50 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  LIVE
                </Badge>
              )}
              {autoScan && (
                <Badge variant="outline" className="text-[10px] h-4 border-primary/50 text-primary">AUTO</Badge>
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
            <div className="p-3 space-y-3 max-h-[80vh] overflow-y-auto">
              {/* Scan context badges */}
              <div className="flex flex-wrap gap-1.5 text-[10px]">
                <Badge variant="secondary" className="h-5">{market || "REAL"}</Badge>
                <Badge variant="secondary" className="h-5">{vector || "Hybrid"}</Badge>
                <Badge variant="secondary" className="h-5">TF: {timeframe || "5m"}</Badge>
                <Badge variant="outline" className="h-5 text-primary border-primary/50">Next Candle Mode</Badge>
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
                  <video
                    ref={(el) => {
                      if (el && streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    className="w-full h-28 object-contain"
                    muted playsInline
                  />
                  <div className="absolute top-1 right-1">
                    <Badge className="text-[10px] bg-destructive/80">
                      <span className="w-1.5 h-1.5 rounded-full bg-destructive-foreground animate-pulse mr-1" />
                      REC
                    </Badge>
                  </div>
                </div>
              )}

              {/* Controls */}
              <div className="flex flex-wrap gap-2">
                {!isCapturing ? (
                  <Button size="sm" className="gap-1.5 flex-1" onClick={startCapture}>
                    <Monitor className="w-3.5 h-3.5" />
                    Start Capture
                  </Button>
                ) : (
                  <>
                    <Button size="sm" variant="destructive" className="gap-1.5" onClick={stopCapture}>
                      <Square className="w-3 h-3" />
                      Stop
                    </Button>
                    <Button size="sm" className="gap-1.5 flex-1" onClick={analyzeFrame} disabled={isAnalyzing}>
                      {isAnalyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                      {isAnalyzing ? "Analyzing..." : "Scan Now"}
                    </Button>
                    <Button
                      size="sm"
                      variant={autoScan ? "destructive" : "outline"}
                      className="gap-1.5"
                      onClick={toggleAutoScan}
                    >
                      {autoScan ? <Square className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      {autoScan ? "Stop Auto" : "Auto"}
                    </Button>
                  </>
                )}
              </div>

              {/* Auto-scan interval */}
              {isCapturing && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>Interval:</span>
                  {[15, 30, 60].map((s) => (
                    <Button key={s} variant={autoInterval === s ? "default" : "ghost"} size="sm" className="h-5 px-2 text-[10px]" onClick={() => setAutoInterval(s)}>
                      {s}s
                    </Button>
                  ))}
                </div>
              )}

              {/* SIGNAL RESULT */}
              {result && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                  {/* Main signal banner */}
                  <div className={`p-3 rounded-lg border-2 text-center ${getSignalBg()}`}>
                    <div className="flex items-center justify-center gap-2 mb-1">
                      {result.direction === "BUY" ? (
                        <TrendingUp className={`w-6 h-6 ${getSignalColor()}`} />
                      ) : result.direction === "SELL" ? (
                        <TrendingDown className={`w-6 h-6 ${getSignalColor()}`} />
                      ) : (
                        <AlertTriangle className={`w-6 h-6 ${getSignalColor()}`} />
                      )}
                      <span className={`font-black text-lg ${getSignalColor()}`}>
                        {getSignalText()}
                      </span>
                    </div>
                    <span className={`font-mono text-2xl font-black ${getSignalColor()}`}>
                      {result.confidence}%
                    </span>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Estimated Win Probability • Entry @ {getNextCandleStart().toLocaleTimeString()}
                    </p>
                  </div>

                  {/* Strategy used */}
                  {result.strategyUsed && (
                    <div className="px-2 py-1.5 bg-primary/10 rounded border border-primary/20">
                      <p className="text-[10px] text-muted-foreground">Strategy</p>
                      <p className="text-xs font-medium">{result.strategyUsed}</p>
                    </div>
                  )}

                  {/* Analysis details */}
                  <div className="p-2.5 bg-secondary/30 rounded-lg border border-border/50 max-h-48 overflow-y-auto">
                    <pre className="text-[11px] text-muted-foreground leading-relaxed whitespace-pre-wrap font-sans">
                      {result.analysis}
                    </pre>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    <span className="flex items-center gap-1">
                      <Monitor className="w-3 h-3" />
                      SENTINEL X • 30+ Indicators
                    </span>
                  </div>
                </div>
              )}

              {/* Loading */}
              {isAnalyzing && !result && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Full indicator scan (30+ indicators)...</p>
                  <p className="text-[10px] text-muted-foreground">Confluence • SMC • Price Action • Oscillators</p>
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
                    {result.direction === "BUY" ? (
                      <TrendingUp className={`w-4 h-4 ${getSignalColor()}`} />
                    ) : result.direction === "SELL" ? (
                      <TrendingDown className={`w-4 h-4 ${getSignalColor()}`} />
                    ) : (
                      <Minus className={`w-4 h-4 ${getSignalColor()}`} />
                    )}
                    <span className={`font-bold text-xs ${getSignalColor()}`}>{getSignalText()}</span>
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
