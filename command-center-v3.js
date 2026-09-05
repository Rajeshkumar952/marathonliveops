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
      ['dashboard','dashboard','Dashboard'],
      ['projects','project','Projects'],
      ['access-control','users','Access Control'],
      ['team-setup','users','Department & Team'],
      ['issues','alert','Issues'],
      ['ops-control','sliders','Ops Control'],
      ['client-control','eye','Client Control'],
      ['logistics-control','truck','Logistics Control'],
      ['contacts-control','phone','Contacts'],
      ['website-control','globe','Website Control'],
      ['reports','archive','Reports & Archive'],
      ['settings','settings','Settings']
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
          '<button class="cc-project-tool" data-tool="tasks"><b>'+(window.MLIcon?MLIcon('task'):'')+' Tasks</b><small>Create, assign, prioritize and close work.</small></button>'+
          '<button class="cc-project-tool" data-tool="fields"><b>'+(window.MLIcon?MLIcon('sliders'):'')+' Forms & Fields</b><small>Define exactly what Ops must submit.</small></button>'+
          '<button class="cc-project-tool" data-tool="vendors"><b>'+(window.MLIcon?MLIcon('truck'):'')+' Vendors & Logistics</b><small>Vendor, vehicle, driver, material and ETA setup.</small></button>'+
          '<button class="cc-project-tool" data-tool="proof-rules"><b>'+(window.MLIcon?MLIcon('camera'):'')+' Proof Rules</b><small>Photo count, live-camera, GPS and verification controls.</small></button>'+
          '<button class="cc-project-tool" data-tool="client-control"><b>'+(window.MLIcon?MLIcon('eye'):'')+' Client Visibility</b><small>Choose what the client is allowed to see.</small></button>'+
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



    pages['team-setup']=function(){
      setHead('Department & Team','Create departments first, then build the project team and map every person.');
      renderTeamDepartmentControl();
    };

    pages['logistics-control']=function(){
      setHead('Logistics Control','Manage logistics and decide whether Ops/Client can see the information.');
      const clientVisible=state.clientRules?.vendorContacts!==false;
      const opsVisible=state.opsRules?.contacts!==false;
      q('#appContent').innerHTML=
        '<div class="cc-control-grid">'+
          '<div class="panel"><h3>VISIBILITY</h3>'+
            '<div class="cc-control-line"><span>Show Logistics to Ops</span><button class="cc-switch '+(opsVisible?'on':'')+'" id="toggleOpsLogistics">'+(opsVisible?'SHOW':'HIDE')+'</button></div>'+
            '<div class="cc-control-line"><span>Show Logistics to Client</span><button class="cc-switch '+(clientVisible?'on':'')+'" id="toggleClientLogistics">'+(clientVisible?'SHOW':'HIDE')+'</button></div>'+
            '<button class="btn primary" id="manageLogisticsBtn" style="margin-top:14px">Manage Logistics Records</button>'+
          '</div>'+
          '<div class="panel"><h3>WHAT CLIENT / OPS WILL SEE</h3><p>Vendor, POC, contact, vehicle number, driver number, material and ETA from the shared logistics records.</p></div>'+
        '</div>';
      q('#toggleOpsLogistics').onclick=()=>{state.opsRules.contacts=!state.opsRules.contacts;save();pages['logistics-control']();toast('Ops logistics visibility updated.');};
      q('#toggleClientLogistics').onclick=()=>{state.clientRules.vendorContacts=!state.clientRules.vendorContacts;save();pages['logistics-control']();toast('Client logistics visibility updated.');};
      q('#manageLogisticsBtn').onclick=()=>navigate('vendors');
    };

    pages['contacts-control']=function(){
      setHead('Contacts','Create and manage the contact directory visible to Client and Ops.');
      renderContacts('admin');
    };

    pages['website-control']=function(){
      setHead('Website Control','Update public page text, font, metrics, departments and photographs.');
      state.landingContent={...structuredClone(DEFAULT_LANDING_CONTENT),...(state.landingContent||{})};
      state.landingContent.contact={...DEFAULT_LANDING_CONTENT.contact,...(state.landingContent.contact||{})};
      state.landingContent.fonts={...DEFAULT_LANDING_CONTENT.fonts,...(state.landingContent.fonts||{})};
      const c=state.landingContent;
      const metrics=(c.metrics||[]).slice(0,8); while(metrics.length<4) metrics.push({value:'',label:''});
      const fontOptions=['Manrope','Inter','Poppins','Montserrat','Arial','Georgia'];
      q('#appContent').innerHTML=
        '<div class="website-control-layout">'+
          '<form class="panel website-control-form" id="websiteControlForm">'+
            '<div class="section-title-row"><div><h3>PUBLIC LANDING PAGE</h3><p>Change the content, numbers and font without touching code.</p></div><span class="status green">LIVE EDIT</span></div>'+
            '<h4>Text Font</h4><div class="form-grid">'+
              '<div class="form-group"><label>Heading Font</label><select name="headingFont">'+fontOptions.map(f=>'<option '+(c.fonts.heading===f?'selected':'')+'>'+f+'</option>').join('')+'</select></div>'+
              '<div class="form-group"><label>Body Font</label><select name="bodyFont">'+fontOptions.map(f=>'<option '+(c.fonts.body===f?'selected':'')+'>'+f+'</option>').join('')+'</select></div>'+
              '<div class="form-group"><label>Hero Title Size</label><select name="heroSize"><option value="compact" '+(c.fonts.heroSize==='compact'?'selected':'')+'>Compact</option><option value="default" '+((c.fonts.heroSize||'default')==='default'?'selected':'')+'>Default</option><option value="large" '+(c.fonts.heroSize==='large'?'selected':'')+'>Large</option></select></div>'+
            '</div>'+
            '<h4>Hero</h4><div class="form-grid">'+
              '<div class="form-group"><label>Eyebrow</label><input name="eyebrow" value="'+esc(c.eyebrow||'')+'"></div>'+
              '<div class="form-group"><label>Headline Line 1</label><input name="heroLine1" value="'+esc(c.heroLine1||'')+'"></div>'+
              '<div class="form-group"><label>Headline Line 2</label><input name="heroLine2" value="'+esc(c.heroLine2||'')+'"></div>'+
              '<div class="form-group span2"><label>Hero Description</label><textarea name="heroDescription" rows="3">'+esc(c.heroDescription||'')+'</textarea></div>'+
            '</div>'+
            '<h4>About</h4><div class="form-grid">'+
              '<div class="form-group span2"><label>About Heading</label><input name="aboutTitle" value="'+esc(c.aboutTitle||'')+'"></div>'+
              '<div class="form-group span2"><label>About Description</label><textarea name="aboutDescription" rows="3">'+esc(c.aboutDescription||'')+'</textarea></div>'+
            '</div>'+
            '<h4>Public Metrics</h4><div class="website-metric-editor">'+metrics.map((m,i)=>'<div class="metric-editor-row"><input name="metricValue'+i+'" placeholder="6+" value="'+esc(m.value||'')+'"><input name="metricLabel'+i+'" placeholder="Marathons Delivered" value="'+esc(m.label||'')+'"></div>').join('')+'</div>'+
            '<h4>Contact</h4><div class="form-grid">'+
              '<div class="form-group"><label>Contact Title</label><input name="contactTitle" value="'+esc(c.contact.title||'')+'"></div>'+
              '<div class="form-group"><label>Company Line</label><input name="contactCompany" value="'+esc(c.contact.company||'')+'"></div>'+
              '<div class="form-group span2"><label>Office</label><input name="contactOffice" value="'+esc(c.contact.office||'')+'"></div>'+
              '<div class="form-group"><label>Phone</label><input name="contactPhone" value="'+esc(c.contact.phone||'')+'"></div>'+
              '<div class="form-group"><label>Email</label><input name="contactEmail" value="'+esc(c.contact.email||'')+'"></div>'+
            '</div>'+
            '<button class="btn primary" type="submit">Save & Publish Landing Page</button>'+
          '</form>'+
          '<div class="panel website-gallery-control"><h3>EXECUTION DEPARTMENTS</h3><p>Add, delete, rename and upload real execution photos.</p>'+
            '<form id="addLandingDept" class="add-dept-form"><input name="label" placeholder="New department name" required><select name="icon"><option value="image">Image</option><option value="water">Hydration</option><option value="barricade">Barricade</option><option value="users">Manpower</option><option value="truck">Transport</option><option value="route">Route</option><option value="toilet">Toilet</option><option value="culture">Culture</option></select><button class="btn ghost">+ Add Dept.</button></form>'+
            '<div class="website-gallery-editor">'+(c.departments||[]).map((d,i)=>'<article class="website-gallery-row" data-landing-dept="'+esc(d.key)+'">'+
              '<img src="'+esc(d.image||'')+'" alt=""><div><input class="dept-name-input" data-dept-name="'+esc(d.key)+'" value="'+esc(d.label||'')+'"><small>'+esc(d.key||'')+'</small></div>'+
              '<label class="btn ghost">'+(window.MLIcon?MLIcon('upload'):'')+' Photo<input class="hidden" type="file" accept="image/*" data-landing-photo="'+esc(d.key)+'"></label>'+
              '<button class="btn ghost" data-delete-dept="'+esc(d.key)+'">Delete</button></article>').join('')+'</div>'+
          '</div>'+
        '</div>';
      q('#websiteControlForm').onsubmit=async e=>{
        e.preventDefault();const f=Object.fromEntries(new FormData(e.target));
        state.landingContent={...state.landingContent,eyebrow:String(f.eyebrow||'').trim(),heroLine1:String(f.heroLine1||'').trim(),heroLine2:String(f.heroLine2||'').trim(),heroDescription:String(f.heroDescription||'').trim(),aboutTitle:String(f.aboutTitle||'').trim(),aboutDescription:String(f.aboutDescription||'').trim(),fonts:{heading:String(f.headingFont||'Manrope'),body:String(f.bodyFont||'Inter'),heroSize:String(f.heroSize||'default')},metrics:[0,1,2,3,4,5,6,7].map(i=>({value:String(f['metricValue'+i]||'').trim(),label:String(f['metricLabel'+i]||'').trim()})).filter(m=>m.value||m.label),contact:{title:String(f.contactTitle||'').trim(),company:String(f.contactCompany||'').trim(),office:String(f.contactOffice||'').trim(),phone:String(f.contactPhone||'').trim(),email:String(f.contactEmail||'').trim()}};
        save();applyLandingContent(state.landingContent);try{await LiveOpsCloud?.savePublicSiteContent?.(state.landingContent);toast('Landing page saved and published.');}catch(err){toast('Saved internally. Run Supabase upgrade to publish publicly.');}
      };
      q('#addLandingDept').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const label=String(f.label||'').trim();if(!label)return;const key=label.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'')+'-'+Date.now().toString(36).slice(-3);state.landingContent.departments.push({key,label,icon:f.icon||'image',image:'marathon-liveops-hero.png'});save();applyLandingContent(state.landingContent);pages['website-control']();toast('Department added.');};
      qa('[data-dept-name]').forEach(inp=>inp.onchange=()=>{const d=state.landingContent.departments.find(x=>x.key===inp.dataset.deptName);if(d){d.label=inp.value.trim()||d.label;save();applyLandingContent(state.landingContent);}});
      qa('[data-delete-dept]').forEach(b=>b.onclick=()=>{state.landingContent.departments=state.landingContent.departments.filter(d=>d.key!==b.dataset.deleteDept);save();applyLandingContent(state.landingContent);pages['website-control']();toast('Department removed.');});
      qa('[data-landing-photo]').forEach(input=>input.onchange=async()=>{const file=input.files?.[0];if(!file)return;try{const data=await landingImageToDataUrl(file);const dep=state.landingContent.departments.find(d=>d.key===input.dataset.landingPhoto);if(dep)dep.image=data;save();applyLandingContent(state.landingContent);try{await LiveOpsCloud?.savePublicSiteContent?.(state.landingContent);}catch(_){}toast('Department photo updated.');pages['website-control']();}catch(err){toast(err?.message||'Photo could not be updated.');}});
    };

    pages.reports=function(){
      setHead('Reports & Archive','Manual upload plus automatic race execution PDF/PPT report.');
      const docs=state.documents||[];
      q('#appContent').innerHTML=
        '<div class="panel-grid report-doc-grid">'+
          '<div class="panel"><h3>1) CUSTOM FILE UPLOAD</h3><p>Upload any PPT/PDF made by Command Center for Client/Ops download.</p><form id="projectDocumentForm"><div class="form-group"><label>Document Title</label><input required name="title" placeholder="Final Event Execution Report"></div><div class="form-group"><label>Who can download?</label><select name="audience"><option value="both">Client + Ops Team</option><option value="client">Client Only</option><option value="ops">Ops Team Only</option></select></div><div class="form-group"><label>PPT / PDF File</label><input required id="projectDocumentFile" type="file" accept=".pdf,.ppt,.pptx,application/pdf,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation"></div><button class="btn primary" type="submit">'+(window.MLIcon?MLIcon('upload'):'')+' Upload & Share</button></form></div>'+
          '<div class="panel"><h3>2) AUTO EXECUTION REPORT</h3><p>Generated from task updates, proof counts, issue list, verification status and uploaded proof gallery.</p><div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">'+stat('TASKS',state.tasks.length)+stat('PROOFS',state.tasks.reduce((n,t)=>n+(t.proofs||[]).length,0),'green')+stat('ISSUES',state.issues.length,'amber')+'</div><div class="page-actions" style="margin-top:18px"><button class="btn primary" id="autoReportPdf">Download Auto PDF</button><button class="btn ghost" id="autoReportPpt">Download Auto PPT</button></div><small>The PPT opens in PowerPoint as an editable slide-style report.</small></div>'+
        '</div>'+
        '<div class="panel" style="margin-top:16px"><div class="section-title-row"><div><h3>SHARED DOCUMENTS</h3><p>Client and Ops see clean document cards with Download button.</p></div><span class="status blue">'+docs.length+' FILES</span></div><div class="document-grid admin-document-grid">'+docs.map(d=>'<article class="document-card"><div class="document-type '+(/pdf/i.test(d.fileType||d.fileName||'')?'pdf':'ppt')+'">'+(window.MLIcon?MLIcon('document'):'')+'<b>'+(/pdf/i.test(d.fileType||d.fileName||'')?'PDF':'PPT')+'</b></div><div class="document-copy"><h4>'+esc(d.title||d.fileName)+'</h4><p>'+esc(d.fileName||'')+(d.size?' • '+formatBytes(d.size):'')+'</p><small>'+esc(d.audience||'both')+' • '+esc(d.uploadedAtLabel||'')+'</small></div><div class="document-admin-actions"><button class="btn ghost" data-doc-download="'+esc(d.id)+'">'+(window.MLIcon?MLIcon('download'):'')+' Download</button><button class="btn ghost" data-doc-delete="'+esc(d.id)+'">Delete</button></div></article>').join('')||'<p>No documents uploaded yet.</p>'+'</div></div>';
      q('#autoReportPdf').onclick=()=>downloadAutoReport('pdf');
      q('#autoReportPpt').onclick=()=>downloadAutoReport('ppt');
      q('#projectDocumentForm').onsubmit=async e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));const file=q('#projectDocumentFile').files?.[0];if(!file)return toast('Choose a PPT or PDF file.');const allowed=/pdf|powerpoint|presentation/i.test(file.type||'')||/\.(pdf|ppt|pptx)$/i.test(file.name||'');if(!allowed)return toast('Only PDF, PPT or PPTX files are allowed.');if(file.size>40*1024*1024)return toast('Please keep the file under 40 MB.');const btn=e.target.querySelector('button[type="submit"]');btn.disabled=true;btn.textContent='Uploading…';try{const uploaded=await LiveOpsCloud.uploadDocument(file);state.documents.unshift({id:'DOC-'+Date.now().toString(36).toUpperCase(),title:String(f.title||file.name).trim(),audience:f.audience||'both',fileName:file.name,fileType:file.type,size:file.size,path:uploaded.path,uploadedAt:new Date().toISOString(),uploadedAtLabel:new Date().toLocaleDateString()});save();toast('Document uploaded and shared.');pages.reports();}catch(err){toast(err?.message||'Document upload failed.');}finally{btn.disabled=false;}};
      qa('[data-doc-download]').forEach(b=>b.onclick=()=>{const d=state.documents.find(x=>x.id===b.dataset.docDownload);if(d)downloadProjectDocument(d);});
      qa('[data-doc-delete]').forEach(b=>b.onclick=async()=>{const d=state.documents.find(x=>x.id===b.dataset.docDelete);if(!d)return;if(!confirm('Delete this shared document?'))return;try{if(d.path)await LiveOpsCloud?.removeDocument?.(d.path);}catch(err){}state.documents=state.documents.filter(x=>x.id!==d.id);save();pages.reports();toast('Document deleted.');});
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
