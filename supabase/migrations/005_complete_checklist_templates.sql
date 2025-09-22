-- =====================================================
-- Formula IHU Hub - Complete Checklist Templates (Fixed)
-- Migration: 20250117_005_complete_checklist_templates.sql
-- =====================================================

-- =====================================================
-- HELPER FUNCTION TO INSERT CHECKLIST ITEMS
-- =====================================================

-- Create a function to safely insert checklist items based on available columns
CREATE OR REPLACE FUNCTION insert_checklist_items(
    inspection_type_identifier text,
    section_name text,
    items jsonb
)
RETURNS void AS $$
DECLARE
    v_inspection_type_id uuid;
    item jsonb;
BEGIN
    -- Get inspection type ID based on available columns
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_types' AND column_name = 'key') THEN
        SELECT id INTO v_inspection_type_id FROM inspection_types WHERE key = inspection_type_identifier;
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'inspection_types' AND column_name = 'name') THEN
        SELECT id INTO v_inspection_type_id FROM inspection_types WHERE name = inspection_type_identifier;
    ELSE
        RAISE NOTICE 'Cannot find inspection type: % - table structure unexpected', inspection_type_identifier;
        RETURN;
    END IF;

    -- Insert each item
    FOR item IN SELECT * FROM jsonb_array_elements(items)
    LOOP
        INSERT INTO checklist_templates (
            inspection_type_id,
            section,
            item_code,
            description,
            required,
            order_index
        ) VALUES (
            v_inspection_type_id,
            section_name,
            item->>'code',
            item->>'description',
            COALESCE((item->>'required')::boolean, true),
            (item->>'order')::integer
        ) ON CONFLICT DO NOTHING;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- NOISE TEST CHECKLIST
-- =====================================================

SELECT insert_checklist_items(
    'noise_test',
    'Noise Level',
    '[
        {"code": "NOISE_001", "description": "Engine noise level measured at 0.5m from exhaust outlet", "order": 1},
        {"code": "NOISE_002", "description": "Noise level does not exceed 110 dB(A) at 0.5m", "order": 2},
        {"code": "NOISE_003", "description": "Measurement taken with vehicle stationary and engine at maximum RPM", "order": 3},
        {"code": "NOISE_004", "description": "Sound level meter calibrated and properly positioned", "order": 4},
        {"code": "NOISE_005", "description": "Background noise level measured and documented", "order": 5},
        {"code": "NOISE_006", "description": "Noise test results recorded and signed by scrutineer", "order": 6}
    ]'::jsonb
);

-- =====================================================
-- BRAKE TEST CHECKLIST
-- =====================================================

SELECT insert_checklist_items(
    'brake_test',
    'Brake System',
    '[
        {"code": "BRAKE_001", "description": "Brake pedal travel within acceptable limits", "order": 1},
        {"code": "BRAKE_002", "description": "Brake pedal firm and responsive with no sponginess", "order": 2},
        {"code": "BRAKE_003", "description": "Brake lines properly secured and protected from damage", "order": 3},
        {"code": "BRAKE_004", "description": "Brake fluid level adequate and fluid condition good", "order": 4},
        {"code": "BRAKE_005", "description": "Brake pads/shoes have sufficient material remaining", "order": 5},
        {"code": "BRAKE_006", "description": "Brake discs/rotors in good condition with no excessive wear", "order": 6},
        {"code": "BRAKE_007", "description": "Parking brake functional and holds vehicle on incline", "order": 7},
        {"code": "BRAKE_008", "description": "Brake lights activate immediately when brake pedal pressed", "order": 8},
        {"code": "BRAKE_009", "description": "Brake system pressure tested and within specifications", "order": 9},
        {"code": "BRAKE_010", "description": "Brake test results documented and signed by scrutineer", "order": 10}
    ]'::jsonb
);

-- =====================================================
-- TILT TEST CHECKLIST
-- =====================================================

SELECT insert_checklist_items(
    'tilt_test',
    'Tilt Test',
    '[
        {"code": "TILT_001", "description": "Vehicle positioned on tilt platform with all wheels on platform", "order": 1},
        {"code": "TILT_002", "description": "Driver secured in vehicle with all safety equipment", "order": 2},
        {"code": "TILT_003", "description": "Tilt platform calibrated and functioning properly", "order": 3},
        {"code": "TILT_004", "description": "Vehicle tilted to 60 degrees without rollover", "order": 4},
        {"code": "TILT_005", "description": "Driver egress time measured and under 5 seconds", "order": 5},
        {"code": "TILT_006", "description": "Driver egress performed without assistance", "order": 6},
        {"code": "TILT_007", "description": "No fuel or fluid leaks during tilt test", "order": 7},
        {"code": "TILT_008", "description": "Tilt test results recorded and signed by scrutineer", "order": 8}
    ]'::jsonb
);

