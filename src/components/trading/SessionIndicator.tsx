// SENTINEL X - Session Indicator Component

import { useEffect, useState } from "react";
import { Session, SESSION_TIMES } from "@/types/trading";
import { getCurrentSession } from "@/engine/signalEngine";
import { cn } from "@/lib/utils";
import { Globe, Sun, Moon } from "lucide-react";

export const SessionIndicator = () => {
  const [session, setSession] = useState<Session>(getCurrentSession());
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => {
      setSession(getCurrentSession());
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const getSessionColor = (s: Session) => {
    switch (s) {
      case "London": return "text-primary";
      case "NewYork": return "text-accent";
      case "Tokyo": return "text-chart-4";
      case "Sydney": return "text-chart-5";
      default: return "text-muted-foreground";
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

  // Format time for Zambia (Africa/Lusaka, UTC+2)
  const zambiaTime = time.toLocaleTimeString("en-ZM", {
    timeZone: "Africa/Lusaka",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-secondary/50 rounded-lg">
      {/* Zambia Local Time */}
      <div className="flex items-center gap-2">
        <Globe className="w-4 h-4 text-primary" />
        <span className="text-sm text-muted-foreground">ZM:</span>
        <span className="font-mono font-medium text-primary">
          {zambiaTime}
        </span>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      {/* UTC Time */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">UTC:</span>
        <span className="font-mono font-medium text-muted-foreground">
          {time.toUTCString().slice(17, 25)}
        </span>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      <div className="flex items-center gap-2">
        <span className={cn(getSessionColor(session))}>
          {getSessionIcon(session)}
        </span>
        <span className={cn(
          "font-medium",
          getSessionColor(session)
        )}>
          {session} Session
        </span>
        {session !== "Closed" && (
          <span className="relative flex h-2 w-2">
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
      </div>
    </div>
  );
};
