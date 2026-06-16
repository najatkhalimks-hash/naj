import { useState, useEffect, useCallback } from 'react'
import { SECTIONS, ALL_FIELDS, FIELD_IDS, FIELD_LABELS } from './sections.js'
import { saveSubmission, loadSubmissions, clearSubmissions } from './storage.js'
import { exportToExcel } from './export.js'

// ── Design tokens ──────────────────────────────────────────────────────────
const C = {
  navy:   '#0D1B2A', blue:   '#1A56DB', teal:   '#047481',
  green:  '#057A55', violet: '#5521B5', orange: '#B45309',
  red:    '#BE123C', gold:   '#FBBF24',
  g1: '#F9FAFB', g3: '#E5E7EB', gt: '#6B7280', gd: '#111928',
}

const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'GSMI2025'

// ── Toast ──────────────────────────────────────────────────────────────────
function Toast({ t, bottom = 24 }) {
  return (
    <div style={{
      position: 'fixed', bottom, left: '50%', transform: 'translateX(-50%)',
      background: t.type === 'error' ? C.red : C.gd, color: '#fff',
      padding: '10px 22px', borderRadius: 8, fontSize: 13, zIndex: 9999,
      whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,0,0,.18)',
      animation: 'fadeIn .2s ease',
    }}>
      {t.msg}
    </div>
  )
}

