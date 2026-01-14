// SENTINEL X PRIME - Signal Feed Component

import { Signal } from "@/types/trading";
import { SignalCard } from "./SignalCard";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { List, Grid3X3, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

interface SignalFeedProps {
  signals: Signal[];
  pendingAcknowledgment?: Signal | null;
  onAcknowledge?: (signalId: string) => void;
  onCancel?: (signalId: string) => void;
}

export const SignalFeed = ({ signals, pendingAcknowledgment, onAcknowledge, onCancel }: SignalFeedProps) => {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");

  if (signals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
          <Inbox className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Signals Yet</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          The engine is actively scanning markets. Signals will appear here when conditions are met.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          Signal Feed ({signals.length})
          {pendingAcknowledgment && (
            <span className="ml-2 text-warning text-sm animate-pulse">• Awaiting Acknowledgment</span>
          )}
        </h3>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("list")}
          >
            <List className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewMode("grid")}
          >
            <Grid3X3 className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[600px] pr-4">
        <div className={cn(
          viewMode === "grid" 
            ? "grid grid-cols-1 md:grid-cols-2 gap-4" 
            : "space-y-3"
        )}>
          {signals.map((signal) => (
            <SignalCard 
              key={signal.id} 
              signal={signal} 
              compact={viewMode === "list"}
              isPendingAck={pendingAcknowledgment?.id === signal.id}
              onAcknowledge={onAcknowledge}
              onCancel={onCancel}
            />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
