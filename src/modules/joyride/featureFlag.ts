// JOYRIDE PRO PACK - Feature Flag

import { JoyrideConfig, JoyridePresetId } from "./types";

export const JOYRIDE_PRO_PACK_ENABLED = true;

export const DEFAULT_JOYRIDE_CONFIG: JoyrideConfig = {
  enabled: false,
  selectedPreset: "SAFE_MODE" as JoyridePresetId,
  aggressiveness: "Standard",
  sessionAware: true,
  pairRanking: true,
  autoSetupHelper: true,
  explainSignal: true,
  screenshotAuditLog: false,
  strictFilter: false,
  confidenceThreshold: 65,
  maxSignalsPerSession: 10,
  cooldownAfterLosses: true,
};
