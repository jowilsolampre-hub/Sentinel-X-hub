// DASOMTMFX - Chat Panel (Master Brain - Full App Control)
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Volume2, VolumeX, Minimize2, X, 
  TrendingUp, BarChart3, Settings2, ShieldAlert,
  Zap, Clock, Target, Search, Lightbulb,
  Play, Square, Pause, Trash2, Lock, Unlock,
  RotateCcw, Eye
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import type { AssistantContext, AssistantActions } from "./DasomtmfxAssistant";
import { toast } from "sonner";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "insight" | "warning" | "suggestion" | "action" | "normal";
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  context: AssistantContext;
  actions?: AssistantActions;
  voiceEnabled: boolean;
  onToggleVoice: () => void;
}

const QUICK_PROMPTS = [
  { label: "Best Indicators", icon: Settings2, prompt: "What indicators should I add for the current chart setup? Include exact periods and settings." },
  { label: "Best Pairs Now", icon: Search, prompt: "What are the best pairs to scan right now for the active session and timeframe?" },
  { label: "Entry Timing", icon: Clock, prompt: "What's the best entry condition I should wait for on the current setup?" },
  { label: "Setup Quality", icon: Target, prompt: "Rate the current setup quality and explain what would upgrade it to A_SETUP." },
  { label: "Why No Trade?", icon: ShieldAlert, prompt: "Why did the scanner reject the last trade? Was it valid?" },
  { label: "Risk Check", icon: Zap, prompt: "Am I overtrading? Review my recent activity and suggest risk improvements." },
  { label: "Session Guide", icon: TrendingUp, prompt: "What session are we in? Best strategies and pairs for this session?" },
  { label: "Improve Win Rate", icon: Lightbulb, prompt: "What's causing my losses? Give me 3 specific fixes to improve my win rate." },
];

// Commands the AI can return to trigger app actions
const ACTION_COMMANDS: Record<string, { action: keyof AssistantActions; label: string; icon: typeof Play }> = {
  "CMD_START_ENGINE": { action: "startEngine", label: "Start Engine", icon: Play },
  "CMD_STOP_ENGINE": { action: "stopEngine", label: "Stop Engine", icon: Square },
  "CMD_PAUSE_ENGINE": { action: "pauseEngine", label: "Pause Engine", icon: Pause },
  "CMD_CLEAR_SIGNALS": { action: "clearSignals", label: "Clear Signals", icon: Trash2 },
  "CMD_CLEAR_HISTORY": { action: "clearAllHistory", label: "Clear History", icon: RotateCcw },
  "CMD_TOGGLE_RISK": { action: "toggleRiskLock", label: "Toggle Risk Lock", icon: Lock },
};

const SYSTEM_PROMPT = `You are DASOMTMFX, the MASTER BRAIN of the SENTINEL X trading intelligence system. You have FULL visibility and CONTROL over the entire application.

PERSONALITY: Calm, precise, confident but honest. You're a veteran trader mentor.
- Never claim guaranteed wins
- Focus on setup quality, timing, risk location, confirmation conditions
- Be practical and chart-relevant
- Use Zambia time (UTC+2) when discussing sessions

YOU CAN SEE EVERYTHING:
- Engine status, scan phase, progress
- All signals (pending, executed, win/loss)
- Risk gate status (locks, daily trades, consecutive losses, daily loss)
- Selected market category, vector, timeframes, broker
- Session info, cooldowns, TradingView connection
- Win rate, total signals, performance stats

YOU CAN CONTROL THE APP by including these commands in your response (ONE per line, at the END of your message):
- CMD_START_ENGINE — Start the scanning engine
- CMD_STOP_ENGINE — Stop the engine
- CMD_PAUSE_ENGINE — Pause/resume the engine
- CMD_CLEAR_SIGNALS — Clear signal history
- CMD_CLEAR_HISTORY — Clear all history and reset stats
- CMD_TOGGLE_RISK — Toggle manual risk lock on/off
- CMD_SET_VECTOR:Forex — Change vector (Hybrid/Crypto/Futures/Forex/Indices/Commodities)
- CMD_SET_MARKET:REAL — Change market (REAL/OTC)
- CMD_SET_TIMEFRAME:5m — Change timeframe
- CMD_SET_TAB:dashboard — Switch tab (dashboard/intelligence/analytics/strategies/connections)

RULES FOR COMMANDS:
- Only use commands when the user explicitly asks you to do something (e.g., "start the engine", "switch to forex", "lock risk")
- Always explain WHAT you're doing and WHY before the command
- Never auto-execute without user intent

CAPABILITIES:
- Indicator suggestion (with exact periods/settings)
- Pair/session recommendations  
- Setup quality grading (A/B/C)
- Entry timing coaching
- Risk discipline guidance
- Trade review & journal analysis
- Engine control & configuration
- Full app status reporting

Keep responses concise (2-4 key points). Use markdown. Be actionable.`;

