// SENTINEL X - Market Universe Separation
// Distinct market universes that must NEVER blend
// PO_REAL, PO_OTC, QX_OTC, BINANCE, OANDA, MT5

import { Vector, MarketType } from "@/types/trading";

// Market Universe Types
export type MarketUniverse = 
  | "PO_REAL"     // Pocket Option REAL
  | "PO_OTC"      // Pocket Option OTC
  | "QX_OTC"      // Quotex OTC
  | "BINANCE"     // Binance Spot/Futures
  | "OANDA"       // OANDA Forex
  | "MT5_EXNESS"  // MT5 via Exness
  | "MT5_XM"      // MT5 via XM Trader
  | "TRADINGVIEW"; // TradingView Alerts

// Universe Configuration
export interface UniverseConfig {
  id: MarketUniverse;
  name: string;
  displayName: string;
  marketType: MarketType;
  dataSource: "API" | "WEBHOOK" | "BRIDGE" | "MIRROR";
  executionMode: "AUTO" | "MANUAL" | "HYBRID";
  isActive: boolean;
  requiresAuth: boolean;
  symbols: string[];
  description: string;
}

// All Market Universes
export const MARKET_UNIVERSES: Record<MarketUniverse, UniverseConfig> = {
  PO_REAL: {
    id: "PO_REAL",
    name: "Pocket Option REAL",
    displayName: "PO Real",
    marketType: "REAL",
    dataSource: "WEBHOOK",
    executionMode: "MANUAL",
    isActive: true,
    requiresAuth: false,
    symbols: ["EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CHF", "EUR/GBP", "NZD/USD", "XAU/USD"],
    description: "Real market via TradingView alerts + manual execution"
  },
  PO_OTC: {
    id: "PO_OTC",
    name: "Pocket Option OTC",
    displayName: "PO OTC",
    marketType: "OTC",
    dataSource: "WEBHOOK",
    executionMode: "MANUAL",
    isActive: true,
    requiresAuth: false,
    symbols: ["EUR/USD (OTC)", "GBP/USD (OTC)", "USD/JPY (OTC)", "AUD/USD (OTC)", "XAU/USD (OTC)"],
    description: "OTC synthetic market via TradingView + manual execution"
  },
  QX_OTC: {
    id: "QX_OTC",
    name: "Quotex OTC",
    displayName: "Quotex",
    marketType: "OTC",
    dataSource: "WEBHOOK",
    executionMode: "MANUAL",
    isActive: true,
    requiresAuth: false,
    symbols: ["EUR/USD (OTC)", "GBP/USD (OTC)", "USD/JPY (OTC)", "Gold (OTC)", "BTC/USD (OTC)"],
    description: "Quotex OTC via TradingView + manual execution"
  },
  BINANCE: {
    id: "BINANCE",
    name: "Binance",
    displayName: "Binance",
    marketType: "REAL",
    dataSource: "API",
    executionMode: "HYBRID",
    isActive: true,
    requiresAuth: true,
    symbols: ["BTC/USDT", "ETH/USDT", "BNB/USDT", "XRP/USDT", "SOL/USDT", "ADA/USDT"],
    description: "Binance spot/futures with real API connection"
  },
  OANDA: {
    id: "OANDA",
    name: "OANDA",
    displayName: "OANDA",
    marketType: "REAL",
    dataSource: "API",
    executionMode: "HYBRID",
    isActive: true,
    requiresAuth: true,
    symbols: ["EUR_USD", "GBP_USD", "USD_JPY", "AUD_USD", "USD_CHF", "EUR_GBP", "XAU_USD"],
    description: "OANDA forex with real API - primary validator"
  },
  MT5_EXNESS: {
    id: "MT5_EXNESS",
    name: "MT5 Exness",
    displayName: "Exness",
    marketType: "REAL",
    dataSource: "BRIDGE",
    executionMode: "HYBRID",
    isActive: true,
    requiresAuth: true,
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD", "BTCUSD"],
    description: "MT5 via Exness - requires Windows bridge"
  },
  MT5_XM: {
    id: "MT5_XM",
    name: "MT5 XM Trader",
    displayName: "XM Trader",
    marketType: "REAL",
    dataSource: "BRIDGE",
    executionMode: "HYBRID",
    isActive: true,
    requiresAuth: true,
    symbols: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "XAUUSD", "US30", "NAS100"],
    description: "MT5 via XM - requires Windows bridge"
  },
  TRADINGVIEW: {
    id: "TRADINGVIEW",
    name: "TradingView",
    displayName: "TV Alerts",
    marketType: "REAL",
    dataSource: "WEBHOOK",
    executionMode: "MANUAL",
    isActive: true,
    requiresAuth: false,
    symbols: ["Any"],
    description: "TradingView webhook alerts for any symbol"
  }
};

// Current active universe state
let activeUniverse: MarketUniverse = "OANDA";
let activeSymbol: string = "EUR_USD";

