// SENTINEL X PRIME - Broker Connection Status

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  Plug, 
  PlugZap,
  ExternalLink,
  Circle
} from "lucide-react";

interface Broker {
  id: string;
  name: string;
  type: "REAL" | "OTC";
  status: "connected" | "disconnected" | "pending";
}

const BROKERS: Broker[] = [
  { id: "oanda", name: "OANDA", type: "REAL", status: "disconnected" },
  { id: "binance", name: "Binance", type: "REAL", status: "disconnected" },
  { id: "exness", name: "Exness", type: "REAL", status: "disconnected" },
  { id: "xm", name: "XM", type: "REAL", status: "disconnected" },
  { id: "pocket", name: "Pocket Option", type: "OTC", status: "disconnected" },
  { id: "qx", name: "QX Broker", type: "OTC", status: "disconnected" },
];

export const BrokerStatus = () => {
  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Broker Connections</h3>
        </div>
        <Badge variant="outline" className="text-xs">
          Plugin Ready
        </Badge>
      </div>

      <div className="space-y-2">
        {BROKERS.map((broker) => (
          <div 
            key={broker.id}
            className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
          >
            <div className="flex items-center gap-3">
              <Circle className={cn(
                "w-2 h-2",
                broker.status === "connected" && "fill-success text-success",
                broker.status === "disconnected" && "fill-muted-foreground text-muted-foreground",
                broker.status === "pending" && "fill-warning text-warning animate-pulse"
              )} />
              <div>
                <p className="font-medium text-sm">{broker.name}</p>
                <p className="text-xs text-muted-foreground">{broker.type}</p>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8">
              <Plug className="w-4 h-4 mr-2" />
              Connect
            </Button>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground">
          Broker connections are plugin interfaces. Connect your API keys in production to enable live data feeds.
        </p>
        <Button variant="link" size="sm" className="h-auto p-0 mt-1 text-xs">
          Learn more <ExternalLink className="w-3 h-3 ml-1" />
        </Button>
      </div>
    </Card>
  );
};
