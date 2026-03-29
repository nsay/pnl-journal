import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts'
import { formatDateKey, formatCurrency } from '../context/TradesContext'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

// ── Custom Tooltip ────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload
  if (!d) return null

  const net = d.net ?? 0
  const isPos = net >= 0

  return (
    <div style={{
      background: 'var(--bg-card)',
      border: '1px solid var(--border-light)',
      borderRadius: 8,
      padding: '10px 14px',
      boxShadow: 'var(--shadow-md)',
      minWidth: 160,
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
        {d.label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 800, color: isPos ? 'var(--green)' : 'var(--red)', marginBottom: 6 }}>
        {formatCurrency(net)}
      </div>
      {d.grossProfit !== undefined && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Row label="Gross Profit" value={`$${d.grossProfit.toFixed(2)}`} color="var(--green)" />
          <Row label="Gross Loss"   value={`$${d.grossLoss.toFixed(2)}`}   color="var(--red)" />
          <Row label="Fees"         value={`$${d.fees.toFixed(2)}`}         color="var(--text-muted)" />
          {d.trades !== undefined && (
            <Row label="Trades" value={d.trades} color="var(--text-secondary)" />
          )}
          {d.cumulative !== undefined && (
            <div style={{ borderTop: '1px solid var(--border)', marginTop: 4, paddingTop: 4 }}>
              <Row
                label="Cumulative"
                value={formatCurrency(d.cumulative)}
                color={d.cumulative >= 0 ? 'var(--accent-blue)' : 'var(--accent-blue)'}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, value, color }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, fontSize: 12 }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// ── Y-axis formatter ──────────────────────────────────────────────
function fmtY(v) {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`
  return `$${v}`
}

// ── Shared chart renderer ─────────────────────────────────────────
function Chart({ data }) {
  const hasData = data.some(d => d.net !== 0)

  if (!hasData) {
    return (
      <div style={{
        height: 220,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'var(--text-muted)',
        fontSize: 13,
      }}>
        No trade data for this period
      </div>
    )
  }

  // Cumulative line
  const enriched = data.reduce((acc, d) => {
    const prev = acc.length > 0 ? acc[acc.length - 1].cumulative : 0
    return [...acc, { ...d, cumulative: parseFloat((prev + d.net).toFixed(2)) }]
  }, [])

  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={enriched} margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 3" />
        <XAxis
          dataKey="x"
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontWeight: 600 }}
          axisLine={false}
          tickLine={false}
          dy={6}
        />
        <YAxis
          tickFormatter={fmtY}
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={52}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <ReferenceLine y={0} stroke="var(--border-light)" strokeWidth={1} />
        <Bar dataKey="net" radius={[3, 3, 0, 0]} maxBarSize={48}>
          {enriched.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.net >= 0 ? 'var(--green)' : 'var(--red)'}
              fillOpacity={entry.net === 0 ? 0.2 : 0.85}
            />
          ))}
        </Bar>
        <Line
          type="monotone"
          dataKey="cumulative"
          stroke="var(--accent-blue)"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: 'var(--accent-blue)', stroke: 'var(--bg-card)', strokeWidth: 2 }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

// ── Public chart components per view ─────────────────────────────

export function WeekChart({ cursor, trades }) {
  const start = getWeekStart(cursor)
  const data = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(start)
    date.setDate(date.getDate() + i)
    const key = formatDateKey(date)
    const dayTrades = trades[key] || []
    const { net, gp, gl, fees } = sumTrades(dayTrades)
    return {
      x: DOW_SHORT[date.getDay()],
      label: `${DOW_SHORT[date.getDay()]} ${date.getMonth()+1}/${date.getDate()}`,
      net,
      grossProfit: gp,
      grossLoss: gl,
      fees,
      trades: dayTrades.length,
    }
  })
  return <Chart data={data} />
}

export function MonthChart({ cursor, trades }) {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const data = Array.from({ length: daysInMonth }, (_, i) => {
    const date = new Date(year, month, i + 1)
    const key = formatDateKey(date)
    const dayTrades = trades[key] || []
    const { net, gp, gl, fees } = sumTrades(dayTrades)
    return {
      x: String(i + 1),
      label: `${MONTHS_SHORT[month]} ${i + 1}`,
      net,
      grossProfit: gp,
      grossLoss: gl,
      fees,
      trades: dayTrades.length,
    }
  })
  return <Chart data={data} />
}

export function YearChart({ cursor, getMonthSummary }) {
  const year = cursor.getFullYear()
  const data = Array.from({ length: 12 }, (_, m) => {
    const s = getMonthSummary(year, m)
    return {
      x: MONTHS_SHORT[m],
      label: `${MONTHS_SHORT[m]} ${year}`,
      net: parseFloat(s.totalNet.toFixed(2)),
      grossProfit: s.totalGrossProfit,
      grossLoss: s.totalGrossLoss,
      fees: s.totalFees,
      trades: s.tradeDays,
    }
  })
  return <Chart data={data} />
}

export function AllTimeChart({ getAllYears, getMonthSummary }) {
  const years = getAllYears()

  if (years.length === 0) return (
    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
      No trade data yet
    </div>
  )

  // If multiple years show yearly bars, otherwise show monthly breakdown
  if (years.length > 1) {
    const data = years.slice().reverse().map(year => {
      let net = 0, gp = 0, gl = 0, fees = 0, tradeDays = 0
      for (let m = 0; m < 12; m++) {
        const s = getMonthSummary(year, m)
        net += s.totalNet; gp += s.totalGrossProfit; gl += s.totalGrossLoss
        fees += s.totalFees; tradeDays += s.tradeDays
      }
      return {
        x: String(year),
        label: String(year),
        net: parseFloat(net.toFixed(2)),
        grossProfit: gp,
        grossLoss: gl,
        fees,
        trades: tradeDays,
      }
    })
    return <Chart data={data} />
  }

  // Single year — show months
  const year = years[0]
  const data = Array.from({ length: 12 }, (_, m) => {
    const s = getMonthSummary(year, m)
    return {
      x: MONTHS_SHORT[m],
      label: `${MONTHS_SHORT[m]} ${year}`,
      net: parseFloat(s.totalNet.toFixed(2)),
      grossProfit: s.totalGrossProfit,
      grossLoss: s.totalGrossLoss,
      fees: s.totalFees,
      trades: s.tradeDays,
    }
  })
  return <Chart data={data} />
}

// ── Helpers ───────────────────────────────────────────────────────
function getWeekStart(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay())
  return d
}

function sumTrades(dayTrades) {
  return dayTrades.reduce((acc, t) => {
    const gp = parseFloat(t.grossProfit) || 0
    const gl = parseFloat(t.grossLoss) || 0
    const f = parseFloat(t.fees) || 0
    acc.gp += gp; acc.gl += gl; acc.fees += f
    acc.net += gp - gl - f
    return acc
  }, { net: 0, gp: 0, gl: 0, fees: 0 })
}
