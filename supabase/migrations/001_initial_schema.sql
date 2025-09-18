-- =====================================================
-- Formula IHU Hub - Initial Database Schema
-- Migration: 20250917_001_initial_schema.sql
-- =====================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "postgis";

-- =====================================================
-- ENUM TYPES
-- =====================================================

-- User roles for the application
create type user_role as enum (
  'admin',
  'scrutineer', 
  'team_leader',
  'inspection_responsible',
  'team_member',
  'design_judge_software',
  'design_judge_mechanical', 
  'design_judge_electronics',
  'design_judge_overall',
  'bp_judge',
  'cm_judge',
  'track_marshal',
  'viewer'
);

-- Vehicle classifications
create type vehicle_class as enum ('EV', 'CV');

-- Inspection types based on Formula Student rules
create type inspection_type_enum as enum (
  'pre_inspection',
  'mechanical',
  'accumulator', 
  'electrical',
  'noise_test',
  'brake_test',
  'tilt_test',
  'rain_test'
);

-- Booking and inspection statuses
create type booking_status as enum (
  'upcoming',
  'ongoing', 
  'completed',
  'cancelled',
  'no_show'
);

create type result_status as enum (
  'ongoing',
  'passed',
  'failed',
  'conditional_pass'
);

-- Track marshal enums
create type session_status as enum ('active', 'completed', 'cancelled');
create type incident_type as enum ('DOO', 'OOC', 'OTHER');
create type severity_level as enum ('minor', 'major', 'critical');

-- Dynamic events
create type dynamic_event_type as enum (
  'acceleration',
  'skidpad', 
  'autocross',
  'endurance'
);

create type run_status as enum (
  'completed',
  'dsq',
  'dnf',
  'cancelled'
);

-- Document management
create type document_event_type as enum (
  'design',
  'business_plan',
  'cost_manufacturing'
);

create type document_type as enum (
  'engineering_design_report',
  'bom',
  'cost_report', 
  'business_plan_presentation',
  'technical_drawings',
  'other'
);

create type document_status as enum (
  'pending_review',
  'approved',
  'rejected', 
  'revision_required'
);

-- System notifications
create type notification_type as enum (
  'info',
  'success',
  'warning',
  'error',
  'critical'
);

-- Penalties
create type penalty_type as enum (
  'time_penalty',
  'points_deduction',
  'dsq'
);

create type penalty_unit as enum (
  'seconds',
  'points',
  'percentage'
);

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Teams table
create table teams (
  id uuid primary key default uuid_generate_v4(),
  name text unique not null,
  code text unique not null,
  vehicle_class vehicle_class not null,
  university text not null,
  drivers jsonb default '[]',
  vehicle_number integer unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Extended user profiles table
create table user_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  first_name text not null,
  last_name text not null,
  father_name text not null,
  phone text not null,
  emergency_contact text not null,
  campsite_staying boolean not null default false,
  ehic_number text not null,
  team_id uuid references teams(id),
  app_role user_role not null,
  profile_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- =====================================================
-- SCRUTINEERING SYSTEM
-- =====================================================

-- Inspection types configuration
create table inspection_types (
  id uuid primary key default uuid_generate_v4(),
  key inspection_type_enum unique not null,
  name text not null,
  description text,
  duration_minutes integer not null,
  concurrent_slots integer not null default 1,
  sort_order integer not null,
  prerequisites text[] default '{}', -- Array of required inspection keys
  active boolean default true,
  created_at timestamptz default now()
);

-- Inspection bookings
create table bookings (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) not null,
  inspection_type_id uuid references inspection_types(id) not null,
  date date not null,
  start_time time not null,
  end_time time not null,
  resource_index integer not null default 1,
  status booking_status not null default 'upcoming',
  is_rescrutineering boolean default false,
  priority_level integer default 0, -- Higher = more priority
  notes text,
  created_by uuid references auth.users(id) not null,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure no double bookings
  unique(inspection_type_id, date, start_time, resource_index)
);

-- Live inspection results
create table inspection_results (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) not null unique,
  status result_status not null default 'ongoing',
  started_at timestamptz default now(),
  completed_at timestamptz,
  scrutineer_ids uuid[] not null default '{}',
  overall_notes text,
  pass_conditions text,
  failure_reasons text,
  next_steps text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Inspection checklist templates (from FIHU25 sheet)
create table checklist_templates (
  id uuid primary key default uuid_generate_v4(),
  inspection_type_key inspection_type_enum not null,
  section text not null,
  item_code text not null,
  description text not null,
  required boolean default true,
  order_index integer not null,
  parent_item_id uuid references checklist_templates(id),
  created_at timestamptz default now(),
  
  unique(inspection_type_key, item_code)
);

