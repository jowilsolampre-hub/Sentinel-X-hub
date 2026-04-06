// JOYRIDE PRO PACK - Session Engine

export interface SessionInfo {
  name: string;
  isActive: boolean;
  isOverlap: boolean;
  volatilityProfile: "low" | "medium" | "high";
  label: string;
}

export function getSessionInfo(): SessionInfo {
  const now = new Date();
  const utcH = now.getUTCHours();

  // Tokyo: 00:00-09:00 UTC
  // London: 07:00-16:00 UTC
  // NewYork: 12:00-21:00 UTC
  // Sydney: 21:00-06:00 UTC

  const inTokyo = utcH >= 0 && utcH < 9;
  const inLondon = utcH >= 7 && utcH < 16;
  const inNewYork = utcH >= 12 && utcH < 21;
  const inSydney = utcH >= 21 || utcH < 6;

  const isOverlap = (inLondon && inNewYork) || (inTokyo && inLondon);

  let name = "Sydney";
  let volatilityProfile: "low" | "medium" | "high" = "low";

  if (inLondon && inNewYork) {
    name = "London/NY Overlap";
    volatilityProfile = "high";
  } else if (inNewYork) {
    name = "NewYork";
    volatilityProfile = "high";
  } else if (inLondon) {
    name = "London";
    volatilityProfile = "high";
  } else if (inTokyo) {
    name = "Tokyo";
    volatilityProfile = "medium";
  } else if (inSydney) {
    name = "Sydney";
    volatilityProfile = "low";
  }

  // Zambia time (UTC+2)
  const zambiaH = (utcH + 2) % 24;
  const label = `${name} | UTC ${utcH}:00 | Zambia ${zambiaH}:00`;

  return {
    name,
    isActive: inLondon || inNewYork,
    isOverlap,
    volatilityProfile,
    label,
  };
}
