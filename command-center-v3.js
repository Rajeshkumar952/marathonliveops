/* Marathon LiveOps — Command Center V3
   Additive UI only. Authentication is intentionally untouched. */
(function(){
  const q=(s,r=document)=>r.querySelector(s);
  const qa=(s,r=document)=>[...r.querySelectorAll(s)];

  const style=document.createElement('style');
  style.textContent=`
    .live-pill.cc-live{cursor:pointer;user-select:none}
    .live-pill.cc-live::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:currentColor;margin-right:5px;animation:ccPulse 1.25s infinite}
    @keyframes ccPulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.28;transform:scale(.72)}}
    #syncBadge{display:none!important}
    .cc-project-actions{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:14px}
    .cc-project-tool{border:1px solid #e1e7ee;border-radius:13px;background:#fff;padding:15px;text-align:left;cursor:pointer}
    .cc-project-tool b{display:block;font:800 11px Manrope;margin-bottom:4px}.cc-project-tool small{color:#6c7784;font-size:9px;line-height:1.35}
    .cc-live-feed{display:grid;gap:10px}.cc-live-row{display:grid;grid-template-columns:110px 1fr auto;gap:12px;align-items:center;padding:11px 0;border-bottom:1px solid #e9edf2}
    .cc-live-row:last-child{border-bottom:0}.cc-live-row small{color:#6b7683}
    .cc-proof-strip{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.cc-proof-mini{border:1px solid #e2e8ef;border-radius:12px;padding:11px;background:#fff}
    .cc-proof-mini b{display:block;font-size:10px;margin-bottom:5px}.cc-proof-mini small{font-size:9px;color:#6b7683}
    .cc-chatbot-fab{position:fixed;right:22px;bottom:22px;z-index:120;width:58px;height:58px;border:0;border-radius:50%;background:#0b2a47;color:#fff;font:800 20px Manrope;box-shadow:0 14px 35px rgba(3,18,34,.25);cursor:pointer}
    .cc-chatbot-fab.hidden{display:none}.cc-chatbot-fab .cc-badge{position:absolute;right:-2px;top:-3px;min-width:19px;height:19px;padding:0 5px;border-radius:999px;display:grid;place-items:center;background:#e5484d;color:#fff;font:800 9px Inter}
    .cc-chatbot-panel{position:fixed;right:20px;bottom:90px;z-index:119;width:min(390px,calc(100vw - 24px));max-height:72vh;background:#fff;border:1px solid #dfe6ee;border-radius:16px;box-shadow:0 20px 60px rgba(4,19,33,.2);overflow:hidden}
    .cc-chatbot-panel.hidden{display:none}.cc-chatbot-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:#071b2e;color:#fff}
    .cc-chatbot-head strong{font:800 13px Manrope}.cc-chatbot-head button{border:0;background:transparent;color:#fff;font-size:20px;cursor:pointer}
    .cc-chatbot-body{padding:12px;overflow:auto;max-height:calc(72vh - 54px)}.cc-thread{padding:11px;border:1px solid #e4e9ef;border-radius:11px;margin-bottom:9px;cursor:pointer}
    .cc-thread b{display:block;font-size:11px}.cc-thread small{display:block;margin-top:4px;color:#6f7b88;font-size:9px;line-height:1.35}
    .cc-access-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:16px}.cc-access-card{padding:14px;border:1px solid #e2e8ef;border-radius:12px;background:#fff}
    .cc-access-card strong{display:block;font:800 18px Manrope}.cc-access-card span{font-size:9px;color:#6e7985}
    .cc-control-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}.cc-control-list{display:grid;gap:10px}.cc-control-line{display:flex;justify-content:space-between;gap:12px;align-items:center;padding:10px 0;border-bottom:1px solid #e8edf2}
    .cc-control-line span{font-size:10px}.cc-switch{border:0;border-radius:999px;padding:6px 9px;font-size:8px;font-weight:800;background:#e9eef4;color:#586574;cursor:pointer}.cc-switch.on{background:#e7f7ee;color:#15724a}
    .cc-export-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-top:14px}.cc-export{padding:13px;border:1px solid #dfe6ed;background:#fff;border-radius:11px;cursor:pointer;font:700 10px Inter}
    .cc-settings-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px}.cc-setting-card{border:1px solid #e0e7ee;border-radius:12px;padding:14px;background:#fff}
    @media(max-width:760px){.cc-project-actions,.cc-proof-strip,.cc-access-grid,.cc-export-grid{grid-template-columns:1fr 1fr}.cc-control-grid,.cc-settings-grid{grid-template-columns:1fr}.cc-live-row{grid-template-columns:80px 1fr}.cc-live-row>:last-child{grid-column:2}}
  `;
  document.head.appendChild(style);

  function configureHeader(){
    const live=q('.live-pill');
    if(live){
      live.classList.add('cc-live');
      live.textContent='LIVE';
      live.title='Refresh latest project status';
      live.onclick=()=>{
        if(typeof session!=='undefined' && session?.page && typeof navigate==='function') navigate(session.page);
        if(typeof toast==='function') toast('Latest project status refreshed.');
      };
    }
  }

  function installMenu(){
    if(typeof menus==='undefined') return;
    menus.admin=[
      ['dashboard','▦','Dashboard'],
      ['projects','▣','Projects'],
      ['access-control','♟','Access Control'],
      ['issues','!','Issues'],
      ['ops-control','⌁','Ops Control'],
      ['client-control','◉','Client Control'],
      ['reports','▥','Reports & Archive'],
      ['settings','⚙','Settings']
    ];
  }

  function installPages(){
    if(typeof pages==='undefined') return;

    pages.dashboard=function(){
      if(!hasProject()){setHead('Command Centre','');q('#appContent').innerHTML=noProjectHtml();return;}
      setHead('Live Project Control',state.project.name+' • '+state.project.eventDay);
      const pending=state.tasks.filter(t=>t.status==='Finished'&&!t.verified);
      const active=state.tasks.filter(t=>/working|started/i.test(t.status));
      const blocked=state.tasks.filter(t=>/blocked|unable/i.test(t.status));
      const latest=state.tasks.slice(0,6);

      q('#appContent').innerHTML=
        '<div class="kpi-grid">'+
          stat('PROJECT READY',state.project.readiness+'%')+
          stat('WORKING',active.length,'blue')+
          stat('ISSUES',state.issues.length,'amber')+
          stat('BLOCKED',blocked.length,'red')+
          stat('PROOF TO VERIFY',pending.length,'amber')+
        '</div>'+
        '<div class="panel-grid">'+
          '<div class="panel"><h3>LIVE PROJECT UPDATE</h3><div class="cc-live-feed">'+
            latest.map(t=>'<div class="cc-live-row"><small>'+t.id+'</small><div><b>'+esc(t.name)+'</b><br><small>'+esc(t.department)+' • '+esc(t.zone)+'</small></div><span class="status '+statusClass(t.status)+'">'+esc(t.status)+'</span></div>').join('')+
          '</div></div>'+
          '<div class="panel"><h3>ATTENTION NOW</h3>'+
            (state.issues.slice(0,5).map(i=>'<div class="attention-row"><span class="status '+statusClass(i.severity)+'">'+esc(i.severity)+'</span><b>'+esc(i.title)+'</b><span>'+esc(i.task)+'</span><span>'+esc(i.time)+'</span></div>').join('') || '<p>No open issues.</p>')+
          '</div>'+
        '</div>'+
        '<div class="panel" style="margin-top:16px"><h3>PROOF AWAITING VERIFICATION</h3><div class="cc-proof-strip">'+
          (pending.slice(0,6).map(t=>'<div class="cc-proof-mini"><b>'+esc(t.name)+'</b><small>'+esc(t.department)+' • '+t.proofs.length+' proof(s)</small><div style="margin-top:8px"><button class="btn ghost" data-open-proof="'+t.id+'">Review Proof</button></div></div>').join('') || '<p>No proof awaiting verification.</p>')+
        '</div></div>'+
        '<div class="panel" style="margin-top:16px"><h3>DEPARTMENT READINESS</h3>'+deptCards()+'</div>';

      qa('[data-open-proof]').forEach(b=>b.onclick=()=>{session.selectedTask=b.dataset.openProof;navigate('proof');});
    };

    pages.projects=function(){
      setHead('Projects','Create and manage the active event project.');
      if(!hasProject()){
        q('#appContent').innerHTML=
          '<div class="page-actions"><button class="btn primary" id="ccCreateProject">+ Create Project</button></div>'+
          noProjectHtml();
        q('#ccCreateProject').onclick=()=>createProjectSetup(false);
        return;
      }
      q('#appContent').innerHTML=
        '<div class="page-actions"><button class="btn primary" id="ccNewProject">+ Create New Project</button><button class="btn ghost" id="ccEditProject">Edit Current Project</button></div>'+
        '<div class="panel"><h3>'+esc(state.project.name)+'</h3><p>'+
          (state.project.location?esc(state.project.location)+' • ':'')+
          (state.project.eventDay?esc(state.project.eventDay)+' • ':'')+
          'Readiness: <b>'+(state.project.readiness||0)+'%</b></p>'+
          '<div class="bar"><i style="width:'+(state.project.readiness||0)+'%"></i></div></div>'+
        '<div class="cc-project-actions">'+
          '<button class="cc-project-tool" data-tool="tasks"><b>✓ Tasks</b><small>Create, assign, prioritize and close work.</small></button>'+
          '<button class="cc-project-tool" data-tool="fields"><b>＋ Forms & Fields</b><small>Define exactly what Ops must submit.</small></button>'+
          '<button class="cc-project-tool" data-tool="vendors"><b>▤ Vendors & Logistics</b><small>Vendor, vehicle, driver, material and ETA setup.</small></button>'+
          '<button class="cc-project-tool" data-tool="proof-rules"><b>▧ Proof Rules</b><small>Photo count, live-camera, GPS and verification controls.</small></button>'+
          '<button class="cc-project-tool" data-tool="client-control"><b>◉ Client Visibility</b><small>Choose what the client is allowed to see.</small></button>'+
        '</div>';
      qa('[data-tool]').forEach(b=>b.onclick=()=>navigate(b.dataset.tool));
      q('#ccNewProject').onclick=()=>createProjectSetup(false);
      q('#ccEditProject').onclick=()=>createProjectSetup(true);
    };

    pages['access-control']=function(){
      setHead('Access Control','Control website access for Team Members, Heads, Ops users and Clients.');
      const users=state.users||[];
      q('#appContent').innerHTML=
        '<div class="cc-access-grid">'+
          '<div class="cc-access-card"><strong>'+users.filter(x=>x.role==='admin').length+'</strong><span>Command Center</span></div>'+
          '<div class="cc-access-card"><strong>'+state.team.filter(x=>/lead|supervisor|coordinator/i.test(x.role)).length+'</strong><span>Heads / Leads</span></div>'+
          '<div class="cc-access-card"><strong>'+users.filter(x=>x.role==='ops').length+'</strong><span>Ops Accounts</span></div>'+
          '<div class="cc-access-card"><strong>'+users.filter(x=>x.role==='client').length+'</strong><span>Client Accounts</span></div>'+
        '</div>'+
        '<div class="panel"><h3>ACCESS MANAGEMENT</h3><p>Create, activate, deactivate and assign website access by category, department and zone.</p><button class="btn primary" id="ccAddOps">+ Create Team / Ops Access</button></div>';
      q('#ccAddOps').onclick=()=>renderAddTeam();
    };

    pages['ops-control']=function(){
      setHead('Ops Control','Decide exactly what Ops can see, edit, submit and prove.');
      state.opsRules={...DEFAULT_OPS_RULES,...(state.opsRules||{})};
      const rows=[
        ['assignedWorkOnly','Assigned work only'],
        ['statusUpdate','Status update'],
        ['specificLocation','Specific location / zone'],
        ['liveCameraProof','Live-camera proof'],
        ['gpsProof','GPS with proof'],
        ['updateRemarks','Update remarks'],
        ['issueEscalation','Issue escalation'],
        ['instructions','Admin instructions'],
        ['chat','Command Center chat'],
        ['contacts','Important contacts']
      ];
      q('#appContent').innerHTML=
        '<div class="cc-control-grid">'+
          '<div class="panel"><h3>OPS ACCESS & VISIBILITY</h3>'+
            rows.map(([k,l])=>'<div class="cc-control-line"><span>'+l+'</span><button class="cc-switch '+(state.opsRules[k]?'on':'')+'" data-ops-rule="'+k+'">'+(state.opsRules[k]?'ON':'OFF')+'</button></div>').join('')+
          '</div>'+
          '<div class="panel"><h3>PROJECT PROOF POLICY</h3><p><b>Completion flow</b><br><br>UPDATE → PROOF → COMMAND CENTER VERIFY → CLIENT VISIBILITY</p><p>Minimum photos: <b>'+(state.proofRules?.minPhotos??3)+'</b><br>GPS: <b>'+(state.proofRules?.gpsRequired?'Required':'Optional')+'</b><br>Live camera: <b>'+(state.proofRules?.liveCamera?'Required':'Optional')+'</b></p><button class="btn ghost" id="openProofRules">Edit Proof Rules</button></div>'+
        '</div>';
      qa('[data-ops-rule]').forEach(b=>b.onclick=()=>{const k=b.dataset.opsRule;state.opsRules[k]=!state.opsRules[k];save();pages['ops-control']();toast('Ops control updated.');});
      q('#openProofRules').onclick=()=>navigate('proof-rules');
    };

    pages['client-control']=function(){
      setHead('Client Control','Choose exactly what information is visible in Client Login.');
      state.clientRules={...DEFAULT_CLIENT_RULES,...(state.clientRules||{})};
      const rows=[
        ['eventIdentity','Event name / logo / location / date / time'],
        ['overall','Overall project readiness'],
        ['departments','Department progress'],
        ['approvedProof','Verified photos / proof only'],
        ['approvals','Approvals & information requests'],
        ['documents','Approved documents'],
        ['reports','Reports'],
        ['messages','Client ↔ Command Center messages'],
        ['support','Support'],
        ['vendorContacts','Vendor contact details'],
        ['internalRemarks','Internal remarks'],
        ['unverifiedIssues','Unverified issues']
      ];
      q('#appContent').innerHTML=
        '<div class="cc-control-grid">'+
          '<div class="panel"><h3>CLIENT VISIBILITY CONTROL</h3>'+
            rows.map(([k,l])=>'<div class="cc-control-line"><span>'+l+'</span><button class="cc-switch '+(state.clientRules[k]?'on':'')+'" data-client-rule="'+k+'">'+(state.clientRules[k]?'SHOW':'HIDE')+'</button></div>').join('')+
          '</div>'+
          '<div class="panel"><h3>CLIENT ACTION REQUESTS</h3><p>Request a client action without exposing internal operations.</p><div class="action-grid">'+
            '<button class="action-btn" data-client-request="Approve artwork">+ Approve artwork</button>'+
            '<button class="action-btn" data-client-request="Upload sponsor logo">+ Upload sponsor logo</button>'+
            '<button class="action-btn" data-client-request="Confirm quantity">+ Confirm quantity</button>'+
            '<button class="action-btn" data-client-request="Add response">+ Add remark / response</button>'+
          '</div></div>'+
        '</div>';
      qa('[data-client-rule]').forEach(b=>b.onclick=()=>{const k=b.dataset.clientRule;state.clientRules[k]=!state.clientRules[k];save();pages['client-control']();toast('Client visibility updated.');});
      qa('[data-client-request]').forEach(b=>b.onclick=()=>{state.approvals.unshift({id:'AP-'+Date.now(),title:b.dataset.clientRequest,type:b.dataset.clientRequest,status:'Pending',note:'Requested by Command Center.'});save();toast('Client request created.');});
    };

    pages.reports=function(){
      setHead('Reports & Archive','Download project records and retain completed projects.');
      q('#appContent').innerHTML=
        '<div class="panel-grid">'+
          '<div class="panel"><h3>CURRENT PROJECT REPORT</h3><p>'+esc(state.project.name)+' • '+state.project.readiness+'% readiness • '+state.tasks.length+' tasks</p><div class="cc-export-grid"><button class="cc-export">PDF</button><button class="cc-export">Excel</button><button class="cc-export">PowerPoint</button><button class="cc-export">CSV</button></div></div>'+
          '<div class="panel"><h3>PROJECT ARCHIVE</h3><p>'+(state.archivedProjects?.length||0)+' archived project(s).</p>'+((state.archivedProjects||[]).slice(0,8).map(a=>'<div class="cc-control-line"><span><b>'+esc(a.project?.name||'Project')+'</b><br><small>'+esc(a.project?.eventDay||'')+' • '+esc(a.project?.location||'')+'</small></span><span class="status blue">ARCHIVED</span></div>').join('')||'<p>No archived projects yet.</p>')+'</div>'+
        '</div>';
      qa('.cc-export').forEach(b=>b.onclick=()=>toast(b.textContent+' export will be generated from Reports.'));
    };

    pages.settings=function(){
      setHead('Settings','Useful system, branding, defaults and recovery controls.');
      q('#appContent').innerHTML=
        '<div class="cc-settings-grid">'+
          '<div class="cc-setting-card"><h3>Branding & Event Defaults</h3><p>Event identity, logos and project presentation.</p></div>'+
          '<div class="cc-setting-card"><h3>Proof & GPS Defaults</h3><p>Default proof rules for new Ops tasks.</p></div>'+
          '<div class="cc-setting-card"><h3>Notifications</h3><p>Chatbot, issue and project-alert preferences.</p></div>'+
          '<div class="cc-setting-card"><h3>Backup & Recovery</h3><p>Project data backup and safe recovery controls.</p></div>'+
        '</div>';
    };
  }

  function chatbotRole(){
    return (typeof session!=='undefined' && ['admin','ops','client'].includes(session?.role)) ? session.role : null;
  }

  function chatbotCanSee(role,m){
    if(role==='admin') return true;
    return m.from===role || m.to===role;
  }

  function chatbotDefaultThread(role){
    if(role==='client') return 'client-general';
    if(role==='ops') return session.selectedTask || 'ops-general';
    const incoming=[...(state.messages||[])].reverse().find(m=>m.to==='admin');
    return incoming?.thread || 'ops-general';
  }

  function chatbotUnread(role){
    return (state.messages||[]).filter(m=>
      m.to===role && !(Array.isArray(m.readBy)&&m.readBy.includes(role))
    ).length;
  }

  function markChatbotThreadRead(role,thread){
    let changed=false;
    (state.messages||[]).forEach(m=>{
      if(m.thread===thread && m.to===role){
        m.readBy=Array.isArray(m.readBy)?m.readBy:[];
        if(!m.readBy.includes(role)){m.readBy.push(role);changed=true;}
      }
    });
    if(changed && typeof save==='function') save();
  }

  function renderChatbot(){
    const role=chatbotRole();
    const panel=q('#ccChatPanel');
    const fab=q('#ccChatFab');
    if(!role || !panel || !fab) return;

    const allowed=(state.messages||[]).filter(m=>chatbotCanSee(role,m));
    let threads=[...new Set(allowed.map(m=>m.thread).filter(Boolean))];
    if(role==='ops'&&!threads.includes('ops-general')) threads.unshift('ops-general');
    if(role==='client'&&!threads.includes('client-general')) threads.unshift('client-general');
    if(role==='admin'&&!threads.length) threads=['ops-general','client-general'];

    let selected=panel.dataset.thread || chatbotDefaultThread(role);
    if(!threads.includes(selected)) threads.unshift(selected);
    panel.dataset.thread=selected;

    markChatbotThreadRead(role,selected);

    const messages=(state.messages||[]).filter(m=>chatbotCanSee(role,m)&&m.thread===selected);
    const title=role==='admin'?'Command Center Chat':role==='ops'?'Ops ↔ Command Center':'Client ↔ Command Center';

    panel.innerHTML=
      '<div class="cc-chatbot-head"><strong>'+title+'</strong><button id="ccChatClose">×</button></div>'+
      '<div class="cc-chatbot-body">'+
        '<div class="cc-chatbot-tabs">'+threads.map(t=>{
          const unread=(state.messages||[]).filter(m=>m.thread===t&&m.to===role&&!(m.readBy||[]).includes(role)).length;
          return '<button type="button" class="cc-chat-tab '+(t===selected?'active':'')+'" data-bot-thread="'+esc(t)+'">'+esc(t)+(unread?' ('+unread+')':'')+'</button>';
        }).join('')+'</div>'+
        '<div class="cc-chatbot-messages">'+
          (messages.map(m=>'<div class="cc-bot-bubble '+(m.from===role?'me':'')+'">'+esc(m.text)+'<small>'+String(m.from||'').toUpperCase()+' • '+esc(m.time||'')+'</small></div>').join('') || '<p class="cc-chat-empty">No messages yet. Start the conversation.</p>')+
        '</div>'+
        '<form id="ccBotForm" class="cc-bot-compose"><input required placeholder="Type a message…"><button type="submit">Send</button></form>'+
      '</div>';

    q('#ccChatClose').onclick=()=>panel.classList.add('hidden');
    qa('[data-bot-thread]',panel).forEach(b=>b.onclick=()=>{
      panel.dataset.thread=b.dataset.botThread;
      renderChatbot();
    });
    q('#ccBotForm').onsubmit=e=>{
      e.preventDefault();
      const input=e.target.querySelector('input');
      const text=input.value.trim();
      if(!text) return;

      let to='admin';
      if(role==='admin'){
        const historical=(state.messages||[]).filter(m=>m.thread===selected);
        to=selected.startsWith('client')||historical.some(m=>m.from==='client'||m.to==='client')?'client':'ops';
      }

      state.messages.push({
        id:'MSG-'+Date.now().toString(36).toUpperCase(),
        thread:selected,
        from:role,
        to,
        text,
        time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
        createdAt:new Date().toISOString(),
        readBy:[role]
      });
      save();
      input.value='';
      renderChatbot();
      updateChatbot();
    };

    const badge=q('.cc-badge',fab);
    if(badge){
      const n=chatbotUnread(role);
      badge.textContent=String(n);
      badge.classList.toggle('hidden',n===0);
    }
  }

  function installChatbot(){
    if(q('#ccChatFab')) return;
    const fab=document.createElement('button');
    fab.id='ccChatFab';
    fab.className='cc-chatbot-fab hidden';
    fab.setAttribute('aria-label','Open project chat');
    fab.innerHTML='✉<span class="cc-badge hidden">0</span>';

    const panel=document.createElement('div');
    panel.id='ccChatPanel';
    panel.className='cc-chatbot-panel hidden';

    document.body.append(fab,panel);

    fab.onclick=()=>{
      panel.classList.toggle('hidden');
      if(!panel.classList.contains('hidden')) renderChatbot();
    };
  }

  function updateChatbot(){
    installChatbot();
    const role=chatbotRole();
    const show=!!role && !q('#appShell')?.classList.contains('hidden');
    q('#ccChatFab')?.classList.toggle('hidden',!show);
    if(!show){
      q('#ccChatPanel')?.classList.add('hidden');
      return;
    }
    const badge=q('#ccChatFab .cc-badge');
    if(badge){
      const n=chatbotUnread(role);
      badge.textContent=String(n);
      badge.classList.toggle('hidden',n===0);
    }
    if(!q('#ccChatPanel')?.classList.contains('hidden')) renderChatbot();
  }

  installMenu();
  installPages();
  installChatbot();

  if(typeof save==='function'){
    const originalSaveForChatbot=save;
    save=function(){
      const result=originalSaveForChatbot.apply(this,arguments);
      setTimeout(updateChatbot,0);
      return result;
    };
  }
  configureHeader();

  if(typeof buildSidebar==='function'){
    const originalBuildSidebar=buildSidebar;
    buildSidebar=function(){
      installMenu();
      originalBuildSidebar();
      updateChatbot();
    };
  }

  if(typeof launch==='function'){
    const originalLaunch=launch;
    launch=function(user){
      originalLaunch(user);
      configureHeader();
      updateChatbot();
    };
  }
})();
