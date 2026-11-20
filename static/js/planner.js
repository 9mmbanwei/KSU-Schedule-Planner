// The planner page: requirements, year plan, schedules, registration day, AI, and startup.
// Needs js/engine.js and js/requirements.js loaded first.
function startPlanner(D){
"use strict";
const E=makeEngine(D);
const DAYS=["M","T","W","R","F"],DAYNAME={M:"Mon",T:"Tue",W:"Wed",R:"Thu",F:"Fri",S:"Sat",U:"Sun"};
const H0=8,H1=22;
const CAMPUS={K:"Kennesaw",M:"Marietta",O:"KSU Online",E:"eCore (online)"};
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const fmt=m=>{let h=Math.floor(m/60),mm=m%60,ap=h>=12?"p":"a";h=h%12||12;return h+(mm?":"+String(mm).padStart(2,"0"):"")+ap};
const MON=["","Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const md=s=>s?MON[+s.slice(0,2)]+" "+(+s.slice(3,5)):"";
const title=c=>D.titles[c]?D.titles[c][0]:(TITLE_FALLBACK[c]||(/^[A-Z]{3,4} 100[12]$/.test(c)?c.split(" ")[0]+" language "+(c.endsWith("1")?"I":"II"):""));
const cr=c=>D.titles[c]?D.titles[c][1]:0;

const ALL_CODES=new Set(Object.values(MAJORS).flatMap(m=>m.groups.flatMap(g=>g.items.flatMap(it=>it.c?[it.c]:it.opts))));
const HAVE_SUBJ=new Set(E.secs.map(s=>s.course.split(" ")[0]));
const subj=c=>c.split(" ")[0];

/* ---------- state ---------- */
const defaults=()=>({major:"cs",target:15,summer:false,summerTarget:6,completed:["ENGL 1101","MATH 1113","CSE 1321","COMM 1100"],selected:[],
  busy:["T8","T9","T10","T11","R8","R9","R10","R11"],prefs:{noEarly:true,noLate:false,compact:false,full:false,format:"prefer-in",campus:"any"},prof:{},built:false});
let saved=null;try{saved=JSON.parse(localStorage.getItem("ksu-planner-v3")||"null")}catch{}
const init=Object.assign(defaults(),saved||{});
const state={major:MAJORS[init.major]?init.major:"cs",target:+init.target||15,summer:!!init.summer,summerTarget:+init.summerTarget||6,completed:new Set(init.completed),selected:new Set(init.selected.filter(c=>D.titles[c])),busy:new Set(init.busy),
  prefs:Object.assign(defaults().prefs,init.prefs),prof:init.prof||{},out:null,active:0,built:!!init.built,build:init.build&&init.build.terms?init.build:null};
function persist(){try{localStorage.setItem("ksu-planner-v3",JSON.stringify({major:state.major,target:state.target,summer:state.summer,summerTarget:state.summerTarget,completed:[...state.completed],selected:[...state.selected],busy:[...state.busy],prefs:state.prefs,prof:state.prof,built:state.built,build:state.build}))}catch{}}

$("dataBadge").innerHTML=`<b>${esc(D.termName)} · real KSU sections</b><span>${E.secs.length.toLocaleString()} sections · ${HAVE_SUBJ.size} subjects · pulled ${esc(D.fetched)}</span>`;
$("courseList").innerHTML=Object.keys(D.titles).filter(c=>!c.endsWith("L")||!D.titles[c.slice(0,-1)]).sort().map(c=>`<option value="${esc(c)} — ${esc(title(c))}"></option>`).join("");
$("major").innerHTML=Object.entries(MAJORS).map(([k,m])=>`<option value="${k}">${esc(m.name)}</option>`).join("");

/* ---------- requirement logic ---------- */
const labsOf=c=>LABBED.has(c)||D.titles[c+"L"]?[c,c+"L"]:[c];
const crOne=c=>D.titles[c]?D.titles[c][1]:(CRDEF[c]||(/L$/.test(c)?1:3));
const credits=c=>labsOf(c).reduce((a,x)=>a+crOne(x),0);
const isDone=c=>state.completed.has(c);
function unmet(c,taking,done=state.completed){
  const out=[];
  for(const req of PRE[c]||[]){
    const alts=Array.isArray(req)?req:[req];
    const ok=alts.some(a=>{const conc=a.endsWith("*"),code=a.replace("*","");return done.has(code)||(conc&&taking&&taking.has(code))});
    if(!ok)out.push(alts.map(a=>a.replace("*"," (or same term)")).join(" or "));
  }
  return out;
}
function availability(c){
  if(!HAVE_SUBJ.has(subj(c)))return{k:"nodata",t:`${subj(c)} isn't in your downloaded data`};
  if(!D.titles[c])return{k:"notoffered",t:`Not offered in ${D.termName}`};
  return{k:"offered",t:""};
}
const major=()=>MAJORS[state.major];
function slotDone(it,done=state.completed){return it.opts.filter(c=>done.has(c))}
function slotExcluded(it,c,taking,done=state.completed){return(it.excl||[]).some(p=>p.includes(c)&&p.some(o=>o!==c&&(done.has(o)||(taking&&taking.has(o)))))}
function requiredCodes(m){return m.groups.flatMap(g=>g.items.flatMap(it=>it.c?[it.c]:[]))}
// how many later requirements in this major depend on a course, directly or through a chain
function chainInfo(m){
  const pool=new Set(m.groups.flatMap(g=>g.items.flatMap(it=>it.c?[it.c]:it.opts)));
  const kids={};for(const c of pool)for(const req of PRE[c]||[])for(const a of(Array.isArray(req)?req:[req])){const p=a.replace("*","");(kids[p]=kids[p]||new Set()).add(c)}
  const req=new Set(requiredCodes(m)),memo={};
  function walk(c,seen){if(memo[c])return memo[c];let depth=0,all=new Set();for(const k of kids[c]||[]){if(seen.has(k))continue;const r=walk(k,new Set([...seen,k]));depth=Math.max(depth,r.depth+1);all.add(k);r.all.forEach(x=>all.add(x))}return memo[c]={depth,all}}
  return c=>{const r=walk(c,new Set([c]));return{depth:r.depth,count:[...r.all].filter(x=>req.has(x)).length}};
}
function progress(m){
  let need=0,have=0;
  for(const g of m.groups)for(const it of g.items){if(it.c){need++;if(isDone(it.c))have++}else{need+=it.pick;have+=Math.min(it.pick,slotDone(it).length)}}
  return{need,have};
}

/* ---------- year planner ---------- */
const THIS_SEASON=D.term.endsWith("08")?"fall":"spring";
// live = this term, checked against real sections; otherwise a course plan only (sections not published yet)
function planTerm({done,live,season,target}){
  const m=major(),chain=chainInfo(m);
  const st={busy:state.busy,prefs:state.prefs,prof:state.prof};
  const dn=c=>done.has(c);
  const cands=[],skipped=[];
  // in a fixed sequence, only look at the earliest unfinished year and the one after it
  const ys=m.seq?m.groups.flatMap(g=>g.items.filter(it=>it.c&&it.y!=null&&!dn(it.c)).map(it=>it.y)):[];
  const maxY=ys.length?Math.min(...ys)+1:99;
  for(const g of m.groups)for(const it of g.items){
    const list=it.c?[it.c]:it.opts;
    if(it.c&&dn(it.c))continue;
    if(it.y!=null&&it.y>maxY)continue;
    // studio-sequence courses run in their own semester (even years = fall, odd = spring)
    if(m.seq&&it.y!=null&&g.id!=="ge"&&(it.y%2===0?"fall":"spring")!==season)continue;
    if(it.slot&&slotDone(it,done).length>=it.pick)continue;
    for(const c of list){
      if(dn(c))continue;
      const ch=chain(c),y=it.y??null,level=+c.split(" ")[1][0];
      // in a fixed sequence, earlier-year courses come first; gen-eds without a set year fill remaining hours
      let pri=m.seq?(y!=null?100-y*10:30)+ch.depth*3:ch.depth*10+ch.count*2+(g.id==="major"||g.id==="core"?4:0)-level;
      if(g.id==="elect")pri-=6;
      // summer sessions are short and mostly offer gen-eds and lower-level courses
      if(season==="summer"){if(g.id==="ge")pri+=8;else if(level>=3)pri-=15}
      // for a future term, prefer courses KSU has on the books (offered now) over unknown ones
      if(!live){if(D.titles[c])pri+=1;else if(HAVE_SUBJ.has(subj(c)))pri-=2}
      cands.push({c,it,g,pri,ch,y});
    }
  }
  cands.sort((a,b)=>b.pri-a.pri);
  const picks=[],taking=new Set(),slotUse={},why={};let hrs=0,majorCount=0;
  const fits=c=>E.okCount(c,st)>0;
  function tryAdd(x,pass){
    const c=x.c;if(taking.has(c))return false;
    const group=TOGETHER.find(t=>t.includes(c))||[c];
    const add=group.filter(k=>!dn(k)&&!taking.has(k));
    const h=add.reduce((a,k)=>a+credits(k),0);
    if(hrs+h>target)return false;
    if(x.it.slot){const have=slotDone(x.it,done).length,used=slotUse[x.it.slot]||0;if(x.it.pick-have-used<=0)return false;if(x.it.pick-have>1&&used>=1&&x.g.id==="ge")return false;if(slotExcluded(x.it,c,taking,done))return false}
    if(pass===0&&!m.seq&&(x.g.id==="major"||x.g.id==="elect"||x.g.id==="core")&&majorCount>=(season==="summer"?1:3))return false;
    const tmp=new Set([...taking,...add]);
    for(const k of add){
      if(unmet(k,tmp,done).length)return false;
      if(!live)continue;
      const av=availability(k);
      if(av.k!=="offered"){if(pass===0&&!x.it.slot)skipped.push({c:k,t:av.t,nodata:av.k==="nodata"});return false}
      if(!fits(k)){if(pass===0)skipped.push({c:k,t:"no section fits your busy hours and settings"});return false}
    }
    for(const k of add){picks.push(k);taking.add(k)}
    hrs+=h;if(x.it.slot)slotUse[x.it.slot]=(slotUse[x.it.slot]||0)+1;
    if(x.g.id!=="ge")majorCount+=add.length;
    const reason=m.seq&&x.y!=null&&x.g.id!=="ge"?`${TERMS[x.y]} in the recommended sequence`:x.ch.count?`unlocks ${x.ch.count} later requirement${x.ch.count>1?"s":""}`:x.g.id==="ge"?`general education${x.it.slot?" · "+x.it.label:""}`:x.g.id==="elect"?x.it.label:"required for the major";
    for(const k of add)why[k]=k===c?reason:`taken together with ${c}`;
    return true;
  }
  // pass 0 keeps a balance of at most 3 major courses; pass 1 fills any remaining hours
  for(const pass of[0,1])for(const x of cands){if(hrs>=target-1)break;tryAdd(x,pass)}
  const dropped=[];
  if(live){
    // if the picked set can't be combined into one schedule, drop the lowest-priority course and try again
    let out=E.solve({courses:picks,...st});
    while(!out.results.length&&picks.length>1&&dropped.length<3){const c=picks.pop();dropped.push(c);delete why[c];out=E.solve({courses:picks,...st})}
  }
  const seen=new Set();
  const sk=skipped.filter(s=>!seen.has(s.c)&&seen.add(s.c)&&!picks.includes(s.c));
  return{picks:picks.map(c=>({c,why:why[c],known:!!D.titles[c]})),hrs:picks.reduce((a,c)=>a+credits(c),0),dropped,
    nodata:sk.filter(s=>s.nodata).map(s=>s.c),skipped:sk.filter(s=>!s.nodata).slice(0,5)};
}
function termAfter(code){const y=+code.slice(0,4),t=code.slice(4);
  return t==="01"?{code:y+"05",name:"Summer "+y,season:"summer"}:t==="05"?{code:y+"08",name:"Fall "+y,season:"fall"}:{code:(y+1)+"01",name:"Spring "+(y+1),season:"spring"}}
// the terms after this one that make up "a year": one more fall/spring term, plus summer if the student wants it
function followingTerms(){
  const out=[];let code=D.term,regular=1;
  while(out.length<4){
    const n=termAfter(code);code=n.code;
    if(n.season==="summer"){if(state.summer&&regular<=2)out.push(n);if(regular>=2)break;continue}
    if(regular>=2)break;
    out.push(n);regular++;
  }
  return out;
}
function buildTerm(){
  const t1=planTerm({done:state.completed,live:true,season:THIS_SEASON,target:state.target});
  const terms=[{...t1,name:D.termName,live:true}];
  let done=new Set([...state.completed,...t1.picks.map(p=>p.c)]);
  for(const n of followingTerms()){
    const t=planTerm({done,live:false,season:n.season,target:n.season==="summer"?state.summerTarget:state.target});
    terms.push({...t,name:n.name,code:n.code,season:n.season});
    t.picks.forEach(p=>done.add(p.c));
  }
  state.selected=new Set(t1.picks.map(p=>p.c));state.built=true;
  state.build={terms};
}

/* ---------- render requirements ---------- */
function statusOf(c){
  if(isDone(c))return{k:"done",t:"Done"};
  if(state.selected.has(c))return{k:"ok",t:"Taking this term"};
  const u=unmet(c,state.selected);
  if(u.length)return{k:"lock",t:"Needs "+u.join(", ")};
  const av=availability(c);
  if(av.k!=="offered")return{k:"na",t:av.t};
  return{k:"ok",t:"Eligible · offered this term"};
}
function courseRow(c,y){
  const s=statusOf(c),offered=availability(c).k==="offered",lab=labsOf(c).length>1;
  const row=document.createElement("div");row.className="crow";
  row.innerHTML=`<div><span class="code">${esc(c)}</span>${lab?' <span class="small">+ lab</span>':""}${y!=null&&major().seq?`<span class="tag">${esc(TERMS[y])}</span>`:""} <span class="name">${esc(title(c)||"")}${title(c)?" · ":""}${credits(c)} cr</span>${s.k!=="done"?`<span class="st ${s.k}">${esc(s.t)}</span>`:""}${NOTE[c]&&!isDone(c)?`<span class="st na">${esc(NOTE[c])}</span>`:""}</div>`;
  const bd=document.createElement("button");bd.className="tog done";bd.textContent="Done";bd.setAttribute("aria-pressed",isDone(c));
  bd.onclick=()=>{isDone(c)?state.completed.delete(c):(state.completed.add(c),state.selected.delete(c));update()};
  const sel=state.selected.has(c);
  const bt=document.createElement("button");bt.className="tog take";bt.textContent=sel?"Taking":"Add";bt.setAttribute("aria-pressed",sel);
  bt.disabled=isDone(c)||!offered||(!sel&&unmet(c,state.selected).length>0);
  bt.onclick=()=>{sel?state.selected.delete(c):state.selected.add(c);update()};
  row.append(bd,bt);return row;
}
function slotRow(it){
  const done=slotDone(it),taking=it.opts.filter(c=>state.selected.has(c)),left=it.pick-done.length;
  const box=document.createElement("div");box.className="slot";
  box.innerHTML=`<div class="head"><b>${esc(it.label)}</b><span class="small">${Math.min(done.length,it.pick)} of ${it.pick} done${it.y!=null&&major().seq?" · "+esc(TERMS[it.y]):""}</span></div>
   ${it.note?`<span class="small">${esc(it.note)}</span>`:""}
   ${done.length||taking.length?`<div class="chips">${done.map(c=>`<span class="chip"><b>${esc(c)}</b>Done<button data-undo="${esc(c)}" aria-label="Unmark ${esc(c)}">×</button></span>`).join("")}${taking.map(c=>`<span class="chip"><b>${esc(c)}</b>Taking<button data-drop="${esc(c)}" aria-label="Remove ${esc(c)}">×</button></span>`).join("")}</div>`:""}`;
  if(left>0){
    const opts=it.opts.filter(c=>!isDone(c)&&!state.selected.has(c)).map(c=>{const s=statusOf(c),ex=slotExcluded(it,c,state.selected);return{c,s,ex,rank:ex?3:s.k==="ok"?0:s.k==="na"?2:1}}).sort((a,b)=>a.rank-b.rank);
    const r=document.createElement("div");r.className="row";
    const sel=document.createElement("select");sel.setAttribute("aria-label",it.label);
    sel.innerHTML=opts.map(o=>`<option value="${esc(o.c)}">${esc(o.c)}${title(o.c)?" — "+esc(title(o.c)):""}${o.ex?" (can't combine)":o.s.k==="ok"?"":o.s.k==="lock"?" (locked)":" (not this term)"}</option>`).join("");
    const add=document.createElement("button");add.className="tog take";add.textContent="Add";
    add.onclick=()=>{const c=sel.value,o=opts.find(x=>x.c===c);if(!o||o.s.k!=="ok"||o.ex){$("courseStatus").textContent=c+": "+(o&&o.ex?"can't be combined with a course you already have for this requirement.":o?o.s.t:"");return}state.selected.add(c);update()};
    const dn=document.createElement("button");dn.className="tog done";dn.textContent="Mark done";
    dn.onclick=()=>{state.completed.add(sel.value);state.selected.delete(sel.value);update()};
    r.append(sel,add,dn);box.append(r);
  }
  box.querySelectorAll("[data-undo]").forEach(b=>b.onclick=()=>{state.completed.delete(b.dataset.undo);update()});
  box.querySelectorAll("[data-drop]").forEach(b=>b.onclick=()=>{state.selected.delete(b.dataset.drop);update()});
  return box;
}
let openGroups=null;
function renderReqs(){
  const m=major(),box=$("reqs");
  $("major").value=state.major;$("target").value=String(state.target);$("pSummer").checked=state.summer;$("summerTarget").value=String(state.summerTarget);$("summerTarget").disabled=!state.summer;
  $("majorSource").innerHTML=`From KSU's <a href="${m.src}" target="_blank" rel="noopener">${esc(m.srcName)}</a>. ${esc(m.extra)}`;
  const p=progress(m);$("reqProgress").textContent=`${p.have} of ${p.need} done`;
  if(openGroups)box.querySelectorAll("details").forEach(d=>openGroups[d.dataset.g]=d.open);
  box.innerHTML="";
  const firstOpen=m.groups.find(g=>g.items.some(it=>it.c?!isDone(it.c):slotDone(it).length<it.pick));
  for(const g of m.groups){
    const total=g.items.reduce((a,it)=>a+(it.c?1:it.pick),0),have=g.items.reduce((a,it)=>a+(it.c?(isDone(it.c)?1:0):Math.min(it.pick,slotDone(it).length)),0);
    const d=document.createElement("details");d.className="rg";d.dataset.g=g.id;
    d.open=openGroups&&g.id in openGroups?openGroups[g.id]:g===firstOpen||g.id==="major";
    d.innerHTML=`<summary><span>${esc(g.name)}</span><span>${have}/${total}</span><span class="meter"><i style="width:${total?have/total*100:0}%"></i></span></summary>`;
    for(const it of g.items)d.append(it.c?courseRow(it.c,it.y):slotRow(it));
    box.append(d);
  }
  openGroups=openGroups||{};
  // subjects this major uses that aren't in the downloaded data
  const need=[...new Set(m.groups.flatMap(g=>g.items.flatMap(it=>it.c?[it.c]:it.opts)).map(subj))].sort();
  const miss=need.filter(s=>!HAVE_SUBJ.has(s));
  if(miss.length){
    const all=[...new Set([...ALL_CODES].map(subj).concat([...HAVE_SUBJ]))].sort();
    const cmd=`py ksu_sections.py --base-url "https://srs-owlexpress.kennesaw.edu/StudentRegistrationSsb/ssb" --term ${D.term} --subjects ${all.join(" ")}`;
    $("dataGap").innerHTML=`<div class="warnbox"><span><b>Your data is missing ${miss.length} subject${miss.length>1?"s":""} this major uses:</b> ${miss.map(esc).join(", ")}. Those courses can't be scheduled until the server downloads them. Site admin: add them to the KSU_SUBJECTS setting.</span></div>`;
  }else $("dataGap").innerHTML="";
}
function renderBuild(){
  const b=state.build,box=$("buildOut");
  if(!b||!b.terms){box.innerHTML="";return}
  const list=t=>`<ol>${t.picks.map(p=>`<li><b>${esc(p.c)}</b> ${esc(title(p.c))} <span class="small">· ${credits(p.c)} cr · ${esc(p.why||"")}</span></li>`).join("")}</ol>`;
  const total=b.terms.reduce((a,t)=>a+t.hrs,0);
  const cards=b.terms.map((t,i)=>{
    const head=`${esc(t.name)} · ${t.hrs} credit hours`;
    if(t.live){
      if(!t.picks.length)return`<div class="build"><b>${esc(t.name)}: nothing to add yet.</b><span class="small">No remaining requirement is both eligible and schedulable this term. Check the notes in Requirements, or download more subjects.</span></div>`;
      return`<div class="build"><b>${head}</b><span class="small">Checked against real sections; your schedules are on the right.</span>${list(t)}
      ${t.hrs<state.target-1?`<span class="small">Fewer hours than your target: nothing else you're eligible for is offered and fits your week.</span>`:""}
      ${t.dropped.length?`<span class="small">Left out ${t.dropped.map(esc).join(", ")}: it couldn't fit alongside the others without a time clash.</span>`:""}
      ${t.nodata.length?`<span class="skip">Can't plan yet because the subject isn't downloaded: ${t.nodata.slice(0,8).map(esc).join(", ")}${t.nodata.length>8?" and "+(t.nodata.length-8)+" more":""}.</span>`:""}
      ${t.skipped.length?`<div class="skip">Skipped: <ul>${t.skipped.map(s=>`<li>${esc(s.c)}: ${esc(s.t)}</li>`).join("")}</ul></div>`:""}</div>`;
    }
    const summer=t.season==="summer";
    return`<div class="build" style="background:var(--surface)"><b>${head}</b>
      ${t.picks.length?list(t):`<span class="small">Nothing left that you'd be eligible for by then.</span>`}
      <span class="small">Assumes you pass the semesters before it. ${summer?"Summer sessions are shorter and KSU offers fewer courses, mostly gen-eds and lower-level classes, so this leans that way. ":""}${esc(t.name)} sections aren't published yet, so this is a course plan, not a timed schedule, and some courses may not be offered. Once KSU posts them, this semester can be switched to real schedules.</span></div>`;
  }).join("");
  box.innerHTML=cards+`<span class="small">${b.terms.length} semesters · ${total} credit hours planned. You can change ${esc(D.termName)} with Add / Taking below; the plan updates when you click the button again.</span>`;
}
function renderCredits(){
  const hrs=[...state.selected].reduce((a,c)=>a+crOne(c)+(D.titles[c+"L"]&&!state.selected.has(c+"L")?crOne(c+"L"):0),0);
  $("credits").innerHTML=`This term: <b>${state.selected.size}</b> course${state.selected.size===1?"":"s"} · <b>${hrs}</b> credit hours${hrs>18?' · <span style="color:var(--warn)">over 18 needs approval</span>':hrs&&hrs<12?' · <span style="color:var(--warn)">under 12 is part-time</span>':""}`;
  const listed=new Set(major().groups.flatMap(g=>g.items.flatMap(it=>it.c?[it.c]:it.opts)));
  const extras=[...state.selected].filter(c=>!listed.has(c));
  $("extraChips").innerHTML=extras.map(c=>`<span class="chip"><b>${esc(c)}</b>${esc(title(c))}<button data-c="${esc(c)}" aria-label="Remove ${esc(c)}">×</button></span>`).join("");
  $("extraChips").querySelectorAll("button").forEach(b=>b.onclick=()=>{state.selected.delete(b.dataset.c);update()});
}
function renderCourses(){renderReqs();renderBuild();renderCredits()}
function addCourse(){
  const v=$("courseSearch").value.trim().toUpperCase();
  const code=Object.keys(D.titles).find(c=>v.startsWith(c.toUpperCase()+" —")||v===c.toUpperCase()||v.replace(/\s+/g,"")===c.replace(/\s+/g,""));
  if(!code){$("courseStatus").textContent="That course isn't offered in "+D.termName+" in the subjects downloaded. Pick one from the list.";return}
  if(isDone(code)){$("courseStatus").textContent=code+" is marked Done.";return}
  state.selected.add(code);$("courseSearch").value="";
  const u=unmet(code,state.selected);
  $("courseStatus").textContent=u.length?`Added ${code}. Heads up: it needs ${u.join(", ")}.`:`Added ${code}.`;
  update();
}
$("courseAdd").onclick=addCourse;
$("courseSearch").addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();addCourse()}});
$("major").onchange=e=>{state.major=e.target.value;openGroups=null;buildTerm();update()};
$("target").onchange=e=>{state.target=+e.target.value;persist()};
$("pSummer").onchange=e=>{state.summer=e.target.checked;$("summerTarget").disabled=!state.summer;buildTerm();update()};
$("summerTarget").onchange=e=>{state.summerTarget=+e.target.value;if(state.summer){buildTerm();update()}else persist()};
$("buildBtn").onclick=()=>{buildTerm();update()};

