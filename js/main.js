(function(){
"use strict";
document.documentElement.classList.add('loading');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
// weaker devices (phones, few CPU cores, little memory) get a lighter fire and fewer embers
const lite=innerWidth<800||(navigator.hardwareConcurrency||8)<=4||(navigator.deviceMemory||8)<=4;
const clamp=(v,a=0,b=1)=>Math.min(b,Math.max(a,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const ease=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
const easeOut=t=>1-Math.pow(1-t,3);
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];

/* heading gradient: wrap each plain white text run of h1/h2 in .gt; coloured or outlined words are skipped */
$$('h1,h2').forEach(h=>{
  if(h.closest('.line-tag')) return;
  const skip=n=>n.nodeType===1&&n.matches('.red,.out,.kw,.r');
  (function walk(el){[...el.childNodes].forEach(n=>{
    if(n.nodeType===3&&n.textContent.trim()){const s=document.createElement('span');s.className='gt';n.replaceWith(s);s.appendChild(n);}
    else if(n.nodeType===1&&!skip(n)&&n.tagName!=='BR'&&n.tagName!=='svg') walk(n);
  });})(h);
});

/* progress of a sticky scene: 0 when its top hits viewport top, 1 when its bottom hits viewport bottom */
function sceneP(el){const r=el.getBoundingClientRect();const span=r.height-innerHeight;return span>0?clamp(-r.top/span):clamp(1-r.top/innerHeight);}
/* progress of an element passing through the viewport: 0 entering at bottom, 1 at `end` fraction from top */
function viewP(el,start=1,end=.35){const r=el.getBoundingClientRect();return clamp((innerHeight*start-r.top)/(innerHeight*(start-end)));}

/* X polygon (normalized 0..100). w=arm half-width; w=50 gives the full rectangle */
function xPts(w){return [[0,0],[w,0],[50,50-w],[100-w,0],[100,0],[100,w],[50+w,50],[100,100-w],[100,100],[100-w,100],[50,50+w],[w,100],[0,100],[0,100-w],[50-w,50],[0,w]];}
const mapPts=(pts,cx,cy,bw,bh)=>pts.map(([x,y])=>[cx+(x-50)/100*bw,cy+(y-50)/100*bh]);
const toClip=(pts,u)=>'polygon('+pts.map(p=>p[0].toFixed(2)+u+' '+p[1].toFixed(2)+u).join(',')+')';
const toAttr=pts=>pts.map(p=>p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ');

/* ---------- scroll state ---------- */
let sy=scrollY, vel=0;
addEventListener('scroll',()=>{const y=scrollY;vel=lerp(vel,y-sy,.5);sy=y;},{passive:true});

/* ---------- WebGL fire: domain-warped fbm, red palette, plus grey drifting smoke ---------- */
const Fire=(function(){
  const cv=$('#fire'); if(reduce||!cv) return null;
  const gl=cv.getContext('webgl',{premultipliedAlpha:true,antialias:false,alpha:true,powerPreference:'low-power'});
  if(!gl) return null;
  const vs=`attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;
  const fs=`precision ${lite?'mediump':'highp'} float;
  uniform vec2 res;uniform float t,fire,height,smoke,smokeY,turb;
  float h(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
  float n(vec2 p){vec2 i=floor(p),f=fract(p);vec2 u=f*f*(3.-2.*f);
    return mix(mix(h(i),h(i+vec2(1,0)),u.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),u.x),u.y);}
  float fbm(vec2 p){float v=0.,a=.5;mat2 m=mat2(1.6,1.2,-1.2,1.6);for(int i=0;i<4;i++){v+=a*n(p);p=m*p;a*=.5;}return v;}
  vec3 ramp(float x){
    vec3 c=mix(vec3(0.),vec3(.22,.0,.005),smoothstep(.0,.25,x));
    c=mix(c,vec3(.62,.02,.03),smoothstep(.2,.5,x));
    c=mix(c,vec3(.95,.09,.06),smoothstep(.45,.75,x));
    c=mix(c,vec3(1.,.36,.22),smoothstep(.72,1.,x));
    return c;}
  void main(){
    vec2 uv=gl_FragCoord.xy/res; float asp=res.x/res.y;
    vec2 p=vec2(uv.x*asp,uv.y);
    // fire
    vec3 col=vec3(0.);
    if(fire>.001){
      vec2 q=p*vec2(2.6,1.6);
      float w=fbm(q*1.3+vec2(0.,-t*.55));
      float f=fbm(q+vec2(w*.9*turb,-t*1.35)+vec2(sin(t*.3)*.2,0.));
      float base=1.-uv.y/max(height,.05);
      float flame=f*1.25+base*1.05-0.95;
      flame=clamp(flame,0.,1.);
      flame*=smoothstep(0.,.25,base+.15);
      float flick=.85+.15*n(vec2(t*3.,1.));
      col+=ramp(flame*fire*flick)*fire;
    }
    // grey-red smoke drifting sideways
    if(smoke>.001){
      vec2 s=p*vec2(1.4,2.2)+vec2(t*.09,0.);
      float d=fbm(s+fbm(s*1.7-vec2(t*.05,t*.02))*1.4);
      float band=exp(-pow((uv.y-smokeY)*2.4,2.));
      float a=smoothstep(.42,.85,d)*band*smoke;
      col+=mix(vec3(.10,.10,.11),vec3(.45,.03,.04),smoothstep(.55,.9,d))*a;
    }
    gl_FragColor=vec4(col,clamp(max(col.r,max(col.g,col.b))*1.15,0.,1.));
  }`;
  function sh(type,src){const s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn(gl.getShaderInfoLog(s));return null;}return s;}
  const pr=gl.createProgram(); const a=sh(gl.VERTEX_SHADER,vs), b=sh(gl.FRAGMENT_SHADER,fs); if(!a||!b) return null;
  gl.attachShader(pr,a);gl.attachShader(pr,b);gl.linkProgram(pr);gl.useProgram(pr);
  const buf=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buf);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,3,-1,-1,3]),gl.STATIC_DRAW);
  const loc=gl.getAttribLocation(pr,'p');gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,2,gl.FLOAT,false,0,0);
  const U={};['res','t','fire','height','smoke','smokeY','turb'].forEach(k=>U[k]=gl.getUniformLocation(pr,k));
  let scale=.5;
  function resize(){scale=lite?.24:.34;cv.width=Math.round(innerWidth*scale);cv.height=Math.round(innerHeight*scale);gl.viewport(0,0,cv.width,cv.height);}
  resize();addEventListener('resize',resize);
  const st={fire:0,height:.3,smoke:0,smokeY:.35,turb:1};
  return {st,draw(t){
    if(st.fire<.002&&st.smoke<.002){cv.style.visibility='hidden';return;}
    cv.style.visibility='visible';
    gl.uniform2f(U.res,cv.width,cv.height);gl.uniform1f(U.t,t);
    gl.uniform1f(U.fire,st.fire);gl.uniform1f(U.height,st.height);gl.uniform1f(U.smoke,st.smoke);gl.uniform1f(U.smokeY,st.smokeY);gl.uniform1f(U.turb,st.turb);
    gl.drawArrays(gl.TRIANGLES,0,3);
  }};
})();

/* ---------- embers: small, red-hot, glowing, rising with turbulence ---------- */
const Embers=(function(){
  const cv=$('#embers'); if(reduce||!cv) return null; const ctx=cv.getContext('2d');
  let W,H,dpr; const P=[];
  function resize(){dpr=Math.min(devicePixelRatio||1,1.5);W=innerWidth;H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);}
  resize();addEventListener('resize',resize);
  let acc=0; const st={rate:0};
  function spawn(){P.push({x:Math.random()*W,y:H+8,vx:(Math.random()-.5)*30,vy:-(25+Math.random()*85),l:0,m:2.5+Math.random()*4,s:.5+Math.random()*1.6,k:Math.random()*100,hot:Math.random()});}
  let blank=false;
  function step(dt){
    acc+=st.rate*dt*(W<720?.5:1); while(acc>1){spawn();acc--;}
    if(!P.length){if(!blank){ctx.clearRect(0,0,W,H);blank=true;}return;}   // nothing to draw: skip the full-screen clear every frame
    blank=false; ctx.clearRect(0,0,W,H);
    const cap=lite?110:240; if(P.length>cap)P.splice(0,P.length-cap);
    ctx.globalCompositeOperation='lighter';
    for(let i=P.length-1;i>=0;i--){const p=P[i];p.l+=dt;
      if(p.l>p.m||p.y<-20){P.splice(i,1);continue;}
      p.vx+=Math.sin(p.l*2.2+p.k)*45*dt;p.vx*=1-.6*dt; p.vy-=vel*dt*3; p.vy=clamp(p.vy,-500,100);
      p.x+=p.vx*dt;p.y+=p.vy*dt;
      const k=p.l/p.m, a=(1-k)*Math.min(1,p.l*4)*(.6+.4*Math.sin(p.l*(9+p.k%7)+p.k));
      const g=30+p.hot*80|0, r=p.s;
      ctx.fillStyle=`rgba(190,${g*.25|0},8,${a*.10})`;ctx.beginPath();ctx.arc(p.x,p.y,r*7,0,6.283);ctx.fill();
      ctx.fillStyle=`rgba(235,${g*.6|0},20,${a*.35})`;ctx.beginPath();ctx.arc(p.x,p.y,r*2.4,0,6.283);ctx.fill();
      ctx.fillStyle=`rgba(255,${g+40},${g*.6|0},${a})`;ctx.beginPath();ctx.arc(p.x,p.y,r*.8,0,6.283);ctx.fill();
    }
    ctx.globalCompositeOperation='source-over';
  }
  return {st,step};
})();

/* ---------- language switcher: close on outside click / Esc; languages not wired yet ---------- */
(function(){const l=$('#lang');if(!l)return;document.addEventListener('click',e=>{if(!l.contains(e.target))l.open=false;});document.addEventListener('keydown',e=>{if(e.key==='Escape')l.open=false;});
  l.querySelectorAll('a[href="#"]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();l.open=false;}));})();

/* ---------- hero streaks ---------- */
(function(){const s=$('#streaks');if(!s||reduce)return;for(let i=0;i<9;i++){const e=document.createElement('i');e.style.top=(52+Math.random()*44)+'%';e.style.animationDuration=(1.2+Math.random()*2.4)+'s';e.style.animationDelay=(-Math.random()*3)+'s';e.style.opacity=(.25+Math.random()*.6).toFixed(2);s.appendChild(e);}})();

/* ---------- manifesto words ---------- */
const mText=$('#mText');
const words=[];
(function(){const lines=mText.textContent.trim().split('|');mText.textContent='';   // '|' in HTML = line break between sentences
  lines.forEach(l=>{const ln=document.createElement('span');ln.className='ln';mText.appendChild(ln);const raw=l.trim().split(/[^\S ]+/);   // non-breaking spaces (no orphans) keep short words glued to the next one
  raw.forEach((t,i)=>{const parts=t.split(/ (?=\*)/);const box=parts.length>1?ln.appendChild(Object.assign(document.createElement('span'),{className:'w-grp'})):ln;   // "*a*&nbsp;*b*" = two words lit separately, kept on one line
    parts.forEach((w,j)=>{const red=w.startsWith('*');const sp=document.createElement('span');sp.className='w'+(red?' r':'');sp.textContent=w.replace(/\*/g,'');box.appendChild(sp);if(j<parts.length-1)box.appendChild(document.createTextNode(' '));words.push(sp);});
    if(i<raw.length-1)ln.appendChild(document.createTextNode(' '));});});})();

/* ---------- elements ---------- */
const manifest=$('#manifest'), heat=$('#heat'), heatImg=$('#heatPh img'), steps=$$('.heat-copy .step'), gauge=$('#gauge'), gaugeLbl=$('#gaugeLbl');
$$('.xscene').forEach(el=>{const f=el.querySelector('.fullbox img[data-same]'),src=el.querySelector('.clip img');if(f&&src)f.src=src.currentSrc||src.src;});
const xscenes=$$('.xscene').map(el=>({el,full:el.querySelector('.fullbox'),fimg:el.querySelector('.fullbox img'),fcall:[...el.querySelectorAll('.fullbox .callout')],copy:el.querySelector('.dcopy'),stage:el.querySelector('.stage'),media:el.querySelector('.dmedia'),clip:el.querySelector('.clip'),img:el.querySelector('.clip img'),xo:el.querySelector('.xo'),polys:[...el.querySelectorAll('.xo polygon')],callouts:[],subs:[...el.querySelectorAll('.sub')],mix:el.querySelector('.mix'),bars:[...el.querySelectorAll('.mix .row i')]}));
const linia=$('#linia'), lineSet=$('#lineSet'), lineSets=$$('#lineSet .ls'), lineTag=$('#lineTag');
const hero=$('#top'), heroImg=$('.hero .ph video')||$('.hero .ph img'), contact=$('#kontakt');
const fills=$$('[data-fill]');
const hsSec=$('.icons.hs'), hsTrack=hsSec?hsSec.querySelector('.igrid'):null;
const rail=$$('#rail a'), chapters=rail.map(a=>document.getElementById(a.dataset.ch));
const nav=$('#nav'), railEl=$('#rail');
const formWrap=$('#formularz');

const FT={fire:0,height:.25,smoke:0,smokeY:.3,turb:1};
function update(){
  const vh=innerHeight;
  const pastHero=scrollY>hero.offsetHeight*.8;
  nav.classList.toggle('show',pastHero); nav.classList.toggle('solid',pastHero); railEl.classList.toggle('show',pastHero);

  // hero parallax
  const hr=hero.getBoundingClientRect(); const hp=clamp(-hr.top/vh);
  heroImg.parentElement.style.transform=`translateY(${hp*18}%)`;

  // manifesto
  const mp=sceneP(manifest); const lit=Math.floor(lerp(-2,words.length+2,clamp((mp-.05)/.8)));
  words.forEach((w,i)=>w.classList.toggle('on',i<lit));
  const md=$('#mDisc'); if(md){const zr=$('#discZone').getBoundingClientRect(), vh2=innerHeight;   // disc rolls in from the right edge, then keeps spinning through "Hamuj" + "Współpraca"
    const dp=clamp((vh2-zr.top)/(zr.height+vh2));   // already in place, only spins with scroll
    md.style.transform=`translateY(-50%) rotate(${(-dp*80).toFixed(1)}deg)`;}

  // heat chapter
  const hp2=sceneP(heat);
  $('#heatPh').style.setProperty('--dim','.78');   // brightness stays at the opening level so the copy is always readable
  heatImg.style.setProperty('--z',lerp(1.0,1.25,clamp(hp2)).toFixed(3));
  const si=hp2<.33?0:hp2<.66?1:2; steps.forEach((s,i)=>s.classList.toggle('on',i===si));   // one disc photo behind all three steps
  gauge.style.setProperty('--h',lerp(.06,1,clamp(hp2/.85)).toFixed(3));
  gaugeLbl.textContent=hp2<.3?'Niska':hp2<.65?'Wysoka':'Maksymalna';

  // product scenes: X window opens around the photo, subtext and callouts appear with scroll
  xscenes.forEach(S=>{
    if(innerWidth>860){
      const dp=sceneP(S.el);
      // the X stays square (sized to the shorter side), then opens out to the photo's own proportions
      const W=S.media.clientWidth, H=S.media.clientHeight;
      const open=ease(clamp((dp-.03)/.27)), s=lerp(.7,1,easeOut(clamp(dp/.25)));
      const w=lerp(13,50,open), side=Math.min(W,H)*s;
      const bw=lerp(side,W,open), bh=lerp(side,H,open);
      const pts=mapPts(xPts(w),W/2,H/2,bw,bh);
      S.clip.style.clipPath=toClip(pts,'px');
      S.xo.setAttribute('viewBox',`0 0 ${W} ${H}`);
      S.img.style.setProperty('--z',lerp(1.45,1,easeOut(clamp(dp/.32))).toFixed(3));
      S.polys[0].setAttribute('points',toAttr(pts));
      S.polys[1].setAttribute('points',toAttr(mapPts(xPts(Math.min(50,w+3)),W/2+bw*.025,H/2+bh*.025,bw*1.04,bh*1.04)));
      S.xo.style.opacity=(1-clamp((dp-.24)/.08)).toFixed(3);
      S.callouts.forEach(c=>c.classList.toggle('on',dp>=+c.dataset.at));
      S.subs.forEach(c=>c.classList.toggle('on',dp/.6>=+c.dataset.at));
      // friction-mix bars fill with the scroll, one after another, before the photo takes over at .36
      if(S.mix){S.mix.classList.add('scroll');S.bars.forEach((b,i)=>b.style.setProperty('--p',clamp((dp-.50-i*.05)/.05).toFixed(3)));}
      // grow the photo from its place in the layout to the whole screen
      const g=ease(clamp((dp-.75)/.11));
      const sr=S.stage.getBoundingClientRect(), mr=S.media.getBoundingClientRect();
      // target: 70% of the screen width, keeping the photo's proportions, centred (and never taller than 86% of the screen)
      const ar=(+S.fimg.dataset.w)/(+S.fimg.dataset.h);
      let tw=sr.width*.7, th=tw/ar; if(th>sr.height*.86){th=sr.height*.86; tw=th*ar;}
      const tl=(sr.width-tw)/2, tt=(sr.height-th)/2+30;
      const L=lerp(mr.left-sr.left,tl,g), T=lerp(mr.top-sr.top,tt,g), BW=lerp(mr.width,tw,g), BH=lerp(mr.height,th,g);
      const F=S.full; F.style.left=L+'px'; F.style.top=T+'px'; F.style.width=BW+'px'; F.style.height=BH+'px';
      const big=dp>=.745; F.style.opacity=big?1:0; F.style.setProperty('--vg',g.toFixed(3));
      S.media.style.visibility=big?'hidden':'visible';
      F.classList.toggle('dim',g>=1&&S.fcall.some(c=>dp>=+c.dataset.at));   // photo dims to 70% once the dots start appearing   // one photo only: the framed one hands over to the growing one, no duplicate
      S.copy.style.opacity=(1-clamp((dp-.75)/.08)).toFixed(3);
      // dots sit on fixed points of the photo (image-space), mapped through object-fit: cover
      const iw=+S.fimg.dataset.w, ih=+S.fimg.dataset.h, sc=Math.max(BW/iw,BH/ih), ox=(BW-iw*sc)/2, oy=(BH-ih*sc)/2;
      S.fcall.forEach(c=>{c.style.left=(ox+ +c.dataset.ix*iw*sc).toFixed(1)+'px';c.style.top=(oy+ +c.dataset.iy*ih*sc).toFixed(1)+'px';c.classList.toggle('on',g>=1&&dp>=+c.dataset.at);});
    }else{
      if(S.mix){S.mix.classList.remove('scroll');S.bars.forEach(b=>b.style.removeProperty('--p'));}
      S.clip.style.clipPath='none'; S.img.style.setProperty('--z',1); S.xo.style.opacity=0; if(S.copy) S.copy.style.opacity=1; S.media.style.visibility='visible';
      S.subs.forEach(c=>{if(c.getBoundingClientRect().top<vh*.9)c.classList.add('on');});
    }
  });

  // details: horizontal track driven by vertical scroll
  if(hsSec){
    const st=hsSec.querySelector('.hs-stage');
    if(innerWidth>860){
      const avail=st.clientWidth-parseFloat(getComputedStyle(st).paddingLeft);
      const cw=avail/2.5; hsSec.style.setProperty('--cw',cw.toFixed(1)+'px');
      const bar=hsSec.querySelector('.hs-bar'), trackL=st.getBoundingClientRect().left+parseFloat(getComputedStyle(st).paddingLeft);
      const stopR=bar?bar.getBoundingClientRect().right:trackL+avail;   // last card ends where the red progress bar ends
      const travel=Math.max(0,trackL+hsTrack.scrollWidth-stopR);
      const sp=sceneP(hsSec);
      // 1) heading scrolls up to mid-screen, centred  2) slides left  3) rises to its place while the rest fades in  4) cards travel
      const h1=ease(clamp(sp/.14)), h2=ease(clamp((sp-.16)/.14));
      const pa=ease(clamp((sp-.13)/.04));   // side copy appears once the heading has reached the left, then rises with it
      const ha=ease(clamp((sp-.32)/.20));   // cards fade in after that
      const hp=ease(clamp((sp-.54)/.42));
      hsTrack.style.setProperty('--tx',(-travel*hp).toFixed(1)+'px');
      hsSec.style.setProperty('--hp',hp.toFixed(3));
      const hh=st.querySelector('.icons-head h2');
      if(hh){
        hh.style.transform='none';
        const r=hh.getBoundingClientRect(), sr=st.getBoundingClientRect();
        const dx=(sr.left+sr.width/2)-(r.left+r.width/2), dy=(sr.top+sr.height/2)-(r.top+r.height/2);
        hh.style.transform=`translate(${(dx*(1-h1)).toFixed(1)}px,${(dy*(1-h2)).toFixed(1)}px)`;
        const hpEl=st.querySelector('.icons-head p'); if(hpEl) hpEl.style.transform=`translateY(${(dy*(1-h2)+(1-pa)*16).toFixed(1)}px)`;
        hsSec.style.setProperty('--ha',ha.toFixed(3));hsSec.style.setProperty('--pa',pa.toFixed(3));
      }
    }else{hsTrack.style.setProperty('--tx','0px');const hh=st.querySelector('.icons-head h2');if(hh)hh.style.transform='';hsSec.style.setProperty('--ha','1');hsSec.style.setProperty('--pa','1');const hpEl=st.querySelector('.icons-head p');if(hpEl)hpEl.style.transform='';}
  }

  // claims fill
  // (claims are now part of the line scene, see below)

  // line X reveal
  // line scene, three phases on one pinned stage:
  //   0.00-0.36  the three box claims fill one after another
  //   0.38-0.56  zoom-and-dissolve: claims scale up, blur and fade while "Jedna linia" fades in behind them
  //   0.56-1.00  the X opens on the product line photo (previous behaviour)
  // the section got longer for the products; claims keep their old scroll distance (340vh of 480vh)
  const q=sceneP(linia)*480/340, n=fills.length;
  fills.forEach((el,i)=>{const a=.03+i*(.33/n), b=a+.33/n; el.style.setProperty('--f',(clamp((q-a)/(b-a))*100).toFixed(1)+'%');});
  const z=ease(clamp((q-.38)/.18));
  const cl=$('#claimsLayer');
  cl.style.setProperty('--cz',(1+z*2.6).toFixed(3)); cl.style.setProperty('--co',(1-z).toFixed(3)); cl.style.setProperty('--cb',(z*8).toFixed(1)+'px');
  cl.style.visibility=z>=1?'hidden':'visible';
  // product layers, one after another (box, drum, disc, pads): each starts centred on screen, large, blurred and dark,
  // then shrinks into its place while it sharpens and brightens. The box starts filling the viewport, the rest start smaller.
  const lp=clamp((q-.56)/(480/340-.56));
  lineSet.style.setProperty('--gs',lerp(1.12,.9,ease(clamp((lp-.2)/.8))).toFixed(3));
  { const gs=+lineSet.style.getPropertyValue('--gs')||1, W=lineSet.offsetWidth, H=lineSet.offsetHeight, cy=vh*.61;
    lineSets.forEach((el,i)=>{
      const a=i?.3+i*.13:.2, s=ease(clamp((lp-a)/(i?.3:.28)));
      const ew=el.offsetWidth, eh=el.offsetHeight;
      const fx=innerWidth/2+(el.offsetLeft+ew/2-W/2)*gs, fy=cy+(el.offsetTop+eh/2-H/2)*gs;
      const k=i?1.2:Math.max(innerWidth/(ew*gs), vh/(eh*gs))*1.05;
      // only the box travels from the centre; the rest shrink in place from their top-left corner (see CSS)
      // the pads (last) slide in from the left, starting 25% of the set's width before their place
      const offL=-W*.25;
      el.style.setProperty('--fx',(i===3?offL*(1-s):i?0:(innerWidth/2-fx)/gs*(1-s)).toFixed(1)+'px');
      el.style.setProperty('--fy',(i?0:(vh/2-fy)/gs*(1-s)).toFixed(1)+'px');
      el.style.setProperty('--ls',lerp(k,1,s).toFixed(3));
      el.style.setProperty('--lo',clamp((lp-a)/.04).toFixed(3)); el.style.setProperty('--lb',(24*(1-s)).toFixed(1)+'px');
      el.style.setProperty('--lv',(.2+.8*s).toFixed(3));}); }
  // tag rises from the centre to the top and stays above the products
  const up=ease(clamp(lp/.3));
  lineTag.style.top=lerp(50,26,up).toFixed(2)+'%'; lineTag.style.setProperty('--tf',up.toFixed(3)); lineTag.style.setProperty('--sk',(-14*up).toFixed(2)+'deg'); lineTag.style.setProperty('--lz',(1+.3*up).toFixed(3));
  lineTag.style.setProperty('--t',z.toFixed(3)); lineTag.style.setProperty('--ts',(0.6+0.4*z).toFixed(3));

  // rail
  let cur=0; chapters.forEach((c,i)=>{if(c&&c.getBoundingClientRect().top<vh*.5)cur=i;});
  rail.forEach((a,i)=>a.classList.toggle('on',i===cur));

  // fire mood per chapter
  if(Fire){
    const F=Fire.st; let tf=0,th=.25,ts=0,tsy=.3,tt=1;
    const heroVis=clamp(1-hp*1.2);
    ts=.85*heroVis; tsy=.42; tf=.32*heroVis; th=.2;
    const inHeat=heat.getBoundingClientRect(); const heatOn=inHeat.top<vh*.6&&inHeat.bottom>vh*.4;
    if(heatOn){tf=lerp(.25,.85,clamp(hp2/.8));th=lerp(.18,.38,clamp(hp2/.8));ts=.25;tsy=.75;tt=1.4;}
    const lr=linia.getBoundingClientRect(); if(lr.top<vh*.5&&lr.bottom>vh*.5){tf=.35*(1-clamp(lp/.6))+.15;th=.22;}
    const br=$('#hamuj'); if(br){const r=br.getBoundingClientRect(); if(r.top<vh*.7&&r.bottom>vh*.2){const c=clamp((vh*.7-r.top)/(vh*.5));tf=Math.max(tf,.55*c);th=.3;ts=Math.max(ts,.35*c);tsy=.55;}}
    const cr=contact.getBoundingClientRect(); if(cr.top<vh*.7){const c=clamp((vh*.7-cr.top)/(vh*.6));tf=Math.max(tf,.55*c);th=.3;ts=Math.max(ts,.35*c);tsy=.55;}
    // the form needs to stay readable: the fire dies down while it is on screen
    const fr=formWrap?formWrap.getBoundingClientRect():null;
    if(fr&&fr.top<vh*.85&&fr.bottom>0){const k=clamp((vh*.85-fr.top)/(vh*.4));tf=lerp(tf,.08,k);ts=lerp(ts,.05,k);th=lerp(th,.14,k);}
    FT.fire=tf;FT.height=th;FT.smoke=ts;FT.smokeY=tsy;FT.turb=tt;
  }
}

/* hero video: play only while visible, respect reduced motion */
const hv=$('#heroVideo');
if(hv){
  if(reduce){hv.removeAttribute('autoplay');hv.pause();}
  else{
    const vio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const p=hv.play();if(p)p.catch(()=>{});}else hv.pause();}),{threshold:.05});
    vio.observe(hv);
  }
}

/* loader: leave after the page has loaded and the X has finished drawing */
(function(){
  const L=$('#loader'); if(!L) return;
  const t0=performance.now(), minT=reduce?300:2800;
  let gone=false;
  function finish(){ if(gone) return; gone=true;
    setTimeout(()=>{L.classList.add('done');document.documentElement.classList.remove('loading');setTimeout(()=>L.remove(),900);},Math.max(0,minT-(performance.now()-t0)));}
  if(document.readyState==='complete') finish(); else addEventListener('load',finish);
  setTimeout(finish,5000);
})();

/* animated favicon: a red outline of the X with a glowing comet flying smoothly around it */
(function(){
  const link=document.getElementById('favicon'); if(!link||reduce) return;
  const S=64, c=document.createElement('canvas'); c.width=c.height=S; const g=c.getContext('2d');
  const pts=xPts(15).map(([x,y])=>[5+x*.54,5+y*.54]);
  const segs=[]; let per=0;
  for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length],l=Math.hypot(b[0]-a[0],b[1]-a[1]);segs.push([a,b,per,l]);per+=l;}
  const at=d=>{d=((d%per)+per)%per;for(const [a,b,s,l] of segs){if(d<=s+l){const k=(d-s)/l;return [a[0]+(b[0]-a[0])*k,a[1]+(b[1]-a[1])*k];}}return pts[0];};
  const outline=()=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath();};
  const LOOP=2600, TAIL=per*.34, N=26;
  let last=0;
  function draw(now){
    if(now-last<66) return; last=now;            // ~15 fps: every frame re-encodes a PNG, so keep it cheap
    const head=(now%LOOP)/LOOP*per;
    g.clearRect(0,0,S,S); g.lineJoin='round'; g.lineCap='round';
    g.strokeStyle='rgba(227,26,34,.38)'; g.lineWidth=3; outline(); g.stroke();
    for(let i=N;i>0;i--){                         // comet tail: segments fading out behind the head
      const p0=at(head-TAIL*i/N), p1=at(head-TAIL*(i-1)/N), k=1-i/N;
      g.strokeStyle=`rgba(255,${40+k*60|0},${40+k*50|0},${.15+k*.85})`; g.lineWidth=2.5+k*4;
      g.beginPath();g.moveTo(p0[0],p0[1]);g.lineTo(p1[0],p1[1]);g.stroke();
    }
    const h=at(head); const gr=g.createRadialGradient(h[0],h[1],0,h[0],h[1],9);
    gr.addColorStop(0,'rgba(255,170,160,1)');gr.addColorStop(.35,'rgba(255,50,50,.9)');gr.addColorStop(1,'rgba(227,26,34,0)');
    g.fillStyle=gr; g.beginPath(); g.arc(h[0],h[1],9,0,6.283); g.fill();
    link.href=c.toDataURL('image/png');
  }
  if(lite){draw(LOOP*.3);return;}               // weaker devices: static icon, no per-frame PNG encoding
  function raf(t){draw(t);requestAnimationFrame(raf);}
  requestAnimationFrame(raf);
  setInterval(()=>{if(document.hidden)draw(performance.now()+999);},1000);  // rAF pauses in background tabs
})();

/* contact headline: lines slide up one after another when it comes into view */
(function(){const h=$('#ctaHead'); if(!h) return;
  const io=new IntersectionObserver(es=>es.forEach(e=>{h.classList.toggle('in',e.isIntersecting);}),{threshold:.35});
  io.observe(h);})();

/* YouTube: the player (and Google's cookies) load only after the visitor clicks play */
$$('.yt').forEach(box=>{const b=box.querySelector('.yt-play'); if(!b) return;
  b.addEventListener('click',()=>{
    const f=document.createElement('iframe');
    f.src=`https://www.youtube-nocookie.com/embed/${encodeURIComponent(box.dataset.yt)}?autoplay=1&rel=0&modestbranding=1`;
    f.title=box.dataset.title||'Film'; f.allow='autoplay; encrypted-media; picture-in-picture; fullscreen'; f.allowFullscreen=true;
    box.appendChild(f); box.classList.add('on'); f.focus();
    track('xrace_video_play');
  });});

/* copy e-mail */
$('#copyMail')?.addEventListener('click',e=>{
  const b=e.currentTarget, el=$('#mail');
  const done=t=>{b.textContent=t;setTimeout(()=>b.textContent='Kopiuj adres',1600);};
  const sel=()=>{const r=document.createRange();r.selectNodeContents(el);const s=getSelection();s.removeAllRanges();s.addRange(r);done('Zaznaczono');};
  try{navigator.clipboard.writeText(el.textContent).then(()=>done('Skopiowano'),sel);}catch(err){sel();}
});

/* ---------- analytics: events go to dataLayer (picked up by GTM once it is enabled) ---------- */
function track(event,data){try{(window.dataLayer=window.dataLayer||[]).push(Object.assign({event},data||{}));}catch(e){}}
$$('[data-track]').forEach(a=>a.addEventListener('click',()=>track('xrace_'+a.dataset.track)));
{const y=$('#year'); if(y) y.textContent=new Date().getFullYear();}

/* ---------- dotted map: Poland, Czechia and Slovakia with every HART point ----------
   Dots are drawn on a canvas, markers sit in the SVG on top. No looping animation:
   the dots sweep in once, then the canvas only redraws when the pointer moves or a point is highlighted. */
(function(){
  const svg=$('#plMap'), list=$('#brList'), tip=$('#brTip'); if(!svg) return;
  const box=svg.parentElement, NS='http://www.w3.org/2000/svg';
  // simplified borders (lon,lat); shared stretches use the same points so the countries meet cleanly
  const PL=[[14.21,53.94],[14.45,53.93],[14.78,54.03],[15.58,54.18],[16.40,54.43],[16.85,54.59],[17.55,54.76],[18.33,54.83],[18.42,54.78],[18.55,54.52],[18.66,54.40],[19.00,54.36],[19.45,54.38],[19.63,54.45],[20.00,54.41],[20.50,54.38],[21.00,54.36],[21.50,54.33],[22.00,54.34],[22.79,54.36],[23.00,54.18],[23.30,54.05],[23.51,53.95],[23.75,53.50],[23.80,53.25],[23.93,53.00],[23.93,52.75],[23.65,52.50],[23.20,52.30],[23.55,52.10],[23.65,51.85],[23.62,51.53],[23.70,51.30],[24.11,50.86],[24.05,50.55],[23.70,50.38],[23.45,50.25],[23.05,49.98],[22.88,49.75],[22.65,49.55],[22.75,49.25],[22.56,49.08],[22.10,49.20],[21.80,49.38],[21.30,49.43],[20.90,49.35],[20.55,49.42],[20.20,49.33],[20.05,49.20],[19.80,49.20],[19.75,49.40],[19.47,49.60],[19.15,49.42],[18.85,49.52],[18.60,49.75],[18.55,49.92],[18.25,49.95],[17.85,50.05],[17.65,50.27],[17.20,50.38],[16.90,50.45],[16.85,50.20],[16.65,50.10],[16.45,50.32],[16.20,50.60],[16.05,50.65],[15.75,50.74],[15.30,50.85],[15.00,51.00],[14.82,50.87],[14.99,51.15],[14.97,51.40],[14.73,51.60],[14.60,51.85],[14.70,52.10],[14.55,52.35],[14.60,52.60],[14.15,52.85],[14.40,53.30],[14.27,53.70]];
  const CZ=[[12.09,50.32],[12.50,50.40],[13.00,50.50],[13.40,50.63],[13.85,50.73],[14.30,50.88],[14.40,51.04],[14.82,50.87],[15.00,51.00],[15.30,50.85],[15.75,50.74],[16.05,50.65],[16.20,50.60],[16.45,50.32],[16.65,50.10],[16.85,50.20],[16.90,50.45],[17.20,50.38],[17.65,50.27],[17.85,50.05],[18.25,49.95],[18.55,49.92],[18.60,49.75],[18.85,49.52],[18.40,49.35],[18.10,49.10],[17.75,48.92],[17.40,48.82],[16.95,48.62],[16.55,48.80],[16.10,48.75],[15.60,48.90],[15.10,49.00],[14.95,48.78],[14.70,48.58],[14.30,48.58],[13.80,48.78],[13.50,48.95],[13.10,49.20],[12.75,49.40],[12.50,49.70],[12.40,49.95],[12.20,50.10]];
  const SK=[[18.85,49.52],[19.15,49.42],[19.47,49.60],[19.75,49.40],[19.80,49.20],[20.05,49.20],[20.20,49.33],[20.55,49.42],[20.90,49.35],[21.30,49.43],[21.80,49.38],[22.10,49.20],[22.56,49.08],[22.40,48.70],[22.15,48.40],[21.70,48.35],[21.45,48.57],[20.85,48.55],[20.45,48.45],[20.15,48.25],[19.75,48.20],[19.45,48.10],[19.00,48.07],[18.80,47.85],[18.40,47.75],[17.75,47.75],[17.25,48.00],[17.10,48.10],[16.95,48.62],[17.40,48.82],[17.75,48.92],[18.10,49.10],[18.40,49.35]];
  const K=100, CX=Math.cos(51*Math.PI/180), LON0=11.85, LAT0=55;
  const proj=(lon,lat)=>[(lon-LON0)*CX*K,(LAT0-lat)*K];
  const shapes={PL:PL.map(([a,b])=>proj(a,b)),CZ:CZ.map(([a,b])=>proj(a,b)),SK:SK.map(([a,b])=>proj(a,b))};
  const inPoly=(poly,x,y)=>{let c=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const [xi,yi]=poly[i],[xj,yj]=poly[j];if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))c=!c;}return c;};
  const country=(x,y)=>{for(const k in shapes) if(inPoly(shapes[k],x,y)) return k; return null;};
  const W=Math.ceil((24.35-LON0)*CX*K), H=Math.ceil((LAT0-47.6)*K);
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  const data=(window.XRACE_FILIE||[]).filter(f=>isFinite(f.lat)&&isFinite(f.lon)).map(f=>Object.assign({},f,{p:proj(f.lon,f.lat),hot:false}));

  // dot grid, rows offset like a halftone screen; a one-dot gap is left along the borders between countries
  const STEP=9.5, G=STEP*.75, dots=[];
  for(let row=0,y=STEP/2;y<H;y+=STEP*.866,row++)
    for(let x=(row%2?STEP:STEP/2);x<W;x+=STEP){
      const c=country(x,y); if(!c) continue;
      if([[G,0],[-G,0],[0,G],[0,-G]].some(([dx,dy])=>{const n=country(x+dx,y+dy);return n&&n!==c;})) continue;
      dots.push({x,y,c,d:x/W*900+Math.random()*200});
    }
  [[18.56,54.70],[18.68,54.66],[18.79,54.62]].forEach(([a,b])=>{const [x,y]=proj(a,b);dots.push({x,y,c:'PL',d:x/W*900});});   // Hel
  dots.forEach(o=>{o.near=data.map(f=>Math.hypot(o.x-f.p[0],o.y-f.p[1]));});

  const cv=document.createElement('canvas'); cv.className='br-dots'; cv.setAttribute('aria-hidden','true'); box.insertBefore(cv,svg);
  const ctx=cv.getContext('2d');
  let sc=1, ox=0, oy=0, dpr=1;
  function size(){const r=svg.getBoundingClientRect(); dpr=Math.min(devicePixelRatio||1,2);
    cv.width=Math.round(r.width*dpr); cv.height=Math.round(r.height*dpr);
    sc=Math.min(r.width/W,r.height/H); ox=(r.width-W*sc)/2; oy=(r.height-H*sc)/2;}   // same letterboxing as the svg viewBox
  size();

  let px=-1e4, py=-1e4, t0=0, introEnd=0;
  const HEAT=34;
  function draw(now){
    const t=t0?now-t0:1e5;
    ctx.setTransform(dpr,0,0,dpr,0,0); ctx.clearRect(0,0,cv.width,cv.height);
    ctx.translate(ox,oy); ctx.scale(sc,sc);
    for(const o of dots){
      const ap=reduce?1:clamp((t-o.d)/650); if(ap<=0) continue;
      let heat=0;
      for(let i=0;i<data.length;i++){const R=data[i].hot?HEAT*2.2:HEAT; heat=Math.max(heat,(1-o.near[i]/R)*(data[i].hot?1:.55));}
      const pd=Math.hypot(o.x-px,o.y-py), hov=pd<60?(1-pd/60)*.5:0;
      const e=Math.min(1,Math.max(0,heat)+hov);
      const a=(.36+e*.64)*ap, r=(1.8+e*1.3)*(.4+.6*ap);
      ctx.fillStyle=e>.6?`rgba(255,${(70+(e-.6)*280)|0},${(50+(e-.6)*180)|0},${a})`:`rgba(227,26,34,${a})`;
      ctx.beginPath(); ctx.arc(o.x,o.y,r,0,6.283); ctx.fill();
    }
  }
  let queued=false;
  function redraw(){ if(queued) return; queued=true; requestAnimationFrame(now=>{queued=false; draw(now); if(t0&&now<introEnd) redraw();}); }
  addEventListener('resize',()=>{size();redraw();});
  box.addEventListener('pointermove',e=>{const r=svg.getBoundingClientRect();px=(e.clientX-r.left-ox)/sc;py=(e.clientY-r.top-oy)/sc;redraw();});
  box.addEventListener('pointerleave',()=>{px=py=-1e4;redraw();});

  // tooltip under the highlighted point
  function showTip(f,on){
    if(!tip) return;
    if(!on){tip.classList.remove('on');return;}
    tip.innerHTML=''; tip.append(f.miasto); if(f.nazwa){const s=document.createElement('small');s.textContent=f.nazwa;tip.appendChild(s);}
    tip.style.left=(ox+f.p[0]*sc)+'px'; tip.style.top=(oy+f.p[1]*sc)+'px'; tip.classList.add('on');
  }

  const NAMES={PL:'Polska',CZ:'Czechy',SK:'Słowacja'};

  // list grouped by country
  const groups={};
  if(list) Object.keys(NAMES).forEach(k=>{ if(!data.some(f=>f.kraj===k)) return;
    const g=document.createElement('div'); g.className='br-group';
    g.innerHTML='<h3 class="br-country"></h3><ul class="br-grid"></ul>'; g.querySelector('h3').textContent=NAMES[k].toUpperCase();
    list.appendChild(g); groups[k]=g.querySelector('ul'); });
  const telHref=t=>'tel:'+(t.trim().startsWith('+')?'+'+t.replace(/\D/g,''):'+48'+t.replace(/\D/g,''));

  data.forEach(f=>{
    const m=document.createElementNS(NS,'g'); m.setAttribute('class','mk '+(f.typ||'filia'));
    m.setAttribute('transform',`translate(${f.p[0].toFixed(1)} ${f.p[1].toFixed(1)})`);
    m.innerHTML=`<circle class="hit" r="11"/><circle class="core" r="${f.typ==='centrala'?6:4.6}"/>`;
    const tt=document.createElementNS(NS,'title'); tt.textContent=f.miasto+(f.nazwa?' – '+f.nazwa:''); m.appendChild(tt);
    svg.appendChild(m);
    let li=null;
    const on=v=>{f.hot=v;m.classList.toggle('hot',v);if(li)li.classList.toggle('hot',v);showTip(f,v);redraw();};
    m.addEventListener('mouseenter',()=>on(true)); m.addEventListener('mouseleave',()=>on(false));
    m.addEventListener('click',()=>{ if(li){const u=li.parentElement;if(u.classList.contains('folded')){u.classList.remove('folded');const b=u.nextElementSibling;if(b&&b.classList.contains('br-more'))b.textContent='Zwiń listę';} li.scrollIntoView({behavior:reduce?'auto':'smooth',block:'center'});} });
    const ul=groups[f.kraj]; if(!ul) return;
    li=document.createElement('li'); li.className='br';
    li.innerHTML=`<h4></h4>${f.nazwa?'<span class="nm"></span>':''}<span class="ad"></span>${f.tel?'<a class="tel"></a>':''}${f.email?'<a class="em"></a>':''}<a class="route" target="_blank" rel="noopener">Wyznacz trasę</a>`;
    li.querySelector('h4').textContent=f.miasto;
    if(f.nazwa) li.querySelector('.nm').textContent=f.nazwa;
    li.querySelector('.ad').textContent=f.adres||'';
    if(f.tel){const a=li.querySelector('.tel');a.textContent=f.tel;a.href=telHref(f.tel);}
    if(f.email){const a=li.querySelector('.em');a.textContent=f.email;a.href='mailto:'+f.email;}
    const r=li.querySelector('.route'); r.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent('HART '+f.adres);
    r.addEventListener('click',()=>track('xrace_route',{miasto:f.miasto}));
    li.addEventListener('mouseenter',()=>on(true)); li.addEventListener('mouseleave',()=>on(false));
    li.addEventListener('focusin',()=>on(true)); li.addEventListener('focusout',()=>on(false));
    ul.appendChild(li);
  });

  // long groups start folded (two rows on desktop, four cards on phones); the map always shows every point
  Object.values(groups).forEach(ul=>{
    const items=[...ul.children]; if(items.length>4) ul.parentElement.classList.add('big'); if(items.length<=5) return;
    ul.classList.add('folded');
    const b=document.createElement('button'); b.type='button'; b.className='pill br-more';
    const label=()=>{b.textContent=ul.classList.contains('folded')?`Pokaż wszystkie (${items.length})`:'Zwiń listę';};
    label();
    b.addEventListener('click',()=>{ul.classList.toggle('folded');label();if(ul.classList.contains('folded'))ul.parentElement.scrollIntoView({behavior:reduce?'auto':'smooth',block:'start'});});
    ul.after(b);
  });

  // the sweep-in plays once, the first time the map comes into view
  const io=new IntersectionObserver(es=>es.forEach(e=>{
    if(e.isIntersecting&&!t0){ t0=performance.now(); introEnd=t0+(reduce?0:1900); svg.classList.add('in'); size(); redraw(); io.disconnect(); }
  }),{threshold:.15});
  io.observe(box);
})();

