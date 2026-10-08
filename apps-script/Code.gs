/** @OnlyCurrentDoc */
/**
 * U11 / U9 — Read-only API πάνω από το Google Sheet.
 *
 * Τι κάνει: διαβάζει την καρτέλα «Δημόσιο» και επιστρέφει σε JSON ΜΟΝΟ
 * τις καρτέλες και τις στήλες που γράφονται εκεί. Τίποτα άλλο δεν φεύγει.
 *
 * Endpoints (GET):
 *   ?r=index        λίστα διαθέσιμων πόρων
 *   ?r=all          όλοι οι ενεργοί πόροι σε μία κλήση (αυτό καλεί η σελίδα)
 *   ?r=<πόρος>      ένας πόρος, π.χ. ?r=drills
 *   &fresh=1        παράκαμψη cache (για έλεγχο αμέσως μετά από αλλαγή)
 *
 * Νέος πόρος = νέα γραμμή στην καρτέλα «Δημόσιο». Αυτό το αρχείο δεν αλλάζει.
 */

const CONFIG_SHEET = 'Δημόσιο';
const CONFIG_HEADER_ROW = 6;
const CACHE_SECONDS = 300;           // 5' — αλλαγές στο Sheet φαίνονται σε έως 5 λεπτά
const CACHE_PREFIX = 'v1:';

// Δεύτερο δίχτυ ασφαλείας: αυτές οι καρτέλες δεν βγαίνουν ποτέ,
// ακόμη κι αν κάποιος τις γράψει κατά λάθος στο «Δημόσιο».
const BLOCKED_TABS = [
  /^Ρόστερ/,
  /^Σύνοψη/,
  /^[ΑΓ]΄ (Σεπ|Οκτ|Νοε|Δεκ|Ιαν|Φεβ|Μαρ|Απρ|Μαϊ|Ιουν)$/,
  /^Δημόσιο$/
];
// Στήλες που δεν βγαίνουν ποτέ, από όποια καρτέλα κι αν είναι.
const BLOCKED_COLUMNS = [
  /Σημειώσεις για παιδιά/i,
  /Τηλέφωνο/i,
  /^Παιδί$/i,
  /Σκορ/i,
  /Album ομάδας/i
];

function doGet(e) {
  const p = (e && e.parameter) || {};
  const r = String(p.r || 'index').trim();
  const fresh = p.fresh === '1';

  try {
    const cache = CacheService.getScriptCache();
    const key = CACHE_PREFIX + r;
    if (!fresh) {
      const hit = cache.get(key);
      if (hit) return json_(hit);
    }

    const cfg = readConfig_();
    let data;
    if (r === 'index') {
      data = Object.keys(cfg).map(k => ({ resource: k, description: cfg[k].description }));
    } else if (r === 'all') {
      data = {};
      Object.keys(cfg).forEach(k => { data[k] = readResource_(cfg[k]); });
    } else if (cfg[r]) {
      data = readResource_(cfg[r]);
    } else {
      return json_(JSON.stringify({ ok: false, error: 'Άγνωστος πόρος', resources: Object.keys(cfg) }));
    }

    const body = JSON.stringify({
      ok: true,
      resource: r,
      generated: new Date().toISOString(),
      data: data
    });
    // Το cache δέχεται έως 100 KB ανά κλειδί.
    if (body.length < 95000) cache.put(key, body, CACHE_SECONDS);
    return json_(body);
  } catch (err) {
    console.error(err);
    return json_(JSON.stringify({ ok: false, error: 'Σφάλμα ανάγνωσης' }));
  }
}

function json_(text) {
  return ContentService.createTextOutput(text).setMimeType(ContentService.MimeType.JSON);
}

