'use strict';

// ═══════════════════════════════════════════════════════
// CHARGEMENT DE SCRIPTS À LA DEMANDE (perf : démarrage plus rapide)
// ═══════════════════════════════════════════════════════
const _scriptCache = {};
function loadScriptOnce(src) {
  if (_scriptCache[src]) return _scriptCache[src];
  _scriptCache[src] = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => { delete _scriptCache[src]; reject(new Error('Échec du chargement de ' + src)); };
    document.head.appendChild(s);
  });
  return _scriptCache[src];
}
// Chart.js : chargé uniquement quand on ouvre Accueil ou Stats
function ensureChart() {
  if (typeof Chart !== 'undefined') return Promise.resolve();
  return loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.js');
}
// SheetJS : chargé uniquement lors d'un export Excel
function ensureXLSX() {
  if (typeof XLSX !== 'undefined') return Promise.resolve();
  return loadScriptOnce('https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js');
}

// ═══════════════════════════════════════════════════════
// CONFIG & CONSTANTES
// ═══════════════════════════════════════════════════════
const MOIS_KEYS = ['jan','fev','mar','avr','mai','jun','jul','aou','sep','oct','nov','dec'];
const MOIS_FR   = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];
const MOIS_COURT= ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc'];

const CAT_ICONS = {
  'Habitation':'🏠','Assurances':'🛡️','Véhicules':'🚗','Véhicule':'🚗','Voiture':'🚗',
  'Salaire':'💼','Banque postale':'🏦','BanqueDistributeur':'🏧','Mutuelle':'💊',
  'Courses':'🛒','Carburant':'⛽','Impôts':'📋','Achats Internet':'🛍️','Achats divers':'🛒',
  'Loisirs':'🎭','Restaurants sur place et à emporter':'🍽️','Coiffeur':'✂️',
  'Dépenses de santé':'🏥','Remboursement santé':'💰','Habillement':'👕',
  'Ameublement':'🛋️','Autoroute':'🛣️','Virement':'💸','Cadeaux':'🎁',
  'Imprévus':'⚡','Dépôt d\'argent':'💰','Ongles':'💅','Carburant':'⛽',
};

// ── Thèmes de couleur d'accent ─────────────────────────
const THEMES = {
  bleu:      { nom: 'Bleu',      dark: '#1E3A8A', primary: '#1E40AF', mid: '#2563EB', light: '#EFF6FF' },
  indigo:    { nom: 'Indigo',    dark: '#312E81', primary: '#4338CA', mid: '#6366F1', light: '#EEF2FF' },
  violet:    { nom: 'Violet',    dark: '#5B21B6', primary: '#6D28D9', mid: '#8B5CF6', light: '#F5F3FF' },
  turquoise: { nom: 'Turquoise', dark: '#155E75', primary: '#0E7490', mid: '#06B6D4', light: '#ECFEFF' },
  vert:      { nom: 'Vert',      dark: '#065F46', primary: '#047857', mid: '#10B981', light: '#ECFDF5' },
  ambre:     { nom: 'Ambre',     dark: '#92400E', primary: '#B45309', mid: '#F59E0B', light: '#FFFBEB' },
  bordeaux:  { nom: 'Bordeaux',  dark: '#881337', primary: '#9F1239', mid: '#E11D48', light: '#FFF1F2' },
  rose:      { nom: 'Rose',      dark: '#9D174D', primary: '#BE185D', mid: '#EC4899', light: '#FDF2F8' },
  ardoise:   { nom: 'Ardoise',   dark: '#0F172A', primary: '#334155', mid: '#64748B', light: '#F1F5F9' },
};
function getThemeKey() {
  return (state.parametres && state.parametres['theme_accent'])
    || localStorage.getItem('theme_accent') || 'bleu';
}
function applyTheme(key) {
  const t = THEMES[key] || THEMES.bleu;
  const r = document.documentElement.style;
  r.setProperty('--primary',      t.primary);
  r.setProperty('--primary-mid',  t.mid);
  r.setProperty('--primary-dark', t.dark);
  r.setProperty('--primary-light',t.light);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.dark);
}
async function setTheme(key) {
  localStorage.setItem('theme_accent', key);
  applyTheme(key);
  if (sb) await setParam('theme_accent', key);
  navigate('parametres');
}

// ── Mode sombre (auto / light / dark) ─────────────────────
function getDarkMode() { return localStorage.getItem('dark_mode') || 'auto'; }
function applyDarkMode(mode) {
  const isDark = mode === 'dark' || (mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('theme-dark', isDark);
  // Met aussi à jour le theme-color de la barre iOS
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', isDark ? '#0F172A' : '#1F3864');
}
function setDarkMode(mode) {
  localStorage.setItem('dark_mode', mode);
  applyDarkMode(mode);
  if (state.view === 'parametres') render();
}
// Écoute les changements système si mode = auto
if (window.matchMedia) {
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getDarkMode() === 'auto') applyDarkMode('auto');
  });
}

// ── Banques (badges stylisés originaux, pas les logos déposés) ──
const BANKS = {
  lbp:        { l1: 'La Banque', l2: 'Postale',        mk: 'LBP',  c1: '#FFD200', c2: '#003781', mkBg: '#FFD200', mkFg: '#003781' },
  ca:         { l1: 'Crédit',    l2: 'Agricole',       mk: 'CA',   c1: '#009639', c2: '#006A4E', mkBg: '#009639', mkFg: '#FFFFFF' },
  bnp:        { l1: 'BNP',       l2: 'Paribas',        mk: 'BNP',  c1: '#00915A', c2: '#007A4D', mkBg: '#00915A', mkFg: '#FFFFFF' },
  sg:         { l1: 'Société',   l2: 'Générale',       mk: 'SG',   c1: '#E60028', c2: '#1A1A1A', mkBg: '#1A1A1A', mkFg: '#E60028' },
  cm:         { l1: 'Crédit',    l2: 'Mutuel',         mk: 'CM',   c1: '#005DAA', c2: '#003B73', mkBg: '#005DAA', mkFg: '#FFFFFF' },
  ce:         { l1: "Caisse",    l2: "d'Épargne",      mk: 'CE',   c1: '#E2001A', c2: '#9E0011', mkBg: '#E2001A', mkFg: '#FFFFFF' },
  lcl:        { l1: 'LCL',       l2: 'Le Crédit Lyon.',mk: 'LCL',  c1: '#005EB8', c2: '#003B73', mkBg: '#005EB8', mkFg: '#FFFFFF' },
  bp:         { l1: 'Banque',    l2: 'Populaire',      mk: 'BP',   c1: '#0067B1', c2: '#004680', mkBg: '#0067B1', mkFg: '#FFFFFF' },
  cic:        { l1: 'CIC',       l2: 'Banque',         mk: 'CIC',  c1: '#0F4C9A', c2: '#0A3568', mkBg: '#0F4C9A', mkFg: '#FFFFFF' },
  boursorama: { l1: 'Bourso',    l2: 'rama',           mk: 'BR',   c1: '#EC1C7D', c2: '#1A1A1A', mkBg: '#EC1C7D', mkFg: '#FFFFFF' },
  fortuneo:   { l1: 'Fortu',     l2: 'neo',            mk: 'FO',   c1: '#7DBA00', c2: '#4F7800', mkBg: '#7DBA00', mkFg: '#FFFFFF' },
  hellobank:  { l1: 'Hello',     l2: 'bank!',          mk: 'HB',   c1: '#00B5C8', c2: '#007A8A', mkBg: '#00B5C8', mkFg: '#FFFFFF' },
  n26:        { l1: 'N',         l2: '26',             mk: 'N26',  c1: '#1A1A1A', c2: '#3A3A3A', mkBg: '#1A1A1A', mkFg: '#FFFFFF' },
  revolut:    { l1: 'Revo',      l2: 'lut',            mk: 'R',    c1: '#1A1A1A', c2: '#2E6BFF', mkBg: '#2E6BFF', mkFg: '#FFFFFF' },
  monabanq:   { l1: 'Mona',      l2: 'banq',           mk: 'MB',   c1: '#E2001A', c2: '#7A2182', mkBg: '#7A2182', mkFg: '#FFFFFF' },
  axa:        { l1: 'AXA',       l2: 'Banque',         mk: 'AXA',  c1: '#00008F', c2: '#FF1721', mkBg: '#00008F', mkFg: '#FFFFFF' },
  ing:        { l1: 'ING',       l2: 'Direct',         mk: 'ING',  c1: '#FF6200', c2: '#CC4E00', mkBg: '#FF6200', mkFg: '#FFFFFF' },
  autre:      { l1: 'Mon',       l2: 'Compte',         mk: '€',    c1: '#1E3A8A', c2: '#2563EB', mkBg: '#FFFFFF', mkFg: '#1E3A8A' },
};
function getBanque() {
  return (state.parametres && state.parametres['banque'])
    || localStorage.getItem('banque') || 'lbp';
}
function getSuiviTitre() {
  return (state.parametres && state.parametres['suivi_titre'])
    || localStorage.getItem('suivi_titre')
    || 'Suivi journalier compte courant Robert et Carméla';
}
async function setSuiviTitre() {
  const inp = document.getElementById('suivi-titre-inp');
  const val = (inp && inp.value || '').trim();
  if (!val) { showToast('Le titre ne peut pas être vide', 'error'); return; }
  localStorage.setItem('suivi_titre', val);
  setSyncing(true);
  await setParam('suivi_titre', val);
  setSyncing(false);
  showToast('Titre mis à jour ✓', 'success');
  navigate('parametres');
}

// ── Comptes multiples ──────────────────────────────────
function suiviCompte(e) { return (e && e.compte) || 'courant'; }
function getComptes() {
  let s = [];
  try { s = JSON.parse(state.parametres['comptes'] || '[]'); if (!Array.isArray(s)) s = []; } catch { s = []; }
  const nomCourant = (state.parametres && state.parametres['nom_courant']) || 'Compte courant';
  return [{ id: 'courant', nom: nomCourant }, ...s];
}
async function renommerCompte(id) {
  const c = getComptes().find(x => x.id === id);
  if (!c) return;
  const nv = prompt('Nouveau nom du compte :', c.nom);
  if (nv == null) return;
  const nom = nv.trim();
  if (!nom) { showToast('Le nom ne peut pas être vide', 'error'); return; }
  if (id === 'courant') {
    await setParam('nom_courant', nom);
  } else {
    const s = getComptes().slice(1).map(x => x.id === id ? { ...x, nom } : x);
    await setParam('comptes', JSON.stringify(s));
  }
  showToast('Compte renommé ✓', 'success');
  navigate('parametres');
}
function getCompteActif() { return state.compteActif || 'courant'; }
// Compte de destination des virements d'épargne automatiques
// Règles de virement automatique : [{kw, compte}] — ordre = priorité
function getVirementsAuto() {
  let r = [];
  try { r = JSON.parse(state.parametres['virements_auto'] || '[]'); if (!Array.isArray(r)) r = []; } catch { r = []; }
  // Rétro-compatibilité : ancien réglage unique compte_epargne
  if (r.length === 0 && state.parametres && state.parametres['compte_epargne']) {
    r = [{ kw: 'epargne', compte: state.parametres['compte_epargne'] }];
  }
  return r;
}
// Trouve le compte de destination pour une opération (1ère règle qui matche)
function destinationVirement(e) {
  const t = [e && e.libelle_principal, e && e.libelle_secondaire, e && e.libelle_libre]
    .filter(Boolean).join(' ').toLowerCase();
  const secs = getComptes().slice(1).map(c => c.id);
  for (const r of getVirementsAuto()) {
    const kw = (r && r.kw || '').trim().toLowerCase();
    if (kw && r.compte && secs.includes(r.compte) && t.includes(kw)) return r.compte;
  }
  return '';
}
function nomCompteActif() {
  const c = getComptes().find(x => x.id === getCompteActif());
  return c ? c.nom : 'Compte courant';
}
function setCompteActif(id) {
  state.compteActif = id;
  localStorage.setItem('compte_actif', id);
  render();
}
async function ajouterCompte() {
  const nom = (document.getElementById('new-compte')?.value || '').trim();
  if (!nom) return;
  const s = getComptes().slice(1);
  s.push({ id: 'c' + Date.now().toString(36), nom });
  await setParam('comptes', JSON.stringify(s));
  showToast('Compte ajouté ✓', 'success');
  navigate('parametres');
}
async function ajouterVirementAuto() {
  const kw = (document.getElementById('va-kw')?.value || '').trim();
  const compte = document.getElementById('va-compte')?.value || '';
  if (!kw || !compte) { showToast('Indiquez un mot-clé et un compte', 'error'); return; }
  const r = getVirementsAuto();
  r.push({ kw, compte });
  await setParam('virements_auto', JSON.stringify(r));
  await setParam('compte_epargne', ''); // bascule vers le système de règles
  showToast('Virement automatique ajouté ✓', 'success');
  navigate('parametres');
}
async function supprimerVirementAuto(idx) {
  const r = getVirementsAuto();
  r.splice(idx, 1);
  await setParam('virements_auto', JSON.stringify(r));
  await setParam('compte_epargne', '');
  showToast('Règle supprimée');
  navigate('parametres');
}
async function supprimerCompte(id) {
  if (!confirm('Supprimer ce compte ? Ses opérations ne seront plus visibles (non supprimées de la base).')) return;
  const s = getComptes().slice(1).filter(c => c.id !== id);
  await setParam('comptes', JSON.stringify(s));
  if (state.compteActif === id) { state.compteActif = 'courant'; localStorage.setItem('compte_actif', 'courant'); }
  showToast('Compte supprimé');
  navigate('parametres');
}

function getBanqueLogo() {
  return (state.parametres && state.parametres['banque_logo']) || '';
}
// Logo compact de la banque (image importée sinon pastille initiales)
function bankMiniHTML() {
  const logo = getBanqueLogo();
  if (logo) return `<span class="ep-bank"><img src="${logo}" alt="Banque"></span>`;
  const b = BANKS[getBanque()] || BANKS.lbp;
  return `<span class="ep-bank-mk" style="background:${b.mkBg};color:${b.mkFg}">${escHtml(b.mk)}</span>`;
}
function bankBadgeHTML(key) {
  const logo = getBanqueLogo();
  if (logo) {
    return `<div class="rapp-bank-badge rapp-bank-logo"><img src="${logo}" alt="Logo banque"></div>`;
  }
  const b = BANKS[key] || BANKS.lbp;
  return `<div class="rapp-bank-badge" aria-label="Compte ${escHtml(b.l1)} ${escHtml(b.l2)}">
    <span class="rbb-mark" style="background:${b.mkBg};color:${b.mkFg}">${escHtml(b.mk)}</span>
    <span class="rbb-name"><span class="rbb-la" style="color:${b.c1}">${escHtml(b.l1)}</span><span class="rbb-postale">${escHtml(b.l2)}</span></span>
  </div>`;
}
async function setBanque(key) {
  localStorage.setItem('banque', key);
  if (sb) await setParam('banque', key);
  navigate('parametres');
}
// Import du logo PERSONNEL fourni par l'utilisateur (usage privé)
function chargerLogoBanque(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Choisissez une image', 'error'); return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = async () => {
      const maxW = 420, maxH = 160;
      let { width: w, height: h } = img;
      const ratio = Math.min(maxW / w, maxH / h, 1);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = cv.toDataURL('image/png');
      setSyncing(true);
      await setParam('banque_logo', dataUrl);
      setSyncing(false);
      showToast('Logo importé ✓', 'success');
      navigate('parametres');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
async function supprimerLogoBanque() {
  if (!confirm('Supprimer le logo importé et revenir au badge stylisé ?')) return;
  setSyncing(true);
  await sb.from('parametres').delete().eq('cle', 'banque_logo');
  delete state.parametres['banque_logo'];
  setSyncing(false);
  showToast('Logo supprimé');
  navigate('parametres');
}

// Palette catégorielle riche — sémantique (revenu vert, logement bleu, etc.)
// Ordre = priorité : la 1ère clé matchée gagne.
const CAT_COLOR_MAP = [
  ['salaire',        '#10B981'], ['retraite',     '#10B981'], ['allocation',    '#10B981'],
  ['remboursement',  '#059669'], ['dépôt',        '#059669'], ['depot',         '#059669'],
  ['habitation',     '#1E3A8A'], ['loyer',        '#1E3A8A'],
  ['courses',        '#F97316'], ['alimentation', '#F97316'],
  ['restaurant',     '#EA580C'],
  ['carburant',      '#F59E0B'], ['autoroute',    '#D97706'], ['voiture', '#D97706'], ['véhicule', '#D97706'],
  ['mutuelle',       '#EC4899'], ['santé',        '#DB2777'], ['sante', '#DB2777'], ['coiffeur', '#F472B6'], ['ongle', '#F472B6'],
  ['loisirs',        '#8B5CF6'], ['cadeau',       '#A855F7'],
  ['habillement',    '#B45309'], ['ameublement',  '#92400E'],
  ['banque',         '#0EA5E9'], ['virement',     '#0284C7'], ['distributeur', '#0284C7'],
  ['assurance',      '#6366F1'],
  ['achats',         '#DB2777'], ['internet',     '#C026D3'],
  ['impôt',          '#475569'], ['impot',        '#475569'], ['taxe', '#475569'],
  ['imprévu',        '#DC2626'], ['imprevu',      '#DC2626'],
  ['virtuelle',      '#94A3B8'],
];
function catColor(name) {
  const s = String(name || '').toLowerCase();
  for (const [kw, color] of CAT_COLOR_MAP) {
    if (s.includes(kw)) return color;
  }
  // Fallback élégant : hash → HSL douce (50% saturation, 45% lumière)
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h}, 50%, 45%)`;
}

// Règles de pictogrammes définies par l'utilisateur (Paramètres)
function getPictoRules() {
  try {
    const r = JSON.parse(state.parametres['picto_rules'] || '[]');
    return Array.isArray(r) ? r : [];
  } catch { return []; }
}

// Règles de LOGOS (vraies images) définies par l'utilisateur (Paramètres)
// Format : [{ kw, img }] où img est une data URL (base64). Stockées dans parametres.
function getLogoRules() {
  try {
    const r = JSON.parse(state.parametres['logo_rules'] || '[]');
    return Array.isArray(r) ? r : [];
  } catch { return []; }
}

// Logos attribués PAR catégorie / sous-catégorie.
// Format : { "Principal": dataUrl, "Principal␟Secondaire": dataUrl }
function getCatLogos() {
  try {
    const o = JSON.parse(state.parametres['cat_logos'] || '{}');
    return (o && typeof o === 'object' && !Array.isArray(o)) ? o : {};
  } catch { return {}; }
}
function catLogoKey(principal, secondaire) {
  const p = (principal || '').trim();
  const s = (secondaire || '').trim();
  return s ? `${p}␟${s}` : p;
}
function getCatLogo(principal, secondaire) {
  return getCatLogos()[catLogoKey(principal, secondaire)] || '';
}

// Bibliothèque de logos stockée dans la base (réutilisable).
// Format : [{ id, name, img }]
function getLogoLibrary() {
  try {
    const a = JSON.parse(state.parametres['logo_library'] || '[]');
    return Array.isArray(a) ? a : [];
  } catch { return []; }
}

// Normalisation de base : minuscules, sans accents, alphanum + espaces.
function _normBase(s) {
  return String(s || '').toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}
// Neutralise le pluriel d'un mot (>3 lettres finissant par "s").
function _singular(w) { return (w.length > 3 && w.endsWith('s')) ? w.slice(0, -1) : w; }
// Normalisation tolérante (accents, casse, pluriels) pour comparer catégories/sous-catégories.
function _normLogo(s) {
  return _normBase(s).split(' ').map(_singular).join(' ');
}
// Mots génériques (NON distinctifs d'une marque) ignorés dans le rapprochement souple.
// Évite qu'un mot commun comme « virement » ne fasse coller un logo à la mauvaise ligne.
const _LOGO_STOP = new Set([
  'voiture','voitures','contrat','entretien','assurance','assurances',
  'virement','virements','interne','externe','versement','versements',
  'prelevement','prelevements','frais','bancaire','bancaires','compte','comptes',
  'epargne','impot','impots','credit','debit','retrait','retraits','depot','depots',
  'paiement','paiements','remboursement','mensuel','annuel',
  'de','des','du','la','le','les','l','d','et','un','une','sur','pour','par','depuis','vers'
]);
// Tokens distinctifs : on filtre les génériques sur la forme de base, puis on neutralise le pluriel.
function _logoTokens(s) {
  return _normBase(s).split(' ').filter(t => t && !_LOGO_STOP.has(t)).map(_singular);
}

// Renvoie la data URL du logo d'une opération.
// Priorité : sous-catégorie exacte → marque proche (même catégorie) → catégorie → mot-clé.
// La comparaison ignore accents, casse, pluriels et ponctuation.
function entryLogo(o) {
  const p = (o && o.libelle_principal) || '';
  const s = (o && o.libelle_secondaire) || '';
  const cats = getCatLogos();
  const np = _normLogo(p), ns = _normLogo(s);
  let exactSub = '', exactCat = '';
  const sameCatSubs = []; // sous-cat de la même catégorie ayant un logo
  for (const [key, img] of Object.entries(cats)) {
    if (!img) continue;
    const parts = key.split('␟');
    if (_normLogo(parts[0]) !== np) continue;
    const ks = parts.length > 1 ? _normLogo(parts[1]) : '';
    if (!ks) { if (!exactCat) exactCat = img; continue; }
    if (ks === ns && !exactSub) exactSub = img;
    sameCatSubs.push({ tokens: _logoTokens(parts[1]), img });
  }
  if (exactSub) return exactSub;
  // Rapprochement par marque : meilleure intersection de mots avec les sous-cat de la même catégorie
  if (ns) {
    const opTok = _logoTokens(s);
    let best = '', bestScore = 0;
    for (const c of sameCatSubs) {
      const score = c.tokens.filter(t => opTok.includes(t)).length;
      if (score > bestScore) { bestScore = score; best = c.img; }
    }
    if (best && bestScore >= 1) return best;
  }
  if (exactCat) return exactCat;
  // Repli par mot-clé (contient, normalisé)
  const txt = _normLogo([s, o && o.libelle_libre, p].filter(Boolean).join(' '));
  for (const r of getLogoRules()) {
    const kw = _normLogo(r && r.kw || '');
    if (kw && r.img && txt.includes(kw)) return r.img;
  }
  return '';
}

// Pictogramme précis : différencie notamment les véhicules par leur libellé
function entryIcon(o) {
  const txt = [o && o.libelle_secondaire, o && o.libelle_libre, o && o.libelle_principal]
    .filter(Boolean).join(' ').toLowerCase();
  // Règles personnalisées (prioritaires) — définies dans Paramètres
  for (const r of getPictoRules()) {
    const kw = (r && r.kw || '').trim().toLowerCase();
    if (kw && r.emoji && txt.includes(kw)) return r.emoji;
  }
  // Préfixe : icône de la catégorie principale (ex. 🛡️ Assurances) devant la voiture
  // (pas pour les catégories déjà "véhicule" pour éviter une voiture en double)
  const p = (o && o.libelle_principal) || '';
  let prefix = (CAT_ICONS[p] && !/v[ée]hicul|voiture/i.test(p))
    ? CAT_ICONS[p] + ' ' : '';
  if (/entretien/.test(txt)) prefix = '🔧 ';                                                     // contrat d'entretien : clé à molette
  if (txt.includes('yaris') || txt.includes('toyota')) return prefix + carSVG('#2563EB', 'Toyota Yaris'); // bleu
  if (txt.includes('mercedes'))                        return prefix + carSVG('#DC2626', 'Mercedes');     // rouge
  if (/\beau\b/.test(txt) || txt.includes('sebvf'))    return '🏠🚰';                            // eau : maison + robinet
  if (/\b(electricit|électricit|uem|edf)\w*/.test(txt)) return '🏠💡';                           // électricité : maison + ampoule
  if (/\bgaz\b/.test(txt))                              return '🏠🛢️';                           // gaz : maison + bouteille
  if (/\bprixtel\b/.test(txt))                          return '🏠🥷';                           // Prixtel : maison + homme masqué
  if (/\b(freebox|livebox|box)\b/.test(txt))            return '🏠📡';                           // box internet : maison + antenne
  if (/\b(free\s*mobile|mobile|forfait|sfr|orange|bouygues)\b/.test(txt)) return '🏠📱';          // mobile : maison + téléphone
  if (/\b(retraite|gendarmerie|chomage|chômage|salaire|gemo|gémo)\b/.test(txt)) return '💼💵';   // revenu : billet de banque
  if (/\b(impot|impôt|impots|impôts|taxe|taxes|fonciere|foncière)\b/.test(txt)) return '📋🤲';   // impôts : main tendue
  if (/versement/.test(txt))                            return '🫗';                              // versement : cruche qu'on déverse
  if (/retrait/.test(txt))                              return '🏧';                              // retrait : distributeur de banque
  if (/pr[ée]l[èe]vement/.test(txt))                    return '💉';                              // prélèvement : seringue
  if (/ch[èe]que/.test(txt)) {
    if (txt.includes('carmela') || txt.includes('carméla')) return '📗';                          // chèque Carméla : chéquier vert
    return '📘';                                                                                   // chèque Robert : chéquier bleu
  }
  if (txt.includes('paypal')) return paypalSVG(/4\s*x|4x|4 fois|4 ?éch/.test(txt));
  if (/\b(visa|mastercard|carte bancaire|carte visa|cb robert|cb carmela)\b/.test(txt) || /\bcarte\b/.test(txt)) {
    let c1 = '#1E3A8A', c2 = '#2563EB';                              // défaut : bleu
    if (txt.includes('platin')) {                                    // Platinium : argentée
      c1 = '#64748B'; c2 = '#CBD5E1';
    } else if (txt.includes('premier') && txt.includes('boursorama')) { // Premier Boursorama : noire
      c1 = '#0B0B0F'; c2 = '#3A3A42';
    } else if (txt.includes('premier') || txt.includes('gold')) {    // Premier (Carméla…) : dorée
      c1 = '#B45309'; c2 = '#F4D03F';
    }
    return cardSVG(c1, c2);
  }
  return CAT_ICONS[o && o.libelle_principal] || '💳';
}

// Carte bancaire stylisée (dessin original — pas un logo de marque)
function cardSVG(c1, c2) {
  const id = 'cg' + Math.random().toString(36).slice(2, 7);
  return `<svg class="card-svg" viewBox="0 0 36 24" width="30" height="20" role="img" aria-label="Carte bancaire">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/>
    </linearGradient></defs>
    <rect x="1" y="2" width="34" height="20" rx="3" fill="url(#${id})"/>
    <rect x="1" y="6" width="34" height="3.5" fill="rgba(0,0,0,.35)"/>
    <rect x="4" y="12.5" width="6" height="4.5" rx="1" fill="#F4D03F"/>
    <line x1="4" y1="19" x2="20" y2="19" stroke="rgba(255,255,255,.7)" stroke-width="1.4"/>
    <circle cx="29" cy="16" r="3" fill="rgba(255,255,255,.55)"/>
    <circle cx="32" cy="16" r="3" fill="rgba(255,255,255,.35)"/>
  </svg>`;
}

// Pictogramme de paiement en ligne stylisé (dessin original, pas un logo de marque)
function paypalSVG(quatreX) {
  const id = 'pp' + Math.random().toString(36).slice(2, 7);
  return `<svg class="pp-svg" viewBox="0 0 28 24" width="24" height="20" role="img" aria-label="Paiement en ligne${quatreX ? ' en 4 fois' : ''}">
    <defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#003087"/><stop offset="1" stop-color="#009CDE"/>
    </linearGradient></defs>
    <rect x="0.5" y="2" width="27" height="20" rx="5" fill="url(#${id})"/>
    <text x="14" y="16.5" text-anchor="middle" font-size="12" font-weight="800" fill="#fff" font-family="Arial">P</text>
    ${quatreX ? `<g><circle cx="22" cy="7" r="6" fill="#F59E0B" stroke="#fff" stroke-width="1"/><text x="22" y="9.6" text-anchor="middle" font-size="7" font-weight="700" fill="#fff" font-family="Arial">4×</text></g>` : ''}
  </svg>`;
}

// Petite voiture SVG colorée (couleur = différenciation véhicule)
function carSVG(color, label) {
  return `<svg class="veh-svg" viewBox="0 0 24 24" width="20" height="20" aria-label="${label}" role="img">
    <path fill="${color}" d="M5 11l1.5-4.5A2 2 0 0 1 8.4 5h7.2a2 2 0 0 1 1.9 1.5L19 11h1a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1v1a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-1H8v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-1H4a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1h1zm2.1-.5h9.8l-1-3a.5.5 0 0 0-.48-.4H8.58a.5.5 0 0 0-.48.4l-1 3z"/>
    <circle cx="7" cy="15" r="1.4" fill="#1F2937"/>
    <circle cx="17" cy="15" r="1.4" fill="#1F2937"/>
  </svg>`;
}

// ═══════════════════════════════════════════════════════
// ÉTAT GLOBAL
// ═══════════════════════════════════════════════════════
const now = new Date();
const state = {
  view: 'suivi',
  mois: now.getMonth(),
  annee: now.getFullYear(),
  mensualisations: [],
  transactions: [],
  libelles: [],
  suivi: [],
  soldes: [],
  parametres: {},
  compteActif: localStorage.getItem('compte_actif') || 'courant',
  sbUrl: localStorage.getItem('sb_url') || 'https://tzmimukdbnxciiywefgf.supabase.co',
  sbKey: localStorage.getItem('sb_key') || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR6bWltdWtkYm54Y2lpeXdlZmdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5MTg5NjQsImV4cCI6MjA5NDQ5NDk2NH0.G8nFX0h6qoF_HvOVhaIVQS8GhzbZjddwyBnDnaPFolE',
  connected: false,
  syncing: false,
};
let sb = null;

// ═══════════════════════════════════════════════════════
// SUPABASE
// ═══════════════════════════════════════════════════════
async function initSupabase(url, key) {
  try {
    const { createClient } = window.supabase;
    sb = createClient(url, key, { realtime: { params: { eventsPerSecond: 10 } } });
    // test de connexion
    const { error } = await sb.from('mensualisations').select('id', { count: 'exact', head: true });
    if (error) throw error;
    state.connected = true;
    state.sbUrl = url; state.sbKey = key;
    localStorage.setItem('sb_url', url);
    localStorage.setItem('sb_key', key);
    return true;
  } catch (e) {
    console.error('Supabase:', e.message);
    return false;
  }
}

async function loadData() {
  if (!sb) return;
  setSyncing(true);
  try {
    const [r1, r2, r3, r4, r5] = await Promise.all([
      sb.from('mensualisations').select('*').order('jour'),
      sb.from('transactions').select('*').order('date_transaction', { ascending: false }),
      sb.from('libelles').select('*').order('ordre'),
      sb.from('suivi_mensuel').select('*').order('jour').order('ordre'),
      sb.from('soldes_depart').select('*'),
    ]);
    if (r1.data) state.mensualisations = r1.data;
    if (r2.data) state.transactions = r2.data;
    if (r3.data) state.libelles = r3.data;
    if (r4.data) state.suivi = r4.data;
    if (r5.data) state.soldes = r5.data;
    const r6 = await sb.from('parametres').select('*');
    if (r6.data) {
      state.parametres = {};
      r6.data.forEach(p => { state.parametres[p.cle] = p.valeur; });
      if (state.parametres['theme_accent']) applyTheme(state.parametres['theme_accent']);
    }
  } catch (e) {
    showToast('Erreur de chargement', 'error');
  }
  setSyncing(false);
  render();
}

function subscribeRealtime() {
  if (!sb) return;
  sb.channel('db-changes')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'mensualisations' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'libelles' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'suivi_mensuel' }, () => loadData())
    .on('postgres_changes', { event: '*', schema: 'public', table: 'soldes_depart' }, () => loadData())
    .subscribe();
}

// ═══════════════════════════════════════════════════════
// SETUP
// ═══════════════════════════════════════════════════════
async function setupSupabase() {
  const url = document.getElementById('sb-url').value.trim().replace(/\/+$/, '');
  const key = document.getElementById('sb-key').value.trim().replace(/\s+/g, '');
  if (!url || !key) { showToast('Veuillez remplir les deux champs', 'error'); return; }
  const btn = document.querySelector('.btn-primary');
  btn.textContent = 'Connexion…'; btn.disabled = true;
  const ok = await initSupabase(url, key);
  if (ok) {
    showApp();
    await loadData();
    subscribeRealtime();
  } else {
    showToast('Connexion échouée — vérifiez l\'URL et la clé', 'error');
    btn.textContent = 'Se connecter'; btn.disabled = false;
  }
}

function renderSkeleton() {
  const card = '<div class="skl-card"><div class="skl-line w60"></div><div class="skl-line w90"></div><div class="skl-line w40"></div></div>';
  return `<div class="skeleton-wrap">
    <div class="skl-hero"><div class="skl-line w50 light"></div><div class="skl-big light"></div><div class="skl-line w70 light"></div></div>
    ${card}${card}${card}
  </div>`;
}

function showApp() {
  document.getElementById('screen-setup').classList.add('hidden');
  document.getElementById('screen-app').classList.remove('hidden');
  const m = document.getElementById('main-content');
  if (m && !m.innerHTML.trim()) m.innerHTML = renderSkeleton();
}
function showSetup() {
  document.getElementById('screen-app').classList.add('hidden');
  document.getElementById('screen-setup').classList.remove('hidden');
}

// ═══════════════════════════════════════════════════════
// ROUTER & RENDER
// ═══════════════════════════════════════════════════════
function navigate(view) {
  state.view = view;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.toggle('active', b.dataset.view === view));
  const titles = { dashboard:'Accueil', mensualisation:'Mensualisation', suivi:getSuiviTitre(), parametres:'Paramètres', stats:'Statistiques' };
  document.getElementById('page-title').textContent = titles[view];
  render();
}

function render() {
  const main = document.getElementById('main-content');
  main.classList.remove('view-enter');
  void main.offsetWidth; // force reflow to restart animation
  main.classList.add('view-enter');
  switch (state.view) {
    case 'dashboard':      main.innerHTML = renderDashboard(); bindDashboard(); break;
    case 'mensualisation': main.innerHTML = renderMensualisation(); break;
    case 'suivi':          main.innerHTML = renderSuivi(); bindSuivi(); break;
    case 'parametres':     main.innerHTML = renderParametres(); bindParametres(); break;
    case 'stats':          main.innerHTML = renderStats(); bindStats(); break;
  }
  updateMonthLabel();
  updateSyncDot();
  updateFab();

  // Badge alerte mensu sur le bouton Suivi
  const suiviBtn = document.querySelector('[data-view="suivi"]');
  if (suiviBtn) {
    const existing = suiviBtn.querySelector('.nav-badge');
    if (existing) existing.remove();
    if (getMensuAlerte()) {
      const badge = document.createElement('span');
      badge.className = 'nav-badge';
      badge.textContent = '!';
      suiviBtn.appendChild(badge);
    }
  }
}

// ═══════════════════════════════════════════════════════
// MASCOTTE — personnage SVG dont l'expression reflète l'état budgétaire
// ═══════════════════════════════════════════════════════
function mascotteSVG(solde, totalCredit) {
  // 3 états : heureux (solde sain), neutre, inquiet (proche zéro ou négatif)
  let state = 'happy', mouth, eyes, fill = '#10B981';
  if (solde < 0) {
    state = 'sad'; fill = '#EF4444';
  } else if (totalCredit > 0 && solde / totalCredit < 0.15) {
    state = 'worried'; fill = '#F59E0B';
  }
  // Bouches selon état
  const mouths = {
    happy:   '<path d="M38 60 Q50 72 62 60" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    worried: '<path d="M38 65 Q50 60 62 65" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
    sad:     '<path d="M38 68 Q50 56 62 68" stroke="white" stroke-width="3.5" fill="none" stroke-linecap="round"/>',
  };
  // Yeux selon état
  const eyesMap = {
    happy:   '<circle cx="38" cy="42" r="3.5" fill="white"/><circle cx="62" cy="42" r="3.5" fill="white"/>',
    worried: '<circle cx="38" cy="42" r="3" fill="white"/><circle cx="62" cy="42" r="3" fill="white"/><path d="M30 35 L46 38" stroke="white" stroke-width="2" stroke-linecap="round"/><path d="M70 35 L54 38" stroke="white" stroke-width="2" stroke-linecap="round"/>',
    sad:     '<path d="M33 38 L43 42 M33 42 L43 38" stroke="white" stroke-width="2.5" stroke-linecap="round"/><path d="M57 38 L67 42 M57 42 L67 38" stroke="white" stroke-width="2.5" stroke-linecap="round"/>',
  };
  return `
  <div class="mascotte mascotte-${state}" title="${state==='happy'?'Tout va bien !':state==='worried'?'Budget serré, attention.':'Solde négatif, prudence !'}">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <circle cx="50" cy="50" r="45" fill="${fill}"/>
      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,.2)" stroke-width="3"/>
      ${eyesMap[state]}
      ${mouths[state]}
    </svg>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════
