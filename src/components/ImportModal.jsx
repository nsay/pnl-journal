import { useState, useEffect } from 'react'
import { fetchAndParseCSV, fetchAndParseNotesCSV } from '../utils/parseCSV'
import { useTrades, formatCurrency } from '../context/TradesContext'

const CSV_FILES = [
  { id: 'day-trades',   label: 'Day Trades',   file: 'day-trades.csv'   },
  { id: 'swing-trades', label: 'Swing Trades', file: 'swing-trades.csv' },
  { id: 'crypto-trades', label: 'Crypto Trades', file: 'crypto-trades.csv' },
]

export default function ImportModal({ onClose }) {
  const { saveDayTrades, saveNote, trades: existingTrades } = useTrades()

  const [selectedFile, setSelectedFile] = useState(CSV_FILES[0].id)
  const [status, setStatus]   = useState('loading') // loading | preview | done | error
  const [trades, setTrades]   = useState(null)
  const [notes, setNotes]     = useState(null)
  const [mode, setMode]       = useState('merge')
  const [errorMsg, setErrorMsg] = useState('')

  // Re-fetch whenever the selected file changes
  useEffect(() => {
    const csvEntry = CSV_FILES.find(f => f.id === selectedFile)
    const path = `${import.meta.env.BASE_URL}data/${csvEntry.file}`
    setStatus('loading')
    setTrades(null)
    setNotes(null)

    Promise.all([
      fetchAndParseCSV(path),
      fetchAndParseNotesCSV().catch(() => null),
    ]).then(([tradesResult, notesResult]) => {
      setTrades(tradesResult)
      setNotes(notesResult)
      setStatus('preview')
    }).catch(err => {
      setErrorMsg(err.message)
      setStatus('error')
    })
  }, [selectedFile])

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  function handleImport() {
    if (mode === 'replace') {
      Object.keys(existingTrades).forEach(key => saveDayTrades(key, []))
      Object.entries(trades.data).forEach(([key, rows]) => saveDayTrades(key, rows))
    } else {
      Object.entries(trades.data).forEach(([key, rows]) => {
        const existing = existingTrades[key] || []
        saveDayTrades(key, [...existing, ...rows])
      })
    }

    if (notes) {
      Object.entries(notes.data).forEach(([monthKey, text]) => saveNote(monthKey, text))
    }

    setStatus('done')
  }

  const previewNet = trades
    ? Object.values(trades.data).flat().reduce((sum, t) =>
        sum + (parseFloat(t.grossProfit) || 0) - (parseFloat(t.grossLoss) || 0) - (parseFloat(t.fees) || 0), 0)
    : 0

  const selectedEntry = CSV_FILES.find(f => f.id === selectedFile)

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 500 }}>
        <div className="modal-header">
          <div>
            <div className="modal-title">Import from CSV</div>
            <div className="modal-date">public/data/{selectedEntry?.file}</div>
          </div>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">

          {/* ── CSV file picker ── */}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
              Select File
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CSV_FILES.map(f => (
                <button
                  key={f.id}
                  onClick={() => { if (f.id !== selectedFile) { setSelectedFile(f.id); setStatus('loading') } }}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: 'var(--radius-md)',
                    border: `1px solid ${selectedFile === f.id ? 'var(--accent-blue)' : 'var(--border)'}`,
                    background: selectedFile === f.id ? 'var(--accent-blue-dim)' : 'var(--bg-input)',
                    color: selectedFile === f.id ? 'var(--accent-blue)' : 'var(--text-secondary)',
                    fontSize: 12.5,
                    fontWeight: selectedFile === f.id ? 700 : 500,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    textAlign: 'center',
                  }}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* ── States ── */}
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-muted)', fontSize: 13 }}>
              Loading {selectedEntry?.file}…
            </div>
          )}

          {status === 'error' && (
            <div style={{ padding: '16px', background: 'var(--red-dim)', border: '1px solid var(--red-border)', borderRadius: 'var(--radius-md)', fontSize: 13, color: 'var(--red)' }}>
              <strong>Failed to load CSV</strong><br />
              <span style={{ opacity: 0.85 }}>{errorMsg}</span>
            </div>
          )}

          {status === 'preview' && trades && (
            <>
              {/* Trades stats */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                  {selectedEntry?.file}
                </div>

                {trades.empty ? (
                  <div style={{ fontSize: 13, color: 'var(--text-muted)', padding: '12px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    This file has no data rows — nothing to import.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                      <StatBox label="Trades" value={trades.totalTrades} />
                      <StatBox label="Trading Days" value={trades.totalDays} />
                      <StatBox
                        label="Net P&L"
                        value={formatCurrency(previewNet)}
                        color={previewNet >= 0 ? 'var(--green)' : 'var(--red)'}
                      />
                    </div>
                    {trades.errors.length > 0 && <ErrorList errors={trades.errors} />}
                  </>
                )}
              </div>

              {/* Notes stats */}
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>
                  notes.csv
                </div>
                {notes ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
                      <StatBox label="Monthly Notes" value={notes.totalMonths} />
                      <StatBox label="Status" value="Ready" color="var(--green)" />
                    </div>
                    {notes.errors.length > 0 && <ErrorList errors={notes.errors} />}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', padding: '10px 14px', background: 'var(--bg-input)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)' }}>
                    notes.csv not found — skipping notes import
                  </div>
                )}
              </div>

              {/* Mode selector — only shown when there's data to import */}
              {!trades.empty && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                    Import Mode
                  </div>
                  <ModeOption
                    active={mode === 'merge'}
                    onClick={() => setMode('merge')}
                    title="Merge"
                    desc="Add CSV data alongside existing entries."
                  />
                  <ModeOption
                    active={mode === 'replace'}
                    onClick={() => setMode('replace')}
                    title="Replace All"
                    desc="Erase all existing journal data and load only the CSV."
                    danger
                  />
                </div>
              )}
            </>
          )}

          {status === 'done' && (
            <div style={{ textAlign: 'center', padding: '28px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <div style={{ fontSize: 36 }}>✅</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>Import Complete</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {trades.totalTrades} trades across {trades.totalDays} days
                {notes ? ` · ${notes.totalMonths} monthly notes` : ''} imported.
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
                {status === 'preview' && !trades?.empty && (
                  <button className="btn btn-primary" onClick={handleImport}>
                    Import All
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

function ErrorList({ errors }) {
  return (
    <div style={{ marginTop: 8, padding: '10px 14px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--radius-md)', fontSize: 12, color: 'var(--yellow)' }}>
      <strong>{errors.length} row{errors.length !== 1 ? 's' : ''} skipped:</strong>
      <ul style={{ margin: '4px 0 0 16px' }}>
        {errors.map((e, i) => <li key={i}>{e}</li>)}
      </ul>
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
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0, marginTop: 2,
        border: `2px solid ${active ? (danger ? 'var(--red)' : 'var(--accent-blue)') : 'var(--border-light)'}`,
        background: active ? (danger ? 'var(--red)' : 'var(--accent-blue)') : 'transparent',
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
