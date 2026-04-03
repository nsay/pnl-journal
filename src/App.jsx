import { useState, useEffect, useRef } from 'react'
import { TradesProvider, useTrades } from './context/TradesContext'
import CalendarTab from './components/CalendarTab'
import ImportModal from './components/ImportModal'
import './App.css'

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const now = new Date()
const dateString = `${DOW_SHORT[now.getDay()]}, ${MONTHS_SHORT[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`

// ── Account Switcher ────────────────────────────────────────────────────────

function AccountSwitcher() {
  const { accounts, currentAccount, switchAccount, createAccount, renameAccount, deleteAccount } = useTrades()
  const [open, setOpen]           = useState(false)
  const [creating, setCreating]   = useState(false)
  const [newName, setNewName]     = useState('')
  const [editingId, setEditingId] = useState(null)
  const [editName, setEditName]   = useState('')
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setCreating(false); setEditingId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleCreate() {
    if (!newName.trim()) return
    createAccount(newName)
    setNewName(''); setCreating(false); setOpen(false)
  }

  function startEdit(account, e) {
    e.stopPropagation()
    setEditingId(account.id); setEditName(account.name)
  }

  function commitEdit(id) {
    renameAccount(id, editName); setEditingId(null)
  }

  function handleDelete(id, e) {
    e.stopPropagation()
    deleteAccount(id)
  }

  return (
    <div className="acct-wrap" ref={ref}>
      <button
        className={`acct-btn ${open ? 'active' : ''}`}
        onClick={() => { setOpen(o => !o); setCreating(false); setEditingId(null) }}
        title="Switch account"
      >
        <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" style={{ opacity: 0.7, flexShrink: 0 }}>
          <path d="M6 0a3 3 0 1 1 0 6A3 3 0 0 1 6 0zm0 7c3.314 0 6 1.343 6 3v1H0v-1c0-1.657 2.686-3 6-3z"/>
        </svg>
        <span className="acct-name">{currentAccount?.name || 'Default'}</span>
        <svg width="8" height="8" viewBox="0 0 10 6" fill="currentColor" style={{ opacity: 0.5 }}>
          <path d="M0 0l5 6 5-6z"/>
        </svg>
      </button>

      {open && (
        <div className="acct-dropdown">
          <div className="acct-dropdown-header">Accounts</div>

          {accounts.map(acct => (
            <div key={acct.id} className={`acct-row ${acct.id === currentAccount?.id ? 'current' : ''}`}>
              {editingId === acct.id ? (
                <div className="acct-edit-row">
                  <input
                    autoFocus
                    className="acct-name-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter')  commitEdit(acct.id)
                      if (e.key === 'Escape') setEditingId(null)
                    }}
                    onBlur={() => commitEdit(acct.id)}
                    onClick={e => e.stopPropagation()}
                  />
                </div>
              ) : (
                <button
                  className="acct-row-btn"
                  onClick={() => { switchAccount(acct.id); setOpen(false) }}
                >
                  <span className="acct-check">{acct.id === currentAccount?.id ? '✓' : ''}</span>
                  <span className="acct-row-name">{acct.name}</span>
                  <span className="acct-row-actions" onClick={e => e.stopPropagation()}>
                    <button className="acct-action" title="Rename" onClick={e => startEdit(acct, e)}>
                      <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M11.013 1.427a1.75 1.75 0 0 1 2.474 0l1.086 1.086a1.75 1.75 0 0 1 0 2.474l-8.61 8.61c-.21.21-.47.364-.756.445l-3.251.93a.75.75 0 0 1-.927-.928l.929-3.25c.081-.286.235-.547.445-.758l8.61-8.61zm1.414 1.06a.25.25 0 0 0-.354 0L10.811 3.75l1.439 1.44 1.263-1.263a.25.25 0 0 0 0-.354l-1.086-1.086zM11.189 6.25 9.75 4.81 3.34 11.22a.25.25 0 0 0-.063.108l-.648 2.271 2.27-.648a.25.25 0 0 0 .109-.063l6.41-6.41z"/>
                      </svg>
                    </button>
                    {accounts.length > 1 && (
                      <button className="acct-action danger" title="Delete account" onClick={e => handleDelete(acct.id, e)}>
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="currentColor">
                          <path d="M11 1.75V3h2.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H5V1.75C5 .784 5.784 0 6.75 0h2.5C10.216 0 11 .784 11 1.75zM6.5 1.75v1.25h3V1.75a.25.25 0 0 0-.25-.25h-2.5a.25.25 0 0 0-.25.25zM4.997 6.5a.75.75 0 1 0-1.493.144L4.916 13.9a1.75 1.75 0 0 0 1.742 1.6h2.684a1.75 1.75 0 0 0 1.742-1.6l1.413-7.256a.75.75 0 1 0-1.494-.144l-1.413 7.256a.25.25 0 0 1-.248.229H6.658a.25.25 0 0 1-.248-.229L4.997 6.5z"/>
                        </svg>
                      </button>
                    )}
                  </span>
                </button>
              )}
            </div>
          ))}

          <div className="acct-divider" />

          {creating ? (
            <div className="acct-create">
              <input
                autoFocus
                className="acct-name-input"
                placeholder="Account name…"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter')  handleCreate()
                  if (e.key === 'Escape') setCreating(false)
                }}
              />
              <div className="acct-create-actions">
                <button className="btn btn-ghost"    style={{ fontSize: 12, padding: '5px 10px' }} onClick={() => setCreating(false)}>Cancel</button>
                <button className="btn btn-primary"  style={{ fontSize: 12, padding: '5px 10px' }} onClick={handleCreate}>Create</button>
              </div>
            </div>
          ) : (
            <button className="acct-new-btn" onClick={() => setCreating(true)}>
              <span style={{ fontSize: 15, lineHeight: 1 }}>+</span>
              New Account
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Settings Dropdown ───────────────────────────────────────────────────────

function SettingsDropdown() {
  const { clearAllTrades, trades } = useTrades()
  const [open, setOpen] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const ref = useRef(null)
  const hasData = Object.keys(trades).length > 0

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false); setConfirming(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function handleClear() {
    clearAllTrades(); setConfirming(false); setOpen(false)
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
                  <button className="btn btn-ghost"   style={{ fontSize: 12, padding: '5px 12px' }} onClick={() => setConfirming(false)}>Cancel</button>
                  <button className="btn btn-danger"  style={{ fontSize: 12, padding: '5px 12px' }} onClick={handleClear}>Yes, delete all</button>
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

// ── App ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('pnl_theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('pnl_theme', theme)
  }, [theme])

  function toggleTheme() { setTheme(t => t === 'dark' ? 'light' : 'dark') }

  return (
    <TradesProvider>
      <div className="app">
        <nav className="navbar">
          <div className="navbar-brand">PnL Journal</div>

          <div className="navbar-right">
            <AccountSwitcher />
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
