-- =====================================================
-- Formula IHU Hub - Optimized Schema for Production
-- Migration: 20250117_004_optimized_schema.sql
-- =====================================================

-- =====================================================
-- FIX SCHEMA MISMATCHES AND ADD MISSING TABLES
-- =====================================================

-- Drop existing tables that don't match code expectations
drop table if exists checklist_checks cascade;
drop table if exists inspection_results cascade;

-- Handle inspection_progress table - drop and recreate if it exists with wrong structure
do $$
begin
  -- Check if inspection_progress exists and has the wrong structure
  if exists (select 1 from information_schema.tables where table_name = 'inspection_progress') then
    -- Check if it has the wrong column structure (e.g., inspection_result_id instead of booking_id)
    if exists (select 1 from information_schema.columns where table_name = 'inspection_progress' and column_name = 'inspection_result_id') then
      drop table inspection_progress cascade;
    end if;
  end if;
end $$;

-- Create the correct inspection_progress table that matches code expectations
create table if not exists inspection_progress (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid references bookings(id) not null,
  item_id uuid references checklist_templates(id) not null,
  user_id uuid not null,
  checked_at timestamptz,
  status text check (status in ('pass', 'fail', null)),
  comment text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  
  -- Ensure one progress record per booking-item combination
  unique(booking_id, item_id)
);

