// src/lib/types/database.ts
// Generated from Prisma schema

// Define enums based on your Supabase schema
export type UserRole =
  | 'admin'
  | 'scrutineer'
  | 'team_leader'
  | 'inspection_responsible'
  | 'team_member'
  | 'design_judge_software'
  | 'design_judge_mechanical'
  | 'design_judge_electronics'
  | 'design_judge_overall'
  | 'bp_judge'
  | 'cm_judge'
  | 'track_marshal'
  | 'viewer'
  | 'engineering_design' // Added for event_type, ensure this is consistent with actual roles

export type BookingStatus =
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled'

export type ResultStatus =
  | 'pending'
  | 'passed'
  | 'failed'
  | 'provisional'
  | 'final'

export type SessionStatus =
  | 'active'
  | 'completed'
  | 'paused'

export type IncidentType =
  | 'mechanical_failure'
  | 'electrical_failure'
  | 'driver_error'
  | 'track_violation'
  | 'other'

export type SeverityLevel =
  | 'minor'
  | 'moderate'
  | 'major'
  | 'critical'

export type EventType =
  | 'acceleration'
  | 'skidpad'
  | 'autocross'
  | 'endurance'
  | 'business_plan'
  | 'cost_manufacturing'
  | 'engineering_design'

export type RunStatus =
  | 'completed'
  | 'dnf' // Did Not Finish
  | 'dns' // Did Not Start
  | 'dsg' // Disqualified

export type PenaltyUnit =
  | 'seconds'
  | 'points'
  | 'percentage'

export type ScoreStatus =
  | 'pending'
  | 'submitted'
  | 'reviewed'
  | 'final'

// New enums based on schema context
export type TeamStatus = 'active' | 'inactive' | 'disqualified' // Assuming these values
export type VehicleStatus = 'ready' | 'under_inspection' | 'failed_inspection' | 'on_track' // Assuming these values
export type ScrutineeringResult = 'passed' | 'failed' | 'pending' // Assuming these values
export type ItemStatus = 'pass' | 'fail' | 'na' // Assuming these values

