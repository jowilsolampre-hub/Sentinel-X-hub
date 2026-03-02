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

    const now = new Date();
    const utcTime = now.toISOString();
    const zambiaOffset = 2 * 60 * 60 * 1000;
    const zambiaTime = new Date(now.getTime() + zambiaOffset).toISOString().replace('T', ' ').slice(0, 19);

    // Determine active session
    const utcHour = now.getUTCHours();
    let activeSession = "Off-Hours";
    if (utcHour >= 0 && utcHour < 8) activeSession = "Asia/Tokyo";
    if (utcHour >= 7 && utcHour < 9) activeSession = "London Open (overlap with Asia)";
    if (utcHour >= 8 && utcHour < 12) activeSession = "London";
    if (utcHour >= 12 && utcHour < 13) activeSession = "London/New York Overlap";
    if (utcHour >= 13 && utcHour < 17) activeSession = "New York";
    if (utcHour >= 17 && utcHour < 21) activeSession = "New York (late)";
    if (utcHour >= 21 || utcHour < 0) activeSession = "Sydney/Early Asia";

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
Do NOT mix strategy types without regime classification.

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

D. PATTERN RECOGNITION (ALL MAJOR): Double top/bottom, H&S/inverse, triangles (asc/desc/sym), flags/pennants, wedges, channels, ranges/rectangles, breakout+retest, continuation/reversal formations. Score each by context and choose the BEST tradable pattern.

E. INDICATOR DETECTION & ANALYSIS: Detect ALL visible indicators. If not visible, IMPLY from candles/PA.
【TREND】 EMA(5&13, 8&21, 10&25), SMA(50,200), Alligator, Ichimoku, Supertrend, Parabolic SAR, Zig Zag
【VOLATILITY】 Bollinger Bands(20,2), Keltner, Donchian, Envelopes, ATR
【MOMENTUM】 RSI(14), MACD(12,26,9), Stochastic(14,3,3), CCI, Momentum/ROC, Williams %R, Awesome Osc, Bulls/Bears Power, DeMarker, Schaff Cycle, Vortex, ADX
【VOLUME】 Volume Oscillator, Weis Waves
【PATTERNS】 Fractals, all candlestick patterns

F. SESSION/TIME CONTEXT: Active session = ${activeSession}. Adapt expectations. Suggest better pairs if current pair is poor.

G. NEWS/GLOBAL RISK: Infer abnormal volatility from candle behavior. Add uncertainty notes. Prefer conditional entries around event spikes.

H. ANTI-TRAP FILTERS: Check for late entry after extension, fake breakout risk, wick trap without confirmation, counter-trend with weak evidence, random chop, mid-range dead-zone entries.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 4: ENTRY TIMING PROTOCOL (CRITICAL FOR WINNING)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Candle-state awareness: Detect where current candle is (open/early/mid/late/final seconds).
- Prefer entries at candle open or after clear confirmation
- AVOID entering late after most of the move already happened
- If valid setup appears late → ENTER_NEXT_CANDLE or WAIT_CONFIRMATION unless strong breakout continuation
- If move is extended and timing is poor → downgrade grade, warn "late entry risk", provide better condition

Binary expiry logic:
- 1 candle = strong momentum + clean trigger + early entry
- 2 candles = moderate continuation / breakout retest
- 3 candles = slower move / wider structure confirmation
- Do NOT suggest short expiry for late entries

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 5: OPPORTUNITY GRADING (DO NOT OVER-REJECT)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A_SETUP = High quality: strong confluence, strong location, clear trigger, good timing
B_SETUP = Tradable with caution: moderate confluence, some imperfection, still tradable
C_SETUP = Speculative/conditional: lower confluence, possible edge with condition
NO_TRADE = ONLY if ALL true: extreme random chop, no structured range, no level reaction, no trigger, no valid conditional path

CONFIDENCE REFORM (NOT a hard gate):
- 80-100%: high-quality setup
- 67-79%: good tradable setup
- 55-66%: moderate (prefer better timing/confirmation)
- 45-54%: speculative but may be tradable with condition
- <45%: usually C_SETUP or NO_TRADE
IMPORTANT: A lower-confidence setup at a major key level with perfect timing can beat a higher-confidence late entry mid-move. Prioritize LOCATION + TRIGGER + TIMING over confidence alone.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 6: STRATEGIES BY TIMEFRAME
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【15s-1min Scalping】 EMA(8&21)+RSI, Stochastic crossover at extremes, BB band touch reversal, SAR dot flip
【1-5min Quick】 RSI(14) cross 30/70+EMA, MACD crossover+SAR, BB squeeze+ADX>25, EMA(5&13) cross with volume
【5-15min Standard】 RSI+MACD triple confirm at S/R, MACD+SAR continuation, BB+Vol+ADX breakout, Stochastic divergence
【15min+ Swing】 EMA(50/200) cross+RSI, Ichimoku breakout, Multi-TF confluence, Breakout & retest prev-day HL

