// JOYRIDE PRO PACK - UI Panel Component

import { useState, useMemo } from "react";
import { JoyrideConfig, JoyridePresetId, Aggressiveness, JoyrideSignal } from "@/modules/joyride/types";
import { DEFAULT_JOYRIDE_CONFIG, JOYRIDE_PRO_PACK_ENABLED } from "@/modules/joyride/featureFlag";
import { getAllPresets, getPreset } from "@/modules/joyride/presets";
import { joyrideEvaluate, getJoyrideLogs, clearJoyrideLogs, ChartState } from "@/modules/joyride/engine";
import { rankPairs } from "@/modules/joyride/pairRanker";
import { getSessionInfo } from "@/modules/joyride/sessionEngine";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Rocket,
  Zap,
  Shield,
  TrendingUp,
  TrendingDown,
  Ban,
  Clock,
  Target,
  Settings,
  BarChart3,
  ListChecks,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronRight,
} from "lucide-react";

interface JoyridePanelProps {
  chartState?: ChartState;
}

export const JoyridePanel = ({ chartState }: JoyridePanelProps) => {
  const [config, setConfig] = useState<JoyrideConfig>(DEFAULT_JOYRIDE_CONFIG);
  const [lastSignal, setLastSignal] = useState<JoyrideSignal | null>(null);

  if (!JOYRIDE_PRO_PACK_ENABLED) return null;

  const session = getSessionInfo();
  const preset = getPreset(config.selectedPreset);
  const presets = getAllPresets();

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
    const result = joyrideEvaluate(chart, config);
    if (result) setLastSignal(result);
  };

  const pairRankings = useMemo(() => {
    if (!config.pairRanking) return [];
    return rankPairs([], chartState || {});
  }, [config.pairRanking, chartState]);

  const logs = getJoyrideLogs();

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
            <TabsList className="w-full">
              <TabsTrigger value="setup" className="flex-1 gap-1 text-xs">
                <Settings className="w-3 h-3" /> Setup
              </TabsTrigger>
              <TabsTrigger value="signal" className="flex-1 gap-1 text-xs">
                <Target className="w-3 h-3" /> Signal
              </TabsTrigger>
              <TabsTrigger value="pairs" className="flex-1 gap-1 text-xs">
                <BarChart3 className="w-3 h-3" /> Pairs
              </TabsTrigger>
              <TabsTrigger value="log" className="flex-1 gap-1 text-xs">
                <ListChecks className="w-3 h-3" /> Log
              </TabsTrigger>
            </TabsList>

            {/* SETUP TAB */}
            <TabsContent value="setup" className="space-y-3">
              {/* Preset Selector */}
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">PRESET</p>
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

              {lastSignal && (
                <Card className="p-4 border border-border/50 space-y-3">
                  {/* Direction Header */}
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

                  {/* Reasons */}
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

                  {/* Avoid If */}
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

                  {/* Invalidation */}
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

                  {/* Setup Checklist */}
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
                <Button variant="ghost" size="sm" onClick={clearJoyrideLogs} className="text-xs h-7">
                  Clear
                </Button>
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