// ── Field ──────────────────────────────────────────────────────────────────
function Field({ f, form, onChange, errors }) {
  const val = form[f.id] ?? ''
  const err = errors[f.id]
  const base = {
    width: '100%', padding: '10px 12px',
    border: `1.5px solid ${err ? C.red : C.g3}`,
    borderRadius: 8, fontSize: 15, color: C.gd, background: '#fff',
    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color .15s, box-shadow .15s',
  }
  const focusStyle = {
    borderColor: C.blue,
    boxShadow: `0 0 0 3px ${C.blue}22`,
  }
  const [focused, setFocused] = useState(false)

  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: C.gd, marginBottom: 5 }}>
        {f.label}
        {f.required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
      </label>
      {f.hint && <p style={{ fontSize: 12, color: C.gt, margin: '0 0 6px', lineHeight: 1.4 }}>{f.hint}</p>}

      {f.type === 'textarea' ? (
        <textarea
          value={val}
          onChange={e => onChange(f.id, e.target.value)}
          placeholder={f.placeholder || ''}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...base, ...(focused ? focusStyle : {}), minHeight: 88, resize: 'vertical', lineHeight: 1.5 }}
        />
      ) : f.type === 'select' ? (
        <select
          value={val}
          onChange={e => onChange(f.id, e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...base, ...(focused ? focusStyle : {}), cursor: 'pointer', appearance: 'auto' }}
        >
          <option value="">— Sélectionner —</option>
          {f.options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={f.type}
          value={val}
          onChange={e => onChange(f.id, e.target.value)}
          placeholder={f.placeholder || ''}
          min={f.type === 'number' ? 0 : undefined}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ ...base, ...(focused ? focusStyle : {}) }}
        />
      )}
      {err && <p style={{ fontSize: 12, color: C.red, margin: '5px 0 0', display: 'flex', alignItems: 'center', gap: 4 }}>
        <span>⚠</span> {err}
      </p>}
    </div>
  )
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView]       = useState('home')   // home | form | admin | thanks
  const [step, setStep]       = useState(0)
  const [form, setForm]       = useState({})
  const [errors, setErrors]   = useState({})
  const [subs, setSubs]       = useState([])
  const [loading, setLoading] = useState(false)
  const [adminCode, setAdminCode] = useState('')
  const [adminOk, setAdminOk]    = useState(false)
  const [toast, setToast]        = useState(null)
  const [syncing, setSyncing]    = useState(false)

  useEffect(() => {
    loadSubmissions().then(setSubs)
  }, [])

  function showToast(msg, type = 'success') {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  const handleChange = useCallback((id, value) => {
    setForm(p => ({ ...p, [id]: value }))
    setErrors(p => { const n = { ...p }; delete n[id]; return n })
  }, [])

  function validate(stepIdx) {
    const errs = {}
    SECTIONS[stepIdx].fields.forEach(f => {
      if (f.required && (!form[f.id] || form[f.id] === '')) errs[f.id] = 'Ce champ est requis'
      if (f.id === 'email' && form[f.id] && !form[f.id].includes('@')) errs[f.id] = 'Format email invalide'
      if (f.type === 'number' && form[f.id] && isNaN(Number(form[f.id]))) errs[f.id] = 'Valeur numérique requise'
    })
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function next() {
    if (!validate(step)) {
      showToast('Veuillez remplir les champs obligatoires', 'error')
      return
    }
    if (step < SECTIONS.length - 1) {
      setStep(s => s + 1)
      window.scrollTo(0, 0)
    } else {
      handleSubmit()
    }
  }

  function prev() {
    setStep(s => Math.max(0, s - 1))
    setErrors({})
    window.scrollTo(0, 0)
  }

  async function handleSubmit() {
    if (!validate(step)) return
    setLoading(true)
    try {
      const all = await saveSubmission(FIELD_IDS, FIELD_IDS.map(id => form[id] ?? ''))
      setSubs(all)
      setView('thanks')
      setForm({})
      setStep(0)
      window.scrollTo(0, 0)
    } catch (e) {
      showToast("Erreur d'enregistrement. Réessayez.", 'error')
    }
    setLoading(false)
  }

  async function refreshSubs() {
    setSyncing(true)
    const all = await loadSubmissions()
    setSubs(all)
    setSyncing(false)
    showToast(`${all.length} réponse${all.length !== 1 ? 's' : ''} chargée${all.length !== 1 ? 's' : ''}`)
  }

  function handleExport() {
    if (subs.length === 0) { showToast('Aucune donnée à exporter', 'error'); return }
    exportToExcel(subs)
    showToast('Export Excel téléchargé (3 onglets)')
  }

  async function handleClear() {
    if (!confirm('Supprimer TOUTES les réponses ? Cette action est irréversible.')) return
    clearSubmissions()
    setSubs([])
    showToast('Données effacées', 'info')
  }

  const sec = SECTIONS[step]

  // ═══════════════════════════════════════════════════════════════════════
  // HOME
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'home') return (
    <div style={{ minHeight: '100vh', background: C.g1, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        button:hover { opacity: .88; }
        button:active { transform: scale(.97); }
      `}</style>

      {/* Hero */}
      <div style={{ background: C.navy, padding: '56px 24px 48px', textAlign: 'center' }}>
        <p style={{ color: C.gold, fontSize: 11, letterSpacing: '.14em', textTransform: 'uppercase', margin: '0 0 16px', fontWeight: 600 }}>
          GSMI — Green & Sustainable Mining Institute  ·  UM6P
        </p>
        <h1 style={{ color: '#fff', fontSize: 36, fontWeight: 700, margin: '0 0 12px', lineHeight: 1.1 }}>
          Carnet du Chercheur
        </h1>
        <p style={{ color: '#8899BB', fontSize: 16, margin: '0 0 40px', maxWidth: 420, marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.55 }}>
          Saisie semestrielle des activités académiques et de recherche — GSMI / UM6P
        </p>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={() => { setView('form'); setStep(0); setForm({}); window.scrollTo(0,0) }}
            style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '15px 34px', fontSize: 15, fontWeight: 700, cursor: 'pointer', letterSpacing: '.01em' }}
          >
            Remplir le formulaire
          </button>
          <button
            onClick={() => setView('admin')}
            style={{ background: 'transparent', color: '#8899BB', border: '1.5px solid #2D3F55', borderRadius: 10, padding: '15px 26px', fontSize: 14, cursor: 'pointer' }}
          >
            Accès Direction
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div style={{ background: '#fff', borderBottom: `0.5px solid ${C.g3}`, padding: '14px 24px', textAlign: 'center' }}>
        <span style={{ fontSize: 13, color: C.gt }}>
          <strong style={{ color: C.gd }}>{subs.length}</strong> réponse{subs.length !== 1 ? 's' : ''} enregistrée{subs.length !== 1 ? 's' : ''} · 5 sections · environ 8 minutes
        </span>
      </div>

      {/* Sections */}
      <div style={{ maxWidth: 540, margin: '0 auto', padding: '32px 20px 48px' }}>
        <div style={{ display: 'grid', gap: 10 }}>
          {SECTIONS.map((s, i) => (
            <div key={s.id} style={{
              background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 12,
              padding: '15px 18px', display: 'flex', alignItems: 'center', gap: 15,
              borderLeft: `4px solid ${s.color}`,
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{s.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 14, color: C.gd }}>
                  Section {i + 1} — {s.title}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: C.gt }}>
                  {s.fields.length} questions · {s.fields.filter(f => f.required).length} obligatoires
                </p>
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 28, padding: '16px 18px', background: '#EFF6FF', borderRadius: 10, borderLeft: `3px solid ${C.blue}` }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.55 }}>
            <strong>Données sécurisées.</strong> Vos réponses sont transmises directement à la Direction GSMI et consolidées automatiquement dans le tableau de bord annuel présenté lors de l'Academic Meeting.
          </p>
        </div>
      </div>

      {toast && <Toast t={toast} />}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // FORM
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'form') return (
    <div style={{ minHeight: '100vh', background: C.g1, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateX(-50%) translateY(8px); } to { opacity: 1; transform: translateX(-50%) translateY(0); } }
        button:hover { opacity: .88; } button:active { transform: scale(.97); }
        input:focus, select:focus, textarea:focus { outline: none; }
      `}</style>

      {/* Section header */}
      <div style={{ background: sec.color, padding: '20px 20px 0', position: 'sticky', top: 0, zIndex: 10 }}>
        <div style={{ maxWidth: 580, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <button
              onClick={() => setView('home')}
              style={{ background: 'transparent', border: 'none', color: 'rgba(255,255,255,.7)', fontSize: 14, cursor: 'pointer', padding: 0 }}
            >
              ← Accueil
            </button>
            <span style={{ color: 'rgba(255,255,255,.65)', fontSize: 13, fontWeight: 500 }}>
              {step + 1} / {SECTIONS.length}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
            <span style={{ fontSize: 26 }}>{sec.icon}</span>
            <div>
              <p style={{ color: 'rgba(255,255,255,.55)', fontSize: 11, margin: '0 0 2px', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                Section {step + 1} sur {SECTIONS.length}
              </p>
              <h2 style={{ color: '#fff', fontSize: 18, fontWeight: 700, margin: 0 }}>{sec.title}</h2>
            </div>
          </div>

          {/* Progress segments */}
          <div style={{ display: 'flex', gap: 4 }}>
            {SECTIONS.map((_, i) => (
              <div key={i} style={{
                flex: 1, height: 4, borderRadius: '4px 4px 0 0',
                background: i < step ? '#4ADE80' : i === step ? '#fff' : 'rgba(255,255,255,.22)',
                transition: 'background .3s',
              }} />
            ))}
          </div>
        </div>
      </div>

      {/* Fields */}
      <div style={{ maxWidth: 580, margin: '0 auto', padding: '26px 20px 120px' }}>
        {sec.fields.map(f => (
          <Field key={f.id} f={f} form={form} onChange={handleChange} errors={errors} />
        ))}
      </div>

      {/* Navigation */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, background: '#fff',
        borderTop: `0.5px solid ${C.g3}`, padding: '14px 20px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        boxSizing: 'border-box', zIndex: 10,
      }}>
        <button
          onClick={prev}
          disabled={step === 0}
          style={{
            background: 'transparent', border: `1px solid ${C.g3}`, borderRadius: 8,
            padding: '10px 20px', fontSize: 14, cursor: step === 0 ? 'not-allowed' : 'pointer',
            color: step === 0 ? C.gt : C.gd, opacity: step === 0 ? .35 : 1, fontFamily: 'inherit',
          }}
        >
          ← Précédent
        </button>

        <div style={{ display: 'flex', gap: 7, alignItems: 'center' }}>
          {SECTIONS.map((_, i) => (
            <div key={i} style={{
              width: 9, height: 9, borderRadius: '50%',
              background: i === step ? sec.color : i < step ? C.green : C.g3,
              transition: 'background .25s, transform .2s',
              transform: i === step ? 'scale(1.25)' : 'scale(1)',
            }} />
          ))}
        </div>

        <button
          onClick={next}
          disabled={loading}
          style={{
            background: sec.color, color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 24px', fontSize: 14, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', minWidth: 120, fontFamily: 'inherit',
          }}
        >
          {loading ? 'Envoi…' : step === SECTIONS.length - 1 ? 'Soumettre ✓' : 'Suivant →'}
        </button>
      </div>

      {toast && <Toast t={toast} bottom={90} />}
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // THANKS
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'thanks') return (
    <div style={{ minHeight: '100vh', background: C.g1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 20 }}>
      <style>{`button:hover{opacity:.88;}button:active{transform:scale(.97);}`}</style>
      <div style={{ textAlign: 'center', maxWidth: 440, width: '100%' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#D1FAE5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 34, margin: '0 auto 22px' }}>✓</div>
        <h2 style={{ color: C.gd, fontSize: 24, fontWeight: 700, margin: '0 0 10px' }}>Réponse enregistrée !</h2>
        <p style={{ color: C.gt, fontSize: 15, lineHeight: 1.65, margin: '0 0 26px' }}>
          Votre saisie semestrielle a été transmise avec succès et intégrée dans le tableau de consolidation de la Direction GSMI.
        </p>
        <div style={{ background: '#EFF6FF', borderRadius: 10, padding: '14px 18px', borderLeft: `3px solid ${C.blue}`, textAlign: 'left', marginBottom: 28 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#1e40af', lineHeight: 1.6 }}>
            La Direction peut accéder aux données consolidées et les exporter en Excel depuis l'espace Administration (code : <strong>GSMI2025</strong>).
          </p>
        </div>
        <button
          onClick={() => setView('home')}
          style={{ background: C.blue, color: '#fff', border: 'none', borderRadius: 10, padding: '13px 30px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          Retour à l'accueil
        </button>
      </div>
    </div>
  )

  // ═══════════════════════════════════════════════════════════════════════
  // ADMIN
  // ═══════════════════════════════════════════════════════════════════════
  if (view === 'admin') {
    if (!adminOk) return (
      <div style={{ minHeight: '100vh', background: C.g1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <style>{`button:hover{opacity:.88;}button:active{transform:scale(.97);}input:focus{outline:none;border-color:#1A56DB!important;box-shadow:0 0 0 3px #1A56DB22;}`}</style>
        <div style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 14, padding: '32px 28px', width: '100%', maxWidth: 340 }}>
          <div style={{ width: 52, height: 52, borderRadius: 12, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, marginBottom: 18 }}>🔒</div>
          <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 700, color: C.gd }}>Accès Direction GSMI</h2>
          <p style={{ margin: '0 0 20px', fontSize: 13, color: C.gt }}>Entrez le code d'accès administrateur</p>
          <input
            type="password"
            value={adminCode}
            onChange={e => setAdminCode(e.target.value)}
            placeholder="Code d'accès..."
            style={{ width: '100%', padding: '11px 14px', border: `1.5px solid ${C.g3}`, borderRadius: 8, fontSize: 15, boxSizing: 'border-box', marginBottom: 12, fontFamily: 'inherit', color: C.gd, background: '#fff', transition: 'border-color .15s, box-shadow .15s' }}
            onKeyDown={e => e.key === 'Enter' && (adminCode === ADMIN_CODE ? setAdminOk(true) : showToast('Code incorrect', 'error'))}
          />
          <button
            onClick={() => adminCode === ADMIN_CODE ? setAdminOk(true) : showToast('Code incorrect', 'error')}
            style={{ width: '100%', background: C.navy, color: '#fff', border: 'none', borderRadius: 8, padding: '12px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginBottom: 10, fontFamily: 'inherit' }}
          >
            Accéder au tableau de bord
          </button>
          <button
            onClick={() => setView('home')}
            style={{ width: '100%', background: 'transparent', color: C.gt, border: 'none', fontSize: 13, cursor: 'pointer', padding: 6, fontFamily: 'inherit' }}
          >
            ← Retour à l'accueil
          </button>
        </div>
        {toast && <Toast t={toast} />}
      </div>
    )

    // Dashboard
    const totPub   = subs.reduce((a, s) => a + (+s.pub_acceptees || 0), 0)
    const totProj  = subs.reduce((a, s) => a + (+s.projets_obtenus || 0), 0)
    const totBudg  = subs.reduce((a, s) => a + (+s.budget_mad || 0), 0)
    const totH     = subs.reduce((a, s) => a + (+s.h_initiale || 0) + (+s.h_executive || 0) + (+s.h_doctorale || 0), 0)
    const totCit   = subs.reduce((a, s) => a + (+s.citations || 0), 0)

    return (
      <div style={{ minHeight: '100vh', background: C.g1, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        <style>{`button:hover{opacity:.88;}button:active{transform:scale(.97);}`}</style>

        {/* Header */}
        <div style={{ background: C.navy, padding: '22px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <p style={{ color: C.gold, fontSize: 11, letterSpacing: '.12em', margin: '0 0 4px', textTransform: 'uppercase', fontWeight: 600 }}>
              GSMI — Dashboard Direction
            </p>
            <h1 style={{ color: '#fff', fontSize: 19, fontWeight: 700, margin: 0 }}>
              Consolidation des carnets du chercheur
            </h1>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              onClick={refreshSubs}
              disabled={syncing}
              style={{ background: 'transparent', color: '#8899BB', border: '1.5px solid #2D3F55', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {syncing ? '⟳ Sync…' : '↻ Actualiser'}
            </button>
            <button
              onClick={handleExport}
              style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ⬇ Exporter Excel
            </button>
            <button
              onClick={() => { setAdminOk(false); setAdminCode(''); setView('home') }}
              style={{ background: 'transparent', color: '#8899BB', border: '1.5px solid #2D3F55', borderRadius: 8, padding: '9px 14px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
            >
              Déconnexion
            </button>
          </div>
        </div>

        <div style={{ maxWidth: 1040, margin: '0 auto', padding: '24px 18px' }}>

          {/* KPI cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(168px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { label: 'Réponses reçues',      value: subs.length,                         color: C.blue,   icon: '📥' },
              { label: 'Publications acceptées', value: totPub,                             color: C.teal,   icon: '📄' },
              { label: 'Citations totales',      value: totCit,                             color: '#7C3AED', icon: '🔗' },
              { label: 'Projets obtenus',        value: totProj,                            color: C.green,  icon: '🏆' },
              { label: 'Budget total (MAD)',      value: totBudg.toLocaleString('fr-MA'),   color: C.orange, icon: '💰' },
              { label: 'Heures formation',        value: totH + ' h',                        color: C.violet, icon: '🎓' },
            ].map(k => (
              <div key={k.label} style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 12, padding: '16px 18px', borderTop: `3px solid ${k.color}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 16 }}>{k.icon}</span>
                  <p style={{ margin: 0, fontSize: 12, color: C.gt, lineHeight: 1.3 }}>{k.label}</p>
                </div>
                <p style={{ margin: 0, fontSize: 24, fontWeight: 700, color: C.gd }}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* Table */}
          {subs.length === 0 ? (
            <div style={{ background: '#fff', border: `0.5px solid ${C.g3}`, borderRadius: 12, padding: '56px 24px', textAlign: 'center' }}>
              <p style={{ fontSize: 24, margin: '0 0 12px' }}>📭</p>
              <p style={{ color: C.gd, fontSize: 16, fontWeight: 500, margin: '0 0 8px' }}>Aucune réponse reçue</p>
              <p style={{ color: C.gt, fontSize: 14, margin: 0 }}>Partagez l'URL de l'application avec les 30 professeurs GSMI.</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto', borderRadius: 12, border: `0.5px solid ${C.g3}`, background: '#fff' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, minWidth: 760 }}>
                <thead>
                  <tr style={{ background: C.navy }}>
                    {['#', 'Nom', 'Semestre', 'Grade', 'Pub. acc.', 'Citations', 'Projets', 'H. Form.', 'Statut objectifs', 'Date'].map(h => (
                      <th key={h} style={{ padding: '11px 12px', color: '#fff', fontWeight: 600, textAlign: 'left', whiteSpace: 'nowrap', fontSize: 11, letterSpacing: '.02em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s, i) => {
                    const st = s.statut_obj || '—'
                    const sc = st.includes('atteints') ? C.green : st.includes('Partiel') ? C.orange : st.includes('Non') ? C.red : C.gt
                    return (
                      <tr key={i} style={{ borderBottom: `0.5px solid ${C.g3}`, background: i % 2 === 0 ? '#fff' : C.g1 }}>
                        <td style={{ padding: '10px 12px', color: C.gt, fontWeight: 500 }}>{i + 1}</td>
                        <td style={{ padding: '10px 12px', fontWeight: 600, color: C.gd, whiteSpace: 'nowrap' }}>{s.nom || '—'}</td>
                        <td style={{ padding: '10px 12px', color: C.gd, fontSize: 12, whiteSpace: 'nowrap' }}>{s.semestre || '—'}</td>
                        <td style={{ padding: '10px 12px', color: C.gt, fontSize: 11 }}>{s.grade || '—'}</td>
                        <td style={{ padding: '10px 12px', color: C.gd, textAlign: 'center', fontWeight: 600 }}>{s.pub_acceptees || 0}</td>
                        <td style={{ padding: '10px 12px', color: C.gd, textAlign: 'center' }}>{s.citations || 0}</td>
                        <td style={{ padding: '10px 12px', color: C.gd, textAlign: 'center', fontWeight: 600 }}>{s.projets_obtenus || 0}</td>
                        <td style={{ padding: '10px 12px', color: C.gd, textAlign: 'center' }}>
                          {(+s.h_initiale || 0) + (+s.h_executive || 0) + (+s.h_doctorale || 0)} h
                        </td>
                        <td style={{ padding: '10px 12px' }}>
                          <span style={{ background: sc + '18', color: sc, fontSize: 11, padding: '3px 9px', borderRadius: 10, fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {st.length > 24 ? st.slice(0, 24) + '…' : st}
                          </span>
                        </td>
                        <td style={{ padding: '10px 12px', color: C.gt, fontSize: 11, whiteSpace: 'nowrap' }}>
                          {s.timestamp ? new Date(s.timestamp).toLocaleDateString('fr-MA') : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {subs.length > 0 && (
            <div style={{ marginTop: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <p style={{ fontSize: 12, color: C.gt, margin: 0 }}>
                {subs.length} réponse{subs.length !== 1 ? 's' : ''} · Export Excel avec 3 onglets : Données brutes, Dashboard agrégé, Suivi réponses
              </p>
              <button
                onClick={handleClear}
                style={{ background: 'transparent', color: C.gt, border: `0.5px solid ${C.g3}`, borderRadius: 8, padding: '7px 14px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit' }}
              >
                Effacer toutes les données
              </button>
            </div>
          )}
        </div>

        {toast && <Toast t={toast} />}
      </div>
    )
  }

  return null
}
