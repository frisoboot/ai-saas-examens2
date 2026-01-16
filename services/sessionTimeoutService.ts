/**
 * Session Timeout Service
 *
 * SECURITY: Implements automatic session timeout for security purposes.
 * Sessions will automatically expire after a period of inactivity.
 *
 * Default timeouts:
 * - Admin sessions: 30 minutes of inactivity
 * - Student sessions: 60 minutes of inactivity
 *
 * Usage:
 * 1. Call startSessionMonitoring() after successful login
 * 2. The service will automatically track user activity
 * 3. On timeout, the onTimeout callback will be called
 */

import { supabase } from './supabaseService';

// Session timeout configuration (in milliseconds)
const SESSION_TIMEOUT_CONFIG = {
  admin: 30 * 60 * 1000,    // 30 minutes for admin
  student: 60 * 60 * 1000,  // 60 minutes for students
  warning: 5 * 60 * 1000    // Show warning 5 minutes before timeout
};

let activityTimer: NodeJS.Timeout | null = null;
let warningTimer: NodeJS.Timeout | null = null;
let lastActivity: number = Date.now();
let sessionStartTime: number = Date.now();
let currentRole: 'admin' | 'student' | null = null;
let onTimeoutCallback: (() => void) | null = null;
let onWarningCallback: ((remainingMinutes: number) => void) | null = null;

// Activity events to track
const ACTIVITY_EVENTS = [
  'mousedown',
  'mousemove',
  'keydown',
  'scroll',
  'touchstart',
  'click'
];

/**
 * Record user activity (resets the timeout timer)
 */
function recordActivity(): void {
  lastActivity = Date.now();
}

/**
 * Check if session has timed out
 */
function checkTimeout(): void {
  if (!currentRole) return;

  const timeout = SESSION_TIMEOUT_CONFIG[currentRole];
  const timeSinceActivity = Date.now() - lastActivity;

  if (timeSinceActivity >= timeout) {
    // Session has timed out
    console.log('[SESSION] Session timed out due to inactivity');
    handleTimeout();
  } else {
    // Check if we need to show warning
    const timeUntilTimeout = timeout - timeSinceActivity;
    if (timeUntilTimeout <= SESSION_TIMEOUT_CONFIG.warning && onWarningCallback) {
      const remainingMinutes = Math.ceil(timeUntilTimeout / 60000);
      onWarningCallback(remainingMinutes);
    }
  }
}

/**
 * Handle session timeout
 */
async function handleTimeout(): Promise<void> {
  // Stop monitoring
  stopSessionMonitoring();

  // Sign out from Supabase
  if (supabase) {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('[SESSION] Error signing out:', error);
    }
  }

  // Clear any stored session data
  try {
    localStorage.removeItem('adminUser');
    localStorage.removeItem('currentStudent');
    sessionStorage.clear();
  } catch (error) {
    // Ignore storage errors
  }

  // Call the timeout callback
  if (onTimeoutCallback) {
    onTimeoutCallback();
  }
}

/**
 * Start session monitoring
 *
 * @param role - The user's role (admin or student)
 * @param onTimeout - Callback when session times out
 * @param onWarning - Optional callback when session is about to timeout
 */
export function startSessionMonitoring(
  role: 'admin' | 'student',
  onTimeout: () => void,
  onWarning?: (remainingMinutes: number) => void
): void {
  // Stop any existing monitoring
  stopSessionMonitoring();

  currentRole = role;
  onTimeoutCallback = onTimeout;
  onWarningCallback = onWarning || null;
  lastActivity = Date.now();
  sessionStartTime = Date.now();

  console.log(`[SESSION] Started monitoring for ${role} session`);

  // Add activity event listeners
  ACTIVITY_EVENTS.forEach(event => {
    document.addEventListener(event, recordActivity, { passive: true });
  });

  // Start the timeout check interval (check every minute)
  activityTimer = setInterval(checkTimeout, 60 * 1000);

  // Do an initial check after the warning threshold
  const timeout = SESSION_TIMEOUT_CONFIG[role];
  const warningTime = timeout - SESSION_TIMEOUT_CONFIG.warning;
  warningTimer = setTimeout(() => {
    checkTimeout();
  }, warningTime);
}

/**
 * Stop session monitoring
 */
export function stopSessionMonitoring(): void {
  // Remove activity event listeners
  ACTIVITY_EVENTS.forEach(event => {
    document.removeEventListener(event, recordActivity);
  });

  // Clear timers
  if (activityTimer) {
    clearInterval(activityTimer);
    activityTimer = null;
  }
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimer = null;
  }

  // Reset state
  currentRole = null;
  onTimeoutCallback = null;
  onWarningCallback = null;

  console.log('[SESSION] Stopped monitoring');
}

/**
 * Extend the session (reset the activity timer)
 * Call this when user explicitly requests to stay logged in
 */
export function extendSession(): void {
  lastActivity = Date.now();
  console.log('[SESSION] Session extended');
}

/**
 * Get session information
 */
export function getSessionInfo(): {
  role: string | null;
  lastActivity: Date;
  sessionStart: Date;
  timeoutIn: number | null;
} {
  const timeout = currentRole ? SESSION_TIMEOUT_CONFIG[currentRole] : null;
  const timeSinceActivity = Date.now() - lastActivity;
  const timeoutIn = timeout ? timeout - timeSinceActivity : null;

  return {
    role: currentRole,
    lastActivity: new Date(lastActivity),
    sessionStart: new Date(sessionStartTime),
    timeoutIn: timeoutIn && timeoutIn > 0 ? timeoutIn : null
  };
}

/**
 * Check if user is currently authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
  } catch {
    return false;
  }
}
