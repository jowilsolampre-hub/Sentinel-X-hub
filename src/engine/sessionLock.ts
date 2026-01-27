// SENTINEL X - Session Lock Enforcement (v5)
// When engine starts, it locks to the currently active session

import { Session, SESSION_TIMES } from "@/types/trading";

interface SessionLockState {
  lockedSession: Session | null;
  lockTime: Date | null;
  isLocked: boolean;
}

let sessionLockState: SessionLockState = {
  lockedSession: null,
  lockTime: null,
  isLocked: false
};

// Detect current active session
export const detectActiveSession = (): Session => {
  const hour = new Date().getUTCHours();
  
  // Check session overlaps - prioritize major sessions
  if (hour >= SESSION_TIMES.London.start && hour < SESSION_TIMES.London.end) {
    return "London";
  }
  if (hour >= SESSION_TIMES.NewYork.start && hour < SESSION_TIMES.NewYork.end) {
    return "NewYork";
  }
  if (hour >= SESSION_TIMES.Tokyo.start && hour < SESSION_TIMES.Tokyo.end) {
    return "Tokyo";
  }
  if (hour >= SESSION_TIMES.Sydney.start || hour < SESSION_TIMES.Sydney.end) {
    return "Sydney";
  }
  
  return "Closed";
};

// Lock engine to current session
export const lockToCurrentSession = (): SessionLockState => {
  const currentSession = detectActiveSession();
  
  sessionLockState = {
    lockedSession: currentSession,
    lockTime: new Date(),
    isLocked: true
  };
  
  console.log(`[SESSION-LOCK] Engine locked to ${currentSession} session at ${sessionLockState.lockTime?.toISOString()}`);
  
  return sessionLockState;
};

// Check if current time is still within locked session
export const isWithinLockedSession = (): boolean => {
  if (!sessionLockState.isLocked || !sessionLockState.lockedSession) {
    return false;
  }
  
  const currentSession = detectActiveSession();
  
  // If locked to Closed, allow scanning (low activity mode)
  if (sessionLockState.lockedSession === "Closed") {
    return currentSession === "Closed";
  }
  
  // Engine stays locked to original session - does NOT roll into next
  return currentSession === sessionLockState.lockedSession;
};

// Get session lock state
export const getSessionLockState = (): SessionLockState => {
  return { ...sessionLockState };
};

// Check if session is valid for scanning
export const canScanInCurrentSession = (): { canScan: boolean; reason: string } => {
  if (!sessionLockState.isLocked) {
    return { canScan: false, reason: "Engine not started - no session lock" };
  }
  
  if (sessionLockState.lockedSession === "Closed") {
    return { canScan: false, reason: "No active session - market closed" };
  }
  
  if (!isWithinLockedSession()) {
    return { 
      canScan: false, 
      reason: `Session ${sessionLockState.lockedSession} ended - restart required` 
    };
  }
  
  return { canScan: true, reason: "Session active" };
};

// Release session lock (on engine stop)
export const releaseSessionLock = (): void => {
  console.log(`[SESSION-LOCK] Releasing lock from ${sessionLockState.lockedSession} session`);
  
  sessionLockState = {
    lockedSession: null,
    lockTime: null,
    isLocked: false
  };
};

// Get remaining session time in milliseconds
export const getRemainingSessionTime = (): number => {
  if (!sessionLockState.lockedSession || sessionLockState.lockedSession === "Closed") {
    return 0;
  }
  
  const now = new Date();
  const hour = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  const currentMinutes = hour * 60 + minutes;
  
  const sessionEnd = SESSION_TIMES[sessionLockState.lockedSession].end;
  const endMinutes = sessionEnd * 60;
  
  // Handle session end crossing midnight
  let remainingMinutes = endMinutes - currentMinutes;
  if (remainingMinutes < 0) {
    remainingMinutes += 24 * 60;
  }
  
  return remainingMinutes * 60 * 1000;
};
