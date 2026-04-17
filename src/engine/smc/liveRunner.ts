// SENTINEL X - SMC Live Runner
// Binance + Bybit candle fetcher → SMC analysis → signal memory + dedup + cooldown
// Embedded module inside JOYRIDE PRO / TRADESCAN fusion stack

import { supabase } from "@/integrations/supabase/client";
import { generateSMCSignal } from "./engine";
import { SMCCandle, SMCConfig, SMCSignalResult, DEFAULT_SMC_CONFIG } from "./types";
import { publishSignal, SignalOutput, subscribeToSignals } from "../signalBus";
import type { Signal, Direction, Timeframe, Vector, MarketType, Session } from "@/types/trading";
import { detectActiveSession } from "../sessionLock";

// ── types ──
export type ExchangeSource = "BINANCE" | "BYBIT";

export interface LiveRunnerConfig {
  exchange: ExchangeSource;
  symbols: string[];
  entryTimeframe: string;
  htfTimeframe: string;
  scanIntervalMs: number;
  cooldownMs: number;
  signalExpiryMs: number;
  minConfidence: number;
  smcConfig: SMCConfig;
}

interface SignalMemoryItem {
  signal: SMCSignalResult;
  createdAt: number;
  fingerprint: string;
  expired: boolean;
}

// ── defaults ──
export const DEFAULT_RUNNER_CONFIG: LiveRunnerConfig = {
  exchange: "BINANCE",
  symbols: ["BTCUSDT", "ETHUSDT", "SOLUSDT", "BNBUSDT"],
  entryTimeframe: "15",
  htfTimeframe: "60",
  scanIntervalMs: 45_000,
  cooldownMs: 5 * 60_000,
  signalExpiryMs: 10 * 60_000,
  minConfidence: 60,
  smcConfig: DEFAULT_SMC_CONFIG,
};

// ── exchange interval mapping ──
const BINANCE_INTERVALS: Record<string, string> = {
  "1": "1m", "5": "5m", "15": "15m", "30": "30m", "60": "1h", "240": "4h", "1440": "1d",
};

// ── state ──
const signalMemory = new Map<string, SignalMemoryItem>();
const cooldowns = new Map<string, number>();
let scanTimer: ReturnType<typeof setInterval> | null = null;
let isRunning = false;

// ── helpers ──
const fingerprint = (r: SMCSignalResult) =>
  `${r.symbol}:${r.side}:${Math.round(r.tradePlan?.entry ?? 0)}`;

const isOnCooldown = (symbol: string, now: number, cooldownMs: number): boolean => {
  const until = cooldowns.get(symbol);
  return !!until && now < until;
};

const isDuplicate = (fp: string, expiryMs: number): boolean => {
  const existing = signalMemory.get(fp);
  if (!existing || existing.expired) return false;
  return Date.now() - existing.createdAt < expiryMs;
};

// ── candle fetcher ──
export const fetchCandles = async (
  exchange: ExchangeSource,
  symbol: string,
  interval: string,
  limit = 100
): Promise<SMCCandle[]> => {
  const fnName = exchange === "BINANCE" ? "binance" : "bybit";

  if (exchange === "BINANCE") {
    const binanceInterval = BINANCE_INTERVALS[interval] || `${interval}m`;
    const { data, error } = await supabase.functions.invoke(fnName, {
      body: { action: "klines", symbol, interval: binanceInterval, limit },
    });
    if (error || !data?.success) {
      console.error(`[SMC-RUNNER] ${exchange} fetch error:`, error || data?.error);
      return [];
    }
    return (data.data as any[]).map((k: any[]) => ({
      timestamp: k[0],
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }));
  }

  // BYBIT
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: { action: "klines", symbol, interval, limit, category: "linear" },
  });
  if (error || !data?.success) {
    console.error(`[SMC-RUNNER] ${exchange} fetch error:`, error || data?.error);
    return [];
  }
  // Bybit returns list in reverse order
  const list = (data.data?.list || []) as any[];
  return list
    .map((k: any[]) => ({
      timestamp: parseInt(k[0]),
      open: parseFloat(k[1]),
      high: parseFloat(k[2]),
      low: parseFloat(k[3]),
      close: parseFloat(k[4]),
      volume: parseFloat(k[5]),
    }))
    .reverse();
};