TOP METHODS: SMC (order blocks, liquidity grabs, FVG), Trend Following (EMA+Fib+ADX), Price Action (candles+S/R), Breakout & Retest, Range-Edge/Box Theory, Liquidity Sweep Reversal, Wyckoff-style cues.

PRIORITY INDICATOR COMBOS (boost when aligned):
- RSI + MACD + S/R
- Bollinger Bands + Volume + ADX
- EMA(8/21) + RSI(7)
- MACD + Parabolic SAR
- Box Theory (prev-day HL edges)
- Wick/Shadow confirmation at key levels
If indicators conflict with structure → prefer structure/PA unless strong multi-indicator agreement.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 7: INDICATOR SUGGESTION MODE (CLEAN CHART)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

When chart lacks useful indicators, classify setup type and recommend best-fit stack:

STACK A — Trend Continuation: EMA 8, EMA 21, MACD(12,26,9), ADX(14), optional RSI(7/14)
STACK B — Range/Reversal: RSI(14) 30/70, Stochastic(14,3,3) 20/80, BB(20,2), optional EMA 50
STACK C — Breakout/Volatility: BB(20,2), ADX(14), ATR(14), MACD(12,26,9), optional Volume
STACK D — Fast Short-Term: EMA 8, EMA 21, RSI(7), MACD or SAR, optional Stochastic
STACK E — Clean PA + Minimal: EMA 20/21, RSI(14) or MACD, optional ADX(14)

For each recommendation: name, period/settings, what it confirms, what signal to wait for.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 8: CHOPPY MARKET HANDLING (SMART, NOT FEARFUL)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

"Choppy" does NOT mean "No Trade." CHECK FOR:
- Structured range boundaries
- Repeated rejection levels
- Box-edge setups
- Range bounce setups
- Compression breakout forming
- Wick rejection + confirmation
- Indicator reversal combo at levels
If structured and tradable → B_SETUP or C_SETUP with condition.
NO_TRADE only for random/noisy chop with zero repeatable edge.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 9: FALSE-REJECTION FIX (MANDATORY FALLBACKS)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Before returning NO_TRADE, you MUST try ALL of these:
Fallback A — Indicator Combo Mode: Find tradable combo alignment + level context
Fallback B — Range/Box Theory Mode: Look for edges, bounces, mean-reversion
Fallback C — Wick+Level Confirmation Mode: Wick rejection + confirmation candle trigger
Fallback D — Conditional Breakout/Retest Mode: Return exact condition to trade later
ONLY after ALL fallbacks fail may you return NO_TRADE.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SECTION 10: EXECUTION QUALITY & EXPECTANCY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Execution Quality Score (0-10) evaluates: entry timing quality, level proximity, confirmation quality, risk location, late-entry risk, opposing S/R risk, candle-state suitability.

Expectancy Bias Tag: POSITIVE_EXPECTANCY_CANDIDATE / NEUTRAL_EXPECTANCY / NEGATIVE_EXPECTANCY_RISK
Based on confluence, execution quality, risk location, setup grade.

IMAGE QUALITY: Rate visual input quality. Lower confidence when visibility is poor. Still provide conditional guidance if chart action is readable.

OVERTRADE PROTECTION: Favor quality over frequency. If conditions are noisy → tighten entry conditions, prefer WAIT/CONDITIONAL.

${marketContext ? `\nAdditional context from user: ${marketContext}` : ""}`;

    const userPrompt = `Analyze this trading chart with MAXIMUM ACCURACY and DISCIPLINED ENTRY TIMING.
Your goal: WIN 8/10 trades minimum. Be a GURU, not a random signal generator.

MANDATORY ANALYSIS STEPS:
1. REGIME: What is the market environment? (Classify FIRST — trend/range/breakout/chop/retest/compression)
2. STRUCTURE: HH/HL/LH/LL? BOS? CHOCH? Liquidity sweeps? Failed breakouts?
3. LOCATION: WHERE is price? At a key level/edge, or mid-nowhere? 
4. PATTERNS: Any tradable patterns? (Double top/bottom, H&S, triangles, flags, wedges, channels, ranges)
5. INDICATORS: What's visible? Read each one correctly. If missing, suggest best stack with settings.
6. PRICE ACTION: Wicks, engulfing, pin bars, momentum candles, rejection, confirmation?
7. TRIGGER: What CONFIRMS entry? (candle close, wick rejection, breakout+retest, indicator cross)
8. TIMING: Where is the candle in its life? (open/early/mid/late) — NEVER enter late into a spent candle
9. SESSION: Is this pair/timeframe optimal for ${activeSession}?
10. RISK: What's the main trap? (late entry, fake breakout, mid-range, chop)