/* ---------- availability ---------- */
let painting=null;
function renderAvail(){
  const g=$("avail");g.innerHTML='<div></div>'+DAYS.map(d=>`<div class="hd">${DAYNAME[d]}</div>`).join("");
  for(let h=H0;h<H1;h++){
    g.insertAdjacentHTML("beforeend",`<div class="hr">${fmt(h*60)}</div>`);
    for(const d of DAYS){
      const b=document.createElement("button");b.className="cell"+(state.busy.has(d+h)?" busy":"");
      b.dataset.k=d+h;b.setAttribute("aria-label",`${DAYNAME[d]} ${fmt(h*60)}`);b.setAttribute("aria-pressed",state.busy.has(d+h));
      g.append(b);
    }
  }
}
function paint(el){const k=el.dataset.k;if(!k)return;painting?state.busy.add(k):state.busy.delete(k);el.classList.toggle("busy",painting);el.setAttribute("aria-pressed",painting)}
const g=$("avail");
g.addEventListener("pointerdown",e=>{const el=e.target.closest(".cell");if(!el)return;e.preventDefault();painting=!state.busy.has(el.dataset.k);paint(el)});
g.addEventListener("pointermove",e=>{if(painting===null)return;const el=document.elementFromPoint(e.clientX,e.clientY)?.closest?.(".cell");if(el&&g.contains(el))paint(el)});
window.addEventListener("pointerup",()=>{if(painting!==null){painting=null;solveAndRender()}});
g.addEventListener("keydown",e=>{const el=e.target.closest(".cell");if(el&&(e.key===" "||e.key==="Enter")){e.preventDefault();painting=!state.busy.has(el.dataset.k);paint(el);painting=null;solveAndRender()}});
$("clearBusy").onclick=()=>{state.busy.clear();renderAvail();solveAndRender()};

/* ---------- preferences ---------- */
function syncPrefs(){const p=state.prefs;$("pEarly").checked=p.noEarly;$("pLate").checked=p.noLate;$("pCompact").checked=p.compact;$("pFull").checked=p.full;$("pFormat").value=p.format;$("pCampus").value=p.campus}
[["pEarly","noEarly"],["pLate","noLate"],["pCompact","compact"],["pFull","full"]].forEach(([id,k])=>$(id).onchange=e=>{state.prefs[k]=e.target.checked;solveAndRender()});
$("pFormat").onchange=e=>{state.prefs.format=e.target.value;solveAndRender()};
$("pCampus").onchange=e=>{state.prefs.campus=e.target.value;solveAndRender()};
function renderProfList(){
  const ents=Object.entries(state.prof);
  $("profList").innerHTML=ents.length?`<span class="small">Professors you've marked:</span>`+ents.map(([n,v])=>`<span class="row"><span class="chip"><b style="color:var(${v==="prefer"?"--good":"--bad"})">${v==="prefer"?"Prefer":"Avoid"}</b>${esc(n)}<button data-n="${esc(n)}" aria-label="Clear ${esc(n)}">×</button></span></span>`).join(""):`<span class="small">Mark professors Prefer or Avoid from the schedule table to steer results.</span>`;
  $("profList").querySelectorAll("button").forEach(b=>b.onclick=()=>{delete state.prof[b.dataset.n];solveAndRender()});
}
const rmp=n=>{const[last,first]=n.split(",").map(x=>x.trim());return"https://www.ratemyprofessors.com/search/professors?q="+encodeURIComponent(first?first+" "+last:n)};