/** Διαβάζει την καρτέλα «Δημόσιο» → { πόρος: {tab, headerRow, columns, filter, description} } */
function readConfig_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(CONFIG_SHEET);
  if (!sh) throw new Error('Λείπει η καρτέλα ' + CONFIG_SHEET);
  const last = sh.getLastRow();
  if (last <= CONFIG_HEADER_ROW) return {};
  const rows = sh.getRange(CONFIG_HEADER_ROW + 1, 1, last - CONFIG_HEADER_ROW, 7).getDisplayValues();
  const out = {};
  rows.forEach(([resource, tab, headerRow, cols, filter, active, description]) => {
    resource = String(resource).trim();
    if (!resource || String(active).trim().toUpperCase() !== 'ΝΑΙ') return;
    if (!/^[a-z0-9_-]+$/.test(resource)) return;
    if (BLOCKED_TABS.some(rx => rx.test(tab))) return;
    out[resource] = {
      tab: String(tab).trim(),
      headerRow: parseInt(headerRow, 10) || 1,
      columns: String(cols).split(',').map(s => s.trim()).filter(Boolean)
        .filter(c => !BLOCKED_COLUMNS.some(rx => rx.test(c))),
      filter: parseFilter_(filter),
      description: description
    };
  });
  return out;
}

/** «Στήλη=τιμή», «Στήλη!=τιμή», «Στήλη>0» */
function parseFilter_(s) {
  s = String(s || '').trim();
  if (!s) return null;
  const m = s.match(/^(.+?)\s*(!=|=|>)\s*(.*)$/);
  if (!m) return null;
  return { col: m[1].trim(), op: m[2], val: m[3].trim() };
}

function passes_(f, v) {
  if (!f) return true;
  const isEmpty = v === '' || v === null;
  switch (f.op) {
    case '=':  return String(v).trim().toUpperCase() === f.val.toUpperCase();
    case '!=': return String(v).trim().toUpperCase() !== f.val.toUpperCase();
    case '>':
      if (isEmpty) return false;
      if (v instanceof Date) return true;
      if (typeof v === 'number') return v > Number(f.val);
      return true; // μη κενό κείμενο
  }
  return true;
}

function readResource_(c) {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getSheetByName(c.tab);
  if (!sh) return { error: 'Λείπει η καρτέλα ' + c.tab, rows: [] };
  const lastRow = sh.getLastRow(), lastCol = sh.getLastColumn();
  if (lastRow <= c.headerRow) return { columns: c.columns, rows: [] };

  const headers = sh.getRange(c.headerRow, 1, 1, lastCol).getDisplayValues()[0]
    .map(h => String(h).replace(/\s+/g, ' ').trim());
  const idx = {};
  headers.forEach((h, i) => { if (h && !(h in idx)) idx[h] = i; });

  const wanted = c.columns.filter(n => n in idx);
  const missing = c.columns.filter(n => !(n in idx));
  const fIdx = c.filter && (c.filter.col in idx) ? idx[c.filter.col] : -1;

  const values = sh.getRange(c.headerRow + 1, 1, lastRow - c.headerRow, lastCol).getValues();
  const tz = ss.getSpreadsheetTimeZone();
  const rows = [];
  values.forEach(row => {
    if (row.every(v => v === '' || v === null)) return;
    if (fIdx >= 0 && !passes_(c.filter, row[fIdx])) return;
    const o = {};
    wanted.forEach(n => {
      let v = row[idx[n]];
      if (v instanceof Date) v = Utilities.formatDate(v, tz, 'yyyy-MM-dd');
      o[n] = v;
    });
    rows.push(o);
  });
  const res = { columns: wanted, rows: rows };
  if (missing.length) res.missing = missing; // για να φαίνεται αν άλλαξε όνομα στήλης
  return res;
}

/** Τρέξ' το μία φορά από τον editor για να δεις τι βγαίνει (View → Logs). */
function testAll() {
  const out = doGet({ parameter: { r: 'all', fresh: '1' } });
  console.log(out.getContent().slice(0, 3000));
}

/** Καθαρίζει το cache — χρήσιμο αν θες να δεις μια αλλαγή αμέσως. */
function clearCache() {
  const cfg = readConfig_();
  CacheService.getScriptCache().removeAll(['index', 'all'].concat(Object.keys(cfg)).map(k => CACHE_PREFIX + k));
}
