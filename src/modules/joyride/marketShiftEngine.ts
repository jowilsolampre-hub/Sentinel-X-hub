// JOYRIDE PRO PACK - Market Shift Engine
// Detects regime shifts across consecutive frames

import { MemoryFrame } from "./memoryEngine";

export interface MarketShift {
  shiftDetected: boolean;
  shiftType: string;
  shiftStrength: number;
  regimeNow: string;
  regimePrev: string;
  meaning: string;
  volatilityDelta: number;
  structureDelta: number;
  falseBreakDelta: number;
}

export function detectMarketShift(frames: MemoryFrame[]): MarketShift {
  if (frames.length < 2) {
    return {
      shiftDetected: false,
      shiftType: "insufficient_memory",
      shiftStrength: 0,
      regimeNow: frames.length > 0 ? frames[frames.length - 1].trendState : "unknown",
      regimePrev: "unknown",
      meaning: "Not enough memory to determine shift.",
      volatilityDelta: 0,
      structureDelta: 0,
      falseBreakDelta: 0,
    };
  }

  const prev = frames[frames.length - 2];
  const curr = frames[frames.length - 1];

  const volDelta = curr.volatilityScore - prev.volatilityScore;
  const structDelta = curr.structureClarity - prev.structureClarity;
  const fbrDelta = curr.falseBreakRisk - prev.falseBreakRisk;

  let shiftDetected = false;
  let shiftType = "stable";
  let shiftStrength = 0;
  let meaning = "Market conditions appear stable.";

  if (prev.trendState === "range" && (curr.trendState === "up" || curr.trendState === "down") && volDelta > 8) {
    shiftDetected = true;
    shiftType = "range_to_breakout";
    shiftStrength = Math.min(100, Math.round(Math.abs(volDelta) + Math.abs(structDelta)));
    meaning = "Breakout conditions may be forming from a prior range.";
  } else if ((prev.trendState === "up" || prev.trendState === "down") && curr.trendState === "range") {
    shiftDetected = true;
    shiftType = "trend_to_range";
    shiftStrength = Math.min(100, Math.round(Math.abs(structDelta) + 15));
    meaning = "Trend appears to be weakening into range behaviour.";
  } else if ((prev.trendState === "up" || prev.trendState === "down") && curr.exhaustionRisk > prev.exhaustionRisk + 10) {
    shiftDetected = true;
    shiftType = "trend_to_exhaustion";
    shiftStrength = Math.min(100, Math.round(curr.exhaustionRisk - prev.exhaustionRisk + 20));
    meaning = "Trend exhaustion risk is rising; pullback or reversal becomes more likely.";
  } else if (prev.volatilityScore < 50 && curr.volatilityScore >= 65) {
    shiftDetected = true;
    shiftType = "compression_to_expansion";
    shiftStrength = Math.min(100, Math.round(curr.volatilityScore - prev.volatilityScore + 10));
    meaning = "Volatility expansion detected; larger moves may be starting.";
  } else if (prev.falseBreakRisk + 12 < curr.falseBreakRisk) {
    shiftDetected = true;
    shiftType = "clean_to_fakeout_risk";
    shiftStrength = Math.min(100, Math.round(curr.falseBreakRisk - prev.falseBreakRisk + 10));
    meaning = "False-break risk is increasing; breakout trades become less trustworthy.";
  }

  return {
    shiftDetected,
    shiftType,
    shiftStrength,
    regimeNow: curr.trendState,
    regimePrev: prev.trendState,
    meaning,
    volatilityDelta: Math.round(volDelta * 100) / 100,
    structureDelta: Math.round(structDelta * 100) / 100,
    falseBreakDelta: Math.round(fbrDelta * 100) / 100,
  };
}
