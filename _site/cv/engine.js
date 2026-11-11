/* The engine: everything both pages share. A page supplies its own PROJECTS map and
   CHAPTERS list and calls start(). Nothing here knows what the chapters are about.

   One number drives the whole page. stageS() turns scroll position into a continuous
   float S across the chapters; w(k) is a chapter's weight, 1 on it and 0 about two
   thirds of a chapter away. The camera, the figures, the panels and the rail all read
   that one number and nothing else. */

export const clamp=(v,a=0,b=1)=>v<a?a:v>b?b:v;
export const lerp=(a,b,t)=>a+(b-a)*t;
export const smooth=t=>t*t*(3-2*t);
const $=s=>document.querySelector(s);
const NS="http://www.w3.org/2000/svg";
const VERS=["eli5","technical","commentary"];

/* Lay the map out on real axes rather than an arrangement someone chose: x is calendar
   time, a box is as wide as the project was active, as tall as it is large (log scale,
   or directCare and netling would flatten everything else), and lanes run in order of
   first commit. Flying the camera over it then reads as the actual shape of the work. */
export const T=v=>{const[y,m,d]=v.split("-").map(Number);return y+((m-1)+((d||1)-1)/30.4)/12;};
export function layout(PROJECTS,{x0,x1,from,to,y0=44,gap=12,hMin=28,hMax=104}){
  const X=v=>x0+((T(v)-T(from))/(T(to)-T(from)))*(x1-x0);
  const keys=Object.keys(PROJECTS).sort((a,b)=>T(PROJECTS[a].from)-T(PROJECTS[b].from));
  const ln=keys.map(k=>Math.log(PROJECTS[k].lines));
  const lo=Math.min(...ln), hi=Math.max(...ln);
  let y=y0;
  for(const k of keys){
    const p=PROJECTS[k];
    p.h=Math.round(hMin+(hMax-hMin)*(hi>lo?(Math.log(p.lines)-lo)/(hi-lo):0));
    p.x=Math.round(X(p.from));
    p.w=Math.max(6,Math.round(X(p.to)-X(p.from)));   // a one-day project is a tick, honestly
    p.y=y; y+=p.h+gap;
  }
  return {X,keys,bottom:y-gap};
}

