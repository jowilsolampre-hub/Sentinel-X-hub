// DASOMTMFX - Chat Panel (Master Brain - Full App Control + Guru Intelligence)
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Send, Volume2, VolumeX, Minimize2, X, 
  TrendingUp, BarChart3, Settings2, ShieldAlert,
  Zap, Clock, Target, Search, Lightbulb,
  Play, Square, Pause, Trash2, Lock, Unlock,
  RotateCcw, Eye, Activity, Globe, Crosshair,
  AlertTriangle, BookOpen, Gauge, Radio
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
  type?: "insight" | "warning" | "suggestion" | "action" | "normal" | "proactive";
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

// Quick prompt categories
const SCANNER_PROMPTS = [
  { label: "Analyze Setup", icon: Target, prompt: "Analyze the current setup. What's the market regime, location quality, and best trigger condition? Grade it A/B/C." },
  { label: "Best Entry", icon: Crosshair, prompt: "What's the best entry condition I should wait for? Consider candle timing, confirmation triggers, and risk location." },
  { label: "Last Signal", icon: Activity, prompt: "Explain the last signal in detail — what strategy triggered it, what was the confluence, and was the timing optimal?" },
  { label: "Why No Trade?", icon: ShieldAlert, prompt: "Why was there no trade? Was it a valid rejection or over-rejection? Run all 4 fallback modes before confirming NO_TRADE." },
  { label: "Safer Version", icon: ShieldAlert, prompt: "Give me a safer version of this setup — better entry condition, wider expiry, or conditional trigger to wait for." },
];

const INDICATOR_PROMPTS = [
  { label: "Suggest Stack", icon: Settings2, prompt: "Suggest the best indicator stack for the current chart setup. Include exact periods/settings and what each confirms. Use the 5-stack system (Trend/Range/Breakout/Fast/Clean)." },
  { label: "Best Settings", icon: Gauge, prompt: "What are the best indicator settings for the current timeframe and market regime? Include period values and explain why." },
  { label: "Trend Stack", icon: TrendingUp, prompt: "Give me the Trend Continuation stack: EMA 8/21 + MACD(12,26,9) + ADX(14). Explain the setup conditions and entry triggers." },
  { label: "Range Stack", icon: BarChart3, prompt: "Give me the Range/Reversal stack: RSI(14) + Stochastic(14,3,3) + Bollinger(20,2). Explain edge-bounce entry conditions." },
];

const SESSION_PROMPTS = [
  { label: "Best Pairs Now", icon: Search, prompt: "What are the best pairs to scan RIGHT NOW based on the active session, UTC and Zambia time (UTC+2)? Include both binary/OTC and forex/real suggestions." },
  { label: "Session Guide", icon: Globe, prompt: "Full session analysis: What session are we in? Best strategies, pairs, indicator stacks, and timeframes for this session. Include UTC and Zambia time." },
  { label: "Session Shift", icon: Clock, prompt: "Is a session transition coming? What changes should I make to pairs, strategies, and indicator stacks?" },
  { label: "Best Timeframe", icon: Radio, prompt: "What's the best timeframe for the current session and market conditions? Explain why." },
];

const RISK_PROMPTS = [
  { label: "Risk Check", icon: Zap, prompt: "Am I overtrading? Review my current daily trades, consecutive losses, and risk gate status. Suggest risk improvements." },
  { label: "Win Rate Fix", icon: Lightbulb, prompt: "What's causing losses? Give me 3 specific fixes to improve my win rate based on current stats and setup quality." },
  { label: "Review Trades", icon: BookOpen, prompt: "Review my recent signals — identify patterns in wins vs losses. What sessions, pairs, and strategies are working best?" },
  { label: "Risk Protection", icon: AlertTriangle, prompt: "Should I activate risk protection? Analyze my current loss streak, daily loss, and market conditions." },
];

