// JOYRIDE PRO PACK - Pair Ranking Engine

import { PairRank } from "./types";
import { ChartState } from "./engine";

const COMMON_PAIRS = [
  "EUR/USD", "GBP/USD", "USD/JPY", "AUD/USD", "USD/CAD",
  "EUR/GBP", "GBP/JPY", "EUR/JPY", "NZD/USD", "USD/CHF",
];

export function rankPairs(pairs: string[], chart: Partial<ChartState>): PairRank[] {
  const pairsToRank = pairs.length > 0 ? pairs : COMMON_PAIRS;

  return pairsToRank.map(symbol => {
    // Simulated scoring based on available chart state
    const trendCleanliness = chart.trendDirection === "up" || chart.trendDirection === "down" ? 80 : 40;
    const bodyWickRatio = chart.bodyWickRatio ? Math.min(100, chart.bodyWickRatio * 50) : 50;
    const volatility = chart.volatility ? Math.min(100, chart.volatility * 100) : 50;
    const falseBreaks = Math.random() * 30; // Would come from historical data
    const structureClarity = chart.candleStrength ? chart.candleStrength * 100 : 50;
    const sessionFit = 60 + Math.random() * 30;

    const score = Math.round(
      (trendCleanliness * 0.25 +
        bodyWickRatio * 0.15 +
        volatility * 0.15 +
        (100 - falseBreaks) * 0.15 +
        structureClarity * 0.15 +
        sessionFit * 0.15)
    );

    let recommendation: "TOP" | "OK" | "AVOID" = "OK";
    if (score >= 70) recommendation = "TOP";
    if (score < 45) recommendation = "AVOID";

    return {
      symbol,
      score,
      trendCleanliness,
      bodyWickRatio,
      volatility,
      falseBreaks,
      structureClarity,
      sessionFit,
      recommendation,
    };
  }).sort((a, b) => b.score - a.score);
}
