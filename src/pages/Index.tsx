// SENTINEL X - Main Trading Intelligence Dashboard (v5)

import { useState } from "react";
import { Vector, MarketType, Session } from "@/types/trading";
import { useSignalEngine } from "@/hooks/useSignalEngine";
import { Header } from "@/components/trading/Header";
import { VectorSelector } from "@/components/trading/VectorSelector";
import { EngineStatus } from "@/components/trading/EngineStatus";
import { InstitutionalCard } from "@/components/trading/InstitutionalCard";
import { SignalFeed } from "@/components/trading/SignalFeed";
import { RiskPanel } from "@/components/trading/RiskPanel";
import { StrategyPanel } from "@/components/trading/StrategyPanel";
import { BrokerStatus } from "@/components/trading/BrokerStatus";
import { PerformanceStats } from "@/components/trading/PerformanceStats";
import { MarketTypeToggle } from "@/components/trading/MarketTypeToggle";
import { MarketSelector } from "@/components/trading/MarketSelector";
import { MarketUniversePanel, type AnyBroker } from "@/components/trading/MarketUniversePanel";
import { IntelligencePanel } from "@/components/trading/IntelligencePanel";
import { GuruStrategyPanel } from "@/components/trading/GuruStrategyPanel";
import { PerformanceDashboard } from "@/components/trading/PerformanceDashboard";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  RefreshCw, 
  Trash2, 
  Settings,
  LayoutDashboard,
  BarChart3,
  Plug,
  Trophy,
  Brain
} from "lucide-react";
import { detectActiveSession } from "@/engine/sessionLock";

