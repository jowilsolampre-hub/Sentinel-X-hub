// SENTINEL X PRIME - OTC Data Honesty Layer
// Tags OTC price data as observed/derived with higher uncertainty thresholds

import { Signal, Vector, MarketType } from "@/types/trading";

export type DataSourceType = "INSTITUTIONAL" | "OBSERVED" | "DERIVED" | "SESSION_PATTERN";

export interface OTCDataQuality {
  sourceType: DataSourceType;
  uncertaintyLevel: "LOW" | "MEDIUM" | "HIGH" | "VERY_HIGH";
  reliabilityScore: number;  // 0-1
  disclaimer: string;
  validationThreshold: number;  // Higher = stricter
}

// Data quality profiles by market type
const DATA_QUALITY_PROFILES: Record<MarketType, OTCDataQuality> = {
  REAL: {
    sourceType: "INSTITUTIONAL",
    uncertaintyLevel: "LOW",
    reliabilityScore: 0.95,
    disclaimer: "Institutional-grade market data from regulated exchanges",
    validationThreshold: 0.85
  },
  OTC: {
    sourceType: "OBSERVED",
    uncertaintyLevel: "HIGH",
    reliabilityScore: 0.65,
    disclaimer: "OTC data is observed/derived from broker patterns. Non-institutional. Higher uncertainty.",
    validationThreshold: 0.92  // Stricter threshold for OTC
  }
};

// OTC-specific validation multipliers
const OTC_VALIDATION_RULES = {
  confidenceFloor: 0.95,           // Minimum confidence for OTC signals
  confidenceCeiling: 0.985,        // Cap OTC confidence (no fake 100%)
  rejectionThreshold: 0.92,        // Reject below this after adjustments
  uncertaintyPenalty: 0.03,        // Subtract from raw confidence
  volatilityPenalty: 0.02,         // Additional penalty for high volatility
  sessionMismatchPenalty: 0.05     // Penalty if session doesn't favor OTC
};

// Get data quality profile for signal
export const getDataQuality = (marketType: MarketType): OTCDataQuality => {
  return { ...DATA_QUALITY_PROFILES[marketType] };
};

// Apply OTC honesty adjustments to confidence
export const adjustOTCConfidence = (
  rawConfidence: number,
  marketType: MarketType,
  isVolatile: boolean = false,
  sessionFavorsOTC: boolean = true
): { adjustedConfidence: number; adjustments: string[] } => {
  if (marketType === "REAL") {
    return { adjustedConfidence: rawConfidence, adjustments: [] };
  }
  
  const adjustments: string[] = [];
  let adjustedConfidence = rawConfidence;
  
  // Apply uncertainty penalty
  adjustedConfidence -= OTC_VALIDATION_RULES.uncertaintyPenalty;
  adjustments.push(`-${OTC_VALIDATION_RULES.uncertaintyPenalty * 100}% uncertainty penalty`);
  
  // Apply volatility penalty if applicable
  if (isVolatile) {
    adjustedConfidence -= OTC_VALIDATION_RULES.volatilityPenalty;
    adjustments.push(`-${OTC_VALIDATION_RULES.volatilityPenalty * 100}% volatility penalty`);
  }
  
  // Apply session mismatch penalty
  if (!sessionFavorsOTC) {
    adjustedConfidence -= OTC_VALIDATION_RULES.sessionMismatchPenalty;
    adjustments.push(`-${OTC_VALIDATION_RULES.sessionMismatchPenalty * 100}% session mismatch`);
  }
  
  // Apply floor and ceiling
  adjustedConfidence = Math.max(OTC_VALIDATION_RULES.confidenceFloor, adjustedConfidence);
  adjustedConfidence = Math.min(OTC_VALIDATION_RULES.confidenceCeiling, adjustedConfidence);
  
  return { adjustedConfidence, adjustments };
};

// Validate signal against OTC honesty rules
export const validateOTCSignal = (signal: Signal): {
  isValid: boolean;
  reason: string;
  dataQuality: OTCDataQuality;
  adjustedConfidence: number;
} => {
  const dataQuality = getDataQuality(signal.marketType);
  
  // Apply confidence adjustments
  const { adjustedConfidence } = adjustOTCConfidence(
    signal.confidence / 100,  // Convert to 0-1 scale
    signal.marketType
  );
  
  // Check against rejection threshold
  if (adjustedConfidence < OTC_VALIDATION_RULES.rejectionThreshold) {
    return {
      isValid: false,
      reason: `Confidence ${(adjustedConfidence * 100).toFixed(1)}% below OTC threshold ${OTC_VALIDATION_RULES.rejectionThreshold * 100}%`,
      dataQuality,
      adjustedConfidence: adjustedConfidence * 100
    };
  }
  
  return {
    isValid: true,
    reason: "Signal passes OTC validation",
    dataQuality,
    adjustedConfidence: adjustedConfidence * 100
  };
};

// Check if vector is OTC
export const isOTCVector = (vector: Vector): boolean => {
  return vector === "OTC";
};

// Get OTC disclaimer for UI display
export const getOTCDisclaimer = (marketType: MarketType): string | null => {
  if (marketType === "REAL") {
    return null;
  }
  
  return DATA_QUALITY_PROFILES.OTC.disclaimer;
};

// Tag signal with data source metadata
export interface SignalWithMetadata extends Signal {
  dataQuality: OTCDataQuality;
  isOTC: boolean;
  rawConfidence: number;
  adjustedConfidence: number;
  honestyAdjustments: string[];
}

export const enrichSignalWithMetadata = (signal: Signal): SignalWithMetadata => {
  const isOTC = signal.marketType === "OTC";
  const dataQuality = getDataQuality(signal.marketType);
  
  const { adjustedConfidence, adjustments } = adjustOTCConfidence(
    signal.confidence / 100,
    signal.marketType
  );
  
  return {
    ...signal,
    dataQuality,
    isOTC,
    rawConfidence: signal.confidence,
    adjustedConfidence: adjustedConfidence * 100,
    honestyAdjustments: adjustments
  };
};

// Audit log entry for OTC transparency
export interface OTCAuditEntry {
  signalId: string;
  timestamp: Date;
  marketType: MarketType;
  dataSource: DataSourceType;
  rawConfidence: number;
  adjustedConfidence: number;
  adjustments: string[];
  validationResult: "APPROVED" | "REJECTED";
  reason: string;
}

// Generate audit entry for signal
export const generateOTCAuditEntry = (signal: Signal): OTCAuditEntry => {
  const validation = validateOTCSignal(signal);
  const { adjustments } = adjustOTCConfidence(signal.confidence / 100, signal.marketType);
  
  return {
    signalId: signal.id,
    timestamp: new Date(),
    marketType: signal.marketType,
    dataSource: validation.dataQuality.sourceType,
    rawConfidence: signal.confidence,
    adjustedConfidence: validation.adjustedConfidence,
    adjustments,
    validationResult: validation.isValid ? "APPROVED" : "REJECTED",
    reason: validation.reason
  };
};
