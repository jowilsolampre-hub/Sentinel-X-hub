// SENTINEL X PRIME - Data Routing Layer (v3)
// Routes OTC vs REAL feeds independently without cross-contamination

import { Vector, MarketType } from "@/types/trading";
import { getCurrentSelection, getDataSource } from "./marketSelector";

export interface MarketCandle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: Date;
}

export interface DataFeedStatus {
  source: "otc" | "real" | "none";
  isActive: boolean;
  lastUpdate: Date | null;
  quality: "high" | "medium" | "low" | "unknown";
  latency: number; // ms
}

// Simulated data sources (would connect to real feeds in production)
let feedStatus: DataFeedStatus = {
  source: "none",
  isActive: false,
  lastUpdate: null,
  quality: "unknown",
  latency: 0
};

// OTC Asset pairs (expanded)
export const OTC_PAIRS = [
  "EUR/USD (OTC)", "GBP/USD (OTC)", "USD/JPY (OTC)", "AUD/USD (OTC)",
  "NZD/USD (OTC)", "EUR/JPY (OTC)", "GBP/JPY (OTC)", "USD/CHF (OTC)",
  "EUR/GBP (OTC)", "AUD/JPY (OTC)", "Gold (OTC)"
];

// Real market pairs by vector
export const REAL_PAIRS: Record<Vector, string[]> = {
  Forex: [
    "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF",
    "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "NZD/USD"
  ],
  Indices: [
    "NASDAQ", "S&P 500", "DAX 40", "FTSE 100", "Nikkei 225",
    "US30", "NAS100", "US500"
  ],
  Commodities: [
    "Gold", "Silver", "Crude Oil", "Natural Gas", "Copper"
  ],
  Futures: [
    "ES", "NQ", "YM", "RTY", "CL", "GC"
  ],
  OTC: OTC_PAIRS
};

// Generate simulated candle data (placeholder for real feed)
const generateSimulatedCandle = (): MarketCandle => {
  const basePrice = 1.0800 + Math.random() * 0.01;
  const volatility = 0.0005 + Math.random() * 0.001;
  
  return {
    open: basePrice,
    high: basePrice + volatility,
    low: basePrice - volatility,
    close: basePrice + (Math.random() - 0.5) * volatility * 2,
    volume: Math.floor(Math.random() * 10000),
    timestamp: new Date()
  };
};

// Get OTC candles for a pair
export const getOTCCandles = (pair: string, count: number = 20): MarketCandle[] => {
  const selection = getCurrentSelection();
  
  // Validate routing
  if (selection.dataRouting !== "otc") {
    console.warn(`[DATA-ROUTER] Attempting OTC fetch but routing is ${selection.dataRouting}`);
  }
  
  feedStatus = {
    source: "otc",
    isActive: true,
    lastUpdate: new Date(),
    quality: "medium", // OTC data is always "observed"
    latency: 50 + Math.random() * 100
  };
  
  // Generate simulated candles
  const candles: MarketCandle[] = [];
  for (let i = 0; i < count; i++) {
    candles.push(generateSimulatedCandle());
  }
  
  return candles;
};

// Get REAL market candles for a pair
export const getRealCandles = (pair: string, timeframe: string = "1M", count: number = 20): MarketCandle[] => {
  const selection = getCurrentSelection();
  const dataSource = getDataSource();
  
  // Validate routing
  if (selection.dataRouting !== "real") {
    console.warn(`[DATA-ROUTER] Attempting REAL fetch but routing is ${selection.dataRouting}`);
  }
  
  // Set quality based on data source type
  let quality: "high" | "medium" | "low" = "medium";
  if (dataSource === "api") quality = "high";
  if (dataSource === "websocket") quality = "high";
  if (dataSource === "observed") quality = "medium";
  
  feedStatus = {
    source: "real",
    isActive: true,
    lastUpdate: new Date(),
    quality,
    latency: 20 + Math.random() * 50
  };
  
  // Generate simulated candles
  const candles: MarketCandle[] = [];
  for (let i = 0; i < count; i++) {
    candles.push(generateSimulatedCandle());
  }
  
  return candles;
};

// Get pairs for current market selection
export const getPairsForCurrentMarket = (vector?: Vector): string[] => {
  const selection = getCurrentSelection();
  
  if (selection.marketType === "OTC") {
    return OTC_PAIRS;
  }
  
  if (vector) {
    return REAL_PAIRS[vector] || [];
  }
  
  // Return all real pairs
  return Object.values(REAL_PAIRS).flat();
};

// Get feed status
export const getFeedStatus = (): DataFeedStatus => {
  return { ...feedStatus };
};

// Check if feeds are isolated (no cross-contamination)
export const validateFeedIsolation = (): { isolated: boolean; warning?: string } => {
  const selection = getCurrentSelection();
  
  if (selection.marketType === "OTC" && feedStatus.source === "real") {
    return {
      isolated: false,
      warning: "OTC market selected but receiving REAL feed data"
    };
  }
  
  if (selection.marketType === "REAL" && feedStatus.source === "otc") {
    return {
      isolated: false,
      warning: "REAL market selected but receiving OTC feed data"
    };
  }
  
  return { isolated: true };
};

// Reset feed status
export const resetFeedStatus = (): void => {
  feedStatus = {
    source: "none",
    isActive: false,
    lastUpdate: null,
    quality: "unknown",
    latency: 0
  };
};
