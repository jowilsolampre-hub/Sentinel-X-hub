// SENTINEL X PRIME - Asset-Level Cooldown Manager
// Each asset has independent cooldown after completion, invalidation, or loss

import { Vector } from "@/types/trading";

export type CooldownReason = "COMPLETION" | "INVALIDATION" | "LOSS" | "MANUAL";

interface AssetCooldownEntry {
  asset: string;
  vector: Vector;
  cooldownUntil: Date;
  reason: CooldownReason;
  signalId: string;
  createdAt: Date;
  refractoryCount: number;
}

// Cooldown durations in milliseconds based on reason
const COOLDOWN_DURATIONS: Record<CooldownReason, { base: number; variance: number }> = {
  COMPLETION: { base: 30000, variance: 30000 },    // 30-60 seconds after completion
  INVALIDATION: { base: 45000, variance: 30000 },  // 45-75 seconds after invalidation
  LOSS: { base: 120000, variance: 60000 },         // 2-3 minutes after loss (stricter)
  MANUAL: { base: 300000, variance: 0 }            // 5 minutes manual cooldown
};

// Asset cooldown registry
const cooldownRegistry: Map<string, AssetCooldownEntry> = new Map();

// Get cooldown key
const getCooldownKey = (asset: string, vector: Vector): string => {
  return `${vector}:${asset}`;
};

// Set asset cooldown
export const setAssetCooldown = (
  asset: string,
  vector: Vector,
  reason: CooldownReason,
  signalId: string
): AssetCooldownEntry => {
  const key = getCooldownKey(asset, vector);
  const now = new Date();
  
  const duration = COOLDOWN_DURATIONS[reason];
  const cooldownMs = duration.base + Math.random() * duration.variance;
  
  // Get existing refractory count
  const existing = cooldownRegistry.get(key);
  const refractoryCount = (existing?.refractoryCount || 0) + 1;
  
  // Apply refractory multiplier for repeated signals on same asset
  const refractoryMultiplier = Math.min(refractoryCount * 0.2, 1); // Max 2x cooldown
  const adjustedCooldownMs = cooldownMs * (1 + refractoryMultiplier);
  
  const entry: AssetCooldownEntry = {
    asset,
    vector,
    cooldownUntil: new Date(now.getTime() + adjustedCooldownMs),
    reason,
    signalId,
    createdAt: now,
    refractoryCount
  };
  
  cooldownRegistry.set(key, entry);
  
  console.log(`[COOLDOWN] ${asset} (${vector}) locked for ${Math.round(adjustedCooldownMs / 1000)}s - Reason: ${reason}`);
  
  return entry;
};

// Check if asset is on cooldown
export const isAssetOnCooldown = (asset: string, vector: Vector): boolean => {
  const key = getCooldownKey(asset, vector);
  const entry = cooldownRegistry.get(key);
  
  if (!entry) return false;
  
  return new Date() < entry.cooldownUntil;
};

// Get cooldown info for asset
export const getAssetCooldownInfo = (asset: string, vector: Vector): AssetCooldownEntry | null => {
  const key = getCooldownKey(asset, vector);
  const entry = cooldownRegistry.get(key);
  
  if (!entry || new Date() >= entry.cooldownUntil) {
    return null;
  }
  
  return { ...entry };
};

// Get remaining cooldown time in milliseconds
export const getRemainingCooldown = (asset: string, vector: Vector): number => {
  const entry = getAssetCooldownInfo(asset, vector);
  
  if (!entry) return 0;
  
  return Math.max(0, entry.cooldownUntil.getTime() - Date.now());
};

// Get all assets currently on cooldown
export const getAllCooldowns = (): AssetCooldownEntry[] => {
  const now = new Date();
  const activeCooldowns: AssetCooldownEntry[] = [];
  
  cooldownRegistry.forEach((entry) => {
    if (now < entry.cooldownUntil) {
      activeCooldowns.push({ ...entry });
    }
  });
  
  return activeCooldowns;
};

// Get available assets (not on cooldown)
export const getAvailableAssets = (assets: string[], vector: Vector): string[] => {
  return assets.filter(asset => !isAssetOnCooldown(asset, vector));
};

// Clear cooldown for specific asset
export const clearAssetCooldown = (asset: string, vector: Vector): void => {
  const key = getCooldownKey(asset, vector);
  cooldownRegistry.delete(key);
  console.log(`[COOLDOWN] ${asset} (${vector}) cooldown cleared`);
};

// Reset all cooldowns
export const resetAllCooldowns = (): void => {
  const count = cooldownRegistry.size;
  cooldownRegistry.clear();
  console.log(`[COOLDOWN] All cooldowns cleared (${count} entries)`);
};

// Clean expired cooldowns (maintenance)
export const cleanExpiredCooldowns = (): number => {
  const now = new Date();
  let cleaned = 0;
  
  cooldownRegistry.forEach((entry, key) => {
    if (now >= entry.cooldownUntil) {
      cooldownRegistry.delete(key);
      cleaned++;
    }
  });
  
  return cleaned;
};