function renderDashboard() {
  const mk = MOIS_KEYS[state.mois];
  const mensuD = state.mensualisations.filter(m => m.operation === 'Débit' && m[mk] != null).reduce((s,m) => s + parseFloat(m[mk]||0), 0);
  const mensuC = state.mensualisations.filter(m => m.operation === 'Crédit' && m[mk] != null).reduce((s,m) => s + parseFloat(m[mk]||0), 0);
  const tranD  = state.transactions.filter(t => isSameMois(t.date_transaction) && t.operation === 'Débit').reduce((s,t) => s + parseFloat(t.montant||0), 0);
  const tranC  = state.transactions.filter(t => isSameMois(t.date_transaction) && t.operation === 'Crédit').reduce((s,t) => s + parseFloat(t.montant||0), 0);
  const totalD = mensuD + tranD;
  const totalC = mensuC + tranC;
  const solde  = totalC - totalD;
  const soldeClass = solde >= 0 ? 'positive' : 'negative';

  // Jauge : part des crédits consommée par les débits
  const pctConso = totalC > 0 ? Math.min(totalD / totalC * 100, 100) : (totalD > 0 ? 100 : 0);
  const gaugeColor = pctConso < 70 ? '#10B981' : pctConso < 90 ? '#F59E0B' : '#EF4444';
  const R = 52, CIRC = 2 * Math.PI * R;
  const dashOffset = CIRC * (1 - pctConso / 100);

  // Prochains prélèvements (15 jours)
  const today = now.getDate();
  const limit = today + 15;
  const upcoming = state.mensualisations
    .filter(m => m.operation === 'Débit' && m[mk] != null && m.jour >= today && m.jour <= Math.min(limit, 31))
    .sort((a,b) => a.jour - b.jour)
    .slice(0, 6);

  return `
  ${getMensuAlerte() ? `
  <div class="mensu-alerte" onclick="navigate('suivi')">
    <span class="alerte-icon">⚠️</span>
    <div class="alerte-text">
      <strong>Mensualisations non inscrites</strong>
      <span>Appuyez pour ouvrir le suivi et les inscrire</span>
    </div>
    <span class="alerte-arrow">›</span>
  </div>` : ''}
  <div class="solde-card">
    ${mascotteSVG(solde, totalC)}
    <div class="solde-label">Solde net — ${MOIS_FR[state.mois]} ${state.annee}</div>
    <div class="solde-amount ${soldeClass}">${fmt(solde)}</div>
    <div class="solde-sub">
      <div class="solde-sub-item">
        <div class="label">↓ Débits</div>
        <div class="value">${fmt(totalD)}</div>
      </div>
      <div class="solde-sub-item">
        <div class="label">↑ Crédits</div>
        <div class="value">${fmt(totalC)}</div>
      </div>
    </div>
  </div>

  ${(() => {
    const cour = soldeCompteFin('courant');
    const eps = getComptes().slice(1).map(c => ({ ...c, sf: soldeCompteFin(c.id) }));
    const epTot = eps.reduce((s,e)=>s+e.sf,0);
    const patri = cour + epTot;
    return `
    <div class="patri-card" onclick="window._statsSection='epargne'; navigate('stats')">
      <div class="patri-head">
        <span class="patri-title">💼 Patrimoine total</span>
        <span class="patri-period">${MOIS_FR[state.mois]} ${state.annee}</span>
      </div>
      <div class="patri-amount">${fmt(patri)}</div>
      <div class="patri-split">
        <div class="patri-seg"><span>Compte courant</span><strong>${fmt(cour)}</strong></div>
        <div class="patri-seg ep"><span>Épargne (${eps.length})</span><strong>${fmt(epTot)}</strong></div>
      </div>
      ${eps.length ? `<div class="patri-list">
        ${eps.map(e => { const st=epargneStyle(e.nom); return `<div class="patri-line"><span class="patri-dot" style="background:${st.accent}"></span><span class="patri-nom">${escHtml(e.nom)}</span><span class="patri-val">${fmt(e.sf)}</span></div>`; }).join('')}
      </div>` : ''}
    </div>` ;
  })()}

  <div class="card gauge-card">
    <div class="card-title">Budget consommé — ${MOIS_FR[state.mois]}</div>
    <div class="gauge-wrap">
      <svg viewBox="0 0 120 120" class="gauge-svg">
        <circle cx="60" cy="60" r="${R}" class="gauge-bg"/>
        <circle cx="60" cy="60" r="${R}" class="gauge-fg"
          style="stroke:${gaugeColor};stroke-dasharray:${CIRC.toFixed(1)};stroke-dashoffset:${dashOffset.toFixed(1)}"/>
        <text x="60" y="55" class="gauge-pct" style="fill:${gaugeColor}">${Math.round(pctConso)}%</text>
        <text x="60" y="74" class="gauge-cap">des crédits</text>
      </svg>
      <div class="gauge-legend">
        <div class="gl-item"><span class="gl-dot" style="background:var(--debit)"></span>Dépensé : <strong>${fmt(totalD)}</strong></div>
        <div class="gl-item"><span class="gl-dot" style="background:var(--credit)"></span>Reçu : <strong>${fmt(totalC)}</strong></div>
        <div class="gl-item"><span class="gl-dot" style="background:${solde>=0?'var(--credit)':'var(--debit)'}"></span>Reste : <strong>${fmt(solde)}</strong></div>
      </div>
    </div>
  </div>

  <div class="card">
    <div class="card-title">Évolution 6 mois</div>
    <div class="chart-container"><canvas id="chart-solde"></canvas></div>
  </div>

  <div class="card">
    <div class="card-title">Solde bancaire réel — ${state.annee}</div>
    <div class="chart-container"><canvas id="chart-banque"></canvas></div>
  </div>

  ${upcoming.length > 0 ? `
  <div class="card">
    <div class="card-title">Prochains prélèvements</div>
    <ul class="upcoming-list">
      ${upcoming.map(m => `
      <li class="upcoming-item">
        <div class="upcoming-day">${m.jour}</div>
        <div class="upcoming-info">
          <div class="name">${m.libelle_secondaire || m.libelle_principal}</div>
          <div class="sub">${m.libelle_principal} · ${m.type_operation || ''}</div>
        </div>
        <div class="upcoming-amount">−${fmt(m[mk])}</div>
      </li>`).join('')}
    </ul>
  </div>` : ''}`;
}

function getSuiviActuelMensu(m) {
  // Sum actual suivi entries matching this mensualisation's libellé for current month
  const entries = state.suivi.filter(e =>
    e.mois === state.mois + 1 &&
    e.annee === state.annee &&
    e.libelle_principal === m.libelle_principal &&
    (!m.libelle_secondaire || e.libelle_secondaire === m.libelle_secondaire)
  );
  const d = entries.reduce((s, e) => s + parseFloat(e.debit  || 0), 0);
  const c = entries.reduce((s, e) => s + parseFloat(e.credit || 0), 0);
  return m.operation === 'Débit' ? d : c;
}

function getMensuAlerte() {
  const mk = MOIS_KEYS[state.mois];
  const mensuCount = state.mensualisations.filter(m => m[mk] != null && m[mk] !== '').length;
  const inscritCount = state.suivi.filter(s => s.mois === state.mois + 1 && s.annee === state.annee && s.is_mensualisation).length;
  return mensuCount > 0 && inscritCount === 0;
}

function animateAmount(el, targetValue, duration = 650) {
  if (!el) return;
  const absTarget = Math.abs(targetValue);
  const isNeg = targetValue < 0;
  const startTime = performance.now();
  function step(now) {
    const progress = Math.min((now - startTime) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const cur = absTarget * eased;
    el.textContent = (isNeg ? '−' : '') + cur.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
    if (progress < 1) requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function bindDashboard() {
  const canvas = document.getElementById('chart-solde');
  if (!canvas) return;
  if (typeof Chart === 'undefined') {
    ensureChart().then(() => { if (state.view === 'dashboard') bindDashboard(); }).catch(() => {});
    return;
  }
  const labels = [], credits = [], debits = [];
  for (let i = 5; i >= 0; i--) {
    let m = state.mois - i; let y = state.annee;
    if (m < 0) { m += 12; y--; }
    const mk = MOIS_KEYS[m];
    labels.push(MOIS_COURT[m]);
    const d = state.mensualisations.filter(x => x.operation==='Débit' && x[mk]!=null).reduce((s,x)=>s+parseFloat(x[mk]||0),0);
    const c = state.mensualisations.filter(x => x.operation==='Crédit' && x[mk]!=null).reduce((s,x)=>s+parseFloat(x[mk]||0),0);
    debits.push(parseFloat(d.toFixed(2)));
    credits.push(parseFloat(c.toFixed(2)));
  }
  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: 'Crédits', data: credits, backgroundColor: '#86EFAC', borderRadius: 6 },
        { label: 'Débits',  data: debits,  backgroundColor: '#FCA5A5', borderRadius: 6 },
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 12 } } } },
      scales: {
        x: { grid: { display: false } },
        y: { grid: { color: '#F3F4F6' }, ticks: { callback: v => v.toLocaleString('fr-FR') + ' €' } }
      }
    }
  });

  // Courbe du solde bancaire réel sur l'année (rapprochements)
  const cb = document.getElementById('chart-banque');
  if (cb) {
    const pts = MOIS_KEYS.map((_, i) => {
      const key = `solde_banque_${state.annee}_${String(i + 1).padStart(2,'0')}`;
      const v = parseFloat(state.parametres[key]);
      return isNaN(v) ? null : parseFloat(v.toFixed(2));
    });
    new Chart(cb, {
      type: 'line',
      data: {
        labels: MOIS_COURT,
        datasets: [{
          label: 'Solde bancaire réel',
          data: pts,
          borderColor: '#1E40AF',
          backgroundColor: 'rgba(30,64,175,.12)',
          borderWidth: 2.5,
          pointBackgroundColor: '#1E40AF',
          pointRadius: 4,
          tension: .3,
          fill: true,
          spanGaps: true,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: { grid: { color: '#F3F4F6' }, ticks: { callback: v => v.toLocaleString('fr-FR') + ' €' } }
        }
      }
    });
  }

  // Animate main solde amount
  const soldeEl = document.querySelector('.solde-amount');
  if (soldeEl) {
    const txt = soldeEl.textContent.trim().replace(/\s/g,'').replace('€','').replace(',','.');
    const val = parseFloat(txt.replace('−','-').replace(/[^\d.\-]/g,''));
    if (!isNaN(val)) animateAmount(soldeEl, val);
  }
}

// ═══════════════════════════════════════════════════════
// MENSUALISATION
// ═══════════════════════════════════════════════════════
function renderMensualisation() {
  const mensuView = window._mensuView || 'mensuel';
  const tabs = `
  <div class="mensu-tabs">
    <button class="mensu-tab${mensuView==='mensuel'?' active':''}" onclick="window._mensuView='mensuel'; render()">📅 Mensuel</button>
    <button class="mensu-tab${mensuView==='annuel'?' active':''}" onclick="window._mensuView='annuel'; render()">📆 Annuel</button>
  </div>`;

  if (mensuView === 'annuel') return tabs + renderMensuAnnee();

  const mk = MOIS_KEYS[state.mois];
  const search = (window._mensuSearch || '').toLowerCase();
  let rows = state.mensualisations.filter(m => m[mk] != null && m[mk] !== '');
  if (search) rows = rows.filter(m =>
    (m.libelle_principal||'').toLowerCase().includes(search) ||
    (m.libelle_secondaire||'').toLowerCase().includes(search)
  );
  const totalD = rows.filter(m => m.operation==='Débit').reduce((s,m)=>s+parseFloat(m[mk]||0),0);
  const totalC = rows.filter(m => m.operation==='Crédit').reduce((s,m)=>s+parseFloat(m[mk]||0),0);
  const solde  = totalC - totalD;

  return tabs + `
  <div class="view-toolbar">
    <button class="btn-add" onclick="showAddMensu()">＋ Ajouter</button>
    <div class="search-bar">
      <span>🔍</span>
      <input type="search" placeholder="Rechercher…" value="${search}"
        oninput="window._mensuSearch=this.value; render()">
    </div>
  </div>
  <div class="totals-bar">
    <div class="total-chip debit"><div class="label">Débits</div><div class="value">${fmt(totalD)}</div></div>
    <div class="total-chip credit"><div class="label">Crédits</div><div class="value">${fmt(totalC)}</div></div>
    <div class="total-chip solde"><div class="label">Solde</div><div class="value" style="color:${solde>=0?'var(--credit)':'var(--debit)'}">${fmt(solde)}</div></div>
  </div>
  <div class="mensu-list">
    ${rows.length === 0 ? '<div class="empty-state"><div class="icon">📋</div><p>Aucune mensualisation ce mois</p></div>' :
      rows.map((m, idx) => {
        const prevu = parseFloat(m[mk] || 0);
        const actuel = getSuiviActuelMensu(m);
        const ecartBR = actuel - prevu;
        const isOk = actuel >= prevu * 0.99;
        return `
        <div class="mensu-row${idx % 2 === 1 ? ' mensu-row-alt' : ''}" onclick="showEditMensu('${m.id}')">
          <div class="mensu-day">${m.jour}</div>
          <div class="mensu-info">
            <div class="principal">${escHtml(m.libelle_principal)}</div>
            <div class="secondaire">${escHtml(m.libelle_secondaire || '—')}</div>
          </div>
          <div class="mensu-right">
            <div class="mensu-amount ${m.operation.toLowerCase()}">
              ${m.operation==='Débit'?'−':'+'}${fmt(m[mk])}
            </div>
            ${actuel > 0 ? `<div class="mensu-reel ${isOk ? 'ok' : 'nok'}">
              réel: ${fmt(actuel)}
            </div>` : `<div class="mensu-reel pending">non inscrit</div>`}
          </div>
        </div>`;
      }).join('')}
  </div>`;
}

function renderMensuAnnee() {
  const rows = [...state.mensualisations].sort((a,b) => (a.libelle_principal||'').localeCompare(b.libelle_principal||'') || (a.jour||0)-(b.jour||0));

  // Grouper par libellé principal
  const groups = {};
  rows.forEach(m => {
    const g = m.libelle_principal || '—';
    if (!groups[g]) groups[g] = [];
    groups[g].push(m);
  });

  // Totaux mensuels
  const debitMois  = Array(12).fill(0);
  const creditMois = Array(12).fill(0);

  let bodyHtml = '';
  Object.entries(groups).forEach(([principal, items]) => {
    bodyHtml += `<tr class="ma-group-row"><td colspan="14"><span>${escHtml(principal)}</span></td></tr>`;
    items.forEach(m => {
      let rowTotal = 0;
      const cells = MOIS_KEYS.map((mk, i) => {
        const v = m[mk];
        if (v != null && v !== '') {
          const n = parseFloat(v);
          rowTotal += n;
          if (m.operation === 'Débit') debitMois[i] += n; else creditMois[i] += n;
          return `<td class="ma-amt ${m.operation==='Débit'?'debit':'credit'}">${n.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>`;
        }
        return `<td class="ma-empty"></td>`;
      }).join('');
      bodyHtml += `
      <tr class="ma-row" onclick="showEditMensu('${m.id}')">
        <td class="ma-label">
          <div class="ma-lib">${escHtml(m.libelle_secondaire || m.libelle_principal)}</div>
          <div class="ma-type">${escHtml(m.type_operation || '')} · j.${m.jour||'?'}</div>
        </td>
        ${cells}
        <td class="ma-total ${m.operation==='Débit'?'debit':'credit'}">${rowTotal.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
      </tr>`;
    });
  });

  const totalD = debitMois.reduce((a,b)=>a+b,0);
  const totalC = creditMois.reduce((a,b)=>a+b,0);
  const soldeMois = MOIS_KEYS.map((_,i) => creditMois[i] - debitMois[i]);

  return `
  <div class="ma-wrap">
    <div class="ma-add-row">
      <button class="btn-add" onclick="showAddMensu()">＋ Ajouter</button>
    </div>
    <div class="ma-scroll">
      <table class="ma-table">
        <thead>
          <tr>
            <th class="ma-th-label">Libellé</th>
            ${MOIS_COURT.map(m=>`<th class="ma-th-mois">${m}</th>`).join('')}
            <th class="ma-th-total">Total</th>
          </tr>
        </thead>
        <tbody>${bodyHtml}</tbody>
        <tfoot>
          <tr class="ma-foot debit">
            <td>Débits</td>
            ${debitMois.map(v=>`<td class="ma-amt debit">${v>0?v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</td>`).join('')}
            <td class="ma-total debit">${totalD.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          </tr>
          <tr class="ma-foot credit">
            <td>Crédits</td>
            ${creditMois.map(v=>`<td class="ma-amt credit">${v>0?v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</td>`).join('')}
            <td class="ma-total credit">${totalC.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          </tr>
          <tr class="ma-foot solde">
            <td>Solde</td>
            ${soldeMois.map(v=>`<td class="ma-amt ${v>=0?'credit':'debit'}">${v!==0?v.toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2}):''}</td>`).join('')}
            <td class="ma-total ${(totalC-totalD)>=0?'credit':'debit'}">${(totalC-totalD).toLocaleString('fr-FR',{minimumFractionDigits:2,maximumFractionDigits:2})}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>`;
}

// ═══════════════════════════════════════════════════════
// JOURNAL
// ═══════════════════════════════════════════════════════
function renderJournal() {
  const trs = state.transactions.filter(t => isSameMois(t.date_transaction));
  // grouper par date
  const byDate = {};
  trs.forEach(t => {
    const d = t.date_transaction;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(t);
  });
  const dates = Object.keys(byDate).sort((a,b) => b.localeCompare(a));

  const totalD = trs.filter(t=>t.operation==='Débit').reduce((s,t)=>s+parseFloat(t.montant||0),0);
  const totalC = trs.filter(t=>t.operation==='Crédit').reduce((s,t)=>s+parseFloat(t.montant||0),0);

  return `
  <div class="view-toolbar">
    <button class="btn-add" onclick="showAddTransaction()">＋ Saisir</button>
  </div>
  <div class="totals-bar">
    <div class="total-chip debit"><div class="label">Débits</div><div class="value">${fmt(totalD)}</div></div>
    <div class="total-chip credit"><div class="label">Crédits</div><div class="value">${fmt(totalC)}</div></div>
  </div>
  ${dates.length === 0 ? `<div class="empty-state"><div class="icon">📔</div><p>Aucune transaction ce mois</p></div>` :
    dates.map(d => `
    <div class="journal-day-group">
      <div class="journal-day-label">${fmtDate(d)}</div>
      ${byDate[d].map(t => `
      <div class="journal-item" onclick="showEditTransaction('${t.id}')">
        <div class="journal-cat-icon">${entryIcon(t)}</div>
        <div class="journal-info">
          <div class="name">${t.libelle_secondaire || t.libelle_principal || 'Sans catégorie'}</div>
          <div class="sub">${t.libelle_principal || ''} · ${t.notes || ''}</div>
        </div>
        <div class="journal-amount" style="color:var(--${t.operation==='Débit'?'debit':'credit'})">
          ${t.operation==='Débit'?'−':'+'}${fmt(t.montant)}
        </div>
      </div>`).join('')}
    </div>`).join('')}`;
}

// ═══════════════════════════════════════════════════════
// SUIVI MENSUEL
// ═══════════════════════════════════════════════════════
function getSoldeDepart(mois, annee, compte) {
  compte = compte || getCompteActif();
  if (compte === 'courant') {
    const s = state.soldes.find(x => x.mois === (mois + 1) && x.annee === annee);
    if (s) return parseFloat(s.solde);
  } else {
    const k = `report_${compte}_${annee}_${String(mois + 1).padStart(2,'0')}`;
    if (state.parametres[k] != null && state.parametres[k] !== '') return parseFloat(state.parametres[k]);
  }
  // Pas d'entrée explicite → calcul depuis le solde de fin du mois précédent
  let pm = mois - 1, pa = annee;
  if (pm < 0) { pm = 11; pa--; }
  if (pa < 2025) return 0; // base : stoppe la récursion avant 2025
  const prevDepart = getSoldeDepart(pm, pa, compte);
  const prevEntries = state.suivi.filter(e => e.mois === (pm + 1) && e.annee === pa && suiviCompte(e) === compte);
  const prevD = prevEntries.reduce((acc, e) => acc + parseFloat(e.debit  || 0), 0);
  const prevC = prevEntries.reduce((acc, e) => acc + parseFloat(e.credit || 0), 0);
  return prevDepart + prevC - prevD;
}

function getSuiviMois() {
  const compte = getCompteActif();
  return state.suivi
    .filter(s => s.mois === (state.mois + 1) && s.annee === state.annee && suiviCompte(s) === compte)
    .sort((a, b) => (a.jour || 0) - (b.jour || 0) || (a.ordre || 0) - (b.ordre || 0));
}

function getJourSemaine(jour) {
  if (!jour) return '';
  return ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][new Date(state.annee, state.mois, jour).getDay()];
}

// Dernier solde bancaire saisi (toute année/mois confondus) pour le compte courant
function getDernierSoldeBancaire() {
  let best = null, bestKey = '';
  for (const k of Object.keys(state.parametres || {})) {
    const m = /^solde_banque_(\d{4})_(\d{2})$/.exec(k);
    if (!m) continue;
    const id = m[1] + '_' + m[2];
    if (id > bestKey) {
      const v = parseFloat(state.parametres[k]);
      if (!isNaN(v)) { best = { val: v, annee: +m[1], mois: +m[2] }; bestKey = id; }
    }
  }
  return best;
}
// Dernier chèque enregistré sur le compte courant (type + n°)
// Tri : entrée la plus récemment saisie/modifiée d'abord, puis par date d'opération.
function getDernierCheque() {
  const ops = state.suivi
    .filter(e => suiviCompte(e) === 'courant' && /chèque|cheque/i.test(e.type_operation || '') && (e.num_cheque || '').trim())
    .sort((a,b) => {
      const ta = a.updated_at || a.created_at || '';
      const tb = b.updated_at || b.created_at || '';
      if (ta && tb && ta !== tb) return tb.localeCompare(ta);
      return (b.annee - a.annee) || ((b.mois||0) - (a.mois||0)) || ((b.jour||0) - (a.jour||0));
    });
  return ops[0] || null;
}

