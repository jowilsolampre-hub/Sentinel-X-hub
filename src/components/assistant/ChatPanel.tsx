// DASOMTMFX - Chat Panel with Quick Actions & AI Integration
import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  Send, Volume2, VolumeX, Minimize2, X, 
  TrendingUp, BarChart3, Settings2, ShieldAlert,
  Zap, Clock, Target, Search, Lightbulb
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  type?: "insight" | "warning" | "suggestion" | "normal";
}

interface AssistantContext {
  pair?: string;
  timeframe?: string;
  marketMode?: string;
  scanStatus?: string;
  lastSignal?: string;
  setupGrade?: string;
  confidence?: number;
  session?: string;
  engineStatus?: string;
  isPaused?: boolean;
  isScanning?: boolean;
  scanPhase?: string;
  scanProgress?: number;
  winRate?: number;
  totalSignals?: number;
  pendingSignals?: number;
  riskLocked?: boolean;
  maxDailyTrades?: number;
  currentDailyTrades?: number;
  consecutiveLosses?: number;
  selectedVector?: string;
  tvConnected?: boolean;
  activeTab?: string;
  selectedBroker?: string;
}

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onMinimize: () => void;
  context: AssistantContext;
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

const SYSTEM_PROMPT = `You are DASOMTMFX, an elite AI trading mentor and intelligent assistant. You are part of the SENTINEL X trading intelligence system.

PERSONALITY: Calm, precise, confident but honest. You're a veteran trader mentor, not a hype bot.
- Never claim guaranteed wins
- Focus on setup quality, timing, risk location, confirmation conditions
- Be practical and chart-relevant
- Adapt to the user's current trading context
- Use Zambia time (UTC+2) when discussing sessions

CAPABILITIES:
- Indicator suggestion (with exact periods/settings and what each confirms)
- Pair/session recommendations
- Setup quality grading (A/B/C)
- Entry timing coaching
- Risk discipline guidance
- Trade review assistance

Keep responses concise (2-4 key points). Use markdown for structure. Be actionable.`;

export const ChatPanel = ({ isOpen, onClose, onMinimize, context, voiceEnabled, onToggleVoice }: ChatPanelProps) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "👋 I'm **DASOMTMFX**, your AI trading guide. I can help with:\n\n- 📊 **Indicator suggestions** with exact settings\n- 🎯 **Entry timing** & setup quality\n- 🌍 **Session-optimized** pair selection\n- ⚡ **Risk discipline** coaching\n\nAsk me anything or use the quick tools below.",
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
    const clean = text.replace(/[*#_`~\[\]()>]/g, "").substring(0, 300);
    const utterance = new SpeechSynthesisUtterance(clean);
    utterance.rate = 0.95;
    utterance.pitch = 0.9;
    window.speechSynthesis.speak(utterance);
  }, [voiceEnabled]);

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
      const contextStr = Object.entries(context)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => `${k}: ${v}`)
        .join(", ");

      const history = messages.slice(-8).map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content
      }));

      const { data, error } = await supabase.functions.invoke("analyze-trend", {
        body: {
          mode: "assistant_chat",
          message: content.trim(),
          context: contextStr,
          history
        }
      });

      const reply = error ? "I'm having trouble connecting. Please try again." : (data?.reply || data?.analysis || "I couldn't process that. Try rephrasing.");

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        timestamp: new Date(),
        type: reply.includes("⚠") || reply.includes("WARNING") ? "warning" : 
              reply.includes("💡") || reply.includes("Suggest") ? "suggestion" : "normal"
      };
      setMessages(prev => [...prev, assistantMsg]);
      speak(reply);
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
  }, [context, messages, isLoading, speak]);

  if (!isOpen) return null;

  return (
    <div className="w-[340px] h-[480px] bg-card/95 backdrop-blur-xl border border-border/50 rounded-xl shadow-2xl flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border/30 bg-card">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-sm font-bold">DASOMTMFX</span>
          <Badge variant="outline" className="text-[10px] h-4">AI Guide</Badge>
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
                    : msg.type === "suggestion"
                      ? "bg-accent/10 border border-accent/20"
                      : "bg-secondary/50 border border-border/30"
              }`}>
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
            placeholder="Ask DASOMTMFX..."
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
