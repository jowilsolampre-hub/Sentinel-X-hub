// SENTINEL X PRIME - Market Type Toggle (REAL vs OTC)

import { MarketType } from "@/types/trading";
import { cn } from "@/lib/utils";
import { Building2, Clock } from "lucide-react";

interface MarketTypeToggleProps {
  value: MarketType;
  onChange: (type: MarketType) => void;
}

export const MarketTypeToggle = ({ value, onChange }: MarketTypeToggleProps) => {
  return (
    <div className="inline-flex items-center bg-secondary/50 rounded-lg p-1">
      <button
        onClick={() => onChange("REAL")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          value === "REAL"
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Building2 className="w-4 h-4" />
        <span>REAL Markets</span>
      </button>
      <button
        onClick={() => onChange("OTC")}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
          value === "OTC"
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Clock className="w-4 h-4" />
        <span>OTC Markets</span>
      </button>
    </div>
  );
};
