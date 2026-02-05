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
    const { imageBase64, marketContext } = await req.json();
    
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

    const systemPrompt = `You are SENTINEL X, an elite trading analysis AI with expertise in technical analysis, price action, and market structure. 

When analyzing chart images, provide:
1. **Trend Direction**: Clear BUY, SELL, or NEUTRAL recommendation with confidence percentage
2. **Market Structure**: Key support/resistance levels, trend lines, patterns visible
3. **Entry Strategy**: Specific entry point suggestions with reasoning
4. **Risk Assessment**: Stop loss placement and risk/reward ratio
5. **Timeframe Analysis**: Best timeframe for execution
6. **Confluence Factors**: Multiple technical confirmations

Be direct, actionable, and professional. Format your response clearly with sections.
Current market context: ${marketContext || "General analysis"}`;

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
              {
                type: "text",
                text: "Analyze this trading chart and provide a detailed recommendation on the next trade. What direction should I trade and why?"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/png;base64,${imageBase64}`
                }
              }
            ]
          }
        ]
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

    // Extract direction from analysis
    let direction: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
    const upperAnalysis = analysis.toUpperCase();
    if (upperAnalysis.includes("BUY") && !upperAnalysis.includes("DON'T BUY") && !upperAnalysis.includes("DO NOT BUY")) {
      direction = "BUY";
    } else if (upperAnalysis.includes("SELL") && !upperAnalysis.includes("DON'T SELL") && !upperAnalysis.includes("DO NOT SELL")) {
      direction = "SELL";
    }

    // Extract confidence if mentioned
    const confidenceMatch = analysis.match(/(\d{1,2}(?:\.\d)?)\s*%/);
    const confidence = confidenceMatch ? parseFloat(confidenceMatch[1]) : 75;

    return new Response(
      JSON.stringify({
        analysis,
        direction,
        confidence: Math.min(99, Math.max(50, confidence)),
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