function renderSuivi() {
  const entries     = getSuiviMois();
  const soldeDepart = getSoldeDepart(state.mois, state.annee);
  const totalD = entries.reduce((s, e) => s + parseFloat(e.debit  || 0), 0);
  const totalC = entries.reduce((s, e) => s + parseFloat(e.credit || 0), 0);
  const soldeFin = soldeDepart + totalC - totalD;

  // Rapprochement bancaire (opérations pointées seulement)
  const pointed  = entries.filter(e => e.pointe === '✓');
  const pointedD = pointed.reduce((s, e) => s + parseFloat(e.debit  || 0), 0);
  const pointedC = pointed.reduce((s, e) => s + parseFloat(e.credit || 0), 0);
  const soldePointe   = soldeDepart + pointedC - pointedD;
  const soldeBancaire = getSoldeBancaire(state.mois, state.annee);
  const ecart         = isNaN(soldeBancaire) ? null : +(soldeBancaire - soldePointe).toFixed(2);
  const isEquilibre   = ecart !== null && Math.abs(ecart) < 0.01;

  // Calcul solde courant ligne par ligne (sur TOUTES les opérations)
  let runBalance = soldeDepart;
  const allRows = entries.map(e => {
    runBalance += parseFloat(e.credit || 0) - parseFloat(e.debit || 0);
    return { ...e, _solde: runBalance };
  });

  // Recherche + filtres (n'affectent que l'affichage, pas les totaux)
  const q = (window._suiviSearch || '').trim().toLowerCase();
  const filt = window._suiviFilter || 'tous';
  const rows = allRows.filter(e => {
    if (q) {
      const hay = [e.libelle_principal, e.libelle_secondaire, e.libelle_libre, e.type_operation, e.num_cheque]
        .filter(Boolean).join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (filt === 'pointe'   && e.pointe !== '✓') return false;
    if (filt === 'nonpointe'&& e.pointe === '✓') return false;
    if (filt === 'debit'    && !(parseFloat(e.debit  || 0) > 0)) return false;
    if (filt === 'credit'   && !(parseFloat(e.credit || 0) > 0)) return false;
    return true;
  });
  const isFiltered = q !== '' || filt !== 'tous';

  return `
  <div class="compte-selector">
    ${getComptes().map(c => `<button class="compte-chip${c.id===getCompteActif()?' active':''}" onclick="setCompteActif('${c.id}')">${escHtml(c.nom)}</button>`).join('')}
  </div>
  ${getCompteActif()==='courant' ? (() => {
    const dateStr = new Date().toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const dsb = getDernierSoldeBancaire();
    const dch = getDernierCheque();
    const sbTxt = dsb ? `le solde au dernier relevé bancaire est de <strong>${fmt(dsb.val)}</strong>` : `aucun solde bancaire saisi pour l'instant`;
    const chTxt = dch
      ? `le numéro du dernier chèque enregistré est le chéquier : <strong>${escHtml(dch.type_operation)}</strong>, avec le chèque numéro : <strong>${escHtml(dch.num_cheque)}</strong>`
      : `aucun chèque enregistré`;
    return `<div class="cc-banner">Aujourd'hui, nous sommes le <strong>${dateStr}</strong>, ${sbTxt}, le solde budgété à la fin <strong>${MOIS_FR[state.mois]}</strong> est de <strong>${fmt(soldeFin)}</strong> et ${chTxt}.</div>`;
  })() : ''}
  <div class="suivi-infobar">
    <div class="suivi-info-item clickable" onclick="showSoldeDepart()" title="Cliquer pour modifier">
      <div class="sii-label">Report</div>
      <div class="sii-value ${soldeDepart >= 0 ? 'positive' : 'negative'}">${fmt(soldeDepart)}</div>
    </div>
    <div class="suivi-info-item">
      <div class="sii-label">Débits</div>
      <div class="sii-value" style="color:var(--debit)">${fmt(totalD)}</div>
    </div>
    <div class="suivi-info-item">
      <div class="sii-label">Crédits</div>
      <div class="sii-value" style="color:var(--credit)">${fmt(totalC)}</div>
    </div>
    <div class="suivi-info-item">
      <div class="sii-label">Solde fin</div>
      <div class="sii-value ${soldeFin >= 0 ? 'positive' : 'negative'}">${fmt(soldeFin)}</div>
    </div>
  </div>

  ${(() => {
    if (getCompteActif() === 'courant') return '';
    const s = epargneStyle(nomCompteActif());
    return `<div class="rapp-produit" style="background:linear-gradient(135deg,${s.c1},${s.c2})">
      ${epargneLogo(s)}
      <div class="rapp-produit-id">
        <div class="rapp-produit-nom">${escHtml(nomCompteActif())}</div>
        <div class="rapp-produit-tag">${s.icon} ${s.label}</div>
      </div>
      ${bankMiniHTML()}
    </div>`;
  })()}
  <div class="rapprochement-card${isEquilibre ? ' equilibre' : ''}"${getCompteActif()!=='courant' ? ` style="background:linear-gradient(135deg,${epargneStyle(nomCompteActif()).c1},${epargneStyle(nomCompteActif()).c2})"` : ''}>
    <div class="rapp-title">🏦 Rapprochement bancaire</div>
    ${bankBadgeHTML(getBanque())}
    <div class="rapp-bank-big" onclick="showSoldeBancaire()">
      <div class="rbb-label">Solde bancaire réel</div>
      ${isNaN(soldeBancaire)
        ? '<div class="rbb-set">Toucher pour saisir →</div>'
        : `<div class="rbb-amount ${soldeBancaire >= 0 ? 'positive' : 'negative'}">${fmt(soldeBancaire)} <span class="rbb-pencil">✎</span></div>`}
    </div>
    <div class="rapp-body">
      <div class="rapp-row">
        <span class="rapp-label">✓ Solde pointé <small>(${pointed.length} op.)</small></span>
        <span class="rapp-val ${soldePointe >= 0 ? 'positive' : 'negative'}">${fmt(soldePointe)}</span>
      </div>
      <div class="rapp-ecart ${isEquilibre ? 'ok' : ecart === null ? 'pending' : 'nok'}">
        ${isEquilibre
          ? '✅ Comptes équilibrés — solde confirmé'
          : ecart === null
            ? '💡 Saisissez votre solde bancaire pour vérifier'
            : `⚠️ Écart : ${ecart > 0 ? '+' : ''}${fmt(ecart)}`}
      </div>
    </div>
  </div>

  <div class="suivi-toolbar">
    ${getCompteActif() === 'courant' ? (() => {
      const mensuInscrites = entries.some(e => e.is_mensualisation);
      return mensuInscrites
        ? `<button class="btn-inscrire is-done" disabled title="Déjà inscrites pour ${MOIS_FR[state.mois]} ${state.annee}">✅ Mensualisations inscrites</button>`
        : `<button class="btn-inscrire" onclick="inscrireMensualisations()">📋 Inscrire les mensualisations</button>`;
    })() : ''}
    <button class="btn-pointer-tout" onclick="pointerTout()" title="Pointer toutes les opérations">✓✓</button>
    <button class="btn-import-csv" onclick="importCsvAuto()" title="Importer un relevé bancaire CSV : rapprochement automatique, création des opérations manquantes et pointage en un clic">🤖 CSV auto</button>
    <button class="btn-import-csv" onclick="showImportCSV()" title="Importer avec aperçu et choix manuel" style="background:transparent;border:1px solid currentColor;font-size:11px;padding:6px 10px;">📥 CSV (review)</button>
    <button class="btn-add" onclick="showAddSuiviEntry()">＋ Saisir</button>
    <button class="btn-pdf" onclick="exportSuiviPDF()" title="Exporter le mois en PDF">📄</button>
    <button class="btn-purge" onclick="purgerMois()" title="Effacer toutes les opérations du mois">🗑</button>
  </div>

  ${entries.length > 0 ? `
  <div class="suivi-filterbar">
    <div class="suivi-search">
      <span>🔍</span>
      <input type="search" placeholder="Rechercher (libellé, type, chèque…)"
        value="${escHtml(window._suiviSearch || '')}"
        oninput="window._suiviSearch=this.value; render()">
      ${window._suiviSearch ? `<button class="search-clear" onclick="window._suiviSearch=''; render()">✕</button>` : ''}
    </div>
    <div class="suivi-chips">
      ${[['tous','Tous'],['nonpointe','○ Non pointé'],['pointe','✓ Pointé'],['debit','↓ Débit'],['credit','↑ Crédit']]
        .map(([v,l]) => `<button class="fchip${(window._suiviFilter||'tous')===v?' active':''}" onclick="window._suiviFilter='${v}'; render()">${l}</button>`).join('')}
    </div>
  </div>` : ''}

  ${entries.length === 0 && getCompteActif() === 'courant'
    ? `<div class="empty-state"><div class="icon">📒</div><p>Aucune opération ce mois<br><small>Cliquez sur "Inscrire les mensualisations" pour commencer</small></p></div>`
    : entries.length === 0
    ? `<div class="suivi-scroll-hint">← glissez le tableau pour voir Pointage · Crédit · Débit →</div>
    <div class="suivi-table-wrap">
    <table class="suivi-table">
      <thead>
        <tr>
          <th class="col-jour">Jour</th>
          <th class="col-libelle">Libellé</th>
          <th class="col-type">Type</th>
          <th class="col-cheque">Chèque</th>
          <th class="col-pointe">P</th>
          <th class="col-amount">Crédit</th>
          <th class="col-amount">Débit</th>
          <th class="col-solde">Solde</th>
        </tr>
      </thead>
      <tbody>
        <tr class="suivi-row"><td colspan="8" style="text-align:center;color:var(--text-muted);padding:22px 8px;font-size:13px">Aucune opération — cliquez sur « ＋ Saisir » pour en ajouter</td></tr>
      </tbody>
      <tfoot>
        <tr class="suivi-total-row">
          <td colspan="5">Totaux ${MOIS_FR[state.mois]}</td>
          <td class="col-amount credit-cell">${fmt(totalC)}</td>
          <td class="col-amount debit-cell">${fmt(totalD)}</td>
          <td class="col-solde ${soldeFin >= 0 ? 'positive' : 'negative'}">${fmt(soldeFin)}</td>
        </tr>
      </tfoot>
    </table>
  </div>`
    : rows.length === 0
    ? `<div class="empty-state"><div class="icon">🔍</div><p>Aucun résultat<br><small>Aucune opération ne correspond à votre recherche/filtre</small></p></div>`
    : `<div class="suivi-scroll-hint">← glissez le tableau pour voir Pointage · Crédit · Débit →</div>
    <div class="suivi-table-wrap">
    <table class="suivi-table">
      <thead>
        <tr>
          <th class="col-jour">Jour</th>
          <th class="col-libelle">Libellé</th>
          <th class="col-type">Type</th>
          <th class="col-cheque">Chèque</th>
          <th class="col-pointe">P</th>
          <th class="col-amount">Crédit</th>
          <th class="col-amount">Débit</th>
          <th class="col-solde">Solde</th>
        </tr>
      </thead>
      <tbody>
        ${rows.map((e, idx) => `
        <tr class="suivi-row${e.is_mensualisation ? ' is-mensu' : ''}${idx % 2 === 1 ? ' suivi-row-alt' : ''}${e.pointe === '✓' ? ' pointed-row' : ''}" onclick="showEditSuiviEntry('${e.id}')">
          <td class="col-jour" style="box-shadow:inset 4px 0 0 ${catColor(e.libelle_principal)}">
            <div class="jour-nom">${getJourSemaine(e.jour)}</div>
            <div class="jour-num">${e.jour || '—'}</div>
          </td>
          <td class="col-libelle">
            <div class="lib-row">
              ${(() => { const lg = entryLogo(e); return lg ? `<span class="lib-logo"><img src="${lg}" alt=""></span>` : `<span class="lib-logo lib-logo-empty"></span>`; })()}
              <div class="lib-stack">
                <div class="lib-line lib-line-1">
                  <span class="lib-principal">${escHtml(e.libelle_principal || '')}</span>
                </div>
                ${e.libelle_secondaire ? `<div class="lib-line lib-line-2"><span class="lib-secondaire">${escHtml(e.libelle_secondaire)}</span></div>` : ''}
                ${e.libelle_libre ? `<div class="lib-libre">${escHtml(e.libelle_libre)}</div>` : ''}
              </div>
            </div>
          </td>
          <td class="col-type">${(()=>{ const {base,echeance}=parsePaypal4X(e.type_operation||''); const ico=base?entryIcon({ libelle_principal: base }):''; const icoHtml=ico?`<span class="mp-type-ico">${ico}</span>`:''; const txt=echeance ? `${escHtml(base)} <span class="echeance-badge">Éch.${echeance}/4</span>` : escHtml(base); return `<span class="mp-type-cell">${icoHtml}${txt}</span>`; })()}</td>
          <td class="col-cheque">${escHtml(e.num_cheque || '')}</td>
          <td class="col-pointe">
            <span class="pointe-badge${e.pointe === '✓' ? ' pointed' : ''}"
              onclick="event.stopPropagation(); togglePointe('${e.id}','${e.pointe||''}')">${e.pointe === '✓' ? '✓' : '○'}</span>
          </td>
          <td class="col-amount credit-cell">${e.credit != null ? fmt(e.credit) : ''}</td>
          <td class="col-amount debit-cell">${e.debit  != null ? fmt(e.debit)  : ''}</td>
          <td class="col-solde ${e._solde >= 0 ? 'positive' : 'negative'}">${fmt(e._solde)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr class="suivi-total-row">
          <td colspan="5">Totaux ${MOIS_FR[state.mois]}</td>
          <td class="col-amount credit-cell">${fmt(totalC)}</td>
          <td class="col-amount debit-cell">${fmt(totalD)}</td>
          <td class="col-solde ${soldeFin >= 0 ? 'positive' : 'negative'}">${fmt(soldeFin)}</td>
        </tr>
      </tfoot>
    </table>
  </div>`}`;
}

function bindSuivi() {
  // Anime les montants clés du Suivi
  document.querySelectorAll('.sii-value, .rbb-amount').forEach(el => {
    const raw = el.textContent.trim().replace(/\s/g,'').replace('€','').replace(',', '.').replace('−','-');
    const v = parseFloat(raw.replace(/[^\d.\-]/g,''));
    if (!isNaN(v)) animateAmount(el, v, 550);
  });
}

// Bouton flottant d'ajout rapide — contextuel
function updateFab() {
  const fab = document.getElementById('fab-add');
  if (!fab) return;
  const shown = ['suivi', 'dashboard', 'mensualisation'].includes(state.view);
  fab.classList.toggle('hidden', !shown);
}
function quickAdd() {
  if (state.view === 'mensualisation') return showAddMensu();
  if (state.view === 'suivi' || state.view === 'dashboard') {
    if (state.view === 'dashboard') navigate('suivi');
    return showAddSuiviEntry();
  }
}

// Graphique en anneau (donut) de répartition des dépenses
function bindStats() {
  const cv = document.getElementById('stats-donut');
  if (!cv) return;
  if (typeof Chart === 'undefined') {
    ensureChart().then(() => { if (state.view === 'stats') bindStats(); }).catch(() => {});
    return;
  }
  const compte = window._statsCompte || 'courant';
  const entries = (window._statsView === 'annuel')
    ? state.suivi.filter(e => e.annee === state.annee && !e.source_id && suiviCompte(e) === compte)
    : state.suivi.filter(e => e.mois === state.mois + 1 && e.annee === state.annee && !e.source_id && suiviCompte(e) === compte);
  const by = {};
  entries.forEach(e => {
    const d = parseFloat(e.debit || 0);
    if (d > 0) { const p = e.libelle_principal || 'Non classé'; by[p] = (by[p] || 0) + d; }
  });
  const items = Object.entries(by).sort((a,b)=>b[1]-a[1]);
  if (items.length === 0) return;
  const palette = ['#1E40AF','#2563EB','#3B82F6','#60A5FA','#F59E0B','#EF4444','#10B981','#8B5CF6','#EC4899','#14B8A6','#F97316','#6366F1'];
  new Chart(cv, {
    type: 'doughnut',
    data: {
      labels: items.map(i => i[0]),
      datasets: [{ data: items.map(i => +i[1].toFixed(2)),
        backgroundColor: items.map((_,i)=>palette[i % palette.length]),
        borderWidth: 2, borderColor: '#fff' }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, cutout: '62%',
      plugins: {
        legend: { position: 'bottom', labels: { boxWidth: 11, font: { size: 11 }, padding: 8 } },
        tooltip: { callbacks: { label: c => `${c.label}: ${c.parsed.toLocaleString('fr-FR',{minimumFractionDigits:2})} €` } }
      }
    }
  });
}

async function togglePointe(id, current) {
  const newVal = current === '✓' ? '' : '✓';
  await sb.from('suivi_mensuel').update({ pointe: newVal }).eq('id', id);

  // Virement automatique : pointer une opération du compte courant qui
  // correspond à une règle crée (ou retire) le crédit sur le compte cible
  const e = state.suivi.find(x => x.id === id);
  const dest = e && suiviCompte(e) === 'courant' ? destinationVirement(e) : '';
  if (e && dest) {
    const montant = parseFloat(e.debit || 0);
    if (montant > 0) {
      if (newVal === '✓') {
        const existe = state.suivi.some(x => x.source_id === id);
        if (!existe) {
          await sb.from('suivi_mensuel').insert({
            annee: e.annee, mois: e.mois, jour: e.jour,
            libelle_principal: 'Épargne',
            libelle_libre: 'Versement depuis compte courant',
            credit: montant, debit: null,
            compte: dest, source_id: id,
            is_mensualisation: false,
          });
        }
      } else {
        await sb.from('suivi_mensuel').delete().eq('source_id', id);
      }
    }
  }
  await loadData();
}

async function pointerTout() {
  const nonPointes = getSuiviMois().filter(e => e.pointe !== '✓');
  if (nonPointes.length === 0) { showToast('Toutes les opérations sont déjà pointées ✓', 'success'); return; }
  setSyncing(true);
  await Promise.all(nonPointes.map(e =>
    sb.from('suivi_mensuel').update({ pointe: '✓' }).eq('id', e.id)
  ));
  setSyncing(false);
  showToast(`${nonPointes.length} opération(s) pointée(s) ✓`, 'success');
  await loadData();
}

// ═══════════════════════════════════════════════════════
// IMPORT CSV BANCAIRE → auto-pointage + solde bancaire
// Formats supportés (auto-détection séparateur ; , et colonnes par heuristique) :
//   • Banque Postale : Date;Libellé;Débit;Crédit;Solde
//   • Boursorama    : dateOp;dateVal;label;category;amount
//   • Crédit Agric. : Date;Libelle;Debit;Credit;Solde
//   • BNP / CIC     : Date;Libelle;Debit;Credit
//   • Format Amount unique (négatif = débit) ou colonnes Débit/Crédit séparées
// ═══════════════════════════════════════════════════════
function _parseDateFR(s) {
  if (!s) return null;
  s = String(s).trim();
  // DD/MM/YYYY ou DD-MM-YYYY ou DD.MM.YYYY
  let m = s.match(/^(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (m) {
    const d = parseInt(m[1], 10), mo = parseInt(m[2], 10) - 1;
    let y = parseInt(m[3], 10);
    if (y < 100) y += 2000;
    return new Date(y, mo, d);
  }
  // YYYY-MM-DD ou YYYY/MM/DD
  m = s.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  return null;
}

function _parseMontantFR(s) {
  if (!s && s !== 0) return NaN;
  let str = String(s).trim();
  if (!str || str === '-') return NaN;
  // Vire espaces (séparateurs milliers) et symbole €
  str = str.replace(/[\s €]/g, '').replace(/[A-Za-z]/g, '');
  // Garde signe
  const neg = str.startsWith('-');
  if (neg) str = str.slice(1);
  // Si présence de , et . : la dernière est la décimale (format inversé)
  if (str.includes(',') && str.includes('.')) {
    const lastC = str.lastIndexOf(','), lastD = str.lastIndexOf('.');
    if (lastC > lastD) str = str.replace(/\./g, '').replace(',', '.');
    else str = str.replace(/,/g, '');
  } else {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? NaN : (neg ? -n : n);
}

// Parse un montant saisi dans un champ (gère la virgule décimale FR, les espaces et €).
// Renvoie null si le champ est vide ou invalide.
function parseMontant(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === '') return null;
  const n = _parseMontantFR(s);
  return isNaN(n) ? null : n;
}

function _splitCsvLine(line, sep) {
  const out = [];
  let cur = '', inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i+1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === sep) { out.push(cur); cur = ''; }
      else cur += c;
    }
  }
  out.push(cur);
  return out.map(s => s.trim());
}

function parseCSVContent(text) {
  // Normalise les fins de ligne et retire BOM
  text = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const lines = text.split('\n').filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [], soldeBancaire: null };

  // Détecte séparateur : compare ; , et \t sur la première ligne data-likely
  const sample = lines.slice(0, Math.min(5, lines.length)).join('\n');
  const counts = { ';': (sample.match(/;/g) || []).length,
                   ',': (sample.match(/,/g) || []).length,
                   '\t': (sample.match(/\t/g) || []).length };
  const sep = Object.entries(counts).sort((a,b) => b[1] - a[1])[0][0];

  // Détecte ligne d'en-tête : on cherche LA ligne dans les 20 premières qui
  // contient le plus de mots-clés métier (date, libellé, débit, crédit, etc.).
  // Cette heuristique survit aux métadonnées en début de fichier (compte, période…).
  const normCell = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/['"]/g, '');
  const KEYWORDS = ['date','libelle','libell','label','description','intitule','operation','motif',
                    'debit','depense','retrait','credit','recette','depot','montant','amount','somme','solde','balance'];
  let headerIdx = -1, headers = [], bestScore = 0;
  for (let i = 0; i < Math.min(20, lines.length); i++) {
    const cells = _splitCsvLine(lines[i], sep);
    if (cells.length < 2) continue;
    const cellsN = cells.map(normCell);
    let score = 0;
    KEYWORDS.forEach(kw => { if (cellsN.some(c => c.includes(kw))) score++; });
    if (score > bestScore) { bestScore = score; headerIdx = i; headers = cells; }
  }
  // Si aucun mot-clé reconnu (≥2 expected) → ordre standard FR : Date | Libellé | Débit | Crédit
  if (bestScore < 2) {
    headers = ['col0','col1','col2','col3','col4','col5'];
    headerIdx = -1;
  }

  // Détecte les indices des colonnes par mots-clés sur en-tête
  const norm = s => normCell(s);
  const findIdx = (...kws) => headers.findIndex(h => kws.some(k => norm(h).includes(k)));
  const idxDate    = findIdx('date');
  const idxLib     = findIdx('libelle','libell','label','description','intitule','operation','motif');
  const idxDebit   = findIdx('debit','depense','retrait');
  const idxCredit  = findIdx('credit','recette','depot');
  const idxMontant = findIdx('montant','amount','somme');
  const idxSolde   = findIdx('solde','balance');

  // Si aucune colonne reconnue, fallback : suppose Date | Libellé | Débit | Crédit (ordre standard FR)
  const fallback = idxDate < 0 && idxLib < 0;

  // ── Extraction du SOLDE depuis les métadonnées de début de fichier ──
  // (Banque Postale et autres mettent "Solde (EUROS);1234,56" en haut, avant le header)
  let metaSolde = null;
  if (headerIdx > 0) {
    for (let i = 0; i < headerIdx; i++) {
      const cells = _splitCsvLine(lines[i], sep);
      const keyN = normCell(cells[0] || '');
      if (keyN.includes('solde') || keyN.includes('balance')) {
        for (let j = 1; j < cells.length; j++) {
          const v = _parseMontantFR(cells[j]);
          if (!isNaN(v)) { metaSolde = v; break; }
        }
        if (metaSolde !== null) break;
      }
    }
  }

  const rows = [];
  let lastSolde = null;
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = _splitCsvLine(lines[i], sep);
    if (cells.length < 2) continue;
    let date, libelle = '', debit = 0, credit = 0;
    if (fallback) {
      date    = _parseDateFR(cells[0]);
      libelle = cells[1] || '';
      const d = _parseMontantFR(cells[2]);
      const c = _parseMontantFR(cells[3]);
      if (!isNaN(d) && d > 0) debit  = d;
      if (!isNaN(c) && c > 0) credit = c;
    } else {
      date    = idxDate >= 0 ? _parseDateFR(cells[idxDate]) : null;
      libelle = idxLib  >= 0 ? cells[idxLib] : (cells[1] || '');
      if (idxMontant >= 0) {
        const m = _parseMontantFR(cells[idxMontant]);
        if (!isNaN(m)) { if (m < 0) debit = Math.abs(m); else credit = m; }
      } else {
        const d = idxDebit  >= 0 ? _parseMontantFR(cells[idxDebit])  : NaN;
        const c = idxCredit >= 0 ? _parseMontantFR(cells[idxCredit]) : NaN;
        if (!isNaN(d) && d > 0) debit  = d;
        if (!isNaN(c) && c > 0) credit = c;
      }
    }
    if (!date || (debit === 0 && credit === 0)) continue;
    if (idxSolde >= 0) {
      const s = _parseMontantFR(cells[idxSolde]);
      if (!isNaN(s)) lastSolde = s;
    }
    rows.push({ date, libelle: libelle.trim(), debit, credit, amount: credit - debit });
  }
  // Solde bancaire : la valeur Solde de la dernière ligne du CSV (ou la première,
  // selon l'ordre — la plupart des banques mettent l'opération récente en haut)
  // Solde bancaire : priorité aux métadonnées (Banque Postale style),
  // sinon la valeur Solde de la dernière ligne data du CSV.
  const soldeBancaire = metaSolde !== null ? metaSolde : lastSolde;
  return { headers, rows, soldeBancaire };
}

function _normalizeLibelle(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, ' ').trim();
}

// Score précalc : ne re-normalise pas et ne reconstruit pas Date à chaque appel.
function _matchScoreCached(csv, dbCache) {
  const daysDiff = Math.abs((csv.date - dbCache.date) / 86400000);
  if (daysDiff > 5) return 0;
  if (Math.abs(csv.amount - dbCache.amount) > 0.01) return 0;
  let score = 10 - daysDiff * 1.5;
  if (csv.wordsNorm.length && dbCache.lib) {
    let matches = 0;
    for (const w of csv.wordsNorm) if (dbCache.lib.includes(w)) matches++;
    score += matches * 0.5;
  }
  return score;
}

function autoMatchCSV(csvRows, dbOps) {
  // Pré-calcule pour chaque dbOp : date, montant net, libellé normalisé.
  // Pré-calcule pour chaque csvRow : mots du libellé normalisés.
  // Indexe les dbOps par bucket de montant arrondi pour skipper les non-candidats.
  const dbCache = dbOps.map(op => {
    const debit  = parseFloat(op.debit  || 0);
    const credit = parseFloat(op.credit || 0);
    return {
      id: op.id,
      date: new Date(op.annee, op.mois, op.jour),
      amount: credit - debit,
      lib: _normalizeLibelle([op.libelle_principal, op.libelle_secondaire, op.libelle_libre, op.type_operation].filter(Boolean).join(' '))
    };
  });
  // Bucket par montant centimes (clé = Math.round(amount * 100))
  // Cherche les buckets [amount-1, amount, amount+1] pour tolérer ±0.01€
  const byAmount = new Map();
  for (const c of dbCache) {
    const k = Math.round(c.amount * 100);
    if (!byAmount.has(k)) byAmount.set(k, []);
    byAmount.get(k).push(c);
  }
  const csvCache = csvRows.map(r => {
    const lib = _normalizeLibelle(r.libelle);
    return { date: r.date, amount: r.amount, wordsNorm: lib ? lib.split(' ').filter(w => w.length > 2) : [] };
  });

  const taken = new Set();
  const matches = [];
  csvCache.forEach((csv, i) => {
    const targetK = Math.round(csv.amount * 100);
    // Candidats : buckets ±1 centime (tolérance 0.01€)
    const candidates = [];
    for (let dk = -1; dk <= 1; dk++) {
      const b = byAmount.get(targetK + dk);
      if (b) for (const c of b) if (!taken.has(c.id)) candidates.push(c);
    }
    let best = null, bestScore = 0;
    for (const c of candidates) {
      const sc = _matchScoreCached(csv, c);
      if (sc > bestScore) { bestScore = sc; best = c; }
    }
    if (best) {
      taken.add(best.id);
      matches.push({ csvIdx: i, dbId: best.id, score: bestScore });
    }
  });
  return matches;
}

// Conservé pour compat éventuelle (non utilisé dans le hot path)
function _matchScore(csvRow, dbOp) {
  const csvDate = csvRow.date;
  const dbDate  = new Date(dbOp.annee, dbOp.mois, dbOp.jour);
  const daysDiff = Math.abs((csvDate - dbDate) / 86400000);
  if (daysDiff > 5) return 0;
  const dbDebit  = parseFloat(dbOp.debit  || 0);
  const dbCredit = parseFloat(dbOp.credit || 0);
  const dbAmount = dbCredit - dbDebit;
  if (Math.abs(csvRow.amount - dbAmount) > 0.01) return 0;
  let score = 10 - daysDiff * 1.5;
  const csvLib = _normalizeLibelle(csvRow.libelle);
  const dbLib  = _normalizeLibelle([dbOp.libelle_principal, dbOp.libelle_secondaire, dbOp.libelle_libre, dbOp.type_operation].filter(Boolean).join(' '));
  if (csvLib && dbLib) {
    const csvWords = csvLib.split(' ').filter(w => w.length > 2);
    const matches  = csvWords.filter(w => dbLib.includes(w)).length;
    score += matches * 0.5;
  }
  return score;
}

// 🤖 IMPORT CSV AUTO : 1 clic → choix fichier → rapprochement + création + pointage,
// pas de modale d'aperçu, juste un toast récapitulatif.
function importCsvAuto() {
  // Crée un input file invisible et déclenche le picker immédiatement
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.csv,text/csv,text/plain,.txt';
  input.style.display = 'none';
  input.addEventListener('change', async () => {
    const file = input.files && input.files[0];
    document.body.removeChild(input);
    if (!file) return;
    await _runCsvAutoFlow(file);
  });
  document.body.appendChild(input);
  input.click();
}

async function _runCsvAutoFlow(file) {
  showToast(`📥 Lecture de ${file.name}…`, 'info');
  try {
    const text = await _readCsvSmart(file);
    const parsed = parseCSVContent(text);
    if (!parsed.rows.length) {
      showToast('Aucune opération détectée dans le CSV', 'error');
      return;
    }
    const compte = getCompteActif();
    const monthOps = getSuiviMois().filter(e => suiviCompte(e) === compte);
    const autoMatches = autoMatchCSV(parsed.rows, monthOps);
    const matchedSet = new Set(autoMatches.map(m => m.csvIdx));
    const toCreateIdx = parsed.rows.map((_, i) => i).filter(i => !matchedSet.has(i));

    setSyncing(true);
    // 1. Créer les nouvelles ops (déjà pointées)
    if (toCreateIdx.length) {
      const rows = toCreateIdx.map(i => {
        const r = parsed.rows[i];
        const d = r.date;
        return {
          annee: d.getFullYear(),
          mois: d.getMonth() + 1,
          jour: d.getDate(),
          libelle_principal: 'Import CSV',
          libelle_libre: (r.libelle || '').slice(0, 200),
          debit:  r.amount < 0 ? Math.abs(r.amount) : null,
          credit: r.amount > 0 ? r.amount : null,
          compte,
          pointe: '✓',
          is_mensualisation: false,
        };
      });
      const { error } = await sb.from('suivi_mensuel').insert(rows);
      if (error) { setSyncing(false); showToast('Erreur création : ' + error.message, 'error'); return; }
    }
    // 2. Pointer les ops auto-matchées (existantes)
    if (autoMatches.length) {
      await Promise.all(autoMatches.map(m =>
        sb.from('suivi_mensuel').update({ pointe: '✓' }).eq('id', m.dbId)
      ));
    }
    // 3. Solde si détecté
    if (parsed.soldeBancaire !== null) {
      await setSoldeBancaireDirect(parsed.soldeBancaire);
    }
    setSyncing(false);
    const parts = [];
    if (autoMatches.length) parts.push(`✓ ${autoMatches.length} pointée(s)`);
    if (toCreateIdx.length) parts.push(`✨ ${toCreateIdx.length} créée(s)`);
    if (parsed.soldeBancaire !== null) parts.push(`💰 solde ${fmt(parsed.soldeBancaire)}`);
    showToast(parts.length ? parts.join(' · ') : 'Rien à faire', 'success');
    await loadData();
  } catch (err) {
    setSyncing(false);
    showToast('Erreur : ' + (err.message || err), 'error');
    console.error('[CSV auto] Erreur :', err);
  }
}

