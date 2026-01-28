// SENTINEL X - Vector Selector Component (v5)
// Vectors: Hybrid, Crypto, Futures, Forex, Indices, Commodities

import { Vector } from "@/types/trading";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Layers,
  Bitcoin,
  TrendingUp,
  DollarSign, 
  BarChart3, 
  Gem
} from "lucide-react";

export type VectorOption = "Hybrid" | "Crypto" | "Futures" | "Forex" | "Indices" | "Commodities";

interface VectorSelectorProps {
  selectedVector?: VectorOption;
  onSelect: (vector: VectorOption) => void;
}

const VECTORS: { id: VectorOption; label: string; icon: React.ElementType; description: string }[] = [
  { id: "Hybrid", label: "Hybrid", icon: Layers, description: "All markets combined" },
  { id: "Crypto", label: "Crypto", icon: Bitcoin, description: "BTC, ETH, etc." },
  { id: "Futures", label: "Futures", icon: TrendingUp, description: "ES, NQ, CL, etc." },
  { id: "Forex", label: "Forex", icon: DollarSign, description: "Currency pairs" },
  { id: "Indices", label: "Indices", icon: BarChart3, description: "Stock indices" },
  { id: "Commodities", label: "Commodities", icon: Gem, description: "Gold, Oil, etc." },
];

export const VectorSelector = ({ selectedVector = "Hybrid", onSelect }: VectorSelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {VECTORS.map((vector) => {
        const Icon = vector.icon;
        const isSelected = selectedVector === vector.id;
        
        return (
          <Button
            key={vector.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(vector.id)}
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

// Map vector option to trading type Vector
export const vectorToTradingVector = (vector: VectorOption): Vector | undefined => {
  if (vector === "Hybrid") return undefined;
  if (vector === "Crypto") return "Futures"; // Crypto treated as futures
  return vector as Vector;
};

export { VECTORS };