// ── scan a single symbol ──
export const scanSymbol = async (
  symbol: string,
  config: LiveRunnerConfig
): Promise<SMCSignalResult | null> => {
  const now = Date.now();

  if (isOnCooldown(symbol, now, config.cooldownMs)) {
    console.log(`[SMC-RUNNER] ${symbol} on cooldown`);
    return null;
  }

  // Fetch entry + HTF candles in parallel
  const [entryCandles, htfCandles] = await Promise.all([
    fetchCandles(config.exchange, symbol, config.entryTimeframe, 100),
    fetchCandles(config.exchange, symbol, config.htfTimeframe, 100),
  ]);

  if (entryCandles.length < 20) {
    console.log(`[SMC-RUNNER] ${symbol} insufficient data (${entryCandles.length} candles)`);
    return null;
  }

  const result = generateSMCSignal(
    symbol,
    entryCandles,
    htfCandles.length >= 20 ? htfCandles : null,
    config.entryTimeframe,
    config.htfTimeframe,
    config.smcConfig
  );

  // Filter by confidence
  if (result.confidence < config.minConfidence || result.side === "neutral") {
    console.log(`[SMC-RUNNER] ${symbol} below threshold: ${result.confidence}% (${result.side})`);
    return null;
  }

  // Duplicate suppression
  const fp = fingerprint(result);
  if (isDuplicate(fp, config.signalExpiryMs)) {
    console.log(`[SMC-RUNNER] ${symbol} duplicate suppressed`);
    return null;
  }

  // Store in memory
  signalMemory.set(fp, { signal: result, createdAt: now, fingerprint: fp, expired: false });

  // Set cooldown
  cooldowns.set(symbol, now + config.cooldownMs);

  console.log(`[SMC-RUNNER] ⚡ ${symbol} ${result.side.toUpperCase()} signal: ${result.confidence}%`);
  return result;
};

