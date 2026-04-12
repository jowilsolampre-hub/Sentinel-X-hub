// JOYRIDE PRO PACK - UI Panel Component

import { useState, useMemo, useEffect } from "react";
import { JoyrideConfig, JoyridePresetId, Aggressiveness, JoyrideSignal } from "@/modules/joyride/types";
import { DEFAULT_JOYRIDE_CONFIG, JOYRIDE_PRO_PACK_ENABLED } from "@/modules/joyride/featureFlag";
import { getAllPresets, getPreset } from "@/modules/joyride/presets";
import { joyrideEvaluate, getJoyrideLogs, clearJoyrideLogs, ChartState } from "@/modules/joyride/engine";
import { rankPairs } from "@/modules/joyride/pairRanker";
import { getSessionInfo } from "@/modules/joyride/sessionEngine";
import { selectBestPreset, PresetSelectorResult } from "@/modules/joyride/presetSelector";
import { enrichWithMemory, commitMemory, getMemoryStats, MemoryEnrichedState } from "@/modules/joyride/memoryOrchestrator";
import { fuseScannersResults, FusionResult } from "@/modules/joyride/scannerFusionEngine";
import { MEMORY_STORE } from "@/modules/joyride/memoryEngine";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Rocket, Zap, Shield, TrendingUp, TrendingDown, Ban, Clock, Target, Settings,
  BarChart3, ListChecks, AlertTriangle, CheckCircle2, XCircle, ChevronRight,
  Brain, Lock, Activity, Gauge, Users, GitBranch,
} from "lucide-react";

interface JoyridePanelProps {
  chartState?: ChartState;
}