function showImportCSV() {
  console.log('[CSV] showImportCSV()');
  document.getElementById('modal-content').innerHTML = `
    <div class="modal-header">
      <h3>📥 Importer un relevé bancaire CSV</h3>
      <button class="modal-close" onclick="closeModal()">×</button>
    </div>
    <div class="modal-body">
      <div class="csv-step" id="csv-step-1">
        <p class="csv-hint">
          Téléversez le fichier CSV de votre banque pour pointer
          les opérations correspondantes du mois <strong>${MOIS_FR[state.mois]} ${state.annee}</strong>.
          <br><small>Formats acceptés : Banque Postale, Boursorama, BNP, Crédit Agricole, etc.</small>
        </p>
        <!-- L'input file est positionné EN COUVERTURE de la drop zone, opacity:0.
             Plus fiable que display:none + label[for] qui casse sur certains navigateurs. -->
        <div class="csv-drop" id="csv-drop">
          <span style="font-size:36px;pointer-events:none">📄</span>
          <span style="pointer-events:none">Cliquer pour choisir un fichier CSV</span>
          <small style="pointer-events:none">ou glisser-déposer ici</small>
          <input type="file" id="csv-file" accept=".csv,text/csv,text/plain,.txt"
                 onchange="window.handleCSVFile(this.files[0])"
                 style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0">
        </div>
        <div id="csv-error-msg" style="display:none;margin-top:10px;padding:10px;background:#FEE2E2;color:#991B1B;border-radius:8px;font-size:12px"></div>
      </div>
      <div id="csv-step-2" style="display:none"></div>
    </div>`;
  document.getElementById('modal-overlay').classList.remove('hidden');

  // Drag & drop sur la drop zone — attaché APRÈS injection du DOM
  setTimeout(() => {
    const drop = document.getElementById('csv-drop');
    if (!drop) { console.error('[CSV] #csv-drop introuvable'); return; }
    console.log('[CSV] Drop zone bindée');
    drop.addEventListener('dragover',  e => { e.preventDefault(); e.stopPropagation(); drop.classList.add('drag'); });
    drop.addEventListener('dragenter', e => { e.preventDefault(); e.stopPropagation(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', e => { e.preventDefault(); e.stopPropagation(); drop.classList.remove('drag'); });
    drop.addEventListener('drop', e => {
      e.preventDefault(); e.stopPropagation();
      drop.classList.remove('drag');
      console.log('[CSV] Drop reçu, fichiers :', e.dataTransfer && e.dataTransfer.files);
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        window.handleCSVFile(e.dataTransfer.files[0]);
      } else {
        _csvShowError('Aucun fichier détecté dans le glisser-déposer.');
      }
    });
  }, 50);
}

// Helper pour afficher une erreur DANS la modal (plus visible qu'un toast)
function _csvShowError(msg) {
  const el = document.getElementById('csv-error-msg');
  if (el) { el.textContent = '❌ ' + msg; el.style.display = ''; }
  console.error('[CSV]', msg);
}

// Expose handleCSVFile sur window pour que les attributs onchange/inline marchent
// quel que soit le scope au moment de l'évaluation (les attributs HTML cherchent
// la fonction sur window, et si elle est dans un scope local elle est invisible).
window.handleCSVFile = (typeof handleCSVFile !== 'undefined') ? handleCSVFile : null;

async function _readCsvSmart(file) {
  // Détecte l'encodage : essaie UTF-8 ; si caractères remplacement (�) →
  // retry en Windows-1252 (très courant pour les exports bancaires français,
  // notamment Banque Postale, Crédit Agricole, BNP).
  const buf = await file.arrayBuffer();
  let txt = new TextDecoder('utf-8', { fatal: false }).decode(buf);
  // Détecte UTF-8 cassé : présence du caractère replacement OU séquences
  // typiques Latin-1 mal interprétées (e.g. "Ã©" = é en CP1252 lu UTF-8)
  const hasReplacement = txt.includes('�');
  const hasLatin1Junk  = /[ÈÌÍÎÏÒÓÔÕÖ]\s*[a-z]/.test(txt) && !/[éèêëàâäîïôöùûüç]/i.test(txt);
  if (hasReplacement || hasLatin1Junk) {
    try {
      const t2 = new TextDecoder('windows-1252', { fatal: false }).decode(buf);
      txt = t2;
      console.log('[CSV] Encodage détecté : Windows-1252');
    } catch (e) {
      console.warn('[CSV] Decoder windows-1252 indisponible, garde UTF-8 partiel');
    }
  } else {
    console.log('[CSV] Encodage détecté : UTF-8');
  }
  return txt;
}

async function handleCSVFile(file) {
  if (!file) { _csvShowError('Aucun fichier reçu.'); return; }
  console.log('[CSV] Fichier chargé :', file.name, file.size, 'bytes', file.type);
  // Indique visuellement le chargement (le parsing peut prendre 1-2s sur gros CSV)
  const drop = document.getElementById('csv-drop');
  if (drop) drop.innerHTML = '<span style="font-size:36px">⏳</span><span>Lecture en cours…</span><small>' + escHtml(file.name) + '</small>';
  try {
    const t0 = performance.now();
    const text = await _readCsvSmart(file);
    const t1 = performance.now();
    const parsed = parseCSVContent(text);
    const t2 = performance.now();
    console.log('[CSV] Parser résultat :', {
      headers: parsed.headers,
      nbRows: parsed.rows.length,
      firstRows: parsed.rows.slice(0, 3),
      soldeBancaire: parsed.soldeBancaire
    });
    if (!parsed.rows.length) {
      _csvDebugPanel(file, text, parsed);
      return;
    }
    const monthOps = getSuiviMois().filter(e => suiviCompte(e) === getCompteActif());
    const t3 = performance.now();
    const autoMatches = autoMatchCSV(parsed.rows, monthOps);
    const t4 = performance.now();
    console.log(`[CSV] Perf : read=${(t1-t0).toFixed(0)}ms · parse=${(t2-t1).toFixed(0)}ms · loadOps=${(t3-t2).toFixed(0)}ms (${monthOps.length} ops) · match=${(t4-t3).toFixed(0)}ms (${parsed.rows.length} rows)`);
    // `pairings` : csvIdx → { dbId, source: 'auto'|'manual'|null } (null = pas pointé)
    const pairings = parsed.rows.map((_, i) => {
      const m = autoMatches.find(x => x.csvIdx === i);
      return m ? { dbId: m.dbId, source: 'auto' } : null;
    });
    // Par défaut : mode MANUEL (l'utilisateur pointe lui-même).
    // L'auto-matching est juste pré-rempli comme suggestion qu'il peut accepter,
    // modifier ou rejeter — il y a aussi un bouton 🤖 si tout est OK.
    window._csvImport = { file: file.name, parsed, pairings, monthOps, mode: 'manual' };
    const t5 = performance.now();
    renderCSVPreview();
    const t6 = performance.now();
    console.log(`[CSV] Render preview : ${(t6-t5).toFixed(0)}ms`);
  } catch (err) {
    _csvShowError('Erreur lors du traitement : ' + (err.message || err));
    console.error('[CSV] Stack trace :', err);
    // Restaure la drop zone pour permettre un autre essai
    const drop = document.getElementById('csv-drop');
    if (drop) drop.innerHTML = `
      <span style="font-size:36px;pointer-events:none">📄</span>
      <span style="pointer-events:none">Cliquer pour réessayer</span>
      <small style="pointer-events:none">ou glisser-déposer ici</small>
      <input type="file" id="csv-file" accept=".csv,text/csv,text/plain,.txt"
             onchange="window.handleCSVFile(this.files[0])"
             style="position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer;font-size:0">`;
  }
}

function _csvStats() {
  const { parsed, pairings, monthOps } = window._csvImport;
  const matched      = pairings.filter(p => p && p.dbId).length;
  const toCreate     = pairings.filter(p => p && p.source === 'new').length;
  const unmatchedCsv = parsed.rows.length - matched - toCreate;
  const dbIdsTaken   = new Set(pairings.filter(p => p && p.dbId).map(p => p.dbId));
  const unmatchedDb  = monthOps.filter(o => !dbIdsTaken.has(o.id) && o.pointe !== '✓').length;
  return { matched, toCreate, unmatchedCsv, unmatchedDb };
}

function renderCSVMode() {
  const { file, parsed, pairings } = window._csvImport;
  const { matched, unmatchedCsv } = _csvStats();
  const stepEl = document.getElementById('csv-step-2');
  document.getElementById('csv-step-1').style.display = 'none';
  stepEl.style.display = '';
  stepEl.innerHTML = `
    <div class="csv-summary">
      <div class="csv-summary-file">📄 <strong>${escHtml(file)}</strong> · ${parsed.rows.length} opération(s) lue(s)</div>
      <div class="csv-mode-info">
        L'app a auto-détecté <strong>${matched}</strong> correspondance(s) sur ${parsed.rows.length}.
        ${unmatchedCsv > 0 ? `<br><small>${unmatchedCsv} ligne(s) CSV sans correspondance trouvée — vérifie en mode manuel.</small>` : ''}
      </div>
    </div>
    <div class="csv-mode-choice">
      <button class="csv-mode-btn auto" onclick="window._csvImport.mode='auto'; renderCSVPreview()">
        <div class="csv-mode-icon">🤖</div>
        <div class="csv-mode-title">Automatique</div>
        <div class="csv-mode-desc">Applique les ${matched} correspondance(s) trouvées en un clic.<br>Idéal si le CSV est propre.</div>
      </button>
      <button class="csv-mode-btn manual" onclick="window._csvImport.mode='manual'; renderCSVPreview()">
        <div class="csv-mode-icon">✋</div>
        <div class="csv-mode-title">Manuel</div>
        <div class="csv-mode-desc">Vérifie/modifie chaque ligne avant d'appliquer.<br>Choisis manuellement les correspondances ratées.</div>
      </button>
    </div>
    <div class="csv-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
    </div>`;
}

function renderCSVPreview() {
  const { file, parsed, pairings, monthOps, mode } = window._csvImport;
  const { matched, toCreate, unmatchedCsv, unmatchedDb } = _csvStats();
  const isManual = mode === 'manual';
  const dbIdsTaken = new Set(pairings.filter(p => p && p.dbId).map(p => p.dbId));
  // Map id → op pour lookup O(1) au lieu de monthOps.find() à chaque ligne
  const opsById = new Map(monthOps.map(o => [o.id, o]));

  // Bascule la modale : cache l'étape 1 (drop zone) et affiche l'étape 2 (résultats)
  const step1 = document.getElementById('csv-step-1');
  if (step1) step1.style.display = 'none';
  const stepEl = document.getElementById('csv-step-2');
  stepEl.style.display = '';
  stepEl.innerHTML = `
    <div class="csv-summary">
      <div class="csv-summary-file">
        📄 <strong>${escHtml(file)}</strong> · ${parsed.rows.length} op.
        <button class="csv-auto-btn" onclick="csvDoAutoMatch()" title="Accepte toutes les suggestions automatiques et pointe en un clic">🤖 Tout auto-pointer</button>
      </div>
      <div class="csv-instructions">
        ✋ <strong>Mode manuel</strong> — vérifie chaque ligne. Boutons : <kbd>↻</kbd> ou <kbd>＋</kbd> pour choisir une op · <kbd>✗</kbd> pour ne pas pointer.
      </div>
      <div class="csv-stats">
        <div class="csv-stat ok"><div class="csv-stat-val">${matched}</div><div class="csv-stat-lbl">✓ À pointer</div></div>
        <div class="csv-stat new"><div class="csv-stat-val">${toCreate}</div><div class="csv-stat-lbl">✨ À créer</div></div>
        <div class="csv-stat warn"><div class="csv-stat-val">${unmatchedCsv}</div><div class="csv-stat-lbl">? CSV non liées</div></div>
        <div class="csv-stat info"><div class="csv-stat-val">${unmatchedDb}</div><div class="csv-stat-lbl">○ Ops libres</div></div>
      </div>
      ${unmatchedCsv > 0 ? `<div style="text-align:center;margin:8px 0"><button class="btn-secondary" onclick="csvMarkAllNew()">✨ Créer toutes les ${unmatchedCsv} non liées</button></div>` : ''}
      <div class="csv-solde-hint">
        💰 <strong>Solde bancaire de ${MOIS_FR[state.mois]} ${state.annee}</strong>
        ${parsed.soldeBancaire !== null
          ? `<br><small>Détecté en fin de relevé : <strong>${fmt(parsed.soldeBancaire)}</strong></small>` : ''}
        <div class="csv-solde-input-row">
          <input type="text" inputmode="decimal" id="csv-solde-input"
                 placeholder="${parsed.soldeBancaire !== null ? fmt(parsed.soldeBancaire).replace(/\s/g,'') : '0,00'}"
                 value="">
          <span>€</span>
          ${parsed.soldeBancaire !== null
            ? `<button class="btn-mini" onclick="document.getElementById('csv-solde-input').value=${parsed.soldeBancaire}">Reprendre du CSV</button>` : ''}
        </div>
        <small class="csv-solde-help">Saisis le solde affiché sur ton relevé bancaire. Laisse vide pour ne pas le modifier.</small>
      </div>
    </div>
    <div class="csv-table-wrap">
      <table class="csv-preview-table">
        <thead><tr>
          <th>Date</th><th>Libellé CSV</th><th>Montant</th><th>Correspondance${isManual?' (cliquable)':''}</th>
        </tr></thead>
        <tbody>
          ${parsed.rows.map((r, i) => {
            const p = pairings[i];
            const op = p && p.dbId ? opsById.get(p.dbId) : null;
            const isNew = p && p.source === 'new';
            let rowClass;
            if (op) rowClass = p.source === 'manual' ? 'csv-row-manual' : 'csv-row-ok';
            else if (isNew) rowClass = 'csv-row-new';
            else rowClass = 'csv-row-noop';
            let matchCell;
            if (op) {
              matchCell = `<span class="csv-match-ok" title="Pointera : ${escHtml([op.libelle_principal,op.libelle_secondaire,op.libelle_libre].filter(Boolean).join(' / '))}">
                   ${p.source === 'manual' ? '✋' : '✓'} ${escHtml((op.libelle_principal||op.libelle_libre||'').slice(0,25))}
                 </span>`;
            } else if (isNew) {
              matchCell = `<span class="csv-match-new" title="Sera créée puis pointée">✨ Nouvelle op (créée + pointée)</span>`;
            } else {
              matchCell = `<span class="csv-match-no">— Pas trouvé</span>`;
            }
            let actionCell = '';
            if (isManual) {
              if (op) {
                actionCell = `<button class="csv-pick-btn" onclick="event.stopPropagation(); csvOpenPicker(${i})" title="Changer la correspondance">↻</button>
                              <button class="csv-clear-btn" onclick="event.stopPropagation(); csvClearPair(${i})" title="Ne pas pointer">✗</button>`;
              } else if (isNew) {
                actionCell = `<button class="csv-clear-btn" onclick="event.stopPropagation(); csvClearPair(${i})" title="Annuler la création">✗</button>`;
              } else {
                actionCell = `<button class="csv-pick-btn" onclick="event.stopPropagation(); csvOpenPicker(${i})" title="Lier à une op existante">＋ Lier</button>
                              <button class="csv-create-btn" onclick="event.stopPropagation(); csvMarkCreate(${i})" title="Créer cette opération dans le suivi">✨ Créer</button>`;
              }
            }
            return `<tr class="${rowClass}">
              <td>${r.date.toLocaleDateString('fr-FR')}</td>
              <td title="${escHtml(r.libelle)}">${escHtml(r.libelle.slice(0, 40))}${r.libelle.length>40?'…':''}</td>
              <td class="${r.amount >= 0 ? 'positive' : 'negative'}">${fmt(r.amount)}</td>
              <td>${matchCell}${isManual?' '+actionCell:''}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div class="csv-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      ${isManual ? `<button class="btn-secondary" onclick="csvResetToAuto()" title="Repartir des correspondances auto-détectées">↺ Reset auto</button>` : ''}
      <button class="btn-primary" onclick="applyCSVImport()" ${matched + toCreate === 0 ? 'disabled' : ''}>
        ${mode === 'auto' ? '🤖' : '✓'} ${toCreate > 0 ? `Créer ${toCreate} + ` : ''}Pointer ${matched} op${matched+toCreate > 1 ? 's' : ''}
      </button>
    </div>`;
}

function _csvDebugPanel(file, text, parsed) {
  // Panneau d'aide quand le parser ne trouve rien : affiche le contenu brut +
  // les premières lignes parsées + un sélecteur de séparateur manuel.
  const lines = text.replace(/\r\n?/g, '\n').split('\n').slice(0, 15);
  const stepEl = document.getElementById('csv-step-2');
  document.getElementById('csv-step-1').style.display = 'none';
  stepEl.style.display = '';
  const dump = lines.map((l, i) => `<div class="dbg-line"><span class="dbg-ln">${i+1}</span>${escHtml(l) || '<em>(vide)</em>'}</div>`).join('');
  stepEl.innerHTML = `
    <div class="csv-debug">
      <div class="csv-debug-title">⚠️ Aucune opération détectée — voici le brut du fichier :</div>
      <div class="csv-debug-meta">
        <strong>Fichier :</strong> ${escHtml(file.name)} (${file.size} octets) ·
        <strong>En-têtes détectés :</strong> ${parsed.headers.length ? parsed.headers.map(h=>'<code>'+escHtml(h)+'</code>').join(' ') : '<em>aucun</em>'}
      </div>
      <div class="csv-debug-dump">${dump}</div>
      <div class="csv-debug-tip">
        💡 Copie-colle ces lignes dans la discussion pour que je puisse t'aider à adapter le parser.
        <br>Vérifie aussi :
        <ul>
          <li>Le fichier est-il encodé en UTF-8 ? (essaie de l'ouvrir dans TextEdit pour confirmer)</li>
          <li>Le séparateur est-il bien <code>;</code> ou <code>,</code> ?</li>
          <li>Le format de date est-il <code>JJ/MM/AAAA</code> ?</li>
        </ul>
      </div>
      <div class="csv-actions">
        <button class="btn-cancel" onclick="closeModal()">Fermer</button>
        <button class="btn-secondary" onclick="document.getElementById('csv-file').click()">📄 Choisir un autre fichier</button>
      </div>
    </div>`;
}

function csvClearPair(csvIdx) {
  window._csvImport.pairings[csvIdx] = null;
  renderCSVPreview();
}

// Marque une ligne CSV non liée pour CRÉATION + POINTAGE lors de l'apply
function csvMarkCreate(csvIdx) {
  window._csvImport.pairings[csvIdx] = { source: 'new' };
  renderCSVPreview();
}

// Marque TOUTES les lignes CSV sans correspondance pour création
function csvMarkAllNew() {
  const { pairings } = window._csvImport;
  let count = 0;
  for (let i = 0; i < pairings.length; i++) {
    if (!pairings[i]) { pairings[i] = { source: 'new' }; count++; }
  }
  if (count === 0) { showToast('Aucune ligne sans correspondance', 'warn'); return; }
  renderCSVPreview();
  showToast(`✨ ${count} ligne(s) à créer marquée(s)`, 'success');
}

function csvResetToAuto() {
  const { parsed, monthOps } = window._csvImport;
  const autoMatches = autoMatchCSV(parsed.rows, monthOps);
  window._csvImport.pairings = parsed.rows.map((_, i) => {
    const m = autoMatches.find(x => x.csvIdx === i);
    return m ? { dbId: m.dbId, source: 'auto' } : null;
  });
  renderCSVPreview();
}

function csvOpenPicker(csvIdx) {
  const { parsed, pairings, monthOps } = window._csvImport;
  const csvRow = parsed.rows[csvIdx];
  const dbIdsTaken = new Set(pairings.filter((p,j) => p && p.dbId && j !== csvIdx).map(p => p.dbId));
  // Toutes les ops du mois NON pointées (ou la sélection actuelle) et NON prises par d'autres
  const candidates = monthOps.filter(o => (!dbIdsTaken.has(o.id) && o.pointe !== '✓')
                                          || (pairings[csvIdx] && pairings[csvIdx].dbId === o.id));
  // Trie par proximité date + amount
  candidates.sort((a, b) => {
    const sA = _matchScore(csvRow, a);
    const sB = _matchScore(csvRow, b);
    if (sB !== sA) return sB - sA;
    const dA = new Date(a.annee, a.mois, a.jour) - csvRow.date;
    const dB = new Date(b.annee, b.mois, b.jour) - csvRow.date;
    return Math.abs(dA) - Math.abs(dB);
  });
  // Modal secondaire
  const overlay = document.createElement('div');
  overlay.className = 'csv-picker-overlay';
  overlay.onclick = e => { if (e.target === overlay) overlay.remove(); };
  overlay.innerHTML = `
    <div class="csv-picker">
      <div class="csv-picker-head">
        <div>
          <div class="csv-picker-title">Choisir une opération</div>
          <div class="csv-picker-sub">${csvRow.date.toLocaleDateString('fr-FR')} · ${escHtml(csvRow.libelle.slice(0,50))} · <strong class="${csvRow.amount>=0?'positive':'negative'}">${fmt(csvRow.amount)}</strong></div>
        </div>
        <button class="modal-close" onclick="this.closest('.csv-picker-overlay').remove()">×</button>
      </div>
      <div class="csv-picker-list">
        ${candidates.length === 0 ? '<div class="csv-picker-empty">Aucune opération disponible dans ce mois.</div>' : ''}
        ${candidates.map(op => {
          const sc = _matchScore(csvRow, op);
          const opAmount = parseFloat(op.credit||0) - parseFloat(op.debit||0);
          const opLib = [op.libelle_principal, op.libelle_secondaire, op.libelle_libre].filter(Boolean).join(' · ');
          return `<button class="csv-picker-item ${sc>0?'has-score':''}" onclick="csvPickConfirm(${csvIdx}, '${op.id}')">
            <div class="cpi-date">${String(op.jour).padStart(2,'0')}/${String(op.mois+1).padStart(2,'0')}</div>
            <div class="cpi-lib"><div class="cpi-lib-main">${escHtml(opLib||'(sans libellé)')}</div>${op.type_operation?`<div class="cpi-lib-sub">${escHtml(op.type_operation)}</div>`:''}</div>
            <div class="cpi-amount ${opAmount>=0?'positive':'negative'}">${fmt(opAmount)}</div>
            ${sc > 0 ? `<div class="cpi-score" title="Score de correspondance">${sc.toFixed(1)}</div>` : ''}
          </button>`;
        }).join('')}
      </div>
    </div>`;
  document.body.appendChild(overlay);
}

function csvPickConfirm(csvIdx, dbId) {
  window._csvImport.pairings[csvIdx] = { dbId, source: 'manual' };
  // Ferme le picker
  document.querySelectorAll('.csv-picker-overlay').forEach(el => el.remove());
  renderCSVPreview();
}

async function applyCSVImport() {
  const { parsed, pairings } = window._csvImport;
  const toPoint  = pairings.filter(p => p && p.dbId);
  const toCreate = pairings.map((p, i) => p && p.source === 'new' ? i : -1).filter(i => i >= 0);
  // Récupère la saisie solde
  const soldeInput = document.getElementById('csv-solde-input');
  const soldeStr = soldeInput ? soldeInput.value.trim().replace(',', '.') : '';
  const soldeVal = soldeStr === '' ? null : parseFloat(soldeStr);
  const hasSolde = soldeVal !== null && !isNaN(soldeVal);

  if (!toPoint.length && !toCreate.length && !hasSolde) {
    showToast('Rien à enregistrer', 'warn');
    return;
  }
  setSyncing(true);
  // 1. Créer les nouvelles ops (compte actif, pointées d'office puisque sur relevé bancaire)
  let createdCount = 0;
  if (toCreate.length) {
    const compte = getCompteActif();
    const rows = toCreate.map(i => {
      const r = parsed.rows[i];
      const d = r.date;
      return {
        annee: d.getFullYear(),
        mois: d.getMonth() + 1,  // DB stocke mois 1-indexé
        jour: d.getDate(),
        libelle_principal: 'Import CSV',
        libelle_libre: (r.libelle || '').slice(0, 200),
        debit:  r.amount < 0 ? Math.abs(r.amount) : null,
        credit: r.amount > 0 ? r.amount : null,
        compte,
        pointe: '✓',  // déjà sur le relevé bancaire = déjà passé
        is_mensualisation: false,
      };
    });
    const { error } = await sb.from('suivi_mensuel').insert(rows);
    if (error) {
      setSyncing(false);
      showToast('Erreur création : ' + error.message, 'error');
      return;
    }
    createdCount = rows.length;
  }
  // 2. Pointer les ops liées (existantes)
  if (toPoint.length) {
    await Promise.all(toPoint.map(p =>
      sb.from('suivi_mensuel').update({ pointe: '✓' }).eq('id', p.dbId)
    ));
  }
  // 3. Solde
  if (hasSolde) {
    await setSoldeBancaireDirect(soldeVal);
  }
  setSyncing(false);
  const nbManual = toPoint.filter(p => p.source === 'manual').length;
  const parts = [];
  if (createdCount) parts.push(`✨ ${createdCount} op. créée(s) + pointée(s)`);
  if (toPoint.length) parts.push(`✓ ${toPoint.length} op. pointée(s)${nbManual ? ` (${nbManual} manuel)` : ''}`);
  if (hasSolde) parts.push(`solde ${fmt(soldeVal)} enregistré`);
  showToast(parts.join(' · '), 'success');
  closeModal();
  await loadData();
}

// 🤖 Accepte toutes les correspondances auto-détectées et applique direct (sans
// changer le mode actuel — reste en manuel pour les suivants si l'utilisateur
// veut continuer à pointer ce qui restait).
async function csvDoAutoMatch() {
  const { parsed, monthOps } = window._csvImport;
  // Recalcule les auto-matches (au cas où l'utilisateur en a modifié certains)
  const auto = autoMatchCSV(parsed.rows, monthOps);
  if (!auto.length) {
    showToast('Aucune correspondance automatique trouvée', 'warn');
    return;
  }
  setSyncing(true);
  await Promise.all(auto.map(m =>
    sb.from('suivi_mensuel').update({ pointe: '✓' }).eq('id', m.dbId)
  ));
  setSyncing(false);
  showToast(`🤖 ${auto.length} opération(s) auto-pointée(s) ✓`, 'success');
  closeModal();
  await loadData();
}

async function setSoldeBancaireDirect(val) {
  // Helper pour màj le solde bancaire du mois/compte courant sans passer par la modal.
  // Utilise exactement la même clé que saveSoldeBancaire().
  const c = getCompteActif();
  const key = c === 'courant'
    ? `solde_banque_${state.annee}_${String(state.mois + 1).padStart(2,'0')}`
    : `banque_${c}_${state.annee}_${String(state.mois + 1).padStart(2,'0')}`;
  await setParam(key, String(val));
}

async function inscrireMensualisations() {
  const mk    = MOIS_KEYS[state.mois];
  const mois  = state.mois + 1;
  const annee = state.annee;

  const toInsert = state.mensualisations.filter(m => m[mk] != null);
  if (toInsert.length === 0) { showToast('Aucune mensualisation pour ce mois', 'error'); return; }

  const compte = getCompteActif();
  const existing = state.suivi.filter(s => s.mois === mois && s.annee === annee && s.is_mensualisation && suiviCompte(s) === compte);

  // Si une seule mensualisation a déjà été inscrite ce mois sur ce compte, on bloque.
  // Aucune suppression, aucune modification des lignes existantes.
  if (existing.length > 0) {
    showToast(`Mensualisations déjà inscrites pour ${MOIS_FR[state.mois]} ${annee} (${existing.length} ligne${existing.length>1?'s':''}) — aucune action.`, 'error');
    return;
  }

  const rows = toInsert.map((m, i) => ({
    annee,
    mois,
    jour:               m.jour,
    libelle_principal:  m.libelle_principal,
    libelle_secondaire: m.libelle_secondaire,
    type_operation:     m.type_operation,
    credit: m.operation === 'Crédit' ? parseFloat(m[mk]) : null,
    debit:  m.operation === 'Débit'  ? parseFloat(m[mk]) : null,
    is_mensualisation: true,
    compte,
    ordre: i,
  }));

  setSyncing(true);
  const { error } = await sb.from('suivi_mensuel').insert(rows);
  setSyncing(false);
  if (error) { showToast('Erreur : ' + error.message, 'error'); return; }
  showToast(`${rows.length} mensualisations inscrites ✓`, 'success');
  await loadData();
}

// ── Solde de départ ──────────────────────────────────────
function showSoldeDepart() {
  const current = getSoldeDepart(state.mois, state.annee);
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Solde de report — ${nomCompteActif()} — ${MOIS_FR[state.mois]} ${state.annee}</div>
  <div class="modal-form" id="solde-form">
    <div class="form-group">
      <label>Solde de report (€)</label>
      <input type="text" inputmode="decimal" id="solde-input" value="${current}" placeholder="0,00">
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveSoldeDepart()">Enregistrer</button>
    </div>
  </div>`);
}

async function saveSoldeDepart() {
  const val = _parseMontantFR(document.getElementById('solde-input').value);
  if (isNaN(val)) { showToast('Montant invalide', 'error'); return; }
  const mois = state.mois + 1;
  const annee = state.annee;
  const compte = getCompteActif();
  setSyncing(true);
  let error;
  if (compte === 'courant') {
    ({ error } = await sb.from('soldes_depart')
      .upsert({ annee, mois, solde: val }, { onConflict: 'annee,mois' }));
  } else {
    const k = `report_${compte}_${annee}_${String(mois).padStart(2,'0')}`;
    ({ error } = await sb.from('parametres').upsert({ cle: k, valeur: String(val) }, { onConflict: 'cle' }));
  }
  setSyncing(false);
  if (error) { showToast('Erreur : ' + error.message, 'error'); return; }
  showToast('Solde de report enregistré', 'success');
  closeModal();
  await loadData();
}

function getSoldeBancaire(mois, annee, compte) {
  compte = compte || getCompteActif();
  const key = compte === 'courant'
    ? `solde_banque_${annee}_${String(mois + 1).padStart(2,'0')}`
    : `banque_${compte}_${annee}_${String(mois + 1).padStart(2,'0')}`;
  return parseFloat(state.parametres[key] || 'NaN');
}

function showSoldeBancaire() {
  const current = getSoldeBancaire(state.mois, state.annee);
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Solde bancaire réel — ${nomCompteActif()} — ${MOIS_FR[state.mois]} ${state.annee}</div>
  <div class="modal-form" id="solde-banque-form">
    <div class="form-group">
      <label>Solde affiché sur votre relevé bancaire (€)</label>
      <input type="text" inputmode="decimal" id="solde-banque-input" value="${isNaN(current) ? '' : current}" placeholder="0,00">
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveSoldeBancaire()">Enregistrer</button>
    </div>
  </div>`);
}

async function saveSoldeBancaire() {
  const val = _parseMontantFR(document.getElementById('solde-banque-input').value);
  if (isNaN(val)) { showToast('Montant invalide', 'error'); return; }
  const c = getCompteActif();
  const key = c === 'courant'
    ? `solde_banque_${state.annee}_${String(state.mois + 1).padStart(2,'0')}`
    : `banque_${c}_${state.annee}_${String(state.mois + 1).padStart(2,'0')}`;
  await setParam(key, String(val));
  closeModal();
  showToast('Solde bancaire enregistré ✓', 'success');
  render();
}

async function purgerMois() {
  const moisFR = MOIS_FR[state.mois];
  const ids = getSuiviMois().map(e => e.id);
  if (ids.length === 0) { showToast('Aucune opération à effacer ce mois', 'error'); return; }
  if (!confirm(`⚠️ Supprimer les ${ids.length} opérations de ${moisFR} ${state.annee} — ${nomCompteActif()} ?\n\nCette action est irréversible.`)) return;
  setSyncing(true);
  await sb.from('suivi_mensuel').delete().in('id', ids);
  setSyncing(false);
  showToast(`Données de ${moisFR} effacées (${nomCompteActif()})`, 'success');
  await loadData();
}

// ── Formulaire saisie opération ──────────────────────────
function suiviForm(data = {}) {
  const uid = ++_libUid;
  const { base: typeBase, echeance: echeanceVal } = parsePaypal4X(data.type_operation || '');
  const isPaypal4X = typeBase === 'Paypal en 4X';
  const isCheque  = (typeBase || '').includes('Chèque');
  const moisVal  = data.mois  != null ? parseInt(data.mois)  : (state.mois + 1);
  const anneeVal = data.annee != null ? parseInt(data.annee) : state.annee;
  const anneeMin = state.annee - 2, anneeMax = state.annee + 2;
  const anneesOpt = [];
  for (let y = anneeMin; y <= anneeMax; y++) anneesOpt.push(y);
  // Virement interne : compte de destination du miroir
  const compteSrc = data.compte || getCompteActif();
  const autresComptes = getComptes().filter(c => c.id !== compteSrc);
  const mirror = data.id ? state.suivi.find(x => x.source_id === data.id) : null;
  const compteDestVal = mirror ? mirror.compte : '';
  return `
  <div class="row2">
    <div class="form-group">
      <label>Mois</label>
      <select name="mois" onchange="refreshEch1Recap(${uid})">
        ${MOIS_FR.map((m,i) => `<option value="${i+1}"${(i+1)===moisVal?' selected':''}>${m}</option>`).join('')}
      </select>
    </div>
    <div class="form-group">
      <label>Année</label>
      <select name="annee" onchange="refreshEch1Recap(${uid})">
        ${anneesOpt.map(y => `<option value="${y}"${y===anneeVal?' selected':''}>${y}</option>`).join('')}
      </select>
    </div>
  </div>
  <div class="row2">
    <div class="form-group">
      <label>Jour</label>
      <input type="number" name="jour" min="1" max="31" value="${data.jour || ''}" placeholder="1–31" oninput="refreshEch1Recap(${uid})">
    </div>
    <div class="form-group">
      <label>N° Chèque</label>
      <input type="text" name="num_cheque" value="${escHtml(data.num_cheque || '')}" placeholder="Optionnel">
      <button type="button" class="btn-annul-inline" id="btn-annul-${uid}" onclick="annulerChequeInline(this)" style="display:${isCheque ? '' : 'none'}">✖ Annuler ce chèque</button>
    </div>
  </div>
  ${libSelects(data)}
  <div class="form-group">
    <label>Libellé libre</label>
    <input type="text" name="libelle_libre" value="${escHtml(data.libelle_libre || '')}" placeholder="Description libre…">
  </div>
  <div class="form-group">
    <label>Type d'opération</label>
    <select name="type_operation" onchange="autoFillCheque(this); toggleEcheance4X(this,${uid})">
      ${getMoyensPaiement().map(t => `<option${typeBase===t?' selected':''}>${t}</option>`).join('')}
    </select>
  </div>
  ${data.id
    ? echeanceGroup4X(uid, isPaypal4X, echeanceVal || 1)
    : echeanceMultiGroup4X(uid, isPaypal4X, parseInt(data.jour) || null, moisVal, anneeVal)}
  <div class="row2">
    <div class="form-group">
      <label>Crédit (€)</label>
      <input type="text" inputmode="decimal" name="credit" value="${data.credit != null ? data.credit : ''}" placeholder="0,00">
    </div>
    <div class="form-group">
      <label>Débit (€)</label>
      <input type="text" inputmode="decimal" name="debit" value="${data.debit != null ? data.debit : ''}" placeholder="0,00">
    </div>
  </div>
  ${autresComptes.length ? `
  <div class="form-group">
    <label>Virement vers (autre compte)</label>
    <select name="compte_dest">
      <option value="">— Aucun —</option>
      ${autresComptes.map(c => `<option value="${c.id}"${c.id===compteDestVal?' selected':''}>${escHtml(c.nom)}</option>`).join('')}
    </select>
    <div class="sub" style="margin-top:4px;font-size:11px;color:#888">Si renseigné, le montant débité ici sera crédité sur le compte choisi (et inversement).</div>
  </div>` : ''}`;
}

function showAddSuiviEntry() {
  const today = new Date().getDate();
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Nouvelle opération</div>
  <div class="modal-form" id="suivi-form">
    ${suiviForm({ jour: today })}
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveSuiviEntry(null)">Enregistrer</button>
    </div>
  </div>`);
}

function showEditSuiviEntry(id) {
  const e = state.suivi.find(x => x.id === id);
  if (!e) return;
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Modifier l'opération</div>
  <div class="modal-form" id="suivi-form">
    ${suiviForm(e)}
    <div class="modal-actions modal-actions-edit">
      <button class="btn-danger" onclick="deleteSuiviEntry('${id}')">Supprimer</button>
      <button class="btn-dup" onclick="dupliquerSuiviEntry('${id}')">⧉ Dupliquer</button>
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveSuiviEntry('${id}')">Enregistrer</button>
    </div>
  </div>`);
}

function dupliquerSuiviEntry(id) {
  const e = state.suivi.find(x => x.id === id);
  if (!e) return;
  const copie = { ...e };
  delete copie.id;
  delete copie.created_at;
  delete copie.updated_at;
  copie.pointe = '';
  copie.is_mensualisation = false;
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Dupliquer l'opération</div>
  <div class="modal-form" id="suivi-form">
    ${suiviForm(copie)}
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveSuiviEntry(null)">Créer la copie</button>
    </div>
  </div>`);
}