const Index = () => {
  const [selectedVector, setSelectedVector] = useState<Vector | undefined>(undefined);
  const [marketType, setMarketType] = useState<MarketType>("REAL");
  const [selectedBroker, setSelectedBroker] = useState<AnyBroker | undefined>(undefined);
  
  // Get current session for strategy panel
  const currentSession = detectActiveSession() as Session;
  
  const {
    signals,
    stats,
    riskGate,
    isRunning,
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
    clearAllHistory
  } = useSignalEngine({ selectedVector });

  const handleVectorChange = (vector: Vector | undefined) => {
    setSelectedVector(vector);
    updateVector(vector);
  };

  const handleStartEngine = () => {
    const result = startEngine();
    if (!result.success) {
      console.log(`[UI] Engine start blocked: ${result.reason}`);
    }
  };

  // Get the most recent pending signal for institutional card
  const latestPendingSignal = signals.find(s => s.status === "PENDING") || signals[0];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Session Lock Status Banner */}
        {sessionLock.isLocked && (
          <div className={`rounded-lg p-3 flex items-center justify-between ${
            sessionLock.canScan 
              ? "bg-success/10 border border-success/30" 
              : "bg-warning/10 border border-warning/30"
          }`}>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                sessionLock.canScan ? "bg-success animate-pulse" : "bg-warning"
              }`} />
              <span className="text-sm font-medium">
                Session Lock: {sessionLock.lockedSession}
              </span>
              {sessionLock.lockTime && (
                <span className="text-xs text-muted-foreground">
                  (since {sessionLock.lockTime.toLocaleTimeString()})
                </span>
              )}
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-muted-foreground">
                {activeCooldowns} assets on cooldown
              </span>
              {!sessionLock.canScan && (
                <span className="text-xs text-warning font-medium">
                  {sessionLock.scanBlockReason}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Top Controls Row */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <MarketTypeToggle value={marketType} onChange={setMarketType} />
            <VectorSelector 
              selectedVector={selectedVector} 
              onSelect={handleVectorChange} 
            />
          </div>
          
          <div className="flex items-center gap-2 flex-wrap">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={clearSignals}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Clear Feed
            </Button>
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={clearAllHistory}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Delete History
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                stopEngine();
                setTimeout(handleStartEngine, 100);
              }}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Reset
            </Button>
          </div>
        </div>

        {/* Engine Status Bar */}
        <EngineStatus
          stats={stats}
          riskGate={riskGate}
          isRunning={isRunning}
          onStart={handleStartEngine}
          onStop={stopEngine}
          onPause={pauseEngine}
          onToggleLock={toggleRiskLock}
        />

        {/* Main Content */}
        <Tabs defaultValue="dashboard" className="space-y-6">
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

          <TabsContent value="dashboard" className="space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
              {/* Main Signal Display */}
              <div className="xl:col-span-2 space-y-6">
                {/* Institutional Card */}
                <InstitutionalCard signal={latestPendingSignal} />
                
                {/* Signal Feed */}
                <Card className="p-4 border border-border/50 gradient-card">
                  <SignalFeed 
                    signals={signals} 
                    pendingAcknowledgment={pendingAcknowledgment}
                    onAcknowledge={acknowledgeSignal}
                    onCancel={cancelSignal}
                  />
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <IntelligencePanel />
                <RiskPanel riskGate={riskGate} />
                <StrategyPanel marketType={marketType} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="intelligence" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <IntelligencePanel />
              <GuruStrategyPanel marketType={marketType} currentSession={currentSession} />
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

          <TabsContent value="analytics" className="space-y-6">
            {/* Full Performance Dashboard */}
            <PerformanceDashboard />
            
            {/* Legacy Stats Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

              <Card className="p-6 border border-border/50 gradient-card lg:col-span-2">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="font-bold">Strategy Performance</h3>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {Array.from(new Set(signals.map(s => s.strategy))).map((strategy) => {
                    const strategySignals = signals.filter(s => s.strategy === strategy);
                    const executed = strategySignals.filter(s => s.status === "EXECUTED").length;
                    
                    return (
                      <div 
                        key={strategy}
                        className="p-3 bg-secondary/30 rounded-lg"
                      >
                        <p className="text-sm font-medium truncate" title={strategy}>
                          {strategy}
                        </p>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-xs text-muted-foreground">
                            {strategySignals.length} signals
                          </span>
                          <span className="text-xs font-mono text-success">
                            {executed} exec
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="strategies" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <GuruStrategyPanel marketType="REAL" currentSession={currentSession} />
              <GuruStrategyPanel marketType="OTC" currentSession={currentSession} />
            </div>
            
            <Card className="p-6 border border-border/50 gradient-card">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-warning" />
                <h3 className="font-bold">Strategy Eligibility Matrix</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Strategies are automatically matched to market type, vector, timeframe, and session for optimal performance.
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

          <TabsContent value="connections" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Market Universe Panel - OTC vs REAL separation */}
              <MarketUniversePanel 
                selectedBroker={selectedBroker}
                onBrokerSelect={setSelectedBroker}
              />
              
              <BrokerStatus />
            </div>

            <Card className="p-6 border border-border/50 gradient-card">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="w-5 h-5 text-primary" />
                <h3 className="font-bold">Engine Configuration (v5 TURBO)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-sm">Session Lock</span>
                    <span className={`font-mono text-sm ${sessionLock.isLocked ? "text-success" : "text-muted-foreground"}`}>
                      {sessionLock.isLocked ? `Locked (${sessionLock.lockedSession})` : "Unlocked"}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-sm">Asset Cooldowns</span>
                    <span className="font-mono text-sm">{activeCooldowns} active</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/30">
                    <span className="text-sm font-medium">⚡ Turbo Scanner</span>
                    <span className="font-mono text-sm text-success">45s-2min</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg border border-success/30">
                    <span className="text-sm font-medium">⚡ Fast Broker Bridge</span>
                    <span className="font-mono text-sm text-success">~30ms</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-sm">T+4 Protocol</span>
                    <span className="font-mono text-sm text-success">Enforced</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg">
                    <span className="text-sm">Scan Interval</span>
                    <span className="font-mono text-sm text-primary">800ms</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 p-4 bg-primary/10 rounded-lg border border-primary/30">
                <h4 className="text-sm font-medium mb-2">Data Source Strategy</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-2 bg-warning/10 rounded border border-warning/30">
                    <span className="font-medium text-warning">OTC Markets (PO/Quotex)</span>
                    <p className="text-muted-foreground mt-1">TradingView real charts + Manual execution window</p>
                  </div>
                  <div className="p-2 bg-success/10 rounded border border-success/30">
                    <span className="font-medium text-success">REAL Markets</span>
                    <p className="text-muted-foreground mt-1">Official APIs (Binance, OANDA) + MT5 bridge</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-success/10 rounded-lg border border-success/30">
                <p className="text-sm text-success">
                  <strong>🚀 v5 TURBO Active:</strong> Modular intelligence engines, cross-market validation, 
                  T+4 protocol, ultra-fast scanning (45s-2min).
                </p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Footer */}
        <footer className="text-center py-6 border-t border-border/30">
          <p className="text-sm text-muted-foreground">
            SENTINEL X v5 TURBO — Ultra-Fast Trading Intelligence
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            ⚡ Modular Engine • T+4 Protocol • Intelligence Engines • Signals in 45s-2min • Not Financial Advice
          </p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
