import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
      ? "WINDOWS OVERLAY MODE: Analyze for the NEXT candle opening. Give immediate entry signal."
      : "IN-APP MODE: Signal must align with T+4 protocol (4 minutes before entry candle).";

    const systemPrompt = `You are SENTINEL X, a master price action + indicator guru trader. You prioritize 80%+ probability setups with multi-confluence confirmation. You are conservative — high-edge signals ONLY.

SCAN MODE: ${scanMode}

STRICT SCAN BOUNDARIES:
- ${marketCtx}
- ${tfContext}
- ONLY analyze within these parameters. Do NOT suggest trades outside the selected timeframe or market.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPLETE INDICATOR DETECTION & ANALYSIS PROTOCOL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Detect and analyze ALL visible indicators. If not visible, IMPLY from candles/price action.

【TREND INDICATORS】
• Moving Averages: EMA(5&13), EMA(8&21), EMA(10&25), SMA(50), SMA(200)
  - Golden Cross (short EMA above long) = BUY
  - Death Cross (short EMA below long) = SELL
  - Price above/below EMAs for trend confirmation
• Alligator (Jaw 13, Teeth 8, Lips 5): Lines spread = trending; intertwined = ranging
• Ichimoku Cloud: Price above cloud = bullish; below = bearish; Tenkan/Kijun cross for entries
• Supertrend: Green below price = uptrend; Red above price = downtrend
• Parabolic SAR: Dots below price = uptrend; above = downtrend; dot flip = reversal
• Zig Zag: Identify swing highs/lows, S/R levels, market structure

【VOLATILITY INDICATORS】
• Bollinger Bands (20,2): 
  - Price touches lower band + reversal = BUY; upper band + reversal = SELL
  - Squeeze (narrow bands) → breakout imminent; ADX>25 confirms direction
  - Band walk = strong trend continuation
• Keltner Channel: Price breaking above/below = momentum breakout
• Donchian Channel: Breakout above upper = BUY; below lower = SELL
• Envelopes: Similar to BB but fixed %; touch + reversal = entry
• ATR: High ATR = volatile (widen stops); Low ATR = quiet (tighten stops)

【MOMENTUM/OSCILLATORS】
• RSI (14, 30/70):
  - Crosses above 30 from below = BUY (oversold reversal)
  - Crosses below 70 from above = SELL (overbought reversal)
  - RSI divergence overrides other signals
  - RSI bounce at 50 in trends = continuation
• MACD (12,26,9):
  - MACD line crosses above signal = BUY; below = SELL
  - Histogram expanding = momentum increasing
  - Zero-line cross = trend change confirmation
• Stochastic (14,3,3, 20/80):
  - %K crosses above %D below 20 = BUY
  - %K crosses below %D above 80 = SELL
  - Bullish/bearish divergence = strong reversal signal
• CCI: Above +100 = overbought; below -100 = oversold
• Momentum/ROC: Rising = bullish momentum; falling = bearish
• Williams %R: Above -20 = overbought; below -80 = oversold
• Awesome Oscillator: Saucer pattern or zero-line cross = entry
• Bulls/Bears Power: Positive Bulls Power in uptrend = BUY; negative Bears in downtrend = SELL
• DeMarker: Above 0.7 = overbought; below 0.3 = oversold
• Schaff Trend Cycle: Crosses above 25 = BUY; below 75 = SELL
• Vortex Indicator: +VI crosses above -VI = BUY; reverse = SELL
• ADX (trend strength): >25 = trending (trade); <20 = ranging (avoid or use mean-reversion)

【VOLUME】
• Volume Oscillator: Rising volume + price move = confirmation
• Weis Waves: Large wave volume at S/R = institutional interest

【PATTERN RECOGNITION】
• Fractals: For S/R identification and breakout levels
• Candlestick patterns: Engulfing, Hammer, Shooting Star, Doji, Morning/Evening Star, Pin Bar
• Chart patterns: Head & Shoulders, Double Top/Bottom, Triangles, Flags, Wedges

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STRATEGIES BY TIMEFRAME (match to detected/selected TF)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

【15s - 1min (Scalping)】
• EMA(8&21) + RSI: EMA bullish cross + RSI bounces below 50 = BUY
• Stochastic crossover in range: %K/%D cross at extremes
• BB band touch reversal: Touch lower band + bullish candle = BUY
• Parabolic SAR dot flip + momentum confirmation

【1-5min (Quick Trades)】
• RSI(14) cross 30/70 + EMA confirmation
• MACD crossover + SAR dots alignment
• BB squeeze breakout + ADX>25 (strong trend)
• EMA(5&13) golden/death cross with volume

【5-15min (Standard)】
• RSI + MACD triple confirmation at S/R levels
• MACD + Parabolic SAR trend continuation
• BB + Volume + ADX breakout strategy
• Stochastic divergence at key levels

【15min+ (Swing)】
• EMA(50/200) golden/death cross + RSI momentum
• Ichimoku cloud breakout + Tenkan/Kijun cross
• Multi-TF confluence (HTF bias + LTF entry)
• Breakout & retest at previous day high/low

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
TOP 5 HIGH-EARNER STRATEGIES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. Smart Money Concepts (SMC): Order blocks, liquidity grabs, fair value gaps, inducements
2. Trend Following: EMA crossovers + pullback entries at Fibonacci levels + ADX>25
3. Price Action Trading: Clean candle patterns + S/R without indicators
4. Breakout & Retest: Consolidation box → breakout → retest of broken level as S/R
5. Scalping: Rapid RSI divergence / order flow at key levels during high-volume sessions

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RUMER'S BOX THEORY
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Draw box from previous day's high/low
• BUY: Price rejects bottom of box upward (hammer candle / long lower wick)
• SELL: Price rejects top of box downward (shooting star)
• AVOID: Middle of box (dead zone)
• Best during NY open with high volatility

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
GURU RULES (STRICTLY ENFORCED)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. CONFLUENCE: Minimum 2+ signals must align before entry
2. FILTER: Skip if ADX<20 (choppy) or no volume confirmation
3. DIVERGENCES: RSI/MACD divergence OVERRIDES other signals
4. S/R LEVELS: Use Fractals/Zig Zag/previous day high-low to identify key levels
5. RISK: Never risk >1-2% of capital; ATR-based stop placement
6. Kelly Criterion: f = (bp - q) / b; use Half-Kelly for safety
7. Volatility Adjustment: Widen stops in high ATR; tighten in low ATR
8. Session Awareness: Prioritize London open, NY open for highest probability
9. Avoid: News events unless using BB squeeze breakout strategy
10. No middle-of-range trades: Only trade at edges of structure

${marketContext ? `Additional context: ${marketContext}` : ""}`;

    const userPrompt = `Analyze this trading chart screenshot with MAXIMUM ACCURACY. Detect ALL visible indicators, patterns, candle formations, and price action structure.

Apply EVERY relevant indicator rule and strategy from the protocol. Cross-reference multiple signals for confluence.

OUTPUT EXACTLY IN THIS FORMAT:

SIGNAL: >>> ENTER UP <<< or >>> ENTER DOWN <<< or NO CLEAR TRADE — WAIT

Timeframe Detected: [what you see on chart]
Estimated Win Probability: XX%
Strategy Used: [specific strategy name + brief description]

Indicators Detected:
• [list each visible/implied indicator and its reading]

Confluence Reasons:
• [reason 1 — specific indicator + reading]
• [reason 2 — specific indicator + reading]
• [reason 3 — specific pattern/level]
• [reason 4 if applicable]
• [reason 5 if applicable]

Key Levels/Price: [support, resistance, entry zone, stop zone]

Risk Note: [caution + Half-Kelly sizing suggestion + ATR-based stop]

${mode === "next-candle" ? "IMPORTANT: This is for the NEXT candle opening. Give the signal NOW for immediate entry at next candle open." : "IMPORTANT: This signal must be valid for entry 4 minutes from now (T+4 protocol). Ensure the setup will still be valid at candle boundary."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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
        max_tokens: 1200,
        temperature: 0.12
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

    // Parse structured signal
    let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
    const upperAnalysis = analysis.toUpperCase();
    if (upperAnalysis.includes("ENTER UP") || upperAnalysis.includes(">>> ENTER UP <<<")) {
      direction = "BUY";
    } else if (upperAnalysis.includes("ENTER DOWN") || upperAnalysis.includes(">>> ENTER DOWN <<<")) {
      direction = "SELL";
    } else if (upperAnalysis.includes("NO CLEAR TRADE") || upperAnalysis.includes("WAIT")) {
      direction = "NEUTRAL";
    } else if (upperAnalysis.includes("BUY") && !upperAnalysis.includes("DON'T BUY")) {
      direction = "BUY";
    } else if (upperAnalysis.includes("SELL") && !upperAnalysis.includes("DON'T SELL")) {
      direction = "SELL";
    }

    // Extract win probability
    const probMatch = analysis.match(/(?:Win\s*Prob(?:ability)?|Estimated\s*Win)[:\s]*(\d{1,2}(?:\.\d)?)%/i);
    const confidence = probMatch ? parseFloat(probMatch[1]) : 70;

    // Extract strategy used
    const stratMatch = analysis.match(/Strategy\s*Used[:\s]*(.+?)(?:\n|$)/i);
    const strategyUsed = stratMatch ? stratMatch[1].trim() : "Multi-indicator confluence";

    // Extract indicators detected
    const indicatorsSection = analysis.match(/Indicators\s*Detected[:\s]*([\s\S]*?)(?=Confluence|Key Levels|Risk Note|$)/i);
    const indicatorsDetected = indicatorsSection ? indicatorsSection[1].trim() : "";

    // Signal strength
    let signalStrength: "high" | "medium" | "low" | "wait" = "low";
    if (direction === "NEUTRAL") {
      signalStrength = "wait";
    } else if (confidence >= 90) {
      signalStrength = "high";
    } else if (confidence >= 80) {
      signalStrength = "medium";
    }

    return new Response(
      JSON.stringify({
        analysis,
        direction,
        confidence: Math.min(99, Math.max(50, confidence)),
        signalStrength,
        strategyUsed,
        indicatorsDetected,
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
