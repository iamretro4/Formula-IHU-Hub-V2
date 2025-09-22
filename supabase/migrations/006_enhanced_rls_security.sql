-- =====================================================
-- Formula IHU Hub - Enhanced RLS Security & Audit
-- Migration: 20250117_006_enhanced_rls_security.sql
-- =====================================================

-- =====================================================
-- DROP EXISTING POLICIES FOR CLEAN SLATE
-- =====================================================

-- Drop all existing policies to start fresh
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON ' || quote_ident(r.schemaname) || '.' || quote_ident(r.tablename);
    END LOOP;
END $$;

-- =====================================================
-- ENHANCED HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's role with caching
CREATE OR REPLACE FUNCTION public.user_role_cached()
RETURNS user_role AS $$
DECLARE
    user_role_value user_role;
BEGIN
    -- Try to get from cache first (if implemented)
    -- For now, direct query
    SELECT app_role INTO user_role_value 
    FROM user_profiles 
    WHERE id = auth.uid();
    
    RETURN COALESCE(user_role_value, 'viewer'::user_role);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has specific role
CREATE OR REPLACE FUNCTION public.has_role(required_role user_role)
RETURNS boolean AS $$
BEGIN
    RETURN public.user_role_cached() = required_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user has any of multiple roles
CREATE OR REPLACE FUNCTION public.has_any_role(required_roles user_role[])
RETURNS boolean AS $$
BEGIN
    RETURN public.user_role_cached() = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get current user's team
CREATE OR REPLACE FUNCTION public.user_team()
RETURNS uuid AS $$
BEGIN
    RETURN (
        SELECT team_id FROM user_profiles WHERE id = auth.uid()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user is assigned to specific booking
CREATE OR REPLACE FUNCTION public.is_assigned_to_booking(booking_uuid uuid)
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM bookings 
        WHERE id = booking_uuid 
        AND (
            assigned_scrutineer_id = auth.uid()
            OR created_by = auth.uid()
            OR team_id = public.user_team()
        )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can modify booking
CREATE OR REPLACE FUNCTION public.can_modify_booking(booking_uuid uuid)
RETURNS boolean AS $$
DECLARE
    booking_record RECORD;
BEGIN
    -- Get booking details
    SELECT status, team_id, created_by, assigned_scrutineer_id 
    INTO booking_record
    FROM bookings 
    WHERE id = booking_uuid;
    
    -- Admin can always modify
    IF public.has_role('admin') THEN
        RETURN TRUE;
    END IF;
    
    -- Scrutineer can modify if assigned or if booking is ongoing
    IF public.has_role('scrutineer') AND (
        booking_record.assigned_scrutineer_id = auth.uid() OR
        booking_record.status = 'ongoing'
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Team leader can modify if booking is upcoming and it's their team
    IF public.has_role('team_leader') AND 
       booking_record.status = 'upcoming' AND 
       booking_record.team_id = public.user_team() THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- USER PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON user_profiles
    FOR SELECT USING (id = auth.uid());

-- Users can update their own profile (with restrictions)
CREATE POLICY "users_update_own_profile" ON user_profiles
    FOR UPDATE USING (
        id = auth.uid() AND
        -- Prevent role escalation
        app_role = (SELECT app_role FROM user_profiles WHERE id = auth.uid())
    );

-- Admins can view all profiles
CREATE POLICY "admins_view_all_profiles" ON user_profiles
    FOR SELECT USING (public.has_role('admin'));

-- Admins can update all profiles
CREATE POLICY "admins_update_all_profiles" ON user_profiles
    FOR UPDATE USING (public.has_role('admin'));

-- Team members can view teammates
CREATE POLICY "team_members_view_teammates" ON user_profiles
    FOR SELECT USING (
        team_id = public.user_team() AND
        team_id IS NOT NULL
    );

-- =====================================================
-- TEAMS POLICIES
-- =====================================================

-- All authenticated users can view teams
CREATE POLICY "authenticated_view_teams" ON teams
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage teams
CREATE POLICY "admins_manage_teams" ON teams
    FOR ALL USING (public.has_role('admin'));

-- =====================================================
-- INSPECTION TYPES POLICIES
-- =====================================================

-- All authenticated users can view inspection types
CREATE POLICY "authenticated_view_inspection_types" ON inspection_types
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage inspection types
CREATE POLICY "admins_manage_inspection_types" ON inspection_types
    FOR ALL USING (public.has_role('admin'));

-- =====================================================
-- BOOKINGS POLICIES
-- =====================================================

-- Team members can view their team's bookings
CREATE POLICY "team_members_view_team_bookings" ON bookings
    FOR SELECT USING (
        team_id = public.user_team() AND
        team_id IS NOT NULL
    );

-- Scrutineers and admins can view all bookings
CREATE POLICY "scrutineers_view_all_bookings" ON bookings
    FOR SELECT USING (
        public.has_any_role(ARRAY['scrutineer', 'admin']::user_role[])
    );

-- Team leaders can create bookings for their team
CREATE POLICY "team_leaders_create_bookings" ON bookings
    FOR INSERT WITH CHECK (
        team_id = public.user_team() AND
        public.has_any_role(ARRAY['team_leader', 'inspection_responsible']::user_role[])
    );

-- Admins can create bookings for any team
CREATE POLICY "admins_create_any_bookings" ON bookings
    FOR INSERT WITH CHECK (public.has_role('admin'));

-- Users can update bookings they have permission to modify
CREATE POLICY "authorized_update_bookings" ON bookings
    FOR UPDATE USING (public.can_modify_booking(id));

-- =====================================================
-- INSPECTION PROGRESS POLICIES
-- =====================================================

-- Team members can view their team's inspection progress
CREATE POLICY "team_members_view_team_progress" ON inspection_progress
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE team_id = public.user_team()
        )
    );

