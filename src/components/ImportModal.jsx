import { useState, useEffect } from 'react'
import { fetchAndParseCSV } from '../utils/parseCSV'
import { useTrades } from '../context/TradesContext'
import { formatCurrency } from '../context/TradesContext'

export default function ImportModal({ onClose }) {
  const { saveDayTrades, trades: existingTrades } = useTrades()
  const [status, setStatus] = useState('loading') // loading | preview | importing | done | error
  const [parsed, setParsed] = useState(null)
  const [mode, setMode] = useState('merge') // merge | replace
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    fetchAndParseCSV()
      .then(result => {
        setParsed(result)
        setStatus('preview')
      })
      .catch(err => {
        setErrorMsg(err.message)
        setStatus('error')
      })
  }, [])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleImport() {
    setStatus('importing')
    const source = parsed.data

    if (mode === 'replace') {
      // Clear existing then write all
      Object.keys(existingTrades).forEach(key => saveDayTrades(key, []))
      Object.entries(source).forEach(([key, rows]) => saveDayTrades(key, rows))
    } else {
      // Merge: append CSV trades to existing day trades
      Object.entries(source).forEach(([key, rows]) => {
        const existing = existingTrades[key] || []
        saveDayTrades(key, [...existing, ...rows])
      })
    }

    setStatus('done')
  }

  // Compute a quick net P&L preview from parsed data
  const previewNet = parsed
    ? Object.values(parsed.data).flat().reduce((sum, t) => {
        return sum + (parseFloat(t.grossProfit) || 0) - (parseFloat(t.grossLoss) || 0) - (parseFloat(t.fees) || 0)
      }, 0)
    : 0

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Import from CSV</div>
            <div className="modal-date">public/data/trades.csv</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading trades.csv…
            </div>
          )}

          {status === 'error' && (
            <div style={{ padding: '16px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--red)' }}>
              <strong>Failed to load CSV</strong><br />
              <span style={{ opacity: 0.85 }}>{errorMsg}</span>
            </div>
          )}

          {(status === 'preview' || status === 'importing') && parsed && (
            <>
              {/* Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 10,
              }}>
                <StatBox label="Trades" value={parsed.totalTrades} />
                <StatBox label="Trading Days" value={parsed.totalDays} />
                <StatBox
                  label="Net P&L"
                  value={formatCurrency(previewNet)}
                  color={previewNet >= 0 ? 'var(--green)' : 'var(--red)'}
                />
              </div>

              {/* Errors */}
              {parsed.errors.length > 0 && (
                <div style={{ padding: '10px 14px', background: 'var(--yellow-dim, rgba(245,158,11,0.1))', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--yellow)' }}>
                  <strong>{parsed.errors.length} row{parsed.errors.length !== 1 ? 's' : ''} skipped:</strong>
                  <ul style={{ margin: '4px 0 0 16px' }}>
                    {parsed.errors.map((e, i) => <li key={i}>{e}</li>)}
                  </ul>
                </div>
              )}

              {/* Mode selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                  Import Mode
                </div>
                <ModeOption
                  active={mode === 'merge'}
                  onClick={() => setMode('merge')}
                  title="Merge"
                  desc="Add CSV trades alongside any existing entries for the same day."
                />
                <ModeOption
                  active={mode === 'replace'}
                  onClick={() => setMode('replace')}
                  title="Replace All"
                  desc="Erase all existing journal data and load only the CSV."
                  danger
                />
              </div>
            </>
          )}

          {status === 'done' && (
            <div style={{ textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 36 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Import Complete</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {parsed.totalTrades} trades across {parsed.totalDays} days loaded successfully.
              </div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <div className="modal-footer-left" />
          <div className="modal-footer-right">
            {status === 'done' ? (
              <button className="btn btn-primary" onClick={onClose}>Done</button>
            ) : (
              <>
                <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
                {status === 'preview' && (
                  <button className="btn btn-primary" onClick={handleImport}>
                    Import {parsed?.totalTrades} Trades
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatBox({ label, value, color }) {
  return (
    <div style={{
      background: 'var(--bg-input)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-md)',
      padding: '12px 14px',
    }}>
      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: color || 'var(--text-primary)', letterSpacing: '-0.3px' }}>
        {value}
      </div>
    </div>
  )
}

function ModeOption({ active, onClick, title, desc, danger }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 14px',
        borderRadius: 'var(--radius-md)',
        border: `1px solid ${active ? (danger ? 'var(--red-border)' : 'var(--accent-blue)') : 'var(--border)'}`,
        background: active ? (danger ? 'var(--red-dim)' : 'var(--accent-blue-dim)') : 'var(--bg-input)',
        cursor: 'pointer',
        transition: 'all 0.15s',
      }}
    >
      <div style={{
        width: 16,
        height: 16,
        borderRadius: '50%',
        border: `2px solid ${active ? (danger ? 'var(--red)' : 'var(--accent-blue)') : 'var(--border-light)'}`,
        background: active ? (danger ? 'var(--red)' : 'var(--accent-blue)') : 'transparent',
        flexShrink: 0,
        marginTop: 2,
      }} />
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: danger && active ? 'var(--red)' : 'var(--text-primary)', marginBottom: 2 }}>
          {title}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{desc}</div>
      </div>
    </div>
  )
}
