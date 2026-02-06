-- Enable realtime for signals table to receive TradingView webhook signals in the dashboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;