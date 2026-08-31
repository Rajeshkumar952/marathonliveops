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
    return {
      name:safe(p.name,'Marathon LiveOps Event'),
      location:safe(p.eventLocation,'Kolkata'),
      eventDate:safe(p.eventDate || p.eventDay,'Event Date'),
      logo:safe(p.eventLogo,'TS')
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

    const originalTitle=header.firstElementChild;
    if(originalTitle && !originalTitle.classList.contains('ml-event-head')){
      originalTitle.style.display='none';
    }

    let eventHead=q('.ml-event-head',header);
    if(!eventHead){
      eventHead=document.createElement('div');
      eventHead.className='ml-event-head';
      header.insertBefore(eventHead,header.firstChild);
    }

    const desiredName=p.name;
    if(eventHead.dataset.name!==desiredName || eventHead.dataset.location!==p.location){
      eventHead.dataset.name=desiredName;
      eventHead.dataset.location=p.location;
      eventHead.innerHTML=
        '<div class="ml-event-logo">'+p.logo+'</div>'+
        '<div><div class="ml-event-name">'+p.name+'</div>'+
        '<div class="ml-event-location">⌖ '+p.location+'</div></div>';
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

    if(!q('#mlEventDateCard',actions)){
      const d=document.createElement('div');
      d.id='mlEventDateCard';
      d.className='ml-event-date-card';
      d.innerHTML='<small>Event Date</small><strong id="mlEventDate"></strong>';
      const live=q('.live-pill',actions);
      actions.insertBefore(d,live || actions.firstChild);
    }

    if(q('#mlEventDate')) q('#mlEventDate').textContent=p.eventDate;
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