-- =====================================================
-- RAIN TEST CHECKLIST (EV Only)
-- =====================================================

SELECT insert_checklist_items(
    'rain_test',
    'Rain Test',
    '[
        {"code": "RAIN_001", "description": "Vehicle positioned in designated rain test area", "order": 1},
        {"code": "RAIN_002", "description": "Rain simulation system activated and functioning", "order": 2},
        {"code": "RAIN_003", "description": "High voltage system properly sealed and protected", "order": 3},
        {"code": "RAIN_004", "description": "All electrical connections waterproofed and sealed", "order": 4},
        {"code": "RAIN_005", "description": "Accumulator container completely sealed from water ingress", "order": 5},
        {"code": "RAIN_006", "description": "Motor controller and power electronics protected from water", "order": 6},
        {"code": "RAIN_007", "description": "No electrical faults or warnings during rain simulation", "order": 7},
        {"code": "RAIN_008", "description": "Insulation monitoring device (IMD) functioning properly", "order": 8},
        {"code": "RAIN_009", "description": "Ground fault protection systems operational", "order": 9},
        {"code": "RAIN_010", "description": "Rain test duration completed as specified (minimum 5 minutes)", "order": 10},
        {"code": "RAIN_011", "description": "Rain test results documented and signed by scrutineer", "order": 11}
    ]'::jsonb
);

-- =====================================================
-- ENHANCED ACCUMULATOR INSPECTION (EV Only)
-- =====================================================

SELECT insert_checklist_items(
    'accumulator',
    'Accumulator Safety',
    '[
        {"code": "ACC_040", "description": "Accumulator container pressure relief valves functional", "order": 40},
        {"code": "ACC_041", "description": "Accumulator container venting system properly designed", "order": 41},
        {"code": "ACC_042", "description": "Accumulator container impact protection adequate", "order": 42},
        {"code": "ACC_043", "description": "Accumulator container thermal management system functional", "order": 43},
        {"code": "ACC_044", "description": "Accumulator container temperature monitoring operational", "order": 44},
        {"code": "ACC_045", "description": "Accumulator container overcurrent protection functional", "order": 45},
        {"code": "ACC_046", "description": "Accumulator container overvoltage protection functional", "order": 46},
        {"code": "ACC_047", "description": "Accumulator container undervoltage protection functional", "order": 47},
        {"code": "ACC_048", "description": "Accumulator container short circuit protection functional", "order": 48},
        {"code": "ACC_049", "description": "Accumulator container reverse polarity protection functional", "order": 49},
        {"code": "ACC_050", "description": "Accumulator container state of charge monitoring accurate", "order": 50}
    ]'::jsonb
);

-- =====================================================
-- ENHANCED ELECTRICAL INSPECTION
-- =====================================================

SELECT insert_checklist_items(
    'electrical',
    'Electrical Safety',
    '[
        {"code": "ELEC_040", "description": "All high voltage components properly labeled with warning signs", "order": 40},
        {"code": "ELEC_041", "description": "High voltage interlock system functional and properly wired", "order": 41},
        {"code": "ELEC_042", "description": "Service disconnect switch accessible and properly labeled", "order": 42},
        {"code": "ELEC_043", "description": "All electrical connections properly torqued and secured", "order": 43},
        {"code": "ELEC_044", "description": "Electrical system insulation resistance within specifications", "order": 44},
        {"code": "ELEC_045", "description": "Ground fault circuit interrupter (GFCI) functional", "order": 45},
        {"code": "ELEC_046", "description": "Electrical system continuity testing completed", "order": 46},
        {"code": "ELEC_047", "description": "Electrical system polarity testing completed", "order": 47},
        {"code": "ELEC_048", "description": "Electrical system load testing completed", "order": 48},
        {"code": "ELEC_049", "description": "Electrical system voltage drop testing completed", "order": 49},
        {"code": "ELEC_050", "description": "Electrical system documentation complete and accurate", "order": 50}
    ]'::jsonb
);

-- =====================================================
-- ENHANCED MECHANICAL INSPECTION
-- =====================================================

