// SENTINEL X - SMC Signal Engine (Core)
// Full 12-factor confluence scoring → signal generation
// Embedded module: does NOT replace existing signal engine

import {
  SMCCandle,
  SMCConfig,
  SMCSignalResult,
  SMCScoreBreakdown,
  TradePlan,
  DEFAULT_SMC_CONFIG,
} from "./types";
import {
  computeATR,
  detectVolumeSpike,
  detectSwings,
  detectMarketBias,
  detectStructureEvents,
  detectSupplyDemandZones,
  detectOrderBlocks,
  detectFairValueGaps,
  premiumDiscountArray,
  detectConfirmationCandle,
  detectLiquiditySweep,
  detectSession,
  zoneProximityScore,
  nearestZone,
} from "./indicators";

const safeDiv = (a: number, b: number) => (b !== 0 ? a / b : 0);

// ── trade plan builder ──
const buildTradePlan = (
  side: "buy" | "sell",
  entry: number,
  atr: number,
  demandZone: { low: number } | null,
  supplyZone: { low: number; high?: number } | null,
  bullishOB: { low: number } | null,
  bearishOB: { high: number } | null,
  pd: { rangeHigh: number; rangeLow: number },
  cfg: SMCConfig
): TradePlan | null => {
  if (entry <= 0) return null;
  const buffer = atr > 0 ? atr * cfg.stopBufferATR : entry * 0.002;

  if (side === "buy") {
    const floors = [demandZone?.low, bullishOB?.low].filter(Boolean) as number[];
    const sl = floors.length ? Math.min(...floors) - buffer : entry - Math.max(buffer, atr * 1.2);
    const risk = entry - sl;
    if (risk <= 0) return null;
    let tp = entry + risk * cfg.targetRRDefault;
    if (supplyZone && supplyZone.low > entry) tp = Math.max(tp, supplyZone.low);
    if (pd.rangeHigh > entry) tp = Math.max(tp, pd.rangeHigh);
    const rr = safeDiv(tp - entry, risk);
    return rr >= cfg.minRR ? { side: "buy", entry, stopLoss: sl, takeProfit: tp, riskReward: rr } : null;
  }

  // sell
  const caps = [supplyZone?.low ? (supplyZone as any).high ?? supplyZone.low : null, bearishOB?.high].filter(Boolean) as number[];
  const sl = caps.length ? Math.max(...caps) + buffer : entry + Math.max(buffer, atr * 1.2);
  const risk = sl - entry;
  if (risk <= 0) return null;
  let tp = entry - risk * cfg.targetRRDefault;
  if (demandZone && demandZone.low < entry) tp = Math.min(tp, demandZone.low);
  if (pd.rangeLow > 0 && pd.rangeLow < entry) tp = Math.min(tp, pd.rangeLow);
  const rr = safeDiv(entry - tp, risk);
  return rr >= cfg.minRR ? { side: "sell", entry, stopLoss: sl, takeProfit: tp, riskReward: rr } : null;
};

