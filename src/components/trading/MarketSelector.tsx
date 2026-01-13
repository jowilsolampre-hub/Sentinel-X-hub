// SENTINEL X PRIME - Market & Broker Selection Panel (v3)

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Radio,
  CheckCircle2,
  Circle,
  Lock,
  Unlock,
  ArrowRight,
  Building2,
  Zap
} from "lucide-react";
import { MarketType } from "@/types/trading";
import {
  BROKERS,
  Broker,
  BrokerId,
  setMarketType,
  setBroker,
  lockSelection,
  getCurrentSelection,
  resetSelection,
  getBrokersByMarketType
} from "@/engine/marketSelector";

interface MarketSelectorProps {
  onSelectionComplete?: (marketType: MarketType, brokerId: BrokerId) => void;
  disabled?: boolean;
}

export const MarketSelector = ({ onSelectionComplete, disabled }: MarketSelectorProps) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedMarket, setSelectedMarket] = useState<MarketType | null>(null);
  const [selectedBroker, setSelectedBroker] = useState<BrokerId | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  const handleMarketSelect = (market: MarketType) => {
    setSelectedMarket(market);
    setMarketType(market);
    setSelectedBroker(null);
    setStep(2);
  };

  const handleBrokerSelect = (brokerId: BrokerId) => {
    const result = setBroker(brokerId);
    if (result.success) {
      setSelectedBroker(brokerId);
      setStep(3);
    }
  };

  const handleLock = () => {
    const result = lockSelection();
    if (result.success && selectedMarket && selectedBroker) {
      setIsLocked(true);
      onSelectionComplete?.(selectedMarket, selectedBroker);
    }
  };

  const handleReset = () => {
    resetSelection();
    setSelectedMarket(null);
    setSelectedBroker(null);
    setIsLocked(false);
    setStep(1);
  };

  const availableBrokers = selectedMarket ? getBrokersByMarketType(selectedMarket) : [];

  if (isLocked) {
    const broker = BROKERS.find(b => b.id === selectedBroker);
    return (
      <Card className="p-4 border border-success/30 bg-success/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="w-5 h-5 text-success" />
            <div>
              <p className="font-bold text-success">Market Selection Locked</p>
              <p className="text-sm text-muted-foreground">
                {selectedMarket} via {broker?.name}
              </p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleReset} disabled={disabled}>
            <Unlock className="w-4 h-4 mr-2" />
            Unlock
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center gap-2 mb-4">
        <Radio className="w-5 h-5 text-primary" />
        <h3 className="font-bold">Market Connection Selector</h3>
        <Badge variant="outline" className="ml-auto">
          Step {step}/3
        </Badge>
      </div>

      {/* Step 1: Market Type */}
      <div className="mb-4">
        <p className="text-sm text-muted-foreground mb-2">1. Select Market Type</p>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant={selectedMarket === "OTC" ? "default" : "outline"}
            className={cn(
              "h-auto py-3 flex-col",
              selectedMarket === "OTC" && "ring-2 ring-primary"
            )}
            onClick={() => handleMarketSelect("OTC")}
            disabled={disabled}
          >
            <Zap className="w-5 h-5 mb-1" />
            <span className="font-bold">OTC Markets</span>
            <span className="text-xs opacity-70">Binary Options</span>
          </Button>
          <Button
            variant={selectedMarket === "REAL" ? "default" : "outline"}
            className={cn(
              "h-auto py-3 flex-col",
              selectedMarket === "REAL" && "ring-2 ring-primary"
            )}
            onClick={() => handleMarketSelect("REAL")}
            disabled={disabled}
          >
            <Building2 className="w-5 h-5 mb-1" />
            <span className="font-bold">Real Markets</span>
            <span className="text-xs opacity-70">Forex, Indices, etc.</span>
          </Button>
        </div>
      </div>

      {/* Step 2: Broker Selection */}
      {step >= 2 && selectedMarket && (
        <div className="mb-4">
          <p className="text-sm text-muted-foreground mb-2">
            2. Select Broker/Platform
            <ArrowRight className="w-3 h-3 inline ml-1" />
          </p>
          <div className="space-y-2 max-h-[200px] overflow-y-auto">
            {availableBrokers.map((broker) => (
              <button
                key={broker.id}
                className={cn(
                  "w-full p-3 rounded-lg border text-left transition-all",
                  "hover:border-primary/50 hover:bg-primary/5",
                  selectedBroker === broker.id 
                    ? "border-primary bg-primary/10" 
                    : "border-border/50 bg-secondary/30",
                  disabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => handleBrokerSelect(broker.id)}
                disabled={disabled}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {selectedBroker === broker.id ? (
                      <CheckCircle2 className="w-4 h-4 text-primary" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{broker.name}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {broker.dataSource}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1 pl-6">
                  Supports: {broker.supportsVectors.join(", ")}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Step 3: Lock Selection */}
      {step >= 3 && selectedBroker && (
        <div>
          <p className="text-sm text-muted-foreground mb-2">
            3. Confirm & Lock Selection
          </p>
          <Button 
            className="w-full" 
            onClick={handleLock}
            disabled={disabled}
          >
            <Lock className="w-4 h-4 mr-2" />
            Lock Selection & Start Scanning
          </Button>
        </div>
      )}

      {/* Info */}
      <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground">
          {step === 1 && "Choose between OTC (binary options) or Real markets (Forex, Indices, etc.)"}
          {step === 2 && "Select your preferred broker or trading platform"}
          {step === 3 && "Lock your selection to activate scanning with the chosen data routing"}
        </p>
      </div>
    </Card>
  );
};
