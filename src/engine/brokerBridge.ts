// SENTINEL X PRIME - Broker Bridge (v3)
// Connects to multiple brokers: Pocket Option, Quotex, OANDA, Binance, Exness, MT5, XM
// Provides unified interface for market data and signal execution

import { Vector, MarketType, Session, Timeframe } from "@/types/trading";

// Broker types
export type BrokerType = 
  | "POCKET_OPTION" 
  | "QUOTEX" 
  | "OANDA" 
  | "BINANCE" 
  | "EXNESS" 
  | "MT5" 
  | "XM_TRADER";

export type BrokerMarketMode = "REAL" | "OTC" | "DEMO";

export interface BrokerConfig {
  id: BrokerType;
  name: string;
  displayName: string;
  supportsOTC: boolean;
  supportsReal: boolean;
  hasWebSocket: boolean;
  hasMirrorFeed: boolean;
  dataQuality: "HIGH" | "MEDIUM" | "LOW";
  minExpiry: number; // seconds
  maxExpiry: number; // seconds
  supportedAssets: string[];
  apiEndpoint?: string;
  wsEndpoint?: string;
}

export interface BrokerConnection {
  broker: BrokerType;
  status: "CONNECTED" | "CONNECTING" | "DISCONNECTED" | "ERROR";
  mode: BrokerMarketMode;
  latency: number;
  lastPing: Date | null;
  dataFreshness: number; // seconds since last data
  errorMessage?: string;
}

export interface BrokerPrice {
  pair: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: Date;
  source: BrokerType;
  isOTC: boolean;
}

// Broker configurations
export const BROKER_CONFIGS: Record<BrokerType, BrokerConfig> = {
  POCKET_OPTION: {
    id: "POCKET_OPTION",
    name: "pocket_option",
    displayName: "Pocket Option",
    supportsOTC: true,
    supportsReal: true,
    hasWebSocket: true,
    hasMirrorFeed: true,
    dataQuality: "MEDIUM",
    minExpiry: 60,
    maxExpiry: 14400,
    supportedAssets: [
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "NZD/USD",
      "EUR/JPY", "GBP/JPY", "USD/CHF", "EUR/GBP", "AUD/JPY",
      "Gold", "Silver", "Bitcoin", "Ethereum"
    ],
    wsEndpoint: "wss://api-l.po.market/socket.io/"
  },
  QUOTEX: {
    id: "QUOTEX",
    name: "quotex",
    displayName: "Quotex (QX)",
    supportsOTC: true,
    supportsReal: true,
    hasWebSocket: true,
    hasMirrorFeed: true,
    dataQuality: "MEDIUM",
    minExpiry: 60,
    maxExpiry: 14400,
    supportedAssets: [
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "NZD/USD",
      "EUR/JPY", "GBP/JPY", "USD/CHF", "EUR/GBP", "Gold"
    ],
    wsEndpoint: "wss://ws2.qxbroker.com/socket.io/"
  },
  OANDA: {
    id: "OANDA",
    name: "oanda",
    displayName: "OANDA",
    supportsOTC: false,
    supportsReal: true,
    hasWebSocket: true,
    hasMirrorFeed: false,
    dataQuality: "HIGH",
    minExpiry: 0,
    maxExpiry: 0,
    supportedAssets: [
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF",
      "USD/CAD", "EUR/GBP", "EUR/JPY", "GBP/JPY", "NZD/USD",
      "Gold", "Silver", "Crude Oil"
    ],
    apiEndpoint: "https://api-fxpractice.oanda.com/v3/"
  },
  BINANCE: {
    id: "BINANCE",
    name: "binance",
    displayName: "Binance",
    supportsOTC: false,
    supportsReal: true,
    hasWebSocket: true,
    hasMirrorFeed: false,
    dataQuality: "HIGH",
    minExpiry: 0,
    maxExpiry: 0,
    supportedAssets: [
      "BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT", "SOL/USDT",
      "ADA/USDT", "DOGE/USDT", "DOT/USDT", "MATIC/USDT", "LINK/USDT"
    ],
    wsEndpoint: "wss://stream.binance.com:9443/ws"
  },
  EXNESS: {
    id: "EXNESS",
    name: "exness",
    displayName: "Exness",
    supportsOTC: false,
    supportsReal: true,
    hasWebSocket: true,
    hasMirrorFeed: true,
    dataQuality: "HIGH",
    minExpiry: 0,
    maxExpiry: 0,
    supportedAssets: [
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "Gold",
      "Silver", "Crude Oil", "NASDAQ", "S&P 500"
    ]
  },
  MT5: {
    id: "MT5",
    name: "metatrader5",
    displayName: "MetaTrader 5",
    supportsOTC: false,
    supportsReal: true,
    hasWebSocket: true,
    hasMirrorFeed: true,
    dataQuality: "HIGH",
    minExpiry: 0,
    maxExpiry: 0,
    supportedAssets: [
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF",
      "Gold", "Silver", "NASDAQ", "S&P 500", "DAX 40"
    ]
  },
  XM_TRADER: {
    id: "XM_TRADER",
    name: "xm_trader",
    displayName: "XM Trader",
    supportsOTC: false,
    supportsReal: true,
    hasWebSocket: true,
    hasMirrorFeed: true,
    dataQuality: "HIGH",
    minExpiry: 0,
    maxExpiry: 0,
    supportedAssets: [
      "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "Gold",
      "Silver", "Crude Oil", "NASDAQ", "S&P 500"
    ]
  }
};

