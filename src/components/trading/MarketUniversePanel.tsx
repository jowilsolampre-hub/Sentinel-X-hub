// SENTINEL X - Market Universe Panel (v5)
// Separated OTC (PO/Quotex) vs REAL (Binance, Exness, XM, MT5, OANDA)
// TradingView-based data for OTC, API/MT5 for REAL

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Globe,
  Zap,
  Building2,
  TrendingUp,
  Circle,
  Lock,
  Unlock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink
} from "lucide-react";

// Market Universe Types
export type OTCBroker = "POCKET_OPTION_OTC" | "POCKET_OPTION_REAL" | "QUOTEX_OTC";
export type RealBroker = "BINANCE" | "EXNESS" | "XM" | "MT5" | "OANDA";
export type AnyBroker = OTCBroker | RealBroker;

interface BrokerInfo {
  id: AnyBroker;
  name: string;
  shortName: string;
  type: "OTC" | "REAL";
  dataSource: "TradingView" | "API" | "MT5" | "WebSocket";
  status: "connected" | "disconnected" | "pending";
  note: string;
  vectors: string[];
}

const OTC_BROKERS: BrokerInfo[] = [
  {
    id: "POCKET_OPTION_REAL",
    name: "Pocket Option (REAL)",
    shortName: "PO REAL",
    type: "OTC",
    dataSource: "TradingView",
    status: "connected",
    note: "TradingView charts + Manual execution",
    vectors: ["Forex", "Indices", "Commodities"]
  },
  {
    id: "POCKET_OPTION_OTC",
    name: "Pocket Option (OTC)",
    shortName: "PO OTC",
    type: "OTC",
    dataSource: "TradingView",
    status: "connected",
    note: "TradingView OTC charts + Manual execution",
    vectors: ["OTC"]
  },
  {
    id: "QUOTEX_OTC",
    name: "Quotex (OTC)",
    shortName: "QX OTC",
    type: "OTC",
    dataSource: "TradingView",
    status: "connected",
    note: "TradingView OTC charts + Manual execution",
    vectors: ["OTC"]
  }
];

const REAL_BROKERS: BrokerInfo[] = [
  {
    id: "BINANCE",
    name: "Binance",
    shortName: "Binance",
    type: "REAL",
    dataSource: "WebSocket",
    status: "connected",
    note: "Official API + WebSocket feeds",
    vectors: ["Crypto", "Futures"]
  },
  {
    id: "OANDA",
    name: "OANDA",
    shortName: "OANDA",
    type: "REAL",
    dataSource: "API",
    status: "connected",
    note: "Official REST API (Primary validator)",
    vectors: ["Forex", "Indices", "Commodities"]
  },
  {
    id: "EXNESS",
    name: "Exness",
    shortName: "Exness",
    type: "REAL",
    dataSource: "MT5",
    status: "pending",
    note: "MT5 Terminal bridge required",
    vectors: ["Forex", "Indices", "Commodities"]
  },
  {
    id: "XM",
    name: "XM Trader",
    shortName: "XM",
    type: "REAL",
    dataSource: "MT5",
    status: "pending",
    note: "MT5 Terminal bridge required",
    vectors: ["Forex", "Indices", "Commodities"]
  },
  {
    id: "MT5",
    name: "MetaTrader 5",
    shortName: "MT5",
    type: "REAL",
    dataSource: "MT5",
    status: "disconnected",
    note: "Windows terminal required (fallback validator)",
    vectors: ["Forex", "Indices", "Commodities", "Futures"]
  }
];

interface MarketUniversePanelProps {
  onBrokerSelect?: (broker: AnyBroker) => void;
  selectedBroker?: AnyBroker;
}

