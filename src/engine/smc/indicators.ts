// SENTINEL X - SMC Indicators
// ATR, volume, swing detection, market structure

import {
  SMCCandle,
  SwingPoint,
  StructureEvent,
  ConfirmationResult,
  SMCZone,
} from "./types";

// ── helpers ──
const safeDiv = (a: number, b: number) => (b !== 0 ? a / b : 0);
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const mean = (v: number[]) => (v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0);

const isBullish = (c: SMCCandle) => c.close > c.open;
const isBearish = (c: SMCCandle) => c.close < c.open;
const body = (c: SMCCandle) => Math.abs(c.close - c.open);
const range = (c: SMCCandle) => Math.max(0, c.high - c.low);
const upperWick = (c: SMCCandle) => c.high - Math.max(c.open, c.close);
const lowerWick = (c: SMCCandle) => Math.min(c.open, c.close) - c.low;

// ── session ──
export const detectSession = (timestampMs: number): string => {
  const hour = new Date(timestampMs).getUTCHours();
  if (hour >= 0 && hour < 7) return "Asia";
  if (hour >= 7 && hour < 13) return "London";
  if (hour >= 13 && hour < 22) return "New York";
  return "Off-hours";
};

// ── ATR ──
export const computeATR = (candles: SMCCandle[], period = 14): number => {
  if (candles.length < period + 1) return 0;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  return mean(trs.slice(-period));
};

// ── volume ──
export const detectVolumeSpike = (candles: SMCCandle[], period = 20): { spike: boolean; ratio: number } => {
  if (candles.length < Math.max(2, period)) return { spike: false, ratio: 0 };
  const baseline = mean(candles.slice(-(period + 1), -1).map((c) => c.volume));
  if (baseline <= 0) return { spike: false, ratio: 0 };
  const ratio = candles[candles.length - 1].volume / baseline;
  return { spike: ratio >= 1.5, ratio };
};

// ── swings ──
export const detectSwings = (
  candles: SMCCandle[],
  lookback = 3
): { highs: SwingPoint[]; lows: SwingPoint[] } => {
  const highs: SwingPoint[] = [];
  const lows: SwingPoint[] = [];
  if (candles.length < 2 * lookback + 1) return { highs, lows };

  for (let i = lookback; i < candles.length - lookback; i++) {
    const center = candles[i];
    const neighbours = [
      ...candles.slice(i - lookback, i),
      ...candles.slice(i + 1, i + 1 + lookback),
    ];
    if (neighbours.every((c) => center.high > c.high))
      highs.push({ index: i, price: center.high, kind: "high" });
    if (neighbours.every((c) => center.low < c.low))
      lows.push({ index: i, price: center.low, kind: "low" });
  }
  return { highs, lows };
};

// ── market bias ──
export const detectMarketBias = (
  candles: SMCCandle[],
  highs: SwingPoint[],
  lows: SwingPoint[]
): "bullish" | "bearish" | "neutral" => {
  if (highs.length < 2 || lows.length < 2) {
    if (candles.length >= 2) return candles[candles.length - 1].close >= candles[0].close ? "bullish" : "bearish";
    return "neutral";
  }
  const hh = highs[highs.length - 1].price > highs[highs.length - 2].price;
  const hl = lows[lows.length - 1].price > lows[lows.length - 2].price;
  const lh = highs[highs.length - 1].price < highs[highs.length - 2].price;
  const ll = lows[lows.length - 1].price < lows[lows.length - 2].price;
  if (hh && hl) return "bullish";
  if (lh && ll) return "bearish";
  return "neutral";
};

// ── BOS / CHOCH ──
export const detectStructureEvents = (
  candles: SMCCandle[],
  highs: SwingPoint[],
  lows: SwingPoint[]
): StructureEvent[] => {
  let bias = detectMarketBias(candles, highs, lows);
  const sortedHighs = [...highs].sort((a, b) => a.index - b.index);
  const sortedLows = [...lows].sort((a, b) => a.index - b.index);
  const events: StructureEvent[] = [];
  const seen = new Set<string>();

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    const priorHighs = sortedHighs.filter((s) => s.index < i);
    const priorLows = sortedLows.filter((s) => s.index < i);

    if (priorHighs.length) {
      const last = priorHighs[priorHighs.length - 1];
      if (c.close > last.price) {
        const kind = bias === "bullish" ? "BOS" : "CHOCH";
        const key = `${i}:${kind}:bullish`;
        if (!seen.has(key)) {
          seen.add(key);
          events.push({ index: i, kind, side: "bullish", brokenPrice: last.price });
        }
        bias = "bullish";
      }
    }
    if (priorLows.length) {
      const last = priorLows[priorLows.length - 1];
      if (c.close < last.price) {
        const kind = bias === "bearish" ? "BOS" : "CHOCH";
        const key = `${i}:${kind}:bearish`;
        if (!seen.has(key)) {
          seen.add(key);
          events.push({ index: i, kind, side: "bearish", brokenPrice: last.price });
        }
        bias = "bearish";
      }
    }
  }
  return events;
};

