# Carnet du Chercheur — GSMI / UM6P

Application web de saisie semestrielle des activités de recherche pour les 30 professeurs GSMI.

---

## Déploiement en 5 minutes sur Vercel (recommandé)

### Prérequis
- Compte GitHub gratuit : https://github.com
- Compte Vercel gratuit : https://vercel.com (connexion avec GitHub)
- Node.js ≥ 18 installé localement

### Étapes

**1. Créer le repository GitHub**
```bash
cd gsmi-carnet
git init
git add .
git commit -m "Initial commit — GSMI Carnet du Chercheur"
```
Aller sur github.com → New repository → Nom : `gsmi-carnet` → Create
```bash
git remote add origin https://github.com/VOTRE_USERNAME/gsmi-carnet.git
git push -u origin main
```

**2. Déployer sur Vercel**
1. Aller sur vercel.com → Add New Project
2. Importer le repository `gsmi-carnet`
3. Framework Preset : **Vite** (détecté automatiquement)
4. Ajouter les variables d'environnement :
   - `VITE_ADMIN_CODE` = votre code secret (ex: `GSMI_DIR_2025`)
   - `VITE_APPS_SCRIPT_URL` = URL Google Apps Script (optionnel, voir ci-dessous)
5. Cliquer **Deploy**

✅ L'URL générée (ex: `https://gsmi-carnet.vercel.app`) est votre lien à partager !

---

## Configuration Google Sheets (recommandé pour la persistance)

Sans Google Sheets, les données sont stockées dans le localStorage de chaque navigateur Direction (donc visibles uniquement depuis ce navigateur).

**Avec Google Sheets**, chaque soumission est immédiatement écrite dans un tableur partagé — accessible depuis n'importe quel appareil.

### Configuration Google Apps Script

1. Créer un Google Sheet : nommer "GSMI_Consolidation_[Année]"
2. Extensions → Apps Script → Coller le code suivant :

```javascript
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Données') || ss.getActiveSheet();
  const data = JSON.parse(e.postData.contents);
  
  // Ajouter l'en-tête si le sheet est vide
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(data.headers);
    // Formater l'en-tête
    const headerRange = sheet.getRange(1, 1, 1, data.headers.length);
    headerRange.setBackground('#0D1B2A');
    headerRange.setFontColor('#FFFFFF');
    headerRange.setFontWeight('bold');
  }
  
  sheet.appendRow(data.row);
  
  return ContentService
    .createTextOutput(JSON.stringify({ ok: true, row: sheet.getLastRow() }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('Données') || ss.getActiveSheet();
  const rows = sheet.getDataRange().getValues();
  
  return ContentService
    .createTextOutput(JSON.stringify({ rows }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

3. Déployer → Nouvelle déploiement → Type : **Application Web**
   - Exécuter en tant que : **Moi**
   - Qui a accès : **Tout le monde**
4. Copier l'URL de déploiement
5. Dans Vercel : Settings → Environment Variables → Ajouter `VITE_APPS_SCRIPT_URL` = l'URL copiée
6. Redéployer (Deployments → Redeploy)

---

## Structure du projet

```
gsmi-carnet/
├── index.html              # Point d'entrée HTML
├── vite.config.js          # Configuration Vite
├── package.json            # Dépendances
├── vercel.json             # Configuration déploiement Vercel
├── .env.example            # Variables d'environnement (template)
├── .gitignore
└── src/
    ├── main.jsx            # Point d'entrée React
    ├── App.jsx             # Application principale (4 vues)
    ├── sections.js         # Définition des 5 sections et 45 questions
    ├── storage.js          # Gestion données (localStorage + Google Sheets)
    └── export.js           # Export Excel 3 onglets (SheetJS)
```

---

## Fonctionnalités

### Pour les professeurs (lien public)
- Formulaire en 5 sections (45 questions)
- Navigation progressive avec validation
- Listes déroulantes pour tous les champs catégoriels
- Confirmation de soumission instantanée
- Compatible mobile, tablette et desktop

### Pour la Direction (code : GSMI2025 ou votre code)
- Dashboard temps réel avec 6 KPI agrégés
- Tableau de toutes les soumissions
- Bouton "Actualiser" pour synchro Google Sheets
- Export Excel avec 3 onglets :
  - **Données brutes** : toutes les réponses, toutes les colonnes
  - **Dashboard agrégé** : KPI calculés automatiquement
  - **Suivi réponses** : qui a répondu et quand

---

## Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `VITE_ADMIN_CODE` | Code d'accès Direction | `GSMI2025` |
| `VITE_APPS_SCRIPT_URL` | URL Google Apps Script | vide (localStorage) |

---

## Développement local

```bash
npm install
cp .env.example .env
# Éditer .env avec vos valeurs
npm run dev
# → http://localhost:5173
```

## Build de production

```bash
npm run build
# → dossier dist/ prêt à déployer
```

---

## Support

Direction de la Recherche — GSMI / UM6P  
direction-recherche@gsmi.um6p.ma
