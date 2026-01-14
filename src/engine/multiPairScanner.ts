// SENTINEL X PRIME - Multi-Pair Scanner (v3)
// Scans ALL pairs (majors + minors) for OTC and REAL markets
// Now uses proper pattern recognition instead of random candle generation

import { Vector, MarketType, Signal, Session, Timeframe, Direction } from "@/types/trading";
import { getRealCandles, OTC_PAIRS, REAL_PAIRS, MarketCandle } from "./dataRouter";
import { 
  getGuruStrategies, 
  getActiveSessionOpen, 
  calculateProbabilityBoost,
  getOptimalStrategy,
  GuruStrategy 
} from "./guruStrategies";
import { getCurrentSelection } from "./marketSelector";
import { detectActiveSession } from "./sessionLock";
import { isAssetOnCooldown } from "./assetCooldown";
import { validateOTCSignal, adjustOTCConfidence } from "./otcHonestyLayer";
import { 
  analyzeOTCPattern, 
  getOptimalOTCPairs, 
  getOTCSignalQuality,
  updateMarketState 
} from "./otcPatternEngine";

// Scanner configuration
const SCAN_SPEED_MS = 600; // 0.6 seconds per asset
const BASE_PASS_RATE = 0.35; // 35% base
const SESSION_OPEN_PASS_RATE = 0.65; // 65% during session opens
const ACTIVE_SESSION_PASS_RATE = 0.50; // 50% during active sessions
const REFRACTORY_PERIOD_MS = 35000; // 30-40 seconds average

// OTC Signal quality threshold - only emit signals meeting this quality
const OTC_QUALITY_THRESHOLD = 0.55;