CRITICAL RULES:
- Do NOT force a signal. If timing is bad → give CONDITIONAL entry (WAIT, ENTER_NEXT_CANDLE, ENTER_ON_BREAK, ENTER_ON_RETEST)
- Do NOT over-reject. If there's a tradable edge → grade it (A/B/C) and give the condition
- If chart is choppy → check for structured range edges, box theory, wick+level setups BEFORE saying NO_TRADE
- Before NO_TRADE → you MUST try ALL 4 fallback modes (Indicator Combo, Range/Box, Wick+Level, Conditional Break/Retest)
- READ the chart like a GURU: structure, flow, momentum, location, timing — not just indicators

OUTPUT FORMAT (EXACT):

SIGNAL: BUY / SELL / NO_TRADE
ENTRY_ACTION: ENTER_NOW / ENTER_NEXT_CANDLE / ENTER_ON_BREAK_ABOVE_[level] / ENTER_ON_BREAK_BELOW_[level] / ENTER_ON_RETEST / WAIT_CONFIRMATION / NO_TRADE
SETUP_GRADE: A_SETUP / B_SETUP / C_SETUP / NO_TRADE
CONFIDENCE: XX%
CONFLUENCE_SCORE: X/10
EXECUTION_QUALITY: X/10
EXPECTANCY: POSITIVE_EXPECTANCY_CANDIDATE / NEUTRAL_EXPECTANCY / NEGATIVE_EXPECTANCY_RISK
MARKET_REGIME: [specific regime]
ACTIVE_SESSION: ${activeSession}
EXPIRY_SUGGESTION: [1/2/3 candles + brief why]

Trigger Condition: [exact condition if not immediate — what price must do, what candle must form, what indicator must cross]

Strategy Used: [specific method name — e.g., TREND_FOLLOWING, BREAKOUT_RETEST, RANGE_BOUNCE, BOX_THEORY, LIQUIDITY_SWEEP_REVERSAL, INDICATOR_COMBO, SMC_ORDER_BLOCK, etc.]

Market Structure: [HH/HL/LH/LL status, BOS/CHOCH if present, key swing points]

Pattern Detected: [best tradable pattern with context]

Indicators Status:
• [indicator 1: reading + supports/opposes direction]
• [indicator 2: reading + supports/opposes direction]
• [indicator 3+ if visible]

Suggested Indicators (if chart is clean or indicators are weak):
• [indicator name (period/settings) — what it confirms — signal to wait for]

Key Levels:
• Support: [level(s)]
• Resistance: [level(s)]
• Entry Zone: [zone]
• Stop/Invalidation: [level]

Confluence Reasons:
• [reason 1 — specific and technical]
• [reason 2 — specific and technical]
• [reason 3 — specific and technical]
• [reason 4 if applicable]

Risk Note: [1-line caution + main trap to avoid]

${mode === "next-candle" ? "MODE: NEXT CANDLE entry. Signal for immediate entry at next candle open. If timing is bad → ENTER_NEXT_CANDLE with exact condition." : "MODE: T+4 protocol. Signal must remain valid for entry 4 minutes from now at candle boundary."}

If NO_TRADE:
1. List at least 3 rejection-proof reasons
2. Confirm ALL 4 fallback modes were tried and failed
3. Suggest what to wait for or a better pair/timeframe to scan

Pair Suggestions: [Best pairs for ${activeSession} session if current pair is suboptimal]`;

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
        max_tokens: 2500,
        temperature: 0.08
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

    // Parse all structured fields from AI output
    let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
    if (/SIGNAL:\s*BUY/i.test(analysis) || />>>\s*ENTER\s*UP\s*<<</i.test(analysis)) {
      direction = "BUY";
    } else if (/SIGNAL:\s*SELL/i.test(analysis) || />>>\s*ENTER\s*DOWN\s*<<</i.test(analysis)) {
      direction = "SELL";
    }

    let entryAction = "NO_TRADE";
    const entryMatch = analysis.match(/ENTRY_ACTION:\s*([\w_]+(?:\[.*?\])?)/i);
    if (entryMatch) {
      entryAction = entryMatch[1].trim();
    } else if (direction !== "NEUTRAL") {
      entryAction = "ENTER_NOW";
    }

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

    // Signal strength based on setup grade + confidence + execution quality
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