SELECT insert_checklist_items(
    'mechanical',
    'Mechanical Safety',
    '[
        {"code": "MECH_050", "description": "All fasteners properly torqued to specifications", "order": 50},
        {"code": "MECH_051", "description": "All safety wire and cotter pins properly installed", "order": 51},
        {"code": "MECH_052", "description": "All fluid levels checked and within specifications", "order": 52},
        {"code": "MECH_053", "description": "All fluid lines properly secured and protected", "order": 53},
        {"code": "MECH_054", "description": "All mechanical systems free from excessive wear", "order": 54},
        {"code": "MECH_055", "description": "All mechanical systems properly lubricated", "order": 55},
        {"code": "MECH_056", "description": "All mechanical systems properly aligned", "order": 56},
        {"code": "MECH_057", "description": "All mechanical systems properly balanced", "order": 57},
        {"code": "MECH_058", "description": "All mechanical systems properly calibrated", "order": 58},
        {"code": "MECH_059", "description": "All mechanical systems properly tested", "order": 59},
        {"code": "MECH_060", "description": "All mechanical systems properly documented", "order": 60}
    ]'::jsonb
);

-- =====================================================
-- ENHANCED PRE-INSPECTION CHECKLIST
-- =====================================================

SELECT insert_checklist_items(
    'pre_inspection',
    'Documentation',
    '[
        {"code": "DOC_010", "description": "Vehicle technical specifications sheet complete", "order": 10},
        {"code": "DOC_011", "description": "Driver medical certificates valid and current", "order": 11},
        {"code": "DOC_012", "description": "Vehicle insurance documentation current", "order": 12},
        {"code": "DOC_013", "description": "Vehicle registration documentation current", "order": 13},
        {"code": "DOC_014", "description": "Vehicle inspection documentation current", "order": 14},
        {"code": "DOC_015", "description": "Vehicle maintenance documentation current", "order": 15},
        {"code": "DOC_016", "description": "Vehicle modification documentation current", "order": 16},
        {"code": "DOC_017", "description": "Vehicle safety documentation current", "order": 17},
        {"code": "DOC_018", "description": "Vehicle environmental documentation current", "order": 18},
        {"code": "DOC_019", "description": "Vehicle performance documentation current", "order": 19},
        {"code": "DOC_020", "description": "Vehicle compliance documentation current", "order": 20}
    ]'::jsonb
);

-- =====================================================
-- ADDITIONAL SAFETY EQUIPMENT ITEMS
-- =====================================================

SELECT insert_checklist_items(
    'pre_inspection',
    'Safety Equipment',
    '[
        {"code": "SAFE_010", "description": "Safety harness properly installed and functional", "order": 10},
        {"code": "SAFE_011", "description": "Safety helmet properly installed and functional", "order": 11},
        {"code": "SAFE_012", "description": "Safety gloves properly installed and functional", "order": 12},
        {"code": "SAFE_013", "description": "Safety boots properly installed and functional", "order": 13},
        {"code": "SAFE_014", "description": "Safety glasses properly installed and functional", "order": 14},
        {"code": "SAFE_015", "description": "Safety vest properly installed and functional", "order": 15},
        {"code": "SAFE_016", "description": "Safety whistle properly installed and functional", "order": 16},
        {"code": "SAFE_017", "description": "Safety mirror properly installed and functional", "order": 17},
        {"code": "SAFE_018", "description": "Safety flag properly installed and functional", "order": 18},
        {"code": "SAFE_019", "description": "Safety light properly installed and functional", "order": 19},
        {"code": "SAFE_020", "description": "Safety horn properly installed and functional", "order": 20}
    ]'::jsonb
);

-- =====================================================
-- ADDITIONAL TIRE INSPECTION ITEMS
-- =====================================================

SELECT insert_checklist_items(
    'pre_inspection',
    'Tires',
    '[
        {"code": "TIRE_010", "description": "Tire pressure checked and within specifications", "order": 10},
        {"code": "TIRE_011", "description": "Tire tread depth checked and within specifications", "order": 11},
        {"code": "TIRE_012", "description": "Tire sidewall condition checked and acceptable", "order": 12},
        {"code": "TIRE_013", "description": "Tire bead condition checked and acceptable", "order": 13},
        {"code": "TIRE_014", "description": "Tire valve condition checked and acceptable", "order": 14},
        {"code": "TIRE_015", "description": "Tire balance checked and acceptable", "order": 15},
        {"code": "TIRE_016", "description": "Tire alignment checked and acceptable", "order": 16},
        {"code": "TIRE_017", "description": "Tire rotation checked and acceptable", "order": 17},
        {"code": "TIRE_018", "description": "Tire mounting checked and acceptable", "order": 18},
        {"code": "TIRE_019", "description": "Tire dismounting checked and acceptable", "order": 19},
        {"code": "TIRE_020", "description": "Tire storage checked and acceptable", "order": 20}
    ]'::jsonb
);

-- =====================================================
-- CLEANUP
-- =====================================================

-- Drop the helper function
DROP FUNCTION insert_checklist_items(text, text, jsonb);