// SENTINEL X - Bybit Data Feed

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const BYBIT_BASE = "https://api.bybit.com/v5";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BYBIT_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "BYBIT_API_KEY missing" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { action, symbol, interval = "15", limit = 100, category = "linear" } = await req.json();

    let url: string;

    if (action === "klines") {
      url = `${BYBIT_BASE}/market/kline?category=${category}&symbol=${symbol}&interval=${interval}&limit=${limit}`;
    } else if (action === "ticker") {
      url = `${BYBIT_BASE}/market/tickers?category=${category}&symbol=${symbol}`;
    } else if (action === "orderbook") {
      url = `${BYBIT_BASE}/market/orderbook?category=${category}&symbol=${symbol}&limit=${Math.min(limit, 50)}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action. Use: klines, ticker, orderbook" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const res = await fetch(url, {
      headers: { "X-BAPI-API-KEY": apiKey },
    });
    const data = await res.json();

    if (!res.ok || data.retCode !== 0) {
      return new Response(JSON.stringify({ error: data.retMsg || data }), {
        status: res.ok ? 400 : res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, symbol, data: data.result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