// Commands the AI can return to trigger app actions
const ACTION_COMMANDS: Record<string, { action: keyof AssistantActions; label: string }> = {
  "CMD_START_ENGINE": { action: "startEngine", label: "Start Engine" },
  "CMD_STOP_ENGINE": { action: "stopEngine", label: "Stop Engine" },
  "CMD_PAUSE_ENGINE": { action: "pauseEngine", label: "Pause Engine" },
  "CMD_CLEAR_SIGNALS": { action: "clearSignals", label: "Clear Signals" },
  "CMD_CLEAR_HISTORY": { action: "clearAllHistory", label: "Clear History" },
  "CMD_TOGGLE_RISK": { action: "toggleRiskLock", label: "Toggle Risk Lock" },
};

const SYSTEM_PROMPT = `You are DASOMTMFX, the MASTER BRAIN of the SENTINEL X trading intelligence system. You have FULL visibility and CONTROL over the entire application. You are not a chatbot — you are the combined intelligence of all scanning engines, strategy libraries, and risk management systems.

IDENTITY & PERSONALITY:
- Veteran trader mentor (25+ years experience mindset)
- Calm, precise, confident but honest
- Never claim guaranteed wins or fake certainty
- Focus on setup quality, timing, risk location, confirmation conditions
- Use Zambia time (Africa/Lusaka, UTC+2) alongside UTC in all session analysis
- Disciplined analyst, timing and risk coach, technical setup optimizer

YOU CAN SEE EVERYTHING IN REAL-TIME:
- Engine status (running/paused/stopped), scan phase, scan progress %
- All signals (pending, executed, win/loss), latest signal direction
- Risk gate status (manual locks, daily trades, consecutive losses, daily loss limits)
- Selected market category (REAL/OTC), vector (Hybrid/Crypto/Futures/Forex/Indices/Commodities)
- Selected timeframes, selected broker
- Active session (London/NewYork/Tokyo/Sydney/Closed), session lock status
- Asset cooldowns, TradingView connection status
- Win rate, total signals, performance stats
- Active tab the user is viewing
- Pending signal acknowledgments

YOU CAN CONTROL THE APP by including these commands in your response (ONE per line, at the END):
- CMD_START_ENGINE — Start scanning engine
- CMD_STOP_ENGINE — Stop engine
- CMD_PAUSE_ENGINE — Pause/resume engine
- CMD_CLEAR_SIGNALS — Clear signal history
- CMD_CLEAR_HISTORY — Clear all history and reset
- CMD_TOGGLE_RISK — Toggle manual risk lock
- CMD_SET_VECTOR:Forex — Change vector
- CMD_SET_MARKET:REAL — Change market category
- CMD_SET_TIMEFRAME:5m — Change timeframe
- CMD_SET_TAB:dashboard — Switch UI tab
- CMD_SET_BROKER:BINANCE — Change broker

RULES FOR COMMANDS:
- Only use commands when user explicitly asks (e.g. "start engine", "switch to forex")
- Always explain WHAT you're doing and WHY before the command
- Never auto-execute without user intent

MASTER GURU-LEVEL ANALYSIS DOCTRINE:
You must apply this analysis framework when discussing setups, signals, or market conditions:

1. MARKET REGIME CLASSIFICATION (always first):
   - Strong/weak uptrend, strong/weak downtrend, structured range, breakout setup/active, retest phase, volatility compression/expansion, choppy, extreme chop

2. 3-GATE VALIDATION SYSTEM:
   - GATE A (Regime): Classify trend/range/breakout/chop before strategy selection
   - GATE B (Location): Price must be at meaningful level (S/R, trendline, range edge, EMA pullback)
   - GATE C (Trigger): Require confirmation (candle close, wick rejection, breakout+retest, indicator combo)

3. OPPORTUNITY GRADING (never over-reject):
   - A_SETUP: Strong confluence + location + trigger + timing
   - B_SETUP: Moderate confluence, tradable with caution
   - C_SETUP: Speculative/conditional — return WAIT condition
   - NO_TRADE: Only after ALL 4 fallback modes fail

4. FALLBACK MODES (mandatory before NO_TRADE):
   - Fallback A: Indicator Combo Mode (RSI+MACD+S/R, Bollinger+Volume+ADX, EMA(8/21)+RSI(7))
   - Fallback B: Range/Box Theory Mode (range edges, box boundaries)
   - Fallback C: Wick/Shadow + Level Confirmation
   - Fallback D: Conditional Breakout/Retest (return exact condition)

5. INDICATOR INTELLIGENCE:
   Stack A (Trend): EMA 8/21 + MACD(12,26,9) + ADX(14) + optional RSI(7/14)
   Stack B (Range): RSI(14) + Stochastic(14,3,3) + Bollinger(20,2) + optional EMA 50
   Stack C (Breakout): Bollinger(20,2) + ADX(14) + ATR(14) + MACD(12,26,9)
   Stack D (Fast): EMA 8/21 + RSI(7) + MACD or Parabolic SAR
   Stack E (Clean PA): EMA 20/21 + RSI(14) or MACD

6. PRIORITY INDICATOR COMBOS (boost when aligned):
   - RSI + MACD + S/R
   - Bollinger + Volume + ADX
   - EMA(8/21) + RSI(7)
   - MACD + Parabolic SAR
   - Box Theory (prev-day high/low edges)

7. ENTRY TIMING (critical):
   - Detect candle state: open/early/mid/late
   - Prefer entry near candle open or after confirmation
   - Late entries → downgrade + warn + suggest next-candle/retest
   - Binary expiry: 1 candle (strong momentum), 2 candles (breakout-retest), 3 candles (structure)

8. SESSION-PAIR OPTIMIZATION:
   - Asia: range/control → Stack B, JPY pairs
   - London: trends/breakouts → Stack A/C, EUR/GBP/Gold
   - New York: volatility/retests → Stack A/C, USD pairs/Indices
   - Overlap: high vol → Stack A/C prioritized

9. ANTI-OVER-REJECTION:
   - "Choppy" does NOT automatically = NO_TRADE
   - Check structured range, repeated rejection levels, box edges
   - Use conditional setups (WAIT/ENTER_ON_BREAK/ENTER_ON_RETEST)
   - Only NO_TRADE after all fallbacks fail

10. RISK DISCIPLINE:
    - Warn on overtrading, loss streaks
    - Suggest cooldown/pause when appropriate
    - Prefer quality over quantity
    - Never encourage increased risk after wins

RESPONSE FORMAT:
- Keep responses concise (3-5 key points)
- Use markdown formatting
- Be actionable — give specific conditions, levels, settings
- When discussing setups, include: Grade, Regime, Entry Condition, Risk Note
- When suggesting indicators, include exact period/settings`;