export const ChatPanel = ({ isOpen, onClose, onMinimize, context, actions, voiceEnabled, onToggleVoice }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 I'm **DASOMTMFX** — the master brain of SENTINEL X.\n\nI can **see everything** and **control everything**:\n\n- 🧠 **Start/Stop/Pause** the engine\n- 📊 **Switch** markets, vectors, timeframes\n- 🎯 **Suggest** indicators, pairs, entries\n- ⚡ **Lock/unlock** risk protection\n- 📈 **Analyze** your performance\n\nJust ask me anything or tell me what to do.",
      timestamp: new Date(),
      type: "normal"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const speak = useCallback((text: string) => {
    if (!voiceEnabled || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const clean = text.replace(/[*#_`~\[\]()>]/g, "").replace(/CMD_\w+:?\w*/g, "").substring(0, 300);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

  // Parse and execute commands from AI response
  const executeCommands = useCallback((text: string) => {
    if (!actions) return text;
    const lines = text.split("\n");
    const cleanLines: string[] = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Simple commands (no params)
      if (ACTION_COMMANDS[trimmed]) {
        const cmd = ACTION_COMMANDS[trimmed];
        try {
          (actions[cmd.action] as () => void)();
          toast.success(`🤖 DASOMTMFX: ${cmd.label}`);
        } catch {}
        continue; // Don't add command line to output
      }
      
      // Parameterized commands
      if (trimmed.startsWith("CMD_SET_VECTOR:")) {
        const val = trimmed.split(":")[1];
        if (val) { actions.setSelectedVector(val); toast.success(`🤖 Vector → ${val}`); }
        continue;
      }
      if (trimmed.startsWith("CMD_SET_MARKET:")) {
        const val = trimmed.split(":")[1];
        if (val) { actions.setMarketCategory(val); toast.success(`🤖 Market → ${val}`); }
        continue;
      }
      if (trimmed.startsWith("CMD_SET_TIMEFRAME:")) {
        const val = trimmed.split(":")[1];
        if (val) { actions.setSelectedTimeframes([val]); toast.success(`🤖 Timeframe → ${val}`); }
        continue;
      }
      if (trimmed.startsWith("CMD_SET_TAB:")) {
        const val = trimmed.split(":")[1];
        if (val) { actions.setActiveTab(val); toast.success(`🤖 Tab → ${val}`); }
        continue;
      }
      
      cleanLines.push(line);
    }
    
    return cleanLines.join("\n").trim();
  }, [actions]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: content.trim(),
      timestamp: new Date()
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build rich context string with ALL app state
      const ctxParts: string[] = [];
      if (context.engineStatus) ctxParts.push(`Engine: ${context.engineStatus}`);
      if (context.isRunning !== undefined) ctxParts.push(`Running: ${context.isRunning}`);
      if (context.isPaused !== undefined) ctxParts.push(`Paused: ${context.isPaused}`);
      if (context.isScanning) ctxParts.push(`Scanning: ${context.scanPhase} (${context.scanProgress}%)`);
      if (context.marketMode) ctxParts.push(`Market: ${context.marketMode}`);
      if (context.selectedVector) ctxParts.push(`Vector: ${context.selectedVector}`);
      if (context.timeframe) ctxParts.push(`Timeframe: ${context.timeframe}`);
      if (context.selectedTimeframes) ctxParts.push(`All TFs: ${context.selectedTimeframes.join(",")}`);
      if (context.pair) ctxParts.push(`Pair/Broker: ${context.pair}`);
      if (context.session) ctxParts.push(`Session: ${context.session}`);
      if (context.winRate !== undefined) ctxParts.push(`WinRate: ${context.winRate.toFixed(1)}%`);
      if (context.totalSignals !== undefined) ctxParts.push(`TotalSignals: ${context.totalSignals}`);
      if (context.pendingSignals !== undefined) ctxParts.push(`Pending: ${context.pendingSignals}`);
      if (context.executedSignals !== undefined) ctxParts.push(`Executed: ${context.executedSignals}`);
      if (context.riskLocked !== undefined) ctxParts.push(`RiskLocked: ${context.riskLocked}`);
      if (context.currentDailyTrades !== undefined) ctxParts.push(`DailyTrades: ${context.currentDailyTrades}/${context.maxDailyTrades}`);
      if (context.consecutiveLosses !== undefined) ctxParts.push(`ConsecLosses: ${context.consecutiveLosses}/${context.maxConsecutiveLosses}`);
      if (context.currentDailyLoss !== undefined) ctxParts.push(`DailyLoss: $${context.currentDailyLoss}/$${context.maxDailyLoss}`);
      if (context.activeCooldowns !== undefined) ctxParts.push(`Cooldowns: ${context.activeCooldowns}`);
      if (context.tvConnected !== undefined) ctxParts.push(`TradingView: ${context.tvConnected ? "Connected" : "Disconnected"}`);
      if (context.sessionLocked !== undefined) ctxParts.push(`SessionLocked: ${context.sessionLocked}`);
      if (context.sessionCanScan !== undefined) ctxParts.push(`CanScan: ${context.sessionCanScan}`);
      if (context.sessionBlockReason) ctxParts.push(`ScanBlock: ${context.sessionBlockReason}`);
      if (context.lastSignal) ctxParts.push(`LastSignal: ${context.lastSignal}`);
      if (context.signalDirection) ctxParts.push(`Direction: ${context.signalDirection}`);
      if (context.confidence) ctxParts.push(`Confidence: ${context.confidence}%`);
      
      // Include recent signals summary
      if (context.signals && context.signals.length > 0) {
        const recent = context.signals.slice(0, 5).map(s => 
          `${s.asset} ${s.direction} ${s.status} ${s.confidence.toFixed(0)}% ${s.strategy}`
        ).join(" | ");
        ctxParts.push(`RecentSignals: [${recent}]`);
      }

      const contextStr = ctxParts.join(" | ");
      const zamTime = new Date().toLocaleString("en-ZM", { timeZone: "Africa/Lusaka" });
      const utcTime = new Date().toISOString();

      const history = messages.slice(-10).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke("analyze-trend", {
        body: {
          mode: "assistant_chat",
          message: content.trim(),
          context: `${contextStr} | ZambiaTime: ${zamTime} | UTC: ${utcTime}`,
          history
        }
      });

      let reply = error ? "I'm having trouble connecting. Please try again." : (data?.reply || data?.analysis || "I couldn't process that. Try rephrasing.");
      
      // Execute any commands in the reply
      const cleanReply = executeCommands(reply);
      const hasCommands = cleanReply !== reply;

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cleanReply,
        timestamp: new Date(),
        type: hasCommands ? "action" : 
              cleanReply.includes("⚠") || cleanReply.includes("WARNING") ? "warning" : 
              cleanReply.includes("💡") || cleanReply.includes("Suggest") ? "suggestion" : "normal"
      };
      setMessages(prev => [...prev, assistantMsg]);
      speak(cleanReply);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Connection error. Please try again.",
        timestamp: new Date(),
        type: "warning"
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [context, messages, isLoading, speak, executeCommands]);

  // Quick action buttons that directly control the app
  const handleQuickAction = useCallback((action: keyof AssistantActions) => {
    if (!actions) return;
    try {
      (actions[action] as () => void)();
      toast.success(`🤖 DASOMTMFX executed: ${action}`);
    } catch {}
  }, [actions]);

  if (!isOpen) return null;

  return (
    <div className="w-[360px] h-[520px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-bold">DASOMTMFX</span>
          <Badge variant="outline" className="text-[10px] h-4">Master Brain</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleVoice}>
            {voiceEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onMinimize}>
            <Minimize2 className="w-3.5 h-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Status Bar — live app state summary */}
      <div className="px-3 py-1.5 border-b border-border/20 bg-secondary/20 flex items-center gap-2 overflow-x-auto text-[10px] scrollbar-hide">
        <Badge variant={context.engineStatus === "RUNNING" ? "default" : "outline"} className="text-[9px] h-4 shrink-0">
          {context.engineStatus || "STOPPED"}
        </Badge>
        <span className="text-muted-foreground shrink-0">{context.marketMode || "REAL"}</span>
        <span className="text-muted-foreground shrink-0">{context.selectedVector || "Hybrid"}</span>
        <span className="text-muted-foreground shrink-0">{context.timeframe || "5m"}</span>
        <span className="text-muted-foreground shrink-0">{context.session || "—"}</span>
        {context.winRate !== undefined && context.winRate > 0 && (
          <span className="text-chart-2 shrink-0">WR:{context.winRate.toFixed(0)}%</span>
        )}
        {context.riskLocked && <span className="text-destructive shrink-0">🔒RISK</span>}
      </div>

      {/* Quick Engine Controls */}
      {actions && (
        <div className="px-2 py-1 border-b border-border/20 flex items-center gap-1 overflow-x-auto scrollbar-hide">
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 shrink-0" onClick={() => handleQuickAction("startEngine")} disabled={context.isRunning}>
            <Play className="w-3 h-3" /> Start
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 shrink-0" onClick={() => handleQuickAction("pauseEngine")} disabled={!context.isRunning}>
            <Pause className="w-3 h-3" /> Pause
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 shrink-0" onClick={() => handleQuickAction("stopEngine")} disabled={!context.isRunning}>
            <Square className="w-3 h-3" /> Stop
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 shrink-0" onClick={() => handleQuickAction("toggleRiskLock")}>
            {context.riskLocked ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            {context.riskLocked ? "Unlock" : "Lock"}
          </Button>
          <Button variant="ghost" size="sm" className="h-6 px-2 text-[10px] gap-1 shrink-0" onClick={() => handleQuickAction("clearSignals")}>
            <Trash2 className="w-3 h-3" /> Clear
          </Button>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-3" ref={scrollRef}>
        <div className="space-y-3">
          {messages.map(msg => (
            <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user" 
                  ? "bg-primary/20 border border-primary/30" 
                  : msg.type === "warning" 
                    ? "bg-destructive/10 border border-destructive/20"
                    : msg.type === "action"
                      ? "bg-chart-2/10 border border-chart-2/20"
                      : msg.type === "suggestion"
                        ? "bg-accent/10 border border-accent/20"
                        : "bg-secondary/50 border border-border/30"
              }`}>
                {msg.type === "action" && (
                  <Badge variant="outline" className="text-[9px] h-4 mb-1 gap-1 text-chart-2 border-chart-2/30">
                    <Zap className="w-2.5 h-2.5" /> Action Executed
                  </Badge>
                )}
                <div className="prose prose-sm prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_li]:my-0.5 [&_strong]:text-foreground [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-secondary/50 border border-border/30 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="flex gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  Analyzing...
                </div>
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      <div className="px-2 py-1.5 border-t border-border/20">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {QUICK_PROMPTS.map((qp) => (
            <Button
              key={qp.label}
              variant="outline"
              size="sm"
              className="text-[10px] h-6 px-2 whitespace-nowrap shrink-0 gap-1"
              onClick={() => sendMessage(qp.prompt)}
              disabled={isLoading}
            >
              <qp.icon className="w-3 h-3" />
              {qp.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-2 border-t border-border/30">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask or command DASOMTMFX..."
            className="h-8 text-sm bg-secondary/30"
            disabled={isLoading}
          />
          <Button type="submit" size="icon" className="h-8 w-8 shrink-0" disabled={isLoading || !input.trim()}>
            <Send className="w-3.5 h-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
