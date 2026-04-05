import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ============================================================
// PROVIDER ABSTRACTION: Gemini, OpenAI, Grok (xAI)
// Fallback order: Gemini1 → Gemini2 → OpenAI → Grok
// ============================================================

interface Provider {
  name: string;
  callChat: (systemPrompt: string, history: { role: string; content: string }[], userMessage: string, temperature: number, maxTokens: number) => Promise<string>;
  callVision: (systemPrompt: string, userPrompt: string, imageBase64: string, temperature: number, maxTokens: number) => Promise<string>;
}

function makeGeminiProvider(apiKey: string, label: string): Provider {
  const model = "gemini-2.5-flash";
  return {
    name: label,
    async callChat(systemPrompt, history, userMessage, temperature, maxTokens) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const contents = history.map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      contents.push({ role: "user", parts: [{ text: userMessage }] });

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents,
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`${label} chat error ${res.status}:`, t);
        throw new Error(`${label} ${res.status}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    },
    async callVision(systemPrompt, userPrompt, imageBase64, temperature, maxTokens) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const imageData = imageBase64.startsWith("data:") ? imageBase64.split(",")[1] : imageBase64;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [
            { text: userPrompt },
            { inlineData: { mimeType: "image/png", data: imageData } },
          ]}],
          generationConfig: { temperature, maxOutputTokens: maxTokens },
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`${label} vision error ${res.status}:`, t);
        throw new Error(`${label} ${res.status}`);
      }
      const data = await res.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    },
  };
}

function makeOpenAIProvider(apiKey: string): Provider {
  return {
    name: "OpenAI",
    async callChat(systemPrompt, history, userMessage, temperature, maxTokens) {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ];
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "gpt-4o", messages, temperature, max_tokens: maxTokens }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`OpenAI chat error ${res.status}:`, t);
        throw new Error(`OpenAI ${res.status}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    },
    async callVision(systemPrompt, userPrompt, imageBase64, temperature, maxTokens) {
      const imgUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imgUrl } },
            ]},
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`OpenAI vision error ${res.status}:`, t);
        throw new Error(`OpenAI ${res.status}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    },
  };
}

function makeGrokProvider(apiKey: string): Provider {
  return {
    name: "Grok",
    async callChat(systemPrompt, history, userMessage, temperature, maxTokens) {
      const messages = [
        { role: "system", content: systemPrompt },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: userMessage },
      ];
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "grok-2-vision-1212", messages, temperature, max_tokens: maxTokens }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`Grok chat error ${res.status}:`, t);
        throw new Error(`Grok ${res.status}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    },
    async callVision(systemPrompt, userPrompt, imageBase64, temperature, maxTokens) {
      const imgUrl = imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`;
      const res = await fetch("https://api.x.ai/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: "grok-2-vision-1212",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: [
              { type: "text", text: userPrompt },
              { type: "image_url", image_url: { url: imgUrl } },
            ]},
          ],
          temperature,
          max_tokens: maxTokens,
        }),
      });
      if (!res.ok) {
        const t = await res.text();
        console.error(`Grok vision error ${res.status}:`, t);
        throw new Error(`Grok ${res.status}`);
      }
      const data = await res.json();
      return data.choices?.[0]?.message?.content || "";
    },
  };
}

// Build provider chain from available keys
function getProviders(): Provider[] {
  const providers: Provider[] = [];
  const g1 = Deno.env.get("GEMINI_API_KEY");
  if (g1) providers.push(makeGeminiProvider(g1, "Gemini-1"));
  const g2 = Deno.env.get("GEMINI_API_KEY_2");
  if (g2) providers.push(makeGeminiProvider(g2, "Gemini-2"));
  const oai = Deno.env.get("OPENAI_API_KEY");
  if (oai) providers.push(makeOpenAIProvider(oai));
  const grok = Deno.env.get("GROK_API_KEY");
  if (grok) providers.push(makeGrokProvider(grok));
  return providers;
}

// Try each provider in order; skip on 429/5xx
async function fallbackCall<T>(providers: Provider[], fn: (p: Provider) => Promise<T>): Promise<T> {
  if (providers.length === 0) throw new Error("No AI API keys configured");
  let lastError: Error | null = null;
  for (const p of providers) {
    try {
      console.log(`Trying provider: ${p.name}`);
      const result = await fn(p);
      console.log(`Success with: ${p.name}`);
      return result;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      console.warn(`${p.name} failed: ${lastError.message}, trying next...`);
    }
  }
  throw lastError || new Error("All AI providers failed");
}

// ============================================================
// SESSION & TIME HELPERS
// ============================================================

function getSessionInfo() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  let activeSession = "Off-Hours";
  if (utcHour >= 0 && utcHour < 8) activeSession = "Asia/Tokyo";
  if (utcHour >= 7 && utcHour < 9) activeSession = "London Open";
  if (utcHour >= 8 && utcHour < 12) activeSession = "London";
  if (utcHour >= 12 && utcHour < 13) activeSession = "London/NY Overlap";
  if (utcHour >= 13 && utcHour < 17) activeSession = "New York";
  if (utcHour >= 17 && utcHour < 21) activeSession = "New York (late)";
  if (utcHour >= 21 || utcHour < 0) activeSession = "Sydney/Early Asia";
  const zambiaTime = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19);
  return { now, activeSession, zambiaTime, utcTime: now.toISOString() };
}

// ============================================================
// PROMPTS
// ============================================================

function buildChatSystemPrompt(zambiaTime: string, activeSession: string, context?: string) {
  return `You are DASOMTMFX, an elite AI trading mentor built into the SENTINEL X trading system.

PERSONALITY: Calm, precise, confident, honest. Veteran trader mentor, not a hype bot.
- Never claim guaranteed wins. Focus on setup quality, timing, risk, confirmation conditions.
- Be practical, chart-relevant, and actionable.
- Use Zambia time (UTC+2) for session references. Current: ${zambiaTime} ZMT, Session: ${activeSession}

USER CONTEXT: ${context || "No specific context"}

CAPABILITIES:
- Indicator suggestion with exact periods/settings and what each confirms
- 5 indicator stacks: A (Trend), B (Range/Reversal), C (Breakout), D (Fast Momentum), E (Clean PA)
- Pair/session recommendations for Binary/OTC and Forex
- Setup quality grading (A_SETUP/B_SETUP/C_SETUP)
- Entry timing coaching (candle-state awareness, anti-late-entry)
- Risk discipline: overtrade protection, loss streak coaching
- Session-aware analysis (Asia/London/NY/Overlap)

RESPONSE RULES:
- Keep answers concise: 2-4 key points max unless user asks for detail
- Use markdown formatting
- Be specific (exact indicator settings, exact conditions)
- Always mention the relevant session and time context
- If asked about indicators, give the FULL stack with periods AND what each confirms
- If asked about pairs, suggest 3-5 pairs with reason for each`;
}

function buildVisionSystemPrompt(scanMode: string, marketCtx: string, tfContext: string, utcTime: string, zambiaTime: string, activeSession: string, marketContext?: string) {
  return `You are SENTINEL X — the MASTER GURU-LEVEL SCANNING & EXECUTION ENGINE.

You analyze broker charts and produce high-quality, disciplined, confluence-based trade opportunities.

SCAN MODE: ${scanMode}
BOUNDARIES: ${marketCtx} | ${tfContext}
UTC: ${utcTime} | Zambia (UTC+2): ${zambiaTime}
Active Session: ${activeSession}

━━━ SECTION 1: CORE MISSION ━━━
For EVERY scan: Recognize market regime, ALL patterns, visible indicators, price action, S/R/trendlines, use guru methods, consider session context, find BEST entry time.

NON-NEGOTIABLE: Do NOT reject trades solely because confidence is below a threshold. If no clean entry exists NOW, return a CONDITIONAL setup.

━━━ SECTION 2: 3-GATE SYSTEM (ALL MUST PASS) ━━━
GATE A — MARKET REGIME: Classify FIRST (strong/weak trend, range, breakout, chop, etc.)
GATE B — LOCATION: Is price at a MEANINGFUL level? Mid-nowhere → downgrade.
GATE C — TRIGGER: At least ONE valid trigger required.

━━━ SECTION 3: MASTER ANALYSIS HIERARCHY ━━━
A. Market Structure (HH/HL/LH/LL, BOS, CHOCH)
B. S/R/Trendlines/Key Levels
C. Price Action (wicks, engulfing, pin bars, momentum)
D. Pattern Recognition (all major patterns)
E. Indicator Detection & Analysis (all categories)
F. Session/Time Context: ${activeSession}
G. News/Global Risk inference
H. Anti-Trap Filters

━━━ SECTION 4: ENTRY TIMING ━━━
Candle-state awareness. Prefer entries at candle open or after clear confirmation. Binary expiry: 1/2/3 candles.

━━━ SECTION 5: GRADING ━━━
A_SETUP = High quality | B_SETUP = Tradable with caution | C_SETUP = Speculative/conditional
NO_TRADE = ONLY if ALL fallbacks fail.

━━━ SECTION 6: INDICATOR STACKS ━━━
STACK A (Trend): EMA 8, EMA 21, MACD(12,26,9), ADX(14)
STACK B (Range): RSI(14), Stochastic(14,3,3), BB(20,2)
STACK C (Breakout): BB(20,2), ADX(14), ATR(14), MACD
STACK D (Fast): EMA 8, EMA 21, RSI(7), MACD or SAR
STACK E (Clean PA): EMA 20/21, RSI(14) or MACD

━━━ SECTION 7: FALLBACKS BEFORE NO_TRADE ━━━
A: Indicator Combo | B: Range/Box Theory | C: Wick+Level | D: Conditional Breakout/Retest

${marketContext ? `\nAdditional context: ${marketContext}` : ""}`;
}

function buildVisionUserPrompt(activeSession: string, mode?: string) {
  return `Analyze this trading chart with MAXIMUM ACCURACY and DISCIPLINED ENTRY TIMING.
You MUST pick the BEST possible outcome. If the current timeframe is not ideal, SUGGEST a better one.

MANDATORY ANALYSIS STEPS:
1. REGIME 2. STRUCTURE 3. LOCATION 4. PATTERNS 5. INDICATORS 6. PRICE ACTION 7. TRIGGER 8. TIMING 9. SESSION (${activeSession}) 10. RISK

OUTPUT FORMAT:
SIGNAL: BUY / SELL / NO_TRADE
ENTRY_ACTION: ENTER_NOW / ENTER_NEXT_CANDLE / ENTER_ON_BREAK_ABOVE / ENTER_ON_BREAK_BELOW / ENTER_ON_RETEST / WAIT_CONFIRMATION / NO_TRADE
SETUP_GRADE: A_SETUP / B_SETUP / C_SETUP / NO_TRADE
CONFIDENCE: XX%
CONFLUENCE_SCORE: X/10
EXECUTION_QUALITY: X/10
EXPECTANCY: POSITIVE_EXPECTANCY_CANDIDATE / NEUTRAL_EXPECTANCY / NEGATIVE_EXPECTANCY_RISK
MARKET_REGIME: [specific regime]
ACTIVE_SESSION: ${activeSession}
EXPIRY_SUGGESTION: [1/2/3 candles + why]

Trigger Condition: [exact condition]
Strategy Used: [method name]
Market Structure: [HH/HL/LH/LL status]
Pattern Detected: [best tradable pattern]

Indicators Status:
• [indicator readings if visible on chart]

━━━ INDICATOR OPTIMIZATION (MANDATORY) ━━━
ALWAYS include this section. Analyze whether the chart's current indicators are OPTIMAL for the detected regime.

CURRENT_INDICATORS_VIABLE: YES / NO / PARTIAL
BEST_INDICATOR_STACK: [A/B/C/D/E from stacks below]

If indicators are missing, wrong for regime, or suboptimal:
SUGGESTED_INDICATORS:
• [Indicator Name] (Period: [X]) — [What it confirms for THIS specific setup]
• [Indicator Name] (Period: [X]) — [What it confirms]
• [Indicator Name] (Period: [X]) — [What it confirms]

INDICATOR STACKS REFERENCE:
A (Trend): EMA(8) + EMA(21) + MACD(12,26,9) + ADX(14) → Best for trending markets
B (Range/Reversal): RSI(14) + Stochastic(14,3,3) + BB(20,2) → Best for ranging/reversal
C (Breakout): BB(20,2) + ADX(14) + ATR(14) + MACD → Best for breakout detection
D (Fast/Binary): EMA(8) + EMA(21) + RSI(7) + SAR(0.02,0.2) → Best for OTC/binary 1-5min
E (Clean PA): EMA(21) + RSI(14) → Minimal, for strong price-action-dominant charts

For Binary Options: Always suggest Stack D or B with 1-3 candle expiry reasoning.
For Real Markets: Match stack to detected regime (Trend→A, Range→B, Breakout→C).

OPTIMAL_TIMEFRAME: [current TF] or [better TF if current is suboptimal]
TIMEFRAME_REASON: [why this TF is best or why to switch]

Key Levels:
• Support / Resistance / Entry Zone / Stop

Confluence Reasons:
• [2-4 specific technical reasons]

Risk Note: [1-line caution]

${mode === "next-candle" ? "MODE: NEXT CANDLE entry." : "MODE: T+4 protocol."}

If NO_TRADE: List 3+ rejection-proof reasons and confirm all 4 fallbacks were tried.`;
}`

// ============================================================
// RESPONSE PARSER
// ============================================================

function parseAnalysis(analysis: string, activeSession: string, mode?: string) {
  let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
  if (/SIGNAL:\s*BUY/i.test(analysis)) direction = "BUY";
  else if (/SIGNAL:\s*SELL/i.test(analysis)) direction = "SELL";

  let entryAction = "NO_TRADE";
  const entryMatch = analysis.match(/ENTRY_ACTION:\s*([\w_]+(?:\[.*?\])?)/i);
  if (entryMatch) entryAction = entryMatch[1].trim();
  else if (direction !== "NEUTRAL") entryAction = "ENTER_NOW";

  let setupGrade = "NO_TRADE";
  const gradeMatch = analysis.match(/SETUP_GRADE:\s*(A_SETUP|B_SETUP|C_SETUP|NO_TRADE)/i);
  if (gradeMatch) setupGrade = gradeMatch[1].toUpperCase();

  const confMatch = analysis.match(/CONFIDENCE:\s*(\d{1,3}(?:\.\d)?)%/i);
  const confidence = confMatch ? parseFloat(confMatch[1]) : 65;

  const conflMatch = analysis.match(/CONFLUENCE_SCORE:\s*(\d+(?:\.\d)?)\s*\/\s*10/i);
  const confluenceScore = conflMatch ? parseFloat(conflMatch[1]) : 5;

  const execMatch = analysis.match(/EXECUTION_QUALITY:\s*(\d+(?:\.\d)?)\s*\/\s*10/i);
  const executionQuality = execMatch ? parseFloat(execMatch[1]) : 5;

  const regimeMatch = analysis.match(/MARKET_REGIME:\s*(.+?)(?:\n|$)/i);
  const marketRegime = regimeMatch ? regimeMatch[1].trim() : "UNKNOWN";

  const stratMatch = analysis.match(/Strategy\s*Used:\s*(.+?)(?:\n|$)/i);
  const strategyUsed = stratMatch ? stratMatch[1].trim() : "Multi-confluence";

  const expiryMatch = analysis.match(/EXPIRY_SUGGESTION:\s*(.+?)(?:\n|$)/i);
  const expirySuggestion = expiryMatch ? expiryMatch[1].trim() : "";

  const triggerMatch = analysis.match(/Trigger\s*Condition:\s*(.+?)(?:\n\n|\nStrategy|$)/is);
  const triggerCondition = triggerMatch ? triggerMatch[1].trim() : "";

  const expectancyMatch = analysis.match(/EXPECTANCY:\s*([\w_]+)/i);
  const expectancy = expectancyMatch ? expectancyMatch[1].trim() : "NEUTRAL_EXPECTANCY";

  // Parse indicator optimization fields
  const indicatorsViableMatch = analysis.match(/CURRENT_INDICATORS_VIABLE:\s*(YES|NO|PARTIAL)/i);
  const indicatorsViable = indicatorsViableMatch ? indicatorsViableMatch[1].toUpperCase() : null;

  const bestStackMatch = analysis.match(/BEST_INDICATOR_STACK:\s*([A-E])/i);
  const bestIndicatorStack = bestStackMatch ? bestStackMatch[1].toUpperCase() : null;

  // Extract suggested indicators
  const suggestedIndicators: string[] = [];
  const suggestedSection = analysis.match(/SUGGESTED_INDICATORS:\s*([\s\S]*?)(?:\n\n|INDICATOR STACKS|OPTIMAL_TIMEFRAME|Key Levels|$)/i);
  if (suggestedSection) {
    const lines = suggestedSection[1].split("\n").filter(l => l.trim().startsWith("•") || l.trim().startsWith("-"));
    lines.forEach(l => suggestedIndicators.push(l.replace(/^[•\-]\s*/, "").trim()));
  }

  const optimalTfMatch = analysis.match(/OPTIMAL_TIMEFRAME:\s*(.+?)(?:\n|$)/i);
  const optimalTimeframe = optimalTfMatch ? optimalTfMatch[1].trim() : null;

  const tfReasonMatch = analysis.match(/TIMEFRAME_REASON:\s*(.+?)(?:\n|$)/i);
  const timeframeReason = tfReasonMatch ? tfReasonMatch[1].trim() : null;

  let signalStrength: "high" | "medium" | "low" | "wait" | "conditional" = "wait";
  if (direction === "NEUTRAL" || setupGrade === "NO_TRADE") {
    signalStrength = "wait";
  } else if (entryAction.includes("WAIT") || entryAction.includes("RETEST") || entryAction.includes("BREAK")) {
    signalStrength = "conditional";
  } else if (setupGrade === "A_SETUP" && confidence >= 80 && executionQuality >= 7) {
    signalStrength = "high";
  } else if ((setupGrade === "A_SETUP" || setupGrade === "B_SETUP") && confidence >= 70) {
    signalStrength = "medium";
  } else {
    signalStrength = "low";
  }

  return {
    analysis, direction, confidence: Math.min(99, Math.max(45, confidence)),
    signalStrength, setupGrade, entryAction, confluenceScore, executionQuality,
    expectancy, marketRegime, strategyUsed, expirySuggestion, triggerCondition,
    activeSession, mode: mode || "in-app", timestamp: new Date().toISOString(),
    // New indicator optimization fields
    indicatorsViable, bestIndicatorStack, suggestedIndicators,
    optimalTimeframe, timeframeReason,
  };
}

// ============================================================
// MAIN HANDLER
// ============================================================

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageBase64, marketContext, market, vector, timeframe, mode } = body;
    const providers = getProviders();
    const { activeSession, zambiaTime, utcTime } = getSessionInfo();

    // === ASSISTANT CHAT MODE ===
    if (mode === "assistant_chat") {
      const { message, context, history } = body;
      const chatSystemPrompt = buildChatSystemPrompt(zambiaTime, activeSession, context);

      const reply = await fallbackCall(providers, (p) =>
        p.callChat(chatSystemPrompt, history || [], message, 0.3, 1000)
      );

      return new Response(
        JSON.stringify({ reply }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // === CHART ANALYSIS MODE ===
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tfContext = timeframe ? `User-selected timeframe: ${timeframe}` : "Detect timeframe from chart";
    const marketCtx = market ? `Market: ${market} | Vector: ${vector || "Hybrid"}` : "General market";
    const scanMode = mode === "next-candle"
      ? "WINDOWS OVERLAY MODE: Analyze for the NEXT candle opening."
      : "IN-APP MODE: Signal must align with T+4 protocol.";

    const systemPrompt = buildVisionSystemPrompt(scanMode, marketCtx, tfContext, utcTime, zambiaTime, activeSession, marketContext);
    const userPrompt = buildVisionUserPrompt(activeSession, mode);

    const analysis = await fallbackCall(providers, (p) =>
      p.callVision(systemPrompt, userPrompt, imageBase64, 0.08, 2500)
    );

    if (!analysis) throw new Error("No analysis received from any AI provider");

    const result = parseAnalysis(analysis, activeSession, mode);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Analysis error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Analysis failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
