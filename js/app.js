/* Σχεδίαση σελίδας. */
let team="A";
try{const s=localStorage.getItem("u11team");if(s==="A"||s==="G")team=s;}catch(e){}

const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const inTeam=d=>d.t===team||d.t==="B";
const T=()=>TEAMS[team];

function header(){const t=T();$("#hEyebrow").textContent=t.eyebrow;$("#hTitle").textContent=t.title;$("#hSub").textContent=t.sub;
 $("#hMeta").innerHTML=t.meta.map(([k,v])=>`<span>${k}: <b>${esc(v)}</b></span>`).join("");
 document.querySelectorAll(".teams button").forEach(b=>b.setAttribute("aria-pressed",b.dataset.team===team));}

function season(){const t=T();$("#seasonH").textContent=t.seasonH;$("#seasonTestNote").textContent=t.testNote;
 const blockOf=w=>t.blocks.find(b=>w>=b.w[0]&&w<=b.w[1]);
 let tl="",lb="",top="";
 for(let w=1;w<=36;w++){const b=blockOf(w);
  tl+=`<div class="wk b${b.n}${w<t.cur?" done":""}${w===t.cur?" now":""}" title="Εβδομάδα ${w} · Μπλοκ ${b.n}"></div>`;
  lb+=`<span>${w%2?w:""}</span>`;
  top+=`<span style="font:700 10px var(--mono);text-align:center;color:${t.tests[w]?"var(--accent)":"var(--ink)"}">${t.tests[w]||(w===t.cur?"▼":"")}</span>`;}
 $("#tl").innerHTML=tl;$("#tlLabels").innerHTML=lb;$("#tlTop").innerHTML=top;
 $("#blocks").innerHTML=t.blocks.map(b=>{const cur=t.cur>=b.w[0]&&t.cur<=b.w[1];
  const mainTag=CATS[b.main]?`<span class="tag cat">${b.main}</span> ${CATS[b.main]}`:`<b style="font-weight:600">${esc(b.main)}</b>`;
  const secTag=b.sec?(CATS[b.sec]?`<span class="tag">${b.sec}</span> ${CATS[b.sec]}`:esc(b.sec)):"";
  return `<div class="block${cur?" current":""}">
   <div class="head"><span class="num">ΜΠΛΟΚ ${b.n}</span>${cur?'<span class="pill">Τώρα · εβδ. '+t.cur+'</span>':`<span class="muted mono" style="font-size:12px">εβδ. ${b.w[0]}–${b.w[1]}</span>`}</div>
   <div class="muted" style="font-size:13px">${b.per}</div>
   <div>${mainTag}</div>${secTag?`<div style="font-size:14px" class="muted">+ ${secTag}</div>`:""}
   ${b.keys.length?`<ul class="keys">${b.keys.map(k=>`<li>${esc(k)}</li>`).join("")}</ul>`:""}
   <div style="font-size:13px"><span class="eyebrow" style="font-size:10px">Δείκτης</span><br>${esc(b.ind)}</div></div>`;}).join("");}

function method(){const t=T();
 $("#mPrinciples").innerHTML=t.principles.map(([a,b])=>`<li><b>${esc(a)}</b><span class="muted">${esc(b)}</span></li>`).join("");
 const tone={good:"var(--good)",accent:"var(--accent)",ink:"var(--ink)"};
 $("#mBar").innerHTML=`<div class="bar80" role="img" aria-label="Κατανομή 60 λεπτών">${t.bar.map(([m,l,c,p])=>`<div style="flex:${m};background:color-mix(in srgb,${tone[c]} ${p}%,var(--sunk))">${esc(l)}<br>${m}'</div>`).join("")}</div>`;
 $("#mBarNote").textContent=t.barNote;
 $("#mWeek").innerHTML=t.week.map(([a,b,c])=>`<tr><td>${a}</td><td><b>${esc(b)}</b></td><td>${esc(c)}</td></tr>`).join("");
 $("#mTestsH").textContent=t.testsH;$("#mTestsCol").textContent=t.testsCol;$("#mTestsNote").textContent=t.testsNote;
 $("#mTests").innerHTML=t.testsRows.map(([a,b],i)=>`<tr><td class="t">${i+1}</td><td>${esc(a)}</td><td>${esc(b)}</td></tr>`).join("");}

let filter="ALL",sel=null;
function chips(){const items=DR.filter(inTeam);const counts={};items.forEach(d=>counts[d.k]=(counts[d.k]||0)+1);
 if(filter!=="ALL"&&!counts[filter])filter="ALL";
 $("#chips").innerHTML=`<button class="chip" aria-pressed="${filter==="ALL"}" data-f="ALL">Όλες<span class="n">${items.length}</span></button>`+
  ORDER.filter(k=>counts[k]).map(k=>`<button class="chip" aria-pressed="${filter===k}" data-f="${k}" title="${CATS[k]}">${k}<span class="n">${counts[k]}</span></button>`).join("");}
