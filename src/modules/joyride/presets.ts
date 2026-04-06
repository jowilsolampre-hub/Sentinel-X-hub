// JOYRIDE PRO PACK - Preset Registry

import { JoyridePreset } from "./types";

export const JOYRIDE_PRESETS: Record<string, JoyridePreset> = {
  TURBO_10S: {
    id: "TURBO_10S",
    label: "Turbo 10s",
    description: "Very fast micro-momentum setup. High warning sensitivity. Frequently returns NO TRADE.",
    indicators: [
      { name: "EMA", period: 5 },
      { name: "EMA", period: 13 },
      { name: "RSI", period: 7 },
      { name: "Stochastic", fast: 5, slow: 3, signal: 3 },
    ],
    minConfirmations: 3,
    defaultTimeframe: "10s",
    defaultExpiry: "10s",
    sessionProfile: ["London", "NewYork"],
  },
  PRECISION_1M: {
    id: "PRECISION_1M",
    label: "Precision 1m",
    description: "Pullback continuation, squeeze breaks, rejection bounces on 1-minute charts.",
    indicators: [
      { name: "EMA", period: 9 },
      { name: "EMA", period: 21 },
      { name: "RSI", period: 14 },
      { name: "Bollinger Bands", period: 20, stdDev: 2 },
    ],
    minConfirmations: 3,
    defaultTimeframe: "1m",
    defaultExpiry: "1-3m",
    sessionProfile: ["London", "NewYork", "Tokyo"],
  },
  SESSION_HUNTER_2M: {
    id: "SESSION_HUNTER_2M",
    label: "Session Hunter 2m",
    description: "Active-session only. Trend + volatility + momentum alignment with strict pair selection.",
    indicators: [
      { name: "EMA", period: 20 },
      { name: "EMA", period: 50 },
      { name: "RSI", period: 14 },
      { name: "MACD", fast: 12, slow: 26, signal: 9 },
      { name: "ATR", period: 14 },
    ],
    minConfirmations: 4,
    defaultTimeframe: "1m",
    defaultExpiry: "2m",
    sessionProfile: ["London", "NewYork"],
  },
  TREND_SYNC_5M: {
    id: "TREND_SYNC_5M",
    label: "Trend Sync 5m",
    description: "Major trend alignment with pullback-to-trend and breakout continuation.",
    indicators: [
      { name: "EMA", period: 20 },
      { name: "EMA", period: 50 },
      { name: "EMA", period: 200 },
      { name: "RSI", period: 14 },
      { name: "Supertrend", period: 10, stdDev: 3 },
    ],
    minConfirmations: 4,
    defaultTimeframe: "5m",
    defaultExpiry: "5-15m",
    sessionProfile: ["London", "NewYork"],
  },
  MA_RSI_FUSION: {
    id: "MA_RSI_FUSION",
    label: "MA + RSI Fusion",
    description: "Moving average stack + RSI cross/hold for clear directional bias.",
    indicators: [
      { name: "EMA", period: 8 },
      { name: "EMA", period: 21 },
      { name: "SMA", period: 50 },
      { name: "RSI", period: 14, levels: [30, 50, 70] },
    ],
    minConfirmations: 3,
    defaultTimeframe: "1m",
    defaultExpiry: "2-5m",
    sessionProfile: ["London", "NewYork", "Tokyo", "Sydney"],
  },
  SUPER_INDICATOR_MIX: {
    id: "SUPER_INDICATOR_MIX",
    label: "Super Indicator Mix",
    description: "Confluence-heavy preset. Requires 4 of 5 confirmations minimum.",
    indicators: [
      { name: "EMA", period: 9 },
      { name: "EMA", period: 21 },
      { name: "RSI", period: 14 },
      { name: "MACD", fast: 12, slow: 26, signal: 9 },
      { name: "Bollinger Bands", period: 20, stdDev: 2 },
    ],
    minConfirmations: 4,
    defaultTimeframe: "1m",
    defaultExpiry: "2-5m",
    sessionProfile: ["London", "NewYork", "Tokyo"],
  },
  PRIVATE_METHOD: {
    id: "PRIVATE_METHOD",
    label: "Private Method",
    description: "Rare setup mode. Only fires when volatility, structure, and confirmation align.",
    indicators: [
      { name: "EMA", period: 20 },
      { name: "EMA", period: 50 },
      { name: "RSI", period: 14 },
      { name: "Bollinger Bands", period: 20, stdDev: 2 },
      { name: "ATR", period: 14 },
    ],
    minConfirmations: 4,
    defaultTimeframe: "1m",
    defaultExpiry: "2-5m",
    sessionProfile: ["London", "NewYork"],
  },
  SAFE_MODE: {
    id: "SAFE_MODE",
    label: "Safe Mode",
    description: "Lowest-risk behavior. Stricter filters, higher thresholds, mandatory session filter.",
    indicators: [
      { name: "EMA", period: 21 },
      { name: "EMA", period: 50 },
      { name: "RSI", period: 14 },
      { name: "Bollinger Bands", period: 20, stdDev: 2 },
    ],
    minConfirmations: 4,
    defaultTimeframe: "5m",
    defaultExpiry: "5-15m",
    sessionProfile: ["London", "NewYork"],
  },
};

export const getPreset = (id: string): JoyridePreset => {
  return JOYRIDE_PRESETS[id] || JOYRIDE_PRESETS.SAFE_MODE;
};

export const getAllPresets = (): JoyridePreset[] => Object.values(JOYRIDE_PRESETS);
