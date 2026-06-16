import * as XLSX from 'xlsx'
import { FIELD_IDS, FIELD_LABELS } from './sections.js'

const C = {
  NAVY:   '0D1B2A',
  BLUE:   '1A56DB',
  TEAL:   '047481',
  GREEN:  '057A55',
  VIOLET: '5521B5',
  ORANGE: 'B45309',
  WHITE:  'FFFFFF',
  LIGHT:  'F3F4F6',
  GOLD:   'FBBF24',
}

function cellStyle(bold = false, bg = C.WHITE, fg = '111928', align = 'left') {
  return {
    font: { name: 'Calibri', bold, sz: 10, color: { rgb: fg } },
    fill: { patternType: 'solid', fgColor: { rgb: bg } },
    alignment: { horizontal: align, vertical: 'center', wrapText: true },
    border: {
      top:    { style: 'thin', color: { rgb: 'E5E7EB' } },
      bottom: { style: 'thin', color: { rgb: 'E5E7EB' } },
      left:   { style: 'thin', color: { rgb: 'E5E7EB' } },
      right:  { style: 'thin', color: { rgb: 'E5E7EB' } },
    },
  }
}

export function exportToExcel(submissions) {
  const wb = XLSX.utils.book_new()

  // ── Sheet 1 : Données brutes ──────────────────────────────────────────
  const headers = ['Horodatage', 'Nom', 'Email', 'Grade', 'Semestre', 'ORCID',
    ...FIELD_LABELS.slice(5)]  // skip first 5 (already named above)

  const allHeaders = ['Horodatage', ...FIELD_LABELS]

  const wsData = [allHeaders]
  submissions.forEach(s => {
    wsData.push([
      s.timestamp ? new Date(s.timestamp).toLocaleString('fr-MA') : '',
      ...FIELD_IDS.map(id => s[id] ?? ''),
    ])
  })

  const ws1 = XLSX.utils.aoa_to_sheet(wsData)

  // Style header row
  const range = XLSX.utils.decode_range(ws1['!ref'])
  for (let C_ = range.s.c; C_ <= range.e.c; C_++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C_ })
    if (!ws1[addr]) continue
    ws1[addr].s = cellStyle(true, C.NAVY, C.WHITE, 'center')
  }
  // Style data rows
  for (let R = 1; R <= range.e.r; R++) {
    const bg = R % 2 === 0 ? C.LIGHT : C.WHITE
    for (let C_ = range.s.c; C_ <= range.e.c; C_++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C_ })
      if (!ws1[addr]) ws1[addr] = { v: '', t: 's' }
      ws1[addr].s = cellStyle(false, bg, '111928', C_ === 0 ? 'left' : 'center')
    }
  }

  // Column widths
  ws1['!cols'] = [
    { wch: 20 }, // Horodatage
    { wch: 22 }, // Nom
    { wch: 26 }, // Email
    { wch: 20 }, // Grade
    { wch: 16 }, // Semestre
    { wch: 18 }, // ORCID
    ...Array(FIELD_IDS.length - 5).fill({ wch: 16 }),
  ]
  ws1['!rows'] = [{ hpt: 28 }, ...Array(submissions.length).fill({ hpt: 20 })]

  XLSX.utils.book_append_sheet(wb, ws1, '📊 Données brutes')

  // ── Sheet 2 : Tableau de bord agrégé ─────────────────────────────────
  const kpiRows = [
    ['', 'TABLEAU DE BORD — GSMI', '', ''],
    ['', `Exporté le ${new Date().toLocaleDateString('fr-MA')}`, '', ''],
    [''],
    ['Indicateur', 'Valeur agrégée', 'Détail', ''],
    ['Réponses reçues',          submissions.length,                                       'Total soumissions', ''],
    ['Publications acceptées',   submissions.reduce((a, s) => a + (+s.pub_acceptees || 0), 0), 'Somme', ''],
    ['Publications Q1/Q2',       submissions.reduce((a, s) => a + (+s.pub_q1q2 || 0), 0),      'Somme', ''],
    ['Citations totales',        submissions.reduce((a, s) => a + (+s.citations || 0), 0),      'Somme Scopus', ''],
    ['Open Access',              submissions.reduce((a, s) => a + (+s.open_access || 0), 0),    'Somme', ''],
    ['Projets soumis',           submissions.reduce((a, s) => a + (+s.projets_soumis || 0), 0), 'Somme', ''],
    ['Projets obtenus',          submissions.reduce((a, s) => a + (+s.projets_obtenus || 0), 0),'Somme', ''],
    ['Budget total obtenu (MAD)',submissions.reduce((a, s) => a + (+s.budget_mad || 0), 0).toLocaleString('fr-MA'), 'Somme MAD', ''],
    ['Conférences internationales',submissions.reduce((a, s) => a + (+s.conferences_int || 0), 0),'Somme', ''],
    ['Brevets déposés',          submissions.reduce((a, s) => a + (+s.brevets_deposes || 0), 0), 'Somme', ''],
    ['Brevets acceptés',         submissions.reduce((a, s) => a + (+s.brevets_acceptes || 0), 0),'Somme', ''],
    ['H. Formation initiale',    submissions.reduce((a, s) => a + (+s.h_initiale || 0), 0),      'Somme heures', ''],
    ['H. Formation exécutive',   submissions.reduce((a, s) => a + (+s.h_executive || 0), 0),     'Somme heures', ''],
    ['H. Formation doctorale',   submissions.reduce((a, s) => a + (+s.h_doctorale || 0), 0),     'Somme heures', ''],
    ['Doctorants encadrés',      submissions.reduce((a, s) => a + (+s.doctorants || 0), 0),      'Somme', ''],
    ['PFE / Masters encadrés',   submissions.reduce((a, s) => a + (+s.pfe || 0), 0),             'Somme', ''],
    ['Nb. prestations',          submissions.reduce((a, s) => a + (+s.nb_presta || 0), 0),       'Somme', ''],
    ['Revenus prestations (MAD)',submissions.reduce((a, s) => a + (+s.revenus_mad || 0), 0).toLocaleString('fr-MA'), 'Somme MAD', ''],
  ]

  const ws2 = XLSX.utils.aoa_to_sheet(kpiRows)
  ws2['A1'].s = cellStyle(true, C.NAVY, C.WHITE, 'center')
  ws2['B1'].s = cellStyle(true, C.NAVY, C.WHITE, 'left')
  ws2['A2'].s = cellStyle(false, C.NAVY, '8899BB', 'left')
  ws2['B2'].s = cellStyle(false, C.NAVY, '8899BB', 'left')
  ws2['A4'].s = cellStyle(true, C.TEAL, C.WHITE, 'center')
  ws2['B4'].s = cellStyle(true, C.TEAL, C.WHITE, 'center')
  ws2['C4'].s = cellStyle(true, C.TEAL, C.WHITE, 'center')

  for (let R = 4; R < kpiRows.length; R++) {
    const bg = R % 2 === 0 ? C.LIGHT : C.WHITE
    ;['A', 'B', 'C'].forEach(col => {
      const addr = `${col}${R + 1}`
      if (!ws2[addr]) ws2[addr] = { v: '', t: 's' }
      ws2[addr].s = cellStyle(R === 4, bg, '111928', col === 'B' ? 'center' : 'left')
    })
  }

  ws2['!cols'] = [{ wch: 30 }, { wch: 22 }, { wch: 18 }]
  ws2['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
  ]

  XLSX.utils.book_append_sheet(wb, ws2, '📈 Dashboard agrégé')

  // ── Sheet 3 : Suivi des réponses ─────────────────────────────────────
  const received = new Set(submissions.map(s => s.nom?.toLowerCase()))
  const suiviData = [
    ['Professeur', 'Statut', 'Semestre soumis', 'Date de soumission', 'Email'],
    ...submissions.map(s => [
      s.nom || '—',
      '✅ Répondu',
      s.semestre || '—',
      s.timestamp ? new Date(s.timestamp).toLocaleDateString('fr-MA') : '—',
      s.email || '—',
    ]),
  ]

  const ws3 = XLSX.utils.aoa_to_sheet(suiviData)
  const r3 = XLSX.utils.decode_range(ws3['!ref'])
  for (let C_ = r3.s.c; C_ <= r3.e.c; C_++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: C_ })
    if (ws3[addr]) ws3[addr].s = cellStyle(true, C.GREEN, C.WHITE, 'center')
  }
  for (let R = 1; R <= r3.e.r; R++) {
    for (let C_ = r3.s.c; C_ <= r3.e.c; C_++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C_ })
      if (!ws3[addr]) ws3[addr] = { v: '', t: 's' }
      ws3[addr].s = cellStyle(false, R % 2 === 0 ? C.LIGHT : C.WHITE, '111928', 'left')
    }
  }
  ws3['!cols'] = [{ wch: 24 }, { wch: 14 }, { wch: 16 }, { wch: 18 }, { wch: 26 }]

  XLSX.utils.book_append_sheet(wb, ws3, '✅ Suivi réponses')

  // Écriture et téléchargement
  const date = new Date().toISOString().slice(0, 10)
  XLSX.writeFile(wb, `GSMI_Consolidation_${date}.xlsx`)
}