function list(){const items=DR.filter(d=>inTeam(d)&&(filter==="ALL"||d.k===filter));
 $("#list").innerHTML=items.map(d=>`<button class="drill" data-c="${d.c}" aria-current="${sel===d.c}"><span class="code">${d.c}</span><span class="name">${esc(d.n)}</span><span class="dia">${D[d.c]?"◆":""}</span></button>`).join("");}
function detail(code){const d=DR.find(x=>x.c===code);if(!d)return;sel=code;const svg=diagram(code);
 const box=(t,v)=>v?`<div class="box"><h4>${t}</h4><p>${esc(v)}</p></div>`:"";
 const tl={A:"U11",G:"U9",B:"U9 & U11"}[d.t];
 $("#detail").innerHTML=`
  <div class="row"><span class="tag cat">${d.c}</span>${d.w?d.w.split(", ").map(w=>`<span class="tag">${w}</span>`).join(""):""}
   <span class="tag" style="background:none;border:1px solid var(--line)">${tl}</span>
   <span class="status ${d.s==="ok"?"ok":"rev"}">${d.s==="ok"?"Δοκιμασμένη":"Σε δοκιμή"}</span></div>
  <h2 style="font-size:22px">${esc(d.n)}</h2>
  <p style="margin:0;font-size:16px">${esc(d.g)}</p>
  <dl class="facts">
   <div><dt>Διάρκεια</dt><dd>${esc(d.d)}</dd></div><div><dt>Παίκτες</dt><dd>${esc(d.p)}</dd></div><div><dt>Μπάλες</dt><dd>${esc(d.b)}</dd></div>
   ${d.i?`<div><dt>Ένταση</dt><dd>${esc(d.i)}</dd></div>`:""}${d.ct?`<div><dt>Όγκος ανά παιδί</dt><dd>${esc(d.ct)}</dd></div>`:""}
   <div><dt>Χρήσεις φέτος</dt><dd class="mono">${d.u}</dd></div></dl>
  ${svg?`<div class="court">${svg}</div>${LEGEND}`:(NODIA.has(d.c)?`<div class="court empty">Δεν χρειάζεται σχέδιο: γίνεται επί τόπου, σε γραμμή ή ελεύθερα στον χώρο.</div>`:`<div class="court empty">Το σχέδιο γηπέδου για αυτή την άσκηση ετοιμάζεται.</div>`)}
  ${box("Οργάνωση",d.o)}<div class="box"><h4>Εκτέλεση</h4><p class="steps">${esc(d.e)}</p></div>
  <div class="box"><h4>Κλειδιά διδασκαλίας</h4><ul class="dkeys">${d.ky.map(k=>`<li>${esc(k)}</li>`).join("")}</ul></div>
  ${d.m?box("Συνήθη λάθη",d.m):""}${(d.ea||d.ha)?`<div class="two">${box("Ευκόλυνση",d.ea)}${box("Δυσκόλεμα",d.ha)}</div>`:""}`;
 list();}
$("#chips").addEventListener("click",e=>{const b=e.target.closest(".chip");if(!b)return;filter=b.dataset.f;chips();list();});
$("#list").addEventListener("click",e=>{const b=e.target.closest(".drill");if(!b)return;detail(b.dataset.c);
 if(window.matchMedia("(max-width:820px)").matches)$("#detail").scrollIntoView({behavior:"smooth",block:"start"});});

