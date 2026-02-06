-- Enable RLS on signals table
ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;

-- Allow public read access for dashboard
CREATE POLICY "Public read access for signals"
ON public.signals
FOR SELECT
USING (true);

-- Allow public insert for webhook (authenticated by secret in edge function)
CREATE POLICY "Public insert access for webhook"
ON public.signals
FOR INSERT
WITH CHECK (true);

-- Allow public update for signal status changes
CREATE POLICY "Public update access for signals"
ON public.signals
FOR UPDATE
USING (true);

-- Enable RLS on market_state
ALTER TABLE public.market_state ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for market state
CREATE POLICY "Public access for market_state"
ON public.market_state
FOR ALL
USING (true)
WITH CHECK (true);

-- Enable RLS on settings
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Allow public read/write for settings
CREATE POLICY "Public access for settings"
ON public.settings
FOR ALL
USING (true)
WITH CHECK (true);