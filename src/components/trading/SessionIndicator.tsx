// SENTINEL X - Session Indicator Component

import { useEffect, useState } from "react";
import { Session } from "@/types/trading";
import { getCurrentSession } from "@/engine/signalEngine";
import { cn } from "@/lib/utils";
import { Globe, Sun, Moon, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

// Available timezones with labels
const TIMEZONES = [
  { id: "Africa/Lusaka", label: "Zambia", shortLabel: "ZM", offset: "+2" },
  { id: "Europe/London", label: "London", shortLabel: "UK", offset: "+0/+1" },
  { id: "America/New_York", label: "New York", shortLabel: "NY", offset: "-5/-4" },
  { id: "Asia/Tokyo", label: "Tokyo", shortLabel: "JP", offset: "+9" },
  { id: "Australia/Sydney", label: "Sydney", shortLabel: "AU", offset: "+10/+11" },
  { id: "Africa/Johannesburg", label: "South Africa", shortLabel: "SA", offset: "+2" },
  { id: "Asia/Dubai", label: "Dubai", shortLabel: "AE", offset: "+4" },
  { id: "Asia/Singapore", label: "Singapore", shortLabel: "SG", offset: "+8" },
  { id: "UTC", label: "UTC", shortLabel: "UTC", offset: "+0" },
] as const;

type TimezoneId = typeof TIMEZONES[number]["id"];

export const SessionIndicator = () => {
  const [session, setSession] = useState<Session>(getCurrentSession());
  const [time, setTime] = useState(new Date());
  const [selectedTimezone, setSelectedTimezone] = useState<TimezoneId>(() => {
    // Load from localStorage or default to Zambia
    if (typeof window !== "undefined") {
      return (localStorage.getItem("sentinel-timezone") as TimezoneId) || "Africa/Lusaka";
    }
    return "Africa/Lusaka";
  });

  useEffect(() => {
    const interval = setInterval(() => {
      setSession(getCurrentSession());
      setTime(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save timezone preference
  const handleTimezoneChange = (tz: TimezoneId) => {
    setSelectedTimezone(tz);
    localStorage.setItem("sentinel-timezone", tz);
  };

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

  // Get current timezone info
  const currentTz = TIMEZONES.find(tz => tz.id === selectedTimezone) || TIMEZONES[0];

  // Format time for selected timezone
  const localTime = time.toLocaleTimeString("en-US", {
    timeZone: selectedTimezone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-secondary/50 rounded-lg">
      {/* Timezone Selector with Local Time */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className="flex items-center gap-2 h-auto py-1 px-2 hover:bg-secondary"
          >
            <Globe className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">{currentTz.shortLabel}:</span>
            <span className="font-mono font-medium text-primary">
              {localTime}
            </span>
            <ChevronDown className="w-3 h-3 text-muted-foreground" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent 
          align="start" 
          className="w-56 bg-card border border-border z-50"
        >
          {TIMEZONES.map((tz) => (
            <DropdownMenuItem
              key={tz.id}
              onClick={() => handleTimezoneChange(tz.id)}
              className={cn(
                "flex items-center justify-between cursor-pointer",
                selectedTimezone === tz.id && "bg-primary/10 text-primary"
              )}
            >
              <span className="flex items-center gap-2">
                <span className="font-medium">{tz.label}</span>
                <span className="text-xs text-muted-foreground">({tz.shortLabel})</span>
              </span>
              <span className="text-xs text-muted-foreground">UTC{tz.offset}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      
      <div className="h-4 w-px bg-border" />
      
      {/* UTC Time */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">UTC:</span>
        <span className="font-mono font-medium text-muted-foreground">
          {time.toUTCString().slice(17, 25)}
        </span>
      </div>
      
      <div className="h-4 w-px bg-border" />
      
      {/* Session Indicator */}
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