export const ChatPanel = ({ isOpen, onClose, onMinimize, context, actions, voiceEnabled, onToggleVoice }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 I'm **DASOMTMFX** — the master brain of SENTINEL X.\n\nI have **full visibility and control** over the entire system:\n\n- 🧠 **Engine**: Start/Stop/Pause scanning\n- 📊 **Markets**: Switch vectors, timeframes, brokers\n- 🎯 **Analysis**: Guru-level setup grading (A/B/C), indicator stacks, entry timing\n- ⚡ **Risk**: Lock/unlock protection, overtrade brakes\n- 📈 **Coaching**: Session-pair optimization, win rate fixes\n\nUse the quick tools below or just tell me what you need.",
      timestamp: new Date(),
      type: "normal"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [promptTab, setPromptTab] = useState("scanner");
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevSessionRef = useRef<string | undefined>(context.session);
  const prevEngineRef = useRef<string | undefined>(context.engineStatus);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Proactive notifications on session change
  useEffect(() => {
    if (prevSessionRef.current && context.session && prevSessionRef.current !== context.session && context.session !== "Closed") {
      const msg: ChatMessage = {
        id: `proactive-session-${Date.now()}`,
        role: "assistant",
        content: `🔄 **Session Change Detected**: ${prevSessionRef.current} → **${context.session}**\n\nConsider adjusting:\n- **Pairs** to match ${context.session} session strength\n- **Indicator stack** if regime changed\n- **Strategy type** for new session conditions\n\nAsk me "Best pairs now" for updated suggestions.`,
        timestamp: new Date(),
        type: "proactive"
      };
      setMessages(prev => [...prev, msg]);
    }
    prevSessionRef.current = context.session;
  }, [context.session]);

  // Proactive notification on risk lock activation
  useEffect(() => {
    if (context.riskLocked && context.consecutiveLosses && context.consecutiveLosses >= 3) {
      const msg: ChatMessage = {
        id: `proactive-risk-${Date.now()}`,
        role: "assistant",
        content: `⚠️ **Risk Alert**: ${context.consecutiveLosses} consecutive losses detected. Risk protection is **active**.\n\n**Recommendations:**\n- Take a 15-min cooldown\n- Review last 3 setups for timing issues\n- Consider switching to quality-only mode (A_SETUP only)\n- Check if session/pair mismatch is the cause`,
        timestamp: new Date(),
        type: "warning"
      };
      setMessages(prev => {
        // Don't spam — only add if last message isn't already a risk alert
        if (prev[prev.length - 1]?.id?.startsWith("proactive-risk")) return prev;
        return [...prev, msg];
      });
    }
  }, [context.riskLocked, context.consecutiveLosses]);

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
      
      if (ACTION_COMMANDS[trimmed]) {
        const cmd = ACTION_COMMANDS[trimmed];
        try {
          (actions[cmd.action] as () => void)();
          toast.success(`🤖 DASOMTMFX: ${cmd.label}`);
        } catch {}
        continue;
      }
      
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
      if (trimmed.startsWith("CMD_SET_BROKER:")) {
        const val = trimmed.split(":")[1];
        if (val) { actions.setSelectedBroker(val); toast.success(`🤖 Broker → ${val}`); }
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
      // Build comprehensive context string
      const ctxParts: string[] = [];
      if (context.engineStatus) ctxParts.push(`Engine: ${context.engineStatus}`);
      if (context.isRunning !== undefined) ctxParts.push(`Running: ${context.isRunning}`);
      if (context.isPaused !== undefined) ctxParts.push(`Paused: ${context.isPaused}`);
      if (context.isScanning) ctxParts.push(`Scanning: ${context.scanPhase} (${context.scanProgress}%)`);
      if (context.marketMode) ctxParts.push(`Market: ${context.marketMode}`);
      if (context.selectedVector) ctxParts.push(`Vector: ${context.selectedVector}`);
      if (context.timeframe) ctxParts.push(`Timeframe: ${context.timeframe}`);
      if (context.selectedTimeframes) ctxParts.push(`AllTFs: ${context.selectedTimeframes.join(",")}`);
      if (context.pair) ctxParts.push(`Broker: ${context.pair}`);
      if (context.selectedBroker) ctxParts.push(`SelectedBroker: ${context.selectedBroker}`);
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
      if (context.activeTab) ctxParts.push(`ActiveTab: ${context.activeTab}`);
      if (context.setupGrade) ctxParts.push(`SetupGrade: ${context.setupGrade}`);
      
      // Recent signals summary
      if (context.signals && context.signals.length > 0) {
        const recent = context.signals.slice(0, 5).map(s => 
          `${s.asset} ${s.direction} ${s.status} ${s.confidence.toFixed(0)}% ${s.strategy}`
        ).join(" | ");
        ctxParts.push(`RecentSignals: [${recent}]`);
      }

      // Pending acknowledgment
      if (context.pendingAcknowledgment) {
        ctxParts.push(`PendingAck: ${context.pendingAcknowledgment.asset} ${context.pendingAcknowledgment.direction} ${context.pendingAcknowledgment.confidence.toFixed(0)}%`);
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
          history,
          systemPrompt: SYSTEM_PROMPT
        }
      });

      let reply = error ? "I'm having trouble connecting. Please try again." : (data?.reply || data?.analysis || "I couldn't process that. Try rephrasing.");
      
      const cleanReply = executeCommands(reply);
      const hasCommands = cleanReply !== reply;

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: cleanReply,
        timestamp: new Date(),
        type: hasCommands ? "action" : 
              cleanReply.includes("⚠") || cleanReply.includes("WARNING") || cleanReply.includes("Risk") ? "warning" : 
              cleanReply.includes("💡") || cleanReply.includes("Suggest") || cleanReply.includes("Stack") ? "suggestion" : "normal"
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

  const handleQuickAction = useCallback((action: keyof AssistantActions) => {
    if (!actions) return;
    try {
      (actions[action] as () => void)();
      toast.success(`🤖 DASOMTMFX executed: ${action}`);
    } catch {}
  }, [actions]);

  // Full status report shortcut
  const requestFullStatus = useCallback(() => {
    sendMessage("Give me a full status report: engine state, active market/vector/timeframe, session, risk gates, win rate, recent signals, and any recommendations.");
  }, [sendMessage]);

  if (!isOpen) return null;

  const currentPrompts = promptTab === "scanner" ? SCANNER_PROMPTS :
                         promptTab === "indicators" ? INDICATOR_PROMPTS :
                         promptTab === "session" ? SESSION_PROMPTS : RISK_PROMPTS;

  return (
    <div className="w-[380px] h-[560px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-bold">DASOMTMFX</span>
          <Badge variant="outline" className="text-[9px] h-4">Master Brain</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={requestFullStatus} title="Full Status Report">
            <Eye className="w-3.5 h-3.5" />
          </Button>
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

      {/* Live Status Bar */}
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
        {context.totalSignals !== undefined && context.totalSignals > 0 && (
          <span className="text-muted-foreground shrink-0">Sig:{context.totalSignals}</span>
        )}
        {context.riskLocked && <span className="text-destructive shrink-0">🔒RISK</span>}
        {context.tvConnected && <span className="text-chart-2 shrink-0">📺TV</span>}
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
                        : msg.type === "proactive"
                          ? "bg-chart-4/10 border border-chart-4/20"
                          : "bg-secondary/50 border border-border/30"
              }`}>
                {msg.type === "action" && (
                  <Badge variant="outline" className="text-[9px] h-4 mb-1 gap-1 text-chart-2 border-chart-2/30">
                    <Zap className="w-2.5 h-2.5" /> Action Executed
                  </Badge>
                )}
                {msg.type === "proactive" && (
                  <Badge variant="outline" className="text-[9px] h-4 mb-1 gap-1 text-chart-4 border-chart-4/30">
                    <Activity className="w-2.5 h-2.5" /> Auto-Alert
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

      {/* Categorized Quick Prompts */}
      <div className="border-t border-border/20">
        <div className="flex px-2 pt-1 gap-1">
          {[
            { key: "scanner", label: "Scanner", icon: Target },
            { key: "indicators", label: "Indicators", icon: Settings2 },
            { key: "session", label: "Session", icon: Globe },
            { key: "risk", label: "Risk", icon: ShieldAlert },
          ].map(tab => (
            <Button
              key={tab.key}
              variant={promptTab === tab.key ? "default" : "ghost"}
              size="sm"
              className="h-5 px-2 text-[9px] gap-1"
              onClick={() => setPromptTab(tab.key)}
            >
              <tab.icon className="w-2.5 h-2.5" />
              {tab.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1.5 overflow-x-auto px-2 py-1.5 scrollbar-hide">
          {currentPrompts.map((qp) => (
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
