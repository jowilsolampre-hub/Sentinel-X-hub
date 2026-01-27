// SENTINEL X - Vector Selector Component

import { Vector } from "@/types/trading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  DollarSign, 
  BarChart3, 
  Gem, 
  TrendingUp,
  Clock,
  Layers
} from "lucide-react";

interface VectorSelectorProps {
  selectedVector?: Vector;
  onSelect: (vector: Vector | undefined) => void;
}

const VECTORS: { id: Vector | "All"; label: string; icon: React.ElementType; description: string }[] = [
  { id: "All" as const, label: "Hybrid", icon: Layers, description: "All markets" },
  { id: "Forex", label: "Forex", icon: DollarSign, description: "Currency pairs" },
  { id: "Indices", label: "Indices", icon: BarChart3, description: "Stock indices" },
  { id: "Commodities", label: "Commodities", icon: Gem, description: "Gold, Oil, etc." },
  { id: "Futures", label: "Futures", icon: TrendingUp, description: "ES, NQ, etc." },
  { id: "OTC", label: "OTC", icon: Clock, description: "Expiry-based" },
];

export const VectorSelector = ({ selectedVector, onSelect }: VectorSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {VECTORS.map((vector) => {
        const Icon = vector.icon;
        const isSelected = vector.id === "All" 
          ? selectedVector === undefined 
          : selectedVector === vector.id;
        
        return (
          <Button
            key={vector.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(vector.id === "All" ? undefined : vector.id as Vector)}
            className={cn(
              "flex items-center gap-2 transition-all",
              isSelected && "bg-primary text-primary-foreground glow-accent"
            )}
          >
            <Icon className="w-4 h-4" />
            <span className="hidden sm:inline">{vector.label}</span>
          </Button>
        );
      })}
    </div>
  );
};