// Define table types
export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          name: string | null
          email: string
          image: string | null
          role: UserRole
          passwordHash: string | null
          created_at: string // Changed to snake_case for consistency
        }
        Insert: {
          id?: string
          name?: string | null
          email: string
          image?: string | null
          role?: UserRole
          passwordHash?: string | null
          created_at?: string // Changed to snake_case for consistency
        }
        Update: {
          id?: string
          name?: string | null
          email?: string
          image?: string | null
          role?: UserRole
          passwordHash?: string | null
          created_at?: string // Changed to snake_case for consistency
        }
      }
      teams: {
        Row: {
          id: string
          name: string
          code: string
          country: string | null
          contactEmail: string
          contactPhone: string | null
          created_at: string
          status: TeamStatus
          vehicle_class: string
          university: string
          drivers: any // JSONB type
          vehicle_number: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          code: string
          country?: string | null
          contactEmail: string
          contactPhone?: string | null
          created_at?: string
          status?: TeamStatus
          vehicle_class?: string
          university?: string
          drivers?: any
          vehicle_number?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          code?: string
          country?: string | null
          contactEmail?: string
          contactPhone?: string | null
          created_at?: string
          status?: TeamStatus
          vehicle_class?: string
          university?: string
          drivers?: any
          vehicle_number?: number | null
          updated_at?: string | null
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          first_name: string | null
          last_name: string | null
          father_name: string | null
          phone: string | null
          emergency_contact: string | null
          campsite_staying: boolean
          ehic_number: string | null
          team_id: string | null
          app_role: UserRole
          profile_completed: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          email: string
          first_name?: string | null
          last_name?: string | null
          father_name?: string | null
          phone?: string | null
          emergency_contact?: string | null
          campsite_staying?: boolean
          ehic_number?: string | null
          team_id?: string | null
          app_role: UserRole
          profile_completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          first_name?: string | null
          last_name?: string | null
          father_name?: string | null
          phone?: string | null
          emergency_contact?: string | null
          campsite_staying?: boolean
          ehic_number?: string | null
          team_id?: string | null
          app_role?: UserRole
          profile_completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      vehicles: {
        Row: {
          id: string
          teamId: string
          name: string
          type: string
          chassisNumber: string | null
          batterySpec: any | null // JSON type
          year: number | null
          created_at: string // Changed to snake_case for consistency
          status: VehicleStatus
        }
        Insert: {
          id?: string
          teamId: string
          name: string
          type: string
          chassisNumber?: string | null
          batterySpec?: any | null
          year?: number | null
          created_at?: string // Changed to snake_case for consistency
          status?: VehicleStatus
        }
        Update: {
          id?: string
          teamId?: string
          name?: string
          type?: string
          chassisNumber?: string | null
          batterySpec?: any | null
          year?: number | null
          created_at?: string // Changed to snake_case for consistency
          status?: VehicleStatus
        }
      }
      scrutineerings: {
        Row: {
          id: string
          vehicleId: string
          scheduledAt: string
          location: string | null
          scrutineerId: string | null
          overallResult: ScrutineeringResult
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          vehicleId: string
          scheduledAt: string
          location?: string | null
          scrutineerId?: string | null
          overallResult?: ScrutineeringResult
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          vehicleId?: string
          scheduledAt?: string
          location?: string | null
          scrutineerId?: string | null
          overallResult?: ScrutineeringResult
          notes?: string | null
          created_at?: string
        }
      }
      scrutineer_items: {
        Row: {
          id: string
          scrutineeringId: string
          key: string
          label: string
          value: string | null
          status: ItemStatus
          remarks: string | null
        }
        Insert: {
          id?: string
          scrutineeringId: string
          key: string
          label: string
          value?: string | null
          status?: ItemStatus
          remarks?: string | null
        }
        Update: {
          id?: string
          scrutineeringId?: string
          key?: string
          label?: string
          value?: string | null
          status?: ItemStatus
          remarks?: string | null
        }
      }
      files: {
        Row: {
          id: string
          url: string
          name: string
          size: number | null
          mimeType: string | null
          uploadedById: string | null
          created_at: string
          vehicleId: string | null
          scrutineerItemId: string | null
        }
        Insert: {
          id?: string
          url: string
          name: string
          size?: number | null
          mimeType?: string | null
          uploadedById?: string | null
          created_at?: string
          vehicleId?: string | null
          scrutineerItemId?: string | null
        }
        Update: {
          id?: string
          url?: string
          name?: string
          size?: number | null
          mimeType?: string | null
          uploadedById?: string | null
          created_at?: string
          vehicleId?: string | null
          scrutineerItemId?: string | null
        }
      }
      comments: {
        Row: {
          id: string
          authorId: string
          text: string
          created_at: string
          vehicleId: string | null
          scrutineeringId: string | null
        }
        Insert: {
          id?: string
          authorId: string
          text: string
          created_at?: string
          vehicleId?: string | null
          scrutineeringId?: string | null
        }
        Update: {
          id?: string
          authorId?: string
          text?: string
          created_at?: string
          vehicleId?: string | null
          scrutineeringId?: string | null
        }
      }
      // Existing tables from your Supabase schema context
      checklist_templates: {
        Row: {
          id: string
          section: string
          item_code: string
          description: string
          required: boolean | null
          order_index: number
          parent_item_id: string | null
          created_at: string | null
          inspection_type_id: string
          item_index: number
        }
        Insert: {
          id?: string
          section: string
          item_code: string
          description: string
          required?: boolean | null
          order_index: number
          parent_item_id?: string | null
          created_at?: string | null
          inspection_type_id: string
          item_index?: number
        }
        Update: {
          id?: string
          section?: string
          item_code?: string
          description?: string
          required?: boolean | null
          order_index?: number
          parent_item_id?: string | null
          created_at?: string | null
          inspection_type_id?: string
          item_index?: number
        }
      }
      inspection_progress: {
        Row: {
          id: string
          booking_id: string
          item_id: string
          user_id: string
          checked_at: string | null // Can be null if unchecked
          status: string | null // Can be null if unchecked
          comment: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          item_id: string
          user_id: string
          checked_at?: string | null
          status?: string | null
          comment?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          item_id?: string
          user_id?: string
          checked_at?: string | null
          status?: string | null
          comment?: string | null
        }
      }
      inspection_results: {
        Row: {
          id: string
          booking_id: string
          status: ResultStatus
          started_at: string | null
          completed_at: string | null
          scrutineer_ids: string[]
          overall_notes: string | null
          pass_conditions: string | null
          failure_reasons: string | null
          next_steps: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          booking_id: string
          status?: ResultStatus
          started_at?: string | null
          completed_at?: string | null
          scrutineer_ids?: string[]
          overall_notes?: string | null
          pass_conditions?: string | null
          failure_reasons?: string | null
          next_steps?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          booking_id?: string
          status?: ResultStatus
          started_at?: string | null
          completed_at?: string | null
          scrutineer_ids?: string[]
          overall_notes?: string | null
          pass_conditions?: string | null
          failure_reasons?: string | null
          next_steps?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      penalty_rules: {
        Row: {
          id: string
          event_type: EventType
          rule_type: string // Assuming this is a string type in Prisma
          condition: any // JSONB type
          penalty_value: number
          penalty_unit: PenaltyUnit
          active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          event_type: EventType
          rule_type: string
          condition: any
          penalty_value: number
          penalty_unit: PenaltyUnit
          active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          event_type?: EventType
          rule_type?: string
          condition?: any
          penalty_value?: number
          penalty_unit?: PenaltyUnit
          active?: boolean | null
          created_at?: string | null
        }
      }
      inspection_types: {
        Row: {
          id: string
          name: string
          description: string | null
          duration_minutes: number
          concurrent_slots: number
          sort_order: number
          prerequisites: string[] | null
          active: boolean | null
          created_at: string | null
          duration: number
          slot_count: number
          requirements: string | null
          key: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          duration_minutes: number
          concurrent_slots?: number
          sort_order: number
          prerequisites?: string[] | null
          active?: boolean | null
          created_at?: string | null
          duration?: number
          slot_count?: number
          requirements?: string | null
          key: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          duration_minutes?: number
          concurrent_slots?: number
          sort_order?: number
          prerequisites?: string[] | null
          active?: boolean | null
          created_at?: string | null
          duration?: number
          slot_count?: number
          requirements?: string | null
          key?: string
        }
      }
      bookings: {
        Row: {
          id: string
          team_id: string
          inspection_type_id: string
          date: string
          start_time: string
          end_time: string
          resource_index: number
          status: BookingStatus
          is_rescrutineering: boolean | null
          priority_level: number | null
          notes: string | null
          created_by: string
          created_at: string | null
          updated_at: string | null
          inspection_status: string | null
          assigned_scrutineer_id: string | null
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          inspection_type_id: string
          date: string
          start_time: string
          end_time: string
          resource_index?: number
          status?: BookingStatus
          is_rescrutineering?: boolean | null
          priority_level?: number | null
          notes?: string | null
          created_by: string
          created_at?: string | null
          updated_at?: string | null
          inspection_status?: string | null
          assigned_scrutineer_id?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          inspection_type_id?: string
          date?: string
          start_time?: string
          end_time?: string
          resource_index?: number
          status?: BookingStatus
          is_rescrutineering?: boolean | null
          priority_level?: number | null
          notes?: string | null
          created_by?: string
          created_at?: string | null
          updated_at?: string | null
          inspection_status?: string | null
          assigned_scrutineer_id?: string | null
          started_at?: string | null
          completed_at?: string | null
        }
      }
      judged_event_bookings: {
        Row: {
          id: string
          event_id: string | null
          team_id: string | null
          scheduled_time: string | null
          status: string | null
        }
        Insert: {
          id?: string
          event_id?: string | null
          team_id?: string | null
          scheduled_time?: string | null
          status?: string | null
        }
        Update: {
          id?: string
          event_id?: string | null
          team_id?: string | null
          scheduled_time?: string | null
          status?: string | null
        }
      }
      judged_event_criteria: {
        Row: {
          id: string
          event_id: string | null
          criterion_index: number
          title: string
          max_score: number
        }
        Insert: {
          id?: string
          event_id?: string | null
          criterion_index: number
          title: string
          max_score?: number
        }
        Update: {
          id?: string
          event_id?: string | null
          criterion_index?: number
          title?: string
          max_score?: number
        }
      }
      judged_event_scores: {
        Row: {
          id: string
          booking_id: string | null
          criterion_id: string | null
          judge_id: string | null
          score: number | null
          comment: string | null
          submitted_at: string | null
          status: ScoreStatus // Added status for scores
        }
        Insert: {
          id?: string
          booking_id?: string | null
          criterion_id?: string | null
          judge_id?: string | null
          score?: number | null
          comment?: string | null
          submitted_at?: string | null
          status?: ScoreStatus
        }
        Update: {
          id?: string
          booking_id?: string | null
          criterion_id?: string | null
          judge_id?: string | null
          score?: number | null
          comment?: string | null
          submitted_at?: string | null
          status?: ScoreStatus
        }
      }
      judge_score_audit: {
        Row: {
          id: string
          score_id: string
          admin_id: string
          old_score: number | null
          old_comment: string | null
          new_score: number | null
          new_comment: string | null
          old_judge_id: string | null
          new_judge_id: string | null
          changed_at: string | null
        }
        Insert: {
          id?: string
          score_id: string
          admin_id: string
          old_score?: number | null
          old_comment?: string | null
          new_score?: number | null
          new_comment?: string | null
          old_judge_id?: string | null
          new_judge_id?: string | null
          changed_at?: string | null
        }
        Update: {
          id?: string
          score_id?: string
          admin_id?: string
          old_score?: number | null
          old_comment?: string | null
          new_score?: number | null
          new_comment?: string | null
          old_judge_id?: string | null
          new_judge_id?: string | null
          changed_at?: string | null
        }
      }
      track_sessions: {
        Row: {
          id: string
          team_id: string
          marshal_id: string
          sector: string
          entry_time: string | null
          exit_time: string | null
          status: SessionStatus
          notes: string | null
          weather_conditions: string | null
          track_conditions: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          marshal_id: string
          sector: string
          entry_time?: string | null
          exit_time?: string | null
          status?: SessionStatus
          notes?: string | null
          weather_conditions?: string | null
          track_conditions?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          marshal_id?: string
          sector?: string
          entry_time?: string | null
          exit_time?: string | null
          status?: SessionStatus
          notes?: string | null
          weather_conditions?: string | null
          track_conditions?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      track_incidents: {
        Row: {
          id: string
          team_id: string
          marshal_id: string
          session_id: string | null
          sector: string
          incident_type: IncidentType
          severity: SeverityLevel
          description: string
          action_taken: string | null
          occurred_at: string | null
          coordinates: any | null // Point type
          weather_impact: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          marshal_id: string
          session_id?: string | null
          sector: string
          incident_type: IncidentType
          severity?: SeverityLevel
          description: string
          action_taken?: string | null
          occurred_at?: string | null
          coordinates?: any | null
          weather_impact?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          marshal_id?: string
          session_id?: string | null
          sector?: string
          incident_type?: IncidentType
          severity?: SeverityLevel
          description?: string
          action_taken?: string | null
          occurred_at?: string | null
          coordinates?: any | null
          weather_impact?: boolean | null
          created_at?: string | null
        }
      }
      dynamic_event_runs: {
        Row: {
          id: string
          team_id: string
          driver_id: string | null
          event_type: EventType
          run_number: number
          raw_time: number | null
          penalties: any | null // JSONB type
          corrected_time: number | null
          status: RunStatus
          recorded_by: string
          recorded_at: string | null
          notes: string | null
          weather_conditions: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          driver_id?: string | null
          event_type: EventType
          run_number: number
          raw_time?: number | null
          penalties?: any | null
          corrected_time?: number | null
          status?: RunStatus
          recorded_by: string
          recorded_at?: string | null
          notes?: string | null
          weather_conditions?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          driver_id?: string | null
          event_type?: EventType
          run_number?: number
          raw_time?: number | null
          penalties?: any | null
          corrected_time?: number | null
          status?: RunStatus
          recorded_by?: string
          recorded_at?: string | null
          notes?: string | null
          weather_conditions?: string | null
          created_at?: string | null
        }
      }
      dynamic_event_results: {
        Row: {
          id: string
          team_id: string
          event_type: EventType
          best_time: number | null
          points: number | null
          position: number | null
          class_position: number | null
          status: ResultStatus
          tmin: number | null
          tmax: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          event_type: EventType
          best_time?: number | null
          points?: number | null
          position?: number | null
          class_position?: number | null
          status?: ResultStatus
          tmin?: number | null
          tmax?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          event_type?: EventType
          best_time?: number | null
          points?: number | null
          position?: number | null
          class_position?: number | null
          status?: ResultStatus
          tmin?: number | null
          tmax?: number | null
          updated_at?: string | null
        }
      }
      efficiency_results: {
        Row: {
          id: string
          team_id: string
          endurance_time: number | null
          energy_used: number | null
          efficiency_factor: number | null
          efficiency_points: number | null
          combined_endurance_efficiency_points: number | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          team_id: string
          endurance_time?: number | null
          energy_used?: number | null
          efficiency_factor?: number | null
          efficiency_points?: number | null
          combined_endurance_efficiency_points?: number | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          team_id?: string
          endurance_time?: number | null
          energy_used?: number | null
          efficiency_factor?: number | null
          efficiency_points?: number | null
          combined_endurance_efficiency_points?: number | null
          updated_at?: string | null
        }
      }
      // Add other tables from your Supabase schema context if needed
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      booking_status: BookingStatus
      result_status: ResultStatus
      user_role: UserRole
      vehicle_class: string // Assuming this is a string type in Prisma
      session_status: SessionStatus
      incident_type: IncidentType
      severity_level: SeverityLevel
      event_type: EventType
      run_status: RunStatus
      penalty_unit: PenaltyUnit
      score_status: ScoreStatus
      team_status: TeamStatus // Added
      vehicle_status: VehicleStatus // Added
      scrutineering_result: ScrutineeringResult // Added
      item_status: ItemStatus // Added
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}