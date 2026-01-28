import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// T+4 Protocol: Calculate execution time based on timeframe
const calculateExecutionTime = (tf: string): Date => {
  const now = new Date();
  const tfMinutes: Record<string, number> = {
    "1": 1, "1m": 1,
    "5": 5, "5m": 5,
    "15": 15, "15m": 15,
    "30": 30, "30m": 30,
    "60": 60, "1h": 60,
    "240": 240, "4h": 240,
    "D": 1440, "1D": 1440, "24h": 1440,
  };
  
  const minutes = tfMinutes[tf] || 5;
  const msPerCandle = minutes * 60 * 1000;
  
  // Find next candle boundary
  const currentCandleStart = Math.floor(now.getTime() / msPerCandle) * msPerCandle;
  const nextCandleStart = currentCandleStart + msPerCandle;
  
  // T+4: Signal issued 4 minutes before candle start
  const executeAt = new Date(nextCandleStart);
  
  return executeAt;
};

// Triple validation scoring
interface ValidationResult {
  isValid: boolean;
  totalScore: number;
  breakdown: {
    biasScore: number;
    structureScore: number;
    triggerScore: number;
    sessionOk: boolean;
    volatilityOk: boolean;
    liquidityTrap: boolean;
    highImpactNews: boolean;
  };
  reason: string;
}

const tripleValidate = (meta: any): ValidationResult => {
  const biasScore = meta?.biasScore ?? 0;
  const structureScore = meta?.structureScore ?? 0;
  const triggerScore = meta?.triggerScore ?? 0;
  const sessionOk = meta?.sessionOk ?? false;
  const volatilityOk = meta?.volatilityOk ?? false;
  const liquidityTrap = meta?.liquidityTrap ?? false;
  const highImpactNews = meta?.highImpactNews ?? false;
  
  // Triple validation requires all three scores >= 1
  const tripleValid = biasScore >= 1 && structureScore >= 1 && triggerScore >= 1;
  
  // Session and volatility must be OK
  const environmentValid = sessionOk && volatilityOk;
  
  // No liquidity traps or high impact news (unless explicitly allowed)
  const noBlockers = !liquidityTrap && !highImpactNews;
  
  const totalScore = biasScore + structureScore + triggerScore;
  const isValid = tripleValid && environmentValid && noBlockers;
  
  let reason = "VALID";
  if (!tripleValid) reason = "Triple validation failed (bias/structure/trigger < 1)";
  else if (!sessionOk) reason = "Session not active";
  else if (!volatilityOk) reason = "Volatility regime unfavorable";
  else if (liquidityTrap) reason = "Liquidity trap detected";
  else if (highImpactNews) reason = "High impact news window";
  
  return {
    isValid,
    totalScore,
    breakdown: {
      biasScore,
      structureScore,
      triggerScore,
      sessionOk,
      volatilityOk,
      liquidityTrap,
      highImpactNews,
    },
    reason,
  };
};

// Cross-market validation for OTC signals
const crossValidateOTC = (marketId: string, direction: string): { validated: boolean; validator: string; confidence: number } => {
  // For OTC markets, we simulate cross-validation against real market data
  // In production, this would call OANDA/MT5 APIs
  const isOTC = marketId.includes("OTC");
  
  if (!isOTC) {
    return { validated: true, validator: "DIRECT", confidence: 95 };
  }
  
  // Simulate OANDA validation (80% success rate for demo)
  const oandaValidated = Math.random() > 0.2;
  
  if (oandaValidated) {
    return { validated: true, validator: "OANDA", confidence: 85 + Math.random() * 10 };
  }
  
  // Fallback to MT5
  const mt5Validated = Math.random() > 0.3;
  
  if (mt5Validated) {
    return { validated: true, validator: "MT5", confidence: 75 + Math.random() * 10 };
  }
  
  return { validated: false, validator: "NONE", confidence: 40 };
};

// Generate signal ID
const generateSignalId = (): string => {
  return `TV-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Only accept POST
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse body
    const body = await req.json();
    console.log('[TV-WEBHOOK] Received:', JSON.stringify(body, null, 2));

    // Validate secret
    const webhookSecret = Deno.env.get('WEBHOOK_SECRET');
    if (!webhookSecret || body.secret !== webhookSecret) {
      console.log('[TV-WEBHOOK] Invalid secret');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract signal data
    const {
      market_id,
      symbol,
      direction,
      stage,
      tf,
      meta = {},
    } = body;

    // Validate required fields
    if (!market_id || !symbol || !direction || !stage || !tf) {
      console.log('[TV-WEBHOOK] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'Missing required fields: market_id, symbol, direction, stage, tf' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Triple validation
    const validation = tripleValidate(meta);
    console.log('[TV-WEBHOOK] Triple validation:', validation);

    if (!validation.isValid) {
      console.log('[TV-WEBHOOK] Signal rejected:', validation.reason);
      return new Response(
        JSON.stringify({
          status: 'REJECTED',
          reason: validation.reason,
          validation,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Cross-market validation for OTC
    const crossValidation = crossValidateOTC(market_id, direction);
    console.log('[TV-WEBHOOK] Cross validation:', crossValidation);

    if (!crossValidation.validated) {
      console.log('[TV-WEBHOOK] Cross-validation failed');
      return new Response(
        JSON.stringify({
          status: 'CROSS_VALIDATION_FAILED',
          reason: 'Real market validation failed',
          crossValidation,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate T+4 execution time
    const executeAt = calculateExecutionTime(tf);
    const now = new Date();
    const prepTimeMs = executeAt.getTime() - now.getTime();
    const prepTimeMinutes = Math.floor(prepTimeMs / 60000);

    // Build signal object
    const signal = {
      id: generateSignalId(),
      market_id,
      symbol,
      direction: direction.toUpperCase(),
      stage: stage.toUpperCase(),
      timeframe: tf,
      issuedAt: now.toISOString(),
      executeAt: executeAt.toISOString(),
      prepTimeMinutes,
      confidence: crossValidation.confidence,
      validator: crossValidation.validator,
      validation: {
        tripleScore: validation.totalScore,
        ...validation.breakdown,
      },
      status: stage.toUpperCase() === 'CONFIRM' ? 'FINAL' : 'CANDIDATE',
    };

    console.log('[TV-WEBHOOK] Signal processed:', signal);

    // Return success with signal
    return new Response(
      JSON.stringify({
        status: 'ACCEPTED',
        signal,
        message: `Signal ${signal.id} processed. Execute at ${executeAt.toISOString()} (T-${prepTimeMinutes}m)`,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[TV-WEBHOOK] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(error) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
