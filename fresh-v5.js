/* Marathon LiveOps V5.5 — clean stable UI helper
   IMPORTANT:
   - Does NOT override launch(), navigate(), setHead(), pages, menus or authentication.
   - No body-wide MutationObserver.
   - Back button uses the app's real current page/title and the existing navigate() function.
*/
(function(){
  const q=(s,r=document)=>r.querySelector(s);
  const safe=(v,f='')=>String(v??f).trim()||f;

  let loginInstalled=false;
  let geoState='DEVICE TIME';

  function project(){
    const p=(typeof state!=='undefined' && state?.project) ? state.project : {};
    const eventWhen=safe(
      p.eventDay || [p.date,p.time].filter(Boolean).join(' • '),
      'Event Date'
    );
    return {
      name:safe(p.name,'Marathon LiveOps Event'),
      location:safe(p.location || p.eventLocation,'Kolkata'),
      eventWhen,
      logo:safe(p.eventLogo,'TS'),
      logoData:safe(p.eventLogoData,'')
    };
  }

  /* ---------------- LOGIN FEEDBACK ---------------- */
  function installLoginFeedback(){
    if(loginInstalled) return;
    const form=q('#loginForm');
    const btn=form?.querySelector('button[type="submit"]');
    if(!form || !btn) return;

    loginInstalled=true;
    const original=btn.innerHTML;

    function reset(){
      btn.classList.remove('ml-login-busy');
      btn.innerHTML=original;
    }

    btn.addEventListener('pointerdown',()=>{
      btn.classList.add('ml-login-busy');
      btn.innerHTML='<span class="ml-login-spinner"></span><span>Logging in…</span>';
    },{passive:true});

    btn.addEventListener('click',()=>{
      setTimeout(()=>{
        const modal=q('#loginModal');
        if(modal && !modal.classList.contains('hidden')) reset();
      },1300);
    });

    const modal=q('#loginModal');
    if(modal){
      new MutationObserver(()=>{
        if(!modal.classList.contains('hidden')) reset();
      }).observe(modal,{attributes:true,attributeFilter:['class']});
    }
  }

  /* ---------------- EVENT HEADER ---------------- */
  function tickClock(){
    const now=new Date();
    if(q('#mlNowTime')) q('#mlNowTime').textContent=
      now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit',second:'2-digit'});
    if(q('#mlNowDate')) q('#mlNowDate').textContent=
      now.toLocaleDateString([], {day:'2-digit',month:'short',year:'numeric'}).toUpperCase();
    if(q('#mlGeoState')) q('#mlGeoState').textContent=geoState;
  }

  function decorateHeader(){
    const shell=q('#appShell');
    if(!shell || shell.classList.contains('hidden')) return;

    const header=q('.app-header');
    const actions=q('.header-actions',header);
    if(!header || !actions) return;

    const p=project();

    /* The page title/subtitle remain in the DOM only for navigation/back logic.
       They must never be shown in the logged-in header. */
    const pageCopy=q('.page-heading-copy',header) || q('#pageTitle',header)?.parentElement;
    if(pageCopy){
      pageCopy.classList.add('page-heading-copy');
      pageCopy.style.display='none';
    }

    let eventHead=q('.ml-event-head',header);
    if(!eventHead){
      eventHead=document.createElement('div');
      eventHead.className='ml-event-head';
      header.insertBefore(eventHead,actions);
    }

    const signature=[p.name,p.eventWhen,p.location,p.logo,p.logoData].join('|');
    if(eventHead.dataset.signature!==signature){
      eventHead.dataset.signature=signature;
      eventHead.innerHTML=
        '<div class="ml-event-logo">'+(p.logoData?'<img src="'+p.logoData+'" alt="Event logo">':p.logo)+'</div>'+
        '<div class="ml-event-copy">'+
          '<div class="ml-event-name">'+p.name+'</div>'+
          '<div class="ml-event-meta">'+
            '<span class="ml-event-when">'+p.eventWhen+'</span>'+
            '<span class="ml-event-location">⌖ '+p.location+'</span>'+
          '</div>'+
        '</div>';
    }

    const acct=q('#accountIdentity',actions);
    if(acct) acct.style.display='none';

    if(!q('#mlTimeCard',actions)){
      const c=document.createElement('div');
      c.id='mlTimeCard';
      c.className='ml-time-card';
      c.innerHTML=
        '<small>Live Date & Time</small>'+
        '<strong id="mlNowTime">--:--:--</strong>'+
        '<span><b id="mlNowDate">--</b> • <i id="mlGeoState" style="font-style:normal">DEVICE TIME</i></span>';
      actions.prepend(c);
    }

    /* Event date is now part of the marathon details block.
       Remove any old standalone Event Date card left by a previous version. */
    const oldEventDate=q('#mlEventDateCard',actions);
    if(oldEventDate) oldEventDate.remove();

    tickClock();
  }

  /* ---------------- RELIABLE BACK BUTTON ---------------- */
  function currentTitle(){
    return safe(q('#pageTitle')?.textContent,'');
  }

  function targetForBack(){
    const role=(typeof session!=='undefined') ? session?.role : null;
    const page=(typeof session!=='undefined') ? session?.page : null;
    const title=currentTitle();

    if(role==='admin'){
      // renderTaskForm() does NOT change session.page; title tells us we're inside the task form.
      if(title==='Create / Configure Task' || title==='Edit Task') return 'tasks';

      // Main project tools should return to Projects.
      if(page==='tasks' || page==='fields' || page==='vendors' || page==='proof') return 'projects';

      // Projects returns to Dashboard.
      if(page==='projects') return 'dashboard';

      // Other inner Command Center pages return to Dashboard.
      if(page && page!=='dashboard') return 'dashboard';

      return null;
    }

    if(role==='ops'){
      return page && page!=='ops-home' ? 'ops-home' : null;
    }

    if(role==='client'){
      return page && page!=='client-overview' ? 'client-overview' : null;
    }

    return null;
  }

  function ensureBackButton(){
    const shell=q('#appShell');
    const content=q('#appContent');
    if(!shell || shell.classList.contains('hidden') || !content) return;

    const target=targetForBack();
    let bar=q('#mlSafeContext',content);

    if(!target){
      if(bar) bar.remove();
      return;
    }

    if(!bar){
      bar=document.createElement('div');
      bar.id='mlSafeContext';
      bar.className='ml-safe-context';
      bar.innerHTML=
        '<div class="ml-safe-left">'+
          '<button type="button" class="ml-safe-back" id="mlSafeBack">← Back</button>'+
        '</div>';
      content.prepend(bar);
    }

    const btn=q('#mlSafeBack',bar);
    if(btn && btn.dataset.target!==target){
      btn.dataset.target=target;
      btn.onclick=function(e){
        e.preventDefault();
        e.stopPropagation();
        const destination=this.dataset.target;
        if(destination && typeof navigate==='function'){
          navigate(destination);
        }
      };
    }
  }

  /* Geolocation only verifies that location access succeeded.
     Clock still comes from the device/browser timezone. */
  if(navigator.geolocation){
    try{
      navigator.geolocation.getCurrentPosition(
        ()=>{geoState='GPS VERIFIED';tickClock();},
        ()=>{geoState='DEVICE TIME';tickClock();},
        {enableHighAccuracy:true,timeout:5000,maximumAge:60000}
      );
    }catch(e){}
  }

  function refresh(){
    installLoginFeedback();
    decorateHeader();
    ensureBackButton();
    tickClock();
  }

  // Simple polling is intentional here: it observes state without modifying core app functions.
  refresh();
  setInterval(refresh,500);
})();
