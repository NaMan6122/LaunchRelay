import Sparkline from './Sparkline'

interface KpiCardProps {
  value: string
  label: string
  sparklineData?: { date: string; count: number }[]
  trend?: { direction: 'up' | 'down'; change: string }
  color?: string
}

export default function KpiCard({ value, label, sparklineData, trend, color }: KpiCardProps) {
  return (
    <div className="kpi">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
      {sparklineData && sparklineData.length >= 2 && (
        <div className="kpi-sparkline">
          <Sparkline data={sparklineData} color={color} />
        </div>
      )}
      {trend && (
        <div className={`kpi-trend kpi-trend-${trend.direction}`}>
          <span className="kpi-trend-arrow">{trend.direction === 'up' ? '↑' : '↓'}</span>
          {trend.change}
        </div>
      )}
    </div>
  )
}