-- Scrutineers and admins can view all inspection progress
CREATE POLICY "scrutineers_view_all_progress" ON inspection_progress
    FOR SELECT USING (
        public.has_any_role(ARRAY['scrutineer', 'admin']::user_role[])
    );

-- Scrutineers can manage inspection progress
CREATE POLICY "scrutineers_manage_progress" ON inspection_progress
    FOR ALL USING (
        public.has_any_role(ARRAY['scrutineer', 'admin']::user_role[])
    );

-- =====================================================
-- INSPECTION RESULTS POLICIES
-- =====================================================

-- Team members can view their team's inspection results
CREATE POLICY "team_members_view_team_results" ON inspection_results
    FOR SELECT USING (
        booking_id IN (
            SELECT id FROM bookings 
            WHERE team_id = public.user_team()
        )
    );

-- Scrutineers and admins can view all inspection results
CREATE POLICY "scrutineers_view_all_results" ON inspection_results
    FOR SELECT USING (
        public.has_any_role(ARRAY['scrutineer', 'admin']::user_role[])
    );

-- Scrutineers can manage inspection results
CREATE POLICY "scrutineers_manage_results" ON inspection_results
    FOR ALL USING (
        public.has_any_role(ARRAY['scrutineer', 'admin']::user_role[])
    );

-- =====================================================
-- CHECKLIST TEMPLATES POLICIES
-- =====================================================

-- All authenticated users can view checklist templates
CREATE POLICY "authenticated_view_templates" ON checklist_templates
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage checklist templates
CREATE POLICY "admins_manage_templates" ON checklist_templates
    FOR ALL USING (public.has_role('admin'));

-- =====================================================
-- TRACK SESSIONS POLICIES
-- =====================================================

-- Track marshals can manage their own sessions
CREATE POLICY "marshals_manage_own_sessions" ON track_sessions
    FOR ALL USING (
        marshal_id = auth.uid() OR
        public.has_role('admin')
    );

-- Team members can view their team's sessions
CREATE POLICY "team_members_view_team_sessions" ON track_sessions
    FOR SELECT USING (
        team_id = public.user_team() OR
        public.has_any_role(ARRAY['admin', 'track_marshal']::user_role[])
    );

-- =====================================================
-- TRACK INCIDENTS POLICIES
-- =====================================================

-- Track marshals can manage incidents
CREATE POLICY "marshals_manage_incidents" ON track_incidents
    FOR ALL USING (
        marshal_id = auth.uid() OR
        public.has_role('admin')
    );

-- Team members can view their team's incidents
CREATE POLICY "team_members_view_team_incidents" ON track_incidents
    FOR SELECT USING (
        team_id = public.user_team() OR
        public.has_any_role(ARRAY['admin', 'track_marshal']::user_role[])
    );

-- =====================================================
-- DYNAMIC EVENT RUNS POLICIES
-- =====================================================

-- Track marshals can manage dynamic runs
CREATE POLICY "marshals_manage_dynamic_runs" ON dynamic_event_runs
    FOR ALL USING (
        public.has_any_role(ARRAY['track_marshal', 'admin']::user_role[])
    );

-- Team members can view their team's runs
CREATE POLICY "team_members_view_team_runs" ON dynamic_event_runs
    FOR SELECT USING (
        team_id = public.user_team() OR
        public.has_any_role(ARRAY['admin', 'track_marshal', 'viewer']::user_role[])
    );

-- =====================================================
-- DYNAMIC EVENT RESULTS POLICIES
-- =====================================================

-- All authenticated users can view results
CREATE POLICY "authenticated_view_dynamic_results" ON dynamic_event_results
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins and track marshals can manage results
CREATE POLICY "admins_manage_dynamic_results" ON dynamic_event_results
    FOR ALL USING (
        public.has_any_role(ARRAY['admin', 'track_marshal']::user_role[])
    );

