import { PrismaClient, UserRole, TeamStatus, VehicleStatus, ScrutineeringResult, ItemStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting seed...')

  // Create users with hashed passwords
  const adminUser = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@scrutineer.com',
      role: UserRole.ADMIN,
      passwordHash: await bcrypt.hash('admin123', 12),
    },
  })

  const judge1 = await prisma.user.create({
    data: {
      name: 'Sarah Judge',
      email: 'judge1@scrutineer.com',
      role: UserRole.JUDGE,
      passwordHash: await bcrypt.hash('judge123', 12),
    },
  })

  const judge2 = await prisma.user.create({
    data: {
      name: 'Mike Judge',
      email: 'judge2@scrutineer.com',
      role: UserRole.JUDGE,
      passwordHash: await bcrypt.hash('judge123', 12),
    },
  })

  const scrutineer1 = await prisma.user.create({
    data: {
      name: 'Alex Scrutineer',
      email: 'scrutineer1@scrutineer.com',
      role: UserRole.SCRUTINEER,
      passwordHash: await bcrypt.hash('scrutineer123', 12),
    },
  })

  const scrutineer2 = await prisma.user.create({
    data: {
      name: 'Emma Scrutineer',
      email: 'scrutineer2@scrutineer.com',
      role: UserRole.SCRUTINEER,
      passwordHash: await bcrypt.hash('scrutineer123', 12),
    },
  })

  const teamUser1 = await prisma.user.create({
    data: {
      name: 'John Team Lead',
      email: 'team1@example.com',
      role: UserRole.TEAM_USER,
      passwordHash: await bcrypt.hash('team123', 12),
    },
  })

  const teamUser2 = await prisma.user.create({
    data: {
      name: 'Lisa Team Lead',
      email: 'team2@example.com',
      role: UserRole.TEAM_USER,
      passwordHash: await bcrypt.hash('team123', 12),
    },
  })

  const teamUser3 = await prisma.user.create({
    data: {
      name: 'Carlos Team Lead',
      email: 'team3@example.com',
      role: UserRole.TEAM_USER,
      passwordHash: await bcrypt.hash('team123', 12),
    },
  })

  const teamUser4 = await prisma.user.create({
    data: {
      name: 'Anna Team Lead',
      email: 'team4@example.com',
      role: UserRole.TEAM_USER,
      passwordHash: await bcrypt.hash('team123', 12),
    },
  })

  // Create teams
  const team1 = await prisma.team.create({
    data: {
      name: 'Lightning Bolts Racing',
      country: 'USA',
      contactEmail: 'team1@example.com',
      contactPhone: '+1-555-0101',
      status: TeamStatus.APPROVED,
      members: {
        connect: [{ id: teamUser1.id }],
      },
    },
  })

  const team2 = await prisma.team.create({
    data: {
      name: 'Thunder Hawks EV',
      country: 'Germany',
      contactEmail: 'team2@example.com',
      contactPhone: '+49-555-0202',
      status: TeamStatus.APPROVED,
      members: {
        connect: [{ id: teamUser2.id }],
      },
    },
  })

  const team3 = await prisma.team.create({
    data: {
      name: 'Solar Speedsters',
      country: 'Spain',
      contactEmail: 'team3@example.com',
      contactPhone: '+34-555-0303',
      status: TeamStatus.PENDING,
      members: {
        connect: [{ id: teamUser3.id }],
      },
    },
  })

  const team4 = await prisma.team.create({
    data: {
      name: 'Arctic Racers',
      country: 'Norway',
      contactEmail: 'team4@example.com',
      contactPhone: '+47-555-0404',
      status: TeamStatus.APPROVED,
      members: {
        connect: [{ id: teamUser4.id }],
      },
    },
  })

  // Create vehicles
  const vehicle1 = await prisma.vehicle.create({
    data: {
      name: 'Lightning Bolt MK-IV',
      type: 'Electric Formula',
      chassisNumber: 'LB-2024-001',
      batterySpec: {
        type: 'Lithium-Ion',
        voltage: '400V',
        capacity: '85kWh',
        cells: 7104,
        chemistry: 'NMC',
      },
      year: 2024,
      status: VehicleStatus.PASSED,
      teamId: team1.id,
    },
  })

  const vehicle2 = await prisma.vehicle.create({
    data: {
      name: 'Thunder Hawk X1',
      type: 'Electric Formula',
      chassisNumber: 'TH-2024-002',
      batterySpec: {
        type: 'Lithium-Ion',
        voltage: '350V',
        capacity: '75kWh',
        cells: 6240,
        chemistry: 'LFP',
      },
      year: 2024,
      status: VehicleStatus.PENDING,
      teamId: team2.id,
    },
  })

  const vehicle3 = await prisma.vehicle.create({
    data: {
      name: 'Solar Speedster S3',
      type: 'Solar Electric',
      chassisNumber: 'SS-2024-003',
      batterySpec: {
        type: 'Lithium-Ion',
        voltage: '300V',
        capacity: '60kWh',
        cells: 5200,
        chemistry: 'NMC',
        solarPanels: '4m² monocrystalline',
      },
      year: 2024,
      status: VehicleStatus.PENDING,
      teamId: team3.id,
    },
  })

  const vehicle4 = await prisma.vehicle.create({
    data: {
      name: 'Arctic Racer AR-2024',
      type: 'Electric Formula',
      chassisNumber: 'AR-2024-004',
      batterySpec: {
        type: 'Lithium-Ion',
        voltage: '380V',
        capacity: '80kWh',
        cells: 6800,
        chemistry: 'NMC',
        thermalManagement: 'Liquid cooling',
      },
      year: 2024,
      status: VehicleStatus.PENDING,
      teamId: team4.id,
    },
  })

  const vehicle5 = await prisma.vehicle.create({
    data: {
      name: 'Lightning Bolt MK-III',
      type: 'Electric Formula',
      chassisNumber: 'LB-2023-005',
      batterySpec: {
        type: 'Lithium-Ion',
        voltage: '350V',
        capacity: '70kWh',
        cells: 6000,
        chemistry: 'NMC',
      },
      year: 2023,
      status: VehicleStatus.FAILED,
      teamId: team1.id,
    },
  })

  // Create scrutineering sessions
  const scrutineering1 = await prisma.scrutineering.create({
    data: {
      vehicleId: vehicle1.id,
      scheduledAt: new Date('2024-01-15T10:00:00Z'),
      location: 'Bay A1',
      scrutineerId: scrutineer1.id,
      overallResult: ScrutineeringResult.PASS,
      notes: 'Excellent build quality. All safety systems operational.',
      startedAt: new Date('2024-01-15T10:00:00Z'),
      completedAt: new Date('2024-01-15T12:30:00Z'),
    },
  })

  const scrutineering2 = await prisma.scrutineering.create({
    data: {
      vehicleId: vehicle2.id,
      scheduledAt: new Date('2024-01-20T14:00:00Z'),
      location: 'Bay B2',
      scrutineerId: scrutineer2.id,
      overallResult: ScrutineeringResult.PENDING,
      notes: 'Scheduled for next week.',
    },
  })

  const scrutineering3 = await prisma.scrutineering.create({
    data: {
      vehicleId: vehicle5.id,
      scheduledAt: new Date('2024-01-10T09:00:00Z'),
      location: 'Bay A2',
      scrutineerId: scrutineer1.id,
      overallResult: ScrutineeringResult.FAIL,
      notes: 'Battery insulation issues detected. Requires rework.',
      startedAt: new Date('2024-01-10T09:00:00Z'),
      completedAt: new Date('2024-01-10T11:45:00Z'),
    },
  })

  // Create default checklist templates
  const checklistItems = [
    // Safety Category
    { key: 'main_switch', label: 'Main Switch', description: 'Main switch is labeled, accessible, and functional', category: 'Safety', required: true, requiresEvidence: true, order: 1 },
    { key: 'roll_hoop', label: 'Roll Hoop/Cage', description: 'Roll hoop or cage integrity check', category: 'Safety', required: true, requiresEvidence: true, order: 2 },
    { key: 'fire_extinguisher', label: 'Fire Extinguisher', description: 'Fire extinguisher present and valid', category: 'Safety', required: true, requiresEvidence: false, order: 3 },
    { key: 'driver_egress', label: 'Driver Egress', description: 'Driver can exit vehicle in under 5 seconds', category: 'Safety', required: true, requiresEvidence: false, order: 4 },
    { key: 'seat_belts', label: 'Seat Belts/Harness', description: 'Seat belts or harness properly installed and functional', category: 'Safety', required: true, requiresEvidence: false, order: 5 },

    // Electrical Category
    { key: 'battery_insulation', label: 'Battery Insulation', description: 'Battery insulation resistance within specifications', category: 'Electrical', required: true, requiresEvidence: true, order: 10 },
    { key: 'wiring_secured', label: 'Wiring Secured', description: 'All wiring properly secured and labeled', category: 'Electrical', required: true, requiresEvidence: true, order: 11 },
    { key: 'hv_interlocks', label: 'HV Interlocks', description: 'High-voltage interlocks operational', category: 'Electrical', required: true, requiresEvidence: false, order: 12 },
    { key: 'emergency_stop', label: 'Emergency Stop', description: 'Emergency stop system functional', category: 'Electrical', required: true, requiresEvidence: false, order: 13 },
    { key: 'charging_system', label: 'Charging System', description: 'Charging system safety and functionality', category: 'Electrical', required: true, requiresEvidence: false, order: 14 },

    // Mechanical Category
    { key: 'steering_play', label: 'Steering Free Play', description: 'Steering free play within acceptable limits', category: 'Mechanical', required: true, requiresEvidence: false, order: 20 },
    { key: 'brake_clamping', label: 'Brake Clamping', description: 'Brakes clamping properly and evenly', category: 'Mechanical', required: true, requiresEvidence: false, order: 21 },
    { key: 'wheel_nuts', label: 'Wheel Nuts Torque', description: 'Wheel nuts properly torqued to specification', category: 'Mechanical', required: true, requiresEvidence: false, order: 22 },
    { key: 'suspension', label: 'Suspension', description: 'Suspension components secure and functional', category: 'Mechanical', required: true, requiresEvidence: false, order: 23 },
    { key: 'chassis_integrity', label: 'Chassis Integrity', description: 'Chassis structure integrity check', category: 'Mechanical', required: true, requiresEvidence: true, order: 24 },

    // Software/Telemetry Category
    { key: 'firmware_version', label: 'Firmware Version', description: 'Firmware version documented and approved', category: 'Software', required: true, requiresEvidence: false, order: 30 },
    { key: 'telemetry_system', label: 'Telemetry System', description: 'Telemetry system operational and logging', category: 'Software', required: false, requiresEvidence: false, order: 31 },
    { key: 'data_logging', label: 'Data Logging', description: 'Data logging system functional', category: 'Software', required: false, requiresEvidence: false, order: 32 },
  ]

  for (const item of checklistItems) {
    await prisma.checklistTemplate.create({
      data: item,
    })
  }

  // Create scrutineer items for completed scrutineering
  const passedItems = [
    { key: 'main_switch', status: ItemStatus.PASS, value: 'Accessible and labeled', remarks: 'Good placement' },
    { key: 'roll_hoop', status: ItemStatus.PASS, value: 'Intact', remarks: 'Meets FIA standards' },
    { key: 'fire_extinguisher', status: ItemStatus.PASS, value: 'Present', remarks: 'Valid until 2025' },
    { key: 'battery_insulation', status: ItemStatus.PASS, value: '500MΩ', remarks: 'Excellent insulation' },
    { key: 'wiring_secured', status: ItemStatus.PASS, value: 'Secured', remarks: 'Professional installation' },
    { key: 'steering_play', status: ItemStatus.PASS, value: '2°', remarks: 'Within spec' },
    { key: 'brake_clamping', status: ItemStatus.PASS, value: 'Even', remarks: 'Good brake feel' },
  ]

  for (const item of passedItems) {
    await prisma.scrutineerItem.create({
      data: {
        scrutineeringId: scrutineering1.id,
        key: item.key,
        label: checklistItems.find(ci => ci.key === item.key)?.label || item.key,
        description: checklistItems.find(ci => ci.key === item.key)?.description,
        category: checklistItems.find(ci => ci.key === item.key)?.category || 'General',
        status: item.status,
        value: item.value,
        remarks: item.remarks,
      },
    })
  }

  // Create failed items for failed scrutineering
  const failedItems = [
    { key: 'battery_insulation', status: ItemStatus.FAIL, value: '50MΩ', remarks: 'Below minimum 100MΩ requirement' },
    { key: 'wiring_secured', status: ItemStatus.FAIL, value: 'Loose', remarks: 'Several connections not properly secured' },
    { key: 'main_switch', status: ItemStatus.PASS, value: 'Accessible', remarks: 'OK' },
  ]

  for (const item of failedItems) {
    await prisma.scrutineerItem.create({
      data: {
        scrutineeringId: scrutineering3.id,
        key: item.key,
        label: checklistItems.find(ci => ci.key === item.key)?.label || item.key,
        description: checklistItems.find(ci => ci.key === item.key)?.description,
        category: checklistItems.find(ci => ci.key === item.key)?.category || 'General',
        status: item.status,
        value: item.value,
        remarks: item.remarks,
      },
    })
  }

  // Create some comments
  await prisma.comment.create({
    data: {
      authorId: judge1.id,
      text: 'Excellent work on the battery management system. Very professional installation.',
      vehicleId: vehicle1.id,
    },
  })

  await prisma.comment.create({
    data: {
      authorId: scrutineer1.id,
      text: 'Battery insulation needs immediate attention. Please check all connections and retest.',
      scrutineeringId: scrutineering3.id,
    },
  })

  // Create notifications
  await prisma.notification.create({
    data: {
      userId: teamUser1.id,
      title: 'Scrutineering Passed!',
      message: 'Your vehicle Lightning Bolt MK-IV has successfully passed scrutineering.',
      type: 'SUCCESS',
      read: false,
    },
  })

  await prisma.notification.create({
    data: {
      userId: teamUser1.id,
      title: 'Scrutineering Failed',
      message: 'Your vehicle Lightning Bolt MK-III failed scrutineering. Please check the report for details.',
      type: 'ERROR',
      read: true,
    },
  })

  await prisma.notification.create({
    data: {
      userId: teamUser2.id,
      title: 'Scrutineering Scheduled',
      message: 'Your scrutineering session is scheduled for January 20th at 2:00 PM in Bay B2.',
      type: 'INFO',
      read: false,
    },
  })

  console.log('✅ Seed completed successfully!')
  console.log('\n📧 Test accounts created:')
  console.log('Admin: admin@scrutineer.com / admin123')
  console.log('Judge: judge1@scrutineer.com / judge123')
  console.log('Scrutineer: scrutineer1@scrutineer.com / scrutineer123')
  console.log('Team User: team1@example.com / team123')
  console.log('\n🏁 Ready to start scrutineering!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })