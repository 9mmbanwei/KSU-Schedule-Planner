// Scheduling engine: turns class sections + a student's constraints into ranked, conflict-free schedules.
// Pure logic with no page code, so it can be tested on its own (see tests/engine.test.mjs).
function makeEngine(D){
  "use strict";
  const PHYS=c=>c==="K"||c==="M";
  const TRAVEL=50;
  const secs=D.secs.map(a=>{const[crn,course,sec,campus,method,seats,cap,wait,pi,ms]=a;
    return{crn,course,sec,campus,method,seats,cap,wait,profs:pi.map(i=>D.people[i]),
      meets:ms.map(m=>({days:m[0].split(""),s:m[1],e:m[2],type:m[3],where:m[4],d0:D.dates[m[5]],d1:D.dates[m[6]]}))}});
  const byCourse={};for(const s of secs)(byCourse[s.course]=byCourse[s.course]||[]).push(s);
  const fullTerm={d0:null,d1:null};
  {const c={};for(const s of secs)for(const m of s.meets){const k=m.d0+"|"+m.d1;c[k]=(c[k]||0)+1}
   const top=Object.entries(c).sort((a,b)=>b[1]-a[1])[0];if(top){[fullTerm.d0,fullTerm.d1]=top[0].split("|")}}
  const isHalf=m=>m.d0!==fullTerm.d0||m.d1!==fullTerm.d1;
  const isOnline=s=>!PHYS(s.campus);
  const withLab=c=>byCourse[c+"L"]&&!c.endsWith("L")?[c,c+"L"]:[c];

  function hitsBusy(s,busy){for(const m of s.meets)for(const d of m.days)for(let h=Math.floor(m.s/60);h*60<m.e;h++)if(busy.has(d+h))return true;return false}
  function conflict(a,b){
    const buf=PHYS(a.campus)&&PHYS(b.campus)&&a.campus!==b.campus?TRAVEL:0;
    for(const x of a.meets)for(const y of b.meets){
      if(!x.days.some(d=>y.days.includes(d)))continue;
      if(x.d0&&y.d0&&(x.d1<y.d0||y.d1<x.d0))continue;
      if(x.s<y.e+buf&&y.s<x.e+buf)return true;
    }return false;
  }
  function unary(s,st){
    const p=st.prefs;let u=0;
    for(const m of s.meets){if(m.s<540)u-=p.noEarly?6:1;if(m.e>1080&&p.noLate)u-=6}
    if(p.format==="prefer-in"&&isOnline(s))u-=5;if(p.format==="prefer-online"&&!isOnline(s))u-=5;
    if(s.profs.some(n=>st.prof[n]==="prefer"))u+=8;
    if(s.seats<=0)u-=10;
    return u;
  }
  function score(pick,st){
    const p=st.prefs,byDay={};let early=0,late=0,prefer=0,full=0,online=0;
    for(const s of pick){
      if(s.profs.some(n=>st.prof[n]==="prefer"))prefer++;
      if(s.seats<=0)full++;
      if(isOnline(s))online++;
      for(const m of s.meets)for(const d of m.days){(byDay[d]=byDay[d]||[]).push({...m,campus:s.campus});if(m.s<540)early++;if(m.e>1080)late++}
    }
    let gap=0,maxGap={m:0,d:null};const switches=new Set(),campusDays=new Set();
    for(const d in byDay){
      const l=byDay[d].sort((a,b)=>a.s-b.s);
      if(l.some(m=>PHYS(m.campus)))campusDays.add(d);
      for(let i=1;i<l.length;i++){
        const g=l[i].s-l[i-1].e;if(g>0){gap+=g;if(g>maxGap.m)maxGap={m:g,d}}
        if(PHYS(l[i].campus)&&PHYS(l[i-1].campus)&&l[i].campus!==l[i-1].campus)switches.add(d);
      }
    }
    const fmtAdj=p.format==="prefer-in"?-5*online:p.format==="prefer-online"?-5*(pick.length-online):0;
    const sc=72-gap/60*3-campusDays.size*(p.compact?9:2)-switches.size*4-(p.noEarly?early*6:early)-(p.noLate?late*6:0)+prefer*8-full*10+fmtAdj;
    return{score:Math.max(1,Math.min(99,Math.round(sc))),gap,maxGap,days:[...campusDays],switches:[...switches],early,late,prefer,full,online};
  }
  function passes(s,st){
    if(s.seats<=0&&!st.prefs.full)return"full";
    if(st.prefs.format==="in"&&isOnline(s))return"format";
    if(st.prefs.format==="online"&&!isOnline(s))return"format";
    if(st.prefs.campus!=="any"&&PHYS(s.campus)&&s.campus!==st.prefs.campus)return"campus";
    if(s.profs.some(n=>st.prof[n]==="avoid"))return"avoid";
    if(hitsBusy(s,st.busy))return"busy";
    return"";
  }
  // how many sections of each course (and its lab) fit this student's week; 0 means it can't be scheduled
  function okCount(c,st){let min=Infinity;for(const x of withLab(c)){const l=byCourse[x];if(!l)return 0;min=Math.min(min,l.filter(s=>!passes(s,st)).length)}return min===Infinity?0:min}
  function solve(st,opts={}){
    const K=opts.perCourse||24,CAP=opts.cap||250000;
    const courses=[...new Set(st.courses.flatMap(withLab))].filter(c=>byCourse[c]);
    const blocked=[],cands=[];
    for(const c of courses){
      const diag={c,total:byCourse[c].length,full:0,busy:0,format:0,campus:0,avoid:0};
      const ok=[];
      for(const s of byCourse[c]){const why=passes(s,st);if(why){diag[why]++;continue}ok.push(s)}
      // collapse sections that are identical for scheduling purposes (same time, place, format, instructor)
      const groups=new Map();
      for(const s of ok){
        const k=s.campus+"|"+s.method+"|"+s.profs.join(";")+"|"+s.meets.map(m=>m.days.join("")+m.s+"-"+m.e+m.d0+m.d1).join(",");
        const g=groups.get(k);
        if(!g)groups.set(k,{...s,alts:[]});
        else if(s.seats>g.seats){groups.set(k,{...s,alts:[...g.alts,{crn:g.crn,seats:g.seats}]})}
        else g.alts.push({crn:s.crn,seats:s.seats});
      }
      const list=[...groups.values()].map(s=>({s,u:unary(s,st)})).sort((a,b)=>b.u-a.u||b.s.seats-a.s.seats).slice(0,K).map(x=>x.s);
      if(!list.length)blocked.push(diag);
      cands.push({c,secs:list,options:groups.size});
    }
    if(blocked.length||!courses.length)return{results:[],checked:0,found:0,blocked,courses,truncated:false};
    cands.sort((a,b)=>a.secs.length-b.secs.length);
    const found=[],pick=[];let visits=0,truncated=false;
    (function dfs(i){
      if(visits>CAP){truncated=true;return}
      if(i===cands.length){found.push({secs:[...pick],...score(pick,st)});return}
      for(const s of cands[i].secs){visits++;if(pick.some(q=>conflict(q,s)))continue;pick.push(s);dfs(i+1);pick.pop();if(truncated)return}
    })(0);
    found.sort((a,b)=>b.score-a.score||b.secs.reduce((t,s)=>t+s.seats,0)-a.secs.reduce((t,s)=>t+s.seats,0));
    // keep options whose weekly time pattern differs, so the five tabs are real alternatives
    const seen=new Set(),results=[];
    for(const r of found){
      const sig=r.secs.map(s=>s.course+":"+s.campus+":"+s.meets.map(m=>m.days.join("")+m.s).join(",")).sort().join("|");
      if(seen.has(sig))continue;seen.add(sig);results.push(r);if(results.length===5)break;
    }
    return{results,checked:visits,found:found.length,blocked:[],courses,truncated};
  }
  return{secs,byCourse,solve,okCount,passes,conflict,withLab,isHalf,isOnline,PHYS,fullTerm,TRAVEL};
}

if(typeof module!=="undefined")module.exports=makeEngine;