/* ---------- results ---------- */
const colorOf={};
function why(r){
  const w=[];
  w.push(r.days.length?`On campus ${r.days.length} day${r.days.length===1?"":"s"} (${DAYS.filter(d=>r.days.includes(d)).map(d=>DAYNAME[d]).join(", ")}).`:"No campus days: everything is online.");
  if(r.maxGap.m>=60)w.push(`Longest break: ${Math.floor(r.maxGap.m/60)}h ${r.maxGap.m%60?r.maxGap.m%60+"m ":""}on ${DAYNAME[r.maxGap.d]}.`);else if(r.days.length)w.push("No breaks longer than an hour between classes.");
  if(r.switches.length)w.push(`Switches between Kennesaw and Marietta on ${r.switches.map(d=>DAYNAME[d]).join(", ")}; at least ${E.TRAVEL} minutes are left for the shuttle or drive.`);
  if(r.online)w.push(`${r.online} online section${r.online>1?"s":""}.`);
  if(r.early)w.push(`${r.early} class meeting${r.early>1?"s":""} before 9 a.m. each week.`);
  if(r.prefer)w.push(`${r.prefer} section${r.prefer>1?"s":""} with professors you marked Prefer.`);
  const half=r.secs.filter(s=>s.meets.some(E.isHalf));if(half.length)w.push(`${half.map(s=>s.course).join(", ")} meets for only part of the term (see dates in the table).`);
  const full=r.secs.filter(s=>s.seats<=0);if(full.length)w.push(`${full.map(s=>s.course).join(", ")} is full right now; you'd join the waitlist.`);
  return w;
}
function blockedMsg(b){
  const parts=[];
  if(b.full)parts.push(`${b.full} full`);if(b.busy)parts.push(`${b.busy} during your busy hours`);if(b.format)parts.push(`${b.format} in the wrong format`);
  if(b.campus)parts.push(`${b.campus} on the other campus`);if(b.avoid)parts.push(`${b.avoid} with professors you avoid`);
  return `<li><b>${esc(b.c)}</b>: all ${b.total} sections are ruled out (${parts.join(", ")}).</li>`;
}
function renderResults(){
  const box=$("results"),out=state.out,R=out.results;
  out.courses.forEach((c,i)=>colorOf[c]=`var(--c${i%6+1})`);
  const adv=$("advisorPanel");
  if(!state.selected.size){box.innerHTML=`<h2>Schedules</h2><div class="empty"><b>No courses selected.</b><span>Choose Add next to a pathway course, or add any other course offered this term.</span></div>`;adv.hidden=true;return}
  if(out.blocked.length){box.innerHTML=`<h2>Schedules</h2><div class="empty"><b>No schedule fits yet.</b><ul>${out.blocked.map(blockedMsg).join("")}</ul><span>Free up some hours, include full sections, loosen the format or campus setting, or remove the course.</span></div>`;adv.hidden=true;return}
  if(!R.length){box.innerHTML=`<h2>Schedules</h2><div class="empty"><b>No conflict-free combination.</b><span>Each course has sections that fit your week, but they overlap with each other. Try freeing more hours or dropping one course.</span></div>`;adv.hidden=true;return}
  adv.hidden=false;
  const r=R[Math.min(state.active,R.length-1)];
  const tabs=R.map((x,i)=>`<button class="tab" role="tab" aria-selected="${i===state.active}" data-i="${i}"><b>Option ${"ABCDE"[i]}</b><span>score ${x.score} · ${x.days.length} day${x.days.length===1?"":"s"}</span></button>`).join("");
  const pills=[`<span class="pill ${r.days.length<=3?"good":""}">${r.days.length} days on campus</span>`,
    `<span class="pill ${r.gap/60>3?"warn":""}">${(r.gap/60).toFixed(1)} h of gaps / week</span>`,
    r.switches.length?`<span class="pill warn">Campus switch</span>`:"",r.full?`<span class="pill warn">${r.full} waitlisted</span>`:"",
    r.prefer?`<span class="pill good">${r.prefer} preferred professor${r.prefer>1?"s":""}</span>`:""].join("");
  const PX=0.8,top=H0*60,hgt=(H1*60-top)*PX;
  let cal=`<div class="cal" style="grid-template-rows:auto ${hgt}px"><div></div>${DAYS.map(d=>`<div class="dh">${DAYNAME[d]}</div>`).join("")}`;
  cal+=`<div class="tcol">${Array.from({length:H1-H0},(_,i)=>`<div style="top:${i*60*PX}px">${fmt((H0+i)*60)}</div>`).join("")}</div>`;
  for(const d of DAYS){
    cal+=`<div class="day" style="background-size:100% ${60*PX}px">`;
    for(let h=H0;h<H1;h++)if(state.busy.has(d+h))cal+=`<div class="bz" style="top:${(h*60-top)*PX}px;height:${60*PX}px"></div>`;
    for(const s of r.secs)for(const m of s.meets)if(m.days.includes(d)){
      const type=m.type&&m.type!=="Lecture"?" "+m.type:"";
      cal+=`<div class="blk${E.isHalf(m)?" half":""}" style="--cc:${colorOf[s.course]};top:${(m.s-top)*PX}px;height:${Math.max(18,(m.e-m.s)*PX)}px" title="${esc(s.course+type+" "+fmt(m.s)+"–"+fmt(m.e)+" "+(m.where||""))}"><b>${esc(s.course)}${esc(type)}</b><span>${fmt(m.s)}–${fmt(m.e)}${E.isHalf(m)?" · "+md(m.d0)+"–"+md(m.d1):""}</span><span>${esc(m.where||CAMPUS[s.campus])}</span></div>`;
    }
    cal+=`</div>`;
  }
  cal+=`</div>`;
  const onl=r.secs.filter(s=>!s.meets.length);
  const rows=r.secs.slice().sort((a,b)=>a.course.localeCompare(b.course)).map(s=>{
    const profs=s.profs.map(n=>n==="Staff"?`<span class="small">Staff (not yet assigned)</span>`:
      `<span><a href="${rmp(n)}" target="_blank" rel="noopener">${esc(n)}</a><span class="row"><button class="tog pref" data-p="${esc(n)}" data-v="prefer" aria-pressed="${state.prof[n]==="prefer"}">Prefer</button><button class="tog avoid" data-p="${esc(n)}" data-v="avoid" aria-pressed="${state.prof[n]==="avoid"}">Avoid</button></span></span>`).join("");
    const meets=s.meets.length?s.meets.map(m=>`<span class="m">${m.days.join("")} ${fmt(m.s)}–${fmt(m.e)}${m.type&&m.type!=="Lecture"?` <i>${esc(m.type)}</i>`:""}${m.where?` <i>· ${esc(m.where)}</i>`:""}${E.isHalf(m)?` <i>· ${md(m.d0)}–${md(m.d1)}</i>`:""}</span>`).join(""):`<span class="m">No set meeting time</span>`;
    const alts=s.alts&&s.alts.length?`<span class="small">Same time: CRN ${s.alts.map(a=>a.crn).join(", ")}</span>`:"";
    return`<tr style="--cc:${colorOf[s.course]}"><td class="mono">${s.crn}${alts?"<br>"+alts:""}</td><td><span class="sw"></span>${esc(s.course)}<span class="small"> · sec ${esc(s.sec)}</span><br><span class="small">${esc(title(s.course))}</span></td><td><div class="prof">${profs}</div></td><td>${meets}</td><td>${CAMPUS[s.campus]}<br><span class="small">${esc(s.method)} · </span><span class="small ${s.seats<=0?"seats0":""}">${s.seats>0?s.seats+" of "+s.cap+" seats":"Full · "+s.wait+" waitlist spots"}</span></td></tr>`}).join("");
  const crns=r.secs.map(s=>s.crn).join(", ");
  // backups: same-time sections first, then other sections that still fit your week and the rest of this schedule
  const st={busy:state.busy,prefs:state.prefs,prof:state.prof};
  const backs=r.secs.slice().sort((a,b)=>a.course.localeCompare(b.course)).map(s=>{
    const others=r.secs.filter(o=>o!==s),same=(s.alts||[]).map(a=>({crn:a.crn,seats:a.seats,same:true}));
    const taken=new Set([s.crn,...same.map(a=>a.crn)]);
    const diff=(E.byCourse[s.course]||[]).filter(x=>!taken.has(x.crn)&&x.seats>0&&!E.passes(x,{...st,prefs:{...st.prefs,full:false}})&&!others.some(o=>E.conflict(o,x)))
      .sort((a,b)=>b.seats-a.seats).slice(0,Math.max(0,3-same.length)).map(x=>({crn:x.crn,seats:x.seats,when:x.meets.length?x.meets.map(m=>m.days.join("")+" "+fmt(m.s)).join(", "):"online",prof:x.profs[0]}));
    return{s,list:[...same.filter(a=>a.seats>0),...diff].slice(0,3)};
  });
  const regText=`${D.termName} registration\nMain CRNs: ${crns}\n`+backs.map(b=>`${b.s.course} ${b.s.crn}${b.list.length?" · backups: "+b.list.map(x=>x.crn).join(", "):" · no backup fits"}`).join("\n");
  box.innerHTML=`<h2>Schedules <small>${out.found.toLocaleString()} valid combination${out.found===1?"":"s"}${out.truncated?" (search stopped early; best shown)":""} · top ${R.length} distinct shown</small></h2>
   <div class="tabs" role="tablist">${tabs}</div>
   <div class="summary">${pills}</div>
   <div class="calwrap">${cal}</div>
   ${onl.length?`<p class="online">Online, no set time: ${onl.map(s=>esc(s.course)).join(", ")}</p>`:""}
   <ul class="why">${why(r).map(w=>`<li>${esc(w)}</li>`).join("")}</ul>
   <div class="tablewrap"><table><thead><tr><th>CRN</th><th>Course</th><th>Professor</th><th>Meets</th><th>Campus &amp; seats</th></tr></thead><tbody>${rows}</tbody></table></div>
   <div class="reg">
     <h3>Registration day · Option ${"ABCDE"[state.active]}</h3>
     <ol class="steps">
       <li>Find your time ticket: Owl Express → Registration → Prepare for Registration. Registration opens at 8:00 a.m. on your ticket date.</li>
       <li>Seat counts here refresh automatically about once a day (last update: ${esc(D.fetched)}), so check seats in Owl Express too.</li>
       <li>When your window opens: Register for Classes → pick ${esc(D.termName)} → Enter CRNs. Paste the main CRNs below and submit.</li>
       <li>If a section is full or closed, swap in a backup from the table. Backups are chosen so they still fit your week and the rest of this schedule.</li>
     </ol>
     <label class="f" for="crnBox">Main CRNs
       <span class="crns"><input id="crnBox" readonly value="${crns}"><button class="btn ghost" id="copyCrn">Copy</button></span></label>
     <div class="tablewrap"><table class="bk"><thead><tr><th>Course</th><th>Main CRN</th><th>Backups if it's full</th></tr></thead><tbody>
       ${backs.map(b=>`<tr><td>${esc(b.s.course)}</td><td class="mono">${b.s.crn}${b.s.seats<=0?' <span class="seats0">full</span>':""}</td><td>${b.list.length?b.list.map(x=>`<span class="m"><span class="mono">${x.crn}</span> <i>· ${x.same?"same time":esc(x.when)} · ${x.seats} seats${x.prof&&!x.same?" · "+esc(x.prof):""}</i></span>`).join(""):`<span class="small">No other open section fits around this schedule.</span>`}</td></tr>`).join("")}
     </tbody></table></div>
     <div class="row"><button class="btn ghost" id="copyReg">Copy CRNs and backups</button><span class="status" id="regStatus"></span></div>
   </div>
   <div class="engine"><span>Labs added automatically</span><span>Kennesaw↔Marietta buffer ${E.TRAVEL} min</span><span>Seat counts as of ${esc(D.fetched)}</span></div>`;
  box.querySelectorAll(".tab").forEach(t=>t.onclick=()=>{state.active=+t.dataset.i;renderResults()});
  box.querySelectorAll(".tog[data-p]").forEach(b=>b.onclick=()=>{const n=b.dataset.p,v=b.dataset.v;state.prof[n]===v?delete state.prof[n]:state.prof[n]=v;solveAndRender(true)});
  $("copyReg").onclick=async()=>{try{await navigator.clipboard.writeText(regText);$("regStatus").textContent="Copied. Paste it into your notes for registration day."}catch{$("regStatus").textContent="Copy didn't work here. Select the CRNs above instead."}};
  $("copyCrn").onclick=async()=>{const b=$("copyCrn");try{await navigator.clipboard.writeText(crns);b.textContent="Copied"}catch{$("crnBox").select();b.textContent="Selected"}setTimeout(()=>b.textContent="Copy",1500)};
}
function solveAndRender(keepTab){
  state.out=E.solve({courses:[...state.selected],busy:state.busy,prefs:state.prefs,prof:state.prof});
  if(!keepTab)state.active=0;
  renderResults();renderProfList();persist();
}
function update(){renderCourses();solveAndRender()}

