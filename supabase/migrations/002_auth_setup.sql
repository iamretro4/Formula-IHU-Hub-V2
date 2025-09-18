-- =====================================================
-- Formula IHU Hub - Authentication & RLS Setup
-- Migration: 20250917_002_auth_setup.sql
-- =====================================================

-- =====================================================
-- AUTH FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to handle new user registration
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    father_name,
    phone,
    emergency_contact,
    campsite_staying,
    ehic_number,
    app_role,
    profile_completed
  ) values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    coalesce(new.raw_user_meta_data->>'father_name', ''),
    coalesce(new.raw_user_meta_data->>'phone', ''),
    coalesce(new.raw_user_meta_data->>'emergency_contact', ''),
    coalesce((new.raw_user_meta_data->>'campsite_staying')::boolean, false),
    coalesce(new.raw_user_meta_data->>'ehic_number', ''),
    coalesce(new.raw_user_meta_data->>'app_role', 'viewer')::user_role,
    false -- Profile needs completion
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger for new user creation
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- =====================================================
-- ROW LEVEL SECURITY POLICIES
-- =====================================================

-- Enable RLS on all tables
alter table teams enable row level security;
alter table user_profiles enable row level security;
alter table inspection_types enable row level security;
alter table bookings enable row level security;
alter table inspection_results enable row level security;
alter table checklist_templates enable row level security;
alter table checklist_checks enable row level security;
alter table track_sessions enable row level security;
alter table track_incidents enable row level security;
alter table dynamic_event_runs enable row level security;
alter table dynamic_event_results enable row level security;
alter table efficiency_results enable row level security;

-- =====================================================
-- USER PROFILES POLICIES
-- =====================================================

-- Users can view their own profile
create policy "Users can view own profile" on user_profiles
  for select using (auth.uid() = id);

-- Users can update their own profile
create policy "Users can update own profile" on user_profiles
  for update using (auth.uid() = id);

-- Admins can view all profiles
create policy "Admins can view all profiles" on user_profiles
  for select using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- Admins can update all profiles
create policy "Admins can update all profiles" on user_profiles
  for update using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- Team members can view other team members
create policy "Team members can view teammates" on user_profiles
  for select using (
    team_id in (
      select team_id from user_profiles where id = auth.uid()
    )
  );

-- =====================================================
-- TEAMS POLICIES
-- =====================================================

-- All authenticated users can view teams
create policy "Authenticated users can view teams" on teams
  for select using (auth.role() = 'authenticated');

-- Admins can manage teams
create policy "Admins can manage teams" on teams
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- =====================================================
-- SCRUTINEERING POLICIES
-- =====================================================

-- Inspection types are viewable by all authenticated users
create policy "Authenticated users can view inspection types" on inspection_types
  for select using (auth.role() = 'authenticated');

-- Admins can manage inspection types
create policy "Admins can manage inspection types" on inspection_types
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- Team members can view their team's bookings
create policy "Team members can view team bookings" on bookings
  for select using (
    team_id in (
      select team_id from user_profiles where id = auth.uid()
    )
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('admin', 'scrutineer')
    )
  );

-- Team leaders and inspection responsible can create bookings
create policy "Team leaders can create bookings" on bookings
  for insert with check (
    team_id in (
      select team_id from user_profiles 
      where id = auth.uid() 
      and app_role in ('team_leader', 'inspection_responsible')
    )
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- Team leaders can update their team's bookings (if not started)
create policy "Team leaders can update team bookings" on bookings
  for update using (
    team_id in (
      select team_id from user_profiles 
      where id = auth.uid() 
      and app_role in ('team_leader', 'inspection_responsible')
    )
    and status = 'upcoming'
  );

-- Scrutineers and admins can view all bookings for current date
create policy "Scrutineers can view current day bookings" on bookings
  for select using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('scrutineer', 'admin')
    )
    and date = current_date
  );

-- Scrutineers can update booking status
create policy "Scrutineers can update booking status" on bookings
  for update using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('scrutineer', 'admin')
    )
  );

