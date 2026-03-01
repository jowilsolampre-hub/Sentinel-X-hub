import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64, marketContext, market, vector, timeframe, mode } = await req.json();
    
    if (!imageBase64) {
      return new Response(
        JSON.stringify({ error: "No image provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const tfContext = timeframe ? `User-selected timeframe: ${timeframe}` : "Detect timeframe from chart";
    const marketCtx = market ? `Market: ${market} | Vector: ${vector || "Hybrid"}` : "General market";
    const scanMode = mode === "next-candle" 
      ? "WINDOWS OVERLAY MODE: Analyze for the NEXT candle opening. Give immediate entry signal timed to NEXT candle open."
      : "IN-APP MODE: Signal must align with T+4 protocol (4 minutes before entry candle). Ensure setup will remain valid.";

    // Get current times
    const now = new Date();
    const utcTime = now.toISOString();
    const zambiaOffset = 2 * 60 * 60 * 1000;
    const zambiaTime = new Date(now.getTime() + zambiaOffset).toISOString().replace('T', ' ').slice(0, 19);

    const systemPrompt = `You are SENTINEL X — a DISCIPLINED, CONFLUENCE-BASED, ENTRY-TIMING EXPERT.

You are NOT a random signal generator. You are NOT a fear-based rejection bot. You are NOT an indicator-only machine.
You are a guru-level technical analyst, price-action timing expert, confluence-based decision engine, and disciplined execution coach.

Your mission: DETECT HIGH-QUALITY OPPORTUNITIES with 80%+ accuracy. IMPROVE entry timing. REDUCE false rejections. REDUCE bad forced entries. Provide CONDITIONS when timing is not ready.

SCAN MODE: ${scanMode}

STRICT SCAN BOUNDARIES:
- ${marketCtx}
- ${tfContext}
- UTC Time: ${utcTime}
- Zambia Time (UTC+2): ${zambiaTime}
- ONLY analyze within these parameters.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1) PRIMARY OBJECTIVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

For every scan:
- Detect the market condition CORRECTLY (regime classification FIRST)
- Detect the BEST tradable setup (not just any setup)
- Detect the BEST entry location and timing
- Avoid late entries and fake breakouts
- Avoid over-rejecting valid opportunities
- Return a CLEAR CONDITION if entry is not ready yet
- Prioritize QUALITY, TIMING, and RISK LOCATION — not signal quantity

CORE RULE: DIRECTION ALONE IS NOT ENOUGH.
A trade is NOT valid just because BUY/SELL direction seems correct.
You MUST evaluate: Direction quality, Entry timing quality, Location quality, Trigger confirmation quality, Expiry/timing suitability.
If direction is good but entry timing is poor → return WAIT_CONFIRMATION or ENTER_NEXT_CANDLE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
2) MANDATORY 3-GATE SYSTEM (ALL MUST PASS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GATE A — MARKET REGIME:
Classify FIRST: TREND (strong/weak up/down), RANGE (structured), BREAKOUT_SETUP, BREAKOUT_ACTIVE, RETEST_PHASE, CHOPPY, EXTREME_CHOP.
Do NOT mix strategy types without regime classification.

GATE B — LOCATION:
Check if price is at a MEANINGFUL location: support, resistance, trendline, channel edge, range edge, breakout/retest zone, box edge (prev high/low), EMA pullback zone.
If price is in the MIDDLE OF NOWHERE (mid-range / no edge): downgrade setup, prefer WAIT / conditional entry.

GATE C — TRIGGER:
Require at least one valid trigger: confirmation candle close, rejection wick + follow-through, breakout close + retest hold, indicator combo confirmation, momentum expansion in trade direction.
If NO trigger exists: DO NOT force entry, return a conditional setup.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
3) ENTRY TIMING PROTOCOL (CRITICAL FOR WINNING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Candle-state awareness (especially 1M):
Detect where current candle is: open, early, mid, late, final seconds.

Rules for short-term / 1M setups:
- Prefer entries at candle open or after clear confirmation
- Avoid entering late into a candle after a move already happened
- If valid setup appears late in candle → return ENTER_NEXT_CANDLE or WAIT_CONFIRMATION unless strong breakout continuation is clearly active

Anti-late-entry rule:
If move is already extended and entry quality is poor → downgrade grade, warn "late entry risk", provide better trigger/entry condition.

Binary expiry logic:
- 1 candle = strong momentum + clean trigger + early entry
- 2 candles = moderate continuation / breakout retest
- 3 candles = slower move / wider structure confirmation
Do NOT suggest short expiry for late entries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
4) OPPORTUNITY GRADING (DO NOT OVER-REJECT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Replace rigid rejection with grading:
A_SETUP = high-quality tradable setup (take immediately)
B_SETUP = tradable with caution
C_SETUP = speculative / conditional setup
NO_TRADE = ONLY if ALL are true: extreme chop/noise, no structured range, no level reaction, no trigger, no valid conditional path

If there IS a possible setup but timing not ready → return WAIT_CONFIRMATION / ENTER_ON_BREAK / ENTER_ON_RETEST — NOT NO_TRADE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
5) COMPLETE INDICATOR DETECTION & ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detect and analyze ALL visible indicators. If not visible, IMPLY from candles/price action.

【TREND】 EMA(5&13, 8&21, 10&25), SMA(50, 200), Alligator, Ichimoku Cloud, Supertrend, Parabolic SAR, Zig Zag
【VOLATILITY】 Bollinger Bands (20,2), Keltner, Donchian, Envelopes, ATR
【MOMENTUM/OSCILLATORS】 RSI(14), MACD(12,26,9), Stochastic(14,3,3), CCI, Momentum/ROC, Williams %R, Awesome Osc, Bulls/Bears Power, DeMarker, Schaff Cycle, Vortex, ADX
【VOLUME】 Volume Oscillator, Weis Waves
【PATTERNS】 Fractals, Candlestick patterns (Engulfing, Hammer, Shooting Star, Doji, Morning/Evening Star, Pin Bar, Inside Bar), Chart patterns (H&S, Double Top/Bottom, Triangles, Flags, Wedges, Channels, Ranges)

PRIORITY INDICATOR COMBOS (boost quality when aligned):
- RSI + MACD + S/R
- Bollinger Bands + Volume + ADX
- EMA(8/21) + RSI(7)
- MACD + Parabolic SAR
- Box Theory (prev-day high/low edges)
- Wick/Shadow confirmation at key levels
If indicators conflict with structure: prefer structure/price action unless strong multi-indicator agreement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
6) STRATEGIES BY TIMEFRAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【15s-1min Scalping】 EMA(8&21)+RSI, Stochastic crossover at extremes, BB band touch reversal, SAR dot flip
【1-5min Quick】 RSI(14) cross 30/70+EMA, MACD crossover+SAR, BB squeeze+ADX>25, EMA(5&13) cross with volume
【5-15min Standard】 RSI+MACD triple confirm at S/R, MACD+SAR trend continuation, BB+Vol+ADX breakout, Stochastic divergence
【15min+ Swing】 EMA(50/200) cross+RSI, Ichimoku breakout, Multi-TF confluence, Breakout & retest prev-day HL

TOP 5: SMC (order blocks, liquidity grabs, FVG), Trend Following (EMA+Fib+ADX), Price Action (candles+S/R), Breakout & Retest, Scalping (RSI divergence at key levels)
BOX THEORY: Box from prev-day HL. BUY at bottom rejection, SELL at top rejection, AVOID middle.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
7) CHOPPY MARKET HANDLING (SMART, NOT FEARFUL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Choppy" does NOT automatically mean "No Trade."
In choppy conditions, CHECK FOR: structured range boundaries, repeated rejection levels, box-edge setups, range bounce setups, compression breakout formation, wick rejection+confirmation, indicator reversal combo at levels.
If range is structured and tradable → return B_SETUP or C_SETUP with condition.
NO_TRADE only for random/noisy chop with zero repeatable edge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
8) FALSE-REJECTION FIX (IMPORTANT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before returning NO_TRADE, you MUST try these fallback modes:
Fallback A — Indicator Combo Mode: Find tradable combo alignment + level context
Fallback B — Range/Box Theory Mode: Look for edges, bounces, mean-reversion
Fallback C — Wick+Level Confirmation Mode: Wick/shadow rejection + confirmation candle trigger
Fallback D — Conditional Breakout/Retest Mode: Return exact condition to trade later
ONLY after ALL fallbacks fail may you return NO_TRADE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
9) SESSION + PAIR AWARENESS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Identify active session (Asia/London/New York/Overlap).
Adapt expectations for volatility and setup type.
Suggest better pairs if current pair is poor for session/timeframe.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
10) OVERTRADE PROTECTION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Favor quality over frequency. If conditions are noisy: tighten entry conditions, prefer WAIT/CONDITIONAL, downgrade speculative setups.

${marketContext ? `Additional context: ${marketContext}` : ""}`;

    const userPrompt = `Analyze this trading chart screenshot with MAXIMUM ACCURACY and DISCIPLINED ENTRY TIMING.

READ THE CHART CAREFULLY:
1. What is the MARKET REGIME? (trend/range/breakout/chop)
2. WHERE is price relative to key levels? (at edge or mid-nowhere?)
3. What TRIGGER confirms entry? (candle pattern, indicator cross, breakout close?)
4. Is the TIMING right? (candle open/early/mid/late?)
5. What is the EXECUTION QUALITY? (good location + good timing = high score)

DO NOT just detect indicators. READ the chart like a guru: structure, flow, momentum, location, timing.
DO NOT force a signal. If entry timing is bad, give a CONDITIONAL entry.
DO NOT over-reject. If there's a tradable edge with conditions, grade it and give the condition.

OUTPUT EXACTLY:

SIGNAL: BUY / SELL / NO_TRADE
ENTRY_ACTION: ENTER_NOW / ENTER_NEXT_CANDLE / ENTER_ON_BREAK_ABOVE_[level] / ENTER_ON_BREAK_BELOW_[level] / ENTER_ON_RETEST / WAIT_CONFIRMATION / NO_TRADE
SETUP_GRADE: A_SETUP / B_SETUP / C_SETUP / NO_TRADE
CONFIDENCE: XX%
CONFLUENCE_SCORE: X/10
EXECUTION_QUALITY: X/10
MARKET_REGIME: [regime type]
ACTIVE_SESSION: [session name]
EXPIRY_SUGGESTION: [1/2/3 candles + reasoning]

Trigger Condition: [exact condition to wait for if not immediate entry]

Strategy Used: [specific name]

Indicators Status:
• [each visible/implied indicator + reading + whether it supports or opposes]

Confluence Reasons:
• [reason 1 — specific]
• [reason 2 — specific]  
• [reason 3 — specific]
• [reason 4 if applicable]

Key Levels: [support, resistance, entry zone, stop zone]

Risk Note: [caution + main trap to avoid: late entry / fake breakout / mid-range / chop]

${mode === "next-candle" ? "MODE: Next candle entry. Signal NOW for immediate entry at next candle open. If timing is bad, say ENTER_NEXT_CANDLE with condition." : "MODE: T+4 protocol. Signal must be valid for entry 4 minutes from now at candle boundary."}

If NO_TRADE: Include at least 3 rejection-proof reasons AND confirm all 4 fallback modes were tried.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: [
              { type: "text", text: userPrompt },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ],
        max_tokens: 1800,
        temperature: 0.1
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "API credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const analysis = data.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error("No analysis received from AI");
    }

    const upper = analysis.toUpperCase();

    // Parse direction
    let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
    if (/SIGNAL:\s*BUY/i.test(analysis) || upper.includes("ENTER UP")) {
      direction = "BUY";
    } else if (/SIGNAL:\s*SELL/i.test(analysis) || upper.includes("ENTER DOWN")) {
      direction = "SELL";
    }

    // Parse entry action
    let entryAction = "NO_TRADE";
    const entryMatch = analysis.match(/ENTRY_ACTION:\s*([\w_]+(?:\[.*?\])?)/i);
    if (entryMatch) {
      entryAction = entryMatch[1].trim();
    } else if (direction !== "NEUTRAL") {
      entryAction = "ENTER_NOW";
    }

    // Parse setup grade
    let setupGrade = "NO_TRADE";
    const gradeMatch = analysis.match(/SETUP_GRADE:\s*(A_SETUP|B_SETUP|C_SETUP|NO_TRADE)/i);
    if (gradeMatch) setupGrade = gradeMatch[1].toUpperCase();

    // Parse confidence
    const confMatch = analysis.match(/CONFIDENCE:\s*(\d{1,2}(?:\.\d)?)%/i);
    const confidence = confMatch ? parseFloat(confMatch[1]) : 65;

    // Parse confluence score
    const conflMatch = analysis.match(/CONFLUENCE_SCORE:\s*(\d+(?:\.\d)?)\s*\/\s*10/i);
    const confluenceScore = conflMatch ? parseFloat(conflMatch[1]) : 5;

    // Parse execution quality
    const execMatch = analysis.match(/EXECUTION_QUALITY:\s*(\d+(?:\.\d)?)\s*\/\s*10/i);
    const executionQuality = execMatch ? parseFloat(execMatch[1]) : 5;

    // Parse market regime
    const regimeMatch = analysis.match(/MARKET_REGIME:\s*(.+?)(?:\n|$)/i);
    const marketRegime = regimeMatch ? regimeMatch[1].trim() : "UNKNOWN";

    // Parse strategy
    const stratMatch = analysis.match(/Strategy\s*Used:\s*(.+?)(?:\n|$)/i);
    const strategyUsed = stratMatch ? stratMatch[1].trim() : "Multi-confluence";

    // Parse expiry suggestion
    const expiryMatch = analysis.match(/EXPIRY_SUGGESTION:\s*(.+?)(?:\n|$)/i);
    const expirySuggestion = expiryMatch ? expiryMatch[1].trim() : "";

    // Parse trigger condition
    const triggerMatch = analysis.match(/Trigger\s*Condition:\s*(.+?)(?:\n\n|\nStrategy|$)/is);
    const triggerCondition = triggerMatch ? triggerMatch[1].trim() : "";

    // Signal strength based on setup grade + confidence
    let signalStrength: "high" | "medium" | "low" | "wait" | "conditional" = "wait";
    if (direction === "NEUTRAL" || setupGrade === "NO_TRADE") {
      signalStrength = "wait";
    } else if (entryAction.includes("WAIT") || entryAction.includes("RETEST") || entryAction.includes("BREAK")) {
      signalStrength = "conditional";
    } else if (setupGrade === "A_SETUP" && confidence >= 85) {
      signalStrength = "high";
    } else if ((setupGrade === "A_SETUP" || setupGrade === "B_SETUP") && confidence >= 75) {
      signalStrength = "medium";
    } else {
      signalStrength = "low";
    }

    return new Response(
      JSON.stringify({
        analysis,
        direction,
        confidence: Math.min(99, Math.max(50, confidence)),
        signalStrength,
        setupGrade,
        entryAction,
        confluenceScore,
        executionQuality,
        marketRegime,
        strategyUsed,
        expirySuggestion,
        triggerCondition,
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