// ── convert SMC result to SENTINEL X Signal for the bus ──
const smcToSignal = (r: SMCSignalResult): Signal => {
  const tfMap: Record<string, Timeframe> = {
    "1": "1M", "5": "5M", "15": "15M", "30": "30M", "60": "1H", "240": "4H", "1440": "1D",
  };
  const now = new Date();
  return {
    id: `SMC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    asset: r.symbol,
    vector: "Futures" as Vector,
    marketType: "REAL" as MarketType,
    strategy: `SMC-${r.scoreBreakdown.bosChoch > 5 ? "BOS" : "Structure"}`,
    direction: (r.side === "buy" ? "BUY" : "SELL") as Direction,
    issuedAt: now,
    executeAt: new Date(now.getTime() + 4 * 60_000),
    timeframe: tfMap[r.timeframe] || "15M",
    confidence: r.confidence,
    status: "PENDING",
    session: detectActiveSession(),
  };
};

// ── full scan cycle ──
export const runScanCycle = async (config: LiveRunnerConfig): Promise<SMCSignalResult[]> => {
  const results: SMCSignalResult[] = [];

  for (const symbol of config.symbols) {
    try {
      const result = await scanSymbol(symbol, config);
      if (result) {
        results.push(result);
        // Publish to SENTINEL X signal bus
        const signal = smcToSignal(result);
        publishSignal(signal);
      }
    } catch (err) {
      console.error(`[SMC-RUNNER] Error scanning ${symbol}:`, err);
    }
  }

  // Expire old signals
  const now = Date.now();
  for (const [fp, item] of signalMemory) {
    if (now - item.createdAt > config.signalExpiryMs) {
      item.expired = true;
    }
  }

  return results;
};

// ── start / stop ──
export const startLiveRunner = (config: LiveRunnerConfig = DEFAULT_RUNNER_CONFIG): void => {
  if (isRunning) {
    console.log("[SMC-RUNNER] Already running");
    return;
  }
  isRunning = true;
  console.log(`[SMC-RUNNER] 🚀 Starting: ${config.exchange} | ${config.symbols.join(", ")} | ${config.entryTimeframe}→${config.htfTimeframe}`);

  // Initial scan
  runScanCycle(config);

  // Recurring scans
  scanTimer = setInterval(() => runScanCycle(config), config.scanIntervalMs);
};

export const stopLiveRunner = (): void => {
  if (scanTimer) clearInterval(scanTimer);
  scanTimer = null;
  isRunning = false;
  console.log("[SMC-RUNNER] ⏹ Stopped");
};

export const isLiveRunnerActive = (): boolean => isRunning;

// ── getters ──
export const getSignalMemory = (): SignalMemoryItem[] =>
  Array.from(signalMemory.values()).filter((i) => !i.expired);

export const getActiveSignalCount = (): number =>
  getSignalMemory().length;

export const clearSignalMemory = (): void => {
  signalMemory.clear();
  cooldowns.clear();
};

// ── fusion scoring (JOYRIDE / TRADESCAN style) ──
export interface FusionInput {
  smcScore: number;          // 0-100 from SMC engine
  liveScannerScore: number;  // 0-100 from screen scanner
  imageVisionScore: number;  // 0-100 from chart scanner
  externalScore: number;     // 0-100 from external scanners
  momentumScore: number;     // 0-100 from candle momentum/volume
  joyrideScore?: number;     // 0-100 from JOYRIDE PRO prediction engine
  joyrideBias?: "bullish" | "bearish" | "neutral";
}

// Weights sum to 1.0 (JOYRIDE adds prediction-layer intelligence)
export const FUSION_WEIGHTS = {
  smc: 0.40,
  joyride: 0.15,
  liveScanner: 0.18,
  imageVision: 0.12,
  external: 0.08,
  momentum: 0.07,
};

export interface FusionOutput {
  score: number;
  tier: "STRONG" | "WATCHLIST" | "NO_TRADE";
  bias?: "bullish" | "bearish" | "neutral";
  contributions: Record<string, number>;
}

export const computeFusionScore = (input: FusionInput): FusionOutput => {
  const joyride = input.joyrideScore ?? 50; // neutral default if missing
  const contributions = {
    smc: input.smcScore * FUSION_WEIGHTS.smc,
    joyride: joyride * FUSION_WEIGHTS.joyride,
    liveScanner: input.liveScannerScore * FUSION_WEIGHTS.liveScanner,
    imageVision: input.imageVisionScore * FUSION_WEIGHTS.imageVision,
    external: input.externalScore * FUSION_WEIGHTS.external,
    momentum: input.momentumScore * FUSION_WEIGHTS.momentum,
  };
  const score = Math.round(
    Object.values(contributions).reduce((a, b) => a + b, 0)
  );
  const tier = score >= 75 ? "STRONG" : score >= 60 ? "WATCHLIST" : "NO_TRADE";
  return {
    score,
    tier,
    bias: input.joyrideBias,
    contributions: Object.fromEntries(
      Object.entries(contributions).map(([k, v]) => [k, Math.round(v * 100) / 100])
    ),
  };
};

// ── JOYRIDE prediction → fusion score adapter ──
// Converts a PredictionInfo-shaped object into a 0-100 score + directional bias.
export interface JoyridePredictionLike {
  nextCandleBias: string;
  continuationProbability: number;
  reversalProbability: number;
  pullbackProbability: number;
}

export const joyridePredictionToFusion = (
  p: JoyridePredictionLike
): { score: number; bias: "bullish" | "bearish" | "neutral" } => {
  // Score = strongest directional conviction, penalized by competing reversal/pullback risk
  const dominant = Math.max(p.continuationProbability, p.reversalProbability);
  const noise = Math.min(p.continuationProbability, p.reversalProbability);
  const pullbackPenalty = Math.max(0, p.pullbackProbability - 50) * 0.4;
  const raw = dominant - noise * 0.5 - pullbackPenalty;
  const score = Math.max(0, Math.min(100, Math.round(raw + 50 * (dominant / 100))));

  let bias: "bullish" | "bearish" | "neutral" = "neutral";
  const b = p.nextCandleBias.toLowerCase();
  if (b.includes("bullish")) bias = "bullish";
  else if (b.includes("bearish")) bias = "bearish";

  return { score, bias };
};
