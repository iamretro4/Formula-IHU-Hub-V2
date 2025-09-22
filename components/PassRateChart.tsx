'use client'

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, subDays, eachDayOfInterval } from 'date-fns'

interface PassRateData {
  overallResult: string
  completedAt: Date | null
}

interface PassRateChartProps {
  data: PassRateData[]
}

export function PassRateChart({ data }: PassRateChartProps) {
  const chartData = useMemo(() => {
    const endDate = new Date()
    const startDate = subDays(endDate, 29) // Last 30 days
    
    const days = eachDayOfInterval({ start: startDate, end: endDate })
    
    return days.map(day => {
      const dayStart = new Date(day.setHours(0, 0, 0, 0))
      const dayEnd = new Date(day.setHours(23, 59, 59, 999))
      
      const dayData = data.filter(item => {
        if (!item.completedAt) return false
        const completedDate = new Date(item.completedAt)
        return completedDate >= dayStart && completedDate <= dayEnd
      })
      
      const totalTests = dayData.length
      const passedTests = dayData.filter(item => item.overallResult === 'PASS').length
      const passRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0
      
      return {
        date: format(day, 'MMM dd'),
        passRate: Math.round(passRate),
        totalTests,
        passedTests,
      }
    })
  }, [data])

  const averagePassRate = useMemo(() => {
    const validDays = chartData.filter(day => day.totalTests > 0)
    if (validDays.length === 0) return 0
    
    const totalPassRate = validDays.reduce((sum, day) => sum + day.passRate, 0)
    return Math.round(totalPassRate / validDays.length)
  }, [chartData])

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pass Rate Trend (30 Days)</h3>
        <div className="text-right">
          <p className="text-2xl font-bold text-green-600">{averagePassRate}%</p>
          <p className="text-sm text-gray-500">Average Pass Rate</p>
        </div>
      </div>
      
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              domain={[0, 100]}
              tickFormatter={(value) => `${value}%`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
              }}
              formatter={(value: number, name: string) => [
                `${value}%`,
                'Pass Rate'
              ]}
              labelFormatter={(label) => `Date: ${label}`}
              labelStyle={{ color: '#374151' }}
            />
            <Line
              type="monotone"
              dataKey="passRate"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, stroke: '#10b981', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>
          Showing pass rate percentage over the last 30 days. 
          Hover over the chart to see detailed information for each day.
        </p>
      </div>
    </div>
  )
}