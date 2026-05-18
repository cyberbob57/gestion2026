'use strict';

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
function getBanqueLogo() {
  return (state.parametres && state.parametres['banque_logo']) || '';
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
      const maxW = 220, maxH = 90;
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

// Couleur stable déduite du nom de catégorie (pour pastilles)
function catColor(name) {
  const s = String(name || '');
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h}, 60%, 50%)`;
}

// Règles de pictogrammes définies par l'utilisateur (Paramètres)
function getPictoRules() {
  try {
    const r = JSON.parse(state.parametres['picto_rules'] || '[]');
    return Array.isArray(r) ? r : [];
  } catch { return []; }
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
  return CAT_ICONS[o && o.libelle_principal] || '💳';
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
  view: 'dashboard',
  mois: now.getMonth(),
  annee: now.getFullYear(),
  mensualisations: [],
  transactions: [],
  libelles: [],
  suivi: [],
  soldes: [],
  parametres: {},
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
  const titles = { dashboard:'Accueil', mensualisation:'Mensualisation', suivi:'Suivi journalier compte courant Robert et Carméla', parametres:'Paramètres', stats:'Statistiques' };
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
  if (!canvas || typeof Chart === 'undefined') return;
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
function getSoldeDepart(mois, annee) {
  const s = state.soldes.find(x => x.mois === (mois + 1) && x.annee === annee);
  if (s) return parseFloat(s.solde);
  // No explicit entry → auto-compute from previous month's end balance
  let pm = mois - 1, pa = annee;
  if (pm < 0) { pm = 11; pa--; }
  if (pa < 2025) return 0; // base case: stop recursion before year 2025
  const prevDepart = getSoldeDepart(pm, pa);
  const prevEntries = state.suivi.filter(e => e.mois === (pm + 1) && e.annee === pa);
  const prevD = prevEntries.reduce((acc, e) => acc + parseFloat(e.debit  || 0), 0);
  const prevC = prevEntries.reduce((acc, e) => acc + parseFloat(e.credit || 0), 0);
  return prevDepart + prevC - prevD;
}

function getSuiviMois() {
  return state.suivi
    .filter(s => s.mois === (state.mois + 1) && s.annee === state.annee)
    .sort((a, b) => (a.jour || 0) - (b.jour || 0) || (a.ordre || 0) - (b.ordre || 0));
}

function getJourSemaine(jour) {
  if (!jour) return '';
  return ['Dim','Lun','Mar','Mer','Jeu','Ven','Sam'][new Date(state.annee, state.mois, jour).getDay()];
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

  <div class="rapprochement-card${isEquilibre ? ' equilibre' : ''}">
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
    <button class="btn-inscrire" onclick="inscrireMensualisations()">📋 Inscrire les mensualisations</button>
    <button class="btn-pointer-tout" onclick="pointerTout()" title="Pointer toutes les opérations">✓✓</button>
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

  ${entries.length === 0
    ? `<div class="empty-state"><div class="icon">📒</div><p>Aucune opération ce mois<br><small>Cliquez sur "Inscrire les mensualisations" pour commencer</small></p></div>`
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
            <div class="lib-header">
              <span class="lib-cat-icon">${entryIcon(e)}</span>
              <div class="lib-principal">${escHtml(e.libelle_principal || '')}</div>
            </div>
            ${e.libelle_secondaire ? `<div class="lib-secondaire">${escHtml(e.libelle_secondaire)}</div>` : ''}
            ${e.libelle_libre ? `<div class="lib-libre">${escHtml(e.libelle_libre)}</div>` : ''}
          </td>
          <td class="col-type">${(()=>{ const {base,echeance}=parsePaypal4X(e.type_operation||''); return echeance ? `${escHtml(base)} <span class="echeance-badge">Éch.${echeance}/4</span>` : escHtml(base); })()}</td>
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
  if (!cv || typeof Chart === 'undefined') return;
  const entries = (window._statsView === 'annuel')
    ? state.suivi.filter(e => e.annee === state.annee)
    : state.suivi.filter(e => e.mois === state.mois + 1 && e.annee === state.annee);
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

async function inscrireMensualisations() {
  const mk    = MOIS_KEYS[state.mois];
  const mois  = state.mois + 1;
  const annee = state.annee;

  const toInsert = state.mensualisations.filter(m => m[mk] != null);
  if (toInsert.length === 0) { showToast('Aucune mensualisation pour ce mois', 'error'); return; }

  const existing = state.suivi.filter(s => s.mois === mois && s.annee === annee && s.is_mensualisation);
  if (existing.length > 0) {
    if (!confirm(`Remplacer les ${existing.length} mensualisations déjà inscrites ?`)) return;
    await sb.from('suivi_mensuel').delete().eq('mois', mois).eq('annee', annee).eq('is_mensualisation', true);
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
  <div class="modal-title">Solde de report — ${MOIS_FR[state.mois]} ${state.annee}</div>
  <div class="modal-form" id="solde-form">
    <div class="form-group">
      <label>Solde de report (€)</label>
      <input type="number" step="0.01" id="solde-input" value="${current}" placeholder="0,00">
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveSoldeDepart()">Enregistrer</button>
    </div>
  </div>`);
}

async function saveSoldeDepart() {
  const val = parseFloat(document.getElementById('solde-input').value);
  if (isNaN(val)) { showToast('Montant invalide', 'error'); return; }
  const mois = state.mois + 1;
  const annee = state.annee;
  setSyncing(true);
  const { error } = await sb.from('soldes_depart')
    .upsert({ annee, mois, solde: val }, { onConflict: 'annee,mois' });
  setSyncing(false);
  if (error) { showToast('Erreur : ' + error.message, 'error'); return; }
  showToast('Solde de report enregistré', 'success');
  closeModal();
  await loadData();
}

function getSoldeBancaire(mois, annee) {
  const key = `solde_banque_${annee}_${String(mois + 1).padStart(2,'0')}`;
  return parseFloat(state.parametres[key] || 'NaN');
}

function showSoldeBancaire() {
  const current = getSoldeBancaire(state.mois, state.annee);
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">Solde bancaire réel — ${MOIS_FR[state.mois]} ${state.annee}</div>
  <div class="modal-form" id="solde-banque-form">
    <div class="form-group">
      <label>Solde affiché sur votre relevé bancaire (€)</label>
      <input type="number" step="0.01" id="solde-banque-input" value="${isNaN(current) ? '' : current}" placeholder="0,00">
    </div>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="closeModal()">Annuler</button>
      <button class="btn-save" onclick="saveSoldeBancaire()">Enregistrer</button>
    </div>
  </div>`);
}

async function saveSoldeBancaire() {
  const val = parseFloat(document.getElementById('solde-banque-input').value);
  if (isNaN(val)) { showToast('Montant invalide', 'error'); return; }
  const key = `solde_banque_${state.annee}_${String(state.mois + 1).padStart(2,'0')}`;
  await setParam(key, String(val));
  closeModal();
  showToast('Solde bancaire enregistré ✓', 'success');
  render();
}

async function purgerMois() {
  const moisFR = MOIS_FR[state.mois];
  if (!confirm(`⚠️ Supprimer TOUTES les opérations de ${moisFR} ${state.annee} ?\n\nCette action est irréversible.`)) return;
  setSyncing(true);
  await sb.from('suivi_mensuel').delete().eq('mois', state.mois + 1).eq('annee', state.annee);
  setSyncing(false);
  showToast(`Données de ${moisFR} effacées`, 'success');
  await loadData();
}

// ── Formulaire saisie opération ──────────────────────────
function suiviForm(data = {}) {
  const uid = ++_libUid;
  const { base: typeBase, echeance: echeanceVal } = parsePaypal4X(data.type_operation || '');
  const isPaypal4X = typeBase === 'Paypal en 4X';
  return `
  <div class="row2">
    <div class="form-group">
      <label>Jour</label>
      <input type="number" name="jour" min="1" max="31" value="${data.jour || ''}" placeholder="1–31">
    </div>
    <div class="form-group">
      <label>N° Chèque</label>
      <input type="text" name="num_cheque" value="${escHtml(data.num_cheque || '')}" placeholder="Optionnel">
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
  ${echeanceGroup4X(uid, isPaypal4X, echeanceVal || 1)}
  <div class="row2">
    <div class="form-group">
      <label>Crédit (€)</label>
      <input type="number" step="0.01" name="credit" value="${data.credit != null ? data.credit : ''}" placeholder="0,00">
    </div>
    <div class="form-group">
      <label>Débit (€)</label>
      <input type="number" step="0.01" name="debit" value="${data.debit != null ? data.debit : ''}" placeholder="0,00">
    </div>
  </div>`;
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
  form.querySelectorAll('[name]').forEach(el => {
    if (el.name === 'echeance') return; // géré séparément
    data[el.name] = el.value.trim() || null;
  });
  // Combine Paypal en 4X + écheance
  if (data.type_operation === 'Paypal en 4X') {
    const echeanceSel = form.querySelector('[name="echeance"]');
    const n = echeanceSel ? echeanceSel.value : '1';
    data.type_operation = `Paypal en 4X – Éch. ${n}/4`;
  }
  data.jour   = data.jour   ? parseInt(data.jour)    : null;
  data.credit = data.credit ? parseFloat(data.credit) : null;
  data.debit  = data.debit  ? parseFloat(data.debit)  : null;
  if (data.credit == null && data.debit == null) {
    showToast('Indiquez un crédit ou un débit', 'error'); return;
  }
  if (!id) {
    data.annee = state.annee;
    data.mois  = state.mois + 1;
    data.is_mensualisation = false;
  }
  setSyncing(true);
  let err;
  if (id) {
    ({ error: err } = await sb.from('suivi_mensuel').update(data).eq('id', id));
  } else {
    ({ error: err } = await sb.from('suivi_mensuel').insert(data));
  }
  setSyncing(false);
  if (err) { showToast('Erreur : ' + err.message, 'error'); return; }
  showToast(id ? 'Opération mise à jour' : 'Opération ajoutée', 'success');
  closeModal();
  // Mettre à jour le prochain numéro de chèque
  const savedType = data.type_operation || '';
  const savedNum = data.num_cheque;
  if (savedType.includes('Chèque') && savedNum && /^\d+$/.test(savedNum)) {
    const cle = savedType.includes('Robert') ? 'chequier_robert' : 'chequier_carmela';
    const next = String(parseInt(savedNum) + 1);
    await setParam(cle, next);
  }
  await loadData();
}

async function deleteSuiviEntry(id) {
  if (!confirm('Supprimer cette opération ?')) return;
  closeModal();
  await sb.from('suivi_mensuel').delete().eq('id', id);
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

    <h3>Solde bancaire début d'exercice</h3>
    <div class="card" style="margin:0">
      <div class="params-item" style="border:none;padding:0 0 12px 0">
        <div class="params-item-left">
          <div class="name">Solde au 1er janvier ${state.annee}</div>
          <div class="sub">Solde réel du compte bancaire à l'ouverture</div>
        </div>
      </div>
      <div class="chip-input-row">
        <input type="number" step="0.01" id="solde-exercice-inp" value="${soldeVal}" placeholder="0,00">
        <button class="btn-small" onclick="saveSoldeExercice()">Enregistrer</button>
      </div>
    </div>

    <h3>Libellés</h3>
    <div class="libelles-manager" id="libelles-manager">
      ${state.libelles.map(l => {
        const secs = getSecondaires(l.principal);
        return `
        <div class="libelle-block" id="lib-block-${l.id}">
          <div class="libelle-block-header">
            <button class="libelle-toggle" onclick="toggleLibelleBlock('${l.id}')">
              <span class="toggle-arrow">▶</span>
              <strong>${escHtml(l.principal)}</strong>
              <span class="sec-count">${secs.length} secondaire${secs.length!==1?'s':''}</span>
            </button>
            <button class="btn-icon danger" onclick="deleteLibelle('${l.id}')" title="Supprimer">×</button>
          </div>
          <div class="libelle-block-body hidden" id="lib-body-${l.id}">
            <div class="secondaires-list" id="secs-${l.id}">
              ${secs.map((s,i) => `
              <div class="sec-item">
                <span>${escHtml(s)}</span>
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
          <span>${escHtml(mp)}</span>
          <button class="btn-icon danger" onclick="deleteMoyenPaiement(${i})" title="Supprimer">×</button>
        </div>`).join('') || '<div class="sec-empty">Aucun moyen de paiement</div>'}
      </div>
      <div class="chip-input-row" style="margin-top:8px">
        <input type="text" id="new-mp" placeholder="Nouveau moyen de paiement…">
        <button class="btn-small" onclick="addMoyenPaiement()">Ajouter</button>
      </div>
    </div>

    <h3>Chéquiers</h3>
    <div class="card" style="margin:0">
      <div class="chequier-row">
        <div class="chequier-label">🔵 Chéquier Robert</div>
        <div class="chip-input-row" style="margin:4px 0 0 0">
          <input type="text" id="cheq-robert" value="${escHtml(state.parametres['chequier_robert'] || '')}" placeholder="Prochain n° de chèque…" inputmode="numeric">
          <button class="btn-small" onclick="saveChequier('robert')">OK</button>
        </div>
      </div>
      <div class="chequier-row" style="margin-top:12px">
        <div class="chequier-label">🔴 Chéquier Carméla</div>
        <div class="chip-input-row" style="margin:4px 0 0 0">
          <input type="text" id="cheq-carmela" value="${escHtml(state.parametres['chequier_carmela'] || '')}" placeholder="Prochain n° de chèque…" inputmode="numeric">
          <button class="btn-small" onclick="saveChequier('carmela')">OK</button>
        </div>
      </div>
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
    <div class="params-item">
      <div class="params-item-left"><div class="name">☁️ Sauvegarder dans iCloud</div><div class="sub">Partage natif → Fichiers → iCloud Drive</div></div>
      <button class="btn-small btn-icloud" onclick="sauvegardeICloud()">Sauvegarder</button>
    </div>
    <div class="params-item">
      <div class="params-item-left"><div class="name">Télécharger (JSON)</div><div class="sub">Sauvegarde complète sur l'appareil</div></div>
      <button class="btn-small" onclick="exportData()">Exporter</button>
    </div>
    <div class="params-item">
      <div class="params-item-left"><div class="name">Restaurer une sauvegarde</div><div class="sub">Importer depuis un fichier JSON</div></div>
      <button class="btn-small" onclick="document.getElementById('import-file').click()">Importer</button>
      <input type="file" id="import-file" accept=".json" class="hidden" onchange="importData(event)">
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
}

