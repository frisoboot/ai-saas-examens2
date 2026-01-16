-- ============================================================================
-- AUDIT LOGS TABLE MIGRATION
-- Security Enhancement: Audit logging for all admin and sensitive operations
-- ============================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(100) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('admin', 'student', 'system', 'cron')),
    target_type VARCHAR(50),
    target_id VARCHAR(255),
    details JSONB,
    ip_address VARCHAR(45),  -- IPv6 max length
    user_agent TEXT,
    success BOOLEAN NOT NULL DEFAULT true,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON audit_logs(actor);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_type ON audit_logs(actor_type);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_success ON audit_logs(success) WHERE NOT success;

-- RLS policies for audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only service role can insert (server-side only)
CREATE POLICY audit_logs_insert_service ON audit_logs
    FOR INSERT
    TO service_role
    WITH CHECK (true);

-- Admins can read audit logs
CREATE POLICY audit_logs_read_admin ON audit_logs
    FOR SELECT
    TO authenticated
    USING (
        auth.jwt() ->> 'role' = 'admin' OR
        (auth.jwt() -> 'user_metadata' ->> 'role') = 'admin'
    );

-- Add comments for documentation
COMMENT ON TABLE audit_logs IS 'Security audit log for all admin and sensitive operations';
COMMENT ON COLUMN audit_logs.action IS 'The type of action performed (e.g., admin_login, student_created)';
COMMENT ON COLUMN audit_logs.actor IS 'Username or identifier of who performed the action';
COMMENT ON COLUMN audit_logs.actor_type IS 'Type of actor: admin, student, system, or cron';
COMMENT ON COLUMN audit_logs.target_type IS 'Type of object affected (e.g., student, question)';
COMMENT ON COLUMN audit_logs.target_id IS 'ID of the affected object';
COMMENT ON COLUMN audit_logs.details IS 'Additional details about the action in JSON format';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the request';
COMMENT ON COLUMN audit_logs.user_agent IS 'User agent string from the request';
COMMENT ON COLUMN audit_logs.success IS 'Whether the action succeeded';
COMMENT ON COLUMN audit_logs.error_message IS 'Error message if action failed';

-- ============================================================================
-- Data retention: Automatically delete audit logs older than 1 year
-- This can be called by a cron job
-- ============================================================================

CREATE OR REPLACE FUNCTION cleanup_old_audit_logs()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM audit_logs
    WHERE created_at < NOW() - INTERVAL '1 year';

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    -- Log the cleanup action
    INSERT INTO audit_logs (action, actor, actor_type, details, success)
    VALUES ('cron_job_executed', 'cleanup_old_audit_logs', 'cron',
            jsonb_build_object('deleted_count', deleted_count), true);

    RETURN deleted_count;
END;
$$;

-- Grant execute to service role
GRANT EXECUTE ON FUNCTION cleanup_old_audit_logs() TO service_role;