// ── supply / demand zones ──
export const detectSupplyDemandZones = (
  candles: SMCCandle[],
  highs: SwingPoint[],
  lows: SwingPoint[],
  atr: number
): { demand: SMCZone[]; supply: SMCZone[] } => {
  const pad = Math.max(atr * 0.25, 1e-9);
  const demand: SMCZone[] = lows.slice(-10).map((s) => {
    const c = candles[s.index];
    return {
      kind: "demand", side: "bullish",
      low: Math.max(0, c.low - pad),
      high: c.close > c.low ? c.close : c.high,
      startIndex: Math.max(0, s.index - 2), endIndex: s.index,
      strength: 1, metadata: { fromSwing: s.index },
    };
  });
  const supply: SMCZone[] = highs.slice(-10).map((s) => {
    const c = candles[s.index];
    return {
      kind: "supply", side: "bearish",
      low: c.close < c.high ? c.close : c.low,
      high: c.high + pad,
      startIndex: Math.max(0, s.index - 2), endIndex: s.index,
      strength: 1, metadata: { fromSwing: s.index },
    };
  });
  return { demand, supply };
};

// ── order blocks ──
export const detectOrderBlocks = (
  candles: SMCCandle[],
  events: StructureEvent[],
  atr: number,
  impulseFactor = 1.2
): { bullish: SMCZone[]; bearish: SMCZone[] } => {
  const bullishOBs: SMCZone[] = [];
  const bearishOBs: SMCZone[] = [];

  for (const evt of events.slice(-20)) {
    const idx = evt.index;
    if (idx <= 0 || idx >= candles.length) continue;
    const impulse = range(candles[idx]);
    if (atr > 0 && impulse < atr * impulseFactor) continue;

    const start = Math.max(0, idx - 8);
    if (evt.side === "bullish") {
      for (let j = idx - 1; j >= start; j--) {
        if (isBearish(candles[j])) {
          const ob = candles[j];
          bullishOBs.push({
            kind: "order_block", side: "bullish",
            low: ob.low, high: Math.max(ob.open, ob.close),
            startIndex: j, endIndex: idx,
            strength: Math.min(2, safeDiv(impulse, atr)),
            metadata: { event: evt.kind },
          });
          break;
        }
      }
    } else {
      for (let j = idx - 1; j >= start; j--) {
        if (isBullish(candles[j])) {
          const ob = candles[j];
          bearishOBs.push({
            kind: "order_block", side: "bearish",
            low: Math.min(ob.open, ob.close), high: ob.high,
            startIndex: j, endIndex: idx,
            strength: Math.min(2, safeDiv(impulse, atr)),
            metadata: { event: evt.kind },
          });
          break;
        }
      }
    }
  }
  return { bullish: bullishOBs, bearish: bearishOBs };
};

// ── fair value gaps ──
export const detectFairValueGaps = (
  candles: SMCCandle[],
  atr: number,
  minSizeFactor = 0.08
): { bullish: SMCZone[]; bearish: SMCZone[] } => {
  const minGap = atr * minSizeFactor;
  const bullish: SMCZone[] = [];
  const bearish: SMCZone[] = [];

  for (let i = 2; i < candles.length; i++) {
    const c1 = candles[i - 2], c3 = candles[i];
    const bullGap = c3.low - c1.high;
    if (bullGap > minGap) {
      bullish.push({
        kind: "fvg", side: "bullish",
        low: c1.high, high: c3.low,
        startIndex: i - 2, endIndex: i,
        strength: safeDiv(bullGap, atr),
        metadata: { middleIndex: i - 1 },
      });
    }
    const bearGap = c1.low - c3.high;
    if (bearGap > minGap) {
      bearish.push({
        kind: "fvg", side: "bearish",
        low: c3.high, high: c1.low,
        startIndex: i - 2, endIndex: i,
        strength: safeDiv(bearGap, atr),
        metadata: { middleIndex: i - 1 },
      });
    }
  }
  return { bullish, bearish };
};