function toggleLibelleBlock(id) {
  const body = document.getElementById(`lib-body-${id}`);
  const arrow = document.querySelector(`#lib-block-${id} .toggle-arrow`);
  if (!body) return;
  body.classList.toggle('hidden');
  if (arrow) arrow.textContent = body.classList.contains('hidden') ? '▶' : '▼';
}

async function saveSoldeExercice() {
  const val = parseFloat(document.getElementById('solde-exercice-inp').value);
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
async function saveChequier(nom) {
  const inp = document.getElementById(`cheq-${nom}`);
  const val = (inp?.value || '').trim();
  const cle = nom === 'robert' ? 'chequier_robert' : 'chequier_carmela';
  await setParam(cle, val);
  showToast('Numéro de chéquier enregistré ✓', 'success');
}

function autoFillCheque(sel) {
  const val = sel.value;
  if (!val.includes('Chèque')) return;
  const next = getNextCheque(val);
  if (!next) return;
  const inp = sel.closest('form, .modal-body')?.querySelector('[name="num_cheque"]');
  if (inp && !inp.value) inp.value = next;
}

// ═══════════════════════════════════════════════════════
// MODALS — MENSUALISATION
// ═══════════════════════════════════════════════════════
function monthsFields(data = {}) {
  return `<div class="months-grid">
    ${MOIS_KEYS.map((mk, i) => `
    <div class="month-input-group">
      <label>${MOIS_COURT[i]}</label>
      <input type="number" step="0.01" name="${mk}" value="${data[mk] != null ? data[mk] : ''}" placeholder="—">
    </div>`).join('')}
  </div>`;
}

// ── Dropdown secondaire lié au principal ────────────────
let _libUid = 0;

function getSecondaires(principal) {
  const lib = state.libelles.find(l => l.principal === principal);
  if (!lib) return [];
  const s = lib.secondaires;
  if (Array.isArray(s)) return s;
  try { return JSON.parse(s); } catch { return []; }
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
function toggleEcheance4X(sel, uid) {
  const grp = document.getElementById('echeance-grp-' + uid);
  if (grp) grp.style.display = sel.value === 'Paypal en 4X' ? '' : 'none';
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
  const data = {};
  form.querySelectorAll('[name]').forEach(el => {
    const v = el.value.trim();
    if (MOIS_KEYS.includes(el.name)) { data[el.name] = v === '' ? null : parseFloat(v); }
    else { data[el.name] = v || null; }
  });
  data.jour = parseInt(data.jour) || 1;
  if (!data.libelle_principal) { showToast('Libellé principal requis', 'error'); return; }

  setSyncing(true);
  let err;
  if (id) {
    data.updated_at = new Date().toISOString();
    ({ error: err } = await sb.from('mensualisations').update(data).eq('id', id));
  } else {
    ({ error: err } = await sb.from('mensualisations').insert(data));
  }
  setSyncing(false);
  if (err) { showToast('Erreur : ' + err.message, 'error'); return; }
  showToast(id ? 'Mensualisation mise à jour' : 'Mensualisation ajoutée', 'success');
  closeModal();
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
      <input type="number" step="0.01" name="montant" value="${data.montant||''}" placeholder="0,00">
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
  data.montant = parseFloat(data.montant);
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
  const isRobert = type.includes('Robert');
  const key = isRobert ? 'chequier_robert' : 'chequier_carmela';
  return state.parametres[key] || '';
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

// ── Rappel automatique quotidien de sauvegarde ──────────
function maybeAutoBackup() {
  const j = joursDepuisBackup();
  if (j < 1) return; // sauvegardé il y a moins d'un jour
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem('backup_snooze') === today) return; // déjà proposé aujourd'hui
  const dernier = j === Infinity ? 'Aucune sauvegarde effectuée à ce jour.' :
    `Dernière sauvegarde il y a ${j} jour${j > 1 ? 's' : ''}.`;
  openModal(`
  <div class="modal-handle"></div>
  <div class="modal-title">☁️ Sauvegarde quotidienne</div>
  <div class="modal-form">
    <p style="color:var(--text-muted);font-size:14px;line-height:1.6;margin-bottom:6px">
      ${dernier}<br>Sauvegardez vos données dans iCloud Drive en un geste.
    </p>
    <p style="font-size:12px;color:var(--text-muted);margin-bottom:14px">
      💡 Vos données sont déjà synchronisées dans le cloud Supabase — ceci est une archive de sécurité supplémentaire.
    </p>
    <div class="modal-actions">
      <button class="btn-cancel" onclick="snoozeBackup()">Plus tard</button>
      <button class="btn-save btn-icloud" onclick="closeModal(); sauvegardeICloud();">Sauvegarder dans iCloud</button>
    </div>
  </div>`);
}

function snoozeBackup() {
  localStorage.setItem('backup_snooze', new Date().toISOString().slice(0, 10));
  closeModal();
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
    <h1>Suivi journalier — Compte courant Robert et Carméla — ${MOIS_FR[state.mois]} ${state.annee}</h1>
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
    if (ok) {
      showApp();
      bindSwipe();
      await loadData();
      subscribeRealtime();
      setTimeout(maybeAutoBackup, 1500);
      return;
    }
  }

  if (state.sbUrl && state.sbKey) {
    const ok = await initSupabase(state.sbUrl, state.sbKey);
    if (ok) {
      showApp();
      bindSwipe();
      await loadData();
      subscribeRealtime();
      setTimeout(maybeAutoBackup, 1500);
      return;
    }
  }
  showSetup();
}

// ═══════════════════════════════════════════════════════
// STATISTIQUES
// ═══════════════════════════════════════════════════════
function renderStats() {
  const statsView = window._statsView || 'mensuel';
  const tabs = `
  <div class="mensu-tabs">
    <button class="mensu-tab${statsView==='mensuel'?' active':''}" onclick="window._statsView='mensuel'; render()">📊 Mensuel</button>
    <button class="mensu-tab${statsView==='annuel'?' active':''}" onclick="window._statsView='annuel'; render()">📆 Annuel</button>
  </div>`;
  return tabs + (statsView === 'annuel' ? renderStatsAnnuel() : renderStatsMensuel());
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
    <div class="stats-section-title">📉 Postes de dépenses <span class="stats-period">${period}</span></div>
    <div class="stats-cats">${expHtml}</div>
    <div class="stats-section-title">📈 Récap des entrées <span class="stats-period">${period}</span></div>
    <div class="stats-cats">${incHtml}</div>
  </div>`;
}

function renderStatsMensuel() {
  const entries = state.suivi.filter(e => e.mois===state.mois+1 && e.annee===state.annee);
  const {totalDebit,totalCredit,sortD,sortC} = getStatsData(entries);
  return statsContent(totalDebit, totalCredit, sortD, sortC, `${MOIS_FR[state.mois]} ${state.annee}`);
}

function renderStatsAnnuel() {
  const entries = state.suivi.filter(e => e.annee===state.annee);
  const {totalDebit,totalCredit,sortD,sortC} = getStatsData(entries);
  // Tableau mensuel par catégorie principale
  const byMois = Array.from({length:12},(_,i)=>{
    const m = state.suivi.filter(e=>e.annee===state.annee && e.mois===i+1);
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
