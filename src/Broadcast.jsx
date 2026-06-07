import { useState, useEffect, useRef } from 'react'
import BroadcastTemplates from './BroadcastTemplates'

/* ─── Shared design tokens (matches App.jsx) ────────────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
body { background:#F8FAFC; color:#0F172A; font-family:'DM Sans',sans-serif; font-size:14px; }
input, button, select, textarea { font-family:inherit; font-size:14px; }
button { cursor:pointer; }
::-webkit-scrollbar { width:5px; }
::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:99px; }
input::placeholder, textarea::placeholder { color:#94A3B8; }
@keyframes fadeIn    { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes slideRight{ from{opacity:0;transform:translateX(24px)} to{opacity:1;transform:none} }
@keyframes spin      { to{transform:rotate(360deg)} }
@keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.4} }
`

/* ─── WhatsApp phone preview ────────────────────────────────────────────── */
function PhonePreview({ text }) {
  const now = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const html = text
    ? text.replace(/\*(.*?)\*/g, '<b>$1</b>').replace(/\n/g, '<br/>')
    : ''

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{
        width: 240, background: '#fff', borderRadius: 32,
        border: '7px solid #1C1C1E',
        boxShadow: '0 16px 48px rgba(0,0,0,.15), 0 0 0 1px rgba(0,0,0,.08)',
        overflow: 'hidden',
        fontFamily: "'Helvetica Neue', Arial, sans-serif",
      }}>
        <div style={{ background: '#128C7E', padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#25D366',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13 }}>🌾</div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 11 }}>Phasal Bazar</div>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: 9 }}>Business Account</div>
          </div>
        </div>
        <div style={{
          background: '#ECE5DD', minHeight: 200, padding: '10px 8px',
          display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        }}>
          {text ? (
            <div style={{ alignSelf: 'flex-start', maxWidth: '88%' }}>
              <div style={{
                background: '#fff', borderRadius: '0 8px 8px 8px',
                padding: '7px 9px', fontSize: 11, lineHeight: 1.6, color: '#111',
                boxShadow: '0 1px 2px rgba(0,0,0,.1)', borderLeft: '3px solid #25D366',
              }}
                dangerouslySetInnerHTML={{ __html: html }}
              />
              <div style={{ fontSize: 9, color: '#999', textAlign: 'right', marginTop: 2 }}>
                {now} ✓✓
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', color: '#bbb', fontSize: 10, padding: '20px 0' }}>
              Preview appears here
            </div>
          )}
        </div>
        <div style={{ background: '#F0F0F0', padding: '6px 8px', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '5px 10px',
            fontSize: 10, color: '#aaa' }}>Type a message</div>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#25D366',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>🎤</div>
        </div>
      </div>
    </div>
  )
}

/* ─── Section label ─────────────────────────────────────────────────────── */
function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8',
      textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>
      {children}
    </div>
  )
}

/* ─── Button ────────────────────────────────────────────────────────────── */
function Btn({ children, onClick, disabled, variant = 'outline', style: extra = {} }) {
  const base = {
    outline: { background: '#fff', color: '#374151', border: '1px solid #E2E8F0', boxShadow: '0 1px 2px rgba(0,0,0,.04)' },
    primary: { background: '#16A34A', color: '#fff', border: 'none', boxShadow: '0 1px 4px rgba(22,163,74,.25)' },
    danger:  { background: '#fff', color: '#DC2626', border: '1px solid #FECACA' },
    ghost:   { background: 'transparent', color: '#64748B', border: 'none' },
  }[variant]

  return (
    <button onClick={onClick} disabled={disabled}
      style={{ ...base, borderRadius: 8, padding: '7px 14px', fontWeight: 600, fontSize: 13,
        display: 'inline-flex', alignItems: 'center', gap: 5,
        opacity: disabled ? .55 : 1, transition: 'opacity .15s, background .15s', ...extra }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.opacity = '.85' }}
      onMouseLeave={e => { if (!disabled) e.currentTarget.style.opacity = '1' }}>
      {children}
    </button>
  )
}