// Current connections state
const connections: Map<BrokerType, BrokerConnection> = new Map();

// Price cache
const priceCache: Map<string, BrokerPrice> = new Map();

// Initialize broker connection
export const initializeBroker = (broker: BrokerType, mode: BrokerMarketMode): BrokerConnection => {
  const config = BROKER_CONFIGS[broker];
  
  const connection: BrokerConnection = {
    broker,
    status: "CONNECTING",
    mode,
    latency: 0,
    lastPing: null,
    dataFreshness: 0
  };
  
  connections.set(broker, connection);
  
  // Simulate connection (in production, this would be real WebSocket/API)
  setTimeout(() => {
    const conn = connections.get(broker);
    if (conn) {
      conn.status = "CONNECTED";
      conn.lastPing = new Date();
      conn.latency = 50 + Math.random() * 100;
      console.log(`[BROKER-BRIDGE] ✅ Connected to ${config.displayName} (${mode})`);
    }
  }, 500 + Math.random() * 1000);
  
  return connection;
};

// Get broker connection status
export const getBrokerConnection = (broker: BrokerType): BrokerConnection | null => {
  return connections.get(broker) || null;
};

// Get all connections
export const getAllConnections = (): BrokerConnection[] => {
  return Array.from(connections.values());
};

// Disconnect broker
export const disconnectBroker = (broker: BrokerType): void => {
  const conn = connections.get(broker);
  if (conn) {
    conn.status = "DISCONNECTED";
    console.log(`[BROKER-BRIDGE] 🔌 Disconnected from ${BROKER_CONFIGS[broker].displayName}`);
  }
};

// Get price from broker (with mirroring for OTC)
export const getPrice = (pair: string, broker: BrokerType, isOTC: boolean = false): BrokerPrice | null => {
  const config = BROKER_CONFIGS[broker];
  const cacheKey = `${broker}:${pair}:${isOTC}`;
  
  // Check cache freshness (max 2 seconds)
  const cached = priceCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp.getTime()) < 2000) {
    return cached;
  }
  
  // Generate mirrored price (in production: real feed)
  // OTC prices mirror real prices with synthetic volatility
  const basePrice = getBasePrice(pair);
  const volatility = isOTC ? 0.0008 : 0.0003;
  
  const price: BrokerPrice = {
    pair,
    bid: basePrice - volatility + Math.random() * 0.0001,
    ask: basePrice + volatility + Math.random() * 0.0001,
    spread: volatility * 2,
    timestamp: new Date(),
    source: broker,
    isOTC
  };
  
  priceCache.set(cacheKey, price);
  return price;
};

