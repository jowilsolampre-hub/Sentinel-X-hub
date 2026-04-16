// SENTINEL X - SMC Module Public API
// Re-exports for clean imports: import { ... } from "@/engine/smc"

export { generateSMCSignal } from "./engine";
export {
  startLiveRunner,
  stopLiveRunner,
  isLiveRunnerActive,
  runScanCycle,
  scanSymbol,
  fetchCandles,
  getSignalMemory,
  getActiveSignalCount,
  clearSignalMemory,
  computeFusionScore,
  FUSION_WEIGHTS,
  DEFAULT_RUNNER_CONFIG,
} from "./liveRunner";
export type {
  ExchangeSource,
  LiveRunnerConfig,
  FusionInput,
} from "./liveRunner";
export type {
  SMCCandle,
  SMCConfig,
  SMCSignalResult,
  SMCScoreBreakdown,
  TradePlan,
  SMCZone,
  SwingPoint,
  StructureEvent,
  ConfirmationResult,
  SMCWeights,
} from "./types";
export { DEFAULT_SMC_CONFIG } from "./types";
