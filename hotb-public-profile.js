/* Public, read-only HotB profile view for Rebels Scout.
   Firestore /recruitingProfiles contains only public aggregate statistics and
   verified athletic bests; never reads coach backups or player portals. */
(async function(){
 const slug=location.pathname.split('/').filter(Boolean)[0];
 if(!slug||!document.querySelector('.page'))return;
 const root='https://firestore.googleapis.com/v1/projects/hotb-kc-rebels/databases/(default)/documents/recruitingProfiles/';
 const decode=v=>{
  if(v==null)return null;
  if('integerValue'in v)return Number(v.integerValue);
  if('doubleValue'in v)return Number(v.doubleValue);
  if('stringValue'in v)return v.stringValue;
  if('timestampValue'in v)return v.timestampValue;
  if('booleanValue'in v)return v.booleanValue;
  if('mapValue'in v)return Object.fromEntries(Object.entries(v.mapValue.fields||{}).map(([k,item])=>[k,decode(item)]));
  if('arrayValue'in v)return(v.arrayValue.values||[]).map(decode);
  return null;
 };
 const labeled=(n,digits=0)=>Number.isFinite(n)?(n*100).toFixed(digits).replace(/\.0$/,'')+'%':null;
 const avg=n=>Number.isFinite(n)?n.toFixed(3).replace(/^0/,''):null;
 const athleticArticle=Array.from(document.querySelectorAll('article')).find(a=>a.querySelector('h2')?.textContent?.trim()==='Current Athletic Bests');
 const hittingBlock=Array.from(document.querySelectorAll('.sport-block')).find(b=>b.querySelector('.sport-title h3')?.textContent?.trim()==='Hitting');
 const note=document.querySelector('.data-note');
 const historical=()=>{
  const existing=document.querySelector('.performance-head .live-status');
  if(existing)existing.textContent='Historical snapshot — not synchronized';
  if(note)note.textContent='Historical HotB snapshot. Live statistics have not yet been verified on this profile.';
  if(athleticArticle&&!athleticArticle.querySelector('[data-hotb-sync-note]')){
   const p=document.createElement('p');p.className='source-line';p.dataset.hotbSyncNote='pending';
   p.textContent='Historical Scout measurements. HotB is the source for future updates once synchronization is confirmed.';
   athleticArticle.appendChild(p);
  }
 };
 try{
  const response=await fetch(root+encodeURIComponent(slug),{cache:'no-store'});
  if(!response.ok)throw Error('HotB public profile not ready ('+response.status+')');
  const documentJson=await response.json();
  const d=Object.fromEntries(Object.entries(documentJson.fields||{}).map(([k,v])=>[k,decode(v)]));
  if(d.source!=='HotB'||d.status!=='published'||typeof d.playerName!=='string'||!d.playerName.trim())throw Error('Public profile not validated');
  const when=documentJson.updateTime?new Date(documentJson.updateTime):null;
  const stamp=when&&!Number.isNaN(when.valueOf())?when.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'recently';
  const stat=(key,value)=>{if(value===null)return;const el=hittingBlock?.querySelector('[data-metric="'+key+'"] strong');if(el)el.textContent=value};
  if(Number.isFinite(d.PA)&&d.PA>0){
   const pa=hittingBlock?.querySelector('[data-hit="PA"]');if(pa)pa.textContent=String(d.PA);
   stat('decision',labeled(d.decisionPct));
   stat('hhb',labeled(d.hhbPct));
   const aba=hittingBlock?.querySelector('[data-metric="aba"]');
   if(aba){
    const first=labeled(d.abaFirstPct),two=labeled(d.abaTwoPct);
    if(first!==null||two!==null){
     const strong=aba.querySelector('strong');
     if(strong){strong.textContent='';const span=document.createElement('span');span.style.fontSize='.7em';span.append(document.createTextNode('1P '+(first||'—')),document.createElement('br'),document.createTextNode('2K '+(two||'—')));strong.appendChild(span)}
    }else{
     const label=aba.querySelector('span');if(label)label.textContent='ABA (Historical)';
    }
   }
   for(const [key,formatted] of [['AVG',avg(d.AVG)],['OBP',avg(d.OBP)],['K%',labeled(d.kPct)]]){
    const tile=Array.from(hittingBlock?.querySelectorAll('.scout-hit-tile')||[]).find(e=>e.querySelector('span')?.textContent?.trim()===key);
    if(tile?.querySelector('strong')&&formatted!==null)tile.querySelector('strong').textContent=formatted;
   }
   const status=document.querySelector('.performance-head .live-status');if(status)status.textContent='HotB published · '+stamp;
   const asof=document.querySelector('.performance-head .asof');if(asof)asof.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent='';});
   const asofDate=d.statsAsOf?new Date(d.statsAsOf):null;
   const gameThrough=asofDate&&!Number.isNaN(asofDate.valueOf())?' · Games through '+asofDate.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'';
   if(note)note.textContent='HotB verified public hitting totals · '+d.season+gameThrough+' · published '+stamp+'. Scrimmages excluded.';
   // Intercept historical pitch-breakdown popups; use only the matching HotB
   // published breakdown or a clear current-total message.
   for(const key of ['decision','aba','hhb']){
    const tile=hittingBlock?.querySelector('[data-metric="'+key+'"]');if(!tile)continue;
    const details=()=>{
     const pct=n=>labeled(n)||'Not available';
     if(key==='decision'){
      const b=d.decisionBreakdown;return b?'Decision Quality '+pct(d.decisionPct)+' · '+b.attempts+' scored decisions\\nGood '+b.GOOD+' · Minor '+b.MINOR+' · Poor '+b.POOR+' · Not scored '+b.NOT_SCORED:'Decision Quality '+pct(d.decisionPct)+' · No detailed HotB breakdown published';
     }
     if(key==='aba'){
      const b1=d.abaFirstBreakdown,b2=d.abaTwoBreakdown;
      return 'First-pitch ABA '+pct(d.abaFirstPct)+(b1?' · '+b1.n+' scored ('+b1.GOOD+' good, '+b1.MINOR+' minor, '+b1.POOR+' poor)':'')+'\\nTwo-strike ABA '+pct(d.abaTwoPct)+(b2?' · '+b2.n+' scored ('+b2.GOOD+' good, '+b2.MINOR+' minor, '+b2.POOR+' poor)':'');
     }
     return 'Hard-hit-ball percentage '+pct(d.hhbPct)+' · Calculated by HotB for the published season.';
    };
    tile.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();alert(details());},true);
    tile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();alert(details())}},true);
   }
  }else{
   const status=document.querySelector('.performance-head .live-status');if(status)status.textContent='Historical snapshot — no current HotB game statistics';
   if(note)note.textContent='Historical hitting figures; no current-season aggregate has yet been published by HotB.';
  }
  // Pitching numbers are coach-managed/imported inside HotB. When those
  // values exist they replace the old static Scout GameChanger figures.
  const pitchingBlock=Array.from(document.querySelectorAll('.sport-block')).find(b=>b.querySelector('.sport-title h3')?.textContent?.trim()==='Pitching');
  if(pitchingBlock){
   const p=d.pitching&&typeof d.pitching==='object'?d.pitching:{};
   const keys=Object.keys(p);
   const pitchTitle=pitchingBlock.querySelector('.sport-title span');
   if(keys.length){
    for(const card of pitchingBlock.querySelectorAll('.stat')){
     const label=card.querySelector('span')?.textContent?.trim();
     const out=card.querySelector('strong');
     if(label&&out&&Object.prototype.hasOwnProperty.call(p,label))out.textContent=String(p[label]);
     else if(out)out.textContent='—';
    }
    if(pitchTitle)pitchTitle.textContent='GameChanger · published through HotB';
   }else{
    if(pitchTitle)pitchTitle.textContent='GameChanger · historical snapshot (not synced)';
   }
  }
  if(athleticArticle){
   const bests=d.athleticBests&&typeof d.athleticBests==='object'?d.athleticBests:{};
   const names=Object.keys(bests).filter(type=>Number.isFinite(bests[type]?.value));
   const old=athleticArticle.querySelector('.measurements');
   const oldNote=athleticArticle.querySelector('.source-line');
   if(old)old.remove();
   if(oldNote)oldNote.remove();
   const existing=athleticArticle.querySelector('[data-hotb-sync-note]');if(existing)existing.remove();
   if(names.length){
    const grid=document.createElement('div');grid.className='measurements';grid.dataset.source='hotb';
    const order=['Home to First','Overhand Throw','Exit Velocity','Broad Jump','Fastball','Changeup','Pop Time'];
    names.sort((a,b)=>order.indexOf(a)-order.indexOf(b));
    for(const type of names){
     const rec=bests[type],tile=document.createElement('div');tile.className='measurement';
     const title=document.createElement('span');title.textContent=type.toUpperCase();
     const value=document.createElement('strong');
     const n=rec.value;
     value.textContent=type==='Home to First'||type==='Pop Time'?n.toFixed(2)+' sec':type==='Broad Jump'?String(n):n+' mph';
     const verified=document.createElement('span');verified.className='verified-date';
     const date=new Date(rec.date+'T12:00:00');
     verified.textContent=(slug==='brooklyn-gering'&&rec.source==='Rebels Scout'&&rec.date==='2026-08-01')?'Recorded Aug 2026':(rec.date&&!Number.isNaN(date.valueOf())?'Recorded '+date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Recorded in HotB');
     tile.append(title,value,verified);grid.appendChild(tile);
    }
    athleticArticle.appendChild(grid);
   }else{
    const empty=document.createElement('p');empty.className='source-line';
    empty.textContent='No athletic measurements recorded in HotB yet.';
    athleticArticle.appendChild(empty);
   }
   const line=document.createElement('p');line.className='source-line';
   line.textContent='Athletic bests synchronized from HotB · '+stamp;
   athleticArticle.appendChild(line);
  }
 }catch(error){console.info('Rebels Scout profile awaiting HotB public sync:',error.message);historical()}
})();