export const JoyridePanel = ({ chartState }: JoyridePanelProps) => {
  const [config, setConfig] = useState<JoyrideConfig>(DEFAULT_JOYRIDE_CONFIG);
  const [lastSignal, setLastSignal] = useState<JoyrideSignal | null>(null);
  const [lastSelector, setLastSelector] = useState<PresetSelectorResult | null>(null);
  const [autoSelectMode, setAutoSelectMode] = useState(false);
  const [memoryState, setMemoryState] = useState<MemoryEnrichedState | null>(null);
  const [fusionResult, setFusionResult] = useState<FusionResult | null>(null);

  const session = getSessionInfo();
  const preset = getPreset(config.selectedPreset);
  const presets = getAllPresets();

  const pairRankings = useMemo(() => {
    if (!config.pairRanking) return [];
    return rankPairs([], chartState || {});
  }, [config.pairRanking, chartState]);

  if (!JOYRIDE_PRO_PACK_ENABLED) return null;

  const updateConfig = (updates: Partial<JoyrideConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const runEvaluation = () => {
    const chart: ChartState = chartState || {
      pair: "EUR/USD",
      trendDirection: "range",
      candleStrength: 0.5,
      bodyWickRatio: 1.2,
      volatility: 0.5,
      rsiValue: 50,
      emaAlignment: "mixed",
      signalsThisSession: 0,
      recentLosses: 0,
    };

    // Enrich with memory
    const enriched = enrichWithMemory(chart);
    setMemoryState(enriched);

    // Run preset selector
    const selectorResult = selectBestPreset(chart, autoSelectMode ? null : config.selectedPreset);
    setLastSelector(selectorResult);

    // If auto-select and a preset was chosen, use it
    let activeConfig = config;
    if (autoSelectMode && selectorResult.selectedPresetId) {
      activeConfig = { ...config, selectedPreset: selectorResult.selectedPresetId };
    }

    // If selector says NO_TRADE in auto mode
    if (autoSelectMode && selectorResult.selectorResult === "NO_TRADE") {
      const noTradeSignal: JoyrideSignal = {
        preset: "Auto-Select",
        pair: chart.pair || "Unknown",
        timeframe: "-",
        expiry: "-",
        direction: "NO_TRADE",
        confidence: 0,
        reasons: [],
        avoidIf: selectorResult.whySelected,
        entryWindowSeconds: 0,
        patternLabel: "No valid preset",
        sessionSuitability: 0,
        invalidation: [],
        setupChecklist: [],
      };
      setLastSignal(noTradeSignal);
      commitMemory(chart, null, "NO_TRADE", 0);
      return;
    }

    const result = joyrideEvaluate(chart, activeConfig);
    if (result) {
      setLastSignal(result);
      commitMemory(chart, result.preset, result.direction, result.confidence);

      // Run fusion with current result
      const fusion = fuseScannersResults([{
        source: "joyride_scanner",
        direction: result.direction,
        confidence: result.confidence,
        status: result.direction === "NO_TRADE" ? "NO_TRADE" : "SIGNAL",
        preset: result.preset,
      }]);
      setFusionResult(fusion);
    }
  };

  const logs = getJoyrideLogs();
  const memStats = getMemoryStats();

  const directionIcon = (dir: string) => {
    if (dir === "CALL") return <TrendingUp className="w-5 h-5 text-success" />;
    if (dir === "PUT") return <TrendingDown className="w-5 h-5 text-destructive" />;
    return <Ban className="w-5 h-5 text-muted-foreground" />;
  };

  const confidenceColor = (c: number) => {
    if (c >= 80) return "text-success";
    if (c >= 65) return "text-warning";
    return "text-destructive";
  };

  const scoreColor = (score: number, blocked: boolean) => {
    if (blocked) return "text-muted-foreground";
    if (score >= 80) return "text-success";
    if (score >= 65) return "text-warning";
    if (score >= 50) return "text-orange-400";
    return "text-destructive";
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          className="gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-primary-foreground font-bold shadow-lg"
          size="sm"
        >
          <Rocket className="w-4 h-4" />
          JOYRIDE PRO
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Rocket className="w-5 h-5 text-primary" />
            JOYRIDE PRO PACK
            <Badge variant={config.enabled ? "default" : "secondary"} className="ml-2">
              {config.enabled ? "ACTIVE" : "OFF"}
            </Badge>
            <Badge variant="outline" className="ml-1 text-xs">
              {memStats.totalFrames} frames
            </Badge>
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          {/* Master Toggle */}
          <Card className="p-4 border border-border/50">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Enable JOYRIDE</p>
                <p className="text-xs text-muted-foreground">Activate the pro strategy layer</p>
              </div>
              <Switch
                checked={config.enabled}
                onCheckedChange={(v) => updateConfig({ enabled: v })}
              />
            </div>
          </Card>

          {/* Session Info */}
          <Card className="p-3 border border-border/50 bg-secondary/30">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{session.label}</span>
              <Badge variant={session.isActive ? "default" : "secondary"} className="ml-auto text-xs">
                {session.volatilityProfile}
              </Badge>
            </div>
          </Card>

          <Tabs defaultValue="setup" className="space-y-3">
            <TabsList className="w-full grid grid-cols-6">
              <TabsTrigger value="setup" className="gap-1 text-[10px] px-1">
                <Settings className="w-3 h-3" /> Setup
              </TabsTrigger>
              <TabsTrigger value="signal" className="gap-1 text-[10px] px-1">
                <Target className="w-3 h-3" /> Signal
              </TabsTrigger>
              <TabsTrigger value="intel" className="gap-1 text-[10px] px-1">
                <Activity className="w-3 h-3" /> Intel
              </TabsTrigger>
              <TabsTrigger value="selector" className="gap-1 text-[10px] px-1">
                <Brain className="w-3 h-3" /> Select
              </TabsTrigger>
              <TabsTrigger value="pairs" className="gap-1 text-[10px] px-1">
                <BarChart3 className="w-3 h-3" /> Pairs
              </TabsTrigger>
              <TabsTrigger value="log" className="gap-1 text-[10px] px-1">
                <ListChecks className="w-3 h-3" /> Log
              </TabsTrigger>
            </TabsList>

            {/* SETUP TAB */}
            <TabsContent value="setup" className="space-y-3">
              {/* Auto Select Toggle */}
              <Card className="p-3 border border-primary/30 bg-primary/5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium flex items-center gap-1">
                      <Brain className="w-4 h-4 text-primary" />
                      Auto-Select Preset
                    </p>
                    <p className="text-xs text-muted-foreground">AI picks the best preset for current market</p>
                  </div>
                  <Switch checked={autoSelectMode} onCheckedChange={setAutoSelectMode} />
                </div>
              </Card>

              {/* Preset Selector */}
              <div className={autoSelectMode ? "opacity-50 pointer-events-none" : ""}>
                <p className="text-xs text-muted-foreground mb-1 font-medium">PRESET {autoSelectMode && "(AUTO)"}</p>
                <Select
                  value={config.selectedPreset}
                  onValueChange={(v) => updateConfig({ selectedPreset: v as JoyridePresetId })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {presets.map(p => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">{preset.description}</p>
              </div>

              {/* Aggressiveness */}
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">AGGRESSIVENESS</p>
                <Select
                  value={config.aggressiveness}
                  onValueChange={(v) => updateConfig({ aggressiveness: v as Aggressiveness })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Safe">🛡️ Safe</SelectItem>
                    <SelectItem value="Standard">⚡ Standard</SelectItem>
                    <SelectItem value="High">🔥 High</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Confidence Threshold */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs text-muted-foreground font-medium">CONFIDENCE THRESHOLD</p>
                  <span className="text-sm font-mono font-bold">{config.confidenceThreshold}%</span>
                </div>
                <Slider
                  value={[config.confidenceThreshold]}
                  onValueChange={([v]) => updateConfig({ confidenceThreshold: v })}
                  min={40}
                  max={95}
                  step={5}
                />
              </div>

              {/* Max signals */}
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">MAX SIGNALS / SESSION</p>
                <Input
                  type="number"
                  value={config.maxSignalsPerSession}
                  onChange={(e) => updateConfig({ maxSignalsPerSession: parseInt(e.target.value) || 5 })}
                  min={1}
                  max={50}
                  className="h-8"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-2">
                {[
                  { key: "sessionAware" as const, label: "Session-Aware", desc: "Filter by active session" },
                  { key: "pairRanking" as const, label: "Pair Ranking", desc: "Auto-rank visible pairs" },
                  { key: "autoSetupHelper" as const, label: "Auto-Setup Helper", desc: "Show broker setup instructions" },
                  { key: "explainSignal" as const, label: "Explain Signal", desc: "Show reasoning for each signal" },
                  { key: "strictFilter" as const, label: "Strict Filter", desc: "Extra conservative filtering" },
                  { key: "cooldownAfterLosses" as const, label: "Cooldown After Losses", desc: "Pause after loss streak" },
                  { key: "screenshotAuditLog" as const, label: "Screenshot Audit Log", desc: "Log screenshot references" },
                ].map(toggle => (
                  <div key={toggle.key} className="flex items-center justify-between py-1">
                    <div>
                      <p className="text-sm">{toggle.label}</p>
                      <p className="text-xs text-muted-foreground">{toggle.desc}</p>
                    </div>
                    <Switch
                      checked={config[toggle.key]}
                      onCheckedChange={(v) => updateConfig({ [toggle.key]: v })}
                    />
                  </div>
                ))}
              </div>

              {/* Indicator Preview */}
              <Card className="p-3 border border-primary/30 bg-primary/5">
                <p className="text-xs font-medium mb-2">PRESET INDICATORS</p>
                <div className="flex flex-wrap gap-1">
                  {preset.indicators.map((ind, i) => (
                    <Badge key={i} variant="outline" className="text-xs">
                      {ind.name} {ind.period || (ind.fast ? `${ind.fast},${ind.slow},${ind.signal}` : "")}
                    </Badge>
                  ))}
                </div>
              </Card>
            </TabsContent>

            {/* SIGNAL TAB */}
            <TabsContent value="signal" className="space-y-3">
              <Button onClick={runEvaluation} disabled={!config.enabled} className="w-full gap-2">
                <Zap className="w-4 h-4" />
                Run JOYRIDE Evaluation
              </Button>

              {/* Selector summary when auto-mode */}
              {autoSelectMode && lastSelector && lastSelector.selectorResult !== "NO_TRADE" && (
                <Card className="p-3 border border-primary/30 bg-primary/5">
                  <p className="text-xs font-medium mb-1 flex items-center gap-1">
                    <Brain className="w-3 h-3 text-primary" />
                    AUTO-SELECTED: {lastSelector.selectedPresetName}
                  </p>
                  {lastSelector.whySelected.slice(0, 3).map((w, i) => (
                    <p key={i} className="text-xs text-muted-foreground">{w}</p>
                  ))}
                </Card>
              )}

              {lastSignal && (
                <Card className="p-4 border border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {directionIcon(lastSignal.direction)}
                      <span className="text-lg font-bold">{lastSignal.direction}</span>
                    </div>
                    <span className={`text-2xl font-mono font-bold ${confidenceColor(lastSignal.confidence)}`}>
                      {lastSignal.confidence}%
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div><span className="text-muted-foreground">Preset:</span> {lastSignal.preset}</div>
                    <div><span className="text-muted-foreground">Pair:</span> {lastSignal.pair}</div>
                    <div><span className="text-muted-foreground">TF:</span> {lastSignal.timeframe}</div>
                    <div><span className="text-muted-foreground">Expiry:</span> {lastSignal.expiry}</div>
                    <div><span className="text-muted-foreground">Pattern:</span> {lastSignal.patternLabel}</div>
                    <div><span className="text-muted-foreground">Session:</span> {lastSignal.sessionSuitability}%</div>
                  </div>

                  {config.explainSignal && lastSignal.reasons.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-success mb-1">✓ REASONS</p>
                      {lastSignal.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-1 text-xs">
                          <CheckCircle2 className="w-3 h-3 text-success mt-0.5 shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {lastSignal.avoidIf.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-warning mb-1">⚠ AVOID IF</p>
                      {lastSignal.avoidIf.map((a, i) => (
                        <div key={i} className="flex items-start gap-1 text-xs">
                          <AlertTriangle className="w-3 h-3 text-warning mt-0.5 shrink-0" />
                          <span>{a}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {lastSignal.invalidation.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-destructive mb-1">✕ INVALIDATION</p>
                      {lastSignal.invalidation.map((inv, i) => (
                        <div key={i} className="flex items-start gap-1 text-xs">
                          <XCircle className="w-3 h-3 text-destructive mt-0.5 shrink-0" />
                          <span>{inv}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {config.autoSetupHelper && lastSignal.setupChecklist.length > 0 && (
                    <div className="bg-secondary/30 p-3 rounded-lg">
                      <p className="text-xs font-medium mb-1">📋 BROKER SETUP</p>
                      {lastSignal.setupChecklist.map((s, i) => (
                        <div key={i} className="flex items-center gap-1 text-xs">
                          <ChevronRight className="w-3 h-3 text-primary shrink-0" />
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              )}

              {!lastSignal && config.enabled && (
                <Card className="p-6 border border-border/50 text-center">
                  <Target className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click "Run Evaluation" or wait for scanner to feed data</p>
                </Card>
              )}
            </TabsContent>

            {/* INTELLIGENCE TAB */}
            <TabsContent value="intel" className="space-y-3">
              <Button onClick={runEvaluation} disabled={!config.enabled} variant="outline" className="w-full gap-2">
                <Activity className="w-4 h-4" />
                Refresh Intelligence
              </Button>

              {/* Market Shift */}
              {memoryState?.marketShift && (
                <Card className={`p-3 border ${memoryState.marketShift.shiftDetected ? "border-warning/50 bg-warning/5" : "border-border/30"}`}>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1">
                    <GitBranch className="w-3 h-3" /> MARKET SHIFT ENGINE
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shift Detected:</span>
                      <Badge variant={memoryState.marketShift.shiftDetected ? "default" : "secondary"} className="text-[10px]">
                        {memoryState.marketShift.shiftDetected ? "YES" : "NO"}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-mono">{memoryState.marketShift.shiftType.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Regime:</span>
                      <span>{memoryState.marketShift.regimePrev} → {memoryState.marketShift.regimeNow}</span>
                    </div>
                    {memoryState.marketShift.shiftDetected && (
                      <>
                        <Progress value={memoryState.marketShift.shiftStrength} className="h-1.5 mt-1" />
                        <p className="text-muted-foreground italic">{memoryState.marketShift.meaning}</p>
                      </>
                    )}
                  </div>
                </Card>
              )}

              {/* Prediction */}
              {memoryState?.prediction && (
                <Card className="p-3 border border-border/30">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Gauge className="w-3 h-3" /> PREDICTION ENGINE
                  </p>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Candle Bias:</span>
                      <Badge variant="outline" className="text-[10px]">
                        {memoryState.prediction.nextCandleBias.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-muted-foreground">Continuation</span>
                        <span className="font-mono">{memoryState.prediction.continuationProbability}%</span>
                      </div>
                      <Progress value={memoryState.prediction.continuationProbability} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-muted-foreground">Reversal</span>
                        <span className="font-mono">{memoryState.prediction.reversalProbability}%</span>
                      </div>
                      <Progress value={memoryState.prediction.reversalProbability} className="h-1.5" />
                    </div>
                    <div>
                      <div className="flex justify-between mb-0.5">
                        <span className="text-muted-foreground">Pullback</span>
                        <span className="font-mono">{memoryState.prediction.pullbackProbability}%</span>
                      </div>
                      <Progress value={memoryState.prediction.pullbackProbability} className="h-1.5" />
                    </div>
                    <p className="text-muted-foreground italic mt-1">{memoryState.prediction.predictionReason}</p>
                  </div>
                </Card>
              )}

              {/* Community Reaction */}
              {memoryState?.communityReaction && (
                <Card className="p-3 border border-border/30">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Users className="w-3 h-3" /> COMMUNITY REACTION
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dominant:</span>
                      <span className="font-medium">{memoryState.communityReaction.dominantReaction.replace(/_/g, " ")}</span>
                    </div>
                    <p className="text-muted-foreground italic">{memoryState.communityReaction.reactionSummary}</p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {memoryState.communityReaction.crowdChasingMove && (
                        <Badge variant="outline" className="text-[10px]">🏃 Crowd Chasing</Badge>
                      )}
                      {memoryState.communityReaction.panicPulloutRisk && (
                        <Badge variant="destructive" className="text-[10px]">😰 Panic Risk</Badge>
                      )}
                      {memoryState.communityReaction.lateEntryTrapRisk && (
                        <Badge variant="secondary" className="text-[10px]">⚠️ Late Entry Trap</Badge>
                      )}
                      {memoryState.communityReaction.liquidityGrabRisk && (
                        <Badge variant="secondary" className="text-[10px]">💧 Liquidity Grab</Badge>
                      )}
                    </div>
                  </div>
                </Card>
              )}

              {/* Rolling Analysis */}
              {memoryState?.rollingAnalysis && memoryState.rollingAnalysis.rollingStatus !== "empty" && (
                <Card className="p-3 border border-border/30">
                  <p className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Activity className="w-3 h-3" /> ROLLING FRAME ANALYSIS
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Bias:</span>
                      <Badge variant={
                        memoryState.rollingAnalysis.rollingBias === "bullish" ? "default" :
                        memoryState.rollingAnalysis.rollingBias === "bearish" ? "destructive" : "secondary"
                      } className="text-[10px]">
                        {memoryState.rollingAnalysis.rollingBias}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Trend Consistency:</span>
                      <span className="font-mono">{memoryState.rollingAnalysis.trendConsistency}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Context Quality:</span>
                      <span className="font-mono">{memoryState.rollingAnalysis.avgConfidenceContext}</span>
                    </div>
                    {memoryState.rollingAnalysis.recentRegimes.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {memoryState.rollingAnalysis.recentRegimes.map((r, i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{r}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {/* Fusion */}
              {fusionResult && (
                <Card className={`p-3 border ${
                  fusionResult.finalDirection === "CALL" ? "border-success/50 bg-success/5" :
                  fusionResult.finalDirection === "PUT" ? "border-destructive/50 bg-destructive/5" :
                  "border-border/30"
                }`}>
                  <p className="text-xs font-medium mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> FUSION ENGINE
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">Final Decision:</span>
                      <span className={`font-bold ${
                        fusionResult.finalDirection === "CALL" ? "text-success" :
                        fusionResult.finalDirection === "PUT" ? "text-destructive" :
                        "text-muted-foreground"
                      }`}>{fusionResult.finalDirection}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence:</span>
                      <span className="font-mono">{fusionResult.finalConfidence}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Consensus:</span>
                      <span className="font-mono">{fusionResult.consensusStrength}%</span>
                    </div>
                    <p className="text-muted-foreground italic">{fusionResult.reason}</p>
                    {fusionResult.sourceBreakdown.length > 1 && (
                      <div className="mt-1 space-y-0.5">
                        {fusionResult.sourceBreakdown.map((s, i) => (
                          <div key={i} className="flex justify-between">
                            <span>{s.source}</span>
                            <span className={`font-mono ${
                              s.direction === "CALL" ? "text-success" :
                              s.direction === "PUT" ? "text-destructive" : "text-muted-foreground"
                            }`}>{s.direction} ({s.confidence}%)</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              )}

              {!memoryState && (
                <Card className="p-6 border border-border/50 text-center">
                  <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Run an evaluation to see intelligence data</p>
                </Card>
              )}
            </TabsContent>

            {/* SELECTOR TAB */}
            <TabsContent value="selector" className="space-y-3">
              <Card className="p-3 border border-primary/30 bg-primary/5">
                <p className="text-xs font-medium mb-1 flex items-center gap-1">
                  <Brain className="w-4 h-4 text-primary" /> PRESET SELECTOR ENGINE
                </p>
                <p className="text-xs text-muted-foreground">
                  AI scores all presets against current market conditions and auto-selects the best one
                </p>
              </Card>

              <Button onClick={runEvaluation} disabled={!config.enabled} variant="outline" className="w-full gap-2">
                <Brain className="w-4 h-4" />
                Score All Presets
              </Button>

              {lastSelector && (
                <>
                  <Card className={`p-3 border ${
                    lastSelector.selectorResult === "SELECTED" ? "border-success/50 bg-success/5" :
                    lastSelector.selectorResult === "FALLBACK_SAFE_MODE" ? "border-warning/50 bg-warning/5" :
                    "border-destructive/50 bg-destructive/5"
                  }`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold">
                        {lastSelector.selectorResult === "SELECTED" && "✅ PRESET SELECTED"}
                        {lastSelector.selectorResult === "NO_TRADE" && "🚫 NO TRADE"}
                        {lastSelector.selectorResult === "FALLBACK_SAFE_MODE" && "🛡️ FALLBACK → SAFE MODE"}
                      </p>
                      <Badge variant="outline" className="text-xs">
                        {lastSelector.selectionMode}
                      </Badge>
                    </div>
                    {lastSelector.selectedPresetName && (
                      <p className="text-lg font-bold">{lastSelector.selectedPresetName}</p>
                    )}
                    <div className="mt-2 space-y-1">
                      {lastSelector.whySelected.map((w, i) => (
                        <p key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                          <ChevronRight className="w-3 h-3 mt-0.5 shrink-0 text-primary" />
                          {w}
                        </p>
                      ))}
                    </div>
                  </Card>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-muted-foreground">PRESET SCORES</p>
                    {lastSelector.presetScores.map((item) => (
                      <Card key={item.presetId} className={`p-2.5 border ${
                        item.blocked ? "border-destructive/20 opacity-60" :
                        item.presetId === lastSelector.selectedPresetId ? "border-primary/50 bg-primary/5" :
                        "border-border/30"
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {item.blocked ? (
                              <Lock className="w-3.5 h-3.5 text-destructive" />
                            ) : item.presetId === lastSelector.selectedPresetId ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                            ) : (
                              <div className="w-3.5 h-3.5" />
                            )}
                            <span className="text-sm font-medium">{item.presetName}</span>
                          </div>
                          <span className={`text-sm font-mono font-bold ${scoreColor(item.score, item.blocked)}`}>
                            {item.blocked ? "BLOCKED" : item.score}
                          </span>
                        </div>
                        {(item.reasons.length > 0 || item.penalties.length > 0 || item.blockReasons.length > 0) && (
                          <div className="mt-1.5 space-y-0.5">
                            {item.reasons.slice(0, 2).map((r, i) => (
                              <p key={`r${i}`} className="text-[10px] text-success/80 pl-5">{r}</p>
                            ))}
                            {item.penalties.slice(0, 2).map((p, i) => (
                              <p key={`p${i}`} className="text-[10px] text-warning/80 pl-5">{p}</p>
                            ))}
                            {item.blockReasons.map((b, i) => (
                              <p key={`b${i}`} className="text-[10px] text-destructive/80 pl-5">🚫 {b}</p>
                            ))}
                          </div>
                        )}
                      </Card>
                    ))}
                  </div>

                  {lastSelector.blockedPresets.length > 0 && (
                    <Card className="p-3 border border-destructive/20 bg-destructive/5">
                      <p className="text-xs font-medium text-destructive mb-1">
                        🚫 BLOCKED ({lastSelector.blockedPresets.length})
                      </p>
                      {lastSelector.blockedPresets.map((bp, i) => (
                        <div key={i} className="text-xs text-muted-foreground">
                          <span className="font-medium">{bp.presetName}:</span>{" "}
                          {bp.blockReasons.join(", ")}
                        </div>
                      ))}
                    </Card>
                  )}
                </>
              )}

              {!lastSelector && (
                <Card className="p-6 border border-border/50 text-center">
                  <Brain className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Click "Score All Presets" to see the ranking</p>
                </Card>
              )}
            </TabsContent>

            {/* PAIRS TAB */}
            <TabsContent value="pairs" className="space-y-2">
              {pairRankings.length > 0 ? pairRankings.map((p, i) => (
                <div key={p.symbol} className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-4">#{i + 1}</span>
                    <span className="text-sm font-medium">{p.symbol}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono">{p.score}</span>
                    <Badge
                      variant={p.recommendation === "TOP" ? "default" : p.recommendation === "AVOID" ? "destructive" : "secondary"}
                      className="text-xs"
                    >
                      {p.recommendation}
                    </Badge>
                  </div>
                </div>
              )) : (
                <Card className="p-4 text-center text-sm text-muted-foreground">
                  Enable Pair Ranking in Setup to see rankings
                </Card>
              )}
            </TabsContent>

            {/* LOG TAB */}
            <TabsContent value="log" className="space-y-2">
              <div className="flex justify-between items-center">
                <p className="text-xs text-muted-foreground">{logs.length} entries</p>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => MEMORY_STORE.clear()} className="text-xs h-7">
                    Clear Memory
                  </Button>
                  <Button variant="ghost" size="sm" onClick={clearJoyrideLogs} className="text-xs h-7">
                    Clear Logs
                  </Button>
                </div>
              </div>
              {logs.slice(-20).reverse().map((log, i) => (
                <div key={i} className="p-2 bg-secondary/20 rounded text-xs space-y-1">
                  <div className="flex justify-between">
                    <span className="font-medium">{log.preset}</span>
                    <span className="text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <span>{log.pair}</span>
                    <span className={log.direction === "NO_TRADE" ? "text-muted-foreground" : log.direction === "CALL" ? "text-success" : "text-destructive"}>
                      {log.direction}
                    </span>
                    <span className="font-mono">{log.confidence}%</span>
                  </div>
                </div>
              ))}
              {logs.length === 0 && (
                <Card className="p-4 text-center text-sm text-muted-foreground">
                  No evaluations yet
                </Card>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SheetContent>
    </Sheet>
  );
};