// ── premium / discount ──
export const premiumDiscountArray = (
  highs: SwingPoint[],
  lows: SwingPoint[]
): { rangeHigh: number; rangeLow: number; equilibrium: number } => {
  if (!highs.length || !lows.length) return { rangeHigh: 0, rangeLow: 0, equilibrium: 0 };
  const rh = highs[highs.length - 1].price;
  const rl = lows[lows.length - 1].price;
  const high = Math.max(rh, rl), low = Math.min(rh, rl);
  return { rangeHigh: high, rangeLow: low, equilibrium: (high + low) / 2 };
};

// ── confirmation candle ──
export const detectConfirmationCandle = (
  candles: SMCCandle[],
  atr: number,
  bodyFactor = 0.45,
  wickFactor = 0.30
): ConfirmationResult => {
  if (candles.length < 2) return { bullish: false, bearish: false, pattern: null, strength: 0 };
  const c = candles[candles.length - 1];
  const p = candles[candles.length - 2];
  const minBody = atr * bodyFactor;
  const wickRef = atr * wickFactor;

  if (isBullish(c) && isBearish(p) && c.close >= p.open && c.open <= p.close && body(c) >= minBody)
    return { bullish: true, bearish: false, pattern: "bullish_engulfing", strength: 1 };
  if (isBearish(c) && isBullish(p) && c.open >= p.close && c.close <= p.open && body(c) >= minBody)
    return { bullish: false, bearish: true, pattern: "bearish_engulfing", strength: 1 };
  if (isBullish(c) && lowerWick(c) > Math.max(body(c) * 1.5, wickRef))
    return { bullish: true, bearish: false, pattern: "bullish_rejection", strength: 0.75 };
  if (isBearish(c) && upperWick(c) > Math.max(body(c) * 1.5, wickRef))
    return { bullish: false, bearish: true, pattern: "bearish_rejection", strength: 0.75 };

  return { bullish: false, bearish: false, pattern: null, strength: 0 };
};

// ── liquidity sweep ──
export const detectLiquiditySweep = (
  candles: SMCCandle[],
  highs: SwingPoint[],
  lows: SwingPoint[],
  atr: number,
  toleranceFactor = 0.15
): { buySideSweep: boolean; sellSideSweep: boolean; reclaim: boolean; side: "bullish" | "bearish" | null } => {
  if (candles.length < 2) return { buySideSweep: false, sellSideSweep: false, reclaim: false, side: null };
  const c = candles[candles.length - 1];
  const tol = atr * toleranceFactor;
  let result = { buySideSweep: false, sellSideSweep: false, reclaim: false, side: null as "bullish" | "bearish" | null };

  if (highs.length) {
    const sh = highs[highs.length - 1].price;
    if (c.high > sh && c.close < sh + tol) {
      result = { buySideSweep: true, sellSideSweep: false, reclaim: c.close < sh, side: "bearish" };
    }
  }
  if (lows.length) {
    const sl = lows[lows.length - 1].price;
    if (c.low < sl && c.close > sl - tol) {
      result = { buySideSweep: result.buySideSweep, sellSideSweep: true, reclaim: c.close > sl, side: "bullish" };
    }
  }
  return result;
};

// ── zone proximity ──
export const zoneProximityScore = (zone: SMCZone | null, price: number, atr: number, factor: number): number => {
  if (!zone) return 0;
  if (price >= zone.low && price <= zone.high) return 1;
  if (atr <= 0) return 0;
  const dist = Math.min(Math.abs(price - zone.low), Math.abs(price - zone.high));
  return clamp(1 - safeDiv(dist, atr * factor), 0, 1);
};

export const nearestZone = (zones: SMCZone[], price: number): SMCZone | null => {
  if (!zones.length) return null;
  return zones.reduce((best, z) => {
    const d = Math.min(Math.abs(price - z.low), Math.abs(price - z.high));
    const bd = Math.min(Math.abs(price - best.low), Math.abs(price - best.high));
    return d < bd ? z : best;
  });
};
