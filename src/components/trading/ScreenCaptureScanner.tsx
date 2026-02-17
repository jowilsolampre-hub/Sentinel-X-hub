// SENTINEL X - Screen Capture Scanner
// Captures screen/window, analyzes chart via AI, returns signals in a floating overlay

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
  Sparkles,
  Play,
  Square,
  GripVertical,
  Maximize2,
  Minimize2,
  RefreshCw,
  Eye,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ReactMarkdown from "react-markdown";

interface AnalysisResult {
  analysis: string;
  direction: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  timestamp: string;
}

interface Position {
  x: number;
  y: number;
}

export const ScreenCaptureScanner = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [autoScan, setAutoScan] = useState(false);
  const [autoInterval, setAutoInterval] = useState(30); // seconds
  const [capturedFrame, setCapturedFrame] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [position, setPosition] = useState<Position>({ x: 20, y: 80 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Position>({ x: 0, y: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const autoScanTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Start screen capture
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

      // Handle stream ending (user clicks "Stop sharing")
      stream.getVideoTracks()[0].onended = () => {
        stopCapture();
      };
    } catch (err) {
      console.error("Screen capture error:", err);
      toast.error("Screen capture failed — please allow screen sharing");
    }
  }, []);

  // Stop screen capture
  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
    setAutoScan(false);
    if (autoScanTimerRef.current) {
      clearInterval(autoScanTimerRef.current);
      autoScanTimerRef.current = null;
    }
    toast.info("Screen capture stopped");
  }, []);

  // Grab a frame from the video stream
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

  // Analyze the current frame
  const analyzeFrame = useCallback(async () => {
    const frame = grabFrame();
    if (!frame) {
      toast.error("No frame available — start screen capture first");
      return;
    }

    setCapturedFrame(frame);
    setIsAnalyzing(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("analyze-trend", {
        body: {
          imageBase64: frame,
          marketContext: "Live screen capture — analyze visible chart for trend direction, key levels, and trade setup",
        },
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResult(data);

      // Auto-notify on strong signals
      if (data.direction !== "NEUTRAL" && data.confidence >= 75) {
        toast.success(
          `🎯 ${data.direction} Signal — ${data.confidence}% confidence`,
          { duration: 8000 }
        );
      } else {
        toast.info(`Analysis: ${data.direction} (${data.confidence}%)`);
      }
    } catch (err) {
      console.error("Analysis error:", err);
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [grabFrame]);

  // Toggle auto-scan
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
      // Immediate first scan
      analyzeFrame();
      autoScanTimerRef.current = setInterval(() => {
        analyzeFrame();
      }, autoInterval * 1000);
      toast.success(`Auto-scan every ${autoInterval}s`);
    }
  }, [autoScan, isCapturing, analyzeFrame, autoInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCapture();
    };
  }, [stopCapture]);

  // --- Drag logic ---
  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setIsDragging(true);
      setDragOffset({ x: e.clientX - position.x, y: e.clientY - position.y });
    },
    [position]
  );

  useEffect(() => {
    if (!isDragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y });
    };
    const onUp = () => setIsDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [isDragging, dragOffset]);

  const dirColor =
    result?.direction === "BUY"
      ? "text-success"
      : result?.direction === "SELL"
      ? "text-destructive"
      : "text-muted-foreground";

  const dirBg =
    result?.direction === "BUY"
      ? "bg-success/20 border-success/50"
      : result?.direction === "SELL"
      ? "bg-destructive/20 border-destructive/50"
      : "bg-muted/20 border-muted/50";

  // --- Launcher button (always visible in header area) ---
  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setIsOpen(true)}
      >
        <Monitor className="w-4 h-4" />
        Screen Scanner
      </Button>
    );
  }

  // --- Floating overlay ---
  return (
    <>
      {/* Hidden elements */}
      <video ref={videoRef} className="hidden" muted playsInline />
      <canvas ref={canvasRef} className="hidden" />

      {/* Floating window */}
      <div
        className="fixed z-50 shadow-2xl"
        style={{
          left: position.x,
          top: position.y,
          width: isMinimized ? 280 : 380,
          transition: isDragging ? "none" : "width 0.2s ease",
        }}
      >
        <Card className="border border-primary/40 bg-card overflow-hidden">
          {/* Title bar — draggable */}
          <div
            className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border/50 cursor-grab active:cursor-grabbing select-none"
            onMouseDown={handleMouseDown}
          >
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <Monitor className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold">Screen Scanner</span>
              {isCapturing && (
                <Badge variant="outline" className="text-[10px] h-4 gap-1 border-success/50 text-success">
                  <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                  LIVE
                </Badge>
              )}
              {autoScan && (
                <Badge variant="outline" className="text-[10px] h-4 gap-1 border-primary/50 text-primary">
                  AUTO
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5"
                onClick={() => setIsMinimized(!isMinimized)}
              >
                {isMinimized ? (
                  <Maximize2 className="w-3 h-3" />
                ) : (
                  <Minimize2 className="w-3 h-3" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:text-destructive"
                onClick={() => {
                  stopCapture();
                  setIsOpen(false);
                }}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="p-3 space-y-3 max-h-[70vh] overflow-y-auto">
              {/* Capture preview */}
              {isCapturing && (
                <div className="relative rounded-md overflow-hidden border border-border/50 bg-secondary/30">
                  <video
                    ref={(el) => {
                      // Mirror the main video to this visible element
                      if (el && streamRef.current) {
                        el.srcObject = streamRef.current;
                        el.play().catch(() => {});
                      }
                    }}
                    className="w-full h-32 object-contain"
                    muted
                    playsInline
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
                    <Button
                      size="sm"
                      variant="destructive"
                      className="gap-1.5"
                      onClick={stopCapture}
                    >
                      <Square className="w-3 h-3" />
                      Stop
                    </Button>
                    <Button
                      size="sm"
                      className="gap-1.5 flex-1"
                      onClick={analyzeFrame}
                      disabled={isAnalyzing}
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Camera className="w-3.5 h-3.5" />
                      )}
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
                    <Button
                      key={s}
                      variant={autoInterval === s ? "default" : "ghost"}
                      size="sm"
                      className="h-5 px-2 text-[10px]"
                      onClick={() => setAutoInterval(s)}
                    >
                      {s}s
                    </Button>
                  ))}
                </div>
              )}

              {/* Last captured frame */}
              {capturedFrame && (
                <div className="rounded-md overflow-hidden border border-border/50">
                  <div className="flex items-center gap-1 px-2 py-1 bg-secondary/30 text-[10px] text-muted-foreground">
                    <Eye className="w-3 h-3" />
                    Last captured frame
                  </div>
                  <img
                    src={capturedFrame}
                    alt="Captured frame"
                    className="w-full max-h-28 object-contain bg-secondary/20"
                  />
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-2 animate-in fade-in slide-in-from-bottom-2">
                  <div className={`p-3 rounded-lg border ${dirBg}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {result.direction === "BUY" ? (
                          <TrendingUp className={`w-5 h-5 ${dirColor}`} />
                        ) : result.direction === "SELL" ? (
                          <TrendingDown className={`w-5 h-5 ${dirColor}`} />
                        ) : (
                          <Minus className={`w-5 h-5 ${dirColor}`} />
                        )}
                        <span className={`font-bold text-sm ${dirColor}`}>
                          {result.direction}
                        </span>
                      </div>
                      <span className={`font-mono text-lg font-bold ${dirColor}`}>
                        {result.confidence}%
                      </span>
                    </div>
                  </div>

                  <div className="p-2 bg-secondary/30 rounded-lg border border-border/50 max-h-40 overflow-y-auto">
                    <div className="prose prose-sm prose-invert max-w-none text-[11px] text-muted-foreground leading-relaxed">
                      <ReactMarkdown>{result.analysis}</ReactMarkdown>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>{new Date(result.timestamp).toLocaleTimeString()}</span>
                    <div className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      AI Analysis
                    </div>
                  </div>
                </div>
              )}

              {/* Loading state */}
              {isAnalyzing && !result && (
                <div className="flex flex-col items-center gap-2 py-4">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  <p className="text-xs text-muted-foreground">Analyzing chart...</p>
                </div>
              )}
            </div>
          )}

          {/* Minimized result strip */}
          {isMinimized && result && (
            <div className={`px-3 py-2 flex items-center justify-between ${dirBg}`}>
              <div className="flex items-center gap-2">
                {result.direction === "BUY" ? (
                  <TrendingUp className={`w-4 h-4 ${dirColor}`} />
                ) : result.direction === "SELL" ? (
                  <TrendingDown className={`w-4 h-4 ${dirColor}`} />
                ) : (
                  <Minus className={`w-4 h-4 ${dirColor}`} />
                )}
                <span className={`font-bold text-xs ${dirColor}`}>{result.direction}</span>
              </div>
              <span className={`font-mono text-sm font-bold ${dirColor}`}>
                {result.confidence}%
              </span>
            </div>
          )}
        </Card>
      </div>
    </>
  );
};
