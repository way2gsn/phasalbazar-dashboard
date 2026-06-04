import { useState, useEffect, useCallback, useRef } from 'react'
import * as XLSX from 'xlsx'
import Broadcast from './Broadcast'

const API_URL = 'http://localhost:3000'

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  confirmed: { label: 'Confirmed', color: '#065F46', bg: '#D1FAE5', dot: '#10B981' },
  delivered: { label: 'Delivered', color: '#1E3A8A', bg: '#DBEAFE', dot: '#3B82F6' },
  cancelled: { label: 'Cancelled', color: '#7F1D1D', bg: '#FEE2E2', dot: '#EF4444' },
}
const PAYMENT_CONFIG = {
  UPI: { label: 'UPI', color: '#5B21B6', bg: '#EDE9FE' },
  COD: { label: 'COD', color: '#78350F', bg: '#FEF3C7' },
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'DM Sans', sans-serif; background: #F8F9FA; color: #111827; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: #F1F5F9; }
  ::-webkit-scrollbar-thumb { background: #CBD5E1; border-radius: 99px; }
  input, button, select, textarea { font-family: inherit; }
  input::placeholder { color: #9CA3AF; }
  button { cursor: pointer; border: none; outline: none; }
  .btn { transition: opacity 0.15s, transform 0.1s; }
  .btn:hover { opacity: 0.85; }
  .btn:active { transform: scale(0.975); }
  @keyframes fadeIn    { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  @keyframes toastIn   { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: none; } }
  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes shimmer   { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
  .fade-in { animation: fadeIn 0.25s ease both; }
  .row-hover:hover { background: #F8FAFC !important; }
  .nav-link {
    display: flex; align-items: center; gap: 9px;
    padding: 8px 10px; border-radius: 7px;
    font-size: 13.5px; font-weight: 500; color: #6B7280;
    cursor: pointer; transition: background 0.12s, color 0.12s;
    user-select: none;
  }
  .nav-link:hover { background: #F3F4F6; color: #111827; }
  .nav-link.active { background: #ECFDF5; color: #059669; font-weight: 600; }
`

function parseItems(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { } }
  return []
}
function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
function fmtShort(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function Badge({ status }) {
  const c = STATUS_CONFIG[status] || { label: status, color: '#374151', bg: '#F3F4F6', dot: '#9CA3AF' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: c.bg, color: c.color, borderRadius: 99, padding: '3px 9px', fontSize: 12, fontWeight: 600, whiteSpace: 'nowrap' }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.dot, flexShrink: 0 }} />
      {c.label}
    </span>
  )
}

function PayBadge({ method }) {
  const c = PAYMENT_CONFIG[method] || { label: method, color: '#374151', bg: '#F3F4F6' }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', background: c.bg, color: c.color, borderRadius: 99, padding: '3px 9px', fontSize: 12, fontWeight: 600 }}>
      {c.label}
    </span>
  )
}

function Toast({ msg, type, onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4500); return () => clearTimeout(t) }, [onClose])
  const err = type === 'error'
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 10,
      background: err ? '#FFF1F2' : '#F0FDF4',
      border: `1px solid ${err ? '#FCA5A5' : '#86EFAC'}`,
      color: err ? '#991B1B' : '#14532D',
      borderRadius: 10, padding: '11px 14px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
      fontSize: 13, fontWeight: 500,
      animation: 'toastIn 0.3s ease',
      minWidth: 250, maxWidth: 320,
    }}>
      <span>{err ? '⚠️' : '✓'}</span>
      <span style={{ flex: 1 }}>{msg}</span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'inherit', opacity: 0.4, fontSize: 18, lineHeight: 1 }}>×</button>
    </div>
  )
}

function StatCard({ icon, label, value, sub, iconBg = '#ECFDF5' }) {
  return (
    <div className="fade-in" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 9, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{icon}</div>
      </div>
      <div style={{ fontSize: 22, fontWeight: 700, color: '#111827', letterSpacing: '-0.4px' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: '#6B7280', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
    </div>
  )
}

function OrderModal({ order, onClose, onUpdate, onDelete }) {
  const [busy, setBusy] = useState(false)
  const items = parseItems(order.items)
  const s = STATUS_CONFIG[order.orderStatus] || STATUS_CONFIG.pending
  const p = PAYMENT_CONFIG[order.paymentMethod] || { label: order.paymentMethod, color: '#374151', bg: '#F3F4F6' }

  const act = async (status) => { setBusy(true); await onUpdate(order.orderId, status); setBusy(false); onClose() }
  const del = async () => {
    if (!confirm(`Delete order ${order.orderId}?`)) return
    setBusy(true); await onDelete(order.orderId); setBusy(false); onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)', animation: 'fadeIn 0.18s ease' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.15)', animation: 'fadeIn 0.2s ease' }}>

        {/* Header */}
        <div style={{ padding: '18px 22px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
              <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 14, fontWeight: 500, color: '#111827' }}>{order.orderId}</span>
              <Badge status={order.orderStatus} />
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>{fmtDate(order.createdAt)}</div>
          </div>
          <button className="btn" onClick={onClose} style={{ width: 30, height: 30, borderRadius: 7, background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#6B7280', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* Customer + Payment */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Customer</div>
              <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 13, fontWeight: 500, color: '#111827' }}>{order.customerPhone}</div>
              {order.customerName && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{order.customerName}</div>}
              {order.customerType && <span style={{ display: 'inline-block', marginTop: 8, fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#E5E7EB', borderRadius: 99, padding: '2px 8px', textTransform: 'capitalize' }}>{order.customerType}</span>}
              <div style={{ marginTop: 10 }}>
                <a href={`https://wa.me/${(order.customerPhone || '').replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: '#059669', textDecoration: 'none', background: '#ECFDF5', padding: '4px 10px', borderRadius: 99 }}>
                  💬 WhatsApp
                </a>
              </div>
            </div>
            <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '14px' }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 8 }}>Payment</div>
              <PayBadge method={order.paymentMethod} />
              <div style={{ fontSize: 24, fontWeight: 700, color: '#111827', marginTop: 10, letterSpacing: '-0.4px' }}>₹{order.total}</div>
            </div>
          </div>

          {/* Items */}
          {items.length > 0 && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Items</div>
              <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
                {items.map((item, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 14px', borderBottom: i < items.length - 1 ? '1px solid #F3F4F6' : 'none', background: '#fff' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{ fontSize: 18 }}>{item.emoji || '🌾'}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF' }}>Qty: {item.qty}</div>
                      </div>
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>₹{item.subtotal}</div>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 14px', background: '#F9FAFB', borderTop: '1px solid #E5E7EB' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Total</span>
                  <span style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>₹{order.total}</span>
                </div>
              </div>
            </div>
          )}

          {/* Address */}
          {order.address && (
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 8 }}>Delivery Address</div>
              <div style={{ background: '#F9FAFB', borderRadius: 10, padding: '12px 14px', fontSize: 13, color: '#6B7280', lineHeight: 1.6 }}>📍 {order.address}</div>
            </div>
          )}

          {/* Actions */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 10 }}>Update Status</div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {order.orderStatus === 'pending' && <>
                <button className="btn" onClick={() => act('confirmed')} disabled={busy} style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#065F46', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600 }}>✅ Confirm</button>
                <button className="btn" onClick={() => act('cancelled')} disabled={busy} style={{ background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600 }}>Cancel Order</button>
              </>}
              {order.orderStatus === 'confirmed' && (
                <button className="btn" onClick={() => act('delivered')} disabled={busy} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600 }}>📦 Mark Delivered</button>
              )}
              {order.orderStatus === 'cancelled' && (
                <button className="btn" onClick={() => act('pending')} disabled={busy} style={{ background: '#FFFBEB', border: '1px solid #FDE68A', color: '#92400E', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600 }}>↩ Restore</button>
              )}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #F3F4F6', paddingTop: 14 }}>
            <button className="btn" onClick={del} disabled={busy} style={{ background: 'none', border: '1px solid #FECACA', color: '#DC2626', borderRadius: 8, padding: '7px 14px', fontSize: 12, fontWeight: 600 }}>
              Delete Order
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Login({ onLogin }) {
  const [pass, setPass] = useState(() => { try { return localStorage.getItem('pb_token') || '' } catch { return '' } })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const go = async () => {
    if (!pass.trim()) { setErr('Enter your password'); return }
    setBusy(true); setErr('')
    try {
      const r = await fetch(`${API_URL}/admin/stats`, { headers: { Authorization: `Bearer ${pass}` } })
      if (!r.ok) { setErr('Wrong password'); setBusy(false); return }
      try { localStorage.setItem('pb_token', pass) } catch { }
      onLogin(API_URL, pass)
    } catch { setErr('Cannot connect to server') }
    setBusy(false)
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8F9FA', padding: 24 }}>
      <style>{STYLES}</style>
      <div className="fade-in" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '36px 32px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌾</div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Phasal Bazar</div>
            <div style={{ fontSize: 12, color: '#9CA3AF' }}>Admin Dashboard</div>
          </div>
        </div>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Password</label>
        <input type="password" value={pass} onChange={e => setPass(e.target.value)} onKeyDown={e => e.key === 'Enter' && go()} placeholder="Enter admin password"
          style={{ width: '100%', border: `1.5px solid ${err ? '#FCA5A5' : '#E5E7EB'}`, borderRadius: 8, padding: '10px 12px', fontSize: 14, color: '#111827', outline: 'none', background: '#fff', marginBottom: 8 }} />
        {err && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>⚠️ {err}</div>}
        <button className="btn" onClick={go} disabled={busy} style={{ width: '100%', background: '#059669', color: '#fff', borderRadius: 8, padding: '11px', fontSize: 14, fontWeight: 600, boxShadow: '0 2px 8px rgba(5,150,105,0.25)', opacity: busy ? 0.7 : 1 }}>
          {busy ? 'Signing in…' : 'Sign In'}
        </button>
      </div>
    </div>
  )
}

function Dashboard({ api, token, onLogout }) {
  const [orders, setOrders] = useState([])
  const [stats, setStats] = useState({})
  const [view, setView] = useState('orders')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncTime, setSyncTime] = useState('')
  const [toasts, setToasts] = useState([])
  const [page, setPage] = useState('dashboard') // 'dashboard' or 'broadcast'
  const prevIds = useRef(new Set())

  const addToast = useCallback((msg, type = 'success') => {
    setToasts(t => [...t, { id: Date.now() + Math.random(), msg, type }])
  }, [])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setSyncing(true)
    try {
      const [oRes, sRes] = await Promise.all([
        fetch(`${api}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${api}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const newOrders = await oRes.json()
      const newStats = await sRes.json()
      const newPending = newOrders.filter(o => o.orderStatus === 'pending' && !prevIds.current.has(o.orderId))
      if (newPending.length && prevIds.current.size) {
        newPending.forEach(o => addToast(`New order from ${o.customerPhone} — ₹${o.total}`))
        if (Notification.permission === 'granted')
          newPending.forEach(o => new Notification('🌾 New Order', { body: `₹${o.total} from ${o.customerPhone}` }))
      }
      prevIds.current = new Set(newOrders.map(o => o.orderId))
      setOrders(newOrders); setStats(newStats)
      setSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    } catch { addToast('Failed to load', 'error') }
    setLoading(false); setSyncing(false)
  }, [api, token, addToast])

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
    load()
    const iv = setInterval(() => load(true), 30000)
    return () => clearInterval(iv)
  }, [])

  const updateOrder = async (orderId, status) => {
    try {
      const r = await fetch(`${api}/admin/orders/${orderId}`, { method: 'PATCH', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ orderStatus: status }) })
      if (!r.ok) throw new Error()
      await load(true); addToast(`Order updated → ${status}`)
    } catch { addToast('Update failed', 'error') }
  }

  const deleteOrder = async (orderId) => {
    try {
      await fetch(`${api}/admin/orders/${orderId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      await load(true); addToast('Order deleted')
    } catch { addToast('Delete failed', 'error') }
  }

  const exportExcel = () => {
    const rows = orders.map(o => {
      const items = parseItems(o.items)
      return { 'Order ID': o.orderId, 'Phone': o.customerPhone, 'Name': o.customerName || '', 'Items': items.map(i => `${i.name} x${i.qty}`).join(', '), 'Total (₹)': o.total, 'Payment': o.paymentMethod, 'Status': o.orderStatus, 'Address': o.address || '', 'Date': fmtDate(o.createdAt) }
    })
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Orders')
    XLSX.writeFile(wb, `phasal-bazar-${new Date().toISOString().split('T')[0]}.xlsx`)
    addToast(`Exported ${rows.length} orders`)
  }

  const statusFilter = view === 'orders' ? null : view
  const filtered = orders
    .filter(o => !statusFilter || o.orderStatus === statusFilter)
    .filter(o => {
      if (!search) return true
      const q = search.toLowerCase()
      return o.orderId?.toLowerCase().includes(q) || o.customerPhone?.includes(q) || (o.customerName || '').toLowerCase().includes(q)
    })

  const todayRevenue = orders
    .filter(o => o.orderStatus !== 'cancelled' && o.createdAt && new Date(o.createdAt).toDateString() === new Date().toDateString())
    .reduce((s, o) => s + (Number(o.total) || 0), 0)

  const COLS = ['Order ID', 'Customer', 'Items', 'Date', 'Amount', 'Payment', 'Status']
  const GRID = '120px 1fr 1.4fr 130px 80px 80px 110px'

  const NAV = [
    { id: 'orders', icon: '📋', label: 'All Orders', count: stats.total },
    { id: 'pending', icon: '⏳', label: 'Pending', count: stats.pending },
    { id: 'confirmed', icon: '✅', label: 'Confirmed', count: stats.confirmed },
    { id: 'delivered', icon: '📦', label: 'Delivered', count: stats.delivered },
    { id: 'cancelled', icon: '❌', label: 'Cancelled', count: stats.cancelled },
    { id: 'broadcast', icon: '📢', label: 'Broadcast', count: null },
  ]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F8F9FA' }}>
      <style>{STYLES}</style>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onClose={() => setToasts(ts => ts.filter(x => x.id !== t.id))} />)}
      </div>

      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} onUpdate={updateOrder} onDelete={deleteOrder} />}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside style={{ width: 220, flexShrink: 0, background: '#fff', borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Brand */}
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid #F3F4F6' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#ECFDF5', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Phasal Bazar</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>Order Management</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', padding: '4px 10px 8px' }}>Orders</div>
          {NAV.map(item => (
            <div key={item.id} className={`nav-link ${view === item.id || (item.id === 'broadcast' && page === 'broadcast') ? 'active' : ''}`} onClick={() => {
              if (item.id === 'broadcast') setPage('broadcast');
              else { setView(item.id); setPage('dashboard'); }
            }}>
              <span style={{ fontSize: 14 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.count !== null && <span style={{
                fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 99,
                background: view === item.id ? '#D1FAE5' : '#F3F4F6',
                color: view === item.id ? '#065F46' : '#6B7280',
              }}>{item.count || 0}</span>}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #F3F4F6' }}>
          <div className="nav-link" onClick={onLogout} style={{ color: '#DC2626' }}>
            <span>🚪</span> Sign Out
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
        {page === 'broadcast' ? (
          <Broadcast api={api} token={token} onBack={() => setPage('dashboard')} />
        ) : (
          <div>
            {/* Top bar */}
            <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
              <div>
                <h1 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                  {NAV.find(n => n.id === view)?.label || 'Orders'}
                </h1>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                  {syncing
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span> Syncing…</span>
                    : syncTime ? `Last synced ${syncTime}` : 'Loading…'}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9CA3AF' }}>🔍</span>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search orders…"
                    style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px 8px 30px', fontSize: 13, color: '#111827', outline: 'none', width: 200 }}
                    onFocus={e => e.target.style.borderColor = '#059669'}
                    onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                  {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 16, lineHeight: 1 }}>×</button>}
                </div>
                <button className="btn" onClick={exportExcel} style={{ background: '#F0FDF4', border: '1px solid #A7F3D0', color: '#059669', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
                  ⬇ Export
                </button>
                <button className="btn" onClick={() => load(true)} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>
                  ↻ Refresh
                </button>
              </div>
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', flex: 1 }}>

              {/* Stats */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12, marginBottom: 22 }}>
                <StatCard icon="📋" label="Total Orders" value={stats.total || 0} iconBg="#EFF6FF" />
                <StatCard icon="⏳" label="Pending" value={stats.pending || 0} sub={`${stats.todayOrders || 0} today`} iconBg="#FFFBEB" />
                <StatCard icon="✅" label="Confirmed" value={stats.confirmed || 0} iconBg="#ECFDF5" />
                <StatCard icon="📦" label="Delivered" value={stats.delivered || 0} iconBg="#EFF6FF" />
                <StatCard icon="💰" label="Revenue" value={`₹${Number(stats.totalRevenue).toFixed(2) || 0}`} sub={`₹${todayRevenue} today`} iconBg="#F0FDF4" />
                <StatCard icon="💳" label="COD / UPI" value={`${stats.codOrders || 0} / ${stats.upiOrders || 0}`} iconBg="#FAF5FF" />
              </div>

              {/* Table card */}
              <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden' }}>

                {/* Table toolbar */}
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                    {loading ? 'Loading…' : `${filtered.length} ${filtered.length === 1 ? 'order' : 'orders'}`}
                    {search && !loading && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> matching "{search}"</span>}
                  </div>
                  {!loading && filtered.length > 0 && (
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      Value: <strong style={{ color: '#059669' }}>
                        ₹{filtered.filter(o => o.orderStatus !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0).toLocaleString('en-IN')}
                      </strong>
                    </div>
                  )}
                </div>

                {/* Column headers */}
                {!loading && filtered.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '0 20px', height: 38, alignItems: 'center', gap: 10, background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                    {COLS.map(c => <div key={c} style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{c}</div>)}
                  </div>
                )}

                {/* Rows */}
                {loading ? (
                  <div>
                    {Array.from({ length: 7 }).map((_, i) => (
                      <div key={i} style={{
                        height: 54, margin: '0', borderBottom: '1px solid #F3F4F6',
                        background: 'linear-gradient(90deg, #f4f4f4 25%, #fafafa 50%, #f4f4f4 75%)',
                        backgroundSize: '600px 100%',
                        animation: `shimmer 1.3s infinite`,
                        animationDelay: `${i * 0.06}s`,
                      }} />
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  <div style={{ padding: '70px 20px', textAlign: 'center' }}>
                    <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.18 }}>📭</div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 5 }}>No orders found</div>
                    <div style={{ fontSize: 13, color: '#9CA3AF' }}>Try adjusting your filters or search</div>
                  </div>
                ) : (
                  filtered.map((order, i) => {
                    const items = parseItems(order.items)
                    const summary = items.length ? items.slice(0, 2).map(it => it.name).join(', ') + (items.length > 2 ? ` +${items.length - 2} more` : '') : '—'
                    return (
                      <div key={order.orderId} className="row-hover" onClick={() => setSelected(order)} style={{
                        display: 'grid', gridTemplateColumns: GRID, padding: '0 20px', height: 54,
                        alignItems: 'center', gap: 10, borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none',
                        cursor: 'pointer', background: '#fff', transition: 'background 0.1s',
                        opacity: order.orderStatus === 'cancelled' ? 0.55 : 1,
                      }}>
                        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, fontWeight: 500, color: '#374151' }}>{order.orderId}</div>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{order.customerPhone}</div>
                          {order.customerName && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{order.customerName}</div>}
                        </div>
                        <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</div>
                        <div style={{ fontSize: 12, color: '#6B7280' }}>{fmtShort(order.createdAt)}</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>₹{order.total}</div>
                        <PayBadge method={order.paymentMethod} />
                        <Badge status={order.orderStatus} />
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [auth, setAuth] = useState(() => {
    try { const t = localStorage.getItem('pb_token'); return t ? { api: API_URL, token: t } : null } catch { return null }
  })
  if (!auth) return <Login onLogin={(api, token) => setAuth({ api, token })} />
  return <Dashboard api={auth.api} token={auth.token} onLogout={() => { try { localStorage.removeItem('pb_token') } catch { }; setAuth(null) }} />
}