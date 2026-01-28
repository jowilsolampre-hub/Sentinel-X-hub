// SENTINEL X - Market Category Selector (v5)
// Three categories: REAL Markets, PO OTC, Quotex OTC

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Building2, Zap, TrendingUp, Globe } from "lucide-react";

export type MarketCategory = "REAL" | "PO_OTC" | "QUOTEX_OTC";

interface MarketCategorySelectorProps {
  selected: MarketCategory;
  onSelect: (category: MarketCategory) => void;
}

const CATEGORIES: { id: MarketCategory; label: string; icon: React.ElementType; description: string }[] = [
  { 
    id: "REAL", 
    label: "REAL Markets", 
    icon: Building2, 
    description: "Binance, Exness, XM, MT5, OANDA" 
  },
  { 
    id: "PO_OTC", 
    label: "PO OTC", 
    icon: Zap, 
    description: "Pocket Option (OTC)" 
  },
  { 
    id: "QUOTEX_OTC", 
    label: "Quotex OTC", 
    icon: TrendingUp, 
    description: "Quotex (OTC)" 
  },
];

export const MarketCategorySelector = ({ selected, onSelect }: MarketCategorySelectorProps) => {
  return (
    <div className="flex flex-wrap gap-2">
      {CATEGORIES.map((cat) => {
        const Icon = cat.icon;
        const isSelected = selected === cat.id;
        
        return (
          <Button
            key={cat.id}
            variant={isSelected ? "default" : "outline"}
            size="sm"
            onClick={() => onSelect(cat.id)}
            className={cn(
              "flex items-center gap-2 transition-all",
              isSelected && "bg-primary text-primary-foreground ring-2 ring-primary/50"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{cat.label}</span>
          </Button>
        );
      })}
    </div>
  );
};

// Get brokers for market category
export const getBrokersForCategory = (category: MarketCategory): string[] => {
  switch (category) {
    case "REAL":
      return ["Binance", "OANDA", "Exness", "XM", "MT5"];
    case "PO_OTC":
      return ["Pocket Option OTC"];
    case "QUOTEX_OTC":
      return ["Quotex OTC"];
    default:
      return [];
  }
};

export { CATEGORIES };
