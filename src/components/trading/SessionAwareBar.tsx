// SENTINEL X - Session Aware Bar (v5)
// Shows open session with UTC time and notification pin

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Globe, Sun, Moon, Clock, Bell, Pin } from "lucide-react";
import { Session, SESSION_TIMES } from "@/types/trading";
import { detectActiveSession } from "@/engine/sessionLock";

export const SessionAwareBar = () => {
  const [session, setSession] = useState<Session>(detectActiveSession());
  const [time, setTime] = useState(new Date());
  const [isPinned, setIsPinned] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setSession(detectActiveSession());
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSessionColor = (s: Session) => {
    switch (s) {
      case "London": return "text-primary bg-primary/10 border-primary/30";
      case "NewYork": return "text-accent bg-accent/10 border-accent/30";
      case "Tokyo": return "text-chart-4 bg-chart-4/10 border-chart-4/30";
      case "Sydney": return "text-chart-5 bg-chart-5/10 border-chart-5/30";
      default: return "text-muted-foreground bg-muted/10 border-muted/30";
    }
  };

  const getSessionIcon = (s: Session) => {
    switch (s) {
      case "London":
      case "NewYork":
        return <Sun className="w-4 h-4" />;
      case "Tokyo":
      case "Sydney":
        return <Moon className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  const formatUTC = (date: Date): string => {
    return date.toUTCString().slice(17, 25);
  };

  // Calculate time remaining in session
  const getSessionTimeRemaining = (): string => {
    if (session === "Closed") return "";
    
    const hour = time.getUTCHours();
    const minute = time.getUTCMinutes();
    const sessionEnd = SESSION_TIMES[session].end;
    
    let hoursLeft = sessionEnd - hour - 1;
    let minutesLeft = 60 - minute;
    
    if (minutesLeft === 60) {
      minutesLeft = 0;
      hoursLeft += 1;
    }
    
    if (hoursLeft < 0) hoursLeft += 24;
    
    return `${hoursLeft}h ${minutesLeft}m remaining`;
  };

  return (
    <div className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg border border-border/50">
      {/* UTC Time */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">UTC:</span>
          <span className="font-mono font-bold text-lg">
            {formatUTC(time)}
          </span>
        </div>

        <div className="h-6 w-px bg-border" />

        {/* Active Session */}
        <Badge 
          variant="outline" 
          className={cn("gap-1.5 text-sm font-medium", getSessionColor(session))}
        >
          {getSessionIcon(session)}
          {session} Session
          {session !== "Closed" && (
            <span className="relative flex h-2 w-2 ml-1">
              <span className={cn(
                "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                session === "London" && "bg-primary",
                session === "NewYork" && "bg-accent",
                session === "Tokyo" && "bg-chart-4",
                session === "Sydney" && "bg-chart-5"
              )} />
              <span className={cn(
                "relative inline-flex rounded-full h-2 w-2",
                session === "London" && "bg-primary",
                session === "NewYork" && "bg-accent",
                session === "Tokyo" && "bg-chart-4",
                session === "Sydney" && "bg-chart-5"
              )} />
            </span>
          )}
        </Badge>

        {session !== "Closed" && (
          <span className="text-xs text-muted-foreground hidden sm:block">
            {getSessionTimeRemaining()}
          </span>
        )}
      </div>

      {/* Float Window & Notification Pin */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setIsPinned(!isPinned)}
          className={cn(
            "p-2 rounded-lg transition-all",
            isPinned 
              ? "bg-primary/20 text-primary" 
              : "bg-secondary/50 text-muted-foreground hover:text-foreground"
          )}
          title={isPinned ? "Unpin notifications" : "Pin notifications"}
        >
          <Pin className={cn("w-4 h-4", isPinned && "fill-primary")} />
        </button>
        <button
          className="p-2 rounded-lg bg-secondary/50 text-muted-foreground hover:text-foreground transition-all"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span>UTC+0</span>
        </div>
      </div>
    </div>
  );
};
