// src/lib/utils/formatting.ts
import { UserRole, VehicleClass } from '@/lib/types/database'

// Format user roles for display
export function formatUserRole(role: UserRole): string {
  const roleMap: Record<UserRole, string> = {
    admin: 'Administrator',
    scrutineer: 'Scrutineer',
    team_leader: 'Team Leader',
    inspection_responsible: 'Inspection Responsible',
    team_member: 'Team Member',
    design_judge_software: 'Design Judge - Software',
    design_judge_mechanical: 'Design Judge - Mechanical',
    design_judge_electronics: 'Design Judge - Electronics',
    design_judge_overall: 'Design Judge - Overall',
    bp_judge: 'Business Plan Judge',
    cm_judge: 'Cost & Manufacturing Judge',
    track_marshal: 'Track Marshal',
    viewer: 'Viewer',
  }
  
  return roleMap[role] || role
}

// Format vehicle class for display
export function formatVehicleClass(vehicleClass: VehicleClass): string {
  return vehicleClass === 'EV' ? 'Electric Vehicle' : 'Combustion Vehicle'
}

// Format team code for display
export function formatTeamCode(code: string): string {
  return code.toUpperCase()
}

// Format phone numbers
export function formatPhoneNumber(phone: string): string {
  // Simple formatting - you can enhance this
  return phone.replace(/(\+\d{2})(\d{3})(\d{3})(\d{4})/, '$1 $2 $3 $4')
}

// Format EHIC numbers
export function formatEHICNumber(ehic: string): string {
  return ehic.toUpperCase()
}