// Base prices for common pairs (simulated - would be real feed)
const getBasePrice = (pair: string): number => {
  const basePrices: Record<string, number> = {
    "EUR/USD": 1.0850,
    "GBP/USD": 1.2650,
    "USD/JPY": 149.50,
    "AUD/USD": 0.6650,
    "NZD/USD": 0.6150,
    "EUR/JPY": 162.20,
    "GBP/JPY": 189.10,
    "USD/CHF": 0.8850,
    "EUR/GBP": 0.8580,
    "AUD/JPY": 99.50,
    "Gold": 2350.00,
    "Silver": 28.50,
    "Crude Oil": 78.50,
    "Bitcoin": 67500,
    "Ethereum": 3450
  };
  
  // Handle OTC variants
  const cleanPair = pair.replace(" (OTC)", "");
  return basePrices[cleanPair] || 1.0;
};

// Get supported brokers for market type
export const getBrokersForMarketType = (marketType: MarketType): BrokerType[] => {
  return Object.values(BROKER_CONFIGS)
    .filter(config => 
      marketType === "OTC" ? config.supportsOTC : config.supportsReal
    )
    .map(config => config.id);
};

// Check if broker supports asset
export const brokerSupportsAsset = (broker: BrokerType, asset: string): boolean => {
  const config = BROKER_CONFIGS[broker];
  const cleanAsset = asset.replace(" (OTC)", "");
  return config.supportedAssets.some(a => 
    a === cleanAsset || a.includes(cleanAsset.split("/")[0])
  );
};

// Get OTC pairs for a broker
export const getOTCPairs = (broker: BrokerType): string[] => {
  const config = BROKER_CONFIGS[broker];
  if (!config.supportsOTC) return [];
  
  return config.supportedAssets
    .filter(a => !a.includes("USDT")) // Exclude crypto
    .map(a => `${a} (OTC)`);
};

// Calculate price gap between REAL and OTC
export const calculatePriceGap = (pair: string, realBroker: BrokerType, otcBroker: BrokerType): {
  gap: number;
  gapPips: number;
  isSignificant: boolean;
} => {
  const realPrice = getPrice(pair.replace(" (OTC)", ""), realBroker, false);
  const otcPrice = getPrice(pair, otcBroker, true);
  
  if (!realPrice || !otcPrice) {
    return { gap: 0, gapPips: 0, isSignificant: false };
  }
  
  const gap = Math.abs(realPrice.bid - otcPrice.bid);
  const pipSize = pair.includes("JPY") ? 0.01 : 0.0001;
  const gapPips = gap / pipSize;
  
  return {
    gap,
    gapPips,
    isSignificant: gapPips > 7.5 // Threshold for significant gap
  };
};

// Get broker status summary
export const getBrokerStatusSummary = (): {
  connected: number;
  total: number;
  avgLatency: number;
  quality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR";
} => {
  const conns = Array.from(connections.values());
  const connected = conns.filter(c => c.status === "CONNECTED").length;
  const avgLatency = connected > 0
    ? conns.filter(c => c.status === "CONNECTED").reduce((sum, c) => sum + c.latency, 0) / connected
    : 0;
  
  let quality: "EXCELLENT" | "GOOD" | "FAIR" | "POOR" = "POOR";
  if (connected >= 3 && avgLatency < 100) quality = "EXCELLENT";
  else if (connected >= 2 && avgLatency < 200) quality = "GOOD";
  else if (connected >= 1) quality = "FAIR";
  
  return {
    connected,
    total: Object.keys(BROKER_CONFIGS).length,
    avgLatency,
    quality
  };
};

// Ping broker for latency check
export const pingBroker = (broker: BrokerType): Promise<number> => {
  return new Promise((resolve) => {
    const start = Date.now();
    setTimeout(() => {
      const latency = Date.now() - start + Math.random() * 50;
      const conn = connections.get(broker);
      if (conn) {
        conn.latency = latency;
        conn.lastPing = new Date();
      }
      resolve(latency);
    }, 50 + Math.random() * 100);
  });
};

// Initialize default brokers
export const initializeDefaultBrokers = (marketType: MarketType): void => {
  if (marketType === "OTC") {
    initializeBroker("POCKET_OPTION", "OTC");
    initializeBroker("QUOTEX", "OTC");
  } else {
    initializeBroker("MT5", "REAL");
    initializeBroker("OANDA", "REAL");
  }
};
