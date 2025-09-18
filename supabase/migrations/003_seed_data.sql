-- =====================================================
-- Formula IHU Hub - Seed Data
-- Migration: 20250917_003_seed_data.sql
-- =====================================================

-- =====================================================
-- INSPECTION TYPES SEEDING
-- =====================================================

insert into inspection_types (key, name, description, duration_minutes, concurrent_slots, sort_order, prerequisites) values
  ('pre_inspection', 'Pre-Inspection', 'Initial vehicle check and documentation review', 30, 2, 1, '{}'),
  ('mechanical', 'Mechanical Inspection', 'Comprehensive mechanical systems check', 90, 2, 2, '{"pre_inspection"}'),
  ('accumulator', 'Accumulator Inspection', 'High voltage accumulator safety check (EV only)', 60, 1, 3, '{"pre_inspection"}'),
  ('electrical', 'Electrical Inspection', 'Electrical systems and wiring inspection', 75, 2, 4, '{"pre_inspection", "mechanical", "accumulator"}'),
  ('noise_test', 'Noise Test', 'Engine noise level compliance test', 15, 1, 5, '{"electrical"}'),
  ('brake_test', 'Brake Test', 'Brake system performance test', 20, 1, 6, '{"electrical"}'),
  ('tilt_test', 'Tilt Test', 'Vehicle stability and rollover test', 15, 1, 7, '{"electrical"}'),
  ('rain_test', 'Rain Test', 'Wet weather electrical safety test', 10, 1, 8, '{"electrical"}');

-- =====================================================
-- SAMPLE TEAMS SEEDING
-- =====================================================

insert into teams (name, code, vehicle_class, university, vehicle_number) values
  ('DRT Racing', 'E88 DRT', 'EV', 'Democritus University of Thrace', 88),
  ('Perseus Formula', 'E76 PERSEUS', 'EV', 'University of Patras', 76),
  ('Poseidon Racing', 'E05 POSEIDON', 'EV', 'National Technical University of Athens', 5),
  ('Aristurtle Racing', 'E11 ARISTURTLE', 'EV', 'Aristotle University of Thessaloniki', 11),
  ('Centaur Formula', 'E77 CENTAUR', 'EV', 'University of Thessaly', 77),
  ('TUIASI Racing', 'E45 TUIASI', 'EV', 'Technical University of Iasi', 45),
  ('ART Racing Team', 'C12 ART', 'CV', 'University of Cyprus', 12),
  ('FUF Racing', 'C33 FUF', 'CV', 'Frederick University', 33),
  ('FS TUC', 'C20 FSTUC', 'CV', 'Technical University of Crete', 20),
  ('UCY Racing', 'C28 UCY', 'CV', 'University of Cyprus', 28),
  ('Kingston Formula', 'C55 KINGSTON', 'CV', 'Kingston University', 55),
  ('Pelops Racing', 'C09 PELOPS', 'CV', 'University of Peloponnese', 9);

-- =====================================================
-- CHECKLIST TEMPLATES FROM FIHU25 INSPECTION SHEET
-- =====================================================

-- Pre-Inspection Checklist
insert into checklist_templates (inspection_type_key, section, item_code, description, required, order_index) values
  ('pre_inspection', 'TIS Status', 'TIS_001', 'Set online TIS status to Present', true, 1),
  ('pre_inspection', 'TIS Status', 'TIS_002', 'Write down inspector names legibly, sign only when passed', true, 2),
  ('pre_inspection', 'Tires', 'TIRE_001', 'DRY TIRES - Make, compound, maximum diameter', true, 10),
  ('pre_inspection', 'Tires', 'TIRE_002', 'WET TIRES - Make, compound, maximum diameter', true, 11),
  ('pre_inspection', 'Documentation', 'DOC_001', 'Vehicle registration and technical specifications', true, 20),
  ('pre_inspection', 'Documentation', 'DOC_002', 'Driver licenses and medical certificates', true, 21),
  ('pre_inspection', 'Safety Equipment', 'SAFE_001', 'Fire extinguisher present and accessible', true, 30),
  ('pre_inspection', 'Safety Equipment', 'SAFE_002', 'First aid kit present and complete', true, 31);

-- Mechanical Inspection Checklist (subset - full list would be much longer)
insert into checklist_templates (inspection_type_key, section, item_code, description, required, order_index) values
  ('mechanical', 'Frame', 'MECH_001', 'Frame integrity and material compliance', true, 1),
  ('mechanical', 'Frame', 'MECH_002', 'Weld quality and stress concentrations', true, 2),
  ('mechanical', 'Frame', 'MECH_003', 'Driver egress time < 5 seconds', true, 3),
  ('mechanical', 'Suspension', 'MECH_010', 'Suspension mounting points secure', true, 10),
  ('mechanical', 'Suspension', 'MECH_011', 'Wheel bearings properly installed', true, 11),
  ('mechanical', 'Steering', 'MECH_020', 'Steering system free play within limits', true, 20),
  ('mechanical', 'Steering', 'MECH_021', 'Steering wheel quick release functional', true, 21),
  ('mechanical', 'Brakes', 'MECH_030', 'Brake pedal feels solid and responsive', true, 30),
  ('mechanical', 'Brakes', 'MECH_031', 'Brake lines properly secured and routed', true, 31),
  ('mechanical', 'Engine', 'MECH_040', 'Engine mounts secure and properly installed', true, 40),
  ('mechanical', 'Engine', 'MECH_041', 'Exhaust system complete and secure', true, 41);

