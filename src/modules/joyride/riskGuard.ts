// JOYRIDE PRO PACK - Risk Guard

import { JoyrideConfig } from "./types";
import { ChartState } from "./engine";
import { getSessionInfo } from "./sessionEngine";

export interface RiskCheckResult {
  blocked: boolean;
  reason: string;
}

export function checkRiskGuard(chart: ChartState, config: JoyrideConfig): RiskCheckResult {
  // Max signals per session
  if (config.maxSignalsPerSession > 0 && (chart.signalsThisSession || 0) >= config.maxSignalsPerSession) {
    return { blocked: true, reason: `Max signals per session reached (${config.maxSignalsPerSession})` };
  }

  // Cooldown after losses
  if (config.cooldownAfterLosses && (chart.recentLosses || 0) >= 2) {
    return { blocked: true, reason: `Loss streak cooldown active (${chart.recentLosses} consecutive losses)` };
  }

  // Chop filter
  if (config.strictFilter && chart.trendDirection === "chop") {
    return { blocked: true, reason: "Strict filter: choppy market blocked" };
  }

  // Session filter in Safe Mode
  if (config.selectedPreset === "SAFE_MODE" || config.aggressiveness === "Safe") {
    const session = getSessionInfo();
    if (!session.isActive) {
      return { blocked: true, reason: `Safe mode: inactive session (${session.name}) blocked` };
    }
  }

  // Exhaustion filter
  if (chart.rsiValue !== undefined && (chart.rsiValue > 85 || chart.rsiValue < 15)) {
    return { blocked: true, reason: `Exhaustion detected: RSI at ${chart.rsiValue}` };
  }

  return { blocked: false, reason: "" };
}
