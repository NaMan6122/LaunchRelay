interface KpiCardProps {
  value: string
  label: string
}

export default function KpiCard({ value, label }: KpiCardProps) {
  return (
    <div className="kpi">
      <div className="value">{value}</div>
      <div className="label">{label}</div>
    </div>
  )
}
