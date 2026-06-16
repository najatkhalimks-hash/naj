/**
 * GSMI Storage
 * 
 * Stockage des données dans localStorage.
 * 
 * Pour connecter Google Sheets et partager les données entre appareils :
 * 1. Créer un Google Apps Script (voir README.md)
 * 2. Ajouter la variable VITE_APPS_SCRIPT_URL dans les settings Vercel
 */

const LOCAL_KEY = 'gsmi_submissions_v2'

// Récupérer l'URL du script Google si configurée
function getScriptUrl() {
  try {
    return import.meta.env.VITE_APPS_SCRIPT_URL || null
  } catch {
    return null
  }
}

export async function saveSubmission(fieldIds, values) {
  // Construire l'objet soumission
  const entry = { timestamp: new Date().toISOString() }
  fieldIds.forEach((id, i) => { entry[id] = values[i] })

  // Charger les soumissions existantes
  const all = loadLocal()
  all.push(entry)

  // Sauvegarder en local
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(all))
  } catch (e) {
    console.error('localStorage error:', e)
  }

  // Envoyer vers Google Sheets si configuré
  const scriptUrl = getScriptUrl()
  if (scriptUrl) {
    try {
      const headers = ['Horodatage', ...fieldIds]
      const row = [entry.timestamp, ...values]
      await fetch(scriptUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ headers, row }),
      })
    } catch (err) {
      console.warn('Google Sheets sync failed, données sauvées localement:', err)
    }
  }

  return all
}

export async function loadSubmissions() {
  const scriptUrl = getScriptUrl()
  if (scriptUrl) {
    try {
      const r = await fetch(scriptUrl)
      const data = await r.json()
      if (data.rows && data.rows.length > 1) {
        const [headers, ...rows] = data.rows
        return rows.map(row => {
          const obj = {}
          headers.forEach((h, i) => { obj[h] = row[i] })
          return obj
        })
      }
    } catch {
      // Fallback vers localStorage
    }
  }
  return loadLocal()
}

function loadLocal() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || '[]')
  } catch {
    return []
  }
}

export function clearSubmissions() {
  try {
    localStorage.removeItem(LOCAL_KEY)
  } catch {}
}
