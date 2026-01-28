// SENTINEL X - Intelligence Engine Dashboard (v5)
// Real-time status: Bias, Volatility, Session, Confidence, Confluence

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Brain,
  TrendingUp,
  Activity,
  Clock,
  Target,
  Layers,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Zap
} from "lucide-react";
import {
  analyzeSession,
  getEngineState,
  type SessionResult,
  type EngineState,
  type SafeStateResult
} from "@/engine/intelligenceEngines";

interface EngineScore {
  name: string;
  icon: React.ReactNode;
  score: number;
  status: "active" | "warning" | "inactive";
  detail: string;
}

export const IntelligencePanel = () => {
  const [engines, setEngines] = useState<EngineScore[]>([]);
  const [sessionData, setSessionData] = useState<SessionResult | null>(null);
  const [engineState, setEngineState] = useState<SafeStateResult | null>(null);

  useEffect(() => {
    const updateEngines = () => {
      const session = analyzeSession();
      const state = getEngineState();
      
      setSessionData(session);
      setEngineState(state);

      // Simulate real-time engine scores (these would come from actual analysis)
      const biasScore = 65 + Math.random() * 30;
      const volatilityScore = session.optimalTrading ? 75 + Math.random() * 20 : 40 + Math.random() * 30;
      const sessionScore = session.sessionStrength;
      const confidenceScore = (biasScore * 0.3 + volatilityScore * 0.2 + sessionScore * 0.5);
      const confluenceScore = session.isSessionOpen ? 85 + Math.random() * 10 : 60 + Math.random() * 25;

      const engineList: EngineScore[] = [
        {
          name: "Bias Engine",
          icon: <TrendingUp className="w-4 h-4" />,
          score: Math.round(biasScore),
          status: biasScore >= 70 ? "active" : biasScore >= 50 ? "warning" : "inactive",
          detail: biasScore >= 70 ? "Strong directional bias" : "Analyzing HTF trend"
        },
        {
          name: "Volatility Engine",
          icon: <Activity className="w-4 h-4" />,
          score: Math.round(volatilityScore),
          status: volatilityScore >= 70 ? "active" : volatilityScore >= 50 ? "warning" : "inactive",
          detail: volatilityScore >= 70 ? "Optimal regime" : "Monitoring conditions"
        },
        {
          name: "Session Engine",
          icon: <Clock className="w-4 h-4" />,
          score: sessionScore,
          status: session.optimalTrading ? "active" : sessionScore >= 50 ? "warning" : "inactive",
          detail: session.advice
        },
        {
          name: "Confidence Engine",
          icon: <Target className="w-4 h-4" />,
          score: Math.round(confidenceScore),
          status: confidenceScore >= 80 ? "active" : confidenceScore >= 60 ? "warning" : "inactive",
          detail: confidenceScore >= 80 ? "High confidence signals" : "Building confidence"
        },
        {
          name: "Confluence Engine",
          icon: <Layers className="w-4 h-4" />,
          score: Math.round(confluenceScore),
          status: confluenceScore >= 70 ? "active" : confluenceScore >= 50 ? "warning" : "inactive",
          detail: confluenceScore >= 70 ? "Confluence achieved" : "Awaiting alignment"
        }
      ];

      setEngines(engineList);
    };

    updateEngines();
    const interval = setInterval(updateEngines, 2000);
    return () => clearInterval(interval);
  }, []);

  const getStateColor = (state: EngineState) => {
    switch (state) {
      case "ACTIVE": return "text-success";
      case "IDLE": return "text-muted-foreground";
      case "WAIT": return "text-warning";
      case "NO_TRADE": return "text-destructive";
      case "COOLDOWN": return "text-accent";
      default: return "text-muted-foreground";
    }
  };

  const getStateBadge = (state: EngineState) => {
    switch (state) {
      case "ACTIVE": return "border-success bg-success/10 text-success";
      case "IDLE": return "border-muted-foreground bg-muted/10 text-muted-foreground";
      case "WAIT": return "border-warning bg-warning/10 text-warning";
      case "NO_TRADE": return "border-destructive bg-destructive/10 text-destructive";
      case "COOLDOWN": return "border-accent bg-accent/10 text-accent";
      default: return "";
    }
  };

  const overallScore = engines.length > 0 
    ? Math.round(engines.reduce((sum, e) => sum + e.score, 0) / engines.length)
    : 0;

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Intelligence Engines</h3>
        </div>
        {engineState && (
          <Badge variant="outline" className={cn("text-xs", getStateBadge(engineState.state))}>
            {engineState.state === "ACTIVE" && <Zap className="w-3 h-3 mr-1" />}
            {engineState.state}
          </Badge>
        )}
      </div>

      {/* Overall Score */}
      <div className="mb-4 p-3 bg-secondary/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Overall Intelligence</span>
          <span className={cn(
            "text-lg font-bold",
            overallScore >= 75 && "text-success",
            overallScore >= 50 && overallScore < 75 && "text-warning",
            overallScore < 50 && "text-destructive"
          )}>
            {overallScore}%
          </span>
        </div>
        <Progress 
          value={overallScore} 
          className="h-2"
        />
      </div>

      {/* Engine List */}
      <div className="space-y-3">
        {engines.map((engine) => (
          <div 
            key={engine.name}
            className="p-3 bg-secondary/20 rounded-lg border border-border/30"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "p-1.5 rounded",
                  engine.status === "active" && "bg-success/20 text-success",
                  engine.status === "warning" && "bg-warning/20 text-warning",
                  engine.status === "inactive" && "bg-muted/20 text-muted-foreground"
                )}>
                  {engine.icon}
                </div>
                <span className="text-sm font-medium">{engine.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "text-sm font-mono font-bold",
                  engine.score >= 70 && "text-success",
                  engine.score >= 50 && engine.score < 70 && "text-warning",
                  engine.score < 50 && "text-muted-foreground"
                )}>
                  {engine.score}%
                </span>
                {engine.status === "active" && <CheckCircle2 className="w-3.5 h-3.5 text-success" />}
                {engine.status === "warning" && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}
                {engine.status === "inactive" && <XCircle className="w-3.5 h-3.5 text-muted-foreground" />}
              </div>
            </div>
            <Progress 
              value={engine.score} 
              className="h-1.5 mb-1"
            />
            <p className="text-xs text-muted-foreground truncate">{engine.detail}</p>
          </div>
        ))}
      </div>

      {/* Session Info */}
      {sessionData && (
        <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">{sessionData.currentSession} Session</span>
            </div>
            {sessionData.isSessionOpen && (
              <Badge variant="secondary" className="text-xs bg-success/20 text-success border-success/30">
                <Zap className="w-3 h-3 mr-1" />
                Open (+{sessionData.sessionOpenMinutes}m)
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{sessionData.advice}</p>
          <div className="flex flex-wrap gap-1 mt-2">
            {sessionData.bestVectors.map(v => (
              <Badge key={v} variant="outline" className="text-xs">{v}</Badge>
            ))}
          </div>
        </div>
      )}

      {/* Engine State Info */}
      {engineState && engineState.state !== "ACTIVE" && (
        <div className={cn(
          "mt-3 p-2 rounded-lg text-xs",
          engineState.state === "WAIT" && "bg-warning/10 text-warning",
          engineState.state === "NO_TRADE" && "bg-destructive/10 text-destructive",
          engineState.state === "COOLDOWN" && "bg-accent/10 text-accent",
          engineState.state === "IDLE" && "bg-muted/10 text-muted-foreground"
        )}>
          {engineState.reason}
          {engineState.resumeAt && (
            <span className="ml-2">
              Resume: {engineState.resumeAt.toLocaleTimeString()}
            </span>
          )}
        </div>
      )}
    </Card>
  );
};
