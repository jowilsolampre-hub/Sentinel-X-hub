// SENTINEL X - Binance Data Feed
// Fetches crypto spot and futures data from Binance API

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Binance API endpoints
const BINANCE_SPOT_API = "https://api.binance.com/api/v3";
const BINANCE_FUTURES_API = "https://fapi.binance.com/fapi/v1";

interface BinanceRequest {
  action: "ticker" | "klines" | "depth" | "trades" | "futures_ticker" | "futures_klines";
  symbol: string;
  interval?: string; // 1m, 5m, 15m, 30m, 1h, 4h, 1d
  limit?: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const BINANCE_API_KEY = Deno.env.get("BINANCE_API_KEY");
    if (!BINANCE_API_KEY) {
      console.error("[BINANCE] API key not configured");
      return new Response(
        JSON.stringify({ error: "Binance API key not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: BinanceRequest = await req.json();
    const { action, symbol, interval = "1m", limit = 100 } = body;

    console.log(`[BINANCE] Request: ${action} for ${symbol}`);

    const headers = {
      "X-MBX-APIKEY": BINANCE_API_KEY,
    };

    let url: string;
    let response: Response;

    switch (action) {
      case "ticker":
        // Get current price ticker
        url = `${BINANCE_SPOT_API}/ticker/24hr?symbol=${symbol}`;
        response = await fetch(url, { headers });
        break;

      case "klines":
        // Get candlestick data
        url = `${BINANCE_SPOT_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        response = await fetch(url, { headers });
        break;

      case "depth":
        // Get order book depth
        url = `${BINANCE_SPOT_API}/depth?symbol=${symbol}&limit=${Math.min(limit, 1000)}`;
        response = await fetch(url, { headers });
        break;

      case "trades":
        // Get recent trades
        url = `${BINANCE_SPOT_API}/trades?symbol=${symbol}&limit=${limit}`;
        response = await fetch(url, { headers });
        break;

      case "futures_ticker":
        // Get futures ticker
        url = `${BINANCE_FUTURES_API}/ticker/24hr?symbol=${symbol}`;
        response = await fetch(url, { headers });
        break;

      case "futures_klines":
        // Get futures candlestick data
        url = `${BINANCE_FUTURES_API}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
        response = await fetch(url, { headers });
        break;

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[BINANCE] API error: ${response.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: `Binance API error: ${response.status}`, details: errorText }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log(`[BINANCE] Success: ${action} for ${symbol}`);

    // Format klines data for easier consumption
    if (action === "klines" || action === "futures_klines") {
      const formattedKlines = data.map((k: any[]) => ({
        openTime: k[0],
        open: parseFloat(k[1]),
        high: parseFloat(k[2]),
        low: parseFloat(k[3]),
        close: parseFloat(k[4]),
        volume: parseFloat(k[5]),
        closeTime: k[6],
        quoteVolume: parseFloat(k[7]),
        trades: k[8],
        takerBuyBaseVolume: parseFloat(k[9]),
        takerBuyQuoteVolume: parseFloat(k[10]),
      }));

      return new Response(
        JSON.stringify({ success: true, symbol, interval, data: formattedKlines }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, symbol, data }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[BINANCE] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
