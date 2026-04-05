// SENTINEL X - Main Trading Intelligence Dashboard (v5)
// Hardcore rules enforced: Market/Vector/TF selectors, Start/Stop, Live Candles, T+4 Protocol

import { useState, useEffect, useCallback } from "react";
import { Vector, MarketType, Session, Signal } from "@/types/trading";
import { useSignalEngine } from "@/hooks/useSignalEngine";
import { useTradingViewSignals } from "@/hooks/useTradingViewSignals";
import { Header } from "@/components/trading/Header";
import { VectorSelector, type VectorOption, vectorToTradingVector } from "@/components/trading/VectorSelector";
import { MarketCategorySelector, type MarketCategory } from "@/components/trading/MarketCategorySelector";
import { TimeframeSelector, type TimeframeOption } from "@/components/trading/TimeframeSelector";
import { EngineControlPanel } from "@/components/trading/EngineControlPanel";
import { SessionAwareBar } from "@/components/trading/SessionAwareBar";
import { LiveCandlesFeed } from "@/components/trading/LiveCandlesFeed";
import { T4SignalTimer } from "@/components/trading/T4SignalTimer";
import { InstitutionalCard } from "@/components/trading/InstitutionalCard";
import { SignalFeed } from "@/components/trading/SignalFeed";
import { SignalPopupModal } from "@/components/trading/SignalPopupModal";
import { RiskPanel } from "@/components/trading/RiskPanel";
import { StrategyPanel } from "@/components/trading/StrategyPanel";
import { BrokerStatus } from "@/components/trading/BrokerStatus";
import { PerformanceStats } from "@/components/trading/PerformanceStats";
import { MarketUniversePanel, type AnyBroker } from "@/components/trading/MarketUniversePanel";
import { IntelligencePanel } from "@/components/trading/IntelligencePanel";
import { GuruStrategyPanel } from "@/components/trading/GuruStrategyPanel";
import { AITrendScanner } from "@/components/trading/AITrendScanner";
import { PerformanceDashboard } from "@/components/trading/PerformanceDashboard";
import { MonthlyWinRateReport } from "@/components/trading/MonthlyWinRateReport";
import { FloatingWindowButton } from "@/components/trading/FloatingWindowButton";
import { ScreenCaptureScanner } from "@/components/trading/ScreenCaptureScanner";
import { DasomtmfxAssistant } from "@/components/assistant/DasomtmfxAssistant";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Trash2, 
  LayoutDashboard,
  BarChart3,
  Plug,
  Trophy,
  Brain
} from "lucide-react";
import { detectActiveSession } from "@/engine/sessionLock";
import { toast } from "sonner";

