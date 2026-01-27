// SENTINEL X - Signal Output Bus (v5)
// Unified signal output interface for Web delivery

import { Signal, Session, Vector, MarketType, Direction, Timeframe } from "@/types/trading";
import { getCurrentSelection, BrokerId } from "./marketSelector";

// Standardized signal output format (interface-agnostic)
export interface SignalOutput {
  id: string;
  asset: string;
  vector: Vector;
  marketType: MarketType;
  broker: BrokerId | null;
  direction: Direction;
  confidence: number;
  timeframes: Timeframe[];
  strategy: string;
  session: Session;
  tPlus4EntryTime: string; // UTC ISO string
  generatedTimestamp: string; // UTC ISO string
  expirySeconds?: number; // For OTC binary options
  status: "PREPARING" | "EXECUTABLE" | "COMPLETED" | "INVALIDATED" | "MISSED";
}

// Signal queue (in-memory for now, could be Redis/DB in production)
const signalQueue: SignalOutput[] = [];
const MAX_QUEUE_SIZE = 100;

// Subscribers for real-time updates
type SignalSubscriber = (signal: SignalOutput) => void;
const subscribers: Set<SignalSubscriber> = new Set();

// Convert internal Signal to SignalOutput
export const createSignalOutput = (signal: Signal): SignalOutput => {
  const selection = getCurrentSelection();
  
  // Determine expiry for OTC
  let expirySeconds: number | undefined;
  if (signal.marketType === "OTC") {
    expirySeconds = signal.timeframe === "1M" ? 60 : 300;
  }
  
  return {
    id: signal.id,
    asset: signal.asset,
    vector: signal.vector,
    marketType: signal.marketType,
    broker: selection.selectedBroker,
    direction: signal.direction,
    confidence: signal.confidence,
    timeframes: [signal.timeframe],
    strategy: signal.strategy,
    session: signal.session,
    tPlus4EntryTime: signal.executeAt.toISOString(),
    generatedTimestamp: signal.issuedAt.toISOString(),
    expirySeconds,
    status: signal.status === "PENDING" ? "PREPARING" : 
            signal.status === "EXECUTED" ? "EXECUTABLE" :
            signal.status as "COMPLETED" | "INVALIDATED" | "MISSED"
  };
};

// Publish signal to the bus
export const publishSignal = (signal: Signal): void => {
  const output = createSignalOutput(signal);
  
  // Add to queue (FIFO)
  signalQueue.push(output);
  if (signalQueue.length > MAX_QUEUE_SIZE) {
    signalQueue.shift(); // Remove oldest
  }
  
  // Notify all subscribers
  subscribers.forEach(callback => {
    try {
      callback(output);
    } catch (error) {
      console.error("[SIGNAL-BUS] Subscriber error:", error);
    }
  });
  
  console.log(`[SIGNAL-BUS] Signal published: ${output.id} - ${output.asset} ${output.direction}`);
};

// Subscribe to signal updates
export const subscribeToSignals = (callback: SignalSubscriber): () => void => {
  subscribers.add(callback);
  console.log(`[SIGNAL-BUS] Subscriber added. Total: ${subscribers.size}`);
  
  // Return unsubscribe function
  return () => {
    subscribers.delete(callback);
    console.log(`[SIGNAL-BUS] Subscriber removed. Total: ${subscribers.size}`);
  };
};

// Get latest signal from queue
export const getLatestSignal = (): SignalOutput | null => {
  return signalQueue.length > 0 ? signalQueue[signalQueue.length - 1] : null;
};

// Get all signals in queue
export const getSignalQueue = (): SignalOutput[] => {
  return [...signalQueue];
};

// Get signals by status
export const getSignalsByStatus = (status: SignalOutput["status"]): SignalOutput[] => {
  return signalQueue.filter(s => s.status === status);
};

// Clear signal queue
export const clearSignalQueue = (): void => {
  signalQueue.length = 0;
  console.log("[SIGNAL-BUS] Queue cleared");
};

// Update signal status in queue
export const updateSignalInQueue = (signalId: string, status: SignalOutput["status"]): void => {
  const signal = signalQueue.find(s => s.id === signalId);
  if (signal) {
    signal.status = status;
    
    // Notify subscribers of update
    subscribers.forEach(callback => {
      try {
        callback(signal);
      } catch (error) {
        console.error("[SIGNAL-BUS] Subscriber error on update:", error);
      }
    });
  }
};

// Format signal for Telegram (convenience method)
export const formatSignalForTelegram = (signal: SignalOutput): string => {
  const icon = signal.direction === "BUY" ? "🟢" : "🔴";
  const confidenceBar = "█".repeat(Math.floor(signal.confidence / 10)) + "░".repeat(10 - Math.floor(signal.confidence / 10));
  
  return `
🛰️ SENTINEL X SIGNAL

${icon} ${signal.direction} ${signal.asset}

📊 Market: ${signal.marketType}
🏦 Broker: ${signal.broker || "Not selected"}
⏱️ Timeframe: ${signal.timeframes.join(" | ")}
📈 Strategy: ${signal.strategy}
🌍 Session: ${signal.session}

💪 Confidence: ${signal.confidence.toFixed(1)}%
${confidenceBar}

⏰ Entry Window: T+4
📅 Execute At: ${new Date(signal.tPlus4EntryTime).toLocaleTimeString()}
${signal.expirySeconds ? `⌛ Expiry: ${signal.expirySeconds}s` : ""}

⚠️ Rules:
• Enter immediately at T+4
• Fixed stake only
• Allow M1/M2 recovery
• Stop after 2 losses

🔒 SENTINEL X v5
`.trim();
};

// Get subscriber count
export const getSubscriberCount = (): number => {
  return subscribers.size;
};