export function start({PROJECTS,CHAPTERS,sibling,axis}){
const ALL=Object.keys(PROJECTS);
const TODO='<p class="todo">Needs your line.</p>';

/* ── the DOM ─────────────────────────────────────────────────────────── */
const main=$("main");
main.innerHTML=CHAPTERS.map(c=>{
  const body=v=>v==="technical"?c.tech:v==="eli5"?(c.plain??TODO):(c.comm??TODO);
  const mark=v=>v==="commentary"&&c.drafted?' data-drafted="1"':"";
  return `<section class="stage" id="${c.slug}">`+VERS.map(v=>
    `<div class="ver${v==="commentary"?" on":""}" data-ver="${v}"${mark(v)}><div class="beat"><div class="panel">
      <p class="kicker"><b>${c.n}</b> &nbsp;${c.kicker}</p>
      <h2>${c.title}</h2>
      ${body(v)}
      ${c.figs?`<div class="figs">${c.figs}</div>`:""}
      ${c.links?`<p class="links">${c.links.map(([t,u])=>`<a href="${u}" target="_blank" rel="noopener noreferrer">${t}</a>`).join("")}</p>`:""}
    </div></div></div>`).join("")+`</section>`;
}).join("");

/* The rail is not a row of identical dots: each tick is as wide as the chapter's
   subject is large, so scrolling it reads as a bar chart of the work. */
const rail=$("#rail");
const railW=(()=>{
  const v=CHAPTERS.map(c=>(c.focus&&c.focus.length?c.focus:ALL)
    .reduce((t,k)=>t+(PROJECTS[k]?.lines||0),0));
  const mx=Math.max(...v,1);
  return v.map(x=>Math.round(9+21*Math.sqrt(x/mx)));
})();
rail.innerHTML=CHAPTERS.map((c,i)=>
  `<button data-k="${i}" aria-current="false" style="--w:${railW[i]}px"
     title="${c.n} ${c.title}"><i></i></button>`).join("");

/* ── the map: one box per project, laid out by the page ──────────────── */
const svg=document.createElementNS(NS,"svg");
svg.setAttribute("viewBox","0 0 700 560");
svg.setAttribute("preserveAspectRatio","xMidYMid meet");
const gGrid=document.createElementNS(NS,"g");gGrid.id="grid";
const axisLabels=[];
if(axis){
  // dated lines, not graph paper: the horizontal position on this map means something
  for(const [x,label] of axis.ticks){
    const l=document.createElementNS(NS,"line");
    l.setAttribute("x1",x);l.setAttribute("y1",axis.y0);l.setAttribute("x2",x);l.setAttribute("y2",axis.y1);
    gGrid.append(l);
    if(!label)continue;
    const t=document.createElementNS(NS,"text");
    t.setAttribute("class","axis-lab");t.setAttribute("x",x+3);
    t.textContent=label;gGrid.append(t);
    axisLabels.push(t);
  }
}else{
  for(let x=0;x<=700;x+=35){const l=document.createElementNS(NS,"line");
    l.setAttribute("x1",x);l.setAttribute("y1",0);l.setAttribute("x2",x);l.setAttribute("y2",560);gGrid.append(l);}
  for(let y=0;y<=560;y+=35){const l=document.createElementNS(NS,"line");
    l.setAttribute("x1",0);l.setAttribute("y1",y);l.setAttribute("x2",700);l.setAttribute("y2",y);gGrid.append(l);}
}
const gCam=document.createElementNS(NS,"g");gCam.append(gGrid);
const nodes={};
for(const [k,p] of Object.entries(PROJECTS)){
  const g=document.createElementNS(NS,"g");g.setAttribute("class","node");
  const r=document.createElementNS(NS,"rect");
  r.setAttribute("x",p.x);r.setAttribute("y",p.y);r.setAttribute("width",p.w);r.setAttribute("height",p.h);
  const t=document.createElementNS(NS,"text");t.textContent=p.label;
  const m=document.createElementNS(NS,"text");m.setAttribute("class","meta");
  m.textContent=`${p.lang} · ${p.lines.toLocaleString()} lines`;
  g.append(r,t,m);gCam.append(g);nodes[k]=g;
}
svg.append(gCam);$("#scene").append(svg);

// a chapter's camera: the bounding box of what it focuses, padded clear of the panel
let VIEW=null;
function buildViews(){
  const wide=innerWidth>760;
  VIEW=CHAPTERS.map(c=>{
    const ps=(c.focus&&c.focus.length?c.focus:ALL).map(k=>PROJECTS[k]).filter(Boolean);
    const q=ps.length?ps:Object.values(PROJECTS);
    const x0=Math.min(...q.map(p=>p.x)), y0=Math.min(...q.map(p=>p.y));
    const x1=Math.max(...q.map(p=>p.x+p.w)), y1=Math.max(...q.map(p=>p.y+p.h));
    const bw=x1-x0, bh=y1-y0, pad=Math.max(60,bw*0.22);
    // the panel sits left on a wide window and low on a narrow one; the view keeps clear of it
    const padL=wide?pad+bw*0.95+110:pad, padR=pad;
    const padT=pad, padB=wide?pad:pad+bh*0.9+70;
    return {cx:(x0-padL+x1+padR)/2, cy:(y0-padT+y1+padB)/2, w:bw+padL+padR, h:bh+padT+padB};
  });
}
buildViews();
// screen pixels per map unit, before the camera: viewBox 700x560 under xMidYMid meet
let fit=1;
function measureFit(){
  const r=svg.getBoundingClientRect();
  const f=Math.min(r.width/700,r.height/560);
  if(f>0)fit=f;                 // 0 before the first layout: keep the last good value
}
// a ResizeObserver, not a resize listener: this has to fire on the FIRST layout too,
// or every label spends the session counter-scaled against a fit of 1 and renders
// about 1.6x too large, which is exactly large enough for the year labels to touch
new ResizeObserver(measureFit).observe(svg);
measureFit();
addEventListener("resize",buildViews);

/* ── figures: a chapter's own schematic, in a fixed 520 x 420 space ──── */
const figSvg=document.createElementNS(NS,"svg");
figSvg.setAttribute("viewBox","0 0 520 420");
figSvg.setAttribute("preserveAspectRatio","xMidYMid meet");
$("#figs").append(figSvg);
const FIGS={};
function buildFigure(slug,build){
  const g=document.createElementNS(NS,"g");g.setAttribute("class","fig");
  const items=[];
  const mk=(tag,attrs,cls,drawn)=>{
    const el=document.createElementNS(NS,tag);
    for(const [k,v] of Object.entries(attrs))el.setAttribute(k,v);
    el.setAttribute("class",cls);
    const d=drawn&&!cls.includes("dash");
    if(d){el.setAttribute("pathLength",1);el.style.strokeDasharray=1;el.style.strokeDashoffset=1;}
    else el.style.opacity=0;
    g.append(el);items.push({el,drawn:d});
    return el;
  };
  const api={
    line:(x1,y1,x2,y2,c="")=>mk("line",{x1,y1,x2,y2},"f-line "+c,true),
    rect:(x,y,w,h,c="")=>mk("rect",{x,y,width:w,height:h},(c.includes("dash")?"dash ":"f-rect ")+c,true),
    path:(d,c="")=>mk("path",{d,fill:"none"},"f-line "+c,true),
    // the thickness goes in the inline STYLE, not the attribute: .hot-s sets a
    // stroke-width of its own, and a CSS declaration beats a presentation attribute,
    // which would render every accented bar as a hairline
    bar(cx,yb,h,w,c=""){const el=mk("line",{x1:cx,y1:yb,x2:cx,y2:yb-h},"f-bar "+c,true);
      el.style.strokeWidth=w+"px";return el;},
    text(x,y,t,c="f-text"){const el=mk("text",{x,y},"f-text "+c,false);el.textContent=t;return el;},
    box(x,y,w,h,title,sub,c=""){this.rect(x,y,w,h,c);this.text(x+8,y+17,title.toUpperCase(),"f-ttl");
      if(sub)this.text(x+8,y+29,sub,"f-sub");},
    arrow(x1,y1,x2,y2,c=""){this.line(x1,y1,x2,y2,c);const a=Math.atan2(y2-y1,x2-x1),h=5;
      this.path(`M${x2-h*Math.cos(a-.5)} ${y2-h*Math.sin(a-.5)}L${x2} ${y2}L${x2-h*Math.cos(a+.5)} ${y2-h*Math.sin(a+.5)}`,c);}
  };
  build(api);
  figSvg.append(g);
  FIGS[slug]={g,items,last:-1};
}
// a chapter that can show the real thing, running or recorded, does not get a drawing of it
for(const c of CHAPTERS) if(c.fig&&!c.live&&!c.shot) buildFigure(c.slug,c.fig);

/* ── live embeds: the project itself, in the slot the schematic would use ─
   The frame stays inert behind a shield until the reader asks for it, so a scroll
   past a game does not get swallowed by the game. Scrolling away re-arms it.
   A shot is the same slot holding a still or a GIF instead, with nothing to press. */
const LIVE={};
if(CHAPTERS.some(c=>c.live||c.shot)){
  const layer=document.createElement("div");
  layer.id="live";layer.setAttribute("aria-hidden","true");
  document.body.append(layer);
  for(const c of CHAPTERS){
    if(c.shot){
      const box=document.createElement("div");
      box.className="live shot";
      box.innerHTML=`<div class="live-frame"></div><p class="live-cap">${c.shot.cap||""}</p>`;
      layer.append(box);
      LIVE[c.slug]={box,shot:c.shot,frame:box.querySelector(".live-frame"),loaded:false};
      continue;
    }
    if(!c.live)continue;
    const box=document.createElement("div");
    box.className="live";
    box.innerHTML=`<div class="live-frame"></div>`+
      `<button class="live-shield" type="button" tabindex="-1">`+
      `<span class="live-play">play it here</span>`+
      `<span class="live-note">${c.live.note||"the real thing, running on this page"}</span>`+
      `</button><p class="live-cap">${c.live.cap||""}</p>`;
    layer.append(box);
    const L={box,src:c.live.src,frame:box.querySelector(".live-frame"),loaded:false,armed:true};
    LIVE[c.slug]=L;
    box.querySelector(".live-shield").addEventListener("click",()=>{
      L.armed=false;box.classList.add("playing");});
  }
}
function showLive(slug,p){
  const L=LIVE[slug];if(!L)return;
  if(L.shot){
    if(p>0.05&&!L.loaded){                   // a GIF can run to megabytes, so it waits too
      L.loaded=true;
      const im=new Image();
      im.src=L.shot.src;im.alt=L.shot.alt||"";im.decoding="async";
      L.frame.append(im);
    }
    L.box.style.opacity=clamp(p*1.5);
    return;
  }
  if(p>0.2&&!L.loaded){                      // nothing loads until you are nearly on it
    L.loaded=true;
    const f=document.createElement("iframe");
    f.src=L.src;f.title=slug;f.loading="lazy";
    f.setAttribute("sandbox","allow-scripts allow-same-origin allow-downloads");
    L.frame.append(f);
  }
  L.box.style.opacity=clamp(p*1.5);
  L.box.style.pointerEvents=p>0.75?"auto":"none";
  if(p<0.5&&!L.armed){L.armed=true;L.box.classList.remove("playing");}
}

function revealFig(slug,p){
  const f=FIGS[slug];if(!f)return;
  if(Math.abs(p-f.last)<0.002)return;
  f.last=p;
  f.g.style.opacity=clamp(p*1.4);
  const n=f.items.length;
  f.items.forEach((it,i)=>{
    const lp=clamp((p-(i/n)*0.5)/0.45);
    if(it.drawn)it.el.style.strokeDashoffset=1-lp; else it.el.style.opacity=lp;
  });
}

/* ── stage: scroll to a continuous float S over the chapters ─────────── */
const sections=[...document.querySelectorAll(".stage")];
const N=sections.length;
const SI=Object.fromEntries(CHAPTERS.map((c,i)=>[c.slug,i]));
let spans=null;
const atCenter=el=>{const r=el.getBoundingClientRect();return r.top+scrollY+r.height/2;};
function measure(){
  spans=sections.map((s,i)=>{
    if(i===N-1){const e=document.documentElement.scrollHeight-innerHeight/2;return [e,e];}
    const beats=s.querySelectorAll(".ver.on .beat");
    return beats.length?[atCenter(beats[0]),atCenter(beats[beats.length-1])]:[atCenter(s),atCenter(s)];
  });
}
const invalidate=()=>{spans=null;};
new ResizeObserver(invalidate).observe(main);
addEventListener("resize",invalidate);

function stageS(){
  if(!spans)measure();
  const y=scrollY+innerHeight/2;
  if(y<=spans[0][1])return 0;
  for(let i=0;i<N-1;i++){
    const [,b]=spans[i], [a2]=spans[i+1];
    if(y<=b)return i;
    if(y<a2)return i+smooth(clamp((y-b)/Math.max(1,a2-b)));
  }
  return N-1;
}

/* ── versions ────────────────────────────────────────────────────────── */
let version="commentary";
function setVersion(v,keepPlace=true){
  if(!VERS.includes(v)||v===version)return;
  const k=keepPlace?Math.round(S):-1;
  version=v;
  document.querySelectorAll(".ver").forEach(el=>el.classList.toggle("on",el.dataset.ver===v));
  document.querySelectorAll(".vers button").forEach(b=>
    b.setAttribute("aria-pressed",String(b.dataset.ver===v)));
  invalidate();measure();
  if(k>=0)jump(k,"instant");
  writeHash();
}
document.querySelectorAll(".vers button").forEach(b=>
  b.addEventListener("click",()=>setVersion(b.dataset.ver)));

/* ── jump and router ─────────────────────────────────────────────────── */
function jump(k,behavior="smooth"){
  if(!spans)measure();
  k=clamp(k,0,N-1);
  const y=spans[k][0]-innerHeight/2;
  scrollTo({top:Math.max(0,y),behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"instant":behavior});
}
rail.querySelectorAll("button").forEach(b=>
  b.addEventListener("click",()=>jump(+b.dataset.k)));
// a sibling page keeps the reader's narration level when they cross over
if(sibling){
  document.querySelectorAll("[data-sibling]").forEach(a=>
    a.addEventListener("click",e=>{e.preventDefault();location.href=`${sibling}#${a.dataset.sibling||""}/${version}`;}));
}

function readHash(){
  let h;try{h=decodeURIComponent(location.hash.slice(1)).toLowerCase();}catch{return null;}
  const [slug,ver]=h.split("/");
  const k=SI[slug];
  return k===undefined?null:{k,ver:VERS.includes(ver)?ver:"commentary"};
}
let lastHash="";
function writeHash(){
  const h=`#${CHAPTERS[Math.round(S)].slug}/${version}`;
  if(h===lastHash)return;
  lastHash=h;
  try{history.replaceState(null,"",h);}catch{}
}
addEventListener("hashchange",()=>{
  const r=readHash();if(!r)return;
  if(r.ver!==version)setVersion(r.ver,false);
  jump(r.k);
});

/* ── frame ───────────────────────────────────────────────────────────── */
let S=0, Sv=0;
const w=k=>clamp(1-Math.abs(Sv-k)*1.4);
const readout=$("#readout");
const railBtns=[...rail.querySelectorAll("button")];
const LAST=CHAPTERS[N-1].n;

function tick(){
  requestAnimationFrame(tick);
  S=stageS();
  Sv+=(S-Sv)*0.12;                                   // the eased camera trails the scroll
  if(Math.abs(S-Sv)<0.0005)Sv=S;

  const i=Math.floor(Sv), f=Sv-i, a=VIEW[clamp(i,0,N-1)], b=VIEW[clamp(i+1,0,N-1)];
  const t=smooth(f);
  const zoomOut=1+Math.sin(Math.PI*f)*0.18;          // the powers-of-ten bump between chapters
  const cw=lerp(a.w,b.w,t)*zoomOut, ch=lerp(a.h,b.h,t)*zoomOut;
  const cx=lerp(a.cx,b.cx,t), cy=lerp(a.cy,b.cy,t);
  const k=Math.min(700/cw,560/ch,2.4);               // a lone small project never fills the screen
  const ppu=k*fit;                                   // screen px per map unit, camera and fit together
  gCam.setAttribute("transform",`translate(${350-cx*k} ${280-cy*k}) scale(${k})`);

  const heat={};
  for(let j=0;j<N;j++){const ww=w(j);if(ww>0.01)for(const key of (CHAPTERS[j].focus||ALL))
    heat[key]=Math.max(heat[key]||0,ww);}
  for(const key of ALL){
    const g=nodes[key], p=PROJECTS[key], h=heat[key]||0;
    g.classList.toggle("hot",h>0.45);
    g.style.opacity=0.28+0.72*h;
    // the labels hold their size on screen while the camera scales under them
    const [tx,mx]=g.querySelectorAll("text"), fs=11/ppu, ms=9/ppu;
    tx.style.fontSize=fs+"px"; mx.style.fontSize=ms+"px";
    // on a dated map a short project is a narrow tick, so its name sits beside the box
    // rather than vanishing: the width is the measurement, the label is just the label
    const room=p.w-10/ppu, tw=tx.getComputedTextLength(), inside=tw<=room;
    // and flips to the left of the box when the right of the map would cut it off
    const flip=!inside&&(p.x+p.w+6/ppu+tw>696);
    const lx=inside?p.x+6/ppu+2:(flip?p.x-6/ppu:p.x+p.w+6/ppu);
    tx.setAttribute("x",lx); mx.setAttribute("x",lx);
    const anc=flip?"end":"start";
    tx.setAttribute("text-anchor",anc); mx.setAttribute("text-anchor",anc);
    tx.setAttribute("y",inside?p.y+4+fs:p.y+p.h/2+fs*0.36);
    mx.setAttribute("y",inside?p.y+6+fs+ms:p.y+p.h/2+fs*0.36+ms+3/ppu);
    tx.style.opacity=1;
    mx.style.opacity=(inside&&fs>p.h*0.5)?0:(h>0.25?1:0);
  }

  if(axis){
    // on a phone the whole map is squeezed into 375px and every year label would
    // overlap its neighbour, so thin them out until they fit
    const sp=axis.ticks.length>1?(axis.ticks[1][0]-axis.ticks[0][0])*ppu:999;
    const stride=Math.max(1,Math.ceil(38/Math.max(sp,1)));
    axisLabels.forEach((t,i)=>{
      t.style.fontSize=(10/ppu)+"px";
      t.setAttribute("y",axis.y0-5/ppu);
      t.style.opacity=i%stride?"0":"";
    });
  }

  sections.forEach((s,j)=>{
    const p=s.querySelector(".ver.on .panel");
    if(!p)return;
    const ww=w(j);
    p.style.opacity=clamp(0.08+ww*1.6);
    p.style.transform=`translateY(${(1-ww)*14}px)`;
  });

  /* One figure at a time. The old window opened at a weight of 0.12, which meant that
     halfway between two chapters BOTH figures sat at about 0.46 while the map was still
     at 0.65: three layers of line art on top of each other. Opening at 0.45 means only
     the nearest chapter can ever be showing, and the two hand off through a gap where
     the map alone is on screen. */
  let figP=0;
  for(let j=0;j<N;j++){
    const slug=CHAPTERS[j].slug, p=clamp((w(j)-0.45)/0.4);
    if(p>0||FIGS[slug]?.last>0)revealFig(slug,p);
    if(LIVE[slug])showLive(slug,p);
    figP=Math.max(figP,p);
  }
  svg.style.opacity=lerp(1,0.05,clamp(figP*1.6));      // the map returns in the gaps between chapters

  const cur=Math.round(S);
  railBtns.forEach((b,j)=>b.setAttribute("aria-current",String(j===cur)));
  readout.textContent=`${CHAPTERS[cur].n} / ${LAST}  ${CHAPTERS[cur].slug}  ·  ${version}`;
  writeHash();
}

/* ── start ───────────────────────────────────────────────────────────── */
// If the frame loop dies after start, the page falls back to plain stacked text rather
// than leaving panels stuck at whatever opacity the last good frame wrote.
addEventListener("error",e=>{
  if(/ResizeObserver/.test(e?.message??""))return;
  delete document.documentElement.dataset.started;
  document.querySelectorAll(".panel").forEach(el=>el.removeAttribute("style"));
});
history.scrollRestoration="manual";
document.documentElement.dataset.started="";
measure();
const route=readHash();
if(route){setVersion(route.ver,false);requestAnimationFrame(()=>jump(route.k,"instant"));}
else scrollTo(0,0);
requestAnimationFrame(tick);
}
