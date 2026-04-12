// JOYRIDE PRO PACK - Memory Engine
// Stores recent frames per pair/timeframe for stateful analysis

export interface MemoryFrame {
  ts: number;
  pair: string;
  timeframe: string;
  session: string;
  marketType: string;
  trendState: string;
  volatilityScore: number;
  structureClarity: number;
  falseBreakRisk: number;
  exhaustionRisk: number;
  frameFreshnessScore: number;
  refreshDelayMs: number;
  pairQualityScore: number;
  selectedPreset: string | null;
  direction: string | null;
  confidence: number | null;
}

class MarketMemoryStore {
  private maxFrames: number;
  private frames: Map<string, MemoryFrame[]> = new Map();

  constructor(maxFrames = 40) {
    this.maxFrames = maxFrames;
  }

  private key(pair: string, timeframe: string): string {
    return `${pair}|${timeframe}`;
  }

  addFrame(frame: MemoryFrame): void {
    const k = this.key(frame.pair, frame.timeframe);
    if (!this.frames.has(k)) this.frames.set(k, []);
    const arr = this.frames.get(k)!;
    arr.push(frame);
    if (arr.length > this.maxFrames) arr.splice(0, arr.length - this.maxFrames);
  }

  getFrames(pair: string, timeframe: string): MemoryFrame[] {
    return [...(this.frames.get(this.key(pair, timeframe)) || [])];
  }

  recentWindow(pair: string, timeframe: string, n = 5): MemoryFrame[] {
    const frames = this.getFrames(pair, timeframe);
    return frames.slice(-n);
  }

  lastFrame(pair: string, timeframe: string): MemoryFrame | null {
    const frames = this.getFrames(pair, timeframe);
    return frames.length > 0 ? frames[frames.length - 1] : null;
  }

  clear(): void {
    this.frames.clear();
  }

  get totalFrames(): number {
    let count = 0;
    this.frames.forEach(arr => count += arr.length);
    return count;
  }
}

export const MEMORY_STORE = new MarketMemoryStore(40);

export function buildMemoryFrame(
  state: {
    pair?: string;
    timeframe?: string;
    session?: string;
    marketType?: string;
    trendDirection?: string;
    volatility?: number;
    candleStrength?: number;
    bodyWickRatio?: number;
    rsiValue?: number;
  },
  selectedPreset?: string | null,
  direction?: string | null,
  confidence?: number | null
): MemoryFrame {
  const vol = (state.volatility ?? 0.5) * 100;
  const struct = (state.candleStrength ?? 0.5) * 100;
  const fbr = state.bodyWickRatio ? Math.max(0, 100 - state.bodyWickRatio * 40) : 50;

  return {
    ts: Date.now(),
    pair: state.pair || "UNKNOWN",
    timeframe: state.timeframe || "1m",
    session: state.session || "unknown",
    marketType: state.marketType || "real",
    trendState: state.trendDirection || "unknown",
    volatilityScore: vol,
    structureClarity: struct,
    falseBreakRisk: fbr,
    exhaustionRisk: state.rsiValue ? (state.rsiValue > 70 || state.rsiValue < 30 ? 70 : 30) : 40,
    frameFreshnessScore: 80,
    refreshDelayMs: 0,
    pairQualityScore: 60,
    selectedPreset: selectedPreset ?? null,
    direction: direction ?? null,
    confidence: confidence ?? null,
  };
}