/* ---------- AI layer ---------- */
let sample=null;
const aiErr=c=>({rate_limited:"Too many AI requests right now. Try again later.",invalid_json:"The reply didn't come back in a usable shape. Try rephrasing.",sampling_disabled:"AI features are turned off on this server."}[c]||"Something went wrong reaching the AI. Try again.");
function hideAI(){$("aiPanel").hidden=true;$("advGo").hidden=true;$("advStatus").textContent="AI features are turned off on this server."}
$("aiGo").onclick=async()=>{
  const text=$("aiText").value.trim();if(!text){$("aiStatus").textContent="Type a sentence or two about your week first.";return}
  if(!sample)return;
  $("aiGo").disabled=true;$("aiStatus").textContent="Reading your description…";
  const catalog=Object.keys(D.titles).filter(c=>!c.endsWith("L")).map(c=>`${c}: ${title(c)}`).join("; ");
  const prompt=`You turn a Kennesaw State University student's plain-English description into settings for a schedule planner.
Courses offered in ${D.termName} (code: title): ${catalog}
Days use letters M T W R F (R = Thursday). Busy time is in whole hours from 8 to 22 (24h clock).
Majors the planner knows: ${Object.entries(MAJORS).map(([k,m])=>k+" = "+m.name).join("; ")}.
Current planner state: ${JSON.stringify({major:state.major,creditTarget:state.target,completed:[...state.completed],planned:[...state.selected],busyHours:[...state.busy].sort(),prefs:state.prefs})}
Student says: """${text.slice(0,2000)}"""
Reply with only JSON in this shape:
{"major":"cs"|"swe"|"it"|"arch"|null, "creditTarget":12-18 or null, "buildTerm":true|false, "replaceBusy": true|false, "busy":[{"days":"TR","start":8,"end":12}], "completed":["CODE"] or null, "courses":["CODE"] or null, "prefs":{"noEarly":bool|null,"noLate":bool|null,"compact":bool|null,"full":bool|null,"format":"any"|"prefer-in"|"prefer-online"|"in"|"online"|null,"campus":"any"|"K"|"M"|null}, "reply":"one or two sentences telling the student what you set"}
Rules: set replaceBusy true only if the student describes their whole week's commitments. Use null for anything not mentioned. "completed" lists every course they say they've passed, using standard KSU codes. Set buildTerm true when they want the planner to choose their courses (for example "what should I take next?") and leave "courses" null; otherwise "courses" lists courses they name to take this term, only codes from the list above; labs are added automatically, so leave them out. A day the student can't attend at all becomes busy 8 to 22. campus K = Kennesaw, M = Marietta.`;
  try{
    const j=await sample.json(prompt,{modelTier:"quick"});
    if(j.replaceBusy)state.busy.clear();
    for(const b of j.busy||[]){const s=Math.max(H0,Math.floor(+b.start)),e=Math.min(H1,Math.ceil(+b.end));
      for(const d of String(b.days||"").toUpperCase())if(DAYS.includes(d))for(let h=s;h<e;h++)state.busy.add(d+h)}
    if(Array.isArray(j.completed))state.completed=new Set(j.completed.map(String));
    if(MAJORS[j.major]){state.major=j.major;openGroups=null}
    if(Number.isInteger(j.creditTarget)&&j.creditTarget>=12&&j.creditTarget<=18)state.target=j.creditTarget;
    if(Array.isArray(j.courses))state.selected=new Set(j.courses.map(String).filter(c=>D.titles[c]&&!state.completed.has(c)));
    const p=j.prefs||{};
    for(const k of ["noEarly","noLate","compact","full"])if(typeof p[k]==="boolean")state.prefs[k]=p[k];
    if(["any","prefer-in","prefer-online","in","online"].includes(p.format))state.prefs.format=p.format;
    if(["any","K","M"].includes(p.campus))state.prefs.campus=p.campus;
    if(j.buildTerm||(MAJORS[j.major]&&!Array.isArray(j.courses)))buildTerm();
    syncPrefs();renderAvail();update();
    $("aiStatus").textContent=String(j.reply||"Updated the form.");
  }catch(e){
    $("aiStatus").textContent=aiErr(e&&e.code);
    if(e&&(e.code==="not_granted"||e.code==="sampling_disabled"))hideAI();
  }finally{$("aiGo").disabled=false}
};
let advCtl=null;
$("advStop").onclick=()=>advCtl?.abort();
$("advGo").onclick=async()=>{
  const R=state.out&&state.out.results;if(!sample||!R||!R.length)return;
  advCtl=new AbortController();$("advGo").disabled=true;$("advStop").hidden=false;$("advStatus").textContent="Thinking…";$("advOut").textContent="";
  const opts=R.map((r,i)=>`Option ${"ABCDE"[i]} (score ${r.score}): `+r.secs.map(s=>`${s.course} (${title(s.course)}) with ${s.profs.join(" & ")}, ${s.meets.length?s.meets.map(m=>m.days.join("")+" "+fmt(m.s)+"-"+fmt(m.e)+(m.type&&m.type!=="Lecture"?" "+m.type:"")+(E.isHalf(m)?" ("+md(m.d0)+"-"+md(m.d1)+" only)":"")).join(" + "):"online, no set time"}, ${CAMPUS[s.campus]}, ${s.method}, ${s.seats>0?s.seats+" seats left":"FULL (waitlist)"}`).join("; ")+`. Facts: ${why(r).join(" ")}`).join("\n");
  const prompt=`You are a friendly academic advisor at Kennesaw State University. A ${major().name} student built these ${D.termName} schedule options from real KSU class sections. They have ${progress(major()).have} of ${progress(major()).need} major-sheet requirements done. Their preferences: ${JSON.stringify(state.prefs)}. Busy hours: ${[...state.busy].sort().join(" ")||"none"}. Professors they marked: ${JSON.stringify(state.prof)}.
${opts}
Write a short comparison (under 180 words, plain text, no markdown headers): which option you'd pick for this student and why, the main tradeoff against the runner-up, and one practical tip (for example about the Kennesaw–Marietta shuttle, a long gap, an early class, a section with few seats left, or a waitlist). You have no professor ratings; don't describe any professor's teaching. Suggest checking Rate My Professors if instructors matter to them.`;
  try{
    await sample(prompt,{signal:advCtl.signal,onText:({text})=>{$("advOut").textContent=text;$("advStatus").textContent=""}});
    $("advStatus").textContent="";
  }catch(e){
    if(e&&e.text)$("advOut").textContent=e.text;
    $("advStatus").textContent=e?.code==="cancelled"?"Stopped.":aiErr(e&&e.code);
    if(e&&(e.code==="not_granted"||e.code==="sampling_disabled"))hideAI();
  }finally{$("advGo").disabled=false;$("advStop").hidden=true}
};

