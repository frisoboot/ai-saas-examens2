/**
 * Audit Logger for Admin Actions
 *
 * This module provides audit logging for security-sensitive operations.
 * All admin actions are logged for compliance and forensics.
 */

import { createClient } from '@supabase/supabase-js';

export interface AuditLogEntry {
  action: AuditAction;
  actor: string;  // Username or 'system' for automated actions
  actorType: 'admin' | 'student' | 'system' | 'cron';
  targetType?: 'student' | 'question' | 'subscription' | 'settings';
  targetId?: string;  // e.g., student name, question ID
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  success: boolean;
  errorMessage?: string;
}

export type AuditAction =
  // Authentication
  | 'admin_login'
  | 'admin_login_failed'
  | 'student_login'
  | 'student_login_failed'
  | 'logout'
  // Student management
  | 'student_created'
  | 'student_deleted'
  | 'student_updated'
  | 'student_password_reset'
  | 'student_activated'
  | 'student_deactivated'
  // Subscription management
  | 'subscription_started'
  | 'subscription_cancelled'
  | 'subscription_expired'
  | 'trial_started'
  | 'trial_expired'
  // Question management
  | 'questions_imported'
  | 'question_deleted'
  | 'question_updated'
  // System events
  | 'cron_job_executed'
  | 'api_rate_limited'
  | 'security_alert';

// In-memory buffer for batch writes (reduces database calls)
let auditBuffer: Array<AuditLogEntry & { timestamp: string }> = [];
let flushTimer: NodeJS.Timeout | null = null;
const BUFFER_SIZE = 10;
const FLUSH_INTERVAL = 5000; // 5 seconds

/**
 * Log an audit event
 *
 * @param entry - The audit log entry
 */
export async function logAuditEvent(entry: AuditLogEntry): Promise<void> {
  const timestamp = new Date().toISOString();

  // Add to buffer
  auditBuffer.push({ ...entry, timestamp });

  // Log to console for immediate visibility
  const logLevel = entry.success ? 'info' : 'warn';
  const logMessage = `[AUDIT] ${entry.action} by ${entry.actorType}:${entry.actor}` +
    (entry.targetId ? ` on ${entry.targetType}:${entry.targetId}` : '') +
    ` - ${entry.success ? 'SUCCESS' : 'FAILED'}` +
    (entry.errorMessage ? ` - ${entry.errorMessage}` : '');

  if (logLevel === 'warn') {
    console.warn(logMessage);
  } else {
    console.log(logMessage);
  }

  // Flush if buffer is full
  if (auditBuffer.length >= BUFFER_SIZE) {
    await flushAuditBuffer();
  } else if (!flushTimer) {
    // Set timer to flush after interval
    flushTimer = setTimeout(() => {
      flushAuditBuffer().catch(console.error);
    }, FLUSH_INTERVAL);
  }
}

/**
 * Flush audit buffer to database
 */
async function flushAuditBuffer(): Promise<void> {
  if (auditBuffer.length === 0) return;

  // Clear timer
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }

  // Get buffer and reset
  const entries = [...auditBuffer];
  auditBuffer = [];

  // Try to write to database
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    // Can't write to database, just log to console
    console.warn('[AUDIT] Cannot flush to database - missing Supabase config');
    return;
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Insert audit logs
    const { error } = await supabase.from('audit_logs').insert(
      entries.map(e => ({
        action: e.action,
        actor: e.actor,
        actor_type: e.actorType,
        target_type: e.targetType,
        target_id: e.targetId,
        details: e.details,
        ip_address: e.ipAddress,
        user_agent: e.userAgent,
        success: e.success,
        error_message: e.errorMessage,
        created_at: e.timestamp
      }))
    );

    if (error) {
      // Table might not exist yet - log warning but don't fail
      if (error.code === '42P01') {
        console.warn('[AUDIT] audit_logs table does not exist yet. Run the migration to create it.');
      } else {
        console.error('[AUDIT] Failed to write audit logs:', error);
      }
    }
  } catch (error) {
    console.error('[AUDIT] Error flushing audit buffer:', error);
  }
}

/**
 * Helper function to extract client info from request
 */
export function getClientInfo(req: { headers: Record<string, string | string[] | undefined> }): {
  ipAddress: string;
  userAgent: string;
} {
  const forwarded = req.headers['x-forwarded-for'];
  const realIp = req.headers['x-real-ip'];
  const userAgent = req.headers['user-agent'];

  let ipAddress = 'unknown';
  if (forwarded) {
    ipAddress = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(',')[0].trim();
  } else if (realIp) {
    ipAddress = Array.isArray(realIp) ? realIp[0] : realIp;
  }

  return {
    ipAddress,
    userAgent: Array.isArray(userAgent) ? userAgent[0] : userAgent || 'unknown'
  };
}

/**
 * Convenience functions for common audit events
 */
export const AuditLogger = {
  adminLogin: (actor: string, success: boolean, clientInfo: { ipAddress: string; userAgent: string }, errorMessage?: string) =>
    logAuditEvent({
      action: success ? 'admin_login' : 'admin_login_failed',
      actor,
      actorType: 'admin',
      success,
      errorMessage,
      ...clientInfo
    }),

  studentLogin: (actor: string, success: boolean, clientInfo: { ipAddress: string; userAgent: string }, errorMessage?: string) =>
    logAuditEvent({
      action: success ? 'student_login' : 'student_login_failed',
      actor,
      actorType: 'student',
      success,
      errorMessage,
      ...clientInfo
    }),

  studentCreated: (adminActor: string, studentName: string, clientInfo: { ipAddress: string; userAgent: string }) =>
    logAuditEvent({
      action: 'student_created',
      actor: adminActor,
      actorType: 'admin',
      targetType: 'student',
      targetId: studentName,
      success: true,
      ...clientInfo
    }),

  studentDeleted: (adminActor: string, studentName: string, clientInfo: { ipAddress: string; userAgent: string }) =>
    logAuditEvent({
      action: 'student_deleted',
      actor: adminActor,
      actorType: 'admin',
      targetType: 'student',
      targetId: studentName,
      success: true,
      ...clientInfo
    }),

  studentPasswordReset: (adminActor: string, studentName: string, clientInfo: { ipAddress: string; userAgent: string }) =>
    logAuditEvent({
      action: 'student_password_reset',
      actor: adminActor,
      actorType: 'admin',
      targetType: 'student',
      targetId: studentName,
      success: true,
      ...clientInfo
    }),

  subscriptionEvent: (studentName: string, action: 'subscription_started' | 'subscription_cancelled' | 'subscription_expired' | 'trial_started' | 'trial_expired') =>
    logAuditEvent({
      action,
      actor: 'system',
      actorType: 'system',
      targetType: 'student',
      targetId: studentName,
      success: true
    }),

  cronJobExecuted: (jobName: string, success: boolean, details?: Record<string, any>, errorMessage?: string) =>
    logAuditEvent({
      action: 'cron_job_executed',
      actor: jobName,
      actorType: 'cron',
      details,
      success,
      errorMessage
    }),

  rateLimited: (ipAddress: string, endpoint: string) =>
    logAuditEvent({
      action: 'api_rate_limited',
      actor: ipAddress,
      actorType: 'system',
      details: { endpoint },
      success: true,
      ipAddress
    }),

  securityAlert: (message: string, details?: Record<string, any>, clientInfo?: { ipAddress: string; userAgent: string }) =>
    logAuditEvent({
      action: 'security_alert',
      actor: 'system',
      actorType: 'system',
      details: { message, ...details },
      success: false,
      errorMessage: message,
      ...clientInfo
    })
};