/* ─── Template Drawer ───────────────────────────────────────────────────── */
function TemplateDrawer({ onSelect, onClose }) {
  return (
    <>
      <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.3)',
        zIndex: 400, backdropFilter: 'blur(2px)' }} />
      <div style={{
        position: 'fixed', right: 0, top: 0, bottom: 0, width: '92vw', maxWidth: 1100,
        background: '#F8FAFC', zIndex: 401, overflowY: 'auto',
        boxShadow: '-4px 0 40px rgba(0,0,0,.12)', animation: 'slideRight .22s ease',
      }}>
        <div style={{ position: 'sticky', top: 0, zIndex: 10, background: '#fff',
          borderBottom: '1px solid #E2E8F0', padding: '12px 20px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0F172A' }}>Choose a Template</div>
          <button onClick={onClose} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8,
            width: 32, height: 32, fontSize: 18, color: '#64748B',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <BroadcastTemplates onSelect={tpl => { onSelect(tpl); onClose() }} />
      </div>
    </>
  )
}

/* ─── Main Broadcast Component ──────────────────────────────────────────── */
export default function Broadcast({ api, token, onBack }) {
  const [message,       setMessage]       = useState('')
  const [useTemplate,   setUseTemplate]   = useState(false)
  const [templateName,  setTemplateName]  = useState('phasal_bazar_shopping')
  const [busy,          setBusy]          = useState(false)

  const toggleUseTemplate = (checked) => {
    setUseTemplate(checked)
    if (checked) {
      setMessage('Shop fresh farm products — Millets, Oils, Dals and more! Pure • Natural • Desi 🌾')
    } else {
      setMessage('')
    }
  }
  const [result,        setResult]        = useState(null)
  const [error,         setError]         = useState('')
  const [users,         setUsers]         = useState([])
  const [loadingUsers,  setLoadingUsers]  = useState(true)
  const [selected,      setSelected]      = useState([])
  const [selectAll,     setSelectAll]     = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)
  const [search,        setSearch]        = useState('')
  const [copied,        setCopied]        = useState(false)
  const [varValues,     setVarValues]     = useState({})
  const [manualPhones,  setManualPhones]  = useState([])   // manually added numbers
  const [addInput,      setAddInput]      = useState('')    // phone input field
  const [addName,       setAddName]       = useState('')    // optional name
  const [addError,      setAddError]      = useState('')    // inline validation
  const textRef  = useRef(null)
  const addRef   = useRef(null)

  // Variables filled per-phone automatically
  const PER_PHONE_VARS = new Set(['customer_name', 'phone'])
  const AUTO_DEFAULTS  = { shop_name: 'Phasal Bazar' }

  // Detect all {{variables}} in message that need global values
  const detectedVars = [...new Set(
    (message.match(/{{\s*([a-zA-Z0-9_]+)\s*}}/g) || [])
      .map(m => m.replace(/{{\s*|\s*}}/g, ''))
      .filter(k => !PER_PHONE_VARS.has(k))
  )]

  // Merge auto-defaults with user-entered values inline (no useEffect race condition)
  const effectiveVars  = { ...AUTO_DEFAULTS, ...varValues }
  const missingVars    = detectedVars.filter(k => !effectiveVars[k]?.trim())

  /* fetch unique customers from orders and users list */
  useEffect(() => {
    const fetchUsers = async () => {
      setLoadingUsers(true)
      try {
        const [ordersRes, usersRes] = await Promise.all([
          fetch(`${api}/admin/orders`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${api}/admin/users`, {
            headers: { Authorization: `Bearer ${token}` },
          }).catch(() => null)
        ])
        
        const orders = await ordersRes.json()
        const usersList = usersRes ? await usersRes.json() : []
        const map = new Map()

        if (Array.isArray(usersList)) {
          usersList.forEach(u => {
            if (u.phone) {
              map.set(u.phone, { name: u.name || '', phone: u.phone, updatedAt: u.updatedAt || u.updated_at || null })
            }
          })
        }

        if (Array.isArray(orders)) {
          orders.forEach(o => {
            if (o.customerPhone && !map.has(o.customerPhone)) {
              map.set(o.customerPhone, { name: o.customerName || '', phone: o.customerPhone, updatedAt: null })
            }
          })
        }

        setUsers(Array.from(map.values()))
      } catch {
        setUsers([])
      }
      setLoadingUsers(false)
    }
    fetchUsers()
  }, [api, token])

  /* keep selected in sync when selectAll is toggled */
  useEffect(() => {
    if (selectAll) setSelected([...users, ...manualPhones].map(u => u.phone))
  }, [selectAll, users])

  const toggleUser = phone => {
    setSelected(sel => sel.includes(phone) ? sel.filter(p => p !== phone) : [...sel, phone])
    setSelectAll(false)
  }

  const toggleAll = checked => {
    setSelectAll(checked)
    setSelected(checked ? allUsers.map(u => u.phone) : [])
  }

  // Merged list: existing customers + manually added numbers
  const allUsers = [
    ...users,
    ...manualPhones.filter(m => !users.some(u => u.phone === m.phone)),
  ]

  const get24hWindowStatus = (user) => {
    if (!user || !user.updatedAt) return { status: 'expired', label: 'Expired (24h Window)', color: '#DC2626', bg: '#FEE2E2' };
    const lastInteraction = new Date(user.updatedAt);
    const diffMs = Date.now() - lastInteraction.getTime();
    const isWithin24h = diffMs < 24 * 60 * 60 * 1000;
    if (isWithin24h) {
      const remainingMs = 24 * 60 * 60 * 1000 - diffMs;
      const hours = Math.floor(remainingMs / (60 * 60 * 1000));
      const minutes = Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000));
      let timeStr = '';
      if (hours > 0) timeStr += `${hours}h `;
      timeStr += `${minutes}m left`;
      return { status: 'active', label: `Active (${timeStr})`, color: '#16A34A', bg: '#DCFCE7' };
    }
    return { status: 'expired', label: 'Expired (24h Window)', color: '#DC2626', bg: '#FEE2E2' };
  }

  // Check if any selected recipient has an expired 24h window
  const selectedUsers = selectAll ? allUsers : allUsers.filter(u => selected.includes(u.phone))
  const hasExpiredSelection = selectedUsers.some(u => {
    if (u.manual) return true; // manual numbers don't have active database interaction logs
    const win = get24hWindowStatus(u);
    return win.status === 'expired';
  })

  // Validate and add a phone number manually
  const addPhone = () => {
    setAddError('')
    const raw = addInput.replace(/\s/g, '')
    if (!raw) { setAddError('Enter a phone number'); return }
    // Accept with or without country code; normalize to digits only
    const digits = raw.replace(/\D/g, '')
    if (digits.length < 10 || digits.length > 13) {
      setAddError('Enter a valid 10–13 digit number (e.g. 917000082359)')
      return
    }
    if (allUsers.some(u => u.phone === digits)) {
      setAddError('This number is already in the list')
      return
    }
    const entry = { phone: digits, name: addName.trim() || '', manual: true }
    setManualPhones(m => [...m, entry])
    // Auto-select the new number
    setSelected(sel => [...sel, digits])
    setSelectAll(false)
    setAddInput('')
    setAddName('')
    addRef.current?.focus()
  }

  const removeManual = (phone) => {
    setManualPhones(m => m.filter(x => x.phone !== phone))
    setSelected(sel => sel.filter(p => p !== phone))
  }

  const sendBroadcast = async () => {
    setError(''); setResult(null)
    if (!message.trim())                     { setError('Message cannot be empty.');       return }
    if (!selectAll && selected.length === 0) { setError('Select at least one recipient.'); return }
    if (missingVars.length > 0)              { setError(`Fill in values for: ${missingVars.join(', ')}`); return }
    setBusy(true)

    const activeUsers = selectAll ? allUsers : allUsers.filter(u => selected.includes(u.phone))
    const phones      = activeUsers.map(u => u.phone)

    // Build per-phone data:
    // - customer_name → from users list
    // - phone         → the phone number itself
    // - everything else → from varValues (global inputs filled by admin)
    // effectiveVars = AUTO_DEFAULTS merged with admin-entered values (computed inline, no race condition)
    const data = {}
    activeUsers.forEach(u => {
      data[u.phone] = {
        ...effectiveVars,                       // shop_name, link, offer, etc.
        customer_name: u.name || 'Customer',    // per-customer name
        phone:         u.phone,
      }
    })

    try {
      const res = await fetch(`${api}/admin/broadcast`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ template: message, phones, data, useTemplate, templateName }),
      })

      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Broadcast failed')

      const sentCount = typeof json.sent   === 'number' ? json.sent   : phones.length
      const failCount = typeof json.failed === 'number' ? json.failed : 0
      setResult(
        failCount > 0
          ? `Sent to ${sentCount} customers. ${failCount} failed.`
          : `Broadcast sent to ${sentCount} customer${sentCount !== 1 ? 's' : ''}!`
      )
      setMessage('')
      setUseTemplate(false)
      setVarValues({})
    } catch (e) {
      setError(e.message || 'Failed to send broadcast.')
    }
    setBusy(false)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(message).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const filteredUsers  = search
    ? allUsers.filter(u => u.phone.includes(search) || u.name.toLowerCase().includes(search.toLowerCase()))
    : allUsers

  const chars          = message.length
  const recipientCount = selectAll ? allUsers.length : selected.length

  /* ── render ── */
  return (
    <div style={{ minHeight: '100vh', background: '#F8FAFC' }}>
      <style>{G}</style>

      {showTemplates && (
        <TemplateDrawer
          onSelect={tpl => {
            setMessage(tpl.body)
            if (tpl.id !== 'custom') {
              setUseTemplate(true)
              setTemplateName(tpl.name)
            } else {
              setUseTemplate(false)
            }
            // Pre-seed known auto-defaults immediately (no useEffect timing issue)
            setVarValues(v => ({ shop_name: 'Phasal Bazar', ...v }))
          }}
          onClose={() => setShowTemplates(false)}
        />
      )}

      {/* ── Topbar ──────────────────────────────────────────────────────── */}
      <header style={{
        background: '#fff', borderBottom: '1px solid #E2E8F0', height: 58,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 28px', position: 'sticky', top: 0, zIndex: 200,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button onClick={onBack} style={{ background: '#F1F5F9', border: 'none', borderRadius: 8,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, color: '#64748B' }}>←</button>
          <div style={{ width: 1, height: 28, background: '#E2E8F0' }} />
          <div style={{ width: 34, height: 34, background: '#16A34A', borderRadius: 9,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17 }}>📢</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', lineHeight: 1.2 }}>Broadcast</div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500 }}>Send WhatsApp message to customers</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={handleCopy} disabled={!message}>
            {copied ? '✓ Copied' : '📋 Copy'}
          </Btn>
          <Btn onClick={() => setShowTemplates(true)}>📄 Templates</Btn>
          <Btn variant="primary" onClick={sendBroadcast}
            disabled={busy || !message.trim() || recipientCount === 0 || missingVars.length > 0}
            style={{ minWidth: 140 }}>
            {busy
              ? <><span style={{ display: 'inline-block', animation: 'spin .7s linear infinite' }}>↻</span> Sending…</>
              : `📤 Send to ${recipientCount}`
            }
          </Btn>
        </div>
      </header>

      {/* ── Body ────────────────────────────────────────────────────────── */}
      <main style={{
        maxWidth: 1100, margin: '0 auto', padding: '28px 24px 60px',
        display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20,
        animation: 'fadeIn .3s ease',
      }}>

        {/* ── LEFT ────────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* WhatsApp API Policy Note */}
          <div style={{
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 12,
            padding: '12px 16px',
            display: 'flex',
            gap: 12,
            alignItems: 'flex-start',
            boxShadow: '0 1px 2px rgba(30,58,138,0.02)',
            animation: 'fadeIn .3s ease'
          }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>💡</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13, color: '#1E3A8A', marginBottom: 2 }}>WhatsApp Policy Notice</div>
              <div style={{ fontSize: 12.5, color: '#1D4ED8', lineHeight: 1.5 }}>
                To contact a customer who hasn't messaged you in the last 24 hours, you <strong>must</strong> send a Meta-approved template message. Once the customer replies, a 24-hour session window opens during which you can send regular custom messages.
              </div>
            </div>
          </div>

          {/* Composer */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
            padding: '22px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <SectionLabel>Message</SectionLabel>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontFamily: 'DM Mono,monospace', fontSize: 11,
                  color: chars > 1000 ? '#EF4444' : '#94A3B8' }}>{chars} chars</span>
                <Btn onClick={() => setShowTemplates(true)}>📄 Use Template</Btn>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 16, padding: '12px 14px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontWeight: 600, fontSize: 13, userSelect: 'none' }}>
                <input
                  type="checkbox"
                  checked={useTemplate}
                  onChange={e => toggleUseTemplate(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: '#16A34A', cursor: 'pointer' }}
                />
                Send as WhatsApp Approved Template
              </label>
              {useTemplate && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 200 }}>
                  <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>Template Name:</span>
                  <input
                    type="text"
                    value={templateName}
                    onChange={e => setTemplateName(e.target.value)}
                    style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 6, padding: '4px 8px', fontSize: 13, outline: 'none', background: '#fff' }}
                  />
                </div>
              )}
            </div>

            <textarea
              ref={textRef}
              value={message}
              onChange={e => { setMessage(e.target.value); setError(''); setResult(null) }}
              placeholder={"Type your broadcast message here…\n\nTip: Use *asterisks* for bold text in WhatsApp.\nExample: *Phasal Bazar* — ताज़ा सब्ज़ियां!"}
              rows={12}
              disabled={busy || useTemplate}
              style={{
                width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 10,
                padding: '13px 15px', color: '#0F172A', outline: 'none',
                resize: 'vertical', lineHeight: 1.8, fontSize: 14, background: useTemplate ? '#F1F5F9' : '#F8FAFC',
                transition: 'border-color .15s', minHeight: 220,
              }}
              onFocus={e => e.target.style.borderColor = '#16A34A'}
              onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
            />

            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12 }}>
              {[['*bold*','Bold'],['_italic_','Italic'],['🌾 emoji','Emoji']].map(([eg, label]) => (
                <div key={label} style={{ background: '#F8FAFC', border: '1px solid #E2E8F0',
                  borderRadius: 6, padding: '4px 10px', fontSize: 11, display: 'flex', gap: 6 }}>
                  <span style={{ fontFamily: 'DM Mono,monospace', color: '#16A34A' }}>{eg}</span>
                  <span style={{ color: '#94A3B8' }}>{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Variable values panel — only shown when message has {{vars}} */}
          {detectedVars.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
              padding: '18px 24px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <SectionLabel>Variable Values</SectionLabel>
                <span style={{ fontSize: 11, color: '#94A3B8' }}>
                  These replace <span style={{ fontFamily: 'DM Mono,monospace', color: '#16A34A' }}>{'{{variables}}'}</span> in your message
                </span>
              </div>

              {/* customer_name info row */}
              {message.includes('{{customer_name}}') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                  background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 14 }}>👤</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>customer_name</div>
                    <div style={{ fontSize: 11, color: '#16A34A' }}>Auto-filled from each customer's name in your order list</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                    background: '#D1FAE5', color: '#065F46', borderRadius: 99, padding: '2px 8px' }}>Auto ✓</span>
                </div>
              )}
              {message.includes('{{phone}}') && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10,
                  background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, padding: '8px 12px' }}>
                  <span style={{ fontSize: 14 }}>📱</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#065F46' }}>phone</div>
                    <div style={{ fontSize: 11, color: '#16A34A' }}>Auto-filled with each customer's phone number</div>
                  </div>
                  <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                    background: '#D1FAE5', color: '#065F46', borderRadius: 99, padding: '2px 8px' }}>Auto ✓</span>
                </div>
              )}

              {/* Input fields for global vars */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 10 }}>
                {detectedVars.map(key => {
                  // effectiveVars = AUTO_DEFAULTS + user overrides — so shop_name shows "Phasal Bazar" by default
                  const val    = varValues[key] ?? effectiveVars[key] ?? ''
                  const filled = val.trim().length > 0 || (effectiveVars[key] ?? '').trim().length > 0
                  return (
                    <div key={key}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <label style={{ fontFamily: 'DM Mono,monospace', fontSize: 11, fontWeight: 600,
                          color: filled ? '#16A34A' : '#F59E0B' }}>
                          {`{{${key}}}`}
                        </label>
                        {!filled && (
                          <span style={{ fontSize: 10, color: '#F59E0B', fontWeight: 600 }}>Required</span>
                        )}
                      </div>
                      <input
                        value={val}
                        onChange={e => setVarValues(v => ({ ...AUTO_DEFAULTS, ...v, [key]: e.target.value }))}
                        placeholder={key === 'shop_name' ? 'Phasal Bazar' : key === 'link' ? 'https://wa.me/c/...' : key === 'offer' ? 'e.g. 10% off today' : key === 'delivery_date' ? 'Today by 6 PM' : `Enter ${key}…`}
                        style={{
                          width: '100%', border: `1.5px solid ${filled ? '#BBF7D0' : '#FDE68A'}`,
                          borderRadius: 8, padding: '8px 11px', fontSize: 13, color: '#0F172A',
                          outline: 'none', background: filled ? '#F0FDF4' : '#FFFBEB',
                          transition: 'border-color .15s',
                        }}
                        onFocus={e => e.target.style.borderColor = '#16A34A'}
                        onBlur={e  => e.target.style.borderColor = filled ? '#BBF7D0' : '#FDE68A'}
                      />
                    </div>
                  )
                })}
              </div>

              {missingVars.length > 0 && (
                <div style={{ marginTop: 10, fontSize: 12, color: '#92400E', fontWeight: 500,
                  background: '#FEF3C7', borderRadius: 7, padding: '7px 11px',
                  display: 'flex', alignItems: 'center', gap: 6 }}>
                  ⚠️ Fill in: <span style={{ fontFamily: 'DM Mono,monospace' }}>{missingVars.map(k => `{{${k}}}`).join(', ')}</span>
                </div>
              )}
            </div>
          )}

          {/* Status banners */}
          {hasExpiredSelection && !useTemplate && recipientCount > 0 && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 10,
              padding: '12px 16px', display: 'flex', gap: 10, alignItems: 'flex-start',
              color: '#B45309', fontSize: 13, fontWeight: 500, lineHeight: 1.5, animation: 'fadeIn .25s ease', marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>⚠️</span>
              <div>
                <strong style={{ display: 'block', marginBottom: 2, color: '#92400E' }}>24-Hour Window Warning</strong>
                You have selected recipient(s) whose 24-hour customer window is closed. 
                WhatsApp will block delivery of plain text messages to these users.
                <div style={{ marginTop: 6, fontWeight: 600, color: '#92400E' }}>
                  💡 To fix this: Check <strong>"Send as WhatsApp Approved Template"</strong> above.
                </div>
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              color: '#991B1B', fontSize: 13, fontWeight: 500 }}>
              <span>⚠️</span> {error}
            </div>
          )}
          {result && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10,
              padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10,
              color: '#065F46', fontSize: 13, fontWeight: 600 }}>
              <span>✅</span> {result}
            </div>
          )}

          {/* Recipients */}
          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
            overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>

            <div style={{ padding: '14px 20px', borderBottom: '1px solid #F1F5F9',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: '#F8FAFC' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <SectionLabel>Recipients</SectionLabel>
                <span style={{ background: '#E2E8F0', color: '#374151', borderRadius: 99,
                  padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                  {users.length} customers
                </span>
                {manualPhones.length > 0 && (
                  <span style={{ background: '#EDE9FE', color: '#6D28D9', borderRadius: 99,
                    padding: '2px 9px', fontSize: 11, fontWeight: 700 }}>
                    +{manualPhones.length} added
                  </span>
                )}
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8,
                cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#0F172A' }}>
                <div onClick={() => toggleAll(!selectAll)}
                  style={{ width: 18, height: 18, borderRadius: 5,
                    border: `2px solid ${selectAll ? '#16A34A' : '#CBD5E1'}`,
                    background: selectAll ? '#16A34A' : '#fff',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s', cursor: 'pointer', flexShrink: 0 }}>
                  {selectAll && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700, lineHeight: 1 }}>✓</span>}
                </div>
                Send to All
              </label>
            </div>

            {/* Add phone number manually */}
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F1F5F9', background: '#FAFAFA' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase',
                letterSpacing: '.6px', marginBottom: 8 }}>Add Number Manually</div>
              <div style={{ display: 'flex', gap: 7 }}>
                <input
                  ref={addRef}
                  value={addInput}
                  onChange={e => { setAddInput(e.target.value); setAddError('') }}
                  onKeyDown={e => e.key === 'Enter' && addPhone()}
                  placeholder="Phone with country code (e.g. 917000082359)"
                  style={{ flex: 2, border: `1.5px solid ${addError ? '#FCA5A5' : '#E2E8F0'}`,
                    borderRadius: 8, padding: '8px 11px', color: '#0F172A', outline: 'none',
                    background: '#fff', fontSize: 13, fontFamily: 'DM Mono,monospace' }}
                  onFocus={e => e.target.style.borderColor = '#16A34A'}
                  onBlur={e  => e.target.style.borderColor = addError ? '#FCA5A5' : '#E2E8F0'}
                />
                <input
                  value={addName}
                  onChange={e => setAddName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && addPhone()}
                  placeholder="Name (optional)"
                  style={{ flex: 1, border: '1.5px solid #E2E8F0', borderRadius: 8,
                    padding: '8px 11px', color: '#0F172A', outline: 'none',
                    background: '#fff', fontSize: 13 }}
                  onFocus={e => e.target.style.borderColor = '#16A34A'}
                  onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
                />
                <button onClick={addPhone}
                  style={{ background: '#16A34A', color: '#fff', border: 'none', borderRadius: 8,
                    padding: '8px 16px', fontWeight: 700, fontSize: 13, flexShrink: 0,
                    boxShadow: '0 1px 4px rgba(22,163,74,.25)', whiteSpace: 'nowrap' }}>
                  + Add
                </button>
              </div>
              {addError && (
                <div style={{ color: '#DC2626', fontSize: 11, fontWeight: 500, marginTop: 5,
                  display: 'flex', alignItems: 'center', gap: 4 }}>
                  ⚠️ {addError}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 5 }}>
                Include country code · Press Enter or click Add · Number gets auto-selected
              </div>
            </div>

            {!selectAll && (
              <div style={{ padding: '10px 16px', borderBottom: '1px solid #F1F5F9', position: 'relative' }}>
                <span style={{ position: 'absolute', left: 28, top: '50%', transform: 'translateY(-50%)',
                  fontSize: 13, color: '#94A3B8', pointerEvents: 'none' }}>🔍</span>
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search by phone or name…"
                  style={{ width: '100%', border: '1.5px solid #E2E8F0', borderRadius: 8,
                    padding: '7px 12px 7px 32px', color: '#0F172A', outline: 'none', background: '#F8FAFC' }}
                  onFocus={e => e.target.style.borderColor = '#16A34A'}
                  onBlur={e  => e.target.style.borderColor = '#E2E8F0'}
                />
              </div>
            )}

            <div style={{ maxHeight: 280, overflowY: 'auto' }}>
              {loadingUsers ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94A3B8' }}>
                  <div style={{ fontSize: 20, animation: 'spin 1s linear infinite', display: 'inline-block', marginBottom: 8 }}>↻</div>
                  <p style={{ fontSize: 13 }}>Loading customers…</p>
                </div>
              ) : filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 20px', color: '#94A3B8', fontSize: 13 }}>
                  No customers found
                </div>
              ) : (
                filteredUsers.map((u, i) => {
                  const isChecked = selectAll || selected.includes(u.phone)
                  return (
                    <div key={u.phone}
                      onClick={() => !busy && toggleUser(u.phone)}
                      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 20px',
                        borderBottom: i < filteredUsers.length - 1 ? '1px solid #F8FAFC' : 'none',
                        cursor: busy ? 'default' : 'pointer',
                        background: isChecked ? '#F0FDF4' : 'transparent', transition: 'background .1s' }}
                      onMouseEnter={e => { if (!isChecked) e.currentTarget.style.background = '#F8FAFC' }}
                      onMouseLeave={e => { if (!isChecked) e.currentTarget.style.background = isChecked ? '#F0FDF4' : 'transparent' }}>

                      <div style={{ width: 17, height: 17, borderRadius: 5, flexShrink: 0,
                        border: `2px solid ${isChecked ? '#16A34A' : '#CBD5E1'}`,
                        background: isChecked ? '#16A34A' : '#fff',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}>
                        {isChecked && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
                      </div>

                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#D1FAE5',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 13, flexShrink: 0, color: '#065F46', fontWeight: 700 }}>
                        {(u.name || u.phone).charAt(0).toUpperCase()}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        {u.name && (
                          <div style={{ fontWeight: 600, fontSize: 13, color: '#0F172A',
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {u.name}
                          </div>
                        )}
                        <div style={{ fontFamily: 'DM Mono,monospace', fontSize: 12,
                          color: u.name ? '#64748B' : '#0F172A' }}>{u.phone}</div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {u.manual && (
                          <button
                            onClick={e => { e.stopPropagation(); removeManual(u.phone) }}
                            title="Remove this number"
                            style={{ background: '#FEE2E2', border: 'none', borderRadius: 99,
                              width: 20, height: 20, fontSize: 11, color: '#DC2626',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontWeight: 700, flexShrink: 0 }}>
                            ×
                          </button>
                        )}
                        
                        {!u.manual && (() => {
                          const win = get24hWindowStatus(u);
                          return (
                            <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '2px 7px',
                              background: win.bg, color: win.color }}>
                              {win.label}
                            </span>
                          );
                        })()}

                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 99, padding: '2px 7px',
                          background: u.manual ? '#EDE9FE' : '#D1FAE5',
                          color:      u.manual ? '#6D28D9' : '#065F46' }}>
                          {u.manual ? 'Manual' : 'Customer'}
                        </span>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            <div style={{ padding: '10px 20px', borderTop: '1px solid #F1F5F9',
              background: '#F8FAFC', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: '#64748B', fontWeight: 500 }}>
                {recipientCount} of {allUsers.length} selected
                {manualPhones.length > 0 && (
                  <span style={{ color: '#6D28D9', marginLeft: 4 }}>
                    ({users.length} customers + {manualPhones.length} manual)
                  </span>
                )}
              </span>
              {!selectAll && recipientCount > 0 && (
                <button onClick={() => { setSelected([]); setSelectAll(false) }}
                  style={{ background: 'none', border: 'none', color: '#94A3B8',
                    fontSize: 12, fontWeight: 500, textDecoration: 'underline' }}>
                  Clear selection
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── RIGHT ───────────────────────────────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
            padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <SectionLabel>WhatsApp Preview</SectionLabel>
            <PhonePreview text={message} />
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
            padding: '20px 22px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <SectionLabel>Broadcast Summary</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18 }}>
              {[
                { label: 'Recipients', value: selectAll ? `All (${allUsers.length})` : recipientCount, icon: '👥' },
                { label: 'Characters', value: chars || '—', icon: '📝' },
                { label: 'Channel',    value: 'WhatsApp',    icon: '💬' },
                { label: 'Sent by',    value: 'Admin',       icon: '🔐' },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', fontSize: 13 }}>
                  <span style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>{row.icon}</span> {row.label}
                  </span>
                  <span style={{ fontWeight: 700, color: '#0F172A',
                    fontFamily: typeof row.value === 'number' ? 'DM Mono,monospace' : 'inherit' }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={sendBroadcast}
              disabled={busy || !message.trim() || recipientCount === 0 || missingVars.length > 0}
              style={{
                width: '100%',
                background: busy || !message.trim() || recipientCount === 0 || missingVars.length > 0 ? '#86EFAC' : '#16A34A',
                color: '#fff', border: 'none', borderRadius: 10, padding: '13px',
                fontWeight: 700, fontSize: 14,
                boxShadow: '0 2px 8px rgba(22,163,74,.25)', transition: 'background .15s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              {busy
                ? <><span style={{ display: 'inline-block', animation: 'spin .7s linear infinite' }}>↻</span> Sending…</>
                : `📤 Send to ${recipientCount} Customer${recipientCount !== 1 ? 's' : ''}`
              }
            </button>

            <p style={{ fontSize: 11, color: '#94A3B8', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
              Messages sent via WhatsApp Business. Ensure compliance with WhatsApp policies.
            </p>
          </div>

          <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 14,
            padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,.04)' }}>
            <SectionLabel>Quick Actions</SectionLabel>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { icon: '📄', label: 'Browse template library', onClick: () => setShowTemplates(true) },
                { icon: '🗑', label: 'Clear message',            onClick: () => { setMessage(''); setError(''); setResult(null) } },
              ].map(a => (
                <button key={a.label} onClick={a.onClick}
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9,
                    padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13,
                    color: '#374151', display: 'flex', alignItems: 'center', gap: 10 }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F1F5F9'}
                  onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                  {a.icon} <span>{a.label}</span>
                </button>
              ))}
              <button onClick={handleCopy} disabled={!message}
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 9,
                  padding: '10px 14px', textAlign: 'left', fontWeight: 600, fontSize: 13,
                  color: copied ? '#065F46' : '#374151', display: 'flex', alignItems: 'center', gap: 10,
                  opacity: message ? 1 : .45 }}
                onMouseEnter={e => { if (message) e.currentTarget.style.background = '#F1F5F9' }}
                onMouseLeave={e => e.currentTarget.style.background = '#F8FAFC'}>
                {copied ? '✓' : '📋'} <span>{copied ? 'Copied to clipboard!' : 'Copy message text'}</span>
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}