/* ---------- boot ---------- */
if(!state.built)buildTerm();
syncPrefs();renderAvail();update();
$("aiGo").disabled=true;$("advGo").disabled=true;$("aiStatus").textContent="Connecting…";
(async()=>{
  try{const r=await fetch("/api/ai/status");sample=(await r.json()).enabled?serverAI():null}catch{sample=null}
  if(sample){$("aiGo").disabled=false;$("advGo").disabled=false;$("aiStatus").textContent=""}
  else{$("aiStatus").textContent="";hideAI()}
})();
}

// AI calls go to this site's server, which holds the API key.
function serverAI(){
  async function call(kind,prompt,opts={}){
    let r;
    try{r=await fetch("/api/ai",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind,prompt}),signal:opts.signal})}
    catch(e){throw{code:e.name==="AbortError"?"cancelled":"upstream_error"}}
    if(!r.ok){let j={};try{j=await r.json()}catch{}throw{code:j.code||"upstream_error",text:j.text}}
    if(kind==="json")return r.json();
    const rd=r.body.getReader(),dec=new TextDecoder();let text="";
    try{for(;;){const{done,value}=await rd.read();if(done)break;const delta=dec.decode(value,{stream:true});if(delta){text+=delta;opts.onText&&opts.onText({text,delta})}}}
    catch(e){throw{code:e.name==="AbortError"?"cancelled":"upstream_error",text}}
    if(!text.trim())throw{code:"empty_completion"};
    return{text,truncated:false};
  }
  const f=(prompt,opts)=>call("text",prompt,opts);
  f.json=(prompt,opts)=>call("json",prompt,opts);
  return f;
}

// Load class data from the server (the offline copy is used when there's no connection).
(async function boot(){
  const msg=document.getElementById("loadingMsg");
  try{
    const r=await fetch("/api/data");
    if(!r.ok){let j={};try{j=await r.json()}catch{}throw new Error(j.error||"The server didn't send class data.")}
    const D=await r.json();
    document.getElementById("loading").hidden=true;document.getElementById("app").hidden=false;
    startPlanner(D);
  }catch(e){msg.textContent=(e&&e.message&&!/fetch/i.test(e.message)?e.message:"Couldn't reach the planner's server. Check your connection and reload.")}
})();
if("serviceWorker" in navigator)window.addEventListener("load",()=>navigator.serviceWorker.register("/sw.js").catch(()=>{}));