const Index = () => {
  // === STATE MANAGEMENT ===
  const [marketCategory, setMarketCategory] = useState<MarketCategory>("REAL");
  const [selectedVector, setSelectedVector] = useState<VectorOption>("Hybrid");
  const [selectedTimeframes, setSelectedTimeframes] = useState<TimeframeOption[]>(["5m"]);
  const [selectedBroker, setSelectedBroker] = useState<AnyBroker | undefined>(undefined);
  const [isPaused, setIsPaused] = useState(false);
  const [showSignalModal, setShowSignalModal] = useState(false);
  const [tvPendingSignal, setTvPendingSignal] = useState<Signal | null>(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  
  // Get current session for strategy panel
  const currentSession = detectActiveSession() as Session;
  
  // Convert VectorOption to Vector for engine
  const tradingVector = vectorToTradingVector(selectedVector);
  
  // Hook with ALL options passed
  const {
    signals,
    stats,
    riskGate,
    isRunning,
    isScanning,
    scanProgress,
    scanPhase,
    sessionLock,
    activeCooldowns,
    pendingAcknowledgment,
    startEngine,
    stopEngine,
    pauseEngine,
    clearSignals,
    toggleRiskLock,
    setSelectedVector: updateVector,
    acknowledgeSignal,
    cancelSignal,
    clearAllHistory,
    updateConfig
  } = useSignalEngine({ 
    selectedVector: tradingVector,
    marketCategory,
    timeframes: selectedTimeframes
  });

  // TradingView Realtime Signals - triggers popup on new FINAL signals
  const handleTVSignal = useCallback((signal: Signal) => {
    console.log("[INDEX] TradingView signal received:", signal);
    setTvPendingSignal(signal);
    setShowSignalModal(true);
  }, []);

  const { tvSignals, isConnected: tvConnected } = useTradingViewSignals(handleTVSignal);

  // Update config when selectors change
  useEffect(() => {
    updateConfig({
      selectedVector: tradingVector,
      marketCategory,
      timeframes: selectedTimeframes
    });
  }, [tradingVector, marketCategory, selectedTimeframes, updateConfig]);

  // Show modal when pending acknowledgment signal appears (from engine)
  useEffect(() => {
    if (pendingAcknowledgment) {
      setShowSignalModal(true);
      // Play sound notification
      try {
        const audio = new Audio("/notification.mp3");
        audio.volume = 0.5;
        audio.play().catch(() => {
          // Fallback: Use Web Audio API beep
          const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const oscillator = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          oscillator.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          oscillator.frequency.value = 880;
          oscillator.type = "sine";
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
          oscillator.start(audioCtx.currentTime);
          oscillator.stop(audioCtx.currentTime + 0.5);
        });
      } catch {
        // Silent fallback
      }
    }
  }, [pendingAcknowledgment]);

  // Determine which signal to show in modal (TV signal takes priority)
  const activeModalSignal = tvPendingSignal || pendingAcknowledgment;

  const handleVectorChange = (vector: VectorOption) => {
    setSelectedVector(vector);
    updateVector(vectorToTradingVector(vector));
  };

  const handleStartEngine = () => {
    const result = startEngine();
    if (!result.success) {
      toast.error(`Engine blocked: ${result.reason}`);
    } else {
      toast.success("Engine started - Triple Validation Active");
    }
    setIsPaused(false);
  };

  const handlePauseEngine = () => {
    if (isPaused) {
      setIsPaused(false);
      toast.info("Engine resumed");
    } else {
      pauseEngine();
      setIsPaused(true);
      toast.info("Engine paused");
    }
  };

  const handleStopEngine = () => {
    stopEngine();
    setIsPaused(false);
    toast.info("Engine stopped");
  };

  const handleAcknowledgeSignal = (signalId: string) => {
    // Handle TV signal acknowledgment
    if (tvPendingSignal && tvPendingSignal.id === signalId) {
      setTvPendingSignal(null);
      setShowSignalModal(false);
      toast.success("📺 TradingView Signal acknowledged - Trade executed!");
      return;
    }
    // Handle engine signal acknowledgment
    acknowledgeSignal(signalId);
    setShowSignalModal(false);
    toast.success("Signal acknowledged - Trade executed!");
  };

  const handleCancelSignal = (signalId: string) => {
    // Handle TV signal cancellation
    if (tvPendingSignal && tvPendingSignal.id === signalId) {
      setTvPendingSignal(null);
      setShowSignalModal(false);
      toast.info("📺 TradingView Signal cancelled");
      return;
    }
    // Handle engine signal cancellation
    cancelSignal(signalId);
    setShowSignalModal(false);
    toast.info("Signal cancelled");
  };

  const handleClearSignals = () => {
    clearSignals();
    toast.info("Signals cleared");
  };

  const handleResetEngine = () => {
    handleStopEngine();
    setTimeout(() => {
      handleStartEngine();
    }, 100);
  };

  // Get the most recent pending signal for institutional card
  const latestPendingSignal = signals.find(s => s.status === "PENDING") || signals[0];

  // Derive market type from category
  const marketType: MarketType = marketCategory === "REAL" ? "REAL" : "OTC";

  return (
    <div className="min-h-screen bg-background">
      <Header tvConnected={tvConnected} />
      
      <main className="container mx-auto px-4 py-6 space-y-4">
        {/* === SESSION AWARE BAR === */}
        <SessionAwareBar />

        {/* === MARKET SELECTION ROW === */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 p-4 bg-card/50 rounded-lg border border-border/50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">MARKET</p>
              <MarketCategorySelector 
                selected={marketCategory} 
                onSelect={setMarketCategory} 
              />
            </div>
            <div className="h-px sm:h-auto sm:w-px bg-border" />
            <div>
              <p className="text-xs text-muted-foreground mb-2 font-medium">VECTOR</p>
              <VectorSelector 
                selectedVector={selectedVector} 
                onSelect={handleVectorChange} 
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <TimeframeSelector 
              selected={selectedTimeframes} 
              onSelect={setSelectedTimeframes} 
            />
            <FloatingWindowButton />
            <ScreenCaptureScanner market={marketCategory} vector={selectedVector} timeframe={selectedTimeframes[0]} />
          </div>
        </div>

        {/* === ENGINE CONTROL PANEL === */}
        <EngineControlPanel
          isRunning={isRunning}
          isPaused={isPaused}
          isScanning={isScanning}
          scanProgress={scanProgress}
          scanPhase={scanPhase}
          sessionLock={{
            isLocked: sessionLock.isLocked,
            lockedSession: sessionLock.lockedSession,
            canScan: sessionLock.canScan,
            scanBlockReason: sessionLock.scanBlockReason
          }}
          onStart={handleStartEngine}
          onStop={handleStopEngine}
          onPause={handlePauseEngine}
        />

        {/* === MAIN CONTENT TABS === */}
        <Tabs defaultValue="dashboard" className="space-y-4" value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-secondary/50 flex-wrap">
            <TabsTrigger value="dashboard" className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="intelligence" className="gap-2">
              <Brain className="w-4 h-4" />
              Intelligence
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <BarChart3 className="w-4 h-4" />
              Analytics
            </TabsTrigger>
            <TabsTrigger value="strategies" className="gap-2">
              <Trophy className="w-4 h-4" />
              Strategies
            </TabsTrigger>
            <TabsTrigger value="connections" className="gap-2">
              <Plug className="w-4 h-4" />
              Markets
            </TabsTrigger>
          </TabsList>

          {/* === DASHBOARD TAB === */}
          <TabsContent value="dashboard" className="space-y-4">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              {/* Main Signal Display + Live Candles */}
              <div className="xl:col-span-2 space-y-4">
                {/* Live Candles Feed */}
                <LiveCandlesFeed 
                  marketCategory={marketCategory}
                  vector={selectedVector}
                  timeframe={selectedTimeframes[0]}
                  isRunning={isRunning && !isPaused}
                />

                {/* T+4 Signal Timer */}
                <T4SignalTimer 
                  timeframe={selectedTimeframes[0]}
                  isRunning={isRunning && !isPaused}
                />
                
                {/* Institutional Card */}
                <InstitutionalCard signal={latestPendingSignal} />
                
                {/* Signal Feed */}
                <Card className="p-4 border border-border/50 gradient-card">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Signal History</h3>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleClearSignals}
                        className="gap-2"
                      >
                        <Trash2 className="w-4 h-4" />
                        Clear
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleResetEngine}
                        className="gap-2"
                      >
                        <RefreshCw className="w-4 h-4" />
                        Reset
                      </Button>
                    </div>
                  </div>
                  <SignalFeed 
                    signals={signals} 
                    pendingAcknowledgment={pendingAcknowledgment}
                    onAcknowledge={handleAcknowledgeSignal}
                    onCancel={handleCancelSignal}
                  />
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                <IntelligencePanel />
                <RiskPanel riskGate={riskGate} />
                <StrategyPanel marketType={marketType} />
              </div>
            </div>
          </TabsContent>

          {/* === INTELLIGENCE TAB === */}
          <TabsContent value="intelligence" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <AITrendScanner />
              <GuruStrategyPanel marketType={marketType} currentSession={currentSession} />
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <IntelligencePanel />
            
            </div>
            
            <Card className="p-6 border border-border/50 gradient-card">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Intelligence Engine Architecture</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                SENTINEL X uses five specialized decision engines working in concert to produce high-probability signals.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">Bias Engine</p>
                  <p className="text-xs text-muted-foreground mt-1">HTF directional context from 1H/30M</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">Volatility Engine</p>
                  <p className="text-xs text-muted-foreground mt-1">Market regime filter (ATR-based)</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">Session Engine</p>
                  <p className="text-xs text-muted-foreground mt-1">Time-of-day as indicator</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">Confidence Engine</p>
                  <p className="text-xs text-muted-foreground mt-1">Signal strength scoring</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">Confluence Engine</p>
                  <p className="text-xs text-muted-foreground mt-1">Final gatekeeper (70%+)</p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-secondary/30 rounded-lg">
                <h4 className="text-sm font-medium mb-2">Safe States</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="px-2 py-1 text-xs bg-success/20 text-success rounded">ACTIVE</span>
                  <span className="px-2 py-1 text-xs bg-muted/20 text-muted-foreground rounded">IDLE</span>
                  <span className="px-2 py-1 text-xs bg-warning/20 text-warning rounded">WAIT</span>
                  <span className="px-2 py-1 text-xs bg-destructive/20 text-destructive rounded">NO_TRADE</span>
                  <span className="px-2 py-1 text-xs bg-accent/20 text-accent rounded">COOLDOWN</span>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  Safe states prevent overtrading and enforce professional restraint.
                </p>
              </div>
            </Card>
          </TabsContent>

          {/* === ANALYTICS TAB === */}
          <TabsContent value="analytics" className="space-y-4">
            <PerformanceDashboard />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <PerformanceStats signals={signals} />
              
              <Card className="p-6 border border-border/50 gradient-card">
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Session Analysis</h3>
                </div>
                
                <div className="space-y-4">
                  {["London", "NewYork", "Tokyo", "Sydney"].map((session) => {
                    const sessionSignals = signals.filter(s => s.session === session);
                    const percentage = signals.length > 0 
                      ? (sessionSignals.length / signals.length) * 100 
                      : 0;
                    
                    return (
                      <div key={session}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm">{session}</span>
                          <span className="text-sm font-mono">{sessionSignals.length}</span>
                        </div>
                        <div className="h-2 bg-secondary rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </TabsContent>

          {/* === STRATEGIES TAB === */}
          <TabsContent value="strategies" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GuruStrategyPanel marketType="REAL" currentSession={currentSession} />
              <GuruStrategyPanel marketType="OTC" currentSession={currentSession} />
            </div>
            
            <Card className="p-6 border border-border/50 gradient-card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-warning" />
                <h3 className="font-bold">Strategy Eligibility Matrix</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Strategies are automatically matched to market type, vector, timeframe, and session.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">ICT Silver Bullet</p>
                  <p className="text-xs text-muted-foreground mt-1">REAL • FOREX • London/NY</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">Wyckoff Spring</p>
                  <p className="text-xs text-muted-foreground mt-1">REAL • All Vectors • All Sessions</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
                  <p className="text-sm font-medium">Candle Exhaustion</p>
                  <p className="text-xs text-muted-foreground mt-1">OTC • FOREX • Active Sessions</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
                  <p className="text-sm font-medium">Time-Cycle Reversion</p>
                  <p className="text-xs text-muted-foreground mt-1">OTC • All Vectors • Session Opens</p>
                </div>
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/30">
                  <p className="text-sm font-medium">SMC Order Block</p>
                  <p className="text-xs text-muted-foreground mt-1">REAL • FOREX/INDICES • London/NY</p>
                </div>
                <div className="p-3 bg-accent/10 rounded-lg border border-accent/30">
                  <p className="text-sm font-medium">False Breakout Snap</p>
                  <p className="text-xs text-muted-foreground mt-1">OTC • All Vectors • High Volatility</p>
                </div>
              </div>
            </Card>
          </TabsContent>

          {/* === MARKETS/CONNECTIONS TAB === */}
          <TabsContent value="connections" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <MarketUniversePanel 
                selectedBroker={selectedBroker}
                onBrokerSelect={setSelectedBroker}
              />
              <BrokerStatus />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* Signal Popup Modal - Shows both engine and TradingView signals */}
      <SignalPopupModal
        signal={activeModalSignal}
        isOpen={showSignalModal && !!activeModalSignal}
        onAcknowledge={handleAcknowledgeSignal}
        onCancel={handleCancelSignal}
      />

      {/* Footer */}
      <footer className="container mx-auto px-4 py-6 mt-8 border-t border-border/50">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>SENTINEL X v5 TURBO • Professional Trading Intelligence</p>
          <div className="flex items-center gap-4">
            <span>T+4 Protocol Active</span>
            <span>•</span>
            <span>Triple Validation Engine</span>
          </div>
        </div>
      </footer>

      {/* DASOMTMFX AI Assistant - MASTER BRAIN - Full app state + control */}
      <DasomtmfxAssistant 
        context={{
          pair: selectedBroker || "Not selected",
          timeframe: selectedTimeframes[0],
          selectedTimeframes,
          marketMode: marketCategory,
          scanStatus: isScanning ? "analyzing" : isRunning ? "running" : "idle",
          lastSignal: latestPendingSignal?.direction,
          setupGrade: undefined,
          confidence: stats.winRate > 0 ? Math.round(stats.winRate) : undefined,
          session: currentSession,
          signalDirection: latestPendingSignal?.direction === "BUY" || latestPendingSignal?.direction === "SELL" ? latestPendingSignal.direction as "BUY" | "SELL" : null,
          signals,
          pendingAcknowledgment: pendingAcknowledgment || null,
          engineStatus: stats.engineStatus,
          isRunning,
          isPaused,
          isScanning,
          scanPhase,
          scanProgress,
          winRate: stats.winRate,
          totalSignals: stats.totalSignals,
          pendingSignals: stats.pendingSignals,
          executedSignals: stats.executedSignals,
          riskLocked: riskGate.manualLock,
          maxDailyTrades: riskGate.maxDailyTrades,
          currentDailyTrades: riskGate.currentDailyTrades,
          consecutiveLosses: riskGate.currentConsecutiveLosses,
          maxConsecutiveLosses: riskGate.maxConsecutiveLosses,
          currentDailyLoss: riskGate.currentDailyLoss,
          maxDailyLoss: riskGate.maxDailyLoss,
          activeCooldowns,
          sessionLocked: sessionLock.isLocked,
          sessionCanScan: sessionLock.canScan,
          sessionBlockReason: sessionLock.scanBlockReason,
          selectedVector: selectedVector,
          tvConnected,
          selectedBroker: selectedBroker || undefined,
          activeTab,
        }}
        actions={{
          startEngine: handleStartEngine,
          stopEngine: handleStopEngine,
          pauseEngine: handlePauseEngine,
          clearSignals: handleClearSignals,
          clearAllHistory,
          toggleRiskLock,
          acknowledgeSignal: handleAcknowledgeSignal,
          cancelSignal: handleCancelSignal,
          setMarketCategory: (cat: string) => setMarketCategory(cat as MarketCategory),
          setSelectedVector: (vec: string) => handleVectorChange(vec as VectorOption),
          setSelectedTimeframes: (tfs: string[]) => setSelectedTimeframes(tfs as TimeframeOption[]),
          setSelectedBroker: (b: string) => setSelectedBroker(b as AnyBroker),
          setActiveTab: (tab: string) => setActiveTab(tab),
        }}
      />
    </div>
  );
};

export default Index;
