// JOYRIDE PRO PACK - Scanner Fusion Engine
// Fuses multiple scanner inputs into one consensus decision

export interface FusionSourceItem {
  source: string;
  direction: string;
  confidence: number;
  effectiveWeight: number;
  status: string;
  preset?: string;
}

export interface FusionResult {
  status: string;
  finalDirection: "CALL" | "PUT" | "NO_TRADE";
  finalConfidence: number;
  consensusStrength: number;
  reason: string;
  agreedSources: string[];
  conflictingSources: string[];
  sourceBreakdown: FusionSourceItem[];
  scoreDetail: {
    callScore: number;
    putScore: number;
    noTradeScore: number;
    callRatio: number;
    putRatio: number;
    noTradeRatio: number;
  };
}

interface ScannerInput {
  source: string;
  status?: string;
  direction: string;
  confidence: number;
  preset?: string;
  marketType?: string;
  refreshDelayMs?: number;
  falseBreakRisk?: number;
  isStaleFrame?: boolean;
}

function sourceWeight(sourceName: string): number {
  const name = (sourceName || "").toLowerCase();
  if (["live_screen", "screen", "broker_screen"].includes(name)) return 1.0;
  if (["sentinel", "tradescan_pro", "external_scanner"].includes(name)) return 0.9;
  if (["upload", "image_upload", "uploaded_image"].includes(name)) return 0.8;
  return 0.7;
}

function qualityPenalty(result: ScannerInput): number {
  let penalty = 0;
  if (result.confidence < 60) penalty += 0.2;
  if (result.confidence < 45) penalty += 0.2;
  if (result.isStaleFrame) penalty += 0.35;
  if ((result.refreshDelayMs || 0) > 800) penalty += 0.25;
  if (result.marketType === "otc") penalty += 0.1;
  if ((result.falseBreakRisk || 50) > 55) penalty += 0.15;
  if (result.status === "NO_TRADE") penalty += 0.1;
  return Math.min(penalty, 0.75);
}

function effectiveWeight(result: ScannerInput): number {
  const base = sourceWeight(result.source);
  const conf = result.confidence / 100;
  const pen = qualityPenalty(result);
  return Math.round(base * Math.max(0.15, conf) * (1 - pen) * 10000) / 10000;
}

export function fuseScannersResults(results: ScannerInput[]): FusionResult {
  if (results.length === 0) {
    return {
      status: "NO_TRADE",
      finalDirection: "NO_TRADE",
      finalConfidence: 0,
      consensusStrength: 0,
      reason: "No scanner inputs received.",
      agreedSources: [],
      conflictingSources: [],
      sourceBreakdown: [],
      scoreDetail: { callScore: 0, putScore: 0, noTradeScore: 0, callRatio: 0, putRatio: 0, noTradeRatio: 0 },
    };
  }

  let callScore = 0, putScore = 0, noTradeScore = 0;
  const sourceBreakdown: FusionSourceItem[] = [];

  for (const item of results) {
    const weight = effectiveWeight(item);
    const dir = item.direction.toUpperCase();

    if (dir === "CALL" || dir === "BUY") callScore += weight;
    else if (dir === "PUT" || dir === "SELL") putScore += weight;
    else noTradeScore += weight;

    sourceBreakdown.push({
      source: item.source,
      direction: item.direction,
      confidence: item.confidence,
      effectiveWeight: weight,
      status: item.status || "UNKNOWN",
      preset: item.preset,
    });
  }

  const total = Math.max(callScore + putScore + noTradeScore, 0.0001);
  const callRatio = callScore / total;
  const putRatio = putScore / total;
  const noTradeRatio = noTradeScore / total;

  let finalDirection: "CALL" | "PUT" | "NO_TRADE";
  let finalConfidence: number;

  if (noTradeRatio >= 0.45) {
    finalDirection = "NO_TRADE";
    finalConfidence = Math.round(noTradeRatio * 100);
  } else if (callRatio > putRatio) {
    finalDirection = "CALL";
    finalConfidence = Math.round(callRatio * 100);
  } else if (putRatio > callRatio) {
    finalDirection = "PUT";
    finalConfidence = Math.round(putRatio * 100);
  } else {
    finalDirection = "NO_TRADE";
    finalConfidence = 50;
  }

  const topRatio = Math.max(callRatio, putRatio, noTradeRatio);
  const sorted = [callRatio, putRatio, noTradeRatio].sort((a, b) => b - a);
  const consensusStrength = Math.round(Math.max(0, (topRatio - sorted[1]) * 100));

  const agreedSources = sourceBreakdown
    .filter(s => s.direction.toUpperCase() === finalDirection || 
      (finalDirection === "CALL" && s.direction.toUpperCase() === "BUY") ||
      (finalDirection === "PUT" && s.direction.toUpperCase() === "SELL"))
    .map(s => s.source);
  const conflictingSources = sourceBreakdown
    .filter(s => !agreedSources.includes(s.source))
    .map(s => s.source);

  const reason = finalDirection === "NO_TRADE"
    ? "Fusion engine found insufficient agreement or too much risk across sources."
    : `Fusion engine selected ${finalDirection} based on strongest weighted consensus.`;

  return {
    status: "OK",
    finalDirection,
    finalConfidence,
    consensusStrength,
    reason,
    agreedSources,
    conflictingSources,
    sourceBreakdown,
    scoreDetail: {
      callScore: Math.round(callScore * 10000) / 10000,
      putScore: Math.round(putScore * 10000) / 10000,
      noTradeScore: Math.round(noTradeScore * 10000) / 10000,
      callRatio: Math.round(callRatio * 10000) / 10000,
      putRatio: Math.round(putRatio * 10000) / 10000,
      noTradeRatio: Math.round(noTradeRatio * 10000) / 10000,
    },
  };
}