async function saveSuiviEntry(id) {
  const form = document.getElementById('suivi-form');
  const data = {};
  // On extrait à part les champs Éch 2/3/4 (mode 4X création)
  const ech = {};
  form.querySelectorAll('[name]').forEach(el => {
    if (el.name === 'echeance') return; // sélecteur unique (mode édition uniquement)
    const m = /^ech(\d)_(jour|mois|annee|montant)$/.exec(el.name);
    if (m) {
      const n = m[1], key = m[2];
      ech[n] = ech[n] || {};
      ech[n][key] = el.value.trim() || null;
      return;
    }
    data[el.name] = el.value.trim() || null;
  });
  // Combine Paypal en 4X + échéance (mode édition : sélecteur unique présent)
  const isPp4xCreation = data.type_operation === 'Paypal en 4X' && !id && Object.keys(ech).length > 0;
  if (data.type_operation === 'Paypal en 4X' && id) {
    const echeanceSel = form.querySelector('[name="echeance"]');
    const n = echeanceSel ? echeanceSel.value : '1';
    data.type_operation = `Paypal en 4X – Éch. ${n}/4`;
  }
  data.jour   = data.jour   ? parseInt(data.jour)    : null;
  data.mois   = data.mois   ? parseInt(data.mois)    : (state.mois + 1);
  data.annee  = data.annee  ? parseInt(data.annee)   : state.annee;
  data.credit = parseMontant(data.credit);
  data.debit  = parseMontant(data.debit);
  if (data.credit == null && data.debit == null) {
    showToast('Indiquez un crédit ou un débit', 'error'); return;
  }
  // Compte destinataire (virement interne) — extrait avant l'envoi en base
  const compteDest = data.compte_dest || '';
  delete data.compte_dest;
  if (!id) {
    data.is_mensualisation = false;
    data.compte = getCompteActif();
  }
  setSyncing(true);
  let err, savedId = id;
  // Mode "Paypal en 4X — création" : on insère 4 lignes datées Éch 1/4 → Éch 4/4
  // Chaque ligne peut avoir son propre montant (sinon reprend celui de la 1ère échéance).
  if (isPp4xCreation) {
    const isCredit = data.credit != null;
    const baseMontant = isCredit ? data.credit : data.debit;
    const rows = [];
    for (let n = 1; n <= 4; n++) {
      const r = { ...data, type_operation: `Paypal en 4X – Éch. ${n}/4` };
      if (n === 1) {
        // Éch 1 utilise la date et le montant principaux (déjà dans data)
      } else {
        const d = ech[n] || {};
        r.jour  = d.jour  ? parseInt(d.jour)  : data.jour;
        r.mois  = d.mois  ? parseInt(d.mois)  : data.mois;
        r.annee = d.annee ? parseInt(d.annee) : data.annee;
        // Montant : champ vide → reprend la valeur de la 1ère échéance
        const mnt = d.montant ? parseMontant(d.montant) : baseMontant;
        if (isCredit) { r.credit = mnt; r.debit = null; }
        else          { r.debit  = mnt; r.credit = null; }
      }
      rows.push(r);
    }
    const { data: insRows, error: e } = await sb.from('suivi_mensuel').insert(rows).select();
    err = e;
    if (insRows && insRows.length) savedId = insRows[0].id;
  } else if (id) {
    ({ error: err } = await sb.from('suivi_mensuel').update(data).eq('id', id));
  } else {
    const ins = await sb.from('suivi_mensuel').insert(data).select().single();
    err = ins.error;
    if (ins.data) savedId = ins.data.id;
  }
  // Gestion du miroir (virement interne entre comptes)
  if (!err && savedId) {
    const compteSrc = data.compte || (state.suivi.find(x => x.id === savedId) || {}).compte || 'courant';
    const existingMirror = state.suivi.find(x => x.source_id === savedId);
    if (compteDest && compteDest !== compteSrc) {
      const srcNom = (getComptes().find(c => c.id === compteSrc) || {}).nom || 'compte source';
      const dstNom = (getComptes().find(c => c.id === compteDest) || {}).nom || 'compte';
      const mirrorPayload = {
        annee: data.annee,
        mois:  data.mois,
        jour:  data.jour,
        libelle_principal: data.libelle_principal || 'Virement',
        libelle_secondaire: data.libelle_secondaire || null,
        libelle_libre: data.debit
          ? `Versement depuis ${srcNom}`
          : `Versement vers ${srcNom}`,
        type_operation: data.type_operation || 'Virement',
        credit: data.debit,
        debit:  data.credit,
        compte: compteDest,
        source_id: savedId,
        is_mensualisation: false,
      };
      if (existingMirror) {
        await sb.from('suivi_mensuel').update(mirrorPayload).eq('id', existingMirror.id);
      } else {
        await sb.from('suivi_mensuel').insert(mirrorPayload);
      }
    } else if (existingMirror) {
      await sb.from('suivi_mensuel').delete().eq('id', existingMirror.id);
    }
  }
  setSyncing(false);
  if (err) { showToast('Erreur : ' + err.message, 'error'); return; }
  // Enrichit automatiquement la liste des libellés si une saisie libre apparaît
  await ensureLibelleExists(data.libelle_principal, data.libelle_secondaire);
  showToast(id ? 'Opération mise à jour' : 'Opération ajoutée', 'success');
  closeModal();
  // Mettre à jour le prochain numéro de chèque
  const savedType = data.type_operation || '';
  const savedNum = data.num_cheque;
  if (savedType.includes('Chèque') && savedNum && /^\d+$/.test(savedNum)) {
    const cle = savedType.includes('Robert') ? 'chequier_robert' : 'chequier_carmela';
    // Conserve les zéros de tête (ex. 0125842 → 0125843)
    const next = String(parseInt(savedNum) + 1).padStart(savedNum.length, '0');
    await setParam(cle, next);
  }
  await loadData();
}

async function deleteSuiviEntry(id) {
  if (!confirm('Supprimer cette opération ?')) return;
  closeModal();
  await sb.from('suivi_mensuel').delete().eq('id', id);
  // Retire aussi le virement épargne automatique éventuellement lié
  await sb.from('suivi_mensuel').delete().eq('source_id', id);
  showToast('Supprimée', 'success');
  await loadData();
}

// ═══════════════════════════════════════════════════════
// PARAMÈTRES
// ═══════════════════════════════════════════════════════
function renderParametres() {
  const soldeExercice = state.soldes.find(x => x.mois === 1 && x.annee === state.annee);
  const soldeVal = soldeExercice ? parseFloat(soldeExercice.solde) : 0;

  const tk = getThemeKey();
  return `
  <div class="params-section">

    <h3>Thème de couleur</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="sub">Choisissez la couleur d'accent de l'application. Le réglage est synchronisé sur tous vos appareils.</div>
      </div>
      <div class="theme-grid">
        ${Object.entries(THEMES).map(([k,t]) => `
        <button class="theme-swatch${k===tk?' active':''}" onclick="setTheme('${k}')" title="${t.nom}">
          <span class="ts-circle" style="background:linear-gradient(135deg, ${t.dark}, ${t.mid})"></span>
          <span class="ts-name">${t.nom}</span>
          ${k===tk?'<span class="ts-check">✓</span>':''}
        </button>`).join('')}
      </div>
    </div>

    <h3>Mode sombre</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="sub">Choisissez l'apparence claire ou sombre — ou laissez Auto pour suivre les réglages système.</div>
      </div>
      ${(() => {
        const dm = getDarkMode();
        const opts = [
          ['light', '☀️', 'Clair'],
          ['auto',  '⚙️', 'Auto'],
          ['dark',  '🌙', 'Sombre'],
        ];
        return `<div class="darkmode-grid">${opts.map(([k,ic,n]) => `
          <button class="dm-swatch${k===dm?' active':''}" onclick="setDarkMode('${k}')">
            <span class="dm-icon">${ic}</span>
            <span class="dm-name">${n}</span>
            ${k===dm?'<span class="dm-check">✓</span>':''}
          </button>`).join('')}</div>`;
      })()}
    </div>

    <h3>Banque du compte courant</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="sub">Choisissez votre banque : son badge s'affichera sur la page Suivi. Synchronisé sur tous vos appareils.</div>
      </div>
      <div class="bank-grid">
        ${Object.entries(BANKS).map(([k,b]) => `
        <button class="bank-pick${k===getBanque()?' active':''}" onclick="setBanque('${k}')" title="${escHtml(b.l1)} ${escHtml(b.l2)}">
          <span class="bp-mark" style="background:${b.mkBg};color:${b.mkFg}">${escHtml(b.mk)}</span>
          <span class="bp-name"><span style="color:${b.c1}">${escHtml(b.l1)}</span> ${escHtml(b.l2)}</span>
          ${k===getBanque()?'<span class="bp-check">✓</span>':''}
        </button>`).join('')}
      </div>
      <div class="bank-logo-import">
        <div class="sub" style="margin:14px 0 8px">Logo personnel (facultatif) — importez votre propre fichier image. Il remplacera le badge sur la page Suivi.</div>
        ${getBanqueLogo() ? `
        <div class="bank-logo-preview">
          <img src="${getBanqueLogo()}" alt="Logo importé">
          <button class="btn-small btn-danger" onclick="supprimerLogoBanque()">Supprimer</button>
        </div>` : ''}
        <button class="btn-small" onclick="document.getElementById('bank-logo-file').click()">${getBanqueLogo() ? 'Remplacer le logo' : 'Importer un logo'}</button>
        <input type="file" id="bank-logo-file" accept="image/*" class="hidden" onchange="chargerLogoBanque(event)">
      </div>
    </div>

    <h3>Titre de la page Suivi</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:8px">
        <div class="sub">Personnalisez le titre affiché en haut de la page Suivi (et sur l'export PDF). Synchronisé sur tous vos appareils.</div>
      </div>
      <div class="chip-input-row">
        <input type="text" id="suivi-titre-inp" value="${escHtml(getSuiviTitre())}" placeholder="Ex : Suivi compte courant…">
        <button class="btn-small" onclick="setSuiviTitre()">Enregistrer</button>
      </div>
    </div>

    <h3>Solde bancaire début d'exercice</h3>
    <div class="card" style="margin:0">
      <div class="params-item" style="border:none;padding:0 0 12px 0">
        <div class="params-item-left">
          <div class="name">Solde au 1er janvier ${state.annee}</div>
          <div class="sub">Solde réel du compte bancaire à l'ouverture</div>
        </div>
      </div>
      <div class="chip-input-row">
        <input type="text" inputmode="decimal" id="solde-exercice-inp" value="${soldeVal}" placeholder="0,00">
        <button class="btn-small" onclick="saveSoldeExercice()">Enregistrer</button>
      </div>
    </div>

    <h3>Libellés</h3>
    <div class="params-item-left" style="margin:-2px 0 8px">
      <div class="sub">Touchez le 📷 d'une catégorie ou d'une sous-catégorie pour lui attribuer un logo. Il s'affichera en début de ligne dans le Suivi (la sous-catégorie est prioritaire sur la catégorie).</div>
    </div>
    <div class="libelles-manager" id="libelles-manager">
      ${state.libelles.map(l => {
        const secs = getSecondaires(l.principal);
        return `
        <div class="libelle-block" id="lib-block-${l.id}">
          <div class="libelle-block-header">
            ${catLogoControlHTML(l.id, -1, getCatLogo(l.principal, ''))}
            <button class="libelle-toggle" onclick="toggleLibelleBlock('${l.id}')">
              <span class="toggle-arrow">▶</span>
              <strong>${escHtml(l.principal)}</strong>
              <span class="sec-count">${secs.length} secondaire${secs.length!==1?'s':''}</span>
            </button>
            <button class="btn-icon" onclick="renameLibellePrincipal('${l.id}')" title="Renommer">✏️</button>
            <button class="btn-icon danger" onclick="deleteLibelle('${l.id}')" title="Supprimer">×</button>
          </div>
          <div class="libelle-block-body hidden" id="lib-body-${l.id}">
            <div class="secondaires-list" id="secs-${l.id}">
              ${secs.map((s,i) => `
              <div class="sec-item">
                ${catLogoControlHTML(l.id, i, getCatLogo(l.principal, s))}
                <span>${escHtml(s)}</span>
                <button class="btn-icon" onclick="renameSecondaire('${l.id}', ${i})" title="Renommer">✏️</button>
                <button class="btn-icon danger" onclick="deleteSecondaire('${l.id}', ${i})" title="Supprimer">×</button>
              </div>`).join('') || '<div class="sec-empty">Aucun secondaire</div>'}
            </div>
            <div class="chip-input-row" style="margin-top:8px">
              <input type="text" id="new-sec-${l.id}" placeholder="Nouveau secondaire…">
              <button class="btn-small" onclick="addSecondaire('${l.id}')">+</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
    <div class="chip-input-row" style="margin-top:12px">
      <input type="text" id="new-principal" placeholder="Nouveau libellé principal…">
      <button class="btn-small" onclick="addLibellePrincipal()">Ajouter</button>
    </div>

    <h3>Moyens de paiement</h3>
    <div class="card" style="margin:0">
      <div class="mp-list" id="mp-list">
        ${getMoyensPaiement().map((mp, i) => `
        <div class="mp-item">
          <span class="mp-ico">${entryIcon({ libelle_principal: mp })}</span>
          <span class="mp-nom">${escHtml(mp)}</span>
          <button class="btn-icon danger" onclick="deleteMoyenPaiement(${i})" title="Supprimer">×</button>
        </div>`).join('') || '<div class="sec-empty">Aucun moyen de paiement</div>'}
      </div>
      <div class="chip-input-row" style="margin-top:8px">
        <input type="text" id="new-mp" placeholder="Nouveau moyen de paiement…">
        <button class="btn-small" onclick="addMoyenPaiement()">Ajouter</button>
      </div>
    </div>

    <h3>Comptes bancaires</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="sub">Gérez vos comptes (Livret, Épargne…). Chaque compte a son propre suivi journalier et son propre rapprochement. Le compte courant existe toujours.</div>
      </div>
      <div class="compte-list">
        ${getComptes().map(c => `<div class="compte-item"><span>${c.id==='courant'?'🏦':'💰'} ${escHtml(c.nom)}</span><span class="compte-actions"><button class="btn-icon" onclick="renommerCompte('${c.id}')" title="Renommer">✎</button>${c.id==='courant'?'<span class="sec-empty" style="padding:0">principal</span>':`<button class="btn-icon danger" onclick="supprimerCompte('${c.id}')" title="Supprimer">×</button>`}</span></div>`).join('')}
      </div>
      <div class="chip-input-row" style="margin-top:8px">
        <input type="text" id="new-compte" placeholder="Nouveau compte (ex : Livret A)…">
        <button class="btn-small" onclick="ajouterCompte()">Ajouter</button>
      </div>
      ${getComptes().length > 1 ? `
      <div class="params-item-left" style="margin:16px 0 8px">
        <div class="name">↪ Virements automatiques</div>
        <div class="sub">Quand vous <strong>pointez</strong> une opération du compte courant dont le libellé contient le mot-clé, son montant est crédité automatiquement sur le compte cible. Règle la plus spécifique en premier (priorité du haut vers le bas).</div>
      </div>
      <div class="va-list">
        ${getVirementsAuto().map((r,i) => {
          const c = getComptes().find(x => x.id === r.compte);
          return `<div class="va-item"><span class="va-kw-tag">${escHtml(r.kw)}</span><span class="va-arrow">→</span><span class="va-dest">${escHtml(c ? c.nom : '⚠ compte supprimé')}</span><button class="btn-icon danger" onclick="supprimerVirementAuto(${i})" title="Supprimer">×</button></div>`;
        }).join('') || '<div class="sec-empty">Aucune règle</div>'}
      </div>
      <div class="va-add">
        <input type="text" id="va-kw" placeholder="Mot-clé (ex : impôts)">
        <select id="va-compte">
          ${getComptes().slice(1).map(c => `<option value="${c.id}">${escHtml(c.nom)}</option>`).join('')}
        </select>
        <button class="btn-small" onclick="ajouterVirementAuto()">Ajouter</button>
      </div>` : ''}
    </div>

    <h3>Chéquiers</h3>
    <div class="card" style="margin:0">
      ${[['robert','📘 Chéquier Robert','Chèque Robert'],['carmela','📗 Chéquier Carméla','Chèque Carméla']].map(([n,lbl,typ],i) => `
      <div class="chequier-row"${i?' style="margin-top:16px"':''}>
        <div class="chequier-label">${lbl}</div>
        <div class="chequier-next-label">Numéro du <strong>prochain chèque à utiliser</strong></div>
        <div class="chip-input-row" style="margin:4px 0 0 0">
          <input type="text" id="cheq-${n}" value="${escHtml(state.parametres['chequier_'+n] || '')}" placeholder="Ex : 0125842" inputmode="numeric">
          <button class="btn-small" onclick="saveChequier('${n}')">OK</button>
        </div>
        <div class="chequier-hint">Ce numéro s'incrémente automatiquement à chaque chèque saisi dans le Suivi.</div>
        <div class="chequier-carnet-label">Carnet 1</div>
        <div class="chequier-bornes">
          <input type="text" id="cheqdeb-${n}" value="${escHtml(state.parametres['chequier_'+n+'_debut'] || '')}" placeholder="1ère formule" inputmode="numeric">
          <input type="text" id="cheqfin-${n}" value="${escHtml(state.parametres['chequier_'+n+'_fin'] || '')}" placeholder="Dernière formule" inputmode="numeric">
        </div>
        <div class="chequier-carnet-label">Carnet 2 (nouveau chéquier commandé en cours d'année)</div>
        <div class="chequier-bornes">
          <input type="text" id="cheqdeb2-${n}" value="${escHtml(state.parametres['chequier_'+n+'_debut2'] || '')}" placeholder="1ère formule" inputmode="numeric">
          <input type="text" id="cheqfin2-${n}" value="${escHtml(state.parametres['chequier_'+n+'_fin2'] || '')}" placeholder="Dernière formule" inputmode="numeric">
          <button class="btn-small" onclick="saveChequierCarnets('${n}')">Enregistrer</button>
        </div>
        <button class="btn-annul-cheque" onclick="annulerCheque('${n}')">✖ Annuler la formule n° ${escHtml(getNextCheque(typ) || '—')}</button>
      </div>`).join('')}
    </div>

    <h3>Pictogrammes personnalisés</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="sub">Associez un emoji à un mot-clé. Si un libellé contient ce mot, l'emoji s'affiche. Les règles sont prioritaires sur les pictogrammes par défaut.</div>
      </div>
      <div class="picto-list" id="picto-list">
        ${getPictoRules().map((r, i) => `
        <div class="picto-item">
          <span class="picto-emoji">${escHtml(r.emoji || '')}</span>
          <span class="picto-kw">${escHtml(r.kw || '')}</span>
          <button class="btn-icon danger" onclick="deletePictoRule(${i})" title="Supprimer">×</button>
        </div>`).join('') || '<div class="sec-empty">Aucune règle personnalisée</div>'}
      </div>
      <div class="picto-add">
        <input type="text" id="new-picto-kw" placeholder="Mot-clé (ex : netflix)" autocapitalize="none">
        <input type="text" id="new-picto-emoji" placeholder="🎬" maxlength="8">
        <button class="btn-small" onclick="addPictoRule()">Ajouter</button>
      </div>
    </div>

    <h3>Bibliothèque de logos</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="sub">Importez vos logos une seule fois : réutilisez-les ensuite sur n'importe quelle catégorie ou sous-catégorie (bouton 📷 dans Libellés). ${getLogoLibrary().length} logo${getLogoLibrary().length!==1?'s':''} en bibliothèque.</div>
      </div>
      <div class="logo-lib-grid" id="logo-lib-grid">
        ${getLogoLibrary().map(l => `
        <div class="logo-lib-item" title="${escHtml(l.name||'')}">
          <img src="${l.img}" alt="${escHtml(l.name||'')}">
          <button class="logo-lib-del" onclick="deleteLogoFromLibrary('${l.id}')" title="Supprimer de la bibliothèque">×</button>
        </div>`).join('') || '<div class="sec-empty">Bibliothèque vide</div>'}
      </div>
      <div style="margin-top:10px">
        <input type="file" id="logo-lib-file" accept="image/*" class="hidden" onchange="importLogoForTarget(event)">
        <button class="btn-small" onclick="_logoPickerTarget=null; document.getElementById('logo-lib-file').click()">📷 Importer un logo</button>
      </div>
    </div>

    <h3>Logos personnalisés</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="sub">Repli par mot-clé : si aucun logo n'est défini sur la catégorie/sous-catégorie (ci-dessus), un logo dont le mot-clé est contenu dans le libellé s'affichera.</div>
      </div>
      <div class="logo-list" id="logo-list">
        ${getLogoRules().map((r, i) => `
        <div class="logo-item">
          <span class="logo-thumb">${r.img ? `<img src="${r.img}" alt="">` : ''}</span>
          <span class="logo-kw">${escHtml(r.kw || '')}</span>
          <button class="btn-icon danger" onclick="deleteLogoRule(${i})" title="Supprimer">×</button>
        </div>`).join('') || '<div class="sec-empty">Aucun logo personnalisé</div>'}
      </div>
      <div class="logo-add">
        <input type="text" id="new-logo-kw" placeholder="Mot-clé (ex : claude ai)" autocapitalize="none">
        <input type="file" id="new-logo-file" accept="image/*" class="hidden" onchange="chargerLogoRule(event)">
        <button class="btn-small" onclick="document.getElementById('new-logo-file').click()">📷 Choisir un logo</button>
      </div>
    </div>

    <h3>Sécurité</h3>
    <div class="params-item">
      <div class="params-item-left">
        <div class="name">🔐 Compte connecté</div>
        <div class="sub" id="auth-email">…</div>
      </div>
      <button class="btn-small btn-danger" onclick="doLogout()">Se déconnecter</button>
    </div>

    <h3>Connexion Supabase</h3>
    <div class="params-item">
      <div class="params-item-left">
        <div class="name">Base de données</div>
        <div class="sub">${state.sbUrl ? new URL(state.sbUrl).host : 'Non configurée'}</div>
      </div>
      <div class="params-item-right">
        <span class="status-badge ${state.connected?'connected':'disconnected'}">${state.connected?'● Connecté':'○ Déconnecté'}</span>
        ${state.connected ? `<button class="btn-icon danger" onclick="disconnectSb()" title="Déconnecter">✕</button>` : ''}
      </div>
    </div>

    <h3>Sauvegarde & Restauration</h3>
    ${(() => {
      const j = joursDepuisBackup();
      if (j === Infinity) return `<div class="backup-alerte warn">⚠️ Aucune sauvegarde effectuée — pensez à sauvegarder dans iCloud</div>`;
      if (j >= 7) return `<div class="backup-alerte warn">⚠️ Dernière sauvegarde il y a ${j} jour${j>1?'s':''} — sauvegarde recommandée</div>`;
      return `<div class="backup-alerte ok">✅ Dernière sauvegarde il y a ${j === 0 ? "moins d'un jour" : j + ' jour' + (j>1?'s':'')}</div>`;
    })()}
    <div class="card" style="margin:0 0 12px 0" id="auto-backup-card">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="name">☁️ Sauvegarde automatique vers iCloud</div>
        <div class="sub">L'app écrit silencieusement vos données dans un fichier iCloud Drive au moins une fois par semaine — sans interruption.</div>
      </div>
      <div id="auto-backup-body">${autoBackupStatusHTML()}</div>
    </div>
    <div class="params-item">
      <div class="params-item-left"><div class="name">☁️ Sauvegarder dans iCloud (manuel)</div><div class="sub">Partage natif → Fichiers → iCloud Drive</div></div>
      <button class="btn-small btn-icloud" onclick="sauvegardeICloud()">Sauvegarder</button>
    </div>
    <div class="params-item">
      <div class="params-item-left"><div class="name">Télécharger (JSON)</div><div class="sub">Sauvegarde complète sur l'appareil</div></div>
      <button class="btn-small" onclick="exportData()">Exporter</button>
    </div>
    <div class="params-item">
      <div class="params-item-left"><div class="name">Télécharger (Excel)</div><div class="sub">Suivi, mensualisation & stats · fichier .xlsx</div></div>
      <button class="btn-small" onclick="exportXLSX()">Exporter</button>
    </div>
    <div class="params-item">
      <div class="params-item-left"><div class="name">Restaurer une sauvegarde</div><div class="sub">Importer depuis un fichier JSON</div></div>
      <button class="btn-small" onclick="document.getElementById('import-file').click()">Importer</button>
      <input type="file" id="import-file" accept=".json" class="hidden" onchange="importData(event)">
    </div>

    <h3>Maintenance</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="name">Synchroniser les dates des mensualisations</div>
        <div class="sub">Aligne le jour de chaque opération du Suivi inscrite comme mensualisation sur le jour défini dans la page Mensuel. Utile si vous avez modifié un jour récemment et que ce n'est pas répercuté partout.</div>
      </div>
      <button class="btn-small btn-sync" onclick="synchroniserDatesMensu()">🔄 Synchroniser maintenant</button>
    </div>

    <h3>Nouvel exercice annuel</h3>
    <div class="card" style="margin:0">
      <div class="params-item-left" style="margin-bottom:10px">
        <div class="name">Clôturer ${getAnneeExercice()} → créer ${getAnneeExercice() + 1}</div>
        <div class="sub">Conserve les mensualisations, libellés/sous-libellés, moyens de paiement, chéquiers et pictogrammes. Efface le suivi journalier, les transactions et les soldes de ${getAnneeExercice()}.</div>
      </div>
      <button class="btn-small btn-nouvel-exercice" onclick="showNouvelExercice()">🗓️ Démarrer l'exercice ${getAnneeExercice() + 1}</button>
    </div>

    <h3>Informations</h3>
    <div class="params-item">
      <div class="params-item-left">
        <div class="name">Gestion ${getAnneeExercice()}</div>
        <div class="sub">v1.3 · PWA · Sync Supabase</div>
      </div>
    </div>
  </div>`;
}

function bindParametres() {
  const inp = document.getElementById('new-principal');
  if (inp) inp.addEventListener('keydown', e => { if (e.key === 'Enter') addLibellePrincipal(); });
  // Affiche l'email du compte connecté
  sb && sb.auth && sb.auth.getUser().then(({ data }) => {
    const el = document.getElementById('auth-email');
    if (el) el.textContent = (data && data.user && data.user.email) || 'Non connecté';
  });
  // Rafraîchit le statut de l'auto-sauvegarde (lecture asynchrone IndexedDB)
  refreshAutoBackupStatus();
}

function toggleLibelleBlock(id) {
  const body = document.getElementById(`lib-body-${id}`);
  const arrow = document.querySelector(`#lib-block-${id} .toggle-arrow`);
  if (!body) return;
  body.classList.toggle('hidden');
  if (arrow) arrow.textContent = body.classList.contains('hidden') ? '▶' : '▼';
}

async function saveSoldeExercice() {
  const val = _parseMontantFR(document.getElementById('solde-exercice-inp').value);
  if (isNaN(val)) { showToast('Montant invalide', 'error'); return; }
  const { error } = await sb.from('soldes_depart').upsert(
    { annee: state.annee, mois: 1, solde: val },
    { onConflict: 'annee,mois' }
  );
  if (error) { showToast('Erreur enregistrement', 'error'); return; }
  showToast('Solde début d\'exercice enregistré ✓', 'success');
  await loadData();
}

async function addSecondaire(libId) {
  const inp = document.getElementById(`new-sec-${libId}`);
  const val = (inp?.value || '').trim();
  if (!val) return;
  const lib = state.libelles.find(l => l.id === libId);
  if (!lib) return;
  const secs = getSecondaires(lib.principal);
  if (secs.includes(val)) { showToast('Déjà existant', 'error'); return; }
  secs.push(val);
  const { error } = await sb.from('libelles').update({ secondaires: secs }).eq('id', libId);
  if (error) { showToast('Erreur', 'error'); return; }
  inp.value = '';
  showToast('Secondaire ajouté', 'success');
  await loadData();
  navigate('parametres');
}

async function deleteSecondaire(libId, idx) {
  const lib = state.libelles.find(l => l.id === libId);
  if (!lib) return;
  const secs = getSecondaires(lib.principal);
  secs.splice(idx, 1);
  const { error } = await sb.from('libelles').update({ secondaires: secs }).eq('id', libId);
  if (error) { showToast('Erreur', 'error'); return; }
  showToast('Secondaire supprimé');
  await loadData();
  navigate('parametres');
}

