// SENTINEL X - Binance Data Feed

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const BINANCE_SPOT = "https://api.binance.com/api/v3";
const BINANCE_FUTURES = "https://fapi.binance.com/fapi/v1";

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("BINANCE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key missing" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const { action, symbol, interval = "1m", limit = 100 } = await req.json();
    const headers = { "X-MBX-APIKEY": apiKey };

    let url: string;
    
    if (action === "ticker") {
      url = `${BINANCE_SPOT}/ticker/24hr?symbol=${symbol}`;
    } else if (action === "klines") {
      url = `${BINANCE_SPOT}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    } else if (action === "futures_ticker") {
      url = `${BINANCE_FUTURES}/ticker/24hr?symbol=${symbol}`;
    } else if (action === "futures_klines") {
      url = `${BINANCE_FUTURES}/klines?symbol=${symbol}&interval=${interval}&limit=${limit}`;
    } else {
      return new Response(JSON.stringify({ error: "Invalid action" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const res = await fetch(url, { headers });
    const data = await res.json();

    if (!res.ok) {
      return new Response(JSON.stringify({ error: data }), { 
        status: res.status, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ success: true, symbol, data }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
