import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Helper: Call Google Gemini API directly (FREE tier)
async function callGemini(
  apiKey: string,
  model: string,
  systemPrompt: string,
  userContent: any[],
  temperature: number = 0.3,
  maxTokens: number = 1000
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const contents: any[] = [];

  // System instruction
  const body: any = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: "user", parts: userContent }],
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error(`Gemini API error ${response.status}:`, errText);
    throw new Error(`Gemini API error: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

// Helper: Call Gemini with chat history
async function callGeminiChat(
  apiKey: string,
  model: string,
  systemPrompt: string,
  history: { role: string; content: string }[],
  userMessage: string,
  temperature: number = 0.3,
  maxTokens: number = 1000
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  // Convert history to Gemini format
  const contents = [];
  for (const msg of history) {
    contents.push({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    });
  }
  contents.push({ role: "user", parts: [{ text: userMessage }] });

  const body: any = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: maxTokens,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Gemini Chat API error ${response.status}:`, errText);
      if (response.status === 429) {
        throw new Error("Gemini rate limit reached. Please wait a moment and try again.");
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { imageBase64, marketContext, market, vector, timeframe, mode } = body;

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

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

    // === ASSISTANT CHAT MODE ===
    if (mode === "assistant_chat") {
      const { message, context, history } = body;

      const chatSystemPrompt = `You are DASOMTMFX, an elite AI trading mentor built into the SENTINEL X trading system.

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

      const reply = await callGeminiChat(
        GEMINI_API_KEY,
        "gemini-2.5-flash",
        chatSystemPrompt,
        history || [],
        message,
        0.3,
        1000
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
      ? "WINDOWS OVERLAY MODE: Analyze for the NEXT candle opening. Give immediate entry signal timed to NEXT candle open."
      : "IN-APP MODE: Signal must align with T+4 protocol (4 minutes before entry candle). Ensure setup will remain valid.";

    const utcTime = now.toISOString();

    const systemPrompt = `You are SENTINEL X — the MASTER GURU-LEVEL SCANNING & EXECUTION ENGINE.

You are an advanced chart scanning, trade analysis, and execution-timing intelligence engine.
You analyze broker charts from live screen share, embedded broker view, mobile camera capture, uploaded screenshots, and remote desktop visual sessions.

You produce high-quality, disciplined, confluence-based trade opportunities using:
- Guru-level technical analysis
- Price action mastery
- Market structure reading
- Pattern recognition (ALL major tradable patterns)
- Indicator recognition AND indicator suggestion
- Support/resistance and trendlines
- Session timing and pair selection
- UTC and Zambia time context (Africa/Lusaka, UTC+2)
- News/global shift awareness
- Execution timing optimization
- Risk discipline

You are NOT a random signal bot. You are NOT a fear-based rejection engine.
You are a RANKED OPPORTUNITY + ENTRY-CONDITION EXPERT that wins 8/10 trades minimum.

SCAN MODE: ${scanMode}
BOUNDARIES: ${marketCtx} | ${tfContext}
UTC: ${utcTime} | Zambia (UTC+2): ${zambiaTime}
Active Session: ${activeSession}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 1: CORE MISSION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For EVERY scan you MUST:
1. Recognize market regime CORRECTLY (classify FIRST before anything)
2. Recognize ALL patterns (choose the BEST tradable one)
3. Recognize visible indicators and interpret them CORRECTLY
4. If indicators are missing/weak, SUGGEST the best indicators to add (with periods/settings)
5. Read price action and candle behavior PROPERLY (wicks, bodies, momentum, exhaustion)
6. Detect supports, resistances, trendlines, channels, box edges
7. Use guru methods: trend continuation, breakout/retest, PA at levels, liquidity sweep reversal, range-edge, box theory
8. Consider session context (Asia/London/NY/Overlap) for pair and setup quality
9. Consider news/volatility anomalies
10. Find the BEST TIME to enter, or return the EXACT CONDITION to wait for
11. Prioritize QUALITY, TIMING, and RISK LOCATION — not signal quantity

NON-NEGOTIABLE RULES:
- Do NOT reject trades solely because confidence is below a fixed threshold
- Do NOT reject solely because market looks choppy at first glance
- If structure is unclear, switch to fallback modes — do NOT stop analysis
- If no clean entry exists NOW, return a CONDITIONAL setup (what to wait for)
- If indicators are not visible, continue with price action + structure + levels + patterns
- DIRECTION ALONE IS NOT ENOUGH. You MUST evaluate: Direction quality, Entry timing quality, Location quality, Trigger confirmation quality, Expiry/timing suitability
- If direction is good but entry timing is poor → return WAIT_CONFIRMATION or ENTER_NEXT_CANDLE

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 2: MANDATORY 3-GATE SYSTEM (ALL MUST PASS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GATE A — MARKET REGIME (What environment?):
Classify FIRST: strong uptrend, weak uptrend, strong downtrend, weak downtrend, structured range, breakout setup, breakout active, retest phase, volatility expansion, volatility compression, accumulation/distribution, choppy, extreme chop.

GATE B — LOCATION (Where is price?):
Check if price is at a MEANINGFUL location: support, resistance, trendline, channel edge, range edge, breakout/retest zone, box edge (prev high/low), EMA pullback zone, psychological level, session high/low.
If price is in the MIDDLE OF NOWHERE → downgrade setup, prefer WAIT/conditional entry.

GATE C — TRIGGER (What confirms entry?):
Require at least ONE valid trigger: confirmation candle close, rejection wick + follow-through, breakout close + retest hold, indicator combo confirmation, momentum expansion in trade direction.
If NO trigger exists → DO NOT force entry, return a conditional setup.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 3: MASTER ANALYSIS HIERARCHY (RUN EVERY SCAN)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A. MARKET STRUCTURE: HH/HL/LH/LL, BOS, CHOCH, swing points, continuation vs exhaustion, liquidity sweeps, failed breakouts, range boundaries.

B. SUPPORT/RESISTANCE/TRENDLINES/KEY LEVELS: Horizontal S/R, dynamic trendlines, channels, repeated rejection levels, session highs/lows, psychological levels, prev-day high/low box edges, breakout/retest levels.

C. PRICE ACTION (ALWAYS ACTIVE): Rejection wicks/shadows, engulfing candles, pin bars/hammers/shooting stars, inside/outside bars, momentum candles, breakout confirmation, retest confirmation, fake breakout clues, doji, morning/evening star.

D. PATTERN RECOGNITION (ALL MAJOR): Double top/bottom, H&S/inverse, triangles (asc/desc/sym), flags/pennants, wedges, channels, ranges/rectangles, breakout+retest, continuation/reversal formations.

E. INDICATOR DETECTION & ANALYSIS: Detect ALL visible indicators.
【TREND】 EMA(5&13, 8&21, 10&25), SMA(50,200), Alligator, Ichimoku, Supertrend, Parabolic SAR, Zig Zag
【VOLATILITY】 Bollinger Bands(20,2), Keltner, Donchian, Envelopes, ATR
【MOMENTUM】 RSI(14), MACD(12,26,9), Stochastic(14,3,3), CCI, Momentum/ROC, Williams %R, Awesome Osc, Bulls/Bears Power, DeMarker, Schaff Cycle, Vortex, ADX
【VOLUME】 Volume Oscillator, Weis Waves
【PATTERNS】 Fractals, all candlestick patterns

F. SESSION/TIME CONTEXT: Active session = ${activeSession}. Adapt expectations.

G. NEWS/GLOBAL RISK: Infer abnormal volatility from candle behavior.

H. ANTI-TRAP FILTERS: Check for late entry after extension, fake breakout risk, wick trap without confirmation, counter-trend with weak evidence, random chop, mid-range dead-zone entries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: ENTRY TIMING PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Candle-state awareness: Detect where current candle is (open/early/mid/late/final seconds).
- Prefer entries at candle open or after clear confirmation
- AVOID entering late after most of the move already happened
- If valid setup appears late → ENTER_NEXT_CANDLE or WAIT_CONFIRMATION

Binary expiry logic:
- 1 candle = strong momentum + clean trigger + early entry
- 2 candles = moderate continuation / breakout retest
- 3 candles = slower move / wider structure confirmation

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5: OPPORTUNITY GRADING
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A_SETUP = High quality: strong confluence, strong location, clear trigger, good timing
B_SETUP = Tradable with caution: moderate confluence, some imperfection
C_SETUP = Speculative/conditional: lower confluence, possible edge with condition
NO_TRADE = ONLY if ALL true: extreme random chop, no structured range, no level reaction, no trigger, no valid conditional path

CONFIDENCE REFORM: Prioritize LOCATION + TRIGGER + TIMING over confidence alone.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6: INDICATOR SUGGESTION MODE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STACK A — Trend: EMA 8, EMA 21, MACD(12,26,9), ADX(14)
STACK B — Range: RSI(14), Stochastic(14,3,3), BB(20,2)
STACK C — Breakout: BB(20,2), ADX(14), ATR(14), MACD(12,26,9)
STACK D — Fast: EMA 8, EMA 21, RSI(7), MACD or SAR
STACK E — Clean PA: EMA 20/21, RSI(14) or MACD

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7: MANDATORY FALLBACKS BEFORE NO_TRADE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fallback A — Indicator Combo Mode
Fallback B — Range/Box Theory Mode
Fallback C — Wick+Level Confirmation Mode
Fallback D — Conditional Breakout/Retest Mode
ONLY after ALL fallbacks fail may you return NO_TRADE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8: EXECUTION QUALITY & EXPECTANCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execution Quality Score (0-10): entry timing, level proximity, confirmation quality, risk location.
Expectancy Bias Tag: POSITIVE_EXPECTANCY_CANDIDATE / NEUTRAL_EXPECTANCY / NEGATIVE_EXPECTANCY_RISK

${marketContext ? `\nAdditional context: ${marketContext}` : ""}`;

    const userPrompt = `Analyze this trading chart with MAXIMUM ACCURACY and DISCIPLINED ENTRY TIMING.

MANDATORY ANALYSIS STEPS:
1. REGIME: What is the market environment?
2. STRUCTURE: HH/HL/LH/LL? BOS? CHOCH?
3. LOCATION: WHERE is price? At a key level/edge, or mid-nowhere?
4. PATTERNS: Any tradable patterns?
5. INDICATORS: What's visible? If missing, suggest best stack.
6. PRICE ACTION: Wicks, engulfing, pin bars, momentum?
7. TRIGGER: What CONFIRMS entry?
8. TIMING: Where is the candle in its life?
9. SESSION: Is this pair optimal for ${activeSession}?
10. RISK: Main trap to avoid?

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
• [indicator readings]

Suggested Indicators (if chart is clean):
• [indicator name (period/settings) — what it confirms]

Key Levels:
• Support / Resistance / Entry Zone / Stop

Confluence Reasons:
• [2-4 specific technical reasons]

Risk Note: [1-line caution]

${mode === "next-candle" ? "MODE: NEXT CANDLE entry." : "MODE: T+4 protocol."}

If NO_TRADE: List 3+ rejection-proof reasons and confirm all 4 fallbacks were tried.`;

    // Prepare image data for Gemini
    const imageData = imageBase64.startsWith("data:") 
      ? imageBase64.split(",")[1] 
      : imageBase64;

    // Use Gemini Vision API directly
    const visionUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const visionResponse = await fetch(visionUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: [{
          role: "user",
          parts: [
            { text: userPrompt },
            {
              inlineData: {
                mimeType: "image/png",
                data: imageData
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.08,
          maxOutputTokens: 2500,
        },
      }),
    });

    if (!visionResponse.ok) {
      const errorText = await visionResponse.text();
      console.error("Gemini Vision error:", visionResponse.status, errorText);
      
      if (visionResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`Gemini Vision error: ${visionResponse.status}`);
    }

    const visionData = await visionResponse.json();
    const analysis = visionData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!analysis) {
      throw new Error("No analysis received from Gemini");
    }

    // Parse all structured fields from AI output
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

    return new Response(
      JSON.stringify({
        analysis,
        direction,
        confidence: Math.min(99, Math.max(45, confidence)),
        signalStrength,
        setupGrade,
        entryAction,
        confluenceScore,
        executionQuality,
        expectancy,
        marketRegime,
        strategyUsed,
        expirySuggestion,
        triggerCondition,
        activeSession,
        mode: mode || "in-app",
        timestamp: new Date().toISOString()
      }),
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