// Migre les clés de cat_logos lors d'un renommage de catégorie/sous-catégorie.
// secIdx null → renomme le principal (toutes les clés de la catégorie) ; sinon une sous-catégorie précise.
function _renameCatLogoKeys(map, oldP, newP, oldS, newS) {
  const out = {};
  for (const [k, v] of Object.entries(map)) {
    const parts = k.split('␟');
    let p = parts[0];
    const s = parts.length > 1 ? parts[1] : null;
    if (oldS == null) {
      if (p === oldP) p = newP;                       // rename catégorie
      out[s != null ? `${p}␟${s}` : p] = v;
    } else {
      const ns = (p === oldP && s === oldS) ? newS : s; // rename sous-catégorie
      out[ns != null ? `${p}␟${ns}` : p] = v;
    }
  }
  return out;
}

// Renomme une catégorie (libellé principal) et répercute partout (opérations + logos).
async function renameLibellePrincipal(libId) {
  const lib = state.libelles.find(l => l.id === libId);
  if (!lib) return;
  const oldName = lib.principal || '';
  const saisie = prompt('Renommer la catégorie :', oldName);
  if (saisie == null) return;
  const nom = saisie.trim();
  if (!nom || nom === oldName) return;
  if (state.libelles.some(l => l.id !== libId && (l.principal || '').toLowerCase() === nom.toLowerCase())) {
    showToast('Cette catégorie existe déjà', 'error'); return;
  }
  setSyncing(true);
  try {
    const { error } = await sb.from('libelles').update({ principal: nom }).eq('id', libId);
    if (error) throw error;
    await Promise.all([
      sb.from('suivi_mensuel').update({ libelle_principal: nom }).eq('libelle_principal', oldName),
      sb.from('mensualisations').update({ libelle_principal: nom }).eq('libelle_principal', oldName),
      sb.from('transactions').update({ libelle_principal: nom }).eq('libelle_principal', oldName),
    ]);
    const cats = getCatLogos();
    const migr = _renameCatLogoKeys(cats, oldName, nom, null, null);
    if (JSON.stringify(migr) !== JSON.stringify(cats)) {
      await sb.from('parametres').upsert({ cle: 'cat_logos', valeur: JSON.stringify(migr) }, { onConflict: 'cle' });
    }
  } catch (e) {
    setSyncing(false);
    showToast('Erreur lors du renommage', 'error');
    return;
  }
  setSyncing(false);
  showToast('Catégorie renommée ✓', 'success');
  await loadData();
  navigate('parametres');
}

// Renomme une sous-catégorie (libellé secondaire) et répercute partout (opérations + logos).
async function renameSecondaire(libId, idx) {
  const lib = state.libelles.find(l => l.id === libId);
  if (!lib) return;
  const principal = lib.principal;
  const secs = getSecondaires(principal);
  const oldSec = secs[idx];
  if (oldSec == null) return;
  const saisie = prompt('Renommer la sous-catégorie :', oldSec);
  if (saisie == null) return;
  const nom = saisie.trim();
  if (!nom || nom === oldSec) return;
  if (secs.some((x, i) => i !== idx && (x || '').toLowerCase() === nom.toLowerCase())) {
    showToast('Cette sous-catégorie existe déjà', 'error'); return;
  }
  const nextSecs = secs.slice();
  nextSecs[idx] = nom;
  setSyncing(true);
  try {
    const { error } = await sb.from('libelles').update({ secondaires: nextSecs }).eq('id', libId);
    if (error) throw error;
    await Promise.all([
      sb.from('suivi_mensuel').update({ libelle_secondaire: nom }).eq('libelle_principal', principal).eq('libelle_secondaire', oldSec),
      sb.from('mensualisations').update({ libelle_secondaire: nom }).eq('libelle_principal', principal).eq('libelle_secondaire', oldSec),
      sb.from('transactions').update({ libelle_secondaire: nom }).eq('libelle_principal', principal).eq('libelle_secondaire', oldSec),
    ]);
    const cats = getCatLogos();
    const migr = _renameCatLogoKeys(cats, principal, principal, oldSec, nom);
    if (JSON.stringify(migr) !== JSON.stringify(cats)) {
      await sb.from('parametres').upsert({ cle: 'cat_logos', valeur: JSON.stringify(migr) }, { onConflict: 'cle' });
    }
  } catch (e) {
    setSyncing(false);
    showToast('Erreur lors du renommage', 'error');
    return;
  }
  setSyncing(false);
  showToast('Sous-catégorie renommée ✓', 'success');
  await loadData();
  navigate('parametres');
}

async function addMoyenPaiement() {
  const inp = document.getElementById('new-mp');
  const val = (inp?.value || '').trim();
  if (!val) return;
  const mps = getMoyensPaiement();
  if (mps.includes(val)) { showToast('Déjà existant', 'error'); return; }
  mps.push(val);
  await setParam('moyens_paiement', JSON.stringify(mps));
  inp.value = '';
  showToast('Moyen de paiement ajouté ✓', 'success');
  navigate('parametres');
}
async function deleteMoyenPaiement(idx) {
  const mps = getMoyensPaiement();
  mps.splice(idx, 1);
  await setParam('moyens_paiement', JSON.stringify(mps));
  showToast('Supprimé');
  navigate('parametres');
}
function getAnneeExercice() {
  const v = parseInt(state.parametres['annee_exercice'], 10);
  return Number.isFinite(v) ? v : 2026;
}

function showNouvelExercice() {
  const a = getAnneeExercice();
  const n = a + 1;
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">🗓️ Nouvel exercice ${n}</div>
  <div class="modal-form">
    <p style="font-size:14px;line-height:1.6;color:var(--text);margin-bottom:8px">
      <strong>Conservé :</strong> mensualisations, libellés &amp; sous-libellés, moyens de paiement, chéquiers, pictogrammes.
    </p>
    <p style="font-size:14px;line-height:1.6;color:var(--debit);margin-bottom:8px">
      <strong>Effacé définitivement (${a}) :</strong> suivi journalier, transactions, soldes de report et soldes bancaires.
    </p>
    <p style="font-size:12px;color:var(--text-muted);background:var(--debit-bg);border:1px solid #FECACA;border-radius:10px;padding:10px;margin-bottom:14px">
      ⚠️ Action irréversible. Sauvegardez d'abord dans iCloud par sécurité.
    </p>
    <div class="modal-actions" style="flex-direction:column;gap:8px">
      <button class="btn-save btn-icloud" onclick="sauvegardeICloud()">1 · ☁️ Sauvegarder d'abord</button>
      <button class="btn-danger" onclick="executerNouvelExercice()">2 · Créer l'exercice ${n} (effacer ${a})</button>
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
    </div>
  </div>`);
}

async function executerNouvelExercice() {
  const a = getAnneeExercice();
  const n = a + 1;
  if (!confirm(`Confirmer la clôture de l'exercice ${a} ?\n\nToutes les opérations de suivi, transactions et soldes de ${a} seront définitivement supprimés.\n\nLes mensualisations et libellés sont conservés.`)) return;
  if (!confirm(`Dernière confirmation.\n\nCréer le nouvel exercice ${n} et effacer définitivement les données ${a} ?`)) return;
  closeModal();
  setSyncing(true);
  try {
    // Suivi journalier de l'année close
    await sb.from('suivi_mensuel').delete().eq('annee', a);
    // Transactions de l'année close
    await sb.from('transactions').delete()
      .gte('date_transaction', `${a}-01-01`).lte('date_transaction', `${a}-12-31`);
    // Soldes de report de l'année close
    await sb.from('soldes_depart').delete().eq('annee', a);
    // Soldes bancaires réels (paramètres solde_banque_AAAA_MM)
    const banqueKeys = Object.keys(state.parametres).filter(k => k.startsWith(`solde_banque_${a}_`));
    for (const k of banqueKeys) {
      await sb.from('parametres').delete().eq('cle', k);
    }
    // Bascule de l'année d'exercice
    await sb.from('parametres').upsert({ cle: 'annee_exercice', valeur: String(n) }, { onConflict: 'cle' });
  } catch (e) {
    setSyncing(false);
    showToast('Erreur : ' + (e.message || e), 'error');
    return;
  }
  setSyncing(false);
  state.annee = n;
  state.mois = 0;
  await loadData();
  showToast(`Exercice ${n} créé ✓`, 'success');
  navigate('dashboard');
}

async function addPictoRule() {
  const kw = (document.getElementById('new-picto-kw')?.value || '').trim();
  const emoji = (document.getElementById('new-picto-emoji')?.value || '').trim();
  if (!kw || !emoji) { showToast('Indiquez un mot-clé et un emoji', 'error'); return; }
  const rules = getPictoRules();
  if (rules.some(r => (r.kw || '').toLowerCase() === kw.toLowerCase())) {
    showToast('Ce mot-clé existe déjà', 'error'); return;
  }
  rules.push({ kw, emoji });
  await setParam('picto_rules', JSON.stringify(rules));
  showToast('Pictogramme ajouté ✓', 'success');
  navigate('parametres');
}
async function deletePictoRule(idx) {
  const rules = getPictoRules();
  rules.splice(idx, 1);
  await setParam('picto_rules', JSON.stringify(rules));
  showToast('Supprimé');
  navigate('parametres');
}

// ── Logos personnalisés (vraies images, par mot-clé) ─────
function chargerLogoRule(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  const kwInput = document.getElementById('new-logo-kw');
  const kw = (kwInput?.value || '').trim();
  if (!kw) { showToast('Saisissez d\'abord un mot-clé', 'error'); ev.target.value = ''; return; }
  if (!file.type.startsWith('image/')) { showToast('Choisissez une image', 'error'); ev.target.value = ''; return; }
  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = async () => {
      // Réduit le logo (carré max 80px) pour limiter la taille stockée/synchronisée
      const max = 80;
      let { width: w, height: h } = img;
      const ratio = Math.min(max / w, max / h, 1);
      w = Math.round(w * ratio); h = Math.round(h * ratio);
      const cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(img, 0, 0, w, h);
      const dataUrl = cv.toDataURL('image/png');
      const rules = getLogoRules();
      const i = rules.findIndex(r => (r.kw || '').toLowerCase() === kw.toLowerCase());
      if (i >= 0) rules[i].img = dataUrl; else rules.push({ kw, img: dataUrl });
      setSyncing(true);
      await setParam('logo_rules', JSON.stringify(rules));
      setSyncing(false);
      showToast(i >= 0 ? 'Logo mis à jour ✓' : 'Logo ajouté ✓', 'success');
      navigate('parametres');
    };
    img.src = reader.result;
  };
  reader.readAsDataURL(file);
}
async function deleteLogoRule(idx) {
  const rules = getLogoRules();
  rules.splice(idx, 1);
  await setParam('logo_rules', JSON.stringify(rules));
  showToast('Logo supprimé', 'success');
  navigate('parametres');
}

// ── Logos PAR catégorie / sous-catégorie ─────────────────
// Bouton d'attribution : ouvre le sélecteur (bibliothèque + import). Miniature si défini, + retrait.
// secIdx = -1 → catégorie principale ; sinon index du secondaire.
function catLogoControlHTML(libId, secIdx, img) {
  return `<span class="cat-logo-slot">
    <button type="button" class="cat-logo-btn" title="${img ? 'Changer le logo' : 'Choisir un logo'}" onclick="showLogoPicker('${libId}',${secIdx})">
      ${img ? `<img src="${img}" alt="">` : '<span class="cat-logo-ph">📷</span>'}
    </button>
    ${img ? `<button type="button" class="cat-logo-del" onclick="event.stopPropagation(); deleteCatLogoByLib('${libId}',${secIdx})" title="Retirer le logo">×</button>` : ''}
  </span>`;
}

// ── Sélecteur de logo (bibliothèque réutilisable) ────────
let _logoPickerTarget = null; // { libId, secIdx } de la cible à habiller
function showLogoPicker(libId, secIdx) {
  _logoPickerTarget = { libId, secIdx };
  const lib = state.libelles.find(x => x.id === libId);
  const principal = lib ? lib.principal : '';
  const secondaire = (lib && secIdx != null && secIdx >= 0) ? (getSecondaires(principal)[secIdx] || '') : '';
  const cible = secondaire ? `${principal} › ${secondaire}` : principal;
  const biblio = getLogoLibrary();
  const grid = biblio.length
    ? biblio.map(l => `<button type="button" class="logo-pick" onclick="assignLogoFromLibrary('${l.id}')" title="${escHtml(l.name || '')}"><img src="${l.img}" alt=""></button>`).join('')
    : '<div class="sec-empty">Bibliothèque vide — importez votre premier logo ci-dessous.</div>';
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Logo de « ${escHtml(cible)} »</div>
  <div class="modal-form">
    <div class="params-item-left" style="margin-bottom:8px"><div class="sub">Choisissez un logo de votre bibliothèque ou importez-en un nouveau (il sera ajouté à la bibliothèque pour être réutilisé).</div></div>
    <div class="logo-pick-grid">${grid}</div>
    <input type="file" id="logo-import-file" accept="image/*" class="hidden" onchange="importLogoForTarget(event)">
    <div class="modal-actions" style="flex-wrap:wrap;gap:8px">
      <button class="btn-cancel" onclick="closeModal()">Fermer</button>
      <button class="btn-save" onclick="document.getElementById('logo-import-file').click()">📷 Importer un nouveau logo</button>
    </div>
  </div>`);
}
async function assignLogoFromLibrary(logoId) {
  const item = getLogoLibrary().find(x => x.id === logoId);
  if (!item || !_logoPickerTarget) return;
  await _assignCatLogo(_logoPickerTarget.libId, _logoPickerTarget.secIdx, item.img);
}
// Import d'un nouveau logo → ajouté à la bibliothèque (+ attribué si une cible est active)
async function importLogoForTarget(ev) {
  const file = ev.target.files && ev.target.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) { showToast('Choisissez une image', 'error'); ev.target.value = ''; return; }
  try {
    const dataUrl = await _imgFileToDataUrl(file);
    const biblio = getLogoLibrary();
    const id = 'lg' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const name = (file.name || 'logo').replace(/\.[^.]+$/, '').slice(0, 40);
    biblio.push({ id, name, img: dataUrl });
    setSyncing(true);
    await setParam('logo_library', JSON.stringify(biblio));
    setSyncing(false);
    if (_logoPickerTarget) {
      await _assignCatLogo(_logoPickerTarget.libId, _logoPickerTarget.secIdx, dataUrl);
    } else {
      showToast('Logo ajouté à la bibliothèque ✓', 'success');
      navigate('parametres');
    }
  } catch (e) { setSyncing(false); showToast('Erreur : ' + e.message, 'error'); }
}
// Attribue une image (data URL) à une catégorie/sous-catégorie
async function _assignCatLogo(libId, secIdx, img) {
  const lib = state.libelles.find(x => x.id === libId);
  if (!lib) { showToast('Catégorie introuvable', 'error'); return; }
  const principal = lib.principal;
  const secondaire = (secIdx != null && secIdx >= 0) ? (getSecondaires(principal)[secIdx] || '') : '';
  const cats = getCatLogos();
  cats[catLogoKey(principal, secondaire)] = img;
  setSyncing(true);
  await setParam('cat_logos', JSON.stringify(cats));
  setSyncing(false);
  _logoPickerTarget = null;
  showToast('Logo attribué ✓', 'success');
  closeModal();
  navigate('parametres');
}
async function deleteLogoFromLibrary(id) {
  if (!confirm('Supprimer ce logo de la bibliothèque ?\n(Les catégories qui l\'utilisent déjà conservent leur image.)')) return;
  const biblio = getLogoLibrary().filter(x => x.id !== id);
  await setParam('logo_library', JSON.stringify(biblio));
  showToast('Logo supprimé de la bibliothèque', 'success');
  navigate('parametres');
}
// Réduit un fichier image en data URL PNG (carré max 80px)
function _imgFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Lecture impossible'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Image invalide'));
      img.onload = () => {
        const max = 128;
        let { width: w, height: h } = img;
        const ratio = Math.min(max / w, max / h, 1);
        w = Math.round(w * ratio); h = Math.round(h * ratio);
        const cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        cv.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(cv.toDataURL('image/png'));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}
async function deleteCatLogoByLib(libId, secIdx) {
  const lib = state.libelles.find(x => x.id === libId);
  if (!lib) return;
  const principal = lib.principal;
  const secondaire = (secIdx != null && secIdx >= 0) ? (getSecondaires(principal)[secIdx] || '') : '';
  const cats = getCatLogos();
  delete cats[catLogoKey(principal, secondaire)];
  await setParam('cat_logos', JSON.stringify(cats));
  showToast('Logo retiré', 'success');
  navigate('parametres');
}
async function saveChequier(nom) {
  const inp = document.getElementById(`cheq-${nom}`);
  const val = (inp?.value || '').trim();
  const cle = nom === 'robert' ? 'chequier_robert' : 'chequier_carmela';
  await setParam(cle, val);
  showToast('Numéro de chéquier enregistré ✓', 'success');
}
async function saveChequierCarnets(nom) {
  const g = id => (document.getElementById(id)?.value || '').trim();
  // Un seul upsert groupé (évite la condition de course des setParam multiples)
  const rows = [
    { cle: `chequier_${nom}_debut`,  valeur: g(`cheqdeb-${nom}`)  },
    { cle: `chequier_${nom}_fin`,    valeur: g(`cheqfin-${nom}`)  },
    { cle: `chequier_${nom}_debut2`, valeur: g(`cheqdeb2-${nom}`) },
    { cle: `chequier_${nom}_fin2`,   valeur: g(`cheqfin2-${nom}`) },
  ];
  setSyncing(true);
  const { error } = await sb.from('parametres').upsert(rows, { onConflict: 'cle' });
  setSyncing(false);
  if (error) { showToast('Erreur : ' + error.message, 'error'); return; }
  showToast('Carnets enregistrés ✓', 'success');
  await loadData();
  navigate('parametres');
}
// Annule une formule de chèque (perdue/abîmée) → décale de 1 numéro
async function annulerCheque(nom) {
  const base = `chequier_${nom}`;
  const raw = (state.parametres[base] || state.parametres[base + '_debut'] || '').trim();
  const cur = parseInt(raw || '0', 10);
  if (!cur) { showToast('Définissez d\'abord le n° de chèque', 'error'); return; }
  const pad = raw.length;
  const curStr  = String(cur).padStart(pad, '0');
  const nextStr = String(cur + 1).padStart(pad, '0');
  const label = nom === 'robert' ? 'Robert' : 'Carméla';
  if (!confirm(`Annuler la formule n° ${curStr} du chéquier ${label} ?\n\nElle sera considérée comme inutilisée : le prochain chèque passera au n° ${nextStr}.`)) return;
  await setParam(base, nextStr);
  showToast(`Formule n° ${curStr} annulée — prochain : ${nextStr}`, 'success');
  navigate('parametres');
}

function autoFillCheque(sel) {
  const val = sel.value;
  // Le formulaire est un <div class="modal-form" id="suivi-form|mensu-form">
  const root = sel.closest('.modal-form, form, .modal-body, #suivi-form, #mensu-form') || document;
  // Affiche/masque le bouton « Annuler ce chèque » selon le type
  const annul = root.querySelector('.btn-annul-inline');
  if (annul) annul.style.display = val.includes('Chèque') ? '' : 'none';
  if (!val.includes('Chèque')) return;
  const next = getNextCheque(val);
  if (!next) return;
  const inp = root.querySelector('[name="num_cheque"]');
  if (inp && !inp.value) inp.value = next;
}

// Annule le chèque inscrit dans le formulaire d'opération (équivalent du bouton
// dans Paramètres mais sans quitter la saisie en cours). Le champ N° Chèque est
// rafraîchi avec le numéro suivant et la base est mise à jour.
async function annulerChequeInline(btn) {
  const root = btn.closest('.modal-form, form, .modal-body, #suivi-form, #mensu-form') || document;
  const sel = root.querySelector('[name="type_operation"]');
  const typeVal = sel ? sel.value : '';
  if (!typeVal.includes('Chèque')) {
    showToast('Sélectionnez d\'abord Chèque Robert ou Carméla', 'error');
    return;
  }
  const isRobert = typeVal.includes('Robert');
  const nom   = isRobert ? 'robert' : 'carmela';
  const label = isRobert ? 'Robert' : 'Carméla';
  const base = `chequier_${nom}`;
  const raw = (state.parametres[base] || state.parametres[base + '_debut'] || '').trim();
  const cur = parseInt(raw || '0', 10);
  if (!cur) { showToast('Définissez d\'abord le n° de chèque dans Réglages', 'error'); return; }
  const pad = raw.length;
  const curStr  = String(cur).padStart(pad, '0');
  const nextStr = String(cur + 1).padStart(pad, '0');
  if (!confirm(`Annuler la formule n° ${curStr} du chéquier ${label} ?\n\nElle sera considérée comme inutilisée : le prochain chèque passera au n° ${nextStr}.`)) return;
  await setParam(base, nextStr);
  // Met à jour le champ N° Chèque du formulaire en cours
  const inp = root.querySelector('[name="num_cheque"]');
  if (inp) inp.value = nextStr;
  showToast(`Formule n° ${curStr} annulée — prochain : ${nextStr}`, 'success');
}

// ═══════════════════════════════════════════════════════
// MODALS — MENSUALISATION
// ═══════════════════════════════════════════════════════
// Vrai si les 12 mois sont renseignés et identiques (→ case "tous les mois" cochée)
function monthsAllEqual(data) {
  const vals = MOIS_KEYS.map(k => data[k]);
  if (vals.some(v => v == null || v === '')) return false;
  const first = parseFloat(vals[0]);
  return vals.every(v => parseFloat(v) === first);
}

function monthsFields(data = {}) {
  const allEq = monthsAllEqual(data);
  return `
  <label class="mensu-repeat-toggle">
    <input type="checkbox" name="repeat_all"${allEq ? ' checked' : ''} onchange="toggleMensuRepeat(this)">
    <span>Même montant tous les mois <small>(reporte janvier sur les 12 mois)</small></span>
  </label>
  <div class="months-grid${allEq ? ' months-collapsed' : ''}">
    ${MOIS_KEYS.map((mk, i) => `
    <div class="month-input-group${i === 0 ? ' month-jan' : ''}">
      <label>${i === 0 && allEq ? 'Tous les mois' : MOIS_COURT[i]}</label>
      <input type="text" inputmode="decimal" name="${mk}" value="${data[mk] != null ? data[mk] : ''}" placeholder="—"${i === 0 ? ' oninput="syncMensuRepeat(this)"' : ''}>
    </div>`).join('')}
  </div>`;
}

// Coche/décoche "même montant tous les mois"
function toggleMensuRepeat(cb) {
  const form = cb.closest('.modal-form');
  if (!form) return;
  const grid = form.querySelector('.months-grid');
  const janInput = form.querySelector('.month-jan input');
  const janLabel = form.querySelector('.month-jan > label');
  if (cb.checked) {
    grid.classList.add('months-collapsed');
    if (janLabel) janLabel.textContent = 'Tous les mois';
    if (janInput) { syncMensuRepeat(janInput); janInput.focus(); }
  } else {
    grid.classList.remove('months-collapsed');
    if (janLabel) janLabel.textContent = 'Jan';
  }
}

// Recopie la valeur de janvier sur les 11 autres mois (si la case est cochée)
function syncMensuRepeat(janInput) {
  const form = janInput.closest('.modal-form');
  const cb = form && form.querySelector('[name="repeat_all"]');
  if (!cb || !cb.checked) return;
  form.querySelectorAll('.months-grid input').forEach(inp => { if (inp !== janInput) inp.value = janInput.value; });
}

// ── Dropdown secondaire lié au principal ────────────────
let _libUid = 0;

function getSecondaires(principal) {
  const lib = state.libelles.find(l => l.principal === principal);
  if (!lib) return [];
  let arr = lib.secondaires;
  if (!Array.isArray(arr)) { try { arr = JSON.parse(arr); } catch { arr = []; } }
  if (!Array.isArray(arr)) arr = [];
  // Toujours trié alphabétiquement (FR, insensible à la casse/accents).
  // Renvoie une copie : le tri vaut partout (Réglages, menus déroulants) et les
  // index restent cohérents puisque toutes les opérations passent par ici.
  return [...arr].sort((a, b) => String(a).localeCompare(String(b), 'fr', { sensitivity: 'base' }));
}

// Ajoute automatiquement à la liste des libellés ceux saisis dans un formulaire
// (s'ils n'y figurent pas déjà). Idempotent : ne fait rien si tout est déjà connu.
async function ensureLibelleExists(principal, secondaire) {
  if (!sb) return;
  const p = (principal || '').trim();
  if (!p) return;
  const existing = state.libelles.find(l => (l.principal || '').toLowerCase() === p.toLowerCase());
  const s = (secondaire || '').trim();
  if (!existing) {
    // Nouveau libellé principal : on l'ajoute, avec son secondaire éventuel
    const ordre = state.libelles.length;
    const secondaires = s ? [s] : [];
    await sb.from('libelles').insert({ principal: p, secondaires, ordre });
    return;
  }
  // Le principal existe déjà : on enrichit la liste des secondaires si besoin
  if (!s) return;
  const secs = getSecondaires(existing.principal);
  if (secs.some(x => (x || '').toLowerCase() === s.toLowerCase())) return;
  const next = [...secs, s];
  await sb.from('libelles').update({ secondaires: next }).eq('id', existing.id);
}

function updateSecondaires(principalVal, uid) {
  const secs = getSecondaires(principalVal);
  const dl  = document.getElementById('dl-sec-' + uid);
  const inp = document.getElementById('inp-sec-' + uid);
  if (!dl) return;
  // Mettre à jour la liste des options
  dl.innerHTML = secs.map(s => `<option value="${escHtml(s)}">`).join('');
  // Vider le secondaire si la valeur actuelle n'appartient pas à la nouvelle liste
  if (inp && secs.length > 0 && !secs.includes(inp.value)) inp.value = '';
}

function libSelects(data = {}) {
  const uid       = ++_libUid;
  const principals = state.libelles.map(l => l.principal);
  const initSecs   = getSecondaires(data.libelle_principal || '');
  return `
  <div class="form-group">
    <label>Libellé principal</label>
    <input type="text" name="libelle_principal"
           value="${escHtml(data.libelle_principal||'')}"
           list="dl-prin-${uid}" placeholder="Choisir ou saisir…"
           oninput="updateSecondaires(this.value,${uid})"
           onchange="updateSecondaires(this.value,${uid})">
    <datalist id="dl-prin-${uid}">
      ${principals.map(p => `<option value="${escHtml(p)}">`).join('')}
    </datalist>
  </div>
  <div class="form-group">
    <label>Libellé secondaire</label>
    <input type="text" id="inp-sec-${uid}" name="libelle_secondaire"
           value="${escHtml(data.libelle_secondaire||'')}"
           list="dl-sec-${uid}" placeholder="Choisir ou saisir…">
    <datalist id="dl-sec-${uid}">
      ${initSecs.map(s => `<option value="${escHtml(s)}">`).join('')}
    </datalist>
  </div>`;
}

// Décode "Paypal en 4X – Éch. N/4" → { base, echeance }
function parsePaypal4X(typeStr) {
  const m = (typeStr||'').match(/^Paypal en 4X\s*[–-]\s*Éch\.\s*(\d)\/4$/);
  if (m) return { base: 'Paypal en 4X', echeance: parseInt(m[1]) };
  return { base: typeStr, echeance: null };
}
function echeanceGroup4X(uid, isVisible, selectedVal) {
  return `
  <div class="form-group echeance-grp" id="echeance-grp-${uid}" style="display:${isVisible?'':'none'}">
    <label>Échéance Paypal 4X</label>
    <select name="echeance" id="echeance-sel-${uid}">
      ${[1,2,3,4].map(n=>`<option value="${n}"${selectedVal==n?' selected':''}>Échéance ${n}/4</option>`).join('')}
    </select>
  </div>`;
}
// Mode "création" : on saisit les 4 dates d'échéances et éventuellement
// un montant différent par ligne. Éch 1 = ligne du haut, Éch 2-4 = à compléter.
function echeanceMultiGroup4X(uid, isVisible, baseJour, baseMois, baseAnnee) {
  const annees = [];
  for (let y = baseAnnee - 1; y <= baseAnnee + 2; y++) annees.push(y);
  const def = (delta) => {
    if (!baseJour) return { j:'', m: baseMois || (state.mois+1), a: baseAnnee || state.annee };
    const d = new Date(baseAnnee || state.annee, (baseMois || (state.mois+1)) - 1 + delta, baseJour);
    return { j: d.getDate(), m: d.getMonth()+1, a: d.getFullYear() };
  };
  const row = (n, def) => `
    <div class="ech-row">
      <span class="ech-label">Éch. ${n}/4</span>
      <input type="number" name="ech${n}_jour" min="1" max="31" value="${def.j}" placeholder="Jour" class="ech-input ech-jour">
      <select name="ech${n}_mois" class="ech-input ech-mois">
        ${MOIS_FR.map((m,i) => `<option value="${i+1}"${(i+1)===def.m?' selected':''}>${m}</option>`).join('')}
      </select>
      <select name="ech${n}_annee" class="ech-input ech-annee">
        ${annees.map(y => `<option value="${y}"${y===def.a?' selected':''}>${y}</option>`).join('')}
      </select>
      <input type="text" inputmode="decimal" name="ech${n}_montant" placeholder="Montant" class="ech-input ech-montant" title="Vide = même que la 1ère échéance">
    </div>`;
  return `
  <div class="form-group echeance-multi-grp" id="echeance-multi-grp-${uid}" style="display:${isVisible?'':'none'}">
    <label>Dates et montants des 4 échéances</label>
    <div class="sub" style="font-size:11px;margin:-2px 0 6px;color:var(--text-muted)">Éch. 1/4 utilise la date et le montant principaux du haut. Pour Éch 2-4, laissez le montant vide pour reprendre le même.</div>
    <div class="ech-row ech-row-static">
      <span class="ech-label">Éch. 1/4</span>
      <span class="ech-static" id="ech1-recap-${uid}">${baseJour||'—'} / ${MOIS_FR[(baseMois||1)-1]||'—'} / ${baseAnnee||'—'}</span>
    </div>
    ${row(2, def(1))}
    ${row(3, def(2))}
    ${row(4, def(3))}
  </div>`;
}
function toggleEcheance4X(sel, uid) {
  const single = document.getElementById('echeance-grp-' + uid);
  const multi  = document.getElementById('echeance-multi-grp-' + uid);
  const isPp4X = sel.value === 'Paypal en 4X';
  // Le multi (4 dates) ne s'affiche que pour une nouvelle saisie (présent dans le DOM si !id à la création du form)
  if (multi) multi.style.display = isPp4X ? '' : 'none';
  if (single) single.style.display = (isPp4X && !multi) ? '' : 'none';
}
// Met à jour le récap "Éch. 1/4" en haut du bloc quand la date principale change
function refreshEch1Recap(uid) {
  const root = document.getElementById('echeance-multi-grp-' + uid)?.closest('.modal-form, form');
  if (!root) return;
  const j = root.querySelector('[name="jour"]')?.value || '—';
  const m = parseInt(root.querySelector('[name="mois"]')?.value || '0');
  const a = root.querySelector('[name="annee"]')?.value || '—';
  const el = document.getElementById('ech1-recap-' + uid);
  if (el) el.textContent = `${j} / ${MOIS_FR[m-1] || '—'} / ${a}`;
}

function showAddMensu() {
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Nouvelle mensualisation</div>
  <div class="modal-form" id="mensu-form">
    ${libSelects()}
    <div class="row2">
      <div class="form-group">
        <label>Type</label>
        <select name="type_operation">
          ${getMoyensPaiement().map(t=>`<option>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Opération</label>
        <select name="operation">
          <option>Débit</option><option>Crédit</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Jour du mois</label>
      <input type="number" name="jour" min="1" max="31" placeholder="Ex: 5">
    </div>
    <div class="form-group"><label>Montants par mois (laisser vide si absent)</label>${monthsFields()}</div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveMensu(null)">Enregistrer</button>
    </div>
  </div>`);
}

function showEditMensu(id) {
  const m = state.mensualisations.find(x => x.id === id);
  if (!m) return;
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Modifier la mensualisation</div>
  <div class="modal-form" id="mensu-form">
    ${libSelects(m)}
    <div class="row2">
      <div class="form-group">
        <label>Type</label>
        <select name="type_operation">
          ${getMoyensPaiement().map(t=>`<option${m.type_operation===t?' selected':''}>${t}</option>`).join('')}
        </select>
      </div>
      <div class="form-group">
        <label>Opération</label>
        <select name="operation">
          <option${m.operation==='Débit'?' selected':''}>Débit</option>
          <option${m.operation==='Crédit'?' selected':''}>Crédit</option>
        </select>
      </div>
    </div>
    <div class="form-group">
      <label>Jour du mois</label>
      <input type="number" name="jour" min="1" max="31" value="${m.jour}">
    </div>
    <div class="form-group"><label>Montants par mois</label>${monthsFields(m)}</div>
    <div class="modal-actions">
      <button class="btn-danger" onclick="deleteMensu('${id}')">Supprimer</button>
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveMensu('${id}')">Enregistrer</button>
    </div>
  </div>`);
}

