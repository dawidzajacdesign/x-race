/* ---------- cookie consent + Google Consent Mode v2 ----------
   Defaults (all denied) are set inline in <head>. Here: read the saved choice, show the card when there is none,
   update consent and load GTM only after the visitor allows analytics or marketing. */
(function(){
  const GTM_ID='GTM-5CHM8CFF';
  const KEY='xr_consent', VERSION=1, MAX_AGE=365*864e5;   // ask again after 12 months or when VERSION changes
  const box=document.getElementById('cookies'); if(!box) return;
  const prefs=box.querySelector('#ckPrefs'), btn=n=>box.querySelector(`[data-ck="${n}"]`);
  const inp=n=>prefs.querySelector(`input[name="${n}"]`);
  const gtag=window.gtag||function(){(window.dataLayer=window.dataLayer||[]).push(arguments);};

  function load(){
    try{const c=JSON.parse(localStorage.getItem(KEY));
      if(c&&c.v===VERSION&&Date.now()-c.t<MAX_AGE) return c;}catch(e){}
    return null;
  }
  function save(c){try{localStorage.setItem(KEY,JSON.stringify(c));}catch(e){}}

  let gtmLoaded=false;
  function loadGTM(){
    if(gtmLoaded) return; gtmLoaded=true;
    dataLayer.push({'gtm.start':Date.now(),event:'gtm.js'});
    const s=document.createElement('script'); s.async=true; s.src='https://www.googletagmanager.com/gtm.js?id='+GTM_ID;
    document.head.appendChild(s);
  }

  function apply(c){
    const a=c.analytics?'granted':'denied', m=c.marketing?'granted':'denied';
    gtag('consent','update',{analytics_storage:a,ad_storage:m,ad_user_data:m,ad_personalization:m});
    dataLayer.push({event:'xrace_consent',consent_analytics:a,consent_marketing:m});
    if(c.analytics||c.marketing) loadGTM();
  }

  function choose(analytics,marketing){
    const c={v:VERSION,t:Date.now(),analytics,marketing};
    save(c); apply(c); close();
  }

  let lastFocus=null;
  function open(){
    const c=load()||{analytics:false,marketing:false};
    inp('analytics').checked=!!c.analytics; inp('marketing').checked=!!c.marketing;
    lastFocus=document.activeElement;
    box.hidden=false;
  }
  function close(){
    const back=box.contains(document.activeElement);
    box.hidden=true; togglePrefs(false,false);
    if(back&&lastFocus&&lastFocus!==document.body) lastFocus.focus({preventScroll:true});
  }
  function togglePrefs(on,focus=true){
    prefs.hidden=!on; btn('prefs').hidden=on; btn('save').hidden=!on;
    btn('prefs').setAttribute('aria-expanded',on);
    if(on&&focus) inp('analytics').focus({preventScroll:true});
  }

  btn('all').addEventListener('click',()=>choose(true,true));
  btn('necessary').addEventListener('click',()=>choose(false,false));
  btn('prefs').addEventListener('click',()=>togglePrefs(true));
  btn('save').addEventListener('click',()=>choose(inp('analytics').checked,inp('marketing').checked));
  document.querySelectorAll('[data-ck-open]').forEach(b=>b.addEventListener('click',()=>{open();togglePrefs(true);}));

  const saved=load();
  if(saved) apply(saved); else open();
})();