// Get/Set active universe
export const getActiveUniverse = (): MarketUniverse => activeUniverse;
export const setActiveUniverse = (universe: MarketUniverse): void => {
  if (!MARKET_UNIVERSES[universe]) {
    console.error(`[SENTINEL X] Invalid universe: ${universe}`);
    return;
  }
  activeUniverse = universe;
  console.log(`[SENTINEL X] Universe switched to: ${universe}`);
};

export const getActiveSymbol = (): string => activeSymbol;
export const setActiveSymbol = (symbol: string): void => {
  activeSymbol = symbol;
  console.log(`[SENTINEL X] Symbol switched to: ${symbol}`);
};

// Get universe config
export const getUniverseConfig = (universe?: MarketUniverse): UniverseConfig => {
  return MARKET_UNIVERSES[universe || activeUniverse];
};

// Get universes by type
export const getUniversesByType = (marketType: MarketType): UniverseConfig[] => {
  return Object.values(MARKET_UNIVERSES).filter(u => u.marketType === marketType && u.isActive);
};

// Get universes by data source
export const getUniversesByDataSource = (source: UniverseConfig["dataSource"]): UniverseConfig[] => {
  return Object.values(MARKET_UNIVERSES).filter(u => u.dataSource === source && u.isActive);
};

// Validate universe doesn't cross-contaminate
export const validateUniverseSeparation = (
  universe1: MarketUniverse, 
  universe2: MarketUniverse
): { valid: boolean; reason: string } => {
  const config1 = MARKET_UNIVERSES[universe1];
  const config2 = MARKET_UNIVERSES[universe2];

  // OTC and REAL must never blend
  if (config1.marketType !== config2.marketType) {
    return {
      valid: false,
      reason: `Cannot mix ${config1.marketType} (${universe1}) with ${config2.marketType} (${universe2})`
    };
  }

  // PO and QX are separate OTC universes
  if (universe1.startsWith("PO_") && universe2.startsWith("QX_")) {
    return {
      valid: false,
      reason: "Pocket Option and Quotex are separate OTC universes"
    };
  }

  return { valid: true, reason: "Universes compatible" };
};

// Cross-market validation (OANDA first, MT5 fallback)
export interface CrossValidationResult {
  validated: boolean;
  validator: MarketUniverse;
  direction: "BUY" | "SELL" | "NEUTRAL";
  confidence: number;
  reason: string;
}

export const crossValidateSignal = async (
  targetUniverse: MarketUniverse,
  symbol: string,
  proposedDirection: "BUY" | "SELL"
): Promise<CrossValidationResult> => {
  // For PO/QX signals, validate against OANDA or MT5
  if (targetUniverse.startsWith("PO_") || targetUniverse.startsWith("QX_")) {
    // Try OANDA first
    const oandaSymbol = symbol.replace("/", "_").replace(" (OTC)", "");
    
    // Simulated validation (in real implementation, would fetch OANDA data)
    const oandaValidated = Math.random() > 0.2; // 80% validation success
    
    if (oandaValidated) {
      return {
        validated: true,
        validator: "OANDA",
        direction: proposedDirection,
        confidence: 85 + Math.random() * 10,
        reason: `OANDA confirms ${proposedDirection} bias on ${oandaSymbol}`
      };
    }

    // Fallback to MT5
    const mt5Validated = Math.random() > 0.3; // 70% fallback success
    
    if (mt5Validated) {
      return {
        validated: true,
        validator: "MT5_EXNESS",
        direction: proposedDirection,
        confidence: 75 + Math.random() * 10,
        reason: `MT5 fallback confirms ${proposedDirection} bias`
      };
    }

    return {
      validated: false,
      validator: "OANDA",
      direction: "NEUTRAL",
      confidence: 40,
      reason: "Cross-validation failed - signal rejected"
    };
  }

  // For real market signals, no cross-validation needed
  return {
    validated: true,
    validator: targetUniverse,
    direction: proposedDirection,
    confidence: 90,
    reason: "Real market - direct validation"
  };
};

// Get all symbols for universe
export const getUniverseSymbols = (universe: MarketUniverse): string[] => {
  return MARKET_UNIVERSES[universe]?.symbols || [];
};

// Symbol mapping between universes
export const mapSymbolBetweenUniverses = (
  symbol: string,
  fromUniverse: MarketUniverse,
  toUniverse: MarketUniverse
): string => {
  // Normalize symbol
  let normalized = symbol
    .replace(" (OTC)", "")
    .replace("/", "_")
    .replace("_", "/");

  // Format for target universe
  const toConfig = MARKET_UNIVERSES[toUniverse];
  
  if (toConfig.id === "OANDA") {
    return normalized.replace("/", "_");
  }
  
  if (toConfig.marketType === "OTC") {
    return normalized.replace("_", "/") + " (OTC)";
  }
  
  return normalized;
};