async function saveMensu(id) {
  const form = document.getElementById('mensu-form');
  const repeatAll = !!form.querySelector('[name="repeat_all"]')?.checked;
  const data = {};
  form.querySelectorAll('[name]').forEach(el => {
    if (el.name === 'repeat_all') return; // case à cocher : pas une colonne en base
    const v = el.value.trim();
    if (MOIS_KEYS.includes(el.name)) { data[el.name] = parseMontant(v); }
    else { data[el.name] = v || null; }
  });
  data.jour = parseInt(data.jour) || 1;
  if (!data.libelle_principal) { showToast('Libellé principal requis', 'error'); return; }

  // "Même montant tous les mois" : on reporte la valeur de janvier sur les 12 mois
  if (repeatAll) {
    const jan = data['jan'];
    if (jan == null) { showToast('Saisissez le montant de janvier', 'error'); return; }
    MOIS_KEYS.forEach(k => { data[k] = jan; });
  }

  // Mémorise l'état AVANT modification pour pouvoir détecter ce qui a changé
  const oldMensu = id ? state.mensualisations.find(m => m.id === id) : null;

  setSyncing(true);
  let err;
  if (id) {
    data.updated_at = new Date().toISOString();
    ({ error: err } = await sb.from('mensualisations').update(data).eq('id', id));
  } else {
    ({ error: err } = await sb.from('mensualisations').insert(data));
  }
  if (err) { setSyncing(false); showToast('Erreur : ' + err.message, 'error'); return; }

  // Si on a modifié le jour d'une mensualisation, propage le changement aux
  // opérations déjà inscrites dans le Suivi qui correspondent à cette mensu.
  // On match sur les ANCIENS libellés (au cas où ils ont été renommés dans le même save).
  let propagated = 0;
  if (id && oldMensu && oldMensu.jour !== data.jour) {
    let q = sb.from('suivi_mensuel')
      .update({ jour: data.jour })
      .eq('is_mensualisation', true)
      .eq('libelle_principal', oldMensu.libelle_principal || '');
    if (oldMensu.libelle_secondaire) {
      q = q.eq('libelle_secondaire', oldMensu.libelle_secondaire);
    } else {
      q = q.is('libelle_secondaire', null);
    }
    const { data: rows, error: e2 } = await q.select('id');
    if (!e2 && rows) propagated = rows.length;
  }
  setSyncing(false);

  // Enrichit automatiquement la liste des libellés
  await ensureLibelleExists(data.libelle_principal, data.libelle_secondaire);
  const msg = id
    ? (propagated
        ? `Mensualisation mise à jour — date propagée sur ${propagated} ligne${propagated>1?'s':''} du Suivi.`
        : 'Mensualisation mise à jour')
    : 'Mensualisation ajoutée';
  showToast(msg, 'success');
  closeModal();
  await loadData();
}

// Parcourt toutes les mensualisations et aligne le jour de chaque ligne du Suivi
// inscrite comme mensualisation (match libellé principal + secondaire).
async function synchroniserDatesMensu() {
  if (!confirm('Aligner toutes les opérations du Suivi inscrites comme mensualisations sur les jours définis en Mensuel ?\n\nLes opérations saisies manuellement (hors mensualisations) ne seront pas touchées.')) return;
  setSyncing(true);
  let totalRows = 0;
  let mensuTouched = 0;
  try {
    for (const m of state.mensualisations) {
      const targetJour = parseInt(m.jour);
      if (!targetJour) continue;
      // Liste les lignes correspondantes qui ne sont pas déjà au bon jour
      let q = sb.from('suivi_mensuel')
        .update({ jour: targetJour })
        .eq('is_mensualisation', true)
        .eq('libelle_principal', m.libelle_principal || '')
        .neq('jour', targetJour);
      if (m.libelle_secondaire) {
        q = q.eq('libelle_secondaire', m.libelle_secondaire);
      } else {
        q = q.is('libelle_secondaire', null);
      }
      const { data: rows, error } = await q.select('id');
      if (!error && rows && rows.length) {
        totalRows += rows.length;
        mensuTouched++;
      }
    }
  } catch (e) {
    setSyncing(false);
    showToast('Erreur : ' + (e.message || e), 'error');
    return;
  }
  setSyncing(false);
  if (totalRows === 0) {
    showToast('Aucune correction nécessaire — tout est déjà aligné.', 'success');
  } else {
    showToast(`${totalRows} ligne${totalRows>1?'s':''} corrigée${totalRows>1?'s':''} sur ${mensuTouched} mensualisation${mensuTouched>1?'s':''}.`, 'success');
  }
  await loadData();
}

async function deleteMensu(id) {
  if (!confirm('Supprimer cette mensualisation ?')) return;
  closeModal();
  setSyncing(true);
  await sb.from('mensualisations').delete().eq('id', id);
  setSyncing(false);
  showToast('Supprimée', 'success');
  await loadData();
}

// ═══════════════════════════════════════════════════════
// MODALS — JOURNAL / TRANSACTIONS
// ═══════════════════════════════════════════════════════
function transactionForm(data = {}) {
  const today = data.date_transaction || new Date().toISOString().slice(0,10);
  return `
  <div class="form-group">
    <label>Date</label>
    <input type="date" name="date_transaction" value="${today}">
  </div>
  ${libSelects(data)}
  <div class="row2">
    <div class="form-group">
      <label>Opération</label>
      <select name="operation">
        <option${data.operation==='Débit'||!data.operation?' selected':''}>Débit</option>
        <option${data.operation==='Crédit'?' selected':''}>Crédit</option>
      </select>
    </div>
    <div class="form-group">
      <label>Montant (€)</label>
      <input type="text" inputmode="decimal" name="montant" value="${data.montant||''}" placeholder="0,00">
    </div>
  </div>
  <div class="form-group">
    <label>Type</label>
    <select name="type_operation">
      ${getMoyensPaiement().map(t=>`<option${data.type_operation===t?' selected':''}>${t}</option>`).join('')}
    </select>
  </div>
  <div class="form-group">
    <label>Note (optionnel)</label>
    <input type="text" name="notes" value="${data.notes||''}" placeholder="Note libre…">
  </div>`;
}

function showAddTransaction() {
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Nouvelle transaction</div>
  <div class="modal-form" id="tr-form">
    ${transactionForm()}
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveTransaction(null)">Enregistrer</button>
    </div>
  </div>`);
}

function showEditTransaction(id) {
  const t = state.transactions.find(x => x.id === id);
  if (!t) return;
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Modifier la transaction</div>
  <div class="modal-form" id="tr-form">
    ${transactionForm(t)}
    <div class="modal-actions">
      <button class="btn-danger" onclick="deleteTransaction('${id}')">Supprimer</button>
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveTransaction('${id}')">Enregistrer</button>
    </div>
  </div>`);
}

async function saveTransaction(id) {
  const form = document.getElementById('tr-form');
  const data = {};
  form.querySelectorAll('[name]').forEach(el => { data[el.name] = el.value.trim() || null; });
  data.montant = _parseMontantFR(data.montant);
  if (!data.date_transaction) { showToast('Date requise', 'error'); return; }
  if (isNaN(data.montant) || data.montant <= 0) { showToast('Montant invalide', 'error'); return; }

  setSyncing(true);
  let err;
  if (id) {
    ({ error: err } = await sb.from('transactions').update(data).eq('id', id));
  } else {
    ({ error: err } = await sb.from('transactions').insert(data));
  }
  setSyncing(false);
  if (err) { showToast('Erreur : ' + err.message, 'error'); return; }
  showToast(id ? 'Transaction mise à jour' : 'Transaction ajoutée', 'success');
  closeModal();
  await loadData();
}

async function deleteTransaction(id) {
  if (!confirm('Supprimer cette transaction ?')) return;
  closeModal();
  await sb.from('transactions').delete().eq('id', id);
  showToast('Supprimée', 'success');
  await loadData();
}

// ═══════════════════════════════════════════════════════
// PARAMÈTRES — LIBELLÉS
// ═══════════════════════════════════════════════════════
async function addLibellePrincipal() {
  const inp = document.getElementById('new-principal');
  const nom = (inp.value || '').trim();
  if (!nom) return;
  const ordre = state.libelles.length;
  const { error } = await sb.from('libelles').insert({ principal: nom, secondaires: [], ordre });
  if (error) { showToast('Erreur', 'error'); return; }
  inp.value = '';
  showToast('Libellé ajouté', 'success');
  await loadData();
}

async function deleteLibelle(id) {
  if (!confirm('Supprimer ce libellé ?')) return;
  await sb.from('libelles').delete().eq('id', id);
  showToast('Libellé supprimé');
  await loadData();
}

async function disconnectSb() {
  if (!confirm('Se déconnecter de Supabase ?')) return;
  localStorage.removeItem('sb_url');
  localStorage.removeItem('sb_key');
  state.connected = false; state.sbUrl = ''; state.sbKey = '';
  sb = null;
  showSetup();
}

function getMoyensPaiement() {
  try { return JSON.parse(state.parametres['moyens_paiement'] || '[]'); } catch { return []; }
}
function getNextCheque(type) {
  const base = type.includes('Robert') ? 'chequier_robert' : 'chequier_carmela';
  // Prochain n° explicite, sinon on démarre sur la 1ère formule du carnet 1
  const rawNext  = (state.parametres[base] || '').trim();
  const rawDeb1  = (state.parametres[base + '_debut'] || '').trim();
  const raw      = rawNext || rawDeb1;
  if (!raw) return '';
  let n = parseInt(raw, 10);
  if (!n) return '';
  let pad = raw.length; // conserve les zéros de tête (ex. 0125842 → padding 7)
  const rawFin1 = (state.parametres[base + '_fin']    || '').trim();
  const rawDeb2 = (state.parametres[base + '_debut2'] || '').trim();
  const fin1 = parseInt(rawFin1 || '0', 10);
  const deb2 = parseInt(rawDeb2 || '0', 10);
  // Carnet 1 épuisé → bascule automatique sur le carnet 2 (avec son padding)
  if (fin1 && deb2 && n > fin1 && n < deb2) {
    n = deb2;
    pad = rawDeb2.length;
  }
  return String(n).padStart(pad, '0');
}
async function setParam(cle, valeur) {
  await sb.from('parametres').upsert({ cle, valeur }, { onConflict: 'cle' });
  await loadData();
}

// ═══════════════════════════════════════════════════════
// EXPORT / IMPORT
// ═══════════════════════════════════════════════════════
function buildBackupPayload() {
  return JSON.stringify({
    version: '2.0',
    exported: new Date().toISOString(),
    mensualisations: state.mensualisations,
    transactions: state.transactions,
    libelles: state.libelles,
    suivi: state.suivi,
    soldes: state.soldes,
    parametres: state.parametres,
  }, null, 2);
}

function exportData() {
  const payload = buildBackupPayload();
  const a = document.createElement('a');
  a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(payload);
  a.download = `gestion2026_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  localStorage.setItem('last_backup', new Date().toISOString());
  showToast('Export téléchargé', 'success');
}

// ── Export Excel (.xlsx) via SheetJS chargé à la demande ──
async function exportXLSX() {
  try {
    showToast('Préparation du fichier Excel…', '');
    await ensureXLSX();
    const comptes = getComptes();
    const nomCompte = id => (comptes.find(c => c.id === id)?.nom) || id;
    const wb = XLSX.utils.book_new();

    // 1) Suivi de l'année (tous comptes)
    const suiviRows = state.suivi
      .filter(e => e.annee === state.annee)
      .sort((a, b) => (a.mois - b.mois) || ((a.jour || 0) - (b.jour || 0)))
      .map(e => ({
        Mois: MOIS_FR[(e.mois || 1) - 1],
        Jour: e.jour || '',
        'Libellé principal': e.libelle_principal || '',
        'Libellé secondaire': e.libelle_secondaire || '',
        'Détail': e.libelle_libre || '',
        Type: e.type_operation || '',
        'Chèque': e.num_cheque || '',
        'Pointé': e.pointe === '✓' ? 'Oui' : '',
        'Crédit': (e.credit != null && e.credit !== '') ? Number(e.credit) : '',
        'Débit': (e.debit != null && e.debit !== '') ? Number(e.debit) : '',
        Compte: nomCompte(suiviCompte(e)),
      }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(suiviRows.length ? suiviRows : [{ Info: 'Aucune opération' }]), `Suivi ${state.annee}`);

    // 2) Mensualisation
    const mensuRows = state.mensualisations.map(m => {
      const row = {
        'Libellé principal': m.libelle_principal || '',
        'Libellé secondaire': m.libelle_secondaire || '',
        Type: m.type || '',
        'Opération': m.operation || '',
        Jour: m.jour || '',
      };
      MOIS_KEYS.forEach((k, i) => { row[MOIS_COURT[i]] = (m[k] != null && m[k] !== '') ? Number(m[k]) : ''; });
      return row;
    });
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(mensuRows.length ? mensuRows : [{ Info: 'Aucune mensualisation' }]), 'Mensualisation');

    // 3) Stats par catégorie (année, compte sélectionné)
    const compte = window._statsCompte || 'courant';
    const base = state.suivi.filter(e => !e.source_id && suiviCompte(e) === compte && e.annee === state.annee);
    const { sortD, sortC } = getStatsData(base);
    const statRows = [];
    sortD.forEach(([p, d]) => statRows.push({ 'Catégorie': p, Sens: 'Dépense', Montant: +d.total.toFixed(2) }));
    sortC.forEach(([p, d]) => statRows.push({ 'Catégorie': p, Sens: 'Entrée', Montant: +d.total.toFixed(2) }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(statRows.length ? statRows : [{ Info: 'Aucune donnée' }]), `Stats ${nomCompte(compte)}`.slice(0, 31));

    XLSX.writeFile(wb, `gestion2026_${state.annee}.xlsx`);
    showToast('Fichier Excel téléchargé ✓', 'success');
  } catch (err) {
    showToast('Erreur export Excel : ' + err.message, 'error');
  }
}

// ── Sauvegarde iCloud via le partage natif iOS ──────────
async function sauvegardeICloud() {
  const payload = buildBackupPayload();
  const fname = `gestion2026_${new Date().toISOString().slice(0,10)}.json`;
  const file = new File([payload], fname, { type: 'application/json' });
  try {
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        title: 'Sauvegarde Gestion 2026',
        text: 'Enregistrez ce fichier dans iCloud Drive (Fichiers → iCloud Drive)',
      });
      localStorage.setItem('last_backup', new Date().toISOString());
      showToast('Sauvegarde partagée ✓', 'success');
    } else {
      // Fallback : téléchargement classique
      exportData();
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return; // partage annulé par l'utilisateur
    exportData();
  }
}

function joursDepuisBackup() {
  const last = localStorage.getItem('last_backup');
  if (!last) return Infinity;
  return Math.floor((Date.now() - new Date(last).getTime()) / 86400000);
}

// ── Rappel automatique hebdomadaire de sauvegarde ──────────
// 1) On tente d'abord une sauvegarde silencieuse vers iCloud (Chrome desktop).
// 2) Si non disponible (iOS / pas configuré) et > 7 jours depuis le dernier
//    backup, on affiche une bannière discrète et fermable, plus aucune modale.
async function maybeAutoBackup() {
  // Tentative silencieuse — rien à afficher si ça réussit
  const silent = await trySilentAutoBackup();
  if (silent) return;
  const j = joursDepuisBackup();
  if (j < BACKUP_FREQ_DAYS) return;
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem('backup_snooze') === today) return;
  showBackupBanner(j);
}

function showBackupBanner(j) {
  if (document.getElementById('backup-banner')) return;
  const dernier = j === Infinity ? 'aucune sauvegarde effectuée à ce jour'
                                 : `dernière sauvegarde il y a ${j} jour${j > 1 ? 's' : ''}`;
  const canSilent = supportsSilentBackup();
  const cta = canSilent
    ? `<button class="bb-cta" onclick="configureSilentBackup()">Configurer l'auto-sauvegarde</button>
       <button class="bb-cta secondary" onclick="sauvegardeICloud()">Sauvegarder une fois</button>`
    : `<button class="bb-cta" onclick="sauvegardeICloud()">Sauvegarder dans iCloud</button>`;
  const html = `
    <div id="backup-banner" class="backup-banner">
      <span class="bb-icon">☁️</span>
      <span class="bb-text">Sauvegarde recommandée — ${dernier}.</span>
      <span class="bb-actions">${cta}</span>
      <button class="bb-close" aria-label="Fermer" onclick="dismissBackupBanner()">×</button>
    </div>`;
  document.body.insertAdjacentHTML('afterbegin', html);
}

function dismissBackupBanner() {
  const el = document.getElementById('backup-banner');
  if (el) el.remove();
  localStorage.setItem('backup_snooze', new Date().toISOString().slice(0, 10));
}

function snoozeBackup() {
  localStorage.setItem('backup_snooze', new Date().toISOString().slice(0, 10));
  closeModal();
}

// ═══════════════════════════════════════════════════════
// SAUVEGARDE SILENCIEUSE iCloud (File System Access API)
// Permet — sur les navigateurs compatibles, dont Chrome sur Mac — d'écrire
// périodiquement et silencieusement dans un fichier que l'utilisateur a
// choisi UNE seule fois dans iCloud Drive. Le handle est persisté en IndexedDB.
// ═══════════════════════════════════════════════════════
const BACKUP_DB = 'gestion2026-backup', BACKUP_STORE = 'handles', BACKUP_KEY = 'icloud-file';
const BACKUP_FREQ_DAYS = 7; // sauvegarde silencieuse au moins 1×/semaine

function _bkpIDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(BACKUP_DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(BACKUP_STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function _bkpPut(handle) {
  const db = await _bkpIDB();
  return new Promise((res, rej) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    try {
      tx.objectStore(BACKUP_STORE).put(handle, BACKUP_KEY);
    } catch (e) {
      // DataCloneError (handle non clonable) : on rejette explicitement
      try { tx.abort(); } catch {}
      rej(e);
      return;
    }
    tx.oncomplete = () => res();
    tx.onerror   = () => rej(tx.error || new Error('IndexedDB transaction error'));
    tx.onabort   = () => rej(tx.error || new Error('IndexedDB transaction aborted'));
  });
}
async function _bkpGet() {
  const db = await _bkpIDB();
  return new Promise((res) => {
    const tx = db.transaction(BACKUP_STORE, 'readonly');
    const r = tx.objectStore(BACKUP_STORE).get(BACKUP_KEY);
    r.onsuccess = () => res(r.result || null);
    r.onerror   = () => res(null);
  });
}
async function _bkpDel() {
  const db = await _bkpIDB();
  return new Promise((res) => {
    const tx = db.transaction(BACKUP_STORE, 'readwrite');
    tx.objectStore(BACKUP_STORE).delete(BACKUP_KEY);
    tx.oncomplete = () => res();
    tx.onerror = () => res();
  });
}

function supportsSilentBackup() {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function';
}

// L'utilisateur choisit un fichier dans iCloud Drive → on persiste le handle.
// Sécurisé : on ne persiste le handle QUE si la 1ère écriture est lisible (> 0 octet).
async function configureSilentBackup() {
  if (!supportsSilentBackup()) {
    showToast('Sauvegarde auto non supportée sur ce navigateur — utilisez le partage iCloud.', 'error');
    return;
  }
  let handle;
  // 1) Sélection du fichier — échec = annulation propre
  try {
    handle = await window.showSaveFilePicker({
      suggestedName: 'gestion2026_backup.json',
      types: [{ description: 'Sauvegarde Gestion 2026', accept: { 'application/json': ['.json'] } }],
    });
  } catch (e) {
    if (e && (e.name === 'AbortError' || e.name === 'NotAllowedError')) {
      showToast('Configuration annulée — cliquez sur Enregistrer dans le sélecteur pour valider.', 'error');
      return;
    }
    showToast('Sélecteur de fichier indisponible : ' + (e.message || e), 'error');
    return;
  }
  // 2) Permission readwrite
  const okPerm = await _bkpEnsurePermission(handle);
  if (!okPerm) {
    showToast('Autorisation d\'écriture refusée — réessayez.', 'error');
    return;
  }
  // 3) Écriture de test
  const payload = buildBackupPayload();
  try {
    const writable = await handle.createWritable();
    await writable.write(payload);
    await writable.close();
  } catch (e) {
    showToast('Écriture impossible dans ce fichier : ' + (e.message || e) + '. Choisissez un autre emplacement.', 'error');
    return;
  }
  // 4) Vérification — relire le fichier et confirmer la taille
  try {
    const f = await handle.getFile();
    if (!f || f.size < payload.length * 0.5) {
      showToast(`Écriture incomplète (${f ? f.size : 0} octets reçus). iCloud Drive peut bloquer l'API — essayez un dossier local hors iCloud.`, 'error');
      return;
    }
  } catch (e) {
    showToast('Lecture de contrôle impossible : ' + (e.message || e), 'error');
    return;
  }
  // 5) Tout est bon → on persiste le handle, puis on vérifie qu'on peut le relire
  try {
    await _bkpPut(handle);
  } catch (e) {
    const msg = (e && e.name === 'DataCloneError')
      ? 'Ce fichier ne peut pas être mémorisé (DataCloneError) — choisissez un fichier hors iCloud Drive.'
      : 'Mémorisation du fichier impossible : ' + (e.message || e);
    showToast(msg, 'error');
    return;
  }
  // Lecture de contrôle : si le handle persisté est null, c'est une corruption silencieuse
  const verif = await _bkpGet();
  if (!verif) {
    showToast('Mémorisation invisible après écriture — IndexedDB peut être désactivée (mode privé ?).', 'error');
    return;
  }
  localStorage.setItem('last_backup', new Date().toISOString());
  showToast('Sauvegarde auto configurée ✓ — fichier validé.', 'success');
  if (state.view === 'parametres') render();
}

