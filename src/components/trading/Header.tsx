// SENTINEL X PRIME - Header Component

import { SessionIndicator } from "./SessionIndicator";
import { Badge } from "@/components/ui/badge";
import { Zap, Radio } from "lucide-react";

export const Header = () => {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-primary/20 rounded-lg border border-primary/30">
                <Zap className="w-8 h-8 text-primary" />
              </div>
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-success"></span>
              </span>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                SENTINEL X <span className="text-primary">PRIME</span>
              </h1>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  <Radio className="w-3 h-3 mr-1" />
                  Live Intelligence
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Dual-Market Trading System
                </span>
              </div>
            </div>
          </div>

          {/* Session Indicator */}
          <SessionIndicator />
        </div>
      </div>
    </header>
  );
};
