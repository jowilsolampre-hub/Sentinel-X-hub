// SENTINEL X - Floating Window Control Button
// Opens app as floating overlay window on top of other apps

import { Button } from "@/components/ui/button";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useFloatingWindow } from "@/hooks/useFloatingWindow";
import { 
  PictureInPicture2, 
  Maximize2, 
  Bell, 
  BellRing,
  X,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const FloatingWindowButton = () => {
  const { 
    isFloating, 
    isPopupMode,
    error,
    toggleFloatingWindow,
    requestNotificationPermission,
    sendNotification
  } = useFloatingWindow();
  
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  
  // Check notification permission on mount
  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }
  }, []);
  
  // Handle toggle with feedback
  const handleToggle = () => {
    toggleFloatingWindow();
    if (!isFloating) {
      toast.success("Opening floating window...", {
        description: "Signal alerts will appear in the overlay window"
      });
    }
  };
  
  // Enable notifications
  const handleEnableNotifications = async () => {
    const granted = await requestNotificationPermission();
    setNotificationsEnabled(granted);
    
    if (granted) {
      toast.success("Notifications enabled!", {
        description: "You'll receive alerts even when the app is minimized"
      });
      // Test notification
      sendNotification(
        "SENTINEL X",
        "Notifications are now active! You'll be alerted when signals are generated."
      );
    } else {
      toast.error("Notification permission denied", {
        description: "Please enable notifications in your browser settings"
      });
    }
  };
  
  // Show error if popup blocked
  useEffect(() => {
    if (error) {
      toast.error(error, {
        description: "Click the popup icon in your browser's address bar to allow popups"
      });
    }
  }, [error]);
  
  // If in popup mode, show minimal controls
  if (isPopupMode) {
    return (
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="text-xs bg-primary/10 border-primary/30">
          <PictureInPicture2 className="w-3 h-3 mr-1" />
          Floating Mode
        </Badge>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => window.close()}
          className="h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  }
  
  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        {/* Floating Window Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={isFloating ? "default" : "outline"}
              size="sm"
              onClick={handleToggle}
              className="gap-2"
            >
              {isFloating ? (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Close Floating</span>
                </>
              ) : (
                <>
                  <PictureInPicture2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Float Window</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{isFloating ? "Close floating overlay" : "Open as floating overlay window"}</p>
            <p className="text-xs text-muted-foreground">Stays on top of other apps</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Notification Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant={notificationsEnabled ? "default" : "outline"}
              size="icon"
              onClick={handleEnableNotifications}
              className="h-9 w-9"
            >
              {notificationsEnabled ? (
                <BellRing className="w-4 h-4" />
              ) : (
                <Bell className="w-4 h-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>{notificationsEnabled ? "Notifications enabled" : "Enable desktop notifications"}</p>
            <p className="text-xs text-muted-foreground">Get alerts when away from app</p>
          </TooltipContent>
        </Tooltip>
        
        {/* Status indicator */}
        {(isFloating || notificationsEnabled) && (
          <div className="flex items-center gap-1">
            {isFloating && (
              <Badge variant="secondary" className="text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-success mr-1 animate-pulse" />
                Floating
              </Badge>
            )}
            {notificationsEnabled && (
              <Badge variant="secondary" className="text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-primary mr-1" />
                Alerts
              </Badge>
            )}
          </div>
        )}
        
        {/* Error indicator */}
        {error && (
          <Tooltip>
            <TooltipTrigger asChild>
              <AlertCircle className="w-4 h-4 text-destructive" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-destructive">{error}</p>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
};