async function _bkpEnsurePermission(handle) {
  if (!handle || !handle.queryPermission) return true;
  const opts = { mode: 'readwrite' };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

// Écrit le payload dans le fichier persisté — sans aucune UI.
async function silentBackupNow() {
  const handle = await _bkpGet();
  if (!handle) return false;
  const ok = await _bkpEnsurePermission(handle);
  if (!ok) return false;
  const writable = await handle.createWritable();
  await writable.write(buildBackupPayload());
  await writable.close();
  localStorage.setItem('last_backup', new Date().toISOString());
  return true;
}

async function disableSilentBackup() {
  if (!confirm('Désactiver la sauvegarde automatique vers iCloud ?')) return;
  await _bkpDel();
  showToast('Sauvegarde auto désactivée', 'success');
  if (state.view === 'parametres') render();
}

// Tentative silencieuse au démarrage si configurée + intervalle dépassé.
// Rend le bloc de statut de la sauvegarde auto (en synchrone : renvoie un placeholder,
// puis rafraîchit asynchrone après lecture IndexedDB).
function autoBackupStatusHTML() {
  if (!supportsSilentBackup()) {
    return `<div class="auto-bk-pill warn">⚠️ Non disponible sur ce navigateur</div>
            <div class="sub" style="margin-top:6px;font-size:12px">Safari iOS n'expose pas l'API d'écriture directe. Utilisez « Sauvegarder dans iCloud (manuel) » ci-dessous : un partage natif vers Fichiers → iCloud Drive.</div>`;
  }
  // Placeholder rafraîchi par refreshAutoBackupStatus()
  return `<div class="auto-bk-loading">Vérification…</div>`;
}

async function refreshAutoBackupStatus() {
  const body = document.getElementById('auto-backup-body');
  if (!body || !supportsSilentBackup()) return;
  const handle = await _bkpGet();
  if (!handle) {
    body.innerHTML = `
      <div class="auto-bk-pill off">○ Désactivée</div>
      <button class="btn-small btn-icloud" style="margin-top:10px" onclick="configureSilentBackup()">Configurer maintenant →</button>
      <div class="sub" style="margin-top:8px;font-size:12px">Vous choisirez un fichier dans iCloud Drive. L'app y écrira ensuite vos données automatiquement chaque semaine, sans rien vous demander.</div>`;
    return;
  }
  const name = handle.name || 'fichier sélectionné';
  const j = joursDepuisBackup();
  const dernier = j === Infinity ? 'jamais'
                                 : j === 0 ? "il y a moins d'un jour"
                                 : `il y a ${j} jour${j>1?'s':''}`;
  body.innerHTML = `
    <div class="auto-bk-pill ok">✅ Activée</div>
    <div class="auto-bk-row"><span class="auto-bk-k">Fichier :</span><span class="auto-bk-v">${escHtml(name)}</span></div>
    <div class="auto-bk-row"><span class="auto-bk-k">Dernière écriture :</span><span class="auto-bk-v">${dernier}</span></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">
      <button class="btn-small" onclick="forceSilentBackup()">Sauvegarder maintenant</button>
      <button class="btn-small btn-danger" onclick="disableSilentBackup()">Désactiver</button>
    </div>`;
}

async function forceSilentBackup() {
  const ok = await silentBackupNow();
  if (ok) {
    showToast('Sauvegarde effectuée ✓', 'success');
    refreshAutoBackupStatus();
  } else {
    showToast("Échec — autorisation refusée ou fichier déplacé. Reconfigurez la sauvegarde.", 'error');
  }
}

async function trySilentAutoBackup() {
  if (joursDepuisBackup() < BACKUP_FREQ_DAYS) return false;
  const handle = await _bkpGet();
  if (!handle) return false;
  // queryPermission ne nécessite pas de geste utilisateur ; si déjà 'granted', on écrit.
  try {
    const perm = handle.queryPermission ? await handle.queryPermission({ mode: 'readwrite' }) : 'granted';
    if (perm !== 'granted') return false; // on n'interrompt pas l'utilisateur ; il pourra réautoriser manuellement
    return await silentBackupNow();
  } catch { return false; }
}

// ── Export PDF du suivi mensuel (via impression) ────────
function exportSuiviPDF() {
  const entries = getSuiviMois();
  if (entries.length === 0) { showToast('Aucune opération à exporter ce mois', 'error'); return; }
  const soldeDepart = getSoldeDepart(state.mois, state.annee);
  const totalD = entries.reduce((s, e) => s + parseFloat(e.debit  || 0), 0);
  const totalC = entries.reduce((s, e) => s + parseFloat(e.credit || 0), 0);
  const soldeFin = soldeDepart + totalC - totalD;

  let run = soldeDepart;
  const lignes = entries.map(e => {
    run += parseFloat(e.credit || 0) - parseFloat(e.debit || 0);
    const lib = [e.libelle_principal, e.libelle_secondaire, e.libelle_libre].filter(Boolean).join(' — ');
    return `<tr>
      <td class="c">${getJourSemaine(e.jour)} ${e.jour || ''}</td>
      <td>${escHtml(lib)}</td>
      <td class="c">${escHtml(e.type_operation || '')}</td>
      <td class="c">${escHtml(e.num_cheque || '')}</td>
      <td class="c">${e.pointe === '✓' ? '✓' : ''}</td>
      <td class="r credit">${e.credit != null ? fmt(e.credit) : ''}</td>
      <td class="r debit">${e.debit != null ? fmt(e.debit) : ''}</td>
      <td class="r">${fmt(run)}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8">
  <title>Suivi ${MOIS_FR[state.mois]} ${state.annee}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box;font-family:-apple-system,Arial,sans-serif}
    body{padding:24px;color:#0F172A;font-size:12px}
    h1{font-size:20px;color:#1E40AF;margin-bottom:4px}
    .sub{color:#64748B;font-size:12px;margin-bottom:16px}
    .recap{display:flex;gap:10px;margin-bottom:16px;flex-wrap:wrap}
    .box{border:1px solid #E2E8F0;border-radius:8px;padding:8px 14px;flex:1;min-width:110px}
    .box .l{font-size:10px;text-transform:uppercase;color:#64748B;letter-spacing:.5px}
    .box .v{font-size:15px;font-weight:700;margin-top:2px}
    table{width:100%;border-collapse:collapse;margin-top:8px}
    th{background:#1E40AF;color:#fff;font-size:10px;text-transform:uppercase;padding:7px 6px;text-align:left}
    td{padding:6px;border-bottom:1px solid #EEF2F7;font-size:11px}
    tr:nth-child(even) td{background:#F5F8FF}
    .c{text-align:center}.r{text-align:right;font-variant-numeric:tabular-nums}
    .credit{color:#059669}.debit{color:#DC2626}
    tfoot td{font-weight:700;border-top:2px solid #1E40AF;background:#EEF2F7}
    .pos{color:#059669}.neg{color:#DC2626}
    @media print{body{padding:0}@page{margin:14mm}}
  </style></head><body>
    <h1>${escHtml(getSuiviTitre())} — ${escHtml(nomCompteActif())} — ${MOIS_FR[state.mois]} ${state.annee}</h1>
    <div class="sub">Édité le ${new Date().toLocaleDateString('fr-FR',{day:'numeric',month:'long',year:'numeric'})}</div>
    <div class="recap">
      <div class="box"><div class="l">Report</div><div class="v ${soldeDepart>=0?'pos':'neg'}">${fmt(soldeDepart)}</div></div>
      <div class="box"><div class="l">Crédits</div><div class="v pos">${fmt(totalC)}</div></div>
      <div class="box"><div class="l">Débits</div><div class="v neg">${fmt(totalD)}</div></div>
      <div class="box"><div class="l">Solde fin</div><div class="v ${soldeFin>=0?'pos':'neg'}">${fmt(soldeFin)}</div></div>
    </div>
    <table>
      <thead><tr>
        <th>Jour</th><th>Libellé</th><th>Type</th><th>Chèque</th><th>P</th>
        <th style="text-align:right">Crédit</th><th style="text-align:right">Débit</th><th style="text-align:right">Solde</th>
      </tr></thead>
      <tbody>${lignes}</tbody>
      <tfoot><tr>
        <td colspan="5">Totaux ${MOIS_FR[state.mois]} ${state.annee}</td>
        <td class="r credit">${fmt(totalC)}</td>
        <td class="r debit">${fmt(totalD)}</td>
        <td class="r ${soldeFin>=0?'pos':'neg'}">${fmt(soldeFin)}</td>
      </tr></tfoot>
    </table>
  </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { showToast('Autorisez les fenêtres pop-up pour le PDF', 'error'); return; }
  w.document.write(html);
  w.document.close();
  setTimeout(() => { w.focus(); w.print(); }, 400);
  showToast('Choisissez « Enregistrer en PDF »', 'success');
}

async function importData(e) {
  const file = e.target.files[0];
  if (!file) return;
  const text = await file.text();
  try {
    const data = JSON.parse(text);
    if (!data.mensualisations) throw new Error('Format invalide');
    if (!confirm(`Restaurer cette sauvegarde ?\n\n• ${data.mensualisations.length} mensualisations\n• ${data.transactions?.length||0} transactions\n• ${data.suivi?.length||0} opérations de suivi\n\nLes données existantes seront fusionnées.`)) return;
    setSyncing(true);
    if (data.mensualisations?.length) {
      await sb.from('mensualisations').upsert(data.mensualisations);
    }
    if (data.transactions?.length) {
      await sb.from('transactions').upsert(data.transactions);
    }
    if (data.libelles?.length) {
      await sb.from('libelles').upsert(data.libelles);
    }
    if (data.suivi?.length) {
      await sb.from('suivi_mensuel').upsert(data.suivi);
    }
    if (data.soldes?.length) {
      await sb.from('soldes_depart').upsert(data.soldes);
    }
    if (data.parametres && typeof data.parametres === 'object') {
      const params = Object.entries(data.parametres).map(([cle, valeur]) => ({ cle, valeur }));
      if (params.length) await sb.from('parametres').upsert(params, { onConflict: 'cle' });
    }
    setSyncing(false);
    showToast('Restauration réussie', 'success');
    await loadData();
  } catch (err) {
    setSyncing(false);
    showToast('Erreur d\'import : ' + err.message, 'error');
  }
}

// ═══════════════════════════════════════════════════════
// NAVIGATION MOIS
// ═══════════════════════════════════════════════════════
function prevMonth() {
  state.mois--;
  if (state.mois < 0) { state.mois = 11; state.annee--; }
  render();
}
function nextMonth() {
  state.mois++;
  if (state.mois > 11) { state.mois = 0; state.annee++; }
  render();
}
function updateMonthLabel() {
  const el = document.getElementById('month-label');
  if (el) el.textContent = MOIS_FR[state.mois] + ' ' + state.annee;
}

// ═══════════════════════════════════════════════════════
// MODAL HELPERS
// ═══════════════════════════════════════════════════════
function openModal(html) {
  document.getElementById('modal-content').innerHTML = html;
  document.getElementById('modal-overlay').classList.remove('hidden');
}
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
}

// ═══════════════════════════════════════════════════════
// TOAST
// ═══════════════════════════════════════════════════════
let _toastTimer;
function showToast(msg, type = '') {
  const el = document.getElementById('toast');
  const icons = { success: '✓', error: '✕', '': 'ℹ' };
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons['']}</span><span>${msg}</span>`;
  el.className = type;
  el.classList.remove('hidden');
  clearTimeout(_toastTimer);
  _toastTimer = setTimeout(() => el.classList.add('hidden'), 3000);
}

// ═══════════════════════════════════════════════════════
// SYNC DOT
// ═══════════════════════════════════════════════════════
function setSyncing(v) {
  state.syncing = v;
  updateSyncDot();
}
function updateSyncDot() {
  const dot = document.getElementById('sync-dot');
  if (!dot) return;
  dot.className = 'sync-dot' + (state.syncing ? ' syncing' : !state.connected ? ' offline' : '');
  dot.title = state.syncing ? 'Synchronisation…' : state.connected ? 'Connecté' : 'Hors ligne';
}

// ═══════════════════════════════════════════════════════
// UTILITAIRES
// ═══════════════════════════════════════════════════════
function fmt(v) {
  if (v == null || v === '') return '—';
  return parseFloat(v).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
function fmtDate(d) {
  if (!d) return '';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('fr-FR', { weekday:'long', day:'numeric', month:'long' });
}
function isSameMois(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + 'T12:00:00');
  return d.getMonth() === state.mois && d.getFullYear() === state.annee;
}
function escHtml(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
// ── Authentification ─────────────────────────────────
function showLogin(opts = {}) {
  document.getElementById('screen-setup').classList.add('hidden');
  document.getElementById('screen-app').classList.add('hidden');
  let s = document.getElementById('screen-login');
  if (!s) {
    s = document.createElement('div');
    s.id = 'screen-login';
    document.getElementById('app').appendChild(s);
  }
  s.classList.remove('hidden');
  const mode = ['signup','forgot','recovery'].includes(opts.mode) ? opts.mode : 'login';
  if (mode === 'recovery') {
    s.innerHTML = `
      <div class="login-card">
        <div class="login-logo">
          <svg viewBox="0 0 44 44"><text x="22" y="32" text-anchor="middle" fill="#B8860B" font-family="Arial" font-weight="bold" font-size="26">€</text></svg>
        </div>
        <h1>Nouveau mot de passe</h1>
        <p class="login-sub">Choisissez votre nouveau mot de passe (≥ 6 caractères)</p>
        <div class="form-group">
          <label>Nouveau mot de passe</label>
          <input type="password" id="login-newpwd" autocomplete="new-password">
        </div>
        <div class="form-group">
          <label>Confirmer</label>
          <input type="password" id="login-newpwd2" autocomplete="new-password">
        </div>
        <div id="login-err" class="login-err hidden"></div>
        <button class="btn-primary" onclick="doSetNewPassword()">Enregistrer →</button>
      </div>`;
    setTimeout(() => document.getElementById('login-newpwd')?.focus(), 50);
    return;
  }
  if (mode === 'forgot') {
    s.innerHTML = `
      <div class="login-card">
        <div class="login-logo">
          <svg viewBox="0 0 44 44"><text x="22" y="32" text-anchor="middle" fill="#B8860B" font-family="Arial" font-weight="bold" font-size="26">€</text></svg>
        </div>
        <h1>Mot de passe oublié</h1>
        <p class="login-sub">Saisissez votre email — vous recevrez un lien de réinitialisation</p>
        <div class="form-group">
          <label>Email</label>
          <input type="email" id="login-email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false">
        </div>
        <div id="login-err" class="login-err hidden"></div>
        <button class="btn-primary" onclick="doForgotPassword()">Envoyer le lien →</button>
        <button class="login-swap" onclick="showLogin({mode:'login'})">← Retour à la connexion</button>
      </div>`;
    setTimeout(() => document.getElementById('login-email')?.focus(), 50);
    return;
  }
  const fn = mode === 'signup' ? 'doSignup' : 'doLogin';
  const cta = mode === 'signup' ? 'Créer le compte' : 'Se connecter';
  const sub = mode === 'signup' ? 'Créez votre compte sécurisé' : 'Connectez-vous à votre espace';
  const swap = mode === 'signup' ? "J'ai déjà un compte" : 'Première fois ? Créer un compte';
  const swapTo = mode === 'signup' ? 'login' : 'signup';
  s.innerHTML = `
    <div class="login-card">
      <div class="login-logo">
        <svg viewBox="0 0 44 44"><text x="22" y="32" text-anchor="middle" fill="#B8860B" font-family="Arial" font-weight="bold" font-size="26">€</text></svg>
      </div>
      <h1>Gestion 2026</h1>
      <p class="login-sub">${sub}</p>
      <div class="form-group">
        <label>Email</label>
        <input type="email" id="login-email" autocomplete="email" autocapitalize="none" autocorrect="off" spellcheck="false">
      </div>
      <div class="form-group">
        <label>Mot de passe</label>
        <input type="password" id="login-pwd" autocomplete="${mode==='signup'?'new-password':'current-password'}">
      </div>
      <div id="login-err" class="login-err hidden"></div>
      <button class="btn-primary" onclick="${fn}()">${cta} →</button>
      ${mode==='login' ? `<button class="login-swap" onclick="showLogin({mode:'forgot'})">Mot de passe oublié ?</button>` : ''}
      <button class="login-swap" onclick="showLogin({mode:'${swapTo}'})">${swap}</button>
    </div>
  `;
  setTimeout(() => document.getElementById('login-email')?.focus(), 50);
}
async function doForgotPassword() {
  const email = (document.getElementById('login-email')?.value || '').trim();
  if (!email) { loginErr('Saisissez votre email'); return; }
  const redirect = window.location.origin + window.location.pathname + '?recovery=1';
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirect });
  if (error) { loginErr(error.message || 'Erreur d\'envoi'); return; }
  loginErr('');
  const el = document.getElementById('login-err');
  if (el) { el.textContent = '✉️ Email envoyé. Cliquez sur le lien reçu pour choisir un nouveau mot de passe.'; el.classList.remove('hidden'); el.style.color='var(--credit)'; el.style.background='var(--credit-bg)'; el.style.borderColor='#A7F3D0'; }
}
async function doSetNewPassword() {
  const a = document.getElementById('login-newpwd')?.value || '';
  const b = document.getElementById('login-newpwd2')?.value || '';
  if (a.length < 6) { loginErr('Mot de passe trop court (6 caractères mini)'); return; }
  if (a !== b)    { loginErr('Les deux mots de passe ne correspondent pas'); return; }
  const { error } = await sb.auth.updateUser({ password: a });
  if (error) { loginErr(error.message || 'Erreur'); return; }
  showToast('Mot de passe mis à jour ✓', 'success');
  await onSignedIn();
}
function hideLogin() {
  const s = document.getElementById('screen-login');
  if (s) s.classList.add('hidden');
}
function loginErr(msg) {
  const el = document.getElementById('login-err');
  if (el) { el.textContent = msg; el.classList.remove('hidden'); }
}
async function doLogin() {
  const email = (document.getElementById('login-email')?.value || '').trim();
  const pwd = document.getElementById('login-pwd')?.value || '';
  if (!email || !pwd) { loginErr('Email et mot de passe requis'); return; }
  const { error } = await sb.auth.signInWithPassword({ email, password: pwd });
  if (error) { loginErr('Identifiants invalides'); return; }
  await onSignedIn();
}
async function doSignup() {
  const email = (document.getElementById('login-email')?.value || '').trim();
  const pwd = document.getElementById('login-pwd')?.value || '';
  if (!email || pwd.length < 6) { loginErr('Email valide et mot de passe d\'au moins 6 caractères requis'); return; }
  const { data, error } = await sb.auth.signUp({ email, password: pwd });
  if (error) { loginErr(error.message || 'Erreur création de compte'); return; }
  if (!data.session) { loginErr('Compte créé. Confirmez par email ou activez « Auto Confirm » dans Supabase Auth.'); return; }
  await onSignedIn();
}
async function doLogout() {
  if (!confirm('Se déconnecter de l\'application ?')) return;
  await sb.auth.signOut();
  showLogin();
}
async function onSignedIn() {
  hideLogin();
  showApp();
  bindSwipe();
  await loadData();
  // Démarrage : l'app s'ouvre sur le Suivi journalier (chip + titre + vue synchros)
  navigate(state.view || 'suivi');
  subscribeRealtime();
  setTimeout(maybeAutoBackup, 1500);
}

async function init() {
  applyTheme(localStorage.getItem('theme_accent') || 'bleu');
  if ('serviceWorker' in navigator) {
    // Recharge automatiquement quand une nouvelle version prend le contrôle
    let _reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (_reloaded) return;
      _reloaded = true;
      window.location.reload();
    });
    try {
      const reg = await navigator.serviceWorker.register('sw.js');
      // Détecte une nouvelle version en cours d'installation
      reg.addEventListener('updatefound', () => {
        const sw = reg.installing;
        if (!sw) return;
        sw.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) {
            showToast('Mise à jour disponible — actualisation…', 'success');
          }
        });
      });
      // Vérifie les mises à jour au lancement puis toutes les 30 min
      reg.update();
      setInterval(() => reg.update(), 30 * 60 * 1000);
    } catch (e) { /* hors ligne : on garde la version en cache */ }
  }

  // Auto-connexion via paramètres URL (ex: ?url=...&key=...)
  const params = new URLSearchParams(window.location.search);
  const pUrl = (params.get('url') || '').trim().replace(/\/+$/, '');
  const pKey = (params.get('key') || '').trim().replace(/\s+/g, '');
  if (pUrl && pKey) {
    const ok = await initSupabase(pUrl, pKey);
    if (ok) { await routeAuth(); return; }
  }

  if (state.sbUrl && state.sbKey) {
    const ok = await initSupabase(state.sbUrl, state.sbKey);
    if (ok) { await routeAuth(); return; }
  }
  showSetup();
}

// Aiguillage : si déjà connecté → app, sinon écran de connexion
async function routeAuth() {
  // Écoute les changements de session (déconnexion, recovery, token rafraîchi)
  sb.auth.onAuthStateChange((event) => {
    if (event === 'SIGNED_OUT') showLogin();
    if (event === 'PASSWORD_RECOVERY') showLogin({ mode: 'recovery' });
  });
  // Retour de lien de récupération : on affiche le formulaire nouveau mot de passe
  if (/[?#&]type=recovery/.test(window.location.hash + window.location.search) || /[?&]recovery=1/.test(window.location.search)) {
    showLogin({ mode: 'recovery' });
    return;
  }
  const { data: { session } } = await sb.auth.getSession();
  if (session) await onSignedIn();
  else showLogin();
}

// ═══════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════════════════
function renderStats() {
  const section = window._statsSection || 'courant';
  const secTabs = `
  <div class="mensu-tabs stats-section-tabs">
    <button class="mensu-tab${section==='courant'?' active':''}" onclick="window._statsSection='courant'; render()">💳 Compte courant</button>
    <button class="mensu-tab${section==='epargne'?' active':''}" onclick="window._statsSection='epargne'; render()">💰 Épargne</button>
  </div>`;
  if (section === 'epargne') return secTabs + renderStatsEpargne();
  const statsView = window._statsView || 'mensuel';
  const tabs = `
  <div class="mensu-tabs">
    <button class="mensu-tab${statsView==='mensuel'?' active':''}" onclick="window._statsView='mensuel'; render()">📊 Mensuel</button>
    <button class="mensu-tab${statsView==='annuel'?' active':''}" onclick="window._statsView='annuel'; render()">📆 Annuel</button>
  </div>`;
  // Sélecteur de compte (affiché seulement s'il y a plusieurs comptes)
  const comptes = getComptes();
  const compteSel = window._statsCompte || 'courant';
  if (!comptes.some(c => c.id === compteSel)) window._statsCompte = 'courant';
  const compteSelector = comptes.length > 1 ? `
  <div class="mensu-tabs stats-compte-tabs">
    ${comptes.map(c => `<button class="mensu-tab${(window._statsCompte||'courant')===c.id?' active':''}" onclick="window._statsCompte='${c.id}'; render()">${escHtml(c.nom)}</button>`).join('')}
  </div>` : '';
  const exportBar = `
  <div class="stats-export-bar">
    <button class="btn-small" onclick="exportXLSX()">⬇️ Exporter en Excel</button>
  </div>`;
  return secTabs + tabs + compteSelector + exportBar + (statsView === 'annuel' ? renderStatsAnnuel() : renderStatsMensuel());
}

// Solde courant (fin du mois affiché) d'un compte donné
function soldeCompteFin(compteId) {
  const dep = getSoldeDepart(state.mois, state.annee, compteId);
  const m = state.suivi.filter(e => e.mois === state.mois + 1 && e.annee === state.annee && suiviCompte(e) === compteId);
  const c = m.reduce((s,e)=>s+parseFloat(e.credit||0),0);
  const d = m.reduce((s,e)=>s+parseFloat(e.debit ||0),0);
  return dep + c - d;
}

// Identité visuelle par produit d'épargne (déduite du nom du compte)
function epargneStyle(nom) {
  const t = (nom || '').toLowerCase();
  if (/livret\s*a\b|\blivret a/.test(t))
    return { key:'a',  c1:'#E2001A', c2:'#A60010', soft:'#FDECEC', accent:'#E2001A', mk:'A',  icon:'🔒', label:'Épargne réglementée · sécurisée' };
  if (/\bldds?\b|développement durable|developpement durable/.test(t))
    return { key:'ldd', c1:'#1FA855', c2:'#0E7C3A', soft:'#E9F8EF', accent:'#1FA855', mk:'LDD', icon:'🌱', label:'Développement durable · responsable' };
  if (/assurance\s*vie|cachemire|cachemir/.test(t))
    return { key:'av',  c1:'#1A1712', c2:'#000000', soft:'#FAF5E9', accent:'#C9A14A', mk:'AV', icon:'♦', label:'Assurance vie · premium' };
  return { key:'gen', c1:'#1E40AF', c2:'#1E3A8A', soft:'#EFF6FF', accent:'#2563EB', mk:'€', icon:'💰', label:"Compte d'épargne" };
}
// Logo SVG original (non copié d'une marque) pour chaque produit
function epargneLogo(s) {
  const id = 'el' + Math.random().toString(36).slice(2,7);
  const grad = `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${s.c1}"/><stop offset="1" stop-color="${s.c2}"/></linearGradient></defs>`;
  let inner = '';
  if (s.key === 'a') {
    inner = `<path d="M22 12l8 4v6c0 6-4 9-8 11-4-2-8-5-8-11v-6z" fill="rgba(255,255,255,.16)"/>
      <text x="22" y="29" text-anchor="middle" font-family="Arial" font-weight="900" font-size="18" fill="#fff">A</text>`;
  } else if (s.key === 'ldd') {
    inner = `<path d="M22 11c7 3 9 8 7 14-5 1-9-1-11-5-2-4-1-7 4-9z" fill="rgba(255,255,255,.22)"/>
      <path d="M16 31c3-7 7-10 12-12" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>`;
  } else if (s.key === 'av') {
    inner = `<path d="M22 12l4 7-4 13-4-13z" fill="#C9A14A"/><circle cx="22" cy="13" r="2.4" fill="#E7C97A"/>`;
  } else {
    inner = `<text x="22" y="29" text-anchor="middle" font-family="Arial" font-weight="900" font-size="18" fill="#fff">€</text>`;
  }
  return `<svg class="ep-logo" viewBox="0 0 44 44" width="44" height="44" role="img" aria-label="${escHtml(s.mk)}">
    ${grad}<rect x="1" y="1" width="42" height="42" rx="12" fill="url(#${id})"/>${inner}
    ${s.key==='av' ? `<rect x="2.5" y="2.5" width="39" height="39" rx="10.5" fill="none" stroke="#C9A14A" stroke-width="1.2"/>` : ''}
  </svg>`;
}

function renderStatsEpargne() {
  const comptes = getComptes().slice(1); // comptes secondaires = épargne
  if (comptes.length === 0) {
    return `<div class="stats-empty">Aucun compte d'épargne. Créez-en un dans Paramètres → Comptes bancaires.</div>`;
  }
  const lignes = comptes.map(c => {
    const soldeFin = soldeCompteFin(c.id);
    const anEntries = state.suivi.filter(e => e.annee === state.annee && suiviCompte(e) === c.id);
    const verseAn = anEntries.reduce((s,e)=>s+parseFloat(e.credit||0),0);
    const retireAn = anEntries.reduce((s,e)=>s+parseFloat(e.debit||0),0);
    return { ...c, soldeFin, verseAn, retireAn, st: epargneStyle(c.nom) };
  });
  const globale = lignes.reduce((s,l)=>s+l.soldeFin,0);
  const verseGlobal = lignes.reduce((s,l)=>s+l.verseAn,0);

  return `
  <div class="ep-wrap">
    <div class="ep-global">
      <div class="ep-global-top">
        <span class="ep-global-icon">💰</span>
        <span class="ep-global-label">Épargne globale</span>
        <span class="ep-global-period">${MOIS_FR[state.mois]} ${state.annee}</span>
      </div>
      <div class="ep-global-amount">${fmt(globale)}</div>
      <div class="ep-global-sub">
        <div><span>Versé en ${state.annee}</span><strong>${fmt(verseGlobal)}</strong></div>
        <div><span>Comptes</span><strong>${lignes.length}</strong></div>
      </div>
    </div>

    <div class="ep-section">Mes comptes d'épargne</div>
    <div class="ep-cards">
      ${lignes.map(l => {
        const s = l.st;
        return `
        <div class="ep-card" style="--acc:${s.accent}">
          <div class="ep-accent" style="background:linear-gradient(180deg,${s.c1},${s.c2})"></div>
          <div class="ep-card-in">
            <div class="ep-card-head">
              ${epargneLogo(s)}
              <div class="ep-card-id">
                <div class="ep-card-name">${escHtml(l.nom)}</div>
                <div class="ep-card-tag" style="color:${s.accent}">${s.icon} ${s.label}</div>
              </div>
              ${bankMiniHTML()}
            </div>
            <div class="ep-card-solde">
              <span class="ep-card-solde-label">Solde au ${MOIS_FR[state.mois]} ${state.annee}</span>
              <span class="ep-card-solde-val ${l.soldeFin>=0?'pos':'neg'}">${fmt(l.soldeFin)}</span>
            </div>
            <div class="ep-card-foot">
              <div class="ep-chip up"><span>↑ Versé ${state.annee}</span><strong>${fmt(l.verseAn)}</strong></div>
              <div class="ep-chip down"><span>↓ Retiré ${state.annee}</span><strong>${fmt(l.retireAn)}</strong></div>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function getStatsData(entries) {
  const totalDebit  = entries.reduce((s,e) => s + parseFloat(e.debit  || 0), 0);
  const totalCredit = entries.reduce((s,e) => s + parseFloat(e.credit || 0), 0);
  const byPrincipalD = {}, byPrincipalC = {};
  entries.forEach(e => {
    const p = e.libelle_principal || 'Non classé';
    const s = [e.libelle_secondaire, e.libelle_libre].filter(Boolean).join(' · ') || '—';
    if (parseFloat(e.debit||0) > 0) {
      if (!byPrincipalD[p]) byPrincipalD[p] = { total:0, secs:{} };
      byPrincipalD[p].total += parseFloat(e.debit);
      byPrincipalD[p].secs[s] = (byPrincipalD[p].secs[s]||0) + parseFloat(e.debit);
    }
    if (parseFloat(e.credit||0) > 0) {
      if (!byPrincipalC[p]) byPrincipalC[p] = { total:0, secs:{} };
      byPrincipalC[p].total += parseFloat(e.credit);
      byPrincipalC[p].secs[s] = (byPrincipalC[p].secs[s]||0) + parseFloat(e.credit);
    }
  });
  const sortD = Object.entries(byPrincipalD).sort((a,b)=>b[1].total-a[1].total);
  const sortC = Object.entries(byPrincipalC).sort((a,b)=>b[1].total-a[1].total);
  return { totalDebit, totalCredit, sortD, sortC };
}

function sparkline(principal, type) {
  // Tendance 6 derniers mois pour cette catégorie principale
  const vals = [];
  for (let i = 5; i >= 0; i--) {
    let m = state.mois - i, y = state.annee;
    while (m < 0) { m += 12; y--; }
    const tot = state.suivi
      .filter(e => e.annee === y && e.mois === m + 1 && e.libelle_principal === principal)
      .reduce((s,e)=> s + parseFloat((type==='credit'?e.credit:e.debit) || 0), 0);
    vals.push(tot);
  }
  const max = Math.max(...vals, 1), W = 70, H = 22;
  const pts = vals.map((v,i) => `${(i/(vals.length-1)*W).toFixed(1)},${(H - (v/max)*H).toFixed(1)}`).join(' ');
  const col = type === 'credit' ? '#10B981' : '#EF4444';
  return `<svg class="sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
    <polyline points="${pts}" fill="none" stroke="${col}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;
}

function statsCatBlock(principal, data, totalRef, type) {
  const pct = totalRef > 0 ? data.total/totalRef*100 : 0;
  const icon = CAT_ICONS[principal] || (type==='credit'?'💰':'💳');
  const sortedSecs = Object.entries(data.secs).sort((a,b)=>b[1]-a[1]);
  return `
  <div class="stats-cat-block">
    <div class="stats-cat-header">
      <div class="stats-cat-icon">${icon}</div>
      <div class="stats-cat-info">
        <div class="stats-cat-name">${escHtml(principal)}</div>
        <div class="stats-bar-wrap"><div class="stats-bar ${type}" style="width:${Math.min(pct,100).toFixed(1)}%"></div></div>
        <div class="stats-pct">${pct.toFixed(1)}% du total · tendance 6 mois</div>
      </div>
      <div class="stats-cat-right">
        ${sparkline(principal, type)}
        <div class="stats-cat-total ${type}">${fmt(data.total)}</div>
      </div>
    </div>
    <div class="stats-secs">
      ${sortedSecs.map(([sec,amt])=>{
        const sp = data.total>0?amt/data.total*100:0;
        return `<div class="stats-sec-row">
          <div class="stats-sec-dot ${type}"></div>
          <div class="stats-sec-name">${escHtml(sec)}</div>
          <div class="stats-sec-bar-wrap"><div class="stats-sec-bar ${type}" style="width:${Math.min(sp,100).toFixed(1)}%"></div></div>
          <div class="stats-sec-amt">${fmt(amt)}</div>
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

function statsContent(totalDebit, totalCredit, sortD, sortC, period) {
  const solde = totalCredit - totalDebit;
  const expHtml = sortD.length === 0
    ? `<div class="stats-empty">Aucune dépense enregistrée pour ${period}</div>`
    : sortD.map(([p,d])=>statsCatBlock(p,d,totalDebit,'debit')).join('');
  const incHtml = sortC.length === 0
    ? `<div class="stats-empty">Aucune entrée enregistrée pour ${period}</div>`
    : sortC.map(([p,d])=>statsCatBlock(p,d,totalCredit,'credit')).join('');
  return `
  <div class="stats-wrap">
    <div class="stats-summary">
      <div class="stats-sum-item">
        <div class="stats-sum-icon debit">📉</div>
        <div class="stats-sum-label">Dépenses</div>
        <div class="stats-sum-value debit">${fmt(totalDebit)}</div>
      </div>
      <div class="stats-sum-item">
        <div class="stats-sum-icon credit">📈</div>
        <div class="stats-sum-label">Entrées</div>
        <div class="stats-sum-value credit">${fmt(totalCredit)}</div>
      </div>
      <div class="stats-sum-item">
        <div class="stats-sum-icon ${solde>=0?'credit':'debit'}">⚖️</div>
        <div class="stats-sum-label">Solde</div>
        <div class="stats-sum-value ${solde>=0?'credit':'debit'}">${fmt(solde)}</div>
      </div>
    </div>
    ${sortD.length > 0 ? `
    <div class="stats-section-title">🍩 Répartition des dépenses <span class="stats-period">${period}</span></div>
    <div class="card stats-donut-wrap"><canvas id="stats-donut"></canvas></div>` : ''}
    ${statsTimelineHTML()}
    <div class="stats-section-title">📉 Postes de dépenses <span class="stats-period">${period}</span></div>
    <div class="stats-cats">${expHtml}</div>
    <div class="stats-section-title">📈 Récap des entrées <span class="stats-period">${period}</span></div>
    <div class="stats-cats">${incHtml}</div>
  </div>`;
}

// Stats détaillées : compte sélectionné (courant par défaut), hors virements auto
function statsBase() {
  const compte = window._statsCompte || 'courant';
  return state.suivi.filter(e => !e.source_id && suiviCompte(e) === compte);
}

// Timeline 12 mois : barres verticales empilées (crédit en haut, débit en bas)
function statsTimelineHTML() {
  const compte = window._statsCompte || 'courant';
  const data = Array.from({ length: 12 }, (_, i) => {
    const ents = state.suivi.filter(e => e.annee === state.annee && e.mois === i + 1 && !e.source_id && suiviCompte(e) === compte);
    const c = ents.reduce((s,e) => s + parseFloat(e.credit||0), 0);
    const d = ents.reduce((s,e) => s + parseFloat(e.debit||0), 0);
    return { c, d };
  });
  const maxVal = Math.max(...data.map(m => Math.max(m.c, m.d)), 1);
  const cur = state.mois;
  const cols = data.map((m, i) => {
    const ch = (m.c / maxVal) * 100;
    const dh = (m.d / maxVal) * 100;
    return `
    <div class="tl-col${i===cur?' tl-current':''}" title="${MOIS_FR[i]} : +${fmt(m.c)} / −${fmt(m.d)}">
      <div class="tl-bars">
        ${m.c>0 ? `<div class="tl-bar credit" style="height:${ch.toFixed(1)}%"></div>` : ''}
        ${m.d>0 ? `<div class="tl-bar debit"  style="height:${dh.toFixed(1)}%"></div>` : ''}
      </div>
      <div class="tl-label">${MOIS_COURT[i]}</div>
    </div>`;
  }).join('');
  return `
  <div class="stats-timeline-wrap">
    <div class="stats-timeline-title">📅 Évolution sur l'année ${state.annee}</div>
    <div class="stats-timeline">${cols}</div>
  </div>`;
}

function renderStatsMensuel() {
  const entries = statsBase().filter(e => e.mois===state.mois+1 && e.annee===state.annee);
  const {totalDebit,totalCredit,sortD,sortC} = getStatsData(entries);
  return statsContent(totalDebit, totalCredit, sortD, sortC, `${MOIS_FR[state.mois]} ${state.annee}`);
}

function renderStatsAnnuel() {
  const entries = statsBase().filter(e => e.annee===state.annee);
  const {totalDebit,totalCredit,sortD,sortC} = getStatsData(entries);
  // Tableau mensuel par catégorie principale
  const byMois = Array.from({length:12},(_,i)=>{
    const m = statsBase().filter(e=>e.annee===state.annee && e.mois===i+1);
    const d = m.reduce((s,e)=>s+parseFloat(e.debit||0),0);
    const c = m.reduce((s,e)=>s+parseFloat(e.credit||0),0);
    return {d,c};
  });
  const maxVal = Math.max(...byMois.map(m=>Math.max(m.d,m.c)),1);
  const moisChart = `
  <div class="stats-section-title">📆 Évolution mensuelle <span class="stats-period">${state.annee}</span></div>
  <div class="stats-chart-wrap card">
    <div class="stats-chart">
      ${byMois.map((m,i)=>`
      <div class="stats-chart-col">
        <div class="stats-chart-bars">
          <div class="stats-chart-bar credit" style="height:${(m.c/maxVal*100).toFixed(1)}%" title="${MOIS_COURT[i]}: +${fmt(m.c)}"></div>
          <div class="stats-chart-bar debit"  style="height:${(m.d/maxVal*100).toFixed(1)}%" title="${MOIS_COURT[i]}: -${fmt(m.d)}"></div>
        </div>
        <div class="stats-chart-label">${MOIS_COURT[i]}</div>
      </div>`).join('')}
    </div>
    <div class="stats-chart-legend">
      <span class="legend-dot credit"></span>Entrées
      <span class="legend-dot debit" style="margin-left:12px"></span>Dépenses
    </div>
  </div>`;
  return moisChart + statsContent(totalDebit, totalCredit, sortD, sortC, `Année ${state.annee}`);
}

function bindSwipe() {
  const el = document.getElementById('main-content');
  let startX = 0, startY = 0, ignore = false;
  el.addEventListener('touchstart', e => {
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    // Ne pas capturer le swipe s'il démarre dans une zone à défilement horizontal
    // (tableau du suivi / vue annuelle) → on laisse l'utilisateur faire défiler
    ignore = !!e.target.closest('.suivi-table-wrap, .ma-scroll, .stats-chart');
  }, { passive: true });
  el.addEventListener('touchend', e => {
    if (ignore) return;
    const dx = e.changedTouches[0].clientX - startX;
    const dy = e.changedTouches[0].clientY - startY;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.8) {
      dx < 0 ? nextMonth() : prevMonth();
    }
  }, { passive: true });
}

document.addEventListener('DOMContentLoaded', init);