// Generate unique ID
const generateId = (): string => {
  return `SX-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Candle quality filters
const isStrongCandle = (candle: MarketCandle): boolean => {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  
  if (range === 0) return false;
  return (body / range) >= 0.6;
};

const isDoji = (candle: MarketCandle): boolean => {
  const body = Math.abs(candle.close - candle.open);
  const range = candle.high - candle.low;
  
  if (range === 0) return true;
  return (body / range) < 0.2;
};

// Price action patterns
const isBullishEngulfing = (prev: MarketCandle, curr: MarketCandle): boolean => {
  return (
    prev.close < prev.open &&
    curr.close > curr.open &&
    curr.close > prev.open &&
    curr.open < prev.close
  );
};

const isBearishEngulfing = (prev: MarketCandle, curr: MarketCandle): boolean => {
  return (
    prev.close > prev.open &&
    curr.close < curr.open &&
    curr.open > prev.close &&
    curr.close < prev.open
  );
};

// Simple indicators
const calculateRSI = (closes: number[], period: number = 14): number => {
  if (closes.length < period + 1) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = closes.length - period; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    if (change > 0) gains += change;
    else losses += Math.abs(change);
  }
  
  const avgGain = gains / period;
  const avgLoss = losses / period;
  
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
};

const calculateEMA = (closes: number[], period: number): number => {
  if (closes.length < period) return closes[closes.length - 1];
  
  const k = 2 / (period + 1);
  let ema = closes[0];
  
  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  
  return ema;
};

// Market structure detection
const hasHigherHighsLows = (candles: MarketCandle[]): boolean => {
  if (candles.length < 5) return false;
  
  const recent = candles.slice(-5);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  
  return highs[4] > highs[0] && lows[4] > lows[0];
};

const hasLowerHighsLows = (candles: MarketCandle[]): boolean => {
  if (candles.length < 5) return false;
  
  const recent = candles.slice(-5);
  const highs = recent.map(c => c.high);
  const lows = recent.map(c => c.low);
  
  return highs[4] < highs[0] && lows[4] < lows[0];
};

// OTC Strategy Analysis
const analyzeOTCPair = (
  pair: string, 
  candles: MarketCandle[],
  strategy: GuruStrategy
): { direction: Direction | null; confidence: number } => {
  if (candles.length < 3) return { direction: null, confidence: 0 };
  
  const closes = candles.map(c => c.close);
  const last = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  
  // Filter: Skip doji candles
  if (isDoji(last)) return { direction: null, confidence: 0 };
  
  const rsi = calculateRSI(closes);
  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);
  
  let direction: Direction | null = null;
  let baseConfidence = strategy.winRate;
  
  // BUY conditions
  if (
    rsi < 28 &&
    ema9 > ema21 &&
    isBullishEngulfing(prev, last) &&
    isStrongCandle(last)
  ) {
    direction = "BUY";
    baseConfidence += 0.5; // Bonus for all conditions met
  }
  
  // SELL conditions
  if (
    rsi > 72 &&
    ema9 < ema21 &&
    isBearishEngulfing(prev, last) &&
    isStrongCandle(last)
  ) {
    direction = "SELL";
    baseConfidence += 0.5;
  }
  
  return { direction, confidence: Math.min(baseConfidence, 99.9) };
};

// REAL Market Strategy Analysis
const analyzeRealPair = (
  pair: string,
  candles1m: MarketCandle[],
  candles5m: MarketCandle[],
  strategy: GuruStrategy
): { direction: Direction | null; confidence: number } => {
  if (candles1m.length < 3 || candles5m.length < 5) {
    return { direction: null, confidence: 0 };
  }
  
  const closes1m = candles1m.map(c => c.close);
  const closes5m = candles5m.map(c => c.close);
  const last = candles1m[candles1m.length - 1];
  
  // Filter: Skip weak candles
  if (!isStrongCandle(last)) return { direction: null, confidence: 0 };
  
  const rsi = calculateRSI(closes1m);
  const trendUp = hasHigherHighsLows(candles5m);
  const trendDown = hasLowerHighsLows(candles5m);
  
  let direction: Direction | null = null;
  let baseConfidence = strategy.winRate;
  
  // BUY: Trend up + RSI pullback
  if (trendUp && rsi < 40 && isStrongCandle(last)) {
    direction = "BUY";
    baseConfidence += 0.3;
  }
  
  // SELL: Trend down + RSI overbought
  if (trendDown && rsi > 60 && isStrongCandle(last)) {
    direction = "SELL";
    baseConfidence += 0.3;
  }
  
  return { direction, confidence: Math.min(baseConfidence, 99.9) };
};

// Scan OTC pairs using pattern recognition engine
export const scanOTCPairs = (pairs: string[] = OTC_PAIRS): Signal[] => {
  const signals: Signal[] = [];
  const session = detectActiveSession();
  const sessionOpen = getActiveSessionOpen();
  const strategies = getGuruStrategies("OTC");
  
  // Get optimal pairs for current time (prioritize these)
  const optimalPairs = getOptimalOTCPairs();
  const prioritizedPairs = [
    ...optimalPairs,
    ...pairs.filter(p => !optimalPairs.includes(p))
  ];
  
  // Determine pass rate
  let passRate = BASE_PASS_RATE;
  if (sessionOpen) {
    passRate = SESSION_OPEN_PASS_RATE;
    console.log(`[SCANNER] 🔥 Session open detected - boosted pass rate: ${passRate * 100}%`);
  }
  
  for (const pair of prioritizedPairs) {
    // Check cooldown
    if (isAssetOnCooldown(pair, "OTC")) {
      continue;
    }
    
    // Get signal quality for this pair
    const signalQuality = getOTCSignalQuality(pair);
    
    // Skip low quality signals
    if (signalQuality < OTC_QUALITY_THRESHOLD) {
      console.log(`[SCANNER] ⚠️ ${pair} quality ${(signalQuality * 100).toFixed(0)}% below threshold`);
      continue;
    }
    
    // Probability gate (adjusted by quality)
    const adjustedPassRate = passRate * (0.7 + signalQuality * 0.6);
    if (Math.random() > adjustedPassRate) continue;
    
    // Use pattern recognition instead of random candle analysis
    const patternResult = analyzeOTCPattern(pair);
    
    if (patternResult && patternResult.strength !== "WEAK") {
      const strategy = strategies[0]; // Top guru strategy
      const now = new Date();
      const executeAt = new Date(now.getTime() + 4 * 60 * 1000); // T+4
      
      const signal: Signal = {
        id: generateId(),
        asset: pair,
        vector: "OTC",
        marketType: "OTC",
        strategy: `${strategy.name} (${patternResult.pattern})`,
        direction: patternResult.direction,
        issuedAt: now,
        executeAt,
        timeframe: patternResult.timeframe,
        confidence: patternResult.confidence,
        status: "PENDING",
        session
      };
      
      // OTC validation
      const validation = validateOTCSignal(signal);
      if (validation.isValid) {
        signal.confidence = validation.adjustedConfidence;
        console.log(`[SCANNER] ✅ OTC Signal: ${pair} ${patternResult.direction} @ ${signal.confidence.toFixed(1)}% | Pattern: ${patternResult.pattern} | Reason: ${patternResult.reasoning}`);
        signals.push(signal);
        
        // Update market state for future pattern detection
        updateMarketState(pair, patternResult.direction, true);
      }
    }
  }
  
  return signals;
};

// Scan REAL market pairs
export const scanRealPairs = (
  pairs: string[] = REAL_PAIRS.Forex,
  vector: Vector = "Forex"
): Signal[] => {
  const signals: Signal[] = [];
  const session = detectActiveSession();
  const sessionOpen = getActiveSessionOpen();
  const strategies = getGuruStrategies("REAL").filter(s => s.vectors.includes(vector));
  
  if (strategies.length === 0) return signals;
  
  // Determine pass rate
  let passRate = BASE_PASS_RATE;
  if (sessionOpen && sessionOpen.bestVectors.includes(vector)) {
    passRate = SESSION_OPEN_PASS_RATE;
    console.log(`[SCANNER] 🔥 Session open + vector match - boosted pass rate: ${passRate * 100}%`);
  } else if (session !== "Closed") {
    passRate = ACTIVE_SESSION_PASS_RATE;
  }
  
  for (const pair of pairs) {
    // Check cooldown
    if (isAssetOnCooldown(pair, vector)) {
      continue;
    }
    
    // Probability gate
    if (Math.random() > passRate) continue;
    
    const candles1m = getRealCandles(pair, "1M");
    const candles5m = getRealCandles(pair, "5M");
    const strategy = strategies[0];
    
    const { direction, confidence } = analyzeRealPair(pair, candles1m, candles5m, strategy);
    
    if (direction) {
      const now = new Date();
      const executeAt = new Date(now.getTime() + 4 * 60 * 1000);
      
      const signal: Signal = {
        id: generateId(),
        asset: pair,
        vector,
        marketType: "REAL",
        strategy: strategy.name,
        direction,
        issuedAt: now,
        executeAt,
        timeframe: "15M",
        confidence,
        status: "PENDING",
        session
      };
      
      signals.push(signal);
    }
  }
  
  return signals;
};

// Score and rank signals
export const scoreSignal = (signal: Signal): number => {
  let score = 0;
  
  // Market type bonus
  if (signal.marketType === "REAL") score += 2;
  else score += 1;
  
  // Confidence bonus
  score += (signal.confidence - 95) / 5; // 0-1 bonus for 95-100%
  
  // Session bonus
  const sessionOpen = getActiveSessionOpen();
  if (sessionOpen && sessionOpen.session === signal.session) {
    score += 1.5;
  }
  
  return score;
};

// Full market scan
export const scanAllMarkets = (): Signal[] => {
  const selection = getCurrentSelection();
  let signals: Signal[] = [];
  
  if (selection.marketType === "OTC") {
    signals = scanOTCPairs();
  } else {
    // Scan all REAL vectors
    for (const vector of ["Forex", "Indices", "Commodities", "Futures"] as Vector[]) {
      const pairs = REAL_PAIRS[vector] || [];
      signals.push(...scanRealPairs(pairs, vector));
    }
  }
  
  // Sort by score (best first)
  return signals.sort((a, b) => scoreSignal(b) - scoreSignal(a));
};
