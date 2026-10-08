/* Ζωντανά δεδομένα από το Google Sheet (μέσω Apps Script).
 * Η σελίδα σχεδιάζεται πρώτα με το τοπικό αντίγραφο. Αν απαντήσει το API,
 * τα δεδομένα αντικαθίστανται και η σελίδα ξανασχεδιάζεται.
 * Αν το API δεν απαντήσει, μένει το τοπικό αντίγραφο και το γράφει στο κάτω μέρος.
 */
(function live(){
  const cfg = window.U11_CONFIG || {};
  const src = document.getElementById("source");
  const setSource = t => { if (src) src.textContent = t; };
  if (!cfg.API_URL) { setSource("Τοπικό αντίγραφο δεδομένων."); return; }

  const TEAM = { "Α΄": "A", "Γ΄": "G", "Και τα δύο": "B" };
  const MONTH = { Σεπ:"Σεπτέμβριος", Οκτ:"Οκτώβριος", Νοε:"Νοέμβριος", Δεκ:"Δεκέμβριος", Ιαν:"Ιανουάριος",
                  Φεβ:"Φεβρουάριος", Μαρ:"Μάρτιος", Απρ:"Απρίλιος", Μαϊ:"Μάιος", Ιουν:"Ιούνιος" };
  const DAYS = ["Κυρ","Δευ","Τρι","Τετ","Πεμ","Παρ","Σάβ"];
  const str = v => (v === null || v === undefined) ? "" : String(v).trim();
  const num = v => { const n = Number(v); return isFinite(n) ? n : 0; };
  const lines = v => str(v).split(/\n+/).map(s => s.replace(/^\s*(\d+\.|•|-)\s*/, "").replace(/^«(.*)»$/, "$1").trim()).filter(Boolean);
  const isoToDate = s => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(str(s)); return m ? new Date(+m[1], +m[2]-1, +m[3]) : null; };
  const shortDate = s => { const d = isoToDate(s); return d ? `${DAYS[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}` : str(s); };
  const longDate = d => d.toLocaleDateString("el-GR", { day:"numeric", month:"short", year:"numeric" });
  const safeUrl = u => /^https:\/\//i.test(str(u)) ? str(u) : "";

  function applyDrills(res){
    if (!res || !res.rows) return;
    res.rows.forEach(r => {
      const c = str(r["Κωδικός"]); if (!c) return;
      const m = {
        c, t: TEAM[str(r["Τμήμα"])] || "B", n: str(r["Όνομα"]), k: str(r["Κατηγορία"]) || c.split("-")[0],
        w: str(r["Συνοδεύουν"]), g: str(r["Στόχος"]), d: str(r["Διάρκεια"]), p: str(r["Παίκτες"]),
        b: str(r["Μπάλες"]), i: str(r["Ένταση"]), u: num(r["Χρήσεις"]),
        s: str(r["Κατάσταση"]) === "Πλήρης" ? "ok" : "rev",
        o: str(r["Οργάνωση"]), e: str(r["Εκτέλεση"]), ky: lines(r["Κλειδιά διδασκαλίας"]),
        m: lines(r["Συνήθη λάθη"]).join("\n"), ea: str(r["Ευκόλυνση"]), ha: str(r["Δυσκόλεμα"]),
        ct: str(r["Επαφές ανά παιδί"])
      };
      const old = DR.find(x => x.c === c);
      if (old) Object.keys(m).forEach(k => { if (m[k] !== "" && !(Array.isArray(m[k]) && !m[k].length)) old[k] = m[k]; });
      else DR.push(m);
    });
    DR.sort((a,b) => ORDER.indexOf(a.k) - ORDER.indexOf(b.k) || a.c.localeCompare(b.c));
  }

  function applyAttendance(res){
    if (!res || !res.rows) return;
    ["A","G"].forEach(key => {
      const label = key === "A" ? "Α΄" : "Γ΄";
      const rows = res.rows.filter(r => str(r["Τμήμα"]) === label);
      const tot = rows.find(r => str(r["Μήνας"]) === "Σεζόν");
      if (!tot) return;
      const months = rows.filter(r => str(r["Μήνας"]) !== "Σεζόν" && num(r["Προπονήσεις"]) > 0)
        .map(r => [MONTH[str(r["Μήνας"])] || str(r["Μήνας"]), num(r["Προπονήσεις"]), num(r["Παρουσίες"])]);
      TEAMS[key].att = {
        kids: num(tot["Ενεργά παιδιά"]), sessions: num(tot["Προπονήσεις"]), presences: num(tot["Παρουσίες"]),
        months, bands: [num(tot["Παιδιά ≥ 75%"]), num(tot["Παιδιά 50–74%"]), num(tot["Παιδιά < 50%"])]
      };
      TEAMS[key].statsNote = "Ζωντανά από το ημερολόγιο παρουσιών. Όσα παιδιά γράφτηκαν αργότερα έχουν χαμηλότερο ποσοστό, γιατί μετράνε όλες οι προπονήσεις του μήνα.";
    });
  }

  function applySessions(res){
    if (!res || !res.rows) return;
    ["A","G"].forEach(key => {
      const label = key === "A" ? "Α΄" : "Γ΄";
      const rows = res.rows.filter(r => str(r["Τμήμα"]) === label && isoToDate(r["Ημερομηνία"]))
        .sort((a,b) => str(b["Ημερομηνία"]).localeCompare(str(a["Ημερομηνία"])));
      if (!rows.length) return;
      const t = TEAMS[key];
      t.log = rows.slice(0, 8).map(r => ({
        d: shortDate(r["Ημερομηνία"]), r: str(r["Ρόλος"]), w: num(r["Εβδ."]), key: str(r["Κλειδί"]),
        codes: str(r["Ασκήσεις (κωδικοί)"]).split(/[,\s]+/).filter(c => /^[Α-Ω0-9]{3}-\d{3}$/.test(c)),
        pres: num(r["Παρόντες"]), note: str(r["Τι δούλεψε"])
      }));
      const wk = Math.max(...rows.map(r => num(r["Εβδ."])));
      if (wk >= 1 && wk <= 36) {
        t.cur = wk;
        const b = t.blocks.find(b => wk >= b.w[0] && wk <= b.w[1]);
        const now = t.meta.find(m => m[0] === "Τώρα"); if (now && b) now[1] = `Μπλοκ ${b.n} · Εβδομάδα ${wk} από 36`;
      }
      const upto = t.meta.find(m => m[0] === "Δεδομένα έως"); if (upto) upto[1] = longDate(isoToDate(rows[0]["Ημερομηνία"]));
    });
  }

  function applyFriendlies(res){
    if (!res || !res.rows) return;
    ["A","G"].forEach(key => {
      const label = key === "A" ? "Α΄" : "Γ΄";
      TEAMS[key].friendlies = res.rows.filter(r => str(r["Τμήμα"]) === label)
        .sort((a,b) => str(b["Ημερομηνία"]).localeCompare(str(a["Ημερομηνία"])))
        .map(r => ({ d: shortDate(r["Ημερομηνία"]), opp: str(r["Αντίπαλος"]), court: str(r["Γήπεδο"]),
          worked: str(r["Τι δουλέψαμε"]), good: str(r["Τι πήγε καλά"]), photo: safeUrl(r["Δημόσια φωτογραφία (link)"]) }));
    });
  }

  setSource("Φόρτωση από το Sheet…");
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), cfg.TIMEOUT_MS || 15000);
  fetch(cfg.API_URL + (cfg.API_URL.includes("?") ? "&" : "?") + "r=all", { signal: ctl.signal })
    .then(r => r.json())
    .then(j => {
      clearTimeout(timer);
      if (!j.ok) throw new Error(j.error || "API");
      const d = j.data || {};
      applyDrills(d.drills); applyAttendance(d.attendance); applySessions(d.sessions); applyFriendlies(d.friendlies);
      render();
      const t = new Date(j.generated);
      setSource(`Ζωντανά από το Sheet · ενημέρωση ${t.toLocaleTimeString("el-GR", { hour:"2-digit", minute:"2-digit" })}`);
    })
    .catch(err => { console.warn("API:", err); setSource("Το Sheet δεν απάντησε. Εμφανίζεται το τοπικό αντίγραφο."); });
})();