-- =====================================================
-- INSPECTION RESULTS POLICIES
-- =====================================================

-- Team members can view their inspection results
create policy "Team members can view team inspection results" on inspection_results
  for select using (
    booking_id in (
      select id from bookings 
      where team_id in (
        select team_id from user_profiles where id = auth.uid()
      )
    )
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('admin', 'scrutineer')
    )
  );

-- Scrutineers can manage inspection results
create policy "Scrutineers can manage inspection results" on inspection_results
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('scrutineer', 'admin')
    )
  );

-- =====================================================
-- CHECKLIST POLICIES
-- =====================================================

-- All authenticated users can view checklist templates
create policy "Authenticated users can view checklist templates" on checklist_templates
  for select using (auth.role() = 'authenticated');

-- Admins can manage checklist templates
create policy "Admins can manage checklist templates" on checklist_templates
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- Team members can view their checklist checks
create policy "Team members can view team checklist checks" on checklist_checks
  for select using (
    inspection_result_id in (
      select ir.id from inspection_results ir
      join bookings b on ir.booking_id = b.id
      where b.team_id in (
        select team_id from user_profiles where id = auth.uid()
      )
    )
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('admin', 'scrutineer')
    )
  );

-- Scrutineers can manage checklist checks
create policy "Scrutineers can manage checklist checks" on checklist_checks
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('scrutineer', 'admin')
    )
  );

-- =====================================================
-- TRACK MARSHAL POLICIES
-- =====================================================

-- Track marshals can view and manage their sessions
create policy "Track marshals can manage own sessions" on track_sessions
  for all using (
    marshal_id = auth.uid()
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- Team members can view their team's sessions
create policy "Team members can view team sessions" on track_sessions
  for select using (
    team_id in (
      select team_id from user_profiles where id = auth.uid()
    )
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('admin', 'track_marshal')
    )
  );

-- Track marshals can manage incidents
create policy "Track marshals can manage incidents" on track_incidents
  for all using (
    marshal_id = auth.uid()
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role = 'admin'
    )
  );

-- =====================================================
-- DYNAMIC EVENTS POLICIES
-- =====================================================

-- Track marshals and admins can manage dynamic event runs
create policy "Track marshals can manage dynamic runs" on dynamic_event_runs
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('track_marshal', 'admin')
    )
  );

-- Team members can view their team's runs
create policy "Team members can view team dynamic runs" on dynamic_event_runs
  for select using (
    team_id in (
      select team_id from user_profiles where id = auth.uid()
    )
    or
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('admin', 'track_marshal', 'viewer')
    )
  );

-- Results are viewable by all authenticated users
create policy "Authenticated users can view dynamic results" on dynamic_event_results
  for select using (auth.role() = 'authenticated');

-- Admins and track marshals can manage results
create policy "Admins can manage dynamic results" on dynamic_event_results
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('admin', 'track_marshal')
    )
  );

-- Efficiency results follow same pattern
create policy "Authenticated users can view efficiency results" on efficiency_results
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage efficiency results" on efficiency_results
  for all using (
    exists (
      select 1 from user_profiles 
      where id = auth.uid() and app_role in ('admin', 'track_marshal')
    )
  );

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get current user's role
create or replace function auth.user_role()
returns user_role as $$
begin
  return (
    select app_role from user_profiles where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Function to get current user's team
create or replace function auth.user_team()
returns uuid as $$
begin
  return (
    select team_id from user_profiles where id = auth.uid()
  );
end;
$$ language plpgsql security definer;

-- Function to check if user has specific role
create or replace function auth.has_role(required_role user_role)
returns boolean as $$
begin
  return exists (
    select 1 from user_profiles 
    where id = auth.uid() and app_role = required_role
  );
end;
$$ language plpgsql security definer;

-- Function to check if user has any of multiple roles
create or replace function auth.has_any_role(required_roles user_role[])
returns boolean as $$
begin
  return exists (
    select 1 from user_profiles 
    where id = auth.uid() and app_role = any(required_roles)
  );
end;
$$ language plpgsql security definer;