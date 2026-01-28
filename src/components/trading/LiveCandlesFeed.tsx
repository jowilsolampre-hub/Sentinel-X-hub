// SENTINEL X - Live Candles Feed Screen (v5)
// Real-time candle display synchronized to selected timeframe

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, TrendingUp, TrendingDown, Circle } from "lucide-react";
import type { TimeframeOption } from "./TimeframeSelector";
import type { MarketCategory } from "./MarketCategorySelector";
import type { VectorOption } from "./VectorSelector";

interface CandleData {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  isBullish: boolean;
}

interface LiveCandlesFeedProps {
  marketCategory: MarketCategory;
  vector: VectorOption;
  timeframe: TimeframeOption;
  isRunning: boolean;
}

export const LiveCandlesFeed = ({ 
  marketCategory, 
  vector, 
  timeframe, 
  isRunning 
}: LiveCandlesFeedProps) => {
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [currentPrice, setCurrentPrice] = useState(1.0850);
  const [priceChange, setPriceChange] = useState(0);

  // Simulate live candle feed
  useEffect(() => {
    if (!isRunning) return;

    const generateCandle = (): CandleData => {
      const lastClose = candles.length > 0 ? candles[candles.length - 1].close : currentPrice;
      const change = (Math.random() - 0.5) * 0.002;
      const open = lastClose;
      const close = open + change;
      const high = Math.max(open, close) + Math.random() * 0.0005;
      const low = Math.min(open, close) - Math.random() * 0.0005;
      
      return {
        time: new Date(),
        open,
        high,
        low,
        close,
        volume: Math.floor(Math.random() * 10000) + 1000,
        isBullish: close > open
      };
    };

    const interval = setInterval(() => {
      const newCandle = generateCandle();
      setCandles(prev => [...prev.slice(-19), newCandle]);
      setCurrentPrice(newCandle.close);
      setPriceChange(newCandle.close - newCandle.open);
    }, 1000);

    return () => clearInterval(interval);
  }, [isRunning, candles.length, currentPrice]);

  // Get asset name based on selection
  const getAssetName = () => {
    if (vector === "Forex") return "EUR/USD";
    if (vector === "Crypto") return "BTC/USDT";
    if (vector === "Indices") return "NASDAQ";
    if (vector === "Commodities") return "XAU/USD";
    if (vector === "Futures") return "ES";
    return "EUR/USD";
  };

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Live Candles</h3>
          <Badge variant="outline" className="text-xs">
            {getAssetName()} • {timeframe.toUpperCase()}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Circle className={cn(
            "w-2 h-2",
            isRunning ? "fill-success text-success animate-pulse" : "fill-muted-foreground text-muted-foreground"
          )} />
          <span className="text-xs text-muted-foreground">
            {isRunning ? "LIVE" : "PAUSED"}
          </span>
        </div>
      </div>

      {/* Price Display */}
      <div className="flex items-center justify-between mb-4 p-3 bg-secondary/30 rounded-lg">
        <div>
          <p className="text-xs text-muted-foreground">{getAssetName()}</p>
          <p className="text-2xl font-mono font-bold">{currentPrice.toFixed(5)}</p>
        </div>
        <div className={cn(
          "flex items-center gap-1 px-2 py-1 rounded",
          priceChange >= 0 ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
        )}>
          {priceChange >= 0 ? (
            <TrendingUp className="w-4 h-4" />
          ) : (
            <TrendingDown className="w-4 h-4" />
          )}
          <span className="text-sm font-mono">
            {priceChange >= 0 ? "+" : ""}{(priceChange * 10000).toFixed(1)} pips
          </span>
        </div>
      </div>

      {/* Candle Visualization */}
      <div className="h-32 flex items-end gap-0.5 overflow-hidden bg-secondary/20 rounded-lg p-2">
        {candles.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-sm text-muted-foreground">
              {isRunning ? "Loading candles..." : "Start engine to see live candles"}
            </p>
          </div>
        ) : (
          candles.map((candle, idx) => {
            const range = Math.max(...candles.map(c => c.high)) - Math.min(...candles.map(c => c.low));
            const minPrice = Math.min(...candles.map(c => c.low));
            const heightPercent = range > 0 
              ? ((candle.high - candle.low) / range) * 100 
              : 50;
            const bottomPercent = range > 0 
              ? ((candle.low - minPrice) / range) * 100 
              : 0;

            return (
              <div
                key={idx}
                className="flex-1 flex flex-col justify-end"
                style={{ height: '100%' }}
              >
                <div
                  className={cn(
                    "w-full rounded-sm transition-all",
                    candle.isBullish ? "bg-success" : "bg-destructive"
                  )}
                  style={{
                    height: `${Math.max(heightPercent, 5)}%`,
                    marginBottom: `${bottomPercent}%`
                  }}
                />
              </div>
            );
          })
        )}
      </div>

      {/* Info Bar */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <span>Market: {marketCategory}</span>
        <span>Vector: {vector}</span>
        <span>{candles.length} candles</span>
      </div>
    </Card>
  );
};
