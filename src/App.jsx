import { useState, useEffect, useRef } from 'react'
import { TradesProvider, useTrades } from './context/TradesContext'
import CalendarTab from './components/CalendarTab'
import ImportModal from './components/ImportModal'
import './App.css'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const now = new Date()
const dateString = `${DOW_SHORT[now.getDay()]}, ${MONTHS_SHORT[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

function SettingsDropdown() {
  const { clearAllTrades, trades } = useTrades()
  const [open, setOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef(null)
  const hasData = Object.keys(trades).length > 0

  // Close on outside click
  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false)
        setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClear() {
    clearAllTrades()
    setConfirming(false)
    setOpen(false)
  }

  return (
    <>
      <div className="settings-wrap" ref={ref}>
        <button
          className={`settings-btn ${open ? 'active' : ''}`}
          onClick={() => { setOpen(o => !o); setConfirming(false) }}
          title="Settings"
        >
          ⚙️
        </button>

        {open && (
          <div className="settings-dropdown">
            <div className="settings-dropdown-header">Settings</div>

            {/* Import CSV */}
            <button
              className="settings-item"
              onClick={() => { setShowImport(true); setOpen(false) }}
            >
              <span className="settings-item-icon">↑</span>
              <div>
                <div className="settings-item-label">Import CSV</div>
                <div className="settings-item-sub">Load trades from public/data/trades.csv</div>
              </div>
            </button>

            <div className="settings-divider" />

            {/* Delete all */}
            {!confirming ? (
              <button
                className="settings-item danger"
                onClick={() => setConfirming(true)}
                disabled={!hasData}
              >
                <span className="settings-item-icon">🗑</span>
                <div>
                  <div className="settings-item-label">Delete All Data</div>
                  <div className="settings-item-sub">
                    {hasData ? 'Permanently erase all journal entries' : 'No data to delete'}
                  </div>
                </div>
              </button>
            ) : (
              <div className="settings-confirm">
                <div className="settings-confirm-text">This cannot be undone. Are you sure?</div>
                <div className="settings-confirm-actions">
                  <button className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setConfirming(false)}>
                    Cancel
                  </button>
                  <button className="btn btn-danger" style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleClear}>
                    Yes, delete all
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
    </>
  )
}

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pnl_theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pnl_theme', theme)
  }, [theme])

  function toggleTheme() {
    setTheme(t => t === 'dark' ? 'light' : 'dark')
  }

  return (
    <TradesProvider>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-brand">
            PnL Journal
          </div>

          <div className="navbar-right">
            <span className="navbar-date">{dateString}</span>
            <SettingsDropdown />
            <button className="theme-toggle" onClick={toggleTheme} title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}>
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </nav>

        <main className="page">
          <CalendarTab />
        </main>
      </div>
    </TradesProvider>
  )
}