-- Individual checklist item results
create table checklist_checks (
  id uuid primary key default uuid_generate_v4(),
  inspection_result_id uuid references inspection_results(id) not null,
  template_id uuid references checklist_templates(id) not null,
  checked boolean default false,
  checked_by uuid references auth.users(id),
  checked_by_name text,
  checked_at timestamptz,
  note text,
  created_at timestamptz default now(),
  
  unique(inspection_result_id, template_id)
);

-- =====================================================
-- TRACK MARSHAL SYSTEM  
-- =====================================================

-- Track sessions (entry/exit only, NO timing)
create table track_sessions (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) not null,
  marshal_id uuid references auth.users(id) not null,
  sector text not null,
  entry_time timestamptz default now(),
  exit_time timestamptz,
  status session_status default 'active',
  notes text,
  weather_conditions text,
  track_conditions text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Incident logging for DOO/OOC
create table track_incidents (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) not null,
  marshal_id uuid references auth.users(id) not null,
  session_id uuid references track_sessions(id),
  sector text not null,
  incident_type incident_type not null,
  severity severity_level default 'minor',
  description text not null,
  action_taken text,
  occurred_at timestamptz default now(),
  coordinates point, -- GPS coordinates if available
  weather_impact boolean default false,
  created_at timestamptz default now()
);

-- =====================================================
-- DYNAMIC EVENTS SCORING
-- =====================================================

-- Individual run times with penalties
create table dynamic_event_runs (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) not null,
  driver_id uuid references auth.users(id),
  event_type dynamic_event_type not null,
  run_number integer not null,
  raw_time decimal(10,3), -- Raw time in seconds
  penalties jsonb default '{}', -- {cones: 2, off_course: 1, dsq: false}
  corrected_time decimal(10,3), -- Raw time + penalties
  status run_status default 'completed',
  recorded_by uuid references auth.users(id) not null,
  recorded_at timestamptz default now(),
  notes text,
  weather_conditions text,
  created_at timestamptz default now(),
  
  unique(team_id, event_type, run_number)
);

-- Calculated event results with Formula Student scoring
create table dynamic_event_results (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) not null,
  event_type dynamic_event_type not null,
  best_time decimal(10,3),
  points decimal(5,2), -- Calculated using FS formulas
  position integer,
  class_position integer, -- Separate EV/CV rankings
  status result_status default 'provisional',
  tmin decimal(10,3), -- Fastest time for Tmax calculation  
  tmax decimal(10,3), -- 1.5 × Tmin
  updated_at timestamptz default now(),
  
  unique(team_id, event_type)
);

-- Efficiency scoring (combined with Endurance)
create table efficiency_results (
  id uuid primary key default uuid_generate_v4(),
  team_id uuid references teams(id) not null,
  endurance_time decimal(10,3),
  energy_used decimal(10,3), -- kWh for EV, L for CV
  efficiency_factor decimal(10,6),
  efficiency_points decimal(5,2), -- Max 100 points
  combined_endurance_efficiency_points decimal(5,2), -- Max 425 points
  updated_at timestamptz default now(),
  
  unique(team_id)
);

-- =====================================================
-- Add indexes for performance
-- =====================================================

-- Booking system indexes
create index idx_bookings_team_date on bookings(team_id, date);
create index idx_bookings_date_time on bookings(date, start_time);
create index idx_bookings_inspection_type on bookings(inspection_type_id);

-- Track marshal indexes  
create index idx_track_sessions_team on track_sessions(team_id);
create index idx_track_sessions_marshal on track_sessions(marshal_id);
create index idx_track_incidents_occurred_at on track_incidents(occurred_at);

-- Scoring indexes
create index idx_dynamic_runs_team_event on dynamic_event_runs(team_id, event_type);
create index idx_dynamic_results_event_points on dynamic_event_results(event_type, points desc);

-- User profiles indexes
create index idx_user_profiles_team on user_profiles(team_id);
create index idx_user_profiles_role on user_profiles(app_role);

-- =====================================================
-- TRIGGERS & FUNCTIONS
-- =====================================================

-- Update timestamps automatically
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Apply to relevant tables
create trigger update_teams_updated_at before update on teams
  for each row execute function update_updated_at_column();

create trigger update_user_profiles_updated_at before update on user_profiles
  for each row execute function update_updated_at_column();

create trigger update_bookings_updated_at before update on bookings
  for each row execute function update_updated_at_column();

create trigger update_inspection_results_updated_at before update on inspection_results
  for each row execute function update_updated_at_column();

create trigger update_track_sessions_updated_at before update on track_sessions
  for each row execute function update_updated_at_column();