// src/lib/types/database.ts
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

export type VehicleClass = 'EV' | 'CV'

export type BookingStatus = 
  | 'upcoming'
  | 'ongoing'
  | 'completed'
  | 'cancelled'
  | 'no_show'

export type ResultStatus = 
  | 'ongoing'
  | 'passed'
  | 'failed'
  | 'conditional_pass'
  | 'provisional'

export type Database = {
  public: {
    Tables: {
      teams: {
        Row: {
          id: string
          name: string
          code: string
          vehicle_class: VehicleClass
          university: string
          drivers: any[]
          vehicle_number: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          code: string
          vehicle_class: VehicleClass
          university: string
          drivers?: any[]
          vehicle_number?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          code?: string
          vehicle_class?: VehicleClass
          university?: string
          drivers?: any[]
          vehicle_number?: number | null
          created_at?: string
          updated_at?: string
        }
      }
      user_profiles: {
        Row: {
          id: string
          email: string
          first_name: string
          last_name: string
          father_name: string
          phone: string
          emergency_contact: string
          campsite_staying: boolean
          ehic_number: string
          team_id: string | null
          app_role: UserRole
          profile_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          first_name: string
          last_name: string
          father_name: string
          phone: string
          emergency_contact: string
          campsite_staying?: boolean
          ehic_number: string
          team_id?: string | null
          app_role?: UserRole
          profile_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          email?: string
          first_name?: string
          last_name?: string
          father_name?: string
          phone?: string
          emergency_contact?: string
          campsite_staying?: boolean
          ehic_number?: string
          team_id?: string | null
          app_role?: UserRole
          profile_completed?: boolean
          created_at?: string
          updated_at?: string
        }
      }
    }
  }
}