-- Create inspection_results table for overall inspection tracking
create table if not exists inspection_results (
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

-- =====================================================
-- ADD MISSING TABLES FOR PENALTY SYSTEM
-- =====================================================

-- Penalty rules configuration
create table if not exists penalty_rules (
  id uuid primary key default uuid_generate_v4(),
  event_type dynamic_event_type not null,
  rule_type penalty_type not null,
  condition jsonb not null, -- Flexible condition matching
  penalty_value decimal(10,3) not null,
  penalty_unit penalty_unit not null,
  active boolean default true,
  created_at timestamptz default now()
);

-- =====================================================
-- OPTIMIZE EXISTING TABLES
-- =====================================================

-- Add missing columns to bookings table
alter table bookings add column if not exists assigned_scrutineer_id uuid;
alter table bookings add column if not exists started_at timestamptz;
alter table bookings add column if not exists completed_at timestamptz;

-- Add missing columns to checklist_templates
alter table checklist_templates add column if not exists inspection_type_id uuid references inspection_types(id);
alter table checklist_templates add column if not exists item_index integer not null default 0;

-- Update checklist_templates to use inspection_type_id instead of inspection_type_key
-- First check if the column exists and has data
do $$
begin
  -- Only update if inspection_type_key column exists and inspection_type_id is null
  if exists (select 1 from information_schema.columns where table_name = 'checklist_templates' and column_name = 'inspection_type_key') then
    -- Check if inspection_types has a 'key' column, otherwise use 'name' or 'id'
    if exists (select 1 from information_schema.columns where table_name = 'inspection_types' and column_name = 'key') then
      update checklist_templates 
      set inspection_type_id = it.id 
      from inspection_types it 
      where it.key = checklist_templates.inspection_type_key
      and checklist_templates.inspection_type_id is null;
    elsif exists (select 1 from information_schema.columns where table_name = 'inspection_types' and column_name = 'name') then
      update checklist_templates 
      set inspection_type_id = it.id 
      from inspection_types it 
      where it.name = checklist_templates.inspection_type_key::text
      and checklist_templates.inspection_type_id is null;
    else
      -- If neither key nor name exists, we'll need to handle this manually
      raise notice 'Cannot update checklist_templates: inspection_types table structure is unexpected';
    end if;
  end if;
end $$;

-- Make inspection_type_id not null after data migration
do $$
begin
  -- First, remove any duplicate rows to avoid constraint violations
  if exists (select 1 from checklist_templates where inspection_type_id is not null) then
    -- Delete duplicate rows, keeping only the first occurrence
    with duplicates as (
      select id,
             row_number() over (
               partition by inspection_type_id, item_code 
               order by created_at asc, id asc
             ) as rn
      from checklist_templates
      where inspection_type_id is not null
    )
    delete from checklist_templates 
    where id in (
      select id from duplicates where rn > 1
    );
  end if;
  
  -- Now try to populate any remaining NULL values based on section names
  if exists (select 1 from checklist_templates where inspection_type_id is null) then
    -- Only update rows where the resulting combination won't create duplicates
    update checklist_templates 
    set inspection_type_id = it.id
    from inspection_types it
    where checklist_templates.inspection_type_id is null
    and not exists (
      select 1 from checklist_templates existing
      where existing.inspection_type_id = it.id
      and existing.item_code = checklist_templates.item_code
    )
    and (
      (checklist_templates.section = 'Noise Level' and it.name = 'Noise Test') or
      (checklist_templates.section = 'Brake System' and it.name = 'Brake Test') or
      (checklist_templates.section = 'Tilt Test' and it.name = 'Tilt Test') or
      (checklist_templates.section = 'Rain Test' and it.name = 'Rain Test') or
      (checklist_templates.section = 'Accumulator Safety' and it.name = 'Accumulator') or
      (checklist_templates.section = 'Electrical Safety' and it.name = 'Electrical') or
      (checklist_templates.section = 'Mechanical Safety' and it.name = 'Mechanical') or
      (checklist_templates.section = 'Documentation' and it.name = 'Pre-Inspection') or
      (checklist_templates.section = 'Safety Equipment' and it.name = 'Pre-Inspection') or
      (checklist_templates.section = 'Tires' and it.name = 'Pre-Inspection')
    );
    
    -- If there are still NULL values, delete them
    if exists (select 1 from checklist_templates where inspection_type_id is null) then
      delete from checklist_templates where inspection_type_id is null;
    end if;
  end if;
  
  -- Now it's safe to make the column NOT NULL
  alter table checklist_templates alter column inspection_type_id set not null;
end $$;

-- Drop inspection_type_key column if it exists
do $$
begin
  if exists (select 1 from information_schema.columns where table_name = 'checklist_templates' and column_name = 'inspection_type_key') then
    alter table checklist_templates drop column inspection_type_key;
  end if;
end $$;

-- =====================================================
-- ADD COMPREHENSIVE INDEXES FOR PERFORMANCE
-- =====================================================

-- Booking system indexes
create index if not exists idx_bookings_team_date_status on bookings(team_id, date, status);
create index if not exists idx_bookings_date_time_status on bookings(date, start_time, status);
create index if not exists idx_bookings_inspection_type_date on bookings(inspection_type_id, date);
create index if not exists idx_bookings_scrutineer on bookings(assigned_scrutineer_id) where assigned_scrutineer_id is not null;
create index if not exists idx_bookings_status_priority on bookings(status, priority_level desc, start_time);

-- Inspection progress indexes
create index if not exists idx_inspection_progress_booking on inspection_progress(booking_id);
create index if not exists idx_inspection_progress_item on inspection_progress(item_id);
create index if not exists idx_inspection_progress_user on inspection_progress(user_id);
create index if not exists idx_inspection_progress_checked_at on inspection_progress(checked_at) where checked_at is not null;

-- Checklist templates indexes
create index if not exists idx_checklist_templates_inspection_type on checklist_templates(inspection_type_id);
create index if not exists idx_checklist_templates_section_order on checklist_templates(inspection_type_id, section, order_index);
create index if not exists idx_checklist_templates_required on checklist_templates(inspection_type_id, required, order_index);
-- Ensure uniqueness for ON CONFLICT usage in seeding
create unique index if not exists ux_checklist_templates_type_item_code on checklist_templates(inspection_type_id, item_code);

-- Inspection results indexes
create index if not exists idx_inspection_results_booking on inspection_results(booking_id);
create index if not exists idx_inspection_results_status on inspection_results(status);
create index if not exists idx_inspection_results_started_at on inspection_results(started_at);

-- User profiles indexes
create index if not exists idx_user_profiles_team_role on user_profiles(team_id, app_role);
create index if not exists idx_user_profiles_role on user_profiles(app_role);

-- Track marshal indexes
-- Note: Using simple timestamp indexes instead of date functions for compatibility
create index if not exists idx_track_sessions_team_entry on track_sessions(team_id, entry_time);
create index if not exists idx_track_sessions_marshal_entry on track_sessions(marshal_id, entry_time);
create index if not exists idx_track_incidents_team_occurred on track_incidents(team_id, occurred_at);
create index if not exists idx_track_incidents_type_severity on track_incidents(incident_type, severity);

-- Dynamic events indexes
create index if not exists idx_dynamic_runs_team_event_run on dynamic_event_runs(team_id, event_type, run_number);
create index if not exists idx_dynamic_runs_event_time on dynamic_event_runs(event_type, corrected_time);
create index if not exists idx_dynamic_results_event_points on dynamic_event_results(event_type, points desc);
create index if not exists idx_dynamic_results_team_event on dynamic_event_results(team_id, event_type);

-- =====================================================
-- ADD TRIGGERS FOR AUTOMATIC UPDATES
-- =====================================================

-- Update inspection_results when booking status changes
create or replace function update_inspection_result_status()
returns trigger as $$
begin
  if new.status = 'ongoing' and old.status = 'upcoming' then
    -- Create inspection result when inspection starts
    insert into inspection_results (booking_id, status, started_at, scrutineer_ids)
    values (new.id, 'ongoing', now(), array[new.assigned_scrutineer_id])
    on conflict (booking_id) do update set
      status = 'ongoing',
      started_at = now(),
      scrutineer_ids = array[new.assigned_scrutineer_id];
  elsif new.status = 'completed' and old.status = 'ongoing' then
    -- Update inspection result when inspection completes
    update inspection_results 
    set status = 'passed', completed_at = now()
    where booking_id = new.id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists update_inspection_result_status_trigger on bookings;
create trigger update_inspection_result_status_trigger
  after update on bookings
  for each row execute function update_inspection_result_status();

-- Update timestamps on inspection_progress
drop trigger if exists update_inspection_progress_updated_at on inspection_progress;
create trigger update_inspection_progress_updated_at before update on inspection_progress
  for each row execute function update_updated_at_column();

-- Update timestamps on inspection_results
drop trigger if exists update_inspection_results_updated_at on inspection_results;
create trigger update_inspection_results_updated_at before update on inspection_results
  for each row execute function update_updated_at_column();

-- =====================================================
-- ADD HELPER FUNCTIONS FOR CHECKLIST MANAGEMENT
-- =====================================================

-- Function to get checklist completion status
create or replace function get_checklist_completion(booking_uuid uuid)
returns table (
  total_items bigint,
  completed_items bigint,
  completion_percentage numeric,
  can_pass boolean
) as $$
begin
  return query
  select 
    count(ct.id) as total_items,
    count(ip.id) as completed_items,
    case 
      when count(ct.id) = 0 then 0
      else round((count(ip.id)::numeric / count(ct.id)::numeric) * 100, 2)
    end as completion_percentage,
    count(ct.id) = count(ip.id) and count(ct.id) > 0 as can_pass
  from checklist_templates ct
  left join inspection_progress ip on ct.id = ip.item_id and ip.booking_id = booking_uuid and ip.status = 'pass'
  where ct.inspection_type_id = (
    select inspection_type_id from bookings where id = booking_uuid
  );
end;
$$ language plpgsql security definer;

-- Function to create inspection progress records for all checklist items
create or replace function initialize_inspection_progress(booking_uuid uuid)
returns void as $$
declare
  template_record record;
begin
  -- Create progress records for all required checklist items
  for template_record in 
    select ct.id as item_id
    from checklist_templates ct
    join bookings b on ct.inspection_type_id = b.inspection_type_id
    where b.id = booking_uuid
    and ct.required = true
  loop
    insert into inspection_progress (booking_id, item_id, user_id)
    values (booking_uuid, template_record.item_id, current_setting('request.jwt.claims', true)::json->>'sub'::uuid)
    on conflict (booking_id, item_id) do nothing;
  end loop;
end;
$$ language plpgsql security definer;

-- =====================================================
-- ENABLE RLS ON NEW TABLES (POLICIES CREATED IN 006_enhanced_rls_security.sql)
-- =====================================================

-- Enable RLS on new tables
alter table inspection_progress enable row level security;
alter table inspection_results enable row level security;
alter table penalty_rules enable row level security;

-- Note: RLS policies are created in migration 006_enhanced_rls_security.sql
-- to avoid permission issues with auth schema access
