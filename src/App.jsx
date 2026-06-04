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
  @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Outfit', sans-serif; background: #FAFDFB; color: #1F2937; -webkit-font-smoothing: antialiased; }
  ::-webkit-scrollbar { width: 6px; height: 6px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #D1FAE5; border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: #A7F3D0; }
  input, button, select, textarea { font-family: inherit; }
  input::placeholder { color: #9CA3AF; }
  button { cursor: pointer; border: none; outline: none; transition: all 0.2s ease; }
  .btn { display: inline-flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s ease; cursor: pointer; }
  .btn:hover { opacity: 0.9; transform: translateY(-1px); }
  .btn:active { transform: translateY(0); }
  .card { background: #fff; border: 1px solid #E6F4EA; border-radius: 16px; box-shadow: 0 4px 20px rgba(4,120,87,0.02); transition: all 0.25s ease; }
  .card:hover { box-shadow: 0 10px 30px rgba(4,120,87,0.05); transform: translateY(-2px); }
  .nav-group-title { font-size: 10px; font-weight: 700; color: #047857; text-transform: uppercase; letter-spacing: 1.2px; padding: 14px 12px 6px; opacity: 0.7; }
  .nav-link {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 12px; border-radius: 10px;
    font-size: 14px; font-weight: 500; color: #4B5563;
    cursor: pointer; transition: all 0.2s ease;
    user-select: none; margin: 2px 0;
  }
  .nav-link:hover { background: #F0FDF4; color: #065F46; }
  .nav-link.active { background: #D1FAE5; color: #065F46; font-weight: 600; box-shadow: 0 4px 12px rgba(16,185,129,0.1); }
  .row-hover:hover { background: #F0FDF4 !important; }
  .chat-bubble { max-width: 65%; padding: 10px 14px; border-radius: 16px; font-size: 13px; line-height: 1.5; margin: 4px 0; display: flex; flexDirection: column; }
  .slide-over { position: fixed; right: 0; top: 0; bottom: 0; width: 460px; background: #fff; box-shadow: -10px 0 40px rgba(0,0,0,0.08); z-index: 400; transform: translateX(100%); transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
  .slide-over.open { transform: translateX(0); }
  .backdrop { position: fixed; inset: 0; background: rgba(15,23,42,0.3); backdrop-filter: blur(4px); z-index: 350; opacity: 0; pointer-events: none; transition: opacity 0.3s ease; }
  .backdrop.open { opacity: 1; pointer-events: auto; }
  @keyframes fadeIn    { from { opacity: 0; } to { opacity: 1; } }
  @keyframes toastIn   { from { opacity: 0; transform: translateX(100px); } to { opacity: 1; transform: none; } }
  @keyframes spin      { to { transform: rotate(360deg); } }
  @keyframes shimmer   { 0% { background-position: -600px 0; } 100% { background-position: 600px 0; } }
  .fade-in { animation: fadeIn 0.25s ease both; }
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

function CustTypeBadge({ type }) {
  const isWholesale = type === 'wholesale'
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: isWholesale ? '#F5F3FF' : '#ECFDF5',
      color: isWholesale ? '#6D28D9' : '#047857',
      borderRadius: 99, padding: '3px 9px', fontSize: 11, fontWeight: 600, textTransform: 'capitalize'
    }}>
      {isWholesale ? '🏪 Wholesale' : '🛒 Retail'}
    </span>
  )
}

function LangBadge({ lang }) {
  const names = { en: '🇬🇧 EN', hi: '🇮🇳 HI', ta: '🇮🇳 TA', te: '🇮🇳 TE' }
  const bg = { en: '#EFF6FF', hi: '#FEF3C7', ta: '#F3F4F6', te: '#FDF2F8' }
  const color = { en: '#1D4ED8', hi: '#B45309', ta: '#374151', te: '#BE185D' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center',
      background: bg[lang] || '#F3F4F6',
      color: color[lang] || '#374151',
      borderRadius: 99, padding: '3px 9px', fontSize: 11, fontWeight: 600
    }}>
      {names[lang] || String(lang).toUpperCase()}
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
    <div className="fade-in" style={{ background: '#fff', border: '1px solid #E6F4EA', borderRadius: 14, padding: '18px 20px', boxShadow: '0 4px 20px rgba(4,120,87,0.01)' }}>
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

function AnalyticsView({ orders, users, stats, todayRevenue }) {
  const totalCompleted = orders.filter(o => o.orderStatus !== 'cancelled').length;
  const upiCount = orders.filter(o => o.paymentMethod === 'UPI' && o.orderStatus !== 'cancelled').length;
  const codCount = orders.filter(o => o.paymentMethod === 'COD' && o.orderStatus !== 'cancelled').length;
  const upiPercent = totalCompleted ? Math.round((upiCount / totalCompleted) * 100) : 0;
  const codPercent = totalCompleted ? Math.round((codCount / totalCompleted) * 100) : 0;

  const totalCustomers = users.length;
  const wholesaleCount = users.filter(u => u.customerType === 'wholesale').length;
  const retailCount = users.filter(u => u.customerType !== 'wholesale').length;
  const wholesalePercent = totalCustomers ? Math.round((wholesaleCount / totalCustomers) * 100) : 0;
  const retailPercent = totalCustomers ? Math.round((retailCount / totalCustomers) * 100) : 0;

  const aov = stats.total ? (Number(stats.totalRevenue) / stats.total).toFixed(2) : '0';

  const categoryCounts = {};
  orders.forEach(o => {
    if (o.orderStatus === 'cancelled') return;
    const items = parseItems(o.items);
    items.forEach(it => {
      const cat = it.category || 'Other';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + it.qty;
    });
  });
  
  const sortedCategories = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const totalItemQty = Object.values(categoryCounts).reduce((s, c) => s + c, 0) || 1;
  const recentOrders = orders.slice(0, 5);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Metrics Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
        <StatCard icon="💰" label="Total Revenue" value={`₹${Number(stats.totalRevenue || 0).toLocaleString('en-IN')}`} sub={`₹${todayRevenue} today`} iconBg="#E6F4EA" />
        <StatCard icon="📋" label="Total Orders" value={stats.total || 0} sub={`${stats.todayOrders || 0} today`} iconBg="#EFF6FF" />
        <StatCard icon="📊" label="Average Order Value" value={`₹${aov}`} sub="Gross sales per order" iconBg="#FEF3C7" />
        <StatCard icon="👥" label="Active Customers" value={totalCustomers} sub="Registered in database" iconBg="#F5F3FF" />
      </div>

      {/* Progress Splits */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Payment Split */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Payment Mode Splits</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: '#4B5563' }}>📱 UPI (Online Payments)</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{upiCount} orders ({upiPercent}%)</span>
              </div>
              <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${upiPercent}%`, background: '#6D28D9', borderRadius: 99 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: '#4B5563' }}>💵 Cash on Delivery (COD)</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{codCount} orders ({codPercent}%)</span>
              </div>
              <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${codPercent}%`, background: '#F59E0B', borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Customer Split */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Customer Profile Splits</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: '#4B5563' }}>🛒 Retail Shoppers</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{retailCount} users ({retailPercent}%)</span>
              </div>
              <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${retailPercent}%`, background: '#10B981', borderRadius: 99 }} />
              </div>
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
                <span style={{ fontWeight: 600, color: '#4B5563' }}>🏪 Wholesale Traders</span>
                <span style={{ fontWeight: 700, color: '#111827' }}>{wholesaleCount} traders ({wholesalePercent}%)</span>
              </div>
              <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${wholesalePercent}%`, background: '#4F46E5', borderRadius: 99 }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories & Activity */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 20 }}>
        {/* Recent Orders Timeline */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Recent Orders Stream</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {recentOrders.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No orders yet</div>
            ) : (
              recentOrders.map(o => (
                <div key={o.orderId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 10, borderBottom: '1px solid #F3F4F6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ fontSize: 18 }}>📦</div>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: '#111827', fontFamily: 'monospace' }}>{o.orderId}</div>
                      <div style={{ fontSize: 11, color: '#6B7280' }}>{o.customerPhone} ({o.customerName || 'Anonymous'})</div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>₹{o.total}</div>
                    <div style={{ fontSize: 10, color: '#9CA3AF' }}>{fmtShort(o.createdAt)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Top Product Categories */}
        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Top Product Categories</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {sortedCategories.length === 0 ? (
              <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No items sold yet</div>
            ) : (
              sortedCategories.map(([cat, qty]) => {
                const pct = Math.round((qty / totalItemQty) * 100);
                return (
                  <div key={cat} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 13, fontWeight: 500, color: '#4B5563', textTransform: 'capitalize' }}>🌾 {cat}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '60%' }}>
                      <div style={{ flex: 1, height: 6, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: '#10B981', borderRadius: 99 }} />
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#111827', width: 45, textAlign: 'right' }}>{qty} units</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProductCatalogView({ api, token, products, categories, onLoad, addToast, catalogConfig }) {
  const [catSearch, setCatSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("all");
  const [editingProduct, setEditingProduct] = useState(null);
  
  const [showSettings, setShowSettings] = useState(false);
  const [catalogIdInput, setCatalogIdInput] = useState(catalogConfig.catalogId || "");
  const [tokenInput, setTokenInput] = useState("");
  const [brandInput, setBrandInput] = useState(catalogConfig.brand || "Phasal Bazar");
  const [urlInput, setUrlInput] = useState(catalogConfig.websiteUrl || "https://wa.me/c/917771012123");
  const [broadcastImageInput, setBroadcastImageInput] = useState(catalogConfig.broadcastImageUrl || "");
  const [syncingMeta, setSyncingMeta] = useState(false);

  useEffect(() => {
    setCatalogIdInput(catalogConfig.catalogId || "");
    setBrandInput(catalogConfig.brand || "Phasal Bazar");
    setUrlInput(catalogConfig.websiteUrl || "https://wa.me/c/917771012123");
    setBroadcastImageInput(catalogConfig.broadcastImageUrl || "");
  }, [catalogConfig]);

  const handleSaveProduct = async (updatedProduct) => {
    try {
      const r = await fetch(`${api}/admin/catalog/products/${updatedProduct.id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatedProduct)
      });
      if (!r.ok) throw new Error();
      addToast("Product updated successfully");
      setEditingProduct(null);
      onLoad(true);
    } catch {
      addToast("Failed to update product", "error");
    }
  };

  const handleSyncMeta = async () => {
    setSyncingMeta(true);
    try {
      // Save config (including broadcast image URL) first
      await fetch(`${api}/admin/catalog/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          catalogId: catalogIdInput,
          brand: brandInput,
          websiteUrl: urlInput,
          broadcastImageUrl: broadcastImageInput
        })
      });

      // Then sync with Meta
      const r = await fetch(`${api}/admin/catalog/sync`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          catalogId: catalogIdInput,
          accessToken: tokenInput || undefined,
          brand: brandInput,
          websiteUrl: urlInput
        })
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "Sync failed");
      addToast("Settings saved & synced with Meta Product Catalog!");
      setShowSettings(false);
      onLoad(true);
    } catch (e) {
      addToast(e.message || "Failed to sync Meta Catalog", "error");
    } finally {
      setSyncingMeta(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const name = (p.name.en || '').toLowerCase();
    const query = catSearch.toLowerCase();
    const matchesSearch = name.includes(query) || (p.id || '').toLowerCase().includes(query);
    const matchesCategory = selectedCat === "all" || p.category === selectedCat;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', gap: 10, flex: 1 }}>
          <div style={{ position: 'relative', width: 260 }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9CA3AF' }}>🔍</span>
            <input value={catSearch} onChange={e => setCatSearch(e.target.value)} placeholder="Search catalog products..."
              style={{ width: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px 8px 30px', fontSize: 13, color: '#111827', outline: 'none' }} />
          </div>
          <select value={selectedCat} onChange={e => setSelectedCat(e.target.value)}
            style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }}>
            <option value="all">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.emoji} {c.name.en}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowSettings(true)} style={{ background: '#F3F4F6', color: '#4B5563', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
            ⚙️ Meta Sync Config
          </button>
          <button onClick={handleSyncMeta} disabled={syncingMeta} style={{ background: '#059669', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, opacity: syncingMeta ? 0.7 : 1 }}>
            {syncingMeta ? 'Syncing...' : '🔄 Sync with Meta Catalog'}
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16 }}>
        {filteredProducts.map(p => (
          <div key={p.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', display: 'flex', flexDirection: 'column', position: 'relative' }} className="card">
            <div style={{ height: 130, background: '#F3F4F6', position: 'relative' }}>
              <img src={p.image_url} alt={p.name.en} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={e => {
                  const fallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100' viewBox='0 0 100 100'><rect width='100%25' height='100%25' fill='%23E6F4EA'/><text x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%23059669'>🌾 Image</text></svg>";
                  if (e.target.src !== fallback) {
                    e.target.src = fallback;
                  }
                }} />
              <div style={{ position: 'absolute', top: 8, left: 8, background: 'rgba(255,255,255,0.9)', width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>
                {p.emoji || '🌾'}
              </div>
              <div style={{ position: 'absolute', top: 8, right: 8, background: '#111827', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 99 }}>
                {p.id}
              </div>
            </div>

            <div style={{ padding: 14, flex: 1, display: 'flex', flexDirection: 'column' }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{p.name.en}</div>
              <div style={{ fontSize: 11.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', minHeight: 34, marginBottom: 8 }}>
                {p.desc.en || 'No description.'}
              </div>
              
              <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#4B5563', marginBottom: 4 }}>
                <span>Unit: <strong>{p.unit || '—'}</strong></span>
                <span>Stock: <strong style={{ color: p.stock > 0 ? '#059669' : '#DC2626' }}>{p.stock}</strong></span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, margin: '8px 0 12px' }}>
                <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', padding: '4px 6px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, opacity: 0.8, fontWeight: 600 }}>MRP Retail</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>₹{typeof p.mrp === 'number' ? p.mrp.toFixed(2) : p.mrp}</div>
                </div>
                <div style={{ background: '#F5F3FF', border: '1px solid #C4B5FD', color: '#6D28D9', padding: '4px 6px', borderRadius: 8, textAlign: 'center' }}>
                  <div style={{ fontSize: 9, opacity: 0.8, fontWeight: 600 }}>Wholesale</div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>₹{typeof p.wholesale === 'number' ? p.wholesale.toFixed(2) : p.wholesale}</div>
                </div>
              </div>

              <button onClick={() => setEditingProduct(p)} style={{ width: '100%', background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151', borderRadius: 8, padding: '7px 0', fontSize: 12.5, fontWeight: 600, marginTop: 'auto' }}>
                ✏️ Edit Product Details
              </button>
            </div>
          </div>
        ))}
      </div>

      {editingProduct && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Edit Product: {editingProduct.id}</h3>
              <button onClick={() => setEditingProduct(null)} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 18 }}>×</button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Product Name (English)</label>
                <input value={editingProduct.name.en} onChange={e => setEditingProduct({ ...editingProduct, name: { ...editingProduct.name, en: e.target.value } })}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Description (English)</label>
                <textarea value={editingProduct.desc.en} onChange={e => setEditingProduct({ ...editingProduct, desc: { ...editingProduct.desc, en: e.target.value } })} rows={2}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13, resize: 'none' }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>MRP Retail (₹)</label>
                  <input type="number" value={editingProduct.mrp} onChange={e => setEditingProduct({ ...editingProduct, mrp: e.target.value })}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Wholesale Price (₹)</label>
                  <input type="number" value={editingProduct.wholesale} onChange={e => setEditingProduct({ ...editingProduct, wholesale: e.target.value })}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Unit Size</label>
                  <input value={editingProduct.unit} onChange={e => setEditingProduct({ ...editingProduct, unit: e.target.value })}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Stock Level</label>
                  <input type="number" value={editingProduct.stock} onChange={e => setEditingProduct({ ...editingProduct, stock: e.target.value })}
                    style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                </div>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Image URL</label>
                <input value={editingProduct.image_url} onChange={e => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setEditingProduct(null)} style={{ background: '#F3F4F6', color: '#4B5563', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>Cancel</button>
              <button onClick={() => handleSaveProduct(editingProduct)} style={{ background: '#059669', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>Save Changes</button>
            </div>
          </div>
        </div>
      )}

      {showSettings && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, background: 'rgba(15,23,42,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: '#fff', borderRadius: 14, width: '100%', maxWidth: 440, padding: 22, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>Meta Product Catalog Settings</h3>
              <button onClick={() => setShowSettings(false)} style={{ background: 'none', border: 'none', color: '#6B7280', fontSize: 18 }}>×</button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Meta Catalog ID</label>
                <input value={catalogIdInput} onChange={e => setCatalogIdInput(e.target.value)} placeholder="e.g. 192840582910482"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Meta Access Token (Optional)</label>
                <input type="password" value={tokenInput} onChange={e => setTokenInput(e.target.value)} placeholder="Leave blank to use server token"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Catalog Brand Name</label>
                <input value={brandInput} onChange={e => setBrandInput(e.target.value)}
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Website Link URL (required by Meta)</label>
                <input value={urlInput} onChange={e => setUrlInput(e.target.value)} placeholder="e.g. https://wa.me/c/917771012123"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4B5563', marginBottom: 4 }}>Broadcast Header Image URL</label>
                <input value={broadcastImageInput} onChange={e => setBroadcastImageInput(e.target.value)} placeholder="https://cdn.shopify.com/... or any public image URL"
                  style={{ width: '100%', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px', fontSize: 13 }} />
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>Used as the header image when sending broadcast templates (e.g. phasal_bazar_shopping)</div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 18 }}>
              <button onClick={() => setShowSettings(false)} style={{ background: '#F3F4F6', color: '#4B5563', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>Close</button>
              <button onClick={handleSyncMeta} disabled={syncingMeta} style={{ background: '#059669', color: '#fff', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600 }}>
                {syncingMeta ? 'Syncing...' : 'Save & Sync Now'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LiveChatView({ api, token, customers, addToast }) {
  const [selectedPhone, setSelectedPhone] = useState("");
  const [chatSearch, setChatSearch] = useState("");
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef(null);

  const fetchMessages = useCallback(async (phone) => {
    if (!phone) return;
    try {
      const r = await fetch(`${api}/admin/chat/${phone}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error();
      const d = await r.json();
      setMessages(d.messages || []);
    } catch { }
  }, [api, token]);

  useEffect(() => {
    if (!selectedPhone) return;
    setLoadingChat(true);
    fetchMessages(selectedPhone).finally(() => setLoadingChat(false));
    
    const timer = setInterval(() => {
      fetchMessages(selectedPhone);
    }, 5000);
    return () => clearInterval(timer);
  }, [selectedPhone, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (textToSend = inputText) => {
    const text = textToSend || inputText;
    if (!text.trim() || !selectedPhone) return;
    setSending(true);
    try {
      const r = await fetch(`${api}/admin/send-message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ to: selectedPhone, text: text.trim() })
      });
      if (!r.ok) throw new Error();
      setInputText("");
      setMessages(prev => [...prev, { sender: 'admin', text: text.trim(), timestamp: Date.now(), type: 'text' }]);
    } catch {
      addToast("Failed to send message", "error");
    } finally {
      setSending(false);
    }
  };

  const filteredChatCusts = customers.filter(c => 
    (c.phone || '').includes(chatSearch) || (c.name || '').toLowerCase().includes(chatSearch.toLowerCase())
  );

  const cannedReplies = [
    "🌾 Namaste! Welcome to Phasal Bazar. Choose options from the main menu.",
    "📦 Your order status is confirmed. We will share delivery updates shortly.",
    "💳 Pls complete UPI payment via this secure link to process your order.",
    "📍 Pls share your full delivery address (Village/Tehsil/Pincode/District) so we can dispatch the order."
  ];

  return (
    <div style={{ display: 'flex', height: 'calc(100vh - 84px)', background: '#fff', borderRadius: 14, border: '1px solid #E6F4EA', overflow: 'hidden' }} className="fade-in">
      {/* Left List */}
      <div style={{ width: 280, borderRight: '1px solid #E5E7EB', display: 'flex', flexDirection: 'column', background: '#F8FAFC' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #E5E7EB' }}>
          <div style={{ position: 'relative' }}>
            <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9CA3AF' }}>🔍</span>
            <input value={chatSearch} onChange={e => setChatSearch(e.target.value)} placeholder="Search chat list..."
              style={{ width: '100%', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px 8px 30px', fontSize: 13, color: '#111827', outline: 'none' }} />
          </div>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {filteredChatCusts.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>No customers found</div>
          ) : (
            filteredChatCusts.map(c => {
              const active = selectedPhone === c.phone;
              return (
                <div key={c.phone} onClick={() => setSelectedPhone(c.phone)} style={{
                  padding: '12px 16px', borderBottom: '1px solid #F3F4F6', cursor: 'pointer',
                  background: active ? '#E6F4EA' : '#fff', borderLeft: active ? '4px solid #059669' : 'none',
                  transition: 'background 0.15s'
                }}>
                  <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{c.name || 'Anonymous User'}</span>
                    <span style={{ fontSize: 10, color: '#6B7280', background: '#F3F4F6', padding: '1px 6px', borderRadius: 4 }}>{c.customerType || 'retail'}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#6B7280', fontFamily: 'monospace' }}>{c.phone}</div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Chat Panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#FAFDFB' }}>
        {selectedPhone ? (
          <>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E7EB', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>
                  {customers.find(c => c.phone === selectedPhone)?.name || 'Anonymous User'}
                </span>
                <span style={{ marginLeft: 8, fontSize: 11, padding: '2px 7px', background: '#E0F2FE', color: '#0369A1', borderRadius: 99, fontWeight: 600 }}>{selectedPhone}</span>
              </div>
              <button onClick={() => fetchMessages(selectedPhone)} style={{ background: '#F3F4F6', color: '#4B5563', borderRadius: 6, padding: '5px 10px', fontSize: 12, fontWeight: 500 }}>
                🔄 Refresh
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column' }}>
              {loadingChat ? (
                <div style={{ margin: 'auto', textAlign: 'center', fontSize: 13, color: '#9CA3AF' }}>Loading message log...</div>
              ) : messages.length === 0 ? (
                <div style={{ margin: 'auto', textAlign: 'center', fontSize: 13, color: '#9CA3AF', maxWidth: 280 }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>💬</div>
                  No active session log. Messages sent or received will appear here.
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div key={idx} style={{
                    display: 'flex', flexDirection: 'column',
                    alignSelf: m.sender === 'user' ? 'flex-start' : 'flex-end',
                    background: m.sender === 'user' ? '#F3F4F6' : m.sender === 'admin' ? '#D1FAE5' : '#E0F2FE',
                    color: m.sender === 'user' ? '#1F2937' : m.sender === 'admin' ? '#065F46' : '#0369A1',
                    borderRadius: 16, borderBottomLeftRadius: m.sender === 'user' ? 4 : 16,
                    borderBottomRightRadius: m.sender !== 'user' ? 4 : 16,
                    padding: '10px 14px', margin: '4px 0', maxWidth: '65%'
                  }}>
                    <div style={{ fontSize: 10, opacity: 0.5, marginBottom: 3, fontWeight: 600, textTransform: 'capitalize' }}>
                      {m.sender}
                    </div>
                    <div style={{ fontSize: 13, whiteSpace: 'pre-wrap' }}>{m.text}</div>
                    <div style={{ fontSize: 9, opacity: 0.4, alignSelf: 'flex-end', marginTop: 4 }}>
                      {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div style={{ padding: '8px 20px', borderTop: '1px solid #E5E7EB', background: '#F8FAFC', display: 'flex', gap: 6, overflowX: 'auto', whiteSpace: 'nowrap' }}>
              {cannedReplies.map((text, idx) => (
                <button key={idx} onClick={() => handleSend(text)} style={{ background: '#fff', border: '1px solid #E5E7EB', color: '#4B5563', borderRadius: 99, padding: '4px 12px', fontSize: 11, fontWeight: 500, flexShrink: 0 }}>
                  ⚡ Canned: {text.substring(0, 22)}...
                </button>
              ))}
            </div>

            <div style={{ padding: '14px 20px', borderTop: '1px solid #E5E7EB', background: '#fff', display: 'flex', gap: 10 }}>
              <input value={inputText} onChange={e => setInputText(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a response to send via WhatsApp..."
                style={{ flex: 1, border: '1px solid #E5E7EB', borderRadius: 8, padding: '10px 12px', fontSize: 13, outline: 'none' }} />
              <button onClick={() => handleSend()} disabled={sending || !inputText.trim()} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 8, padding: '0 20px', fontSize: 13, fontWeight: 600, opacity: (sending || !inputText.trim()) ? 0.6 : 1 }}>
                {sending ? 'Sending...' : 'Send Message'}
              </button>
            </div>
          </>
        ) : (
          <div style={{ margin: 'auto', textAlign: 'center', color: '#9CA3AF' }}>
            <div style={{ fontSize: 44, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#374151' }}>Live Customer Support</div>
            <div style={{ fontSize: 13, marginTop: 4 }}>Select a customer from the left list to start live chat.</div>
          </div>
        )}
      </div>
    </div>
  );
}

function CustomerDrawer({ customer, orders, onClose }) {
  if (!customer) return null;
  const customerOrders = orders.filter(o => o.customerPhone === customer.phone);
  const ltv = customerOrders.filter(o => o.orderStatus !== 'cancelled').reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <>
      <div className="backdrop open" onClick={onClose} style={{ display: 'block' }} />
      <div className="slide-over open" style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>Customer Details</h2>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2, fontFamily: 'monospace' }}>{customer.phone}</div>
          </div>
          <button onClick={onClose} style={{ background: '#F3F4F6', color: '#6B7280', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>×</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#047857', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lifetime Value</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#065F46', marginTop: 4 }}>₹{ltv.toLocaleString('en-IN')}</div>
            </div>
            <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#1E4ED8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Orders</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: '#1E3A8A', marginTop: 4 }}>{customerOrders.length} orders</div>
            </div>
          </div>

          <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6B7280' }}>Contact Name:</span>
              <span style={{ fontWeight: 600, color: '#111827' }}>{customer.name || '—'}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6B7280' }}>Customer Type:</span>
              <CustTypeBadge type={customer.customerType} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6B7280' }}>Preferred Lang:</span>
              <LangBadge lang={customer.lang} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: '#6B7280' }}>Registered On:</span>
              <span style={{ color: '#374151' }}>{fmtDate(customer.createdAt)}</span>
            </div>
            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 10, marginTop: 4 }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 4 }}>Saved Delivery Address</div>
              <div style={{ fontSize: 12.5, color: '#4B5563', lineHeight: 1.5 }}>📍 {customer.address || 'No address saved.'}</div>
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 10 }}>Order History</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {customerOrders.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 24, fontSize: 13, color: '#9CA3AF' }}>No orders placed yet.</div>
              ) : (
                customerOrders.map(o => (
                  <div key={o.orderId} style={{ border: '1px solid #E5E7EB', borderRadius: 10, padding: 12, background: '#fff' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#111827' }}>{o.orderId}</span>
                      <Badge status={o.orderStatus} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6B7280' }}>
                      <span>{fmtShort(o.createdAt)}</span>
                      <span style={{ fontWeight: 700, color: '#111827' }}>₹{o.total} ({o.paymentMethod})</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
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
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F4FAF6', padding: 24 }}>
      <style>{STYLES}</style>
      <div className="fade-in" style={{ background: '#fff', border: '1px solid #E6F4EA', borderRadius: 16, padding: '36px 32px', width: '100%', maxWidth: 380, boxShadow: '0 8px 32px rgba(4,120,87,0.06)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#E6F4EA', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🌾</div>
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
  const [users, setUsers] = useState([])
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [catalogConfig, setCatalogConfig] = useState({ catalogId: '', brand: '', websiteUrl: '', broadcastImageUrl: '' })
  const [stats, setStats] = useState({})
  
  const [activeTab, setActiveTab] = useState('analytics')
  const [ordersStatusFilter, setOrdersStatusFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState(null)
  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [syncTime, setSyncTime] = useState('')
  const [toasts, setToasts] = useState([])
  const prevIds = useRef(new Set())
  const fileInputRef = useRef(null)

  const addToast = useCallback((msg, type = 'success') => {
    setToasts(t => [...t, { id: Date.now() + Math.random(), msg, type }])
  }, [])

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setSyncing(true)
    try {
      const [oRes, sRes, uRes, cRes, configRes] = await Promise.all([
        fetch(`${api}/admin/orders`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${api}/admin/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${api}/admin/users`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${api}/admin/catalog`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${api}/admin/catalog/config`, { headers: { Authorization: `Bearer ${token}` } }),
      ])
      const newOrders = await oRes.json()
      const newStats = await sRes.json()
      const newUsers = await uRes.json()
      const catalogData = await cRes.json()
      const configData = await configRes.json()

      const newPending = newOrders.filter(o => o.orderStatus === 'pending' && !prevIds.current.has(o.orderId))
      if (newPending.length && prevIds.current.size) {
        newPending.forEach(o => addToast(`New order from ${o.customerPhone} — ₹${o.total}`))
        if (Notification.permission === 'granted')
          newPending.forEach(o => new Notification('🌾 New Order', { body: `₹${o.total} from ${o.customerPhone}` }))
      }
      prevIds.current = new Set(newOrders.map(o => o.orderId))
      
      setOrders(newOrders);
      setUsers(newUsers);
      setProducts(catalogData.products || []);
      setCategories(catalogData.categories || []);
      setCatalogConfig(configData || { catalogId: '', brand: '', websiteUrl: '', broadcastImageUrl: '' });
      setStats({ ...newStats, usersCount: newUsers.length });
      setSyncTime(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    } catch { addToast('Failed to load data', 'error') }
    setLoading(false); setSyncing(false)
  }, [api, token, addToast])

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission()
    load()
    const iv = setInterval(() => load(true), 30000)
    return () => clearInterval(iv)
  }, [load])

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

  const exportUsersExcel = () => {
    const rows = users.map(u => ({
      'Phone': u.phone,
      'Name': u.name || '',
      'Address': u.address || '',
      'Customer Type': u.customerType || 'retail',
      'Language': u.lang || 'en',
      'Joined Date': fmtDate(u.createdAt)
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Customers')
    XLSX.writeFile(wb, `phasal-bazar-customers-${new Date().toISOString().split('T')[0]}.xlsx`)
    addToast(`Exported ${rows.length} customers`)
  }

  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet);

        if (rows.length === 0) {
          addToast('File is empty', 'error');
          return;
        }

        const importedUsers = rows.map(row => {
          const phoneKey = Object.keys(row).find(k => /phone|number|contact|mobile/i.test(k));
          const nameKey = Object.keys(row).find(k => /name/i.test(k));
          const addressKey = Object.keys(row).find(k => /address|location/i.test(k));
          const typeKey = Object.keys(row).find(k => /type|role/i.test(k));
          const langKey = Object.keys(row).find(k => /lang|language/i.test(k));

          const rawPhone = phoneKey ? String(row[phoneKey]).trim() : '';
          const cleanedPhone = rawPhone.replace(/\D/g, '');
          
          return {
            phone: cleanedPhone,
            name: nameKey ? String(row[nameKey] || '').trim() : '',
            address: addressKey ? String(row[addressKey] || '').trim() : '',
            customerType: typeKey ? String(row[typeKey] || 'retail').trim().toLowerCase() : 'retail',
            lang: langKey ? String(row[langKey] || 'en').trim().toLowerCase() : 'en',
          };
        }).filter(u => u.phone.length >= 10);

        if (importedUsers.length === 0) {
          addToast('No valid customer records found. Ensure columns contain "phone" or "number".', 'error');
          return;
        }

        const res = await fetch(`${api}/admin/users/import`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ users: importedUsers })
        });
        
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || 'Import failed');

        addToast(`Successfully imported ${json.count} customers!`);
        load(true);
      } catch (err) {
        addToast(err.message || 'Failed to read/import file', 'error');
      } finally {
        e.target.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const filteredOrders = orders
    .filter(o => ordersStatusFilter === 'all' || o.orderStatus === ordersStatusFilter)
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

  const filteredUsers = users.filter(u => {
    if (!search) return true
    const q = search.toLowerCase()
    return (u.phone || '').includes(q) || (u.name || '').toLowerCase().includes(q) || (u.address || '').toLowerCase().includes(q)
  })

  const USER_COLS = ['Phone / WhatsApp', 'Name', 'Delivery Address', 'Type', 'Language', 'Joined Date']
  const USER_GRID = '170px 140px 1fr 110px 90px 140px'

  const NAV_GROUPS = [
    {
      title: "Overview",
      items: [
        { id: 'analytics', icon: '📈', label: 'Analytics', count: null },
      ]
    },
    {
      title: "Store Management",
      items: [
        { id: 'orders', icon: '📋', label: 'All Orders', count: stats.total },
        { id: 'users', icon: '👥', label: 'Customers', count: stats.usersCount },
        { id: 'catalog', icon: '🌾', label: 'Product Catalog', count: null },
      ]
    },
    {
      title: "Marketing & Support",
      items: [
        { id: 'broadcast', icon: '📢', label: 'Broadcast', count: null },
        { id: 'chat', icon: '💬', label: 'Live Support', count: null },
      ]
    }
  ]

  const handleTabChange = (tabId) => {
    setSearch('')
    setActiveTab(tabId)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#FAFDFB' }}>
      <style>{STYLES}</style>

      {/* Toasts */}
      <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 999, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map(t => <Toast key={t.id} msg={t.msg} type={t.type} onClose={() => setToasts(ts => ts.filter(x => x.id !== t.id))} />)}
      </div>

      {selected && <OrderModal order={selected} onClose={() => setSelected(null)} onUpdate={updateOrder} onDelete={deleteOrder} />}
      {selectedCustomer && <CustomerDrawer customer={selectedCustomer} orders={orders} onClose={() => setSelectedCustomer(null)} />}

      {/* ── Sidebar ────────────────────────────────────────────────────────── */}
      <aside style={{ width: 230, flexShrink: 0, background: '#fff', borderRight: '1px solid #E6F4EA', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto' }}>
        {/* Brand */}
        <div style={{ padding: '18px 14px 14px', borderBottom: '1px solid #E6F4EA' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#E6F4EA', border: '1px solid #A7F3D0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>🌾</div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>Phasal Bazar</div>
              <div style={{ fontSize: 11, color: '#047857', fontWeight: 500 }}>WhatsApp Commerce</div>
            </div>
          </div>
        </div>

        {/* Grouped Nav */}
        <nav style={{ padding: '10px 8px', flex: 1 }}>
          {NAV_GROUPS.map((group, groupIdx) => (
            <div key={groupIdx} style={{ marginBottom: 14 }}>
              <div className="nav-group-title">{group.title}</div>
              {group.items.map(item => (
                <div key={item.id} className={`nav-link ${activeTab === item.id ? 'active' : ''}`} onClick={() => handleTabChange(item.id)}>
                  <span style={{ fontSize: 14 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.count !== null && <span style={{
                    fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: activeTab === item.id ? '#10B981' : '#F3F4F6',
                    color: activeTab === item.id ? '#fff' : '#6B7280',
                  }}>{item.count || 0}</span>}
                </div>
              ))}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid #E6F4EA' }}>
          <div className="nav-link" onClick={onLogout} style={{ color: '#DC2626' }}>
            <span>🚪</span> Sign Out
          </div>
        </div>
      </aside>

      {/* ── Main ───────────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'auto' }}>
        {activeTab === 'broadcast' ? (
          <Broadcast api={api} token={token} onBack={() => setActiveTab('analytics')} />
        ) : (
          <div>
            {/* Top bar */}
            <div style={{ background: '#fff', borderBottom: '1px solid #E6F4EA', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, position: 'sticky', top: 0, zIndex: 100 }}>
              <div>
                <h1 style={{ fontSize: 15, fontWeight: 700, color: '#111827', textTransform: 'capitalize' }}>
                  {activeTab === 'chat' ? 'Live Support Chat' : activeTab === 'catalog' ? 'Product Catalog manager' : activeTab === 'users' ? 'Registered Customers' : activeTab}
                </h1>
                <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>
                  {syncing
                    ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><span style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>↻</span> Syncing…</span>
                    : syncTime ? `Last synced ${syncTime}` : 'Loading…'}
                </div>
              </div>

              {activeTab !== 'chat' && activeTab !== 'catalog' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', fontSize: 13, color: '#9CA3AF' }}>🔍</span>
                    <input value={search} onChange={e => setSearch(e.target.value)} placeholder={activeTab === 'users' ? "Search customers…" : "Search orders…"}
                      style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 8, padding: '8px 10px 8px 30px', fontSize: 13, color: '#111827', outline: 'none', width: 200 }}
                      onFocus={e => e.target.style.borderColor = '#059669'}
                      onBlur={e => e.target.style.borderColor = '#E5E7EB'} />
                    {search && <button onClick={() => setSearch('')} style={{ position: 'absolute', right: 7, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#9CA3AF', fontSize: 16, lineHeight: 1 }}>×</button>}
                  </div>
                  {activeTab === 'users' && (
                    <button className="btn" onClick={() => fileInputRef.current?.click()} style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', color: '#047857', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                      ⬆ Import
                      <input type="file" ref={fileInputRef} accept=".csv,.xlsx,.xls" onChange={handleImportFile} style={{ display: 'none' }} />
                    </button>
                  )}
                  {(activeTab === 'orders' || activeTab === 'users') && (
                    <button className="btn" onClick={activeTab === 'users' ? exportUsersExcel : exportExcel} style={{ background: '#E6F4EA', border: '1px solid #A7F3D0', color: '#059669', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600 }}>
                      ⬇ Export
                    </button>
                  )}
                  <button className="btn" onClick={() => load(true)} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', color: '#374151', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontWeight: 600 }}>
                    ↻ Refresh
                  </button>
                </div>
              )}
            </div>

            {/* Content */}
            <div style={{ padding: '20px 24px', flex: 1 }}>
              {loading ? (
                <div>
                  {Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} style={{
                      height: 54, margin: '10px 0', borderBottom: '1px solid #F3F4F6', borderRadius: 10,
                      background: 'linear-gradient(90deg, #f4f4f4 25%, #fafafa 50%, #f4f4f4 75%)',
                      backgroundSize: '600px 100%',
                      animation: `shimmer 1.3s infinite`,
                      animationDelay: `${i * 0.06}s`,
                    }} />
                  ))}
                </div>
              ) : (
                <>
                  {activeTab === 'analytics' && (
                    <AnalyticsView orders={orders} users={users} stats={stats} todayRevenue={todayRevenue} />
                  )}

                  {activeTab === 'catalog' && (
                    <ProductCatalogView api={api} token={token} products={products} categories={categories} onLoad={load} addToast={addToast} catalogConfig={catalogConfig} />
                  )}

                  {activeTab === 'chat' && (
                    <LiveChatView api={api} token={token} customers={users} addToast={addToast} />
                  )}

                  {activeTab === 'users' && (
                    /* Users Table Card */
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(4,120,87,0.01)' }} className="fade-in">
                      <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                          {`${filteredUsers.length} ${filteredUsers.length === 1 ? 'customer' : 'customers'}`}
                          {search && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> matching "{search}"</span>}
                        </div>
                      </div>

                      {filteredUsers.length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: USER_GRID, padding: '0 20px', height: 38, alignItems: 'center', gap: 10, background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                          {USER_COLS.map(c => <div key={c} style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{c}</div>)}
                        </div>
                      )}

                      {filteredUsers.length === 0 ? (
                        <div style={{ padding: '70px 20px', textAlign: 'center' }}>
                          <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.18 }}>👥</div>
                          <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 5 }}>No customers found</div>
                          <div style={{ fontSize: 13, color: '#9CA3AF' }}>Try adjusting your search criteria</div>
                        </div>
                      ) : (
                        filteredUsers.map((u, i) => (
                          <div key={u.phone} className="row-hover" onClick={() => setSelectedCustomer(u)} style={{
                            display: 'grid', gridTemplateColumns: USER_GRID, padding: '0 20px', height: 54,
                            alignItems: 'center', gap: 10, borderBottom: i < filteredUsers.length - 1 ? '1px solid #F3F4F6' : 'none',
                            background: '#fff', transition: 'background 0.1s', cursor: 'pointer'
                          }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{u.phone}</div>
                              <div style={{ marginTop: 2 }} onClick={e => e.stopPropagation()}>
                                <a href={`https://wa.me/${u.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11, fontWeight: 600, color: '#059669', textDecoration: 'none', background: '#ECFDF5', padding: '2px 8px', borderRadius: 99 }}>
                                  💬 WhatsApp
                                </a>
                              </div>
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{u.name || '—'}</div>
                            <div style={{ fontSize: 12.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={u.address}>
                              {u.address ? `📍 ${u.address}` : '—'}
                            </div>
                            <div>
                              <CustTypeBadge type={u.customerType} />
                            </div>
                            <div>
                              <LangBadge lang={u.lang} />
                            </div>
                            <div style={{ fontSize: 12, color: '#6B7280' }}>
                              {fmtShort(u.createdAt)}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {activeTab === 'orders' && (
                    /* Orders View */
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      {/* Orders Toolbar / Filter Pills */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '10px 16px' }}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          {['all', 'pending', 'confirmed', 'delivered', 'cancelled'].map(status => {
                            const active = ordersStatusFilter === status;
                            return (
                              <button key={status} onClick={() => setOrdersStatusFilter(status)} style={{
                                textTransform: 'capitalize', fontSize: 13, fontWeight: 600, padding: '6px 12px', borderRadius: 8,
                                background: active ? '#D1FAE5' : 'transparent',
                                color: active ? '#065F46' : '#4B5563',
                              }}>
                                {status}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ fontSize: 13, color: '#6B7280' }}>
                          Filtered Value: <strong style={{ color: '#059669' }}>
                            ₹{filteredOrders.filter(o => o.orderStatus !== 'cancelled').reduce((s, o) => s + (Number(o.total) || 0), 0).toLocaleString('en-IN')}
                          </strong>
                        </div>
                      </div>

                      {/* Table card */}
                      <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 20px rgba(4,120,87,0.01)' }}>
                        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>
                            {`${filteredOrders.length} ${filteredOrders.length === 1 ? 'order' : 'orders'}`}
                            {search && <span style={{ color: '#9CA3AF', fontWeight: 400 }}> matching "{search}"</span>}
                          </div>
                        </div>

                        {filteredOrders.length > 0 && (
                          <div style={{ display: 'grid', gridTemplateColumns: GRID, padding: '0 20px', height: 38, alignItems: 'center', gap: 10, background: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                            {COLS.map(c => <div key={c} style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{c}</div>)}
                          </div>
                        )}

                        {filteredOrders.length === 0 ? (
                          <div style={{ padding: '70px 20px', textAlign: 'center' }}>
                            <div style={{ fontSize: 44, marginBottom: 12, opacity: 0.18 }}>📭</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 5 }}>No orders found</div>
                            <div style={{ fontSize: 13, color: '#9CA3AF' }}>Try adjusting your filters or search</div>
                          </div>
                        ) : (
                          filteredOrders.map((order, i) => {
                            const items = parseItems(order.items)
                            const summary = items.length ? items.slice(0, 2).map(it => it.name).join(', ') + (items.length > 2 ? ` +${items.length - 2} more` : '') : '—'
                            return (
                              <div key={order.orderId} className="row-hover" onClick={() => setSelected(order)} style={{
                                display: 'grid', gridTemplateColumns: GRID, padding: '0 20px', height: 54,
                                alignItems: 'center', gap: 10, borderBottom: i < filteredOrders.length - 1 ? '1px solid #F3F4F6' : 'none',
                                cursor: 'pointer', background: '#fff', transition: 'background 0.1s',
                                opacity: order.orderStatus === 'cancelled' ? 0.55 : 1,
                              }}>
                                <div style={{ fontFamily: 'monospace', fontSize: 11, fontWeight: 500, color: '#374151' }}>{order.orderId}</div>
                                <div>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{order.customerPhone}</div>
                                  {order.customerName && <div style={{ fontSize: 11, color: '#9CA3AF' }}>{order.customerName}</div>}
                                </div>
                                <div style={{ fontSize: 12.5, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{summary}</div>
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
                  )}
                </>
              )}
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