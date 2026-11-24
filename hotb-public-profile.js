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
   for(const [key,formatted] of [['AVG',avg(d.AVG)],['OBP',avg(d.OBP)],['K%',labeled(d.kPct)]]){
    const tile=Array.from(hittingBlock?.querySelectorAll('.scout-hit-tile')||[]).find(e=>e.querySelector('span')?.textContent?.trim()===key);
    if(tile?.querySelector('strong')&&formatted!==null)tile.querySelector('strong').textContent=formatted;
   }
   const status=document.querySelector('.performance-head .live-status');if(status)status.textContent='HotB published · '+stamp;
   const asof=document.querySelector('.performance-head .asof');if(asof)asof.childNodes.forEach(n=>{if(n.nodeType===Node.TEXT_NODE)n.textContent='';});
   if(note)note.textContent='Current HotB hitting statistics · '+d.season+' · published '+stamp+'. First-pitch and two-strike ABA tiles remain historical until their HotB calculations are included in the public feed.';
   const aba=hittingBlock?.querySelector('[data-metric="aba"]');
   if(aba&&!aba.dataset.historicalLabel){
    const label=aba.querySelector('span');if(label)label.textContent='ABA (Historical)';
    aba.dataset.historicalLabel='true';
   }
   // Old Oct. 18 modal breakdowns do not describe the published totals.
   for(const key of ['decision','hhb']){
    const tile=hittingBlock?.querySelector('[data-metric="'+key+'"]');if(!tile)continue;
    tile.addEventListener('click',e=>{e.preventDefault();e.stopImmediatePropagation();alert('Current HotB total. Historical pitch-level detail is not part of the public feed.');},true);
    tile.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopImmediatePropagation();alert('Current HotB total. Historical pitch-level detail is not part of the public feed.')}},true);
   }
  }else{
   const status=document.querySelector('.performance-head .live-status');if(status)status.textContent='Historical snapshot — no current HotB game statistics';
   if(note)note.textContent='Historical hitting figures; no current-season aggregate has yet been published by HotB.';
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
     verified.textContent=rec.date&&!Number.isNaN(date.valueOf())?'Recorded '+date.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'Recorded in HotB';
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
