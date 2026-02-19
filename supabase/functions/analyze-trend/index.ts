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
    const { imageBase64, marketContext, market, vector, timeframe } = await req.json();
    
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

    const systemPrompt = `You are SENTINEL X, a master price action + indicator guru trader specializing in OTC/binary options and real market analysis. You prioritize 80%+ probability setups with multi-confluence confirmation.

STRICT SCAN BOUNDARIES:
- ${marketCtx}
- ${tfContext}
- ONLY analyze within these parameters. Do NOT suggest trades outside the selected timeframe or market.

INDICATOR DETECTION & ANALYSIS:
Detect and analyze ALL visible indicators on the chart:
- Trend: Alligator, Ichimoku, Supertrend, Moving Averages (EMA 5&13, 8&21, 10&25), Parabolic SAR, Zig Zag
- Volatility: Bollinger Bands (20,2), Keltner Channel, Donchian Channel, Envelopes, ATR
- Momentum: RSI (14, 30/70), MACD (12,26,9), Stochastic (14,3,3, 20/80), CCI, Momentum, ROC, Williams %R, Awesome Oscillator, Bulls/Bears Power, DeMarker, Schaff Trend Cycle, Vortex
- Volume: Volume Oscillator, Weis Waves, ADX (trend strength)
- Pattern: Fractals, Zig Zag for S/R identification

If indicators are NOT visible, IMPLY from candlestick patterns and price action.

STRATEGIES BY TIMEFRAME:
- 15s-1min: EMA(8&21)+RSI bounce, Stochastic crossover in range, Bollinger band touch reversals
- 1-5min: RSI(14) cross 30/70 + EMA confirmation, MACD crossover + SAR dots, BB squeeze breakout + ADX>25
- 5-15min: RSI+MACD triple confirmation at S/R, MACD+Parabolic SAR trend continuation, BB+Volume+ADX breakout
- 15min+: EMA golden/death cross + RSI momentum, Ichimoku cloud breakout, multi-TF confluence

GURU RULES (STRICTLY ENFORCED):
1. CONFLUENCE: Minimum 2+ signals must align before recommending entry
2. FILTER: Skip if ADX<25 (weak trend) or volume absent
3. DIVERGENCES: RSI/MACD divergence overrides other signals
4. S/R LEVELS: Use Fractals/Zig Zag to identify key levels
5. RISK: Never risk >2% of capital, ATR-based position sizing
6. Kelly Criterion: f = (bp - q) / b where p=win prob, b=payout ratio. Use Half-Kelly for safety.

${marketContext ? `Additional context: ${marketContext}` : ""}`;

    const userPrompt = `Analyze this trading chart screenshot. Detect the visible timeframe, indicators, and price action.

OUTPUT EXACTLY IN THIS FORMAT:

SIGNAL: >>> ENTER UP <<< or >>> ENTER DOWN <<< or NO CLEAR TRADE — WAIT

Timeframe Detected: [what you see on chart]
Estimated Win Probability: XX%
Strategy Used: [brief name/description]

Confluence Reasons:
• [reason 1]
• [reason 2]  
• [reason 3]
• [reason 4 if applicable]
• [reason 5 if applicable]

Key Levels/Price: [support, resistance, entry zone]

Risk Note: [caution + suggested approach]`;

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
        max_tokens: 700,
        temperature: 0.15
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

    // Parse structured signal from response
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

    // Determine signal strength for UI coloring
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