export const MarketUniversePanel = ({ 
  onBrokerSelect, 
  selectedBroker 
}: MarketUniversePanelProps) => {
  const [activeTab, setActiveTab] = useState<"otc" | "real">("otc");
  const [lockedBroker, setLockedBroker] = useState<AnyBroker | null>(null);

  const handleSelect = (broker: BrokerInfo) => {
    if (broker.status === "disconnected") return;
    onBrokerSelect?.(broker.id);
  };

  const handleLock = () => {
    if (selectedBroker) {
      setLockedBroker(selectedBroker);
    }
  };

  const handleUnlock = () => {
    setLockedBroker(null);
  };

  const renderBrokerCard = (broker: BrokerInfo) => {
    const isSelected = selectedBroker === broker.id;
    const isLocked = lockedBroker === broker.id;
    const isDisabled = broker.status === "disconnected";

    return (
      <button
        key={broker.id}
        className={cn(
          "w-full p-3 rounded-lg border text-left transition-all",
          isLocked && "border-success bg-success/10 ring-2 ring-success/50",
          isSelected && !isLocked && "border-primary bg-primary/10",
          !isSelected && !isLocked && "border-border/50 bg-secondary/20",
          isDisabled && "opacity-50 cursor-not-allowed",
          !isDisabled && "hover:border-primary/50 hover:bg-primary/5"
        )}
        onClick={() => !isDisabled && handleSelect(broker)}
        disabled={isDisabled || !!lockedBroker}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Circle className={cn(
              "w-2.5 h-2.5",
              broker.status === "connected" && "fill-success text-success",
              broker.status === "pending" && "fill-warning text-warning animate-pulse",
              broker.status === "disconnected" && "fill-muted-foreground text-muted-foreground"
            )} />
            <span className="font-medium text-sm">{broker.name}</span>
          </div>
          <div className="flex items-center gap-1">
            {isLocked && <Lock className="w-3.5 h-3.5 text-success" />}
            {isSelected && !isLocked && <CheckCircle2 className="w-3.5 h-3.5 text-primary" />}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="outline" className="text-xs">
            {broker.dataSource}
          </Badge>
          <Badge 
            variant="outline" 
            className={cn(
              "text-xs",
              broker.status === "connected" && "border-success/50 text-success",
              broker.status === "pending" && "border-warning/50 text-warning",
              broker.status === "disconnected" && "border-muted-foreground/50 text-muted-foreground"
            )}
          >
            {broker.status}
          </Badge>
        </div>
        
        <p className="text-xs text-muted-foreground mb-2">{broker.note}</p>
        
        <div className="flex flex-wrap gap-1">
          {broker.vectors.map(v => (
            <span key={v} className="text-xs px-1.5 py-0.5 bg-secondary/50 rounded">
              {v}
            </span>
          ))}
        </div>
      </button>
    );
  };

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Market Universe</h3>
        </div>
        {lockedBroker ? (
          <Button variant="ghost" size="sm" onClick={handleUnlock}>
            <Unlock className="w-4 h-4 mr-1" />
            Unlock
          </Button>
        ) : selectedBroker && (
          <Button variant="default" size="sm" onClick={handleLock}>
            <Lock className="w-4 h-4 mr-1" />
            Lock
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "otc" | "real")}>
        <TabsList className="w-full mb-4">
          <TabsTrigger value="otc" className="flex-1 gap-2">
            <Zap className="w-4 h-4" />
            OTC Markets
          </TabsTrigger>
          <TabsTrigger value="real" className="flex-1 gap-2">
            <Building2 className="w-4 h-4" />
            Real Markets
          </TabsTrigger>
        </TabsList>

        <TabsContent value="otc" className="space-y-3">
          <div className="p-2 bg-warning/10 rounded-lg border border-warning/30 mb-3">
            <p className="text-xs text-warning flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              OTC uses TradingView real charts + manual execution window
            </p>
          </div>
          {OTC_BROKERS.map(renderBrokerCard)}
        </TabsContent>

        <TabsContent value="real" className="space-y-3">
          <div className="p-2 bg-success/10 rounded-lg border border-success/30 mb-3">
            <p className="text-xs text-success flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              Real markets use official APIs + MT5 terminal connections
            </p>
          </div>
          {REAL_BROKERS.map(renderBrokerCard)}
        </TabsContent>
      </Tabs>

      {/* Cross-Market Validation Info */}
      <div className="mt-4 p-3 bg-primary/10 rounded-lg border border-primary/30">
        <div className="flex items-center gap-2 mb-1">
          <CheckCircle2 className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Cross-Market Validation</span>
        </div>
        <p className="text-xs text-muted-foreground">
          OTC signals validated against OANDA (primary) or MT5 (fallback) for bias/momentum confirmation.
        </p>
      </div>

      {/* Locked Status */}
      {lockedBroker && (
        <div className="mt-3 p-3 bg-success/10 rounded-lg border border-success/30">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-success" />
            <span className="text-sm font-medium text-success">
              Locked: {[...OTC_BROKERS, ...REAL_BROKERS].find(b => b.id === lockedBroker)?.name}
            </span>
          </div>
        </div>
      )}
    </Card>
  );
};

// Export broker lists for use in other components
export { OTC_BROKERS, REAL_BROKERS };