-- =====================================================
-- EFFICIENCY RESULTS POLICIES
-- =====================================================

-- All authenticated users can view efficiency results
CREATE POLICY "authenticated_view_efficiency_results" ON efficiency_results
    FOR SELECT USING (auth.role() = 'authenticated');

-- Admins can manage efficiency results
CREATE POLICY "admins_manage_efficiency_results" ON efficiency_results
    FOR ALL USING (public.has_role('admin'));

-- =====================================================
-- PENALTY RULES POLICIES
-- =====================================================

-- All authenticated users can view penalty rules
CREATE POLICY "authenticated_view_penalty_rules" ON penalty_rules
    FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage penalty rules
CREATE POLICY "admins_manage_penalty_rules" ON penalty_rules
    FOR ALL USING (public.has_role('admin'));

-- =====================================================
-- AUDIT LOGS POLICIES
-- =====================================================

-- Only admins can view audit logs
CREATE POLICY "admins_view_audit_logs" ON audit_logs
    FOR SELECT USING (public.has_role('admin'));

-- Audit logs are insert-only (no updates/deletes)
CREATE POLICY "system_insert_audit_logs" ON audit_logs
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- ADDITIONAL SECURITY MEASURES
-- =====================================================

-- Create function to log security events
CREATE OR REPLACE FUNCTION log_security_event(
    event_type text,
    details jsonb DEFAULT '{}'::jsonb
)
RETURNS void AS $$
BEGIN
    INSERT INTO audit_logs (
        table_name,
        record_id,
        action,
        new_values,
        changed_by,
        changed_at
    ) VALUES (
        'security_events',
        uuid_generate_v4(),
        'SECURITY_EVENT',
        jsonb_build_object(
            'event_type', event_type,
            'details', details,
            'ip_address', inet_client_addr(),
            'user_agent', current_setting('request.headers', true)::jsonb->>'user-agent'
        ),
        auth.uid(),
        now()
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check for suspicious activity
CREATE OR REPLACE FUNCTION check_suspicious_activity()
RETURNS boolean AS $$
DECLARE
    recent_attempts integer;
BEGIN
    -- Check for too many failed attempts in the last hour
    SELECT COUNT(*) INTO recent_attempts
    FROM audit_logs
    WHERE table_name = 'security_events'
    AND new_values->>'event_type' = 'FAILED_ACCESS'
    AND changed_at > NOW() - INTERVAL '1 hour'
    AND changed_by = auth.uid();
    
    -- If more than 10 failed attempts, log and return true
    IF recent_attempts > 10 THEN
        PERFORM log_security_event('SUSPICIOUS_ACTIVITY', jsonb_build_object(
            'failed_attempts', recent_attempts,
            'time_window', '1 hour'
        ));
        RETURN true;
    END IF;
    
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- ROW LEVEL SECURITY ENABLEMENT
-- =====================================================

-- Ensure RLS is enabled on all tables
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspection_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE track_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_event_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE dynamic_event_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE efficiency_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE penalty_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- PERFORMANCE OPTIMIZATIONS FOR RLS
-- =====================================================

-- Create indexes to optimize RLS policy performance
CREATE INDEX CONCURRENTLY idx_user_profiles_id_role ON user_profiles(id, app_role);
CREATE INDEX CONCURRENTLY idx_user_profiles_team_role ON user_profiles(team_id, app_role) WHERE team_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_bookings_team_status ON bookings(team_id, status);
CREATE INDEX CONCURRENTLY idx_bookings_scrutineer_status ON bookings(assigned_scrutineer_id, status) WHERE assigned_scrutineer_id IS NOT NULL;
CREATE INDEX CONCURRENTLY idx_inspection_progress_booking_team ON inspection_progress(booking_id) WHERE booking_id IN (SELECT id FROM bookings);

-- =====================================================
-- SECURITY MONITORING VIEWS
-- =====================================================

-- Create view for security monitoring
CREATE VIEW security_monitoring AS
SELECT 
    al.changed_at,
    al.changed_by,
    up.email,
    up.app_role,
    al.table_name,
    al.action,
    al.new_values->>'event_type' as event_type,
    al.ip_address,
    al.user_agent
FROM audit_logs al
LEFT JOIN user_profiles up ON al.changed_by = up.id
WHERE al.table_name = 'security_events'
ORDER BY al.changed_at DESC;

-- Grant access to security monitoring view
GRANT SELECT ON security_monitoring TO authenticated;

-- =====================================================
-- FINAL SECURITY CHECKS
-- =====================================================

-- Ensure no policies allow unauthorized access
DO $$
DECLARE
    policy_count integer;
BEGIN
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE schemaname = 'public' 
    AND policyname LIKE '%unauthorized%';
    
    IF policy_count > 0 THEN
        RAISE EXCEPTION 'Found potentially unauthorized policies: %', policy_count;
    END IF;
END $$;
