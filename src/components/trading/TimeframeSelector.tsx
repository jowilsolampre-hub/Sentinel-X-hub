// SENTINEL X - Timeframe Selector (v5 MULTI-SELECT)
// Multi-TF selection: 1m, 5m, 15m, 30m, 1h, 4h, 24h
// Single TF = pause after signal | Multi TF = continuous scanning

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Clock, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type TimeframeOption = "1m" | "5m" | "15m" | "30m" | "1h" | "4h" | "24h";

interface TimeframeSelectorProps {
  selected: TimeframeOption[];
  onSelect: (tfs: TimeframeOption[]) => void;
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
  const handleToggle = (tf: TimeframeOption) => {
    if (selected.includes(tf)) {
      // Remove TF (but keep at least one)
      if (selected.length > 1) {
        onSelect(selected.filter(t => t !== tf));
      }
    } else {
      // Add TF
      onSelect([...selected, tf]);
    }
  };

  const isMultiMode = selected.length > 1;

  return (
    <div className="flex items-center gap-2">
      <Clock className="w-4 h-4 text-muted-foreground" />
      <span className="text-xs text-muted-foreground font-medium">TF:</span>
      <div className="flex gap-1">
        {TIMEFRAMES.map((tf) => {
          const isSelected = selected.includes(tf.id);
          return (
            <Button
              key={tf.id}
              variant={isSelected ? "default" : "outline"}
              size="sm"
              onClick={() => handleToggle(tf.id)}
              className={cn(
                "px-2 py-1 h-7 text-xs font-mono transition-all",
                isSelected && "bg-primary text-primary-foreground",
                isMultiMode && isSelected && "ring-1 ring-primary/50"
              )}
            >
              {tf.label}
            </Button>
          );
        })}
      </div>
      {isMultiMode && (
        <Badge variant="outline" className="gap-1 text-xs">
          <Layers className="w-3 h-3" />
          {selected.length} TFs
        </Badge>
      )}
    </div>
  );
};

// Helper to get minutes from timeframe
export const getTimeframeMinutes = (tf: TimeframeOption): number => {
  return TIMEFRAMES.find(t => t.id === tf)?.minutes || 5;
};

// Check if running in multi-TF mode (continuous scanning)
export const isMultiTimeframeMode = (selected: TimeframeOption[]): boolean => {
  return selected.length > 1;
};

export { TIMEFRAMES };
