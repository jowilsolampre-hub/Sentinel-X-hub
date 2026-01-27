// SENTINEL X - Broker Connection Status (v5 TURBO)
// PO, QX, OANDA, Binance, Exness, MT5, XM Trader

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { 
  PlugZap,
  Circle,
  Zap,
  Activity
} from "lucide-react";
import { getAllConnections, getConnectionStatus, type BrokerConnection } from "@/engine/fastBrokerBridge";

type ConnectionStatus = "EXCELLENT" | "GOOD" | "FAIR" | "POOR";

export const BrokerStatus = () => {
  const [connections, setConnections] = useState<BrokerConnection[]>([]);
  const [status, setStatus] = useState<{ connected: number; total: number; avgLatency: number; status: ConnectionStatus }>({ connected: 0, total: 7, avgLatency: 0, status: "FAIR" });

  useEffect(() => {
    const updateConnections = () => {
      setConnections(getAllConnections());
      setStatus(getConnectionStatus());
    };

    updateConnections();
    const interval = setInterval(updateConnections, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="p-4 border border-border/50 gradient-card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <PlugZap className="w-5 h-5 text-primary" />
          <h3 className="font-bold">Broker Connections</h3>
        </div>
        <Badge 
          variant="outline" 
          className={cn(
            "text-xs",
            status.status === "EXCELLENT" && "border-success text-success",
            status.status === "GOOD" && "border-primary text-primary",
            status.status === "FAIR" && "border-warning text-warning"
          )}
        >
          <Zap className="w-3 h-3 mr-1" />
          {status.connected}/{status.total} Live
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="bg-secondary/30 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-success">{status.connected}</p>
          <p className="text-xs text-muted-foreground">Connected</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2 text-center">
          <p className="text-lg font-bold text-primary">{status.avgLatency.toFixed(0)}ms</p>
          <p className="text-xs text-muted-foreground">Latency</p>
        </div>
        <div className="bg-secondary/30 rounded-lg p-2 text-center">
          <p className={cn(
            "text-lg font-bold",
            status.status === "EXCELLENT" && "text-success",
            status.status === "GOOD" && "text-primary",
            status.status === "FAIR" && "text-warning"
          )}>{status.status}</p>
          <p className="text-xs text-muted-foreground">Quality</p>
        </div>
      </div>

      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {connections.map((conn) => (
          <div 
            key={conn.broker}
            className="flex items-center justify-between p-2 bg-secondary/30 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <Circle className={cn(
                "w-2 h-2",
                conn.status === "CONNECTED" && "fill-success text-success",
                conn.status === "CONNECTING" && "fill-warning text-warning animate-pulse",
                conn.status === "DISCONNECTED" && "fill-muted-foreground text-muted-foreground",
                conn.status === "ERROR" && "fill-destructive text-destructive"
              )} />
              <div>
                <p className="font-medium text-sm">{conn.broker.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground">{conn.mode}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">
                {conn.latency.toFixed(0)}ms
              </span>
              {conn.isHot && (
                <Badge variant="secondary" className="text-xs px-1 py-0">
                  <Zap className="w-2 h-2 text-warning" />
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 p-2 bg-success/10 rounded-lg border border-success/30">
        <p className="text-xs text-success flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Turbo Mode: All brokers pre-connected for instant scanning
        </p>
      </div>
    </Card>
  );
};
