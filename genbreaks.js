// Standalone break-schedule tools extracted verbatim from Ahmed's original site
// (github.com/bvtndv78v4-prog/Breaks index.html, fetched 2026-11-24).
// Usage (Node 18+):
//   import { rosterFrom, parseSched, genBreaks } from './genbreaks.mjs';
//   // rows = array of arrays from the xlsx/csv he sends (first row = header)
//   const roster = rosterFrom(rows);            // shifts file -> [name, hr, in, out, group]
//   const sched  = parseSched(rows, filename);  // BreakSchedule file -> {date, r:[time,group,name,duration]}
//   const gen    = genBreaks(roster.filter(r=>r[2]&&r[3]).map(r=>({n:r[0],g:r[4],a:r[2],b:r[3]})));
//   // gen.rows -> [time, group, name, duration('' = 15 min)]
// Error strings were UI-translated in the original (_t); here they are plain English.

const _t = (k) => k; // original showed localized messages

const nz=s=>String(s||'').toLowerCase().replace(/[\u064B-\u0652\u0640]/g,'').replace(/[أإآٱ]/g,'ا').replace(/ة/g,'ه').replace(/ى/g,'ي').replace(/[٠-٩]/g,d=>d.charCodeAt(0)-1632).replace(/\s+/g,' ');
const tm=s=>{if(typeof s==='number'&&s>0&&s<1){const t=Math.round(s*1440);return String(t/60|0).padStart(2,'0')+':'+String(t%60).padStart(2,'0')}const m=/(\d{1,2}):(\d{2})/.exec(String(s??''));return m?m[1].padStart(2,'0')+':'+m[2]:''};
const mm=t=>{const [h,m]=t.split(':');return +h*60+ +m};
const MINB=555,MAXB=1425;
function planOf(h){const m=Math.round(h*60);if(m<120)return[];if(m<240)return[m>=180?10:5];const q=Math.floor(m/240),rem=m-q*240;const pl=Array(q).fill(15);if(rem>=180)pl.push(10);else if(rem>=120)pl.push(5);return pl}
function genBreaks(L){
  const EX=new Set(['wa','allianz']),GI=new Map(),A=[],relaxed=[];let base=1e9,skip=0;
  L.forEach(p=>{
    const s=mm(p.a),len=(mm(p.b)-s+1440)%1440;if(!len)return;
    base=Math.min(base,s);
    const pl=planOf(len/60);if(!pl.length){skip++;return}
    const mk=(mg,bd)=>{const cb=[],rec=(i,prev,acc)=>{if(i===pl.length){cb.push(acc.slice());return}
      for(let r=prev+135;r<=prev+mg;r+=15){const T=s+r;if(T%15||r+pl[i]>len||(bd&&(T<MINB||T>MAXB)))continue;acc.push(T);rec(i+1,r,acc);acc.pop()}};rec(0,0,[]);return cb};
    let cb=mk(210,true),rx=0;
    if(!cb.length){cb=mk(330,true);rx=1}
    if(!cb.length){cb=mk(210,false);rx=2}
    if(!cb.length){cb=mk(330,false);rx=2}
    if(!cb.length&&pl.length===1){const T0=Math.round((s+len/2-pl[0]/2)/15)*15,r0=T0-s;if(r0>0&&r0+pl[0]<=len&&T0%15===0){cb=[[T0]];rx=(T0>=MINB&&T0<=MAXB)?0:2}}
    if(!cb.length){skip++;return}
    if(rx)relaxed.push(p.n);
    const gk=nz(p.g);if(!GI.has(gk))GI.set(gk,GI.size);
    A.push({n:p.n,g:p.g||'',s,pl,cb,gi:GI.get(gk),ex:EX.has(gk),pick:null});
  });
  const TB=[0,0,10,110,600,2000],cf=(ex,c)=>ex?(c>1?1000*(c-1):0):(c<TB.length?TB[c]:2000+500*(c-5)),NG=GI.size||1;
  const exg=new Array(NG).fill(false);A.forEach(a=>{exg[a.gi]=a.ex});
  function solve(sd){
    let z=sd*7919>>>0;const rnd=()=>{z=(z+0x6D2B79F5)>>>0;let t=z;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296};
    const cnt=new Int16Array(NG*256);
    const cst=(a,c)=>{let tot=0,prev=a.s;for(const T of c){const i=a.gi*256+(T/15|0),k=cnt[i];tot+=cf(a.ex,k+1)-cf(a.ex,k)+0.02*Math.abs(T-prev-180)/15+(T-prev>210?5*(T-prev-210)/15:0);prev=T}return tot};
    const put=(a,c,d)=>{for(const T of c)cnt[a.gi*256+(T/15|0)]+=d};
    const best=(a,noise)=>{let bc=null,bv=1e18;for(const c of a.cb){const v=cst(a,c)+rnd()*noise;if(v<bv){bv=v;bc=c}}return bc};
    [...A].sort((x,y)=>x.cb.length-y.cb.length).forEach(a=>{a.pick=best(a,1e-6);put(a,a.pick,1)});
    for(let it=0;it<80;it++){
      let ch=0;const o=[...A];for(let i=o.length-1;i>0;i--){const j=Math.floor(rnd()*(i+1));[o[i],o[j]]=[o[j],o[i]]}
      for(const a of o){put(a,a.pick,-1);const b=best(a,1e-3);if(b!==a.pick)ch++;a.pick=b;put(a,b,1)}
      if(!ch)break;
    }
    let cost=0;for(let g=0;g<NG;g++)for(let k=0;k<256;k++)cost+=cf(exg[g],cnt[g*256+k]);
    return{cost,picks:A.map(a=>a.pick),cnt};
  }
  let B=null;for(let sd=1;sd<=16;sd++){const r=solve(sd);if(!B||r.cost<B.cost)B=r}
  const rows=[];
  A.forEach((a,i)=>B.picks[i].forEach((T,j)=>rows.push([T,a.g,a.n,a.pl[j]===15?'':String(a.pl[j])])));
  rows.sort((x,y)=>x[0]-y[0]||String(x[1]).localeCompare(y[1])||x[2].localeCompare(y[2]));
  let ex=0,h2=0,h3=0;
  for(let g=0;g<NG;g++)for(let k=0;k<256;k++){const c=B.cnt[g*256+k];if(exg[g]){if(c>1)ex++}else if(c===2)h2++;else if(c>2)h3++}
  const f=T=>String((T%1440)/60|0).padStart(2,'0')+':'+String(T%60).padStart(2,'0');
  return{rows:rows.map(r=>[f(r[0]),r[1],r[2],r[3]]),base:base===1e9?0:base,n:A.length,skip,ex,h2,h3,relaxed};
}
function rosterFrom(rows){
  const hi=rows.findIndex(r=>r.some(c=>String(c).trim()));if(hi<0)throw new Error(_t('errEmpty'));
  const H=rows[hi].map(nz),fi=re=>H.findIndex(h=>h&&re.test(h));
  const ci={n:fi(/^name|اسم|^agent|employee name|موظف/),h:fi(/(^|[^a-z])hr([^a-z]|$)|code|كود|رقم|employee id|^id$/),i:fi(/^in(\s|$)|دخول|بدايه|start/),o:fi(/^out(\s|$)|خروج|نهايه|end/),g:fi(/group|مجموع|قسم|team|project/)};
  if(ci.n<0)throw new Error(_t('errName'));
  const out=[];
  rows.slice(hi+1).forEach(r=>{
    const g=k=>ci[k]>=0?String(r[ci[k]]??'').trim().replace(/\s+/g,' '):'';
    const n=g('n');if(!n)return;
    let a=ci.i>=0?tm(r[ci.i]):'',b=ci.o>=0?tm(r[ci.o]):'';
    if(!a||!b){const m=/(\d{1,2}:\d{2})\s*[-\u2013\u2014]\s*(\d{1,2}:\d{2})/.exec(r.join(' '));if(m){a=tm(m[1]);b=tm(m[2])}}
    out.push([n,g('h'),a,b,g('g')]);
  });
  return out;
}
function parseSched(rows,fname){
  const isH=c=>/^break\s*time$/i.test(String(c).trim()),hi=rows.findIndex(r=>r.some(isH));
  if(hi<0)throw new Error(_t('errHdr'));
  const H=rows[hi].map(c=>String(c).trim()),blocks=[];
  H.forEach((h,i)=>{if(isH(h)){const gs=[];for(let j=i+1;j<H.length&&H[j]&&!isH(H[j]);j++)gs.push([j,H[j]]);blocks.push([i,gs])}});
  const out=[];
  rows.slice(hi+1).forEach(r=>blocks.forEach(([ti,gs])=>{
    const t=tm(r[ti]);if(!t)return;
    gs.forEach(([j,g])=>String(r[j]??'').split('+').forEach(p=>{p=p.trim();if(!p)return;const m=/^(.*?)\s*\((\d+)\s*m\)$/i.exec(p);out.push([t,g,(m?m[1]:p).trim().replace(/\s+/g,' '),m?m[2]:''])}));
  }));
  const dm=/\d{4}-\d{2}-\d{2}/.exec(rows.slice(0,hi).flat().join(' '))||/\d{4}-\d{2}-\d{2}/.exec(fname||'');
  let dt=dm?dm[0]:'';if(!dt){const nn=rows.slice(0,hi).flat().find(c=>typeof c==='number'&&c>40000);if(nn)dt=new Date(Math.round((nn-25569)*864e5)).toISOString().slice(0,10)}
  return {date:dt,r:out};
}

export { rosterFrom, parseSched, genBreaks };
