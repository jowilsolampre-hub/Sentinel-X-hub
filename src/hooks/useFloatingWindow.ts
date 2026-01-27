// SENTINEL X - Floating Window / Popup Overlay Hook
// Enables app to run as floating overlay on top of other windows

import { useState, useCallback, useEffect } from "react";

export interface FloatingWindowState {
  isFloating: boolean;
  windowRef: Window | null;
  error: string | null;
}

// Window configuration
const POPUP_CONFIG = {
  width: 420,
  height: 600,
  features: "popup=true,scrollbars=yes,resizable=yes,status=no,location=no,toolbar=no,menubar=no"
};

// Store signal data for popup window
let signalDataCallback: ((data: unknown) => void) | null = null;

export const setSignalDataCallback = (callback: (data: unknown) => void) => {
  signalDataCallback = callback;
};

export const sendSignalToPopup = (signalData: unknown) => {
  if (signalDataCallback) {
    signalDataCallback(signalData);
  }
};

export const useFloatingWindow = () => {
  const [state, setState] = useState<FloatingWindowState>({
    isFloating: false,
    windowRef: null,
    error: null
  });

  // Open floating popup window
  const openFloatingWindow = useCallback(() => {
    try {
      // Calculate position (top-right corner)
      const left = window.screen.width - POPUP_CONFIG.width - 20;
      const top = 20;

      // Open popup window
      const popup = window.open(
        window.location.href + "?popup=true",
        "SentinelX_Signals",
        `${POPUP_CONFIG.features},width=${POPUP_CONFIG.width},height=${POPUP_CONFIG.height},left=${left},top=${top}`
      );

      if (!popup) {
        setState(prev => ({
          ...prev,
          error: "Popup blocked! Please allow popups for this site."
        }));
        return false;
      }

      // Focus the popup
      popup.focus();

      setState({
        isFloating: true,
        windowRef: popup,
        error: null
      });

      // Monitor popup close
      const checkPopupInterval = setInterval(() => {
        if (popup.closed) {
          clearInterval(checkPopupInterval);
          setState({
            isFloating: false,
            windowRef: null,
            error: null
          });
        }
      }, 500);

      console.log("[FLOATING] Popup window opened successfully");
      return true;
    } catch (error) {
      console.error("[FLOATING] Error opening popup:", error);
      setState(prev => ({
        ...prev,
        error: "Failed to open floating window"
      }));
      return false;
    }
  }, []);

  // Close floating window
  const closeFloatingWindow = useCallback(() => {
    if (state.windowRef && !state.windowRef.closed) {
      state.windowRef.close();
    }
    setState({
      isFloating: false,
      windowRef: null,
      error: null
    });
    console.log("[FLOATING] Popup window closed");
  }, [state.windowRef]);

  // Toggle floating window
  const toggleFloatingWindow = useCallback(() => {
    if (state.isFloating) {
      closeFloatingWindow();
    } else {
      openFloatingWindow();
    }
  }, [state.isFloating, openFloatingWindow, closeFloatingWindow]);

  // Request notification permission for overlay alerts
  const requestNotificationPermission = useCallback(async () => {
    if (!("Notification" in window)) {
      return false;
    }

    if (Notification.permission === "granted") {
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }

    return false;
  }, []);

  // Send desktop notification (works even when minimized)
  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (Notification.permission === "granted") {
      const notification = new Notification(title, {
        body,
        icon: icon || "/favicon.ico",
        badge: "/favicon.ico",
        tag: "sentinel-signal",
        requireInteraction: true, // Keeps notification visible until user interacts
        silent: false
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Auto-close after 30 seconds
      setTimeout(() => notification.close(), 30000);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (state.windowRef && !state.windowRef.closed) {
        // Don't auto-close on component unmount - user may want to keep it open
      }
    };
  }, [state.windowRef]);

  // Check if running in popup mode
  const isPopupMode = typeof window !== "undefined" && 
    window.location.search.includes("popup=true");

  return {
    isFloating: state.isFloating,
    isPopupMode,
    error: state.error,
    openFloatingWindow,
    closeFloatingWindow,
    toggleFloatingWindow,
    requestNotificationPermission,
    sendNotification
  };
};

// Utility to check if popups are likely blocked
export const checkPopupSupport = (): boolean => {
  const testPopup = window.open("", "_blank", "width=1,height=1");
  if (testPopup) {
    testPopup.close();
    return true;
  }
  return false;
};
