
/* Marathon LiveOps — Login V2 safe enhancement
   Loaded AFTER app.js. No existing app.js logic is replaced on disk. */
(function(){
  const q=(s,r=document)=>r.querySelector(s);
  const escText=(v,fallback='')=>String(v??fallback).trim()||fallback;
  const initials=(text='ML')=>escText(text,'ML').split(/\s+/).slice(0,2).map(x=>x[0]||'').join('').toUpperCase()||'ML';

  // Optional real logos can be inserted later without changing the login design.
  // Example: eventLogoUrl:'event-logo.png', clientLogoUrl:'client-logo.png'
  const config={
    eventLogoUrl:'',
    clientLogoUrl:'',
    defaultLocation:'Kolkata',
    defaultDate:'Event Date',
    defaultTime:'Event Time',
    defaultClientName:'Client Account'
  };

  function projectInfo(){
    const p=(typeof state!=='undefined' && state?.project) ? state.project : {};
    return {
      name:escText(p.name,'Marathon LiveOps Event'),
      location:escText(p.eventLocation,config.defaultLocation),
      date:escText(p.eventDate || p.eventDay,config.defaultDate),
      time:escText(p.eventTime,config.defaultTime),
      clientName:escText(p.clientName,config.defaultClientName),
      eventLogo:escText(p.eventLogo,initials(p.name||'ML')),
      clientLogo:escText(p.clientLogo,initials(p.clientName||'Client'))
    };
  }

  function logoMarkup(url,text){
    return url ? '<img src="'+url+'" alt="">' : text;
  }

  function ensureLoginIdentity(){
    const pane=q('.login-pane');
    if(!pane || q('#loginEventCard')) return;
    const card=document.createElement('div');
    card.className='login-event-card';
    card.id='loginEventCard';
    card.innerHTML=
      '<div class="login-event-logo" id="loginEventLogo">ML</div>'+
      '<div class="login-event-copy">'+
        '<small>LIVE EVENT ACCESS</small>'+
        '<strong id="loginEventName">Marathon LiveOps Event</strong>'+
        '<div class="login-event-meta">'+
          '<span id="loginEventLocation">⌖ Event Location</span>'+
          '<span id="loginEventDate">◷ Event Date</span>'+
          '<span id="loginEventTime">◷ Event Time</span>'+
        '</div>'+
      '</div>';
    pane.prepend(card);

    const eyebrow=q('#loginAccess');
    if(eyebrow){
      eyebrow.classList.add('login-role-chip');
      eyebrow.classList.remove('eyebrow','dark');
    }
  }

  function fillLoginIdentity(){
    ensureLoginIdentity();
    const p=projectInfo();
    if(q('#loginEventName')) q('#loginEventName').textContent=p.name;
    if(q('#loginEventLocation')) q('#loginEventLocation').textContent='⌖ '+p.location;
    if(q('#loginEventDate')) q('#loginEventDate').textContent='◷ '+p.date;
    if(q('#loginEventTime')) q('#loginEventTime').textContent='◷ '+p.time;
    if(q('#loginEventLogo')) q('#loginEventLogo').innerHTML=logoMarkup(config.eventLogoUrl,p.eventLogo);
  }

  function ensureAccountIdentity(){
    const host=q('.header-actions');
    if(!host || q('#accountIdentity')) return;
    const box=document.createElement('div');
    box.className='account-identity';
    box.id='accountIdentity';
    box.innerHTML=
      '<span class="account-logo" id="accountLogo">ML</span>'+
      '<span class="account-copy">'+
        '<strong id="accountName">Marathon LiveOps</strong>'+
        '<small id="accountRole">Secure access</small>'+
      '</span>';
    host.prepend(box);
  }

  function fillAccountIdentity(user){
    ensureAccountIdentity();
    const p=projectInfo();
    const role=user?.role || (typeof session!=='undefined' ? session?.role : '');
    const roleLabel=role==='admin'?'Command Center':role==='ops'?'Operations Team':'Client Access';
    const displayName=role==='client' ? p.clientName : escText(user?.name,'Marathon LiveOps');
    const logoText=role==='client' ? p.clientLogo : role==='admin' ? 'ML' : initials(user?.name||'Ops');
    const logoUrl=role==='client' ? config.clientLogoUrl : '';
    if(q('#accountName')) q('#accountName').textContent=displayName;
    if(q('#accountRole')) q('#accountRole').textContent=roleLabel+' • '+p.name;
    if(q('#accountLogo')) q('#accountLogo').innerHTML=logoMarkup(logoUrl,logoText);
  }

  ensureLoginIdentity();
  ensureAccountIdentity();

  // Preserve all current authentication behavior and add role-specific presentation.
  if(typeof openLogin==='function'){
    const originalOpenLogin=openLogin;
    openLogin=function(role){
      originalOpenLogin(role);
      fillLoginIdentity();
      const copy={
        ops:['OPS ACCESS','Your ground. Your tasks. Your updates.','Live field access for assigned work, updates and proof.'],
        client:['CLIENT ACCESS','Your event. Live verified visibility.','Secure access to approved progress, proof, approvals and messages.'],
        admin:['COMMAND CENTER','Command the entire operation.','Control people, tasks, proof, visibility, escalation and client communication.']
      }[role];
      if(copy){
        if(q('#loginAccess')) q('#loginAccess').textContent=copy[0];
        if(q('#loginTitle')) q('#loginTitle').textContent=copy[1];
        if(q('#loginHelp')) q('#loginHelp').textContent=copy[2];
      }
    };
  }

  // Preserve current launch/dashboard routing and only enrich the header.
  if(typeof launch==='function'){
    const originalLaunch=launch;
    launch=function(user){
      originalLaunch(user);
      fillAccountIdentity(user);
    };
  }

  // Keep identity correct if the project data changes during the session.
  const shell=q('#appShell');
  if(shell){
    new MutationObserver(()=>{
      if(!shell.classList.contains('hidden') && typeof session!=='undefined' && session?.user){
        fillAccountIdentity(session.user);
      }
    }).observe(shell,{attributes:true,attributeFilter:['class']});
  }
})();
