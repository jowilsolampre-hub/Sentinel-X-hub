// SENTINEL X - Timeframe Selector (v5)
// Hardcore TF selection: 1m, 5m, 15m, 30m, 1h, 4h, 24h

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock } from "lucide-react";

export type TimeframeOption = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "24h";

interface TimeframeSelectorProps {
  selected: TimeframeOption;
  onSelect: (tf: TimeframeOption) => void;
}

const TIMEFRAMES: { id: TimeframeOption; label: string; minutes: number }[] = [
  { id: "1m", label: "1M", minutes: 1 },
  { id: "5m", label: "5M", minutes: 5 },
  { id: "15m", label: "15M", minutes: 15 },
  { id: "30m", label: "30M", minutes: 30 },
  { id: "1h", label: "1H", minutes: 60 },
  { id: "4h", label: "4H", minutes: 240 },
  { id: "24h", label: "24H", minutes: 1440 },
];

export const TimeframeSelector = ({ selected, onSelect }: TimeframeSelectorProps) => {
  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">TF:</span>
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => (
          <Button
            key={tf.id}
            variant={selected === tf.id ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(tf.id)}
            className={cn(
              "px-2 py-1 h-7 text-xs font-mono",
              selected === tf.id && "bg-primary text-primary-foreground"
            )}
          >
            {tf.label}
          </Button>
        ))}
      </div>
    </div>
  );
};

// Helper to get minutes from timeframe
export const getTimeframeMinutes = (tf: TimeframeOption): number => {
  return TIMEFRAMES.find(t => t.id === tf)?.minutes || 5;
};

export { TIMEFRAMES };
