// SENTINEL X - Market & Broker Selection Controller (v5)
// Persistent state for OTC vs REAL market routing with broker selection

import { MarketType, Vector } from "@/types/trading";

export type BrokerId = 
  // OTC Brokers
  | "pocket-otc" 
  | "quotex-otc" 
  | "qx-otc"
  // Real Market Brokers
  | "pocket-real"
  | "quotex-real"
  | "mt5"
  | "xm"
  | "exness"
  | "binance"
  | "oanda";

export interface Broker {
  id: BrokerId;
  name: string;
  marketType: MarketType;
  status: "connected" | "disconnected" | "pending";
  supportsVectors: Vector[];
  dataSource: "observed" | "api" | "websocket";
  isAvailable: boolean;
}

export interface MarketSelection {
  marketType: MarketType;
  selectedBroker: BrokerId | null;
  dataRouting: "otc" | "real";
  lockedAt: Date | null;
}

// Broker definitions
export const BROKERS: Broker[] = [
  // OTC Brokers
  {
    id: "pocket-otc",
    name: "Pocket Option (OTC)",
    marketType: "OTC",
    status: "disconnected",
    supportsVectors: ["OTC"],
    dataSource: "observed",
    isAvailable: true
  },
  {
    id: "quotex-otc",
    name: "Quotex (OTC)",
    marketType: "OTC",
    status: "disconnected",
    supportsVectors: ["OTC"],
    dataSource: "observed",
    isAvailable: true
  },
  {
    id: "qx-otc",
    name: "QX Broker (OTC)",
    marketType: "OTC",
    status: "disconnected",
    supportsVectors: ["OTC"],
    dataSource: "observed",
    isAvailable: true
  },
  // Real Market Brokers
  {
    id: "pocket-real",
    name: "Pocket Option (Real)",
    marketType: "REAL",
    status: "disconnected",
    supportsVectors: ["Forex", "Indices", "Commodities"],
    dataSource: "observed",
    isAvailable: true
  },
  {
    id: "quotex-real",
    name: "Quotex (Real)",
    marketType: "REAL",
    status: "disconnected",
    supportsVectors: ["Forex", "Indices"],
    dataSource: "observed",
    isAvailable: false // Not always available
  },
  {
    id: "mt5",
    name: "MetaTrader 5",
    marketType: "REAL",
    status: "disconnected",
    supportsVectors: ["Forex", "Indices", "Commodities", "Futures"],
    dataSource: "api",
    isAvailable: true
  },
  {
    id: "xm",
    name: "XM Trader",
    marketType: "REAL",
    status: "disconnected",
    supportsVectors: ["Forex", "Indices", "Commodities"],
    dataSource: "api",
    isAvailable: true
  },
  {
    id: "exness",
    name: "Exness",
    marketType: "REAL",
    status: "disconnected",
    supportsVectors: ["Forex", "Indices", "Commodities"],
    dataSource: "api",
    isAvailable: true
  },
  {
    id: "binance",
    name: "Binance",
    marketType: "REAL",
    status: "disconnected",
    supportsVectors: ["Indices", "Commodities"], // Crypto treated as indices
    dataSource: "websocket",
    isAvailable: true
  },
  {
    id: "oanda",
    name: "OANDA",
    marketType: "REAL",
    status: "disconnected",
    supportsVectors: ["Forex", "Indices", "Commodities"],
    dataSource: "api",
    isAvailable: true
  }
];

// Current market selection state
let currentSelection: MarketSelection = {
  marketType: "OTC",
  selectedBroker: null,
  dataRouting: "otc",
  lockedAt: null
};

// Get available brokers by market type
export const getBrokersByMarketType = (marketType: MarketType): Broker[] => {
  return BROKERS.filter(b => b.marketType === marketType && b.isAvailable);
};

// Get broker by ID
export const getBrokerById = (brokerId: BrokerId): Broker | undefined => {
  return BROKERS.find(b => b.id === brokerId);
};

// Set market type (first selection step)
export const setMarketType = (marketType: MarketType): MarketSelection => {
  currentSelection = {
    marketType,
    selectedBroker: null, // Reset broker when market type changes
    dataRouting: marketType === "OTC" ? "otc" : "real",
    lockedAt: null
  };
  
  console.log(`[MARKET-SELECTOR] Market type set to ${marketType}`);
  return { ...currentSelection };
};

// Set broker (second selection step)
export const setBroker = (brokerId: BrokerId): { success: boolean; reason: string } => {
  const broker = getBrokerById(brokerId);
  
  if (!broker) {
    return { success: false, reason: `Broker ${brokerId} not found` };
  }
  
  if (broker.marketType !== currentSelection.marketType) {
    return { 
      success: false, 
      reason: `Broker ${broker.name} is ${broker.marketType}, but market type is ${currentSelection.marketType}` 
    };
  }
  
  if (!broker.isAvailable) {
    return { success: false, reason: `Broker ${broker.name} is not currently available` };
  }
  
  currentSelection = {
    ...currentSelection,
    selectedBroker: brokerId,
    lockedAt: new Date()
  };
  
  console.log(`[MARKET-SELECTOR] Broker set to ${broker.name}`);
  return { success: true, reason: `Broker ${broker.name} selected` };
};

// Lock current selection (activates scanning)
export const lockSelection = (): { success: boolean; selection: MarketSelection; reason: string } => {
  if (!currentSelection.selectedBroker) {
    return {
      success: false,
      selection: currentSelection,
      reason: "Must select a broker before locking"
    };
  }
  
  currentSelection.lockedAt = new Date();
  
  console.log(`[MARKET-SELECTOR] Selection locked: ${currentSelection.marketType} via ${currentSelection.selectedBroker}`);
  
  return {
    success: true,
    selection: { ...currentSelection },
    reason: "Selection locked - ready to scan"
  };
};

// Get current selection
export const getCurrentSelection = (): MarketSelection => {
  return { ...currentSelection };
};

// Check if selection is complete
export const isSelectionComplete = (): boolean => {
  return currentSelection.selectedBroker !== null;
};

// Check if selection is locked
export const isSelectionLocked = (): boolean => {
  return currentSelection.lockedAt !== null;
};

// Reset selection
export const resetSelection = (): void => {
  currentSelection = {
    marketType: "OTC",
    selectedBroker: null,
    dataRouting: "otc",
    lockedAt: null
  };
  console.log("[MARKET-SELECTOR] Selection reset");
};

// Get vectors supported by current broker
export const getSupportedVectors = (): Vector[] => {
  if (!currentSelection.selectedBroker) {
    return currentSelection.marketType === "OTC" ? ["OTC"] : ["Forex", "Indices", "Commodities", "Futures"];
  }
  
  const broker = getBrokerById(currentSelection.selectedBroker);
  return broker?.supportsVectors || [];
};

// Get data source type
export const getDataSource = (): "observed" | "api" | "websocket" | "none" => {
  if (!currentSelection.selectedBroker) return "none";
  
  const broker = getBrokerById(currentSelection.selectedBroker);
  return broker?.dataSource || "none";
};