// ── main engine ──
export const generateSMCSignal = (
  symbol: string,
  entryCandles: SMCCandle[],
  htfCandles: SMCCandle[] | null,
  timeframe: string,
  htfTimeframe: string | null,
  config: SMCConfig = DEFAULT_SMC_CONFIG
): SMCSignalResult => {
  const reasons: string[] = [];
  const warnings: string[] = [];
  const w = config.weights;
  const score: SMCScoreBreakdown = {
    higherTimeframeAlignment: 0, marketStructure: 0, bosChoch: 0,
    zoneRespect: 0, orderBlock: 0, fairValueGap: 0, liquiditySweep: 0,
    premiumDiscount: 0, confirmationCandle: 0, sessionContext: 0,
    atrQuality: 0, volumeSpike: 0,
  };

  if (entryCandles.length < 20) {
    warnings.push("Insufficient candle data");
    return {
      symbol, timeframe, higherTimeframe: htfTimeframe, side: "neutral",
      confidence: 0, scoreBreakdown: score, tradePlan: null,
      marketBias: "neutral", session: "Off-hours", reasons, warnings, timestamp: Date.now(),
    };
  }

  const atr = computeATR(entryCandles, config.atrPeriod);
  const price = entryCandles[entryCandles.length - 1].close;
  const session = detectSession(entryCandles[entryCandles.length - 1].timestamp);

  // swings & structure
  const { highs, lows } = detectSwings(entryCandles, config.swingLookback);
  const bias = detectMarketBias(entryCandles, highs, lows);
  const structEvents = detectStructureEvents(entryCandles, highs, lows);

  // 1. HTF alignment
  if (htfCandles && htfCandles.length >= 20) {
    const htfSwings = detectSwings(htfCandles, config.swingLookback);
    const htfBias = detectMarketBias(htfCandles, htfSwings.highs, htfSwings.lows);
    if (htfBias === bias) {
      score.higherTimeframeAlignment = w.higherTimeframeAlignment;
      reasons.push(`HTF ${htfTimeframe} aligned: ${htfBias}`);
    } else {
      score.higherTimeframeAlignment = w.higherTimeframeAlignment * 0.2;
      warnings.push(`HTF divergence: ETF=${bias}, HTF=${htfBias}`);
    }
  } else {
    score.higherTimeframeAlignment = w.higherTimeframeAlignment * 0.3;
    warnings.push("No HTF data");
  }

  // 2. Market structure
  score.marketStructure = bias !== "neutral" ? w.marketStructure : w.marketStructure * 0.3;
  reasons.push(`Market bias: ${bias}`);

  // 3. BOS/CHOCH
  const recentEvents = structEvents.filter((e) => e.index >= entryCandles.length - 15);
  if (recentEvents.length) {
    const latestEvt = recentEvents[recentEvents.length - 1];
    const isBOS = latestEvt.kind === "BOS";
    score.bosChoch = isBOS ? w.bosChoch : w.bosChoch * 0.7;
    reasons.push(`${latestEvt.kind} ${latestEvt.side} at idx ${latestEvt.index}`);
  }

  // 4. Zones
  const { demand, supply } = detectSupplyDemandZones(entryCandles, highs, lows, atr);
  const nearDemand = nearestZone(demand, price);
  const nearSupply = nearestZone(supply, price);
  const demandProx = zoneProximityScore(nearDemand, price, atr, config.zoneProximityFactorATR);
  const supplyProx = zoneProximityScore(nearSupply, price, atr, config.zoneProximityFactorATR);
  score.zoneRespect = Math.max(demandProx, supplyProx) * w.zoneRespect;

  // 5. Order blocks
  const obs = detectOrderBlocks(entryCandles, structEvents, atr, config.obImpulseFactor);
  const nearBullOB = nearestZone(obs.bullish, price);
  const nearBearOB = nearestZone(obs.bearish, price);
  const obProx = Math.max(
    zoneProximityScore(nearBullOB, price, atr, config.zoneProximityFactorATR),
    zoneProximityScore(nearBearOB, price, atr, config.zoneProximityFactorATR)
  );
  score.orderBlock = obProx * w.orderBlock;
  if (obProx > 0.5) reasons.push("Price near order block");

  // 6. FVG
  const fvgs = detectFairValueGaps(entryCandles, atr, config.fvgMinSizeFactorATR);
  const nearBullFVG = nearestZone(fvgs.bullish, price);
  const nearBearFVG = nearestZone(fvgs.bearish, price);
  const fvgProx = Math.max(
    zoneProximityScore(nearBullFVG, price, atr, config.zoneProximityFactorATR),
    zoneProximityScore(nearBearFVG, price, atr, config.zoneProximityFactorATR)
  );
  score.fairValueGap = fvgProx * w.fairValueGap;

  // 7. Liquidity sweep
  const sweep = detectLiquiditySweep(entryCandles, highs, lows, atr, config.sweepToleranceFactorATR);
  if (sweep.buySideSweep || sweep.sellSideSweep) {
    score.liquiditySweep = sweep.reclaim ? w.liquiditySweep : w.liquiditySweep * 0.5;
    reasons.push(`Liquidity sweep ${sweep.side} (reclaim: ${sweep.reclaim})`);
  }

  // 8. Premium / discount
  const pd = premiumDiscountArray(highs, lows);
  if (pd.equilibrium > 0) {
    const inDiscount = price < pd.equilibrium;
    const inPremium = price > pd.equilibrium;
    if ((bias === "bullish" && inDiscount) || (bias === "bearish" && inPremium)) {
      score.premiumDiscount = w.premiumDiscount;
      reasons.push(inDiscount ? "Price in discount zone" : "Price in premium zone");
    } else {
      score.premiumDiscount = w.premiumDiscount * 0.3;
    }
  }

  // 9. Confirmation candle
  const confirm = detectConfirmationCandle(entryCandles, atr, config.confirmationBodyFactor, config.confirmationWickFactor);
  if (confirm.pattern) {
    score.confirmationCandle = confirm.strength * w.confirmationCandle;
    reasons.push(`Confirmation: ${confirm.pattern}`);
  }

  // 10. Session
  if (config.preferredSessions.includes(session)) {
    score.sessionContext = w.sessionContext;
  } else {
    score.sessionContext = w.sessionContext * 0.3;
    warnings.push(`Off-peak session: ${session}`);
  }

  // 11. ATR quality
  if (atr > 0) {
    const atrPct = (atr / price) * 100;
    score.atrQuality = atrPct > 0.1 ? w.atrQuality : w.atrQuality * 0.5;
  }

  // 12. Volume spike
  const vol = detectVolumeSpike(entryCandles, config.volumeMaPeriod);
  if (vol.spike) {
    score.volumeSpike = w.volumeSpike;
    reasons.push(`Volume spike: ${vol.ratio.toFixed(1)}x`);
  }

  // ── total score ──
  const totalWeight = Object.values(w).reduce((a, b) => a + b, 0);
  const rawScore = Object.values(score).reduce((a, b) => a + b, 0);
  const confidence = Math.round((rawScore / totalWeight) * 100);

  // ── determine side ──
  let side: "buy" | "sell" | "neutral" = "neutral";
  if (confidence >= 60) {
    if (bias === "bullish" || (confirm.bullish && !confirm.bearish)) side = "buy";
    else if (bias === "bearish" || (confirm.bearish && !confirm.bullish)) side = "sell";
    else side = bias === "bullish" ? "buy" : bias === "bearish" ? "sell" : "neutral";
  }

  // ── trade plan ──
  let tradePlan: TradePlan | null = null;
  if (side !== "neutral") {
    tradePlan = buildTradePlan(
      side, price, atr, nearDemand, nearSupply, nearBullOB, nearBearOB,
      pd, config
    );
    if (!tradePlan) warnings.push("Could not build valid trade plan (RR too low)");
  }

  return {
    symbol, timeframe, higherTimeframe: htfTimeframe, side,
    confidence, scoreBreakdown: score, tradePlan,
    marketBias: bias, session, reasons, warnings, timestamp: Date.now(),
  };
};
