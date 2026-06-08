import { useState, useEffect, useRef } from 'react'

/* ─── Fonts & Global ────────────────────────────────────────────────────── */
const G = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }
html, body { background:#F8FAFC; color:#0F172A; font-family:'DM Sans',sans-serif; font-size:14px; }
::-webkit-scrollbar { width:5px; }
::-webkit-scrollbar-thumb { background:#CBD5E1; border-radius:99px; }
input::placeholder, textarea::placeholder { color:#94A3B8; }
@keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
@keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0} }
`

/* ─── Variables palette ─────────────────────────────────────────────────── */
const VARS = [
  { key:'{{customer_name}}',   label:'Customer Name',  eg:'Ramesh Kumar',   icon:'👤' },
  { key:'{{phone}}',           label:'Phone',          eg:'9876543210',     icon:'📱' },
  { key:'{{order_id}}',        label:'Order ID',       eg:'ORD-1042',       icon:'🔖' },
  { key:'{{order_total}}',     label:'Order Total',    eg:'₹540',           icon:'💰' },
  { key:'{{order_status}}',    label:'Order Status',   eg:'Confirmed',      icon:'📦' },
  { key:'{{items}}',           label:'Items List',     eg:'Tomato ×2, Onion ×1', icon:'🛒' },
  { key:'{{delivery_date}}',   label:'Delivery Date',  eg:'Today by 6 PM',  icon:'🗓' },
  { key:'{{shop_name}}',       label:'Shop Name',      eg:'Phasal Bazar',   icon:'🌾' },
  { key:'{{offer}}',           label:'Offer/Discount', eg:'10% off today',  icon:'🎁' },
  { key:'{{link}}',            label:'Custom Link',    eg:'https://…',      icon:'🔗' },
]

/* ─── Preset Templates ──────────────────────────────────────────────────── */
const PRESETS = [
  {
    id: 'phasal_bazar_shopping',
    category: 'Welcome',
    categoryColor: '#6D28D9',
    categoryBg: '#EDE9FE',
    name: 'phasal_bazar_shopping',
    icon: '👋',
    body: 'Shop fresh farm products — Millets, Oils, Dals and more! Pure • Natural • Desi 🌾',
    hasImageHeader: true,
  },
  {
    id: 'phasal_bazar_welcome',
    category: 'Welcome',
    categoryColor: '#6D28D9',
    categoryBg: '#EDE9FE',
    name: 'phasal_bazar_welcome',
    icon: '🌾',
    body: 'Hi {{customer_name}}! 🌾\n\nWe are Phasal Bazar, bringing you 100% natural, pure, and farm-fresh products directly from local farms to your doorstep.\n\n🌐 Explore our D2C store: https://phasalbazar.com\n\nTap "View Catalog" below to browse our fresh products directly here on WhatsApp, or reply to this message to chat with us! 💚',
  },
  {
    id: 'phasal_bazar_order_confirmed',
    category: 'Order Update',
    categoryColor: '#065F46',
    categoryBg: '#D1FAE5',
    name: 'phasal_bazar_order_confirmed',
    icon: '✅',
    body: 'Hello {{customer_name}}! Your order {{order_id}} has been confirmed. Total: ₹{{order_total}}. We will deliver it by {{delivery_date}}. Thank you for shopping with Phasal Bazar! 🌾',
  },
  {
    id: 'phasal_bazar_order_delivered',
    category: 'Order Update',
    categoryColor: '#065F46',
    categoryBg: '#D1FAE5',
    name: 'phasal_bazar_order_delivered',
    icon: '🚀',
    body: 'Great news {{customer_name}}! Your order {{order_id}} has been delivered. We hope you love your fresh products! 🚚🌾',
  },
  {
    id: 'phasal_bazar_order_cancelled',
    category: 'Order Update',
    categoryColor: '#DC2626',
    categoryBg: '#FEE2E2',
    name: 'phasal_bazar_order_cancelled',
    icon: '❌',
    body: 'Hello {{customer_name}}, your order {{order_id}} has been cancelled. If this was a mistake, please start shopping again. ❌',
  },
  {
    id: 'phasal_bazar_payment_request',
    category: 'Payment',
    categoryColor: '#1E40AF',
    categoryBg: '#DBEAFE',
    name: 'phasal_bazar_payment_request',
    icon: '💳',
    body: 'Hello {{customer_name}}! To complete your order {{order_id}} for ₹{{order_total}}, please click here to pay: {{link}}. Thank you! 💳',
  },
  {
    id: 'custom',
    category: 'Custom',
    categoryColor: '#374151',
    categoryBg: '#F1F5F9',
    name: 'Blank Template',
    icon: '✏️',
    body: '',
  },
]

const MAP_PARAMS = {
  phasal_bazar_order_confirmed: ["customer_name", "order_id", "order_total", "delivery_date"],
  phasal_bazar_welcome: ["customer_name"],
  phasal_bazar_order_delivered: ["customer_name", "order_id"],
  phasal_bazar_order_cancelled: ["customer_name", "order_id"],
  phasal_bazar_payment_request: ["customer_name", "order_id", "order_total", "link"]
};

function mapMetaTemplateToLocal(tpl) {
  const bodyComponent = tpl.components?.find(c => c.type === 'BODY');
  let bodyText = bodyComponent ? bodyComponent.text : '';

  // Map {{1}}, {{2}} to {{customer_name}}, {{order_id}} etc.
  const paramNames = MAP_PARAMS[tpl.name];
  if (paramNames) {
    paramNames.forEach((name, index) => {
      bodyText = bodyText.replaceAll(`{{${index + 1}}}`, `{{${name}}}`);
    });
  } else {
    // If it is a new custom template not in our mapping, replace {{1}} with {{param_1}}
    const matches = bodyText.match(/{{(\d+)}}/g);
    if (matches) {
      matches.forEach(m => {
        const num = m.replace(/[{}]/g, '');
        bodyText = bodyText.replaceAll(m, `{{param_${num}}}`);
      });
    }
  }

  // Determine category badge colors
  let categoryColor = '#374151';
  let categoryBg = '#F1F5F9';
  let categoryLabel = 'Utility';
  if (tpl.category === 'UTILITY') {
    categoryColor = '#065F46';
    categoryBg = '#D1FAE5';
    categoryLabel = 'Utility';
  } else if (tpl.category === 'MARKETING') {
    categoryColor = '#6D28D9';
    categoryBg = '#EDE9FE';
    categoryLabel = 'Marketing';
  } else if (tpl.category === 'AUTHENTICATION') {
    categoryColor = '#1E40AF';
    categoryBg = '#DBEAFE';
    categoryLabel = 'Authentication';
  }

  const headerComponent = tpl.components?.find(c => c.type === 'HEADER');
  const hasImageHeader = headerComponent && headerComponent.format === 'IMAGE';

  return {
    id: tpl.name,
    name: tpl.name,
    category: categoryLabel,
    categoryColor,
    categoryBg,
    icon: tpl.category === 'UTILITY' ? '✅' : tpl.category === 'MARKETING' ? '🌾' : '🔑',
    body: bodyText,
    metaTemplate: true,
    status: tpl.status,
    hasImageHeader: !!hasImageHeader,
    language: tpl.language || 'en'
  };
}

/* ─── Helpers ───────────────────────────────────────────────────────────── */
function renderPreview(text) {
  let out = text
  VARS.forEach(v => { out = out.replaceAll(v.key, `<b style="color:#16A34A">${v.eg}</b>`) })
  // WhatsApp bold: *text*
  out = out.replace(/\*(.*?)\*/g, '<b>$1</b>')
  return out.replace(/\n/g, '<br/>')
}

function charCount(text) {
  return { chars: text.length, sms: Math.ceil(text.length / 160) }
}

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

/* ─── Category pill ─────────────────────────────────────────────────────── */
function CatBadge({ label, color, bg }) {
  return (
    <span style={{ background:bg, color, borderRadius:99, padding:'2px 9px', fontSize:11, fontWeight:600 }}>
      {label}
    </span>
  )
}

/* ─── WhatsApp Phone Preview ────────────────────────────────────────────── */
function PhonePreview({ text, senderName }) {
  const now = new Date().toLocaleTimeString('en-IN',{hour:'2-digit',minute:'2-digit'})
  return (
    <div style={{ display:'flex', justifyContent:'center' }}>
      <div style={{
        width:280, background:'#fff', borderRadius:36,
        border:'8px solid #1C1C1E', boxShadow:'0 20px 60px rgba(0,0,0,.18), 0 0 0 1px rgba(0,0,0,.1)',
        overflow:'hidden', fontFamily:"'Helvetica Neue',Arial,sans-serif",
      }}>
        {/* Status bar */}
        <div style={{ background:'#128C7E', height:6 }} />
        {/* WA Header */}
        <div style={{ background:'#128C7E', padding:'10px 14px', display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:34, height:34, borderRadius:'50%', background:'#25D366',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🌾</div>
          <div>
            <div style={{ color:'#fff', fontWeight:700, fontSize:13 }}>{senderName||'Phasal Bazar'}</div>
            <div style={{ color:'rgba(255,255,255,.75)', fontSize:10 }}>Business Account</div>
          </div>
        </div>
        {/* Chat bg */}
        <div style={{
          background:'#ECE5DD url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\' fill=\'%23d9cfca\' fill-opacity=\'0.4\' fill-rule=\'evenodd\'/%3E%3C/svg%3E")',
          minHeight:260, padding:'12px 10px', display:'flex', flexDirection:'column', justifyContent:'flex-end',
        }}>
          {text ? (
            <div style={{ alignSelf:'flex-start', maxWidth:'88%' }}>
              <div style={{
                background:'#fff', borderRadius:'0 10px 10px 10px',
                padding:'8px 10px', fontSize:12.5, lineHeight:1.55, color:'#111',
                boxShadow:'0 1px 2px rgba(0,0,0,.12)',
                borderLeft:'3px solid #25D366',
              }}
                dangerouslySetInnerHTML={{ __html: renderPreview(text) }}
              />
              <div style={{ fontSize:10, color:'#999', textAlign:'right', marginTop:3 }}>
                {now} ✓✓
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', color:'#aaa', fontSize:12, padding:'40px 0' }}>
              Your message will appear here
            </div>
          )}
        </div>
        {/* Input bar */}
        <div style={{ background:'#F0F0F0', padding:'8px 10px', display:'flex', alignItems:'center', gap:6 }}>
          <div style={{ flex:1, background:'#fff', borderRadius:20, padding:'7px 12px',
            fontSize:12, color:'#999', boxShadow:'0 1px 2px rgba(0,0,0,.08)' }}>
            Type a message
          </div>
          <div style={{ width:32, height:32, borderRadius:'50%', background:'#25D366',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:14 }}>🎤</div>
        </div>
      </div>
    </div>
  )
}

/* ─── Main App ──────────────────────────────────────────────────────────── */
export default function BroadcastTemplates({ api, token, onSelect, onClose }) {
  const [presets,      setPresets]      = useState(PRESETS)
  const [loading,      setLoading]      = useState(true)
  const [activePreset, setActivePreset] = useState(null)
  const [body,         setBody]         = useState('')
  const [templateName, setTemplateName] = useState('')
  const [copied,       setCopied]       = useState(false)
  const [saved,        setSaved]        = useState([])
  const [activeTab,    setActiveTab]    = useState('compose')   // compose | saved
  const [filter,       setFilter]       = useState('All')
  const textRef = useRef(null)

  const [syncError,    setSyncError]    = useState('')
  const [wabaIdInput,  setWabaIdInput]  = useState('')
  const [savingWaba,   setSavingWaba]   = useState(false)

  // Fetch templates from the backend (which proxies the Meta Graph API)
  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch(`${api}/admin/templates`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      const data = await res.json()
      if (data.success && Array.isArray(data.templates) && data.templates.length > 0) {
        const mapped = data.templates.map(mapMetaTemplateToLocal)
        // Append custom template at the end
        mapped.push(PRESETS[PRESETS.length - 1])
        setPresets(mapped)
        setSyncError('')
      } else {
        setPresets(PRESETS)
        if (data.message || data.error) {
          setSyncError(data.message || data.error)
        }
      }
    } catch (err) {
      console.error("Error fetching Meta templates:", err)
      setPresets(PRESETS)
      setSyncError(err.message || 'Server error fetching templates')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (api && token) {
      fetchTemplates()
    } else {
      setPresets(PRESETS)
      setLoading(false)
    }
  }, [api, token])

  const saveWabaId = async () => {
    if (!wabaIdInput.trim()) return
    setSavingWaba(true)
    try {
      const res = await fetch(`${api}/admin/catalog/config`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ wabaId: wabaIdInput.trim() })
      })
      const data = await res.json()
      if (res.ok && data.success) {
        setSyncError('')
        await fetchTemplates()
      } else {
        setSyncError(data.error || 'Failed to save configuration')
      }
    } catch (err) {
      setSyncError(err.message || 'Failed to save configuration')
    }
    setSavingWaba(false)
  }

  // Initialize values when presets load
  useEffect(() => {
    if (presets.length > 0 && !activePreset) {
      setActivePreset(presets[0])
      setBody(presets[0].body)
      setTemplateName(presets[0].name)
    }
  }, [presets, activePreset])

  const cats = ['All', ...Array.from(new Set(presets.map(p => p.category)))]

  const selectPreset = (p) => {
    setActivePreset(p)
    setBody(p.body)
    setTemplateName(p.name)
  }

  const insertVar = (varKey) => {
    const el = textRef.current
    if (!el) { setBody(b => b + varKey); return }
    const start = el.selectionStart
    const end   = el.selectionEnd
    const newVal = body.slice(0, start) + varKey + body.slice(end)
    setBody(newVal)
    setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + varKey.length, start + varKey.length)
    }, 0)
  }

  const handleCopy = () => {
    copyText(body)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSave = () => {
    if (!body.trim()) return
    const entry = {
      id: Date.now(),
      name: templateName || 'Untitled',
      body,
      category: activePreset.category,
      categoryColor: activePreset.categoryColor,
      categoryBg: activePreset.categoryBg,
      savedAt: new Date().toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}),
    }
    setSaved(s => [entry, ...s])
    setActiveTab('saved')
  }

  const deleteTemplate = (id) => setSaved(s => s.filter(x => x.id !== id))

  const filteredPresets = filter === 'All' ? presets : presets.filter(p => p.category === filter)
  const { chars } = charCount(body)

  /* ── render ── */
  return (
    <div style={{ padding: 0, background: '#fff', borderRadius: 14, minHeight: 400, position: 'relative' }}>
      <style>{G}</style>
      <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 16, background: 'none', border: 'none', fontSize: 22, color: '#6B7280', zIndex: 2 }}>×</button>
      {activeTab === 'compose' ? (
        <div style={{ display:'grid', gridTemplateColumns:'260px 1fr 300px', gap:0,
          minHeight:'calc(100vh - 58px)', animation:'fadeIn .3s ease' }}>

          {/* ── LEFT: Template Picker ───────────────────────────── */}
          <aside style={{ borderRight:'1px solid #E2E8F0', background:'#fff', overflowY:'auto' }}>
            <div style={{ padding:'16px 16px 10px', borderBottom:'1px solid #F1F5F9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px' }}>
                  Template Library
                </div>
                <button
                  onClick={fetchTemplates}
                  disabled={loading}
                  style={{
                    background: '#F1F5F9',
                    color: '#4B5563',
                    border: 'none',
                    borderRadius: 6,
                    padding: '3px 8px',
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4
                  }}
                >
                  {loading ? 'Syncing...' : '🔄 Sync Templates'}
                </button>
              </div>

              {syncError && (
                <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 8,
                  padding: '10px 12px', fontSize: 11, color: '#92400E', marginBottom: 12, lineHeight: 1.45 }}>
                  <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠️ Sync Warning:</div>
                  <div style={{ fontSize: 10.5, color: '#B45309', wordBreak: 'break-word' }}>
                    {syncError === 'WABA_ID_MISSING' 
                      ? "WhatsApp Business Account (WABA) ID is not configured." 
                      : syncError}
                  </div>
                  {syncError === 'WABA_ID_MISSING' ? (
                    <div style={{ marginTop: 8 }}>
                      <input
                        type="text"
                        placeholder="Enter WABA ID (e.g. 109284058291)"
                        value={wabaIdInput}
                        onChange={e => setWabaIdInput(e.target.value)}
                        style={{
                          width: '100%',
                          border: '1px solid #FCD34D',
                          borderRadius: 6,
                          padding: '5px 8px',
                          fontSize: 11,
                          outline: 'none',
                          marginBottom: 6,
                          background: '#fff'
                        }}
                      />
                      <button
                        onClick={saveWabaId}
                        disabled={savingWaba || !wabaIdInput.trim()}
                        style={{
                          width: '100%',
                          background: '#D97706',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 6,
                          padding: '5px',
                          fontSize: 11,
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {savingWaba ? 'Saving...' : '💾 Save & Sync'}
                      </button>
                    </div>
                  ) : (
                    <div style={{ marginTop: 5, fontSize: 9.5, color: '#92400E', fontWeight: 600 }}>
                      Using offline templates fallback.
                    </div>
                  )}
                </div>
              )}

              {/* Category filter */}
              <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                {cats.map(c => (
                  <button key={c} onClick={() => setFilter(c)}
                    style={{ background: filter===c ? '#0F172A' : '#F1F5F9',
                      color: filter===c ? '#fff' : '#64748B',
                      border:'none', borderRadius:99, padding:'3px 10px',
                      fontSize:11, fontWeight:600, transition:'all .15s' }}>
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ padding:10, display:'flex', flexDirection:'column', gap:4 }}>
              {loading ? (
                <div style={{ textAlign: 'center', padding: '50px 10px', color: '#94A3B8' }}>
                  <div style={{ fontSize: 18, animation: 'spin 1.8s linear infinite', display: 'inline-block', marginBottom: 8 }}>↻</div>
                  <div style={{ fontSize: 12, fontWeight: 500 }}>Syncing Meta Templates…</div>
                </div>
              ) : filteredPresets.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 10px', color: '#94A3B8', fontSize: 12 }}>
                  No templates found
                </div>
              ) : (
                filteredPresets.map(p => (
                  <div key={p.id} 
                    onClick={() => selectPreset(p)}
                    style={{ 
                      border: p.id === activePreset?.id ? '2px solid #10B981' : '1px solid #E5E7EB', 
                      borderRadius: 10, 
                      marginBottom: 14, 
                      background: p.id === activePreset?.id ? '#F0FDF4' : '#F9FAFB', 
                      padding: 16, 
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      if (p.id !== activePreset?.id) {
                        e.currentTarget.style.borderColor = '#10B981';
                        e.currentTarget.style.background = '#F0FDF4';
                      }
                    }}
                    onMouseLeave={e => {
                      if (p.id !== activePreset?.id) {
                        e.currentTarget.style.borderColor = '#E5E7EB';
                        e.currentTarget.style.background = '#F9FAFB';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 20 }}>{p.icon}</span>
                      <span style={{ fontWeight: 600, fontSize: 14, wordBreak: 'break-all' }}>{p.name}</span>
                      <CatBadge label={p.category} color={p.categoryColor} bg={p.categoryBg} />
                      {p.status && (
                        <span style={{ fontSize: 10, fontWeight: 700, borderRadius: 5, padding: '2px 6px',
                          background: p.status === 'APPROVED' ? '#DCFCE7' : p.status === 'PENDING' ? '#FEF3C7' : '#FEE2E2',
                          color: p.status === 'APPROVED' ? '#16A34A' : p.status === 'PENDING' ? '#D97706' : '#DC2626' }}>
                          {p.status}
                        </span>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); selectPreset(p); }} style={{ marginLeft: 'auto', background: p.id === activePreset?.id ? '#10B981' : '#059669', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                        {p.id === activePreset?.id ? 'Selected ✓' : 'Select'}
                      </button>
                    </div>
                    {p.body && (
                      <pre style={{ 
                        fontSize: 12.5, 
                        color: '#4B5563', 
                        lineHeight: 1.6, 
                        fontFamily: 'DM Sans,sans-serif', 
                        whiteSpace: 'pre-wrap', 
                        wordBreak: 'break-word', 
                        margin: '8px 0 0 0',
                        background: '#fff',
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: '1px solid #E5E7EB'
                      }}>
                        {p.body}
                      </pre>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>

          {/* ── CENTER: Editor ──────────────────────────────────── */}
          <main style={{ display:'flex', flexDirection:'column', overflowY:'auto', background:'#F8FAFC' }}>
            <div style={{ padding:'24px 28px', flex:1, display:'flex', flexDirection:'column', gap:20 }}>

              {/* Template name */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:8 }}>
                  Template Name
                </label>
                <input value={templateName} onChange={e => setTemplateName(e.target.value)}
                  placeholder="e.g. Order Confirmed – Hindi"
                  style={{ width:'100%', border:'1.5px solid #E2E8F0', borderRadius:9, padding:'9px 13px',
                    color:'#0F172A', outline:'none', background:'#fff', fontWeight:500,
                    transition:'border-color .15s' }}
                  onFocus={e => e.target.style.borderColor='#16A34A'}
                  onBlur={e => e.target.style.borderColor='#E2E8F0'}
                />
              </div>

              {/* Variable chips */}
              <div>
                <label style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px', display:'block', marginBottom:8 }}>
                  Insert Variable
                </label>
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {VARS.map(v => (
                    <button key={v.key} onClick={() => insertVar(v.key)}
                      style={{ background:'#fff', border:'1.5px solid #E2E8F0', borderRadius:8,
                        padding:'5px 11px', fontSize:12, fontWeight:600, color:'#374151',
                        display:'flex', alignItems:'center', gap:5, cursor:'pointer',
                        transition:'all .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor='#16A34A'; e.currentTarget.style.color='#16A34A' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor='#E2E8F0'; e.currentTarget.style.color='#374151' }}>
                      <span>{v.icon}</span> {v.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Textarea */}
              <div style={{ flex:1, display:'flex', flexDirection:'column' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                  <label style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px' }}>
                    Message Body
                  </label>
                  <div style={{ display:'flex', gap:12, alignItems:'center' }}>
                    <span style={{ fontSize:12, color: chars > 1000 ? '#EF4444' : '#94A3B8', fontFamily:'DM Mono,monospace' }}>
                      {chars} chars
                    </span>
                    <span style={{ fontSize:11, color:'#94A3B8', fontWeight:500 }}>
                      Use *bold* for emphasis
                    </span>
                  </div>
                </div>
                <textarea
                  ref={textRef}
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="Type your broadcast message here…&#10;&#10;Tip: Use *asterisks* for bold text, and click variables above to insert them."
                  style={{ flex:1, minHeight:320, width:'100%', border:'1.5px solid #E2E8F0', borderRadius:10,
                    padding:'14px 16px', color:'#0F172A', outline:'none', background:'#fff',
                    resize:'vertical', lineHeight:1.8, fontSize:14, fontFamily:'DM Sans,sans-serif',
                    transition:'border-color .15s' }}
                  onFocus={e => e.target.style.borderColor='#16A34A'}
                  onBlur={e => e.target.style.borderColor='#E2E8F0'}
                />
              </div>

              {/* Formatting tips */}
              <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:10, padding:'14px 18px' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:10 }}>
                  WhatsApp Formatting Tips
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:8 }}>
                  {[
                    { eg:'*bold*',         result:'Bold text' },
                    { eg:'_italic_',       result:'Italic text' },
                    { eg:'~strikethrough~',result:'Strikethrough' },
                    { eg:'```code```',     result:'Code block' },
                    { eg:'> quote',        result:'Block quote' },
                    { eg:'🌾 emoji',       result:'Use freely!' },
                  ].map(t => (
                    <div key={t.eg} style={{ background:'#F8FAFC', borderRadius:7, padding:'8px 11px' }}>
                      <div style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#16A34A', marginBottom:2 }}>{t.eg}</div>
                      <div style={{ fontSize:11, color:'#64748B' }}>{t.result}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>

          {/* ── RIGHT: Phone Preview ────────────────────────────── */}
          <aside style={{ borderLeft:'1px solid #E2E8F0', background:'#fff', padding:'28px 20px',
            display:'flex', flexDirection:'column', gap:20, overflowY:'auto' }}>
            <button 
              onClick={() => onSelect && onSelect({ ...activePreset, body, name: templateName })}
              style={{
                width: '100%',
                background: '#16A34A',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                padding: '12px 16px',
                fontWeight: 700,
                fontSize: 14,
                boxShadow: '0 2px 8px rgba(22,163,74,.25)',
                transition: 'background .15s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                cursor: 'pointer'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#15803d'}
              onMouseLeave={e => e.currentTarget.style.background = '#16A34A'}
            >
              📥 Use this Template
            </button>
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:16 }}>
                Live Preview
              </div>
              <PhonePreview text={body} senderName="Phasal Bazar" />
            </div>

            {/* Variable legend */}
            <div>
              <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:10 }}>
                Variable Legend
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                {VARS.filter(v => body.includes(v.key)).map(v => (
                  <div key={v.key} style={{ display:'flex', justifyContent:'space-between',
                    alignItems:'center', background:'#F8FAFC', borderRadius:7, padding:'7px 10px',
                    border:'1px solid #E2E8F0' }}>
                    <span style={{ fontFamily:'DM Mono,monospace', fontSize:11, color:'#16A34A', fontWeight:500 }}>
                      {v.key}
                    </span>
                    <span style={{ fontSize:11, color:'#64748B' }}>{v.eg}</span>
                  </div>
                ))}
                {!VARS.some(v => body.includes(v.key)) && (
                  <div style={{ fontSize:12, color:'#94A3B8', textAlign:'center', padding:'10px 0' }}>
                    No variables used yet
                  </div>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ background:'#F8FAFC', borderRadius:10, padding:'14px 16px', border:'1px solid #E2E8F0' }}>
              <div style={{ fontSize:11, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'.6px', marginBottom:10 }}>Stats</div>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {[
                  { label:'Characters', value:chars },
                  { label:'Words', value: body.trim() ? body.trim().split(/\s+/).length : 0 },
                  { label:'Lines', value: body ? body.split('\n').length : 0 },
                  { label:'Variables', value: VARS.filter(v => body.includes(v.key)).length },
                ].map(s => (
                  <div key={s.label} style={{ display:'flex', justifyContent:'space-between', fontSize:13 }}>
                    <span style={{ color:'#64748B' }}>{s.label}</span>
                    <span style={{ fontWeight:700, color:'#0F172A', fontFamily:'DM Mono,monospace' }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>

      ) : (
        /* ── Saved Templates View ─────────────────────────────────────── */
        <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 24px', animation:'fadeIn .3s ease' }}>
          <div style={{ marginBottom:24 }}>
            <h2 style={{ fontSize:20, fontWeight:700, color:'#0F172A', marginBottom:4 }}>Saved Templates</h2>
            <p style={{ color:'#64748B', fontSize:13 }}>{saved.length} template{saved.length!==1?'s':''} saved</p>
          </div>

          {saved.length === 0 ? (
            <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:16,
              textAlign:'center', padding:'80px 40px', color:'#94A3B8',
              boxShadow:'0 1px 3px rgba(0,0,0,.04)' }}>
              <div style={{ fontSize:44, marginBottom:14 }}>📂</div>
              <p style={{ fontWeight:600, color:'#64748B', fontSize:15, marginBottom:6 }}>No saved templates yet</p>
              <p style={{ fontSize:13 }}>Go to Compose and save a template to see it here.</p>
              <button onClick={() => setActiveTab('compose')}
                style={{ marginTop:20, background:'#16A34A', color:'#fff', border:'none',
                  borderRadius:9, padding:'10px 20px', fontWeight:600, fontSize:13,
                  boxShadow:'0 1px 4px rgba(22,163,74,.25)' }}>
                ✏️ Go to Compose
              </button>
            </div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(400px,1fr))', gap:16 }}>
              {saved.map(t => (
                <div key={t.id} style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:14,
                  overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,.05)' }}>
                  {/* Card header */}
                  <div style={{ padding:'14px 18px', borderBottom:'1px solid #F1F5F9',
                    display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:'#0F172A', marginBottom:5 }}>{t.name}</div>
                      <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                        <CatBadge label={t.category} color={t.categoryColor} bg={t.categoryBg} />
                        <span style={{ fontSize:11, color:'#94A3B8' }}>Saved {t.savedAt}</span>
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:6 }}>
                      <button onClick={() => { selectPreset({...t, id:'custom'}); setActiveTab('compose') }}
                        style={{ background:'#F1F5F9', border:'none', borderRadius:7, padding:'6px 11px',
                          fontSize:12, fontWeight:600, color:'#374151' }}>
                        ✏️ Edit
                      </button>
                      <button onClick={() => { copyText(t.body); }}
                        style={{ background:'#F1F5F9', border:'none', borderRadius:7, padding:'6px 11px',
                          fontSize:12, fontWeight:600, color:'#374151' }}>
                        📋 Copy
                      </button>
                      <button onClick={() => deleteTemplate(t.id)}
                        style={{ background:'#FEF2F2', border:'none', borderRadius:7, padding:'6px 9px',
                          fontSize:12, fontWeight:600, color:'#EF4444' }}>
                        🗑
                      </button>
                    </div>
                  </div>
                  {/* Message preview */}
                  <div style={{ padding:'14px 18px' }}>
                    <pre style={{ fontSize:12.5, color:'#374151', lineHeight:1.7,
                      fontFamily:'DM Sans,sans-serif', whiteSpace:'pre-wrap', wordBreak:'break-word',
                      maxHeight:160, overflow:'hidden',
                      maskImage:'linear-gradient(to bottom, black 70%, transparent 100%)',
                      WebkitMaskImage:'linear-gradient(to bottom, black 70%, transparent 100%)' }}>
                      {t.body}
                    </pre>
                    <div style={{ marginTop:8, fontSize:11, color:'#94A3B8', fontFamily:'DM Mono,monospace' }}>
                      {t.body.length} chars · {VARS.filter(v => t.body.includes(v.key)).length} variables
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