-- Accumulator Inspection (EV specific)
insert into checklist_templates (inspection_type_key, section, item_code, description, required, order_index) values
  ('accumulator', 'Container', 'ACC_001', 'Accumulator container structural integrity', true, 1),
  ('accumulator', 'Container', 'ACC_002', 'Container mounting and vibration resistance', true, 2),
  ('accumulator', 'Cells', 'ACC_010', 'Cell configuration and voltage ratings', true, 10),
  ('accumulator', 'Cells', 'ACC_011', 'Cell balancing and monitoring system', true, 11),
  ('accumulator', 'Safety', 'ACC_020', 'AIRs (Accumulator Isolation Relays) functional', true, 20),
  ('accumulator', 'Safety', 'ACC_021', 'IMD (Insulation Monitoring Device) operational', true, 21),
  ('accumulator', 'Safety', 'ACC_022', 'Emergency disconnect accessible and marked', true, 22),
  ('accumulator', 'Documentation', 'ACC_030', 'Accumulator technical specifications submitted', true, 30),
  ('accumulator', 'Documentation', 'ACC_031', 'Safety data sheets for all cell types', true, 31);

-- Electrical Inspection
insert into checklist_templates (inspection_type_key, section, item_code, description, required, order_index) values
  ('electrical', 'Power Systems', 'ELEC_001', 'Main switch disconnects all power', true, 1),
  ('electrical', 'Power Systems', 'ELEC_002', 'Emergency stop button functional', true, 2),
  ('electrical', 'Wiring', 'ELEC_010', 'All high voltage wiring properly protected', true, 10),
  ('electrical', 'Wiring', 'ELEC_011', 'Low voltage system isolated from HV', true, 11),
  ('electrical', 'Grounding', 'ELEC_020', 'Chassis grounding point established', true, 20),
  ('electrical', 'Grounding', 'ELEC_021', 'All conductive parts properly grounded', true, 21),
  ('electrical', 'Controls', 'ELEC_030', 'Throttle position sensor calibrated', true, 30),
  ('electrical', 'Controls', 'ELEC_031', 'Brake light activation verified', true, 31);

-- =====================================================
-- SAMPLE DYNAMIC EVENT SCORING CONFIGURATION
-- =====================================================

-- Insert penalty rules for dynamic events
insert into penalty_rules (event_type, rule_type, condition, penalty_value, penalty_unit, active) values
  ('acceleration', 'time_penalty', '{"type": "cone_penalty"}', 2.0, 'seconds', true),
  ('acceleration', 'time_penalty', '{"type": "off_course_penalty"}', 10.0, 'seconds', true),
  ('skidpad', 'time_penalty', '{"type": "cone_penalty"}', 2.0, 'seconds', true),
  ('skidpad', 'time_penalty', '{"type": "off_course_penalty"}', 10.0, 'seconds', true),
  ('autocross', 'time_penalty', '{"type": "cone_penalty"}', 2.0, 'seconds', true),
  ('autocross', 'time_penalty', '{"type": "off_course_penalty"}', 10.0, 'seconds', true),
  ('endurance', 'time_penalty', '{"type": "cone_penalty"}', 2.0, 'seconds', true),
  ('endurance', 'time_penalty', '{"type": "off_course_penalty"}', 10.0, 'seconds', true);

-- =====================================================
-- DEVELOPMENT USERS (for testing only)
-- =====================================================

-- Note: These will be created when users register
-- The trigger will handle profile creation
-- Actual user creation happens through Supabase Auth

-- Sample admin user profile (will be created when user registers)
-- insert into user_profiles (id, email, first_name, last_name, father_name, phone, emergency_contact, campsite_staying, ehic_number, app_role, profile_completed)
-- values (
--   '00000000-0000-0000-0000-000000000001',
--   'admin@formulaihu.gr',
--   'Admin',
--   'User',
--   'System',
--   '+30123456789',
--   '+30987654321',
--   false,
--   'GR123456789',
--   'admin',
--   true
-- );

-- =====================================================
-- FUNCTIONS FOR SEEDING SAMPLE DATA
-- =====================================================

-- Function to create sample bookings for testing
create or replace function create_sample_bookings()
returns void as $$
declare
  team_record record;
  inspection_record record;
  booking_date date := current_date;
  booking_time time := '09:00:00';
begin
  -- Create sample bookings for today
  for team_record in select * from teams limit 5 loop
    for inspection_record in select * from inspection_types where key = 'pre_inspection' loop
      insert into bookings (
        team_id,
        inspection_type_id,
        date,
        start_time,
        end_time,
        resource_index,
        created_by
      ) values (
        team_record.id,
        inspection_record.id,
        booking_date,
        booking_time,
        booking_time + interval '30 minutes',
        1,
        '00000000-0000-0000-0000-000000000001' -- Admin user ID
      );
      
      booking_time := booking_time + interval '30 minutes';
    end loop;
  end loop;
end;
$$ language plpgsql;

-- Function to create sample dynamic event runs
create or replace function create_sample_dynamic_runs()
returns void as $$
declare
  team_record record;
  event_types dynamic_event_type[] := array['acceleration', 'skidpad', 'autocross'];
  event_type dynamic_event_type;
  run_number integer;
begin
  -- Create sample runs for testing scoring formulas
  for team_record in select * from teams limit 6 loop
    foreach event_type in array event_types loop
      for run_number in 1..4 loop
        insert into dynamic_event_runs (
          team_id,
          event_type,
          run_number,
          raw_time,
          penalties,
          corrected_time,
          recorded_by
        ) values (
          team_record.id,
          event_type,
          run_number,
          random() * 10 + 50, -- Random time between 50-60 seconds
          '{"cones": 0, "off_course": 0, "dsq": false}',
          random() * 10 + 50,
          '00000000-0000-0000-0000-000000000001'
        );
      end loop;
    end loop;
  end loop;
end;
$$ language plpgsql;

-- Note: These functions can be called manually for development:
-- select create_sample_bookings();
-- select create_sample_dynamic_runs();