/* ---------- inquiry form ---------- */
(function(){
  const form=$('#xform'), sec=$('#kontakt'); if(!form||!sec) return;
  const steps=$$('#xform .fstep'), bars=$$('#xform .fprog i'), status=$('#fstatus'), btn=$('#xsend'), back=$('#fBack');
  const done=$('#fDone'), near=$('#fNear'), city=form.elements.miasto;
  const TYP={sklep:['Sklep','sklepu'],warsztat:['Warsztat','warsztatu'],hurtownia:['Hurtownia','hurtowni']};
  let step=0, branch=null;

  // desktop: once the visitor scrolls past ~35% of the section, the steps give way to the form card
  const wide=matchMedia('(min-width:1001px)');
  let locked=false;   // after the first interaction the form stays, scrolling back won't hide it
  function onScroll(){
    if(locked||!wide.matches){sec.classList.add('form-on');return;}
    const r=sec.getBoundingClientRect(), p=-r.top/Math.max(1,r.height-innerHeight);
    sec.classList.toggle('form-on',p>.35);
  }
  addEventListener('scroll',onScroll,{passive:true}); addEventListener('resize',onScroll); onScroll();
  form.addEventListener('focusin',()=>{locked=true;sec.classList.add('form-on');});

  // CTAs elsewhere on the page jump straight to the form, already swapped in
  $$('a[href="#formularz"]').forEach(a=>a.addEventListener('click',e=>{
    const v=a.dataset.typ; if(v){const r=form.querySelector(`input[name="typ"][value="${v}"]`); if(r) r.checked=true;}
    track('xrace_cta',{typ:v});
    if(!wide.matches) return;
    e.preventDefault(); locked=true; sec.classList.add('form-on');
    scrollTo({top:sec.offsetTop+(sec.offsetHeight-innerHeight)*.5,behavior:reduce?'auto':'smooth'});
  }));

  const say=(t,kind)=>{status.textContent=t;status.className='fstatus'+(kind?' '+kind:'');};
  function show(i){
    step=i;
    steps.forEach((s,k)=>{s.hidden=k!==i;});
    bars.forEach((b,k)=>b.classList.toggle('on',k<=i));
    $('#fStepNo').textContent=`Krok ${i+1} z ${steps.length}`;
    $('#fStepName').textContent=steps[i].dataset.name;
    back.hidden=i===0;
    btn.textContent=i===steps.length-1?'Wyślij zgłoszenie':'Dalej';
    const t=TYP[form.elements.typ.value]||TYP.sklep;
    $('#fChip').textContent=t[0]; $('#fFor').textContent=t[1];
    say('');
  }

  // nearest branch: the typed town matched against the branch list (js/filie.js)
  const norm=s=>s.toLowerCase().replace(/ł/g,'l').normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
  const PIN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  city.addEventListener('input',()=>{
    const q=norm(city.value);
    branch=q.length>=3?(window.XRACE_FILIE||[]).find(f=>norm(f.miasto).startsWith(q)):null;
    near.hidden=!branch;
    if(branch) near.innerHTML=`${PIN}<span>Najbliżej: ${branch.miasto}, ${branch.typ==='centrala'?'centrala':'filia'} HART</span>`;
  });

  // a field marked wrong is cleared as soon as it's fixed, not only on the next click
  form.addEventListener('input',e=>{if(e.target.checkValidity&&e.target.checkValidity())e.target.removeAttribute('aria-invalid');});
  let started=false; form.addEventListener('focusin',()=>{if(!started){started=true;track('xrace_form_start');}});
  back.addEventListener('click',()=>show(step-1));

  form.addEventListener('submit',e=>{
    e.preventDefault();
    // no validation for now: every step moves on whatever is filled in
    if(step<steps.length-1){show(step+1);track('xrace_form_step',{step:step+1});steps[step].querySelector('input:not([type=radio])')?.focus();return;}

    // TODO: wysyłka do /api/contact; na razie zgłoszenie nigdzie nie trafia, pokazujemy tylko potwierdzenie
    const d=Object.fromEntries(new FormData(form).entries());
    btn.disabled=true;
    setTimeout(()=>{
      btn.disabled=false;
      track('xrace_form_submit',{typ:d.typ});
      const where=branch?`do&nbsp;filii HART w&nbsp;${branch.miasto}`:'do&nbsp;najbliższej filii HART';
      $('#fDoneTxt').innerHTML=`Witamy w&nbsp;gronie partnerów X-Race. Przekazaliśmy zgłoszenie ${where}, a&nbsp;handlowiec odezwie się${d.email?' na&nbsp;<b></b>':''} z&nbsp;ofertą dla Twojego ${(TYP[d.typ]||TYP.sklep)[1]}. Już niedługo Twoi klienci będą hamować później i&nbsp;wychodzić z&nbsp;zakrętów mocniej.`;
      if(d.email) $('#fDoneTxt b').textContent=d.email;
      form.hidden=true; done.hidden=false; done.focus();
    },500);
  });

  $('#fReset').addEventListener('click',()=>{
    form.reset(); branch=null; near.hidden=true;
    form.hidden=false; done.hidden=true; show(0);
    scrollTo({top:0,behavior:reduce?'auto':'smooth'});
  });
  show(0);
})();

/* loop */
let last=performance.now();
/* layout is only read and written when the page actually scrolled or resized */
let dirty=true, frame=0;
addEventListener('scroll',()=>{dirty=true;},{passive:true});
addEventListener('resize',()=>{dirty=true;});
function loop(now){const dt=Math.min(.05,(now-last)/1000);last=now;
  if(dirty){dirty=false;try{update();}catch(err){console.error(err);}}   // one broken element must never stop the other animations
  vel*=Math.pow(.05,dt);
  if(Fire){
    const F=Fire.st, k=1-Math.pow(.006,dt);
    for(const key in FT) F[key]=lerp(F[key],FT[key],k);
    if(Embers) Embers.st.rate=8+F.fire*80+F.smoke*12;
    if((frame++&1)===0) Fire.draw(now/1000);     // fire at ~30 fps is visually identical
  }
  if(Embers) Embers.step(dt);
  requestAnimationFrame(loop);}
try{update();}catch(err){console.error(err);} requestAnimationFrame(loop);
})();