function numbers(){const t=T(),a=t.att;const avg=a.presences/a.sessions,rate=a.presences/(a.kids*a.sessions);const items=DR.filter(inTeam);
 $("#stats").innerHTML=[[a.kids,"παιδιά στο τμήμα"],[a.sessions,"προπονήσεις με καταγραφή"],[avg.toFixed(1).replace(".",","),"μέση παρουσία ανά προπόνηση"],[Math.round(rate*100)+"%","ποσοστό παρουσίας"],[items.length,"ασκήσεις στο ασκησιολόγιο"]]
  .map(([v,l])=>`<div class="stat"><span class="v">${v}</span><span class="l">${l}</span></div>`).join("");
 $("#statsNote").textContent=t.statsNote;$("#covNote").textContent=t.covNote;$("#nPending").textContent=t.pending;$("#nTestsH").textContent=t.nTestsH;
 const counts={};items.forEach(d=>counts[d.k]=(counts[d.k]||0)+1);const max=Math.max(...Object.values(counts));
 $("#cov").innerHTML=ORDER.map(k=>{const n=counts[k]||0;return `<div class="r${n?"":" zero"}"><span class="mono lbl" title="${CATS[k]}">${k}</span><div class="track"><div class="fill" style="width:${n/max*100}%"></div></div><span class="mono" style="text-align:right">${n}</span></div>`;}).join("");
 const mmax=Math.max(...a.months.map(m=>m[2]/m[1]),1);
 $("#monthBars").innerHTML=a.months.map(([n,ses,pr])=>{const v=pr/ses;return `<div class="r" style="grid-template-columns:96px minmax(0,1fr) 92px"><span>${n}</span><div class="track"><div class="fill" style="width:${v/a.kids*100}%"></div></div><span class="mono" style="text-align:right">${v.toFixed(1).replace(".",",")} / ${a.kids}</span></div>`;}).join("")+`<div class="muted" style="font-size:12px">${a.months.map(m=>m[0]+": "+m[1]+" προπονήσεις").join(" · ")}</div>`;
 const bc=[["var(--good)","75% και πάνω"],["var(--warn)","50–74%"],["var(--crit)","κάτω από 50%"]];const bt=a.bands.reduce((x,y)=>x+y,0);
 $("#bandBar").setAttribute("aria-label",a.bands.map((n,i)=>n+" παιδιά "+bc[i][1]).join(", "));
 $("#bandBar").innerHTML=a.bands.map((n,i)=>n?`<div style="flex:${n};background:${bc[i][0]}">${n}</div>`:"").join("");
 $("#bandLegend").innerHTML=bc.map(([c,l],i)=>`<span><span class="sw" style="background:${c}"></span>${l}: <b style="color:var(--ink)">${a.bands[i]}</b></span>`).join("");
 friendlies();
 $("#log").innerHTML=t.log.map(s=>`<div class="entry"><div class="h"><span class="d">${s.d}</span>${s.r?`<span class="tag">${s.r}</span>`:""}<span class="muted" style="font-size:13px">εβδ. ${s.w} · ${s.pres} παρόντες</span></div>
  ${s.key?`<div style="font-size:14px"><span class="muted">Κλειδί:</span> «${esc(s.key)}»</div>`:""}
  <div class="codes">${s.codes.map(c=>`<button data-c="${c}" title="Άνοιγμα στο ασκησιολόγιο">${c}</button>`).join("")}</div>
  ${s.note?`<div style="font-size:14px">${esc(s.note)}</div>`:""}</div>`).join("");}
function friendlies(){const f=T().friendlies||[];
 $("#friendlies").innerHTML=f.length?f.map(x=>`<div class="entry"><div class="h"><span class="d">${esc(x.d)}</span><span class="muted" style="font-size:13px">με ${esc(x.opp)}${x.court?" · "+esc(x.court):""}</span></div>
  ${x.worked?`<div style="font-size:14px"><span class="muted">Δουλέψαμε:</span> ${esc(x.worked)}</div>`:""}
  ${x.good?`<div style="font-size:14px"><span class="muted">Πήγε καλά:</span> ${esc(x.good)}</div>`:""}
  ${x.photo?`<div style="font-size:14px"><a href="${esc(x.photo)}" target="_blank" rel="noopener noreferrer">Φωτογραφία</a></div>`:""}</div>`).join("")
  :`<div class="pending">Δεν έχουν καταγραφεί φιλικά ακόμη.</div>`;}
$("#log").addEventListener("click",e=>{const b=e.target.closest("button[data-c]");if(!b)return;filter="ALL";chips();detail(b.dataset.c);show("drills");});

const TABS=["season","drills","method","numbers"];
function show(id){TABS.forEach(t=>{$("#"+t).hidden=t!==id;$("#t-"+t).setAttribute("aria-selected",t===id);});try{localStorage.setItem("u11tab",id);}catch(e){}}
document.querySelector("nav.tabs").addEventListener("click",e=>{const b=e.target.closest("button[role=tab]");if(b)show(b.getAttribute("aria-controls"));});

function render(){header();season();method();chips();
 const first=team==="A"?"ΜΕΤ-001":"ΧΕΙ-031";if(!sel||!inTeam(DR.find(d=>d.c===sel)))sel=first;detail(sel);numbers();}
document.querySelector(".teams").addEventListener("click",e=>{const b=e.target.closest("button[data-team]");if(!b)return;team=b.dataset.team;
 try{localStorage.setItem("u11team",team);}catch(err){}render();});
render();
(function init(){let h=location.hash.slice(1);if(h==="u9"){team="G";render();}else if(h==="u11"){team="A";render();}
 if(TABS.includes(h)){show(h);return;}try{const s=localStorage.getItem("u11tab");if(TABS.includes(s))show(s);}catch(e){}})();
