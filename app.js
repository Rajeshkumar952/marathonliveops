const resolveRoot=(r=document)=>typeof r==='string'?document.querySelector(r):r;
const $=(s,r=document)=>resolveRoot(r)?.querySelector(s)??null;
const $$=(s,r=document)=>[...(resolveRoot(r)?.querySelectorAll(s)??[])];
const STORE='marathonLiveOpsV1';

const DEFAULT_TASK_FIELDS=[
  {label:'Current Status',type:'dropdown',required:true,opsEdit:true,client:'Status',options:['Not Started','Just Started','Working','Finished','Blocked']},
  {label:'Progress %',type:'number',required:true,opsEdit:true,client:'Status',options:[]},
  {label:'Location / Zone',type:'location',required:false,opsEdit:true,client:'Approved',options:[]},
  {label:'Issue / Blocker',type:'text',required:false,opsEdit:true,client:'No',options:[]},
  {label:'Update Remark',type:'remark',required:false,opsEdit:true,client:'Approved',options:[]}
];

const DEFAULT_CLIENT_RULES={
  eventIdentity:true,overall:true,departments:true,approvedProof:true,
  approvals:true,documents:true,reports:true,messages:true,support:true,
  internalRemarks:false,vendorContacts:false,unverifiedIssues:false
};

const DEFAULT_OPS_RULES={
  assignedWorkOnly:true,statusUpdate:true,specificLocation:true,
  liveCameraProof:true,gpsProof:true,updateRemarks:true,
  issueEscalation:true,instructions:true,chat:true,contacts:true
};

const DEFAULT_PROOF_RULES={
  minPhotos:3,liveCamera:true,gpsRequired:true,
  adminVerification:true,clientAfterVerification:true
};

const seed={
  users:[],
  project:null,
  projects:[],
  archivedProjects:[],
  departments:[],
  tasks:[],
  vendors:[],
  fieldTemplate:structuredClone(DEFAULT_TASK_FIELDS),
  proofRules:{...DEFAULT_PROOF_RULES},
  opsRules:{...DEFAULT_OPS_RULES},
  team:[],
  messages:[],
  approvals:[],
  issues:[],
  clientRules:{...DEFAULT_CLIENT_RULES}
};

function normalizeState(input){
  const s=(input&&typeof input==='object')?input:{};
  for(const k of ['users','projects','archivedProjects','departments','tasks','vendors','team','messages','approvals','issues']){
    s[k]=Array.isArray(s[k])?s[k]:[];
  }
  s.fieldTemplate=Array.isArray(s.fieldTemplate)&&s.fieldTemplate.length?s.fieldTemplate:structuredClone(DEFAULT_TASK_FIELDS);
  s.proofRules={...DEFAULT_PROOF_RULES,...(s.proofRules||{})};
  s.opsRules={...DEFAULT_OPS_RULES,...(s.opsRules||{})};
  s.clientRules={...DEFAULT_CLIENT_RULES,...(s.clientRules||{})};

  if(s.project?.name){
    if(!s.project.id) s.project.id='PRJ-'+Date.now().toString(36).toUpperCase();
    const meta={
      id:s.project.id,name:s.project.name,location:s.project.location||'',
      date:s.project.date||'',time:s.project.time||'',eventDay:s.project.eventDay||'',
      readiness:Number(s.project.readiness||0),lastUpdate:s.project.lastUpdate||''
    };
    const i=s.projects.findIndex(p=>p.id===meta.id);
    if(i>=0) s.projects[i]={...s.projects[i],...meta};
    else s.projects.unshift(meta);
  }
  return s;
}
function isLegacyDemoState(s){
  if(!s) return false;
  const p=String(s?.project?.name||'').toLowerCase();
  const taskIds=(Array.isArray(s.tasks)?s.tasks:[]).map(t=>String(t?.id||''));
  const approvalIds=(Array.isArray(s.approvals)?s.approvals:[]).map(a=>String(a?.id||''));
  const issueIds=(Array.isArray(s.issues)?s.issues:[]).map(i=>String(i?.id||''));
  return p.includes('tata steel world 25k') ||
         taskIds.some(id=>['RC-118','RC-119','VN-201','HY-044'].includes(id)) ||
         approvalIds.some(id=>['AP-1','AP-2','AP-3'].includes(id)) ||
         issueIds.some(id=>['IS-1','IS-2'].includes(id));
}
function blankProjectState(){
  return normalizeState(structuredClone(seed));
}
let state=normalizeState(JSON.parse(localStorage.getItem(STORE)||'null')||blankProjectState());
if(isLegacyDemoState(state)){
  state=blankProjectState();
  localStorage.setItem(STORE,JSON.stringify(state));
}
let session={role:null,user:null,page:null,selectedTask:null};
let unsubscribeCloud=()=>{};
const save=()=>{
  state=normalizeState(state);
  localStorage.setItem(STORE,JSON.stringify(state));
  if(window.LiveOpsCloud?.isConfigured()){
    const sync=window.LiveOpsResilience?.safeSave ? window.LiveOpsResilience.safeSave(state,session.role) : window.LiveOpsCloud.saveState(state,session.role);
    Promise.resolve(sync).then(r=>{if(r?.queued) toast('Saved offline — will sync automatically.');}).catch(err=>{console.error(err);toast('Cloud sync issue — local copy kept safely.');});
  }
};
const toast=(m)=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2300)};
const esc=(s='')=>String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
const statusClass=s=>/blocked|critical|rework/i.test(s)?'red':/delay|pending|attention|working/i.test(s)?'amber':/finish|complete|verified|active|track/i.test(s)?'green':'blue';

// public actions
$$('[data-open-login]').forEach(b=>b.addEventListener('click',()=>openLogin(b.dataset.openLogin)));
$('#closeLogin').onclick=()=>$('#loginModal').classList.add('hidden');
$('#loginModal').addEventListener('click',e=>{if(e.target===$('#loginModal'))$('#loginModal').classList.add('hidden')});
$('#contactForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const form=Object.fromEntries(new FormData(e.target));
  try{
    if(window.LiveOpsCloud?.isConfigured()) await window.LiveOpsCloud.submitEnquiry(form);
    toast(window.LiveOpsCloud?.isConfigured()?'Enquiry sent successfully.':'Enquiry recorded for this demo.');
    e.target.reset();
  }catch(err){console.error(err);toast('Could not send enquiry. Please try again.');}
});
function openLogin(role){
  const cfg={
    ops:['OPS ACCESS','Your ground. Your tasks. Your updates.','Authorised operations personnel only.'],
    client:['CLIENT ACCESS','Welcome to Marathon LiveOps','Secure access to your live project updates.'],
    admin:['COMMAND CENTER','Command the entire operation.','Sign in with your authorised Command Center email and password.']
  }[role];
  $('#loginRole').value=role;
  const loginUserLabel=$('#loginUser')?.closest('.form-group')?.querySelector('label');
  if(loginUserLabel) loginUserLabel.textContent=role==='admin'?'Email':'User ID';
  $('#loginAccess').textContent=cfg[0];
  $('#loginTitle').textContent=cfg[1];
  $('#loginHelp').textContent=cfg[2];
  $('#demoCredentials').classList.add('hidden');
  $('#demoCredentials').innerHTML='';
  $('#loginCard').className='login-modal '+role;
  $('#loginModal').classList.remove('hidden');
  $('#loginUser').value='';
  $('#loginPassword').value='';
}
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const role=$('#loginRole').value,u=$('#loginUser').value.trim(),p=$('#loginPassword').value;
  try{
    if(window.LiveOpsCloud?.isConfigured()){
      const auth=await window.LiveOpsCloud.signIn(u,p);
      if(!auth?.profile || !auth?.membership) throw new Error('Profile or project membership not found.');
      if(auth.membership.role!==role) throw new Error(`This account has ${auth.membership.role} access, not ${role} access.`);
      const cloudState=await window.LiveOpsCloud.loadState(role);
      if(cloudState){
        state=normalizeState(isLegacyDemoState(cloudState)?blankProjectState():cloudState);
        localStorage.setItem(STORE,JSON.stringify(state));
        if(isLegacyDemoState(cloudState) && role!=='client'){
          await window.LiveOpsCloud.saveState(state,role);
        }
      } else if(role!=='client'){
        await window.LiveOpsCloud.saveState(state,role);
      }
      launch({id:auth.profile.liveops_user_id||u,role:auth.membership.role,name:auth.profile.name||u,department:auth.membership.department||'',zone:auth.membership.zone||''});
      unsubscribeCloud();
      unsubscribeCloud=window.LiveOpsCloud.subscribe(role,newState=>{state=normalizeState(isLegacyDemoState(newState)?blankProjectState():newState);localStorage.setItem(STORE,JSON.stringify(state));if(session.page)navigate(session.page);toast('Live project update received.');});
      return;
    }
    const user=state.users.find(x=>x.id===u&&x.password===p&&x.role===role);
    if(!user)return toast('Incorrect User ID or password.');
    launch(user);
  }catch(err){console.error('LOGIN ERROR:',err);toast(err?.message||'Login failed.');}
});
$('#logoutBtn').onclick=async()=>{unsubscribeCloud();unsubscribeCloud=()=>{};if(window.LiveOpsCloud?.isConfigured())await window.LiveOpsCloud.signOut();session={role:null,user:null,page:null,selectedTask:null};$('#appShell').classList.add('hidden');$('#publicSite').classList.remove('hidden');$('#publicNav').classList.remove('hidden');$('.footer').classList.remove('hidden');window.scrollTo(0,0)};
function hasProject(){return !!(state?.project && String(state.project.name||'').trim());}
function noProjectHtml(){
  return `<div class="panel" style="max-width:900px;margin:48px auto;text-align:center;padding:64px 28px">
    <h2 style="margin:0 0 10px">No Active Project</h2>
    <p style="margin:0;color:#6b7280">No project has been created yet.</p>
  </div>`;
}
function launch(user){session.user=user;session.role=user.role;$('#loginModal').classList.add('hidden');$('#publicSite').classList.add('hidden');$('#publicNav').classList.add('hidden');$('.footer').classList.add('hidden');$('#appShell').classList.remove('hidden');buildSidebar();navigate(user.role==='admin'?'dashboard':user.role==='ops'?'ops-home':'client-overview')}

const menus={
 admin:[['dashboard','▦','Dashboard'],['projects','▣','Projects'],['tasks','✓','Tasks'],['team','♟','Team & Access'],['fields','＋','Field Builder'],['proof','⌁','Proof Verification'],['issues','!','Issues'],['vendors','▤','Vendors & Logistics'],['client-control','◉','Client Control'],['chat','✉','Chat'],['reports','▥','Reports'],['settings','⚙','Settings']],
 ops:[['ops-home','⌂','Home'],['ops-tasks','▦','My Tasks'],['ops-update','↻','Update Status'],['ops-proof','▧','Upload Proof'],['ops-issue','!','Report Issue'],['ops-instructions','▣','Instructions'],['ops-chat','✉','Chat'],['ops-contacts','☎','Contacts']],
 client:[['client-overview','⌂','Overview'],['client-progress','▦','Progress'],['client-proof','▧','Verified Proof'],['client-approvals','✓','Approvals'],['client-docs','▤','Documents'],['client-chat','✉','Messages'],['client-reports','▥','Reports'],['client-support','☎','Support']]
};
function menuForRole(role){
  let items=[...(menus[role]||[])];
  if(role==='client'){
    const r={...DEFAULT_CLIENT_RULES,...(state.clientRules||{})};
    const map={'client-progress':'departments','client-proof':'approvedProof','client-approvals':'approvals','client-docs':'documents','client-chat':'messages','client-reports':'reports','client-support':'support'};
    items=items.filter(m=>!map[m[0]]||r[map[m[0]]]!==false);
  }
  if(role==='ops'){
    const r={...DEFAULT_OPS_RULES,...(state.opsRules||{})};
    const map={'ops-update':'statusUpdate','ops-proof':'liveCameraProof','ops-issue':'issueEscalation','ops-instructions':'instructions','ops-chat':'chat','ops-contacts':'contacts'};
    items=items.filter(m=>!map[m[0]]||r[map[m[0]]]!==false);
  }
  return items;
}
function buildSidebar(){const role=session.role;const items=menuForRole(role);$('#sidebar').innerHTML=`<div class="side-brand"><span class="brand-mark">ML</span><span><strong>${role==='admin'?'ADMIN':role==='ops'?'OPS TEAM':'CLIENT'}</strong><small>Marathon LiveOps</small></span></div><nav class="side-nav">${items.map(m=>`<button data-page="${m[0]}"><span class="ico">${m[1]}</span>${m[2]}</button>`).join('')}</nav>`;$$('[data-page]','#sidebar').forEach(b=>b.onclick=()=>navigate(b.dataset.page))}
function navigate(page){
  session.page=page;
  $$('[data-page]','#sidebar').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  const allowedWithoutProject=session.role==='admin' && ['projects','team','access-control','settings'].includes(page);
  if(!hasProject() && !allowedWithoutProject){
    setHead(session.role==='admin'?'Command Centre':session.role==='ops'?'Ops Team':'Client','');
    $('#appContent').innerHTML=noProjectHtml();
    return;
  }
  const render=pages[page]||pages.notFound;
  render();
}
function setHead(t,s=''){ $('#pageTitle').textContent=t;$('#pageSubtitle').textContent=s}
function stat(label,val,color='blue'){return `<div class="kpi"><small>${label}</small><strong class="${color}">${val}</strong></div>`}
function deptCards(){return `<div class="dept-grid">${state.departments.map(d=>`<div class="dept-card"><b>${esc(d.name)}</b><strong>${d.progress}%</strong><div class="bar"><i style="width:${d.progress}%"></i></div><span class="status ${statusClass(d.status)}">${d.status}</span></div>`).join('')}</div>`}
function quickBtn(text,action){return `<button class="action-btn" data-action="${action}">${text}</button>`}
function bindQuick(){ $$('[data-action]').forEach(b=>b.onclick=()=>{const a=b.dataset.action;if(a==='create-task')renderTaskForm();else if(a==='add-team')renderAddTeam();else if(a==='request-update'){state.messages.push({thread:'broadcast',from:'admin',to:'ops',text:'Please submit your latest assigned task status.',time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});save();toast('Update request sent to Ops team.')}else if(a==='broadcast'){const msg=prompt('Broadcast instruction to all Ops members:');if(msg){state.messages.push({thread:'broadcast',from:'admin',to:'ops',text:msg,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});save();toast('Broadcast sent.')}}else if(a==='open-chat')navigate('chat')}) }

const pages={
 dashboard(){setHead('Command Centre',`${state.project.name} • ${state.project.eventDay}`);const completed=state.tasks.filter(t=>t.verified).length,working=state.tasks.filter(t=>/working|started/i.test(t.status)).length,blocked=state.tasks.filter(t=>/blocked|unable/i.test(t.status)).length,pending=state.tasks.filter(t=>t.status==='Finished'&&!t.verified).length;$('#appContent').innerHTML=`<div class="kpi-grid">${stat('PROJECT READY',state.project.readiness+'%')}${stat('VERIFIED',completed,'green')}${stat('WORKING',working,'blue')}${stat('DELAYED',state.issues.length,'amber')}${stat('BLOCKED',blocked,'red')}${stat('PROOF PENDING',pending,'amber')}</div><div class="panel-grid"><div class="panel"><h3>ATTENTION REQUIRED</h3>${state.issues.map(i=>`<div class="attention-row"><span class="status ${statusClass(i.severity)}">${i.severity}</span><b>${esc(i.title)}</b><span>${i.task}</span><span>${i.time}</span></div>`).join('')||'<p>No open issues.</p>'}<div class="attention-row"><span class="status amber">Proof Pending</span><b>Finish Gate Branding</b><span>Venue</span><span>04:08 AM</span></div></div><div class="panel"><h3>QUICK ACTIONS</h3><div class="action-grid">${quickBtn('+ Create Task','create-task')}${quickBtn('+ Add Team','add-team')}${quickBtn('↻ Request Update','request-update')}${quickBtn('▣ Broadcast','broadcast')}${quickBtn('✉ Open Chat','open-chat')}</div></div></div><div class="panel" style="margin-top:16px"><h3>DEPARTMENT READINESS</h3>${deptCards()}</div>`;bindQuick()},
 projects(){
  setHead('Projects','Create and manage the active project.');
  if(!hasProject()){
    $('#appContent').innerHTML=`<div class="page-actions"><button class="btn primary" id="newProject">+ Create Project</button></div>${noProjectHtml()}`;
    $('#newProject').onclick=()=>createProjectSetup();
    return;
  }
  $('#appContent').innerHTML=`<div class="page-actions"><button class="btn ghost" id="editProject">Edit Current Project</button></div><div class="panel"><h3>${esc(state.project.name)}</h3><p>Readiness: <b>${state.project.readiness||0}%</b> • ${esc(state.project.eventDay||'')} • Last update ${esc(state.project.lastUpdate||'')}</p><div class="bar"><i style="width:${state.project.readiness||0}%"></i></div></div>`;
  $('#editProject').onclick=()=>createProjectSetup(true);
 },
 tasks(){setHead('Tasks','Create, configure, assign, escalate and close work.');$('#appContent').innerHTML=`<div class="page-actions"><button class="btn primary" id="createTask">+ Create Task</button><button class="btn ghost" id="exportTasks">Export CSV</button></div><div class="data-table"><div class="data-head"><span>Task</span><span>Priority</span><span>Department</span><span>Assigned</span><span>Status</span><span>Action</span></div>${state.tasks.map(t=>`<div class="data-row"><b>${esc(t.name)}<br><small>${t.id}</small></b><span>${t.priority}</span><span>${t.department}</span><span>${t.assignedTo}</span><span class="status ${statusClass(t.status)}">${t.status}</span><button data-edit-task="${t.id}">Edit</button></div>`).join('')}</div>`;$('#createTask').onclick=renderTaskForm;$('#exportTasks').onclick=exportTasksCSV;$$('[data-edit-task]').forEach(b=>b.onclick=()=>renderTaskForm(b.dataset.editTask))},
 team(){setHead('Team & Access','Create and manage Admin, Ops Team and Client website access.');$('#appContent').innerHTML=`<div class="page-actions"><button class="btn primary" id="addMember">+ Create Access</button><button class="btn ghost" id="viewAccessList">Access List</button></div><div class="panel"><h3>ACCESS MANAGEMENT</h3><p>Create role-based website login access. Ops Team accounts can be limited by Department, Role and Zone. Client accounts receive full event visibility.</p></div>`;$('#addMember').onclick=renderAddTeam;$('#viewAccessList').onclick=openAccessList},
 fields(){setHead('Form & Field Control','Admin decides exactly what information Ops must submit.');resetBuilderFieldsFromState();renderFieldBuilder()},
 proof(){setHead('Proof Verification','Approve, reject or request rework before client visibility.');renderProofs()},
 issues(){setHead('Issues & Blockers','Problems should find Admin automatically.');$('#appContent').innerHTML=`<div class="data-table"><div class="data-head"><span>Issue</span><span>Severity</span><span>Task</span><span>Status</span><span>Time</span><span>Action</span></div>${state.issues.map(i=>`<div class="data-row"><b>${esc(i.title)}</b><span class="status ${statusClass(i.severity)}">${i.severity}</span><span>${i.task}</span><span>${i.status}</span><span>${i.time}</span><button data-resolve="${i.id}">Resolve</button></div>`).join('')}</div>`;$$('[data-resolve]').forEach(b=>b.onclick=()=>{state.issues=state.issues.filter(i=>i.id!==b.dataset.resolve);save();pages.issues();toast('Issue resolved.');})},
 vendors(){setHead('Vendors & Logistics','Vendor, vehicle, driver, material movement and ETA controls.');renderVendors()},
 'proof-rules'(){setHead('Proof Rules','Set the default proof requirements for project tasks.');renderProofRules()},
 'client-control'(){setHead('Client Control','Choose exactly what the client can see, approve or provide.');const r=state.clientRules;$('#appContent').innerHTML=`<div class="panel-grid"><div class="panel"><h3>VISIBILITY RULES</h3>${[['overall','Overall Project Readiness'],['departments','Department Progress'],['approvedProof','Approved Ground Proof'],['internalRemarks','Internal Remarks'],['vendorContacts','Vendor Contact Details'],['unverifiedIssues','Issues Before Verification']].map(([k,l])=>`<div class="switch-line"><span>${l}</span><button class="switch ${r[k]?'on':''}" data-rule="${k}">${r[k]?'SHOW':'HIDE'}</button></div>`).join('')}</div><div class="panel"><h3>CLIENT ACTION REQUEST</h3><div class="action-grid"><button class="action-btn" data-request="Approve artwork">+ Approve artwork</button><button class="action-btn" data-request="Upload sponsor logo">+ Upload sponsor logo</button><button class="action-btn" data-request="Confirm quantity">+ Confirm quantity</button><button class="action-btn" data-request="Add response">+ Add remark / response</button></div></div></div>`;$$('[data-rule]').forEach(b=>b.onclick=()=>{const k=b.dataset.rule;state.clientRules[k]=!state.clientRules[k];save();pages['client-control']()});$$('[data-request]').forEach(b=>b.onclick=()=>{state.approvals.unshift({id:'AP-'+Date.now(),title:b.dataset.request,type:b.dataset.request,status:'Pending',note:'Requested by Admin.'});save();toast('Client request created.');})},
 chat(){setHead('Project Chat & Help','Task-linked conversations between Admin, Ops and Client.');renderChat('admin')},
 reports(){setHead('Reports & Records','Export client-safe or internal project records.');$('#appContent').innerHTML=`<div class="panel-grid"><div class="panel"><h3>LIVE PROJECT REPORT</h3><p>Generated from the current saved project state.</p><div class="kpi-grid" style="grid-template-columns:repeat(3,1fr)">${stat('READINESS',state.project.readiness+'%')}${stat('TASKS',state.tasks.length)}${stat('ISSUES',state.issues.length,'amber')}</div><div class="page-actions" style="margin-top:18px"><button class="btn primary" id="printReport">Print / Save PDF</button><button class="btn ghost" id="csvReport">Export Tasks CSV</button></div></div><div class="panel"><h3>REPORT INCLUDES</h3><p>✓ Project readiness<br>✓ Department progress<br>✓ Task status<br>✓ Verified milestones<br>✓ Approved proofs<br>✓ Client approvals<br>✓ Decision / chat history</p></div></div>`;$('#printReport').onclick=()=>window.print();$('#csvReport').onclick=exportTasksCSV},
 settings(){setHead('Settings','Project defaults and local recovery controls.');$('#appContent').innerHTML=`<div class="panel"><h3>LOCAL RECOVERY DATA</h3><p>Reset this browser copy back to the approved prototype defaults.</p><button class="btn ghost" id="resetDemo">Reset Local Data</button></div>`;$('#resetDemo').onclick=()=>{if(confirm('Reset all local browser changes?')){state=structuredClone(seed);save();navigate('dashboard');toast('Local data reset.')}}},
 'ops-home'(){setHead('Ops Home',`${session.user.name} • ${session.user.department||''} • ${session.user.zone||''}`);const tasks=state.tasks.filter(t=>t.assignedTo===session.user.id);const urgent=tasks.find(t=>!t.verified&&t.status!=='Finished')||tasks[0];$('#appContent').innerHTML=`<div class="ops-home"><div class="ops-banner"><h2>Good Morning, ${esc(session.user.name)}</h2><p>${esc(state.project.name)} • ${esc(session.user.department||'Operations')} • ${esc(session.user.zone||'Assigned Area')}</p></div><div class="ops-icons">${[['▦','My Tasks','ops-tasks'],['↻','Update','ops-update'],['▧','Proof','ops-proof'],['!','Issue','ops-issue'],['▣','Instructions','ops-instructions'],['✉','Chat','ops-chat']].map(x=>`<button class="ops-icon" data-page="${x[2]}"><b>${x[0]}</b>${x[1]}</button>`).join('')}</div><h4>DO NOW</h4>${urgent?taskCard(urgent,true):'<p>No assigned tasks.</p>'}</div>`;$$('[data-page]','#appContent').forEach(b=>b.onclick=()=>navigate(b.dataset.page));bindTaskButtons()},
 'ops-tasks'(){setHead('My Tasks','Only work assigned to you.');const tasks=state.tasks.filter(t=>t.assignedTo===session.user.id);$('#appContent').innerHTML=`<div class="ops-home"><div class="page-actions"><button class="btn primary" data-filter="open">Do Now</button><button class="btn ghost" data-filter="next">Next</button><button class="btn ghost" data-filter="done">Done</button></div><div id="opsTaskList">${tasks.map(t=>taskCard(t)).join('')}</div></div>`;bindTaskButtons()},
 'ops-update'(){setHead('Update Status','Complete only the fields Admin requested.');const t=getOpsTask();if(!t)return noTask();renderOpsUpdate(t)},
 'ops-proof'(){setHead('Upload Proof','Mandatory evidence before completion.');const t=getOpsTask();if(!t)return noTask();renderOpsProof(t)},
 'ops-issue'(){setHead('Report Issue / Blocker','Send Admin the full context immediately.');const t=getOpsTask();if(!t)return noTask();renderOpsIssue(t)},
 'ops-instructions'(){setHead('Instructions','Project and task instructions from Admin.');const msgs=state.messages.filter(m=>m.to==='ops'&&m.thread==='broadcast');$('#appContent').innerHTML=`<div class="ops-home"><div class="panel"><h3>ADMIN INSTRUCTIONS</h3>${msgs.length?msgs.slice().reverse().map(m=>`<div class="task-card"><b>${esc(m.text)}</b><p>${m.time}</p></div>`).join(''):'<p>No new broadcast instructions.</p>'}</div>${state.tasks.filter(t=>t.assignedTo===session.user.id).map(t=>`<div class="task-card"><span class="status ${statusClass(t.priority)}">${t.priority}</span><h4>${esc(t.name)}</h4><p>${esc(t.instruction||'')}</p></div>`).join('')}</div>`},
 'ops-chat'(){setHead('Need Help / Chat','Task-linked conversation with Admin.');renderChat('ops')},
 'ops-contacts'(){setHead('Important Contacts','Quick operational contacts.');$('#appContent').innerHTML=`<div class="ops-home"><div class="panel"><h3>CONTROL ROOM</h3><p><b>Project Admin</b><br>Use project chat for task support.</p><p><b>Emergency / Medical</b><br>Configured by Admin per event.</p><p><b>Security Control</b><br>Configured by Admin per event.</p></div></div>`},
 'client-overview'(){setHead('Project Overview',`${state.project.name} • Client View`);const verified=state.tasks.filter(t=>t.verified).length;$('#appContent').innerHTML=`<div class="client-hero"><small>OVERALL PROJECT READINESS</small><div class="progress-line"><strong class="blue">${state.project.readiness}%</strong><div class="bar" style="flex:1"><i style="width:${state.project.readiness}%"></i></div><span class="status green">ON TRACK</span></div></div><div class="kpi-grid" style="grid-template-columns:repeat(4,1fr);margin-top:14px">${stat('VERIFIED',verified,'green')}${stat('IN PROGRESS',state.tasks.filter(t=>!t.verified).length)}${stat('MILESTONES','14 / 18')}${stat('CLIENT ACTIONS',state.approvals.filter(a=>a.status==='Pending').length,'amber')}</div><div class="panel-grid"><div class="panel"><h3>WHAT'S HAPPENING NOW</h3>${state.departments.slice(0,4).map(d=>`<div class="switch-line"><span><b>${d.name}</b><br><small>${d.status}</small></span><strong>${d.progress}%</strong></div>`).join('')}</div><div class="panel"><h3>YOUR ACTIONS</h3><div class="client-actions">${state.approvals.filter(a=>a.status==='Pending').slice(0,3).map(a=>`<div class="approval-card"><h4>${esc(a.title)}</h4><p>${esc(a.note)}</p><button class="btn primary" data-page="client-approvals">Open</button></div>`).join('')||'<p>No pending actions.</p>'}</div></div></div>`;$$('[data-page]','#appContent').forEach(b=>b.onclick=()=>navigate(b.dataset.page))},
 'client-progress'(){setHead('Department Progress','Only approved project progress is visible here.');$('#appContent').innerHTML=deptCards()},
 'client-proof'(){setHead('Verified Ground Proof','Only evidence approved by Admin.');const verified=state.tasks.filter(t=>t.verified);$('#appContent').innerHTML=`<div class="proof-grid">${verified.map(t=>proofClientCard(t)).join('')||'<div class="panel"><p>No verified proof yet.</p></div>'}</div>`},
 'client-approvals'(){setHead('Approvals & Information Requests','Respond without leaving the project dashboard.');$('#appContent').innerHTML=`<div class="panel-grid"><div class="panel"><h3>PENDING ACTIONS</h3>${state.approvals.map(a=>`<div class="approval-card"><span class="status ${a.status==='Pending'?'amber':'green'}">${a.status}</span><h4>${esc(a.title)}</h4><p>${esc(a.note)}</p>${a.status==='Pending'?`<div class="task-actions"><button class="verify" data-approve="${a.id}">✓ Approve / Complete</button><button class="rework" data-change="${a.id}">Request Change</button></div>`:''}</div>`).join('')}</div><div class="panel"><h3>CLIENT → ADMIN → OPS</h3><p>Your response is recorded in the project and can be routed by Admin to the relevant operations team.</p></div></div>`;$$('[data-approve]').forEach(b=>b.onclick=()=>{const a=state.approvals.find(x=>x.id===b.dataset.approve);a.status='Approved';save();pages['client-approvals']();toast('Response submitted to Admin.');});$$('[data-change]').forEach(b=>b.onclick=()=>{const a=state.approvals.find(x=>x.id===b.dataset.change);const m=prompt('What change is required?');if(m){a.status='Change Requested';state.messages.push({thread:'client-artwork',from:'client',to:'admin',text:m,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});save();pages['client-approvals']();toast('Change request sent.')}})},
 'client-docs'(){setHead('Documents','Approved project documents.');$('#appContent').innerHTML=`<div class="panel"><h3>DOCUMENT CENTRE</h3><div class="task-card"><b>Project Execution Summary</b><p>Client-safe project summary</p><button class="btn ghost" onclick="window.print()">Print / Save PDF</button></div><div class="task-card"><b>Approved Artwork Pack</b><p>Production-ready approved artwork</p></div></div>`},
 'client-chat'(){setHead('Client ↔ Admin Messages','One controlled project conversation.');renderChat('client')},
 'client-reports'(){setHead('Client Reports','A clean project record built from verified live updates.');$('#appContent').innerHTML=`<div class="panel-grid"><div class="panel"><h3>EXECUTIVE SUMMARY</h3><div class="switch-line"><span>Overall Readiness</span><b>${state.project.readiness}%</b></div><div class="switch-line"><span>Verified Milestones</span><b>${state.tasks.filter(t=>t.verified).length}</b></div><div class="switch-line"><span>Open Client Actions</span><b>${state.approvals.filter(a=>a.status==='Pending').length}</b></div><div class="switch-line"><span>Latest Update</span><b>${state.project.lastUpdate}</b></div><button class="btn primary" id="clientPrint" style="margin-top:14px">Print / Save PDF</button></div><div class="panel"><h3>CLIENT-SAFE INFORMATION ONLY</h3><p>Internal remarks, vendor disputes, private contacts and unverified issues remain hidden unless Admin explicitly changes visibility.</p></div></div>`;$('#clientPrint').onclick=()=>window.print()},
 'client-support'(){setHead('Support','Contact the project Admin.');$('#appContent').innerHTML=`<div class="panel"><h3>PROJECT SUPPORT</h3><p>Use <b>Messages</b> for project questions and approval discussions.</p><button class="btn primary" id="supportChat">Open Messages</button></div>`;$('#supportChat').onclick=()=>navigate('client-chat')},
 notFound(){setHead('Page');$('#appContent').innerHTML='<div class="panel">Page not found.</div>'}
};


async function eventLogoToDataUrl(file){
  if(!file) return '';
  if(!/^image\//i.test(file.type||'')) throw new Error('Please select an image file.');
  if(file.size > 8*1024*1024) throw new Error('Logo image is too large. Please use a file under 8 MB.');

  const raw=await new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onload=()=>resolve(reader.result);
    reader.onerror=()=>reject(new Error('Could not read the logo image.'));
    reader.readAsDataURL(file);
  });

  const img=await new Promise((resolve,reject)=>{
    const el=new Image();
    el.onload=()=>resolve(el);
    el.onerror=()=>reject(new Error('Could not process the logo image.'));
    el.src=raw;
  });

  const max=320;
  const scale=Math.min(1,max/Math.max(img.naturalWidth||1,img.naturalHeight||1));
  const w=Math.max(1,Math.round((img.naturalWidth||1)*scale));
  const h=Math.max(1,Math.round((img.naturalHeight||1)*scale));
  const canvas=document.createElement('canvas');
  canvas.width=w; canvas.height=h;
  const ctx=canvas.getContext('2d');
  ctx.clearRect(0,0,w,h);
  ctx.drawImage(img,0,0,w,h);
  return canvas.toDataURL('image/png');
}

function createProjectSetup(edit=false){
  const current=edit?(state.project||{}):{};
  const existingLogo=current.eventLogoData||'';
  $('#appContent').innerHTML=`<div class="panel" style="max-width:760px">
    <h3>${edit?'EDIT PROJECT':'CREATE NEW PROJECT'}</h3>
    <form id="projectSetupForm">
      <div class="form-group">
        <label>Marathon / Event Logo</label>
        <div style="display:flex;align-items:center;gap:14px;flex-wrap:wrap">
          <div id="projectLogoPreview" style="width:78px;height:78px;border:1px solid #dbe3ec;border-radius:16px;display:grid;place-items:center;overflow:hidden;background:#f7f9fb;font-weight:800;color:#0b2e50">
            ${existingLogo?`<img src="${existingLogo}" alt="Event logo" style="width:100%;height:100%;object-fit:contain">`:'LOGO'}
          </div>
          <div style="flex:1;min-width:220px">
            <input id="projectLogoFile" name="logoFile" type="file" accept="image/*">
            <small style="display:block;margin-top:7px;color:#6e7682">PNG/JPG recommended. The logo will appear in Command Center, Ops and Client headers.</small>
          </div>
        </div>
      </div>
      <div class="form-group"><label>Project / Event Name</label><input name="name" required value="${esc(current.name||'')}"></div>
      <div class="form-group"><label>Event Location</label><input name="location" required value="${esc(current.location||'')}"></div>
      <div class="form-group"><label>Event Date</label><input name="date" required type="date" value="${esc(current.date||'')}"></div>
      <div class="form-group"><label>Event Time</label><input name="time" required type="time" value="${esc(current.time||'')}"></div>
      <button class="btn primary full" type="submit">${edit?'Save Changes':'Create New Project'}</button>
    </form>
  </div>`;

  const logoInput=$('#projectLogoFile');
  if(logoInput){
    logoInput.onchange=async()=>{
      const file=logoInput.files?.[0];
      if(!file) return;
      try{
        const data=await eventLogoToDataUrl(file);
        $('#projectLogoPreview').innerHTML=`<img src="${data}" alt="Event logo preview" style="width:100%;height:100%;object-fit:contain">`;
        logoInput.dataset.previewData=data;
      }catch(err){
        logoInput.value='';
        delete logoInput.dataset.previewData;
        toast(err?.message||'Could not process logo.');
      }
    };
  }

  $('#projectSetupForm').onsubmit=async e=>{
    e.preventDefault();
    const submitBtn=e.target.querySelector('button[type="submit"]');
    if(submitBtn){submitBtn.disabled=true;submitBtn.textContent='Saving…';}
    try{
      const fd=new FormData(e.target);
      const f=Object.fromEntries(fd);
      const name=String(f.name||'').trim();
      const location=String(f.location||'').trim();
      if(!name||!location||!f.date||!f.time) return toast('Please complete event name, location, date and time.');

      let eventLogoData=existingLogo;
      const file=logoInput?.files?.[0];
      if(file){
        eventLogoData=logoInput.dataset.previewData||await eventLogoToDataUrl(file);
      }

      if(!edit && hasProject()){
        state.archivedProjects.unshift({
          archivedAt:new Date().toISOString(),
          project:structuredClone(state.project),
          tasks:structuredClone(state.tasks||[]),
          departments:structuredClone(state.departments||[]),
          vendors:structuredClone(state.vendors||[]),
          approvals:structuredClone(state.approvals||[]),
          issues:structuredClone(state.issues||[]),
          messages:structuredClone(state.messages||[]),
          fieldTemplate:structuredClone(state.fieldTemplate||DEFAULT_TASK_FIELDS),
          proofRules:structuredClone(state.proofRules||DEFAULT_PROOF_RULES),
          opsRules:structuredClone(state.opsRules||DEFAULT_OPS_RULES),
          clientRules:structuredClone(state.clientRules||DEFAULT_CLIENT_RULES)
        });
        state.tasks=[];state.departments=[];state.vendors=[];state.approvals=[];state.issues=[];state.messages=[];
        state.fieldTemplate=structuredClone(DEFAULT_TASK_FIELDS);
        state.proofRules={...DEFAULT_PROOF_RULES};
      }

      state.project={
        id:edit?(state.project?.id||('PRJ-'+Date.now().toString(36).toUpperCase())):('PRJ-'+Date.now().toString(36).toUpperCase()),
        name,location,date:f.date,time:f.time,
        eventDay:[f.date,f.time].join(' • '),
        eventLogoData,
        eventLogo:name.split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'ML',
        readiness:Number(edit?state.project?.readiness||0:0),
        lastUpdate:new Date().toLocaleString()
      };
      state=normalizeState(state);
      save();
      toast(edit?'Project updated successfully.':'New project created successfully.');
      navigate('projects');
    }catch(err){
      console.error(err);
      toast(err?.message||'Project could not be saved.');
    }finally{
      if(submitBtn){submitBtn.disabled=false;submitBtn.textContent=edit?'Save Changes':'Create New Project';}
    }
  };
}
function taskCard(t,urgent=false){return `<div class="task-card"><span class="status ${statusClass(urgent?'Critical':t.priority)}">${urgent?'URGENT':t.priority}</span><h4>${esc(t.name)}</h4><div class="task-meta"><span>${t.id}</span><span>${esc(t.zone)}</span><span>Deadline ${esc(t.deadline)}</span></div><div class="bar"><i style="width:${t.progress}%"></i></div><div class="task-actions"><button class="btn primary" data-task-open="${t.id}">${t.status==='Not Started'?'START / OPEN':'OPEN TASK'}</button>${!t.verified?`<button class="btn ghost" data-task-help="${t.id}">NEED HELP</button>`:''}</div></div>`}
function bindTaskButtons(){ $$('[data-task-open]').forEach(b=>b.onclick=()=>{session.selectedTask=b.dataset.taskOpen;navigate('ops-update')});$$('[data-task-help]').forEach(b=>b.onclick=()=>{session.selectedTask=b.dataset.taskHelp;navigate('ops-chat')}) }
function getOpsTask(){return state.tasks.find(t=>t.id===session.selectedTask)||state.tasks.find(t=>t.assignedTo===session.user.id&&!t.verified)||state.tasks.find(t=>t.assignedTo===session.user.id)}
function noTask(){$('#appContent').innerHTML='<div class="panel"><p>No assigned task selected.</p></div>'}
function renderOpsUpdate(t){session.selectedTask=t.id;const fields=(Array.isArray(t.fields)&&t.fields.length)?t.fields:(state.fieldTemplate?.length?state.fieldTemplate:DEFAULT_TASK_FIELDS);$('#appContent').innerHTML=`<div class="ops-home"><div class="task-card"><span class="status ${statusClass(t.priority)}">${t.priority}</span><h4>${esc(t.name)}</h4><p>${esc(t.instruction||'')}</p><div class="task-meta"><span>${t.id}</span><span>${esc(t.zone)}</span><span>${esc(t.deadline)}</span></div></div><form class="panel" id="opsUpdateForm"><h3>ADMIN-REQUIRED INFORMATION</h3>${fields.map((f,i)=>opsField(f,i,t)).join('')}<button class="btn primary full" type="submit">Save Update</button></form><div class="page-actions" style="margin-top:10px"><button class="btn ghost" id="goProof">Next: Upload Proof</button><button class="btn ghost" id="goIssue">Report Issue</button></div></div>`;$('#opsUpdateForm').onsubmit=e=>{e.preventDefault();const fd=new FormData(e.target);const status=fd.get('field-0')||t.status;const prog=Number(fd.get('field-1')||t.progress);t.status=status;t.progress=Math.max(0,Math.min(100,prog));t.remark=fd.get('field-4')||t.remark;const issue=fd.get('field-3');if(issue&&issue!=='No')t.issue=issue;save();toast('Task update saved.');};$('#goProof').onclick=()=>navigate('ops-proof');$('#goIssue').onclick=()=>navigate('ops-issue')}
function opsField(f,i,t){let val='';if(i===0)val=t.status;if(i===1)val=t.progress;if(i===4)val=t.remark;const req=f.required?'required':'';if(f.type==='dropdown')return `<div class="form-group"><label>${esc(f.label)}${f.required?' *':''}</label><select name="field-${i}" ${req}>${(f.options||[]).map(o=>`<option ${o==val?'selected':''}>${esc(o)}</option>`).join('')}</select></div>`;if(f.type==='remark')return `<div class="form-group"><label>${esc(f.label)}${f.required?' *':''}</label><textarea name="field-${i}" rows="3" ${req}>${esc(val)}</textarea></div>`;return `<div class="form-group"><label>${esc(f.label)}${f.required?' *':''}</label><input name="field-${i}" type="${f.type==='number'?'number':'text'}" value="${esc(val)}" ${req}></div>`}
function renderOpsProof(t){session.selectedTask=t.id;$('#appContent').innerHTML=`<div class="ops-home"><div class="panel"><h3>${esc(t.name)}</h3><p>Minimum ${t.proofMin} photo(s) required by Admin.</p><div class="upload-grid" id="proofTiles">${[...Array(Math.max(t.proofMin,3))].map((_,i)=>proofTile(t,i)).join('')}</div><input class="hidden" type="file" id="proofInput" accept="image/*" capture="environment"><div style="margin-top:14px"><span class="status ${t.proofs.length>=t.proofMin?'green':'amber'}">${t.proofs.length} / ${t.proofMin} UPLOADED</span></div><button class="btn primary full" id="submitProof" style="margin-top:14px" ${t.proofs.length<t.proofMin?'disabled':''}>Submit for Admin Verification</button></div></div>`;let targetIndex=0;$$('[data-proof-slot]').forEach(b=>b.onclick=()=>{targetIndex=Number(b.dataset.proofSlot);$('#proofInput').click()});$('#proofInput').onchange=async e=>{
  const file=e.target.files[0];if(!file)return;
  try{
    const localData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file)});
    let data=localData, syncPending=false;
    if(window.LiveOpsCloud?.isConfigured()){
      if(navigator.onLine){
        try{toast('Uploading proof…');const uploaded=await window.LiveOpsCloud.uploadProof(t.id,file);data=uploaded.url;}
        catch(uploadErr){console.warn(uploadErr);syncPending=true;await window.LiveOpsResilience?.queueProof(t.id,file,localData);}
      }else{syncPending=true;await window.LiveOpsResilience?.queueProof(t.id,file,localData);}
    }
    t.proofs[targetIndex]={name:file.name,data,localData,syncPending,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})};
    save();renderOpsProof(t);toast('Photo added.');
  }catch(err){console.error(err);toast('Photo upload failed.');}
};$('#submitProof').onclick=()=>{if(t.proofs.length<t.proofMin)return toast(`Upload at least ${t.proofMin} photos.`);t.status='Finished';t.progress=100;t.verified=false;save();toast('Submitted for Admin verification.');navigate('ops-tasks')}}
function proofTile(t,i){const p=t.proofs[i];return `<button class="upload-tile" data-proof-slot="${i}">${p?`<img src="${p.data}" alt="Proof ${i+1}">${p.syncPending?'<em class="proof-sync">Queued</em>':''}`:`<span>＋<br>Photo ${i+1}</span>`}</button>`}
function renderOpsIssue(t){$('#appContent').innerHTML=`<div class="ops-home"><form class="panel" id="issueForm"><h3>${esc(t.name)}</h3><div class="form-group"><label>Issue Type</label><select name="type"><option>Material Not Reached</option><option>Manpower Shortage</option><option>Vehicle Delay</option><option>Permission Issue</option><option>Safety Issue</option><option>Other</option></select></div><div class="form-group"><label>Severity</label><select name="severity"><option>High</option><option>Medium</option><option>Low</option><option>Critical</option></select></div><div class="form-group"><label>Remark</label><textarea required name="remark" rows="4"></textarea></div><button class="btn primary full" type="submit" style="background:var(--red)">Send to Admin</button></form></div>`;$('#issueForm').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target);state.issues.unshift({id:'IS-'+Date.now(),task:t.id,title:f.get('remark'),severity:f.get('severity'),status:'Open',time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});t.issue=f.get('type');if(/critical|high/i.test(f.get('severity')))t.status='Blocked';save();toast('Issue sent to Admin.');navigate('ops-home')}}

function renderVendors(){
  state.vendors=Array.isArray(state.vendors)?state.vendors:[];
  $('#appContent').innerHTML=`<div class="panel">
    <h3>LOGISTICS CONTROL FIELDS</h3>
    <form id="vendorForm"><div class="form-grid">
      <div class="form-group"><label>Vendor Name</label><input required name="vendorName"></div>
      <div class="form-group"><label>Vendor POC</label><input required name="vendorPoc"></div>
      <div class="form-group"><label>Contact</label><input name="contact"></div>
      <div class="form-group"><label>Vehicle No.</label><input name="vehicleNo"></div>
      <div class="form-group"><label>Driver No.</label><input name="driverNo"></div>
      <div class="form-group"><label>ETA</label><input name="eta" type="time"></div>
      <div class="form-group span2"><label>Material / Quantity</label><textarea required name="material" rows="3"></textarea></div>
    </div><button class="btn primary" type="submit" style="margin-top:14px">Save Logistics Record</button></form>
  </div>
  <div class="panel" style="margin-top:16px"><h3>SAVED LOGISTICS RECORDS</h3>
    <div class="data-table"><div class="data-head"><span>Vendor</span><span>POC</span><span>Contact</span><span>Vehicle</span><span>ETA</span><span>Action</span></div>
    ${state.vendors.map(v=>`<div class="data-row"><b>${esc(v.vendorName)}</b><span>${esc(v.vendorPoc)}</span><span>${esc(v.contact||'—')}</span><span>${esc(v.vehicleNo||'—')}</span><span>${esc(v.eta||'—')}</span><button data-delete-vendor="${v.id}">Delete</button></div>`).join('')||'<div style="padding:16px">No logistics records yet.</div>'}
    </div>
  </div>`;
  $('#vendorForm').onsubmit=e=>{
    e.preventDefault();
    const f=Object.fromEntries(new FormData(e.target));
    state.vendors.unshift({id:'VEN-'+Date.now().toString(36).toUpperCase(),...f,createdAt:new Date().toISOString()});
    save();toast('Logistics record saved.');renderVendors();
  };
  $$('[data-delete-vendor]').forEach(b=>b.onclick=()=>{
    state.vendors=state.vendors.filter(v=>v.id!==b.dataset.deleteVendor);
    save();renderVendors();toast('Logistics record deleted.');
  });
}

function renderProofRules(){
  const draft={...DEFAULT_PROOF_RULES,...(state.proofRules||{})};
  $('#appContent').innerHTML=`<div class="panel" style="max-width:860px">
    <h3>DEFAULT PROOF POLICY</h3>
    <div class="form-grid"><div class="form-group"><label>Minimum Photos per Task</label><input id="proofMinDefault" type="number" min="0" max="20" value="${Number(draft.minPhotos||0)}"></div></div>
    ${[['liveCamera','Live camera capture required'],['gpsRequired','GPS location required'],['adminVerification','Command Center verification required'],['clientAfterVerification','Show proof to Client only after verification']].map(([k,l])=>`<div class="switch-line"><span>${l}</span><button type="button" class="switch ${draft[k]?'on':''}" data-proof-rule="${k}">${draft[k]?'ON':'OFF'}</button></div>`).join('')}
    <button class="btn primary" id="saveProofRules" style="margin-top:16px">Save Proof Rules</button>
  </div>`;
  $$('[data-proof-rule]').forEach(b=>b.onclick=()=>{const k=b.dataset.proofRule;draft[k]=!draft[k];b.classList.toggle('on',draft[k]);b.textContent=draft[k]?'ON':'OFF';});
  $('#saveProofRules').onclick=()=>{draft.minPhotos=Math.max(0,Number($('#proofMinDefault').value||0));state.proofRules=draft;save();toast('Proof rules saved.');};
}

function renderTaskForm(id){const t=id?state.tasks.find(x=>x.id===id):null;setHead(t?'Edit Task':'Create / Configure Task','Admin decides what Ops must do, submit and prove.');$('#appContent').innerHTML=`<div class="panel-grid"><form class="panel" id="taskForm"><h3>${t?'EDIT TASK':'NEW TASK'}</h3><div class="form-grid"><div class="form-group span2"><label>Task Name</label><input required name="name" value="${esc(t?.name||'')}"></div><div class="form-group"><label>Phase</label><select name="phase"><option>Expo</option><option>Venue</option><option>Race Course</option><option>Dismantling</option></select></div><div class="form-group"><label>Department</label><select name="department">${state.departments.map(d=>`<option ${d.name===t?.department?'selected':''}>${d.name}</option>`).join('')}</select></div><div class="form-group"><label>Zone / Location</label><input name="zone" value="${esc(t?.zone||'')}"></div><div class="form-group"><label>Assigned To</label><select name="assignedTo">${state.users.filter(u=>u.role==='ops').map(u=>`<option value="${u.id}" ${u.id===t?.assignedTo?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div><div class="form-group"><label>Priority</label><select name="priority"><option>Low</option><option>Medium</option><option>High</option><option>Critical</option></select></div><div class="form-group"><label>Deadline</label><input name="deadline" type="time"></div><div class="form-group"><label>Minimum Photos</label><input name="proofMin" type="number" min="0" value="${t?.proofMin??state.proofRules?.minPhotos??3}"></div><div class="form-group"><label>Client Visibility</label><select name="clientVisibility"><option>Hidden</option><option>Status Only</option><option>Status + Approved Proof</option><option>Full Update</option></select></div><div class="form-group span2"><label>Instruction</label><textarea name="instruction" rows="3">${esc(t?.instruction||'')}</textarea></div></div><button class="btn primary" type="submit" style="margin-top:14px">Save & Assign</button></form><div class="panel"><h3>TASK RULES</h3>${['Proof mandatory','Admin verification','Ops can edit','Escalate if overdue','Allow reopen'].map(x=>`<div class="switch-line"><span>${x}</span><span class="switch on">ON</span></div>`).join('')}<p style="margin-top:18px"><b>Completion Flow</b><br><br>ASSIGN → EXECUTE → PROVE → VERIFY → CLOSE</p></div></div>`;$('#taskForm').onsubmit=e=>{e.preventDefault();const f=Object.fromEntries(new FormData(e.target));if(t){Object.assign(t,f,{proofMin:Number(f.proofMin)});}else{state.tasks.unshift({id:'TS-'+Date.now().toString().slice(-5),...f,proofMin:Number(f.proofMin),status:'Not Started',progress:0,verification:true,proofs:[],remark:'',issue:'',verified:false,fields:structuredClone(state.fieldTemplate?.length?state.fieldTemplate:DEFAULT_TASK_FIELDS)})}save();toast('Task saved and assigned.');navigate('tasks')}}
function renderAddTeam(){
  setHead('Create Access','Create secure website login access for Admin, Ops Team or Client.');
  const departments=state.departments.map(d=>`<option value="${esc(d.name)}">${esc(d.name)}</option>`).join('');
  $('#appContent').innerHTML=`
    <div class="page-actions access-top-actions">
      <button class="btn ghost" id="accessBack">← Back</button>
      <button class="btn ghost" id="accessListBtn">Access List</button>
    </div>
    <form class="panel" id="teamForm">
      <div class="form-grid">
        <div class="form-group"><label>Full Name</label><input required name="name" autocomplete="name"></div>
        <div class="form-group"><label>User ID</label><input required name="userId" autocomplete="username" placeholder="e.g. Amit123"></div>
        <div class="form-group"><label>Password</label><input required name="password" type="password" minlength="6" autocomplete="new-password" placeholder="Minimum 6 characters"></div>
        <div class="form-group"><label>Access To</label><select required name="accessTo" id="accessTo"><option value="ops">Ops Team</option><option value="client">Client</option><option value="admin">Admin</option></select></div>
      </div>
      <div id="opsAccessFields" class="form-grid ops-access-fields">
        <div class="form-group"><label>Department</label><select name="department">${departments}</select></div>
        <div class="form-group"><label>Role</label><select name="opsRole"><option>Supervisor</option><option>Coordinator</option><option>Lead</option><option>Verifier</option><option>Team Member</option></select></div>
        <div class="form-group"><label>Zone</label><input name="zone" placeholder="Assigned Area"></div>
      </div>
      <div id="clientAccessNote" class="access-note hidden"><b>Client Access:</b> Full approved event visibility. Department, Role and Zone restrictions are not required.</div>
      <div id="adminAccessNote" class="access-note hidden"><b>Admin Access:</b> Command Center management access for this event.</div>
      <button class="btn primary" id="createAccessBtn" type="submit" style="margin-top:14px">Create Access</button>
    </form>`;
  const form=$('#teamForm'), accessTo=$('#accessTo'), opsFields=$('#opsAccessFields'), clientNote=$('#clientAccessNote'), adminNote=$('#adminAccessNote');
  function syncAccessFields(){
    const v=accessTo.value;
    opsFields.classList.toggle('hidden',v!=='ops');
    clientNote.classList.toggle('hidden',v!=='client');
    adminNote.classList.toggle('hidden',v!=='admin');
    $$('select,input',opsFields).forEach(el=>el.disabled=v!=='ops');
  }
  accessTo.onchange=syncAccessFields; syncAccessFields();
  $('#accessBack').onclick=()=>navigate('team');
  $('#accessListBtn').onclick=openAccessList;
  form.onsubmit=async e=>{
    e.preventDefault();
    const btn=$('#createAccessBtn');
    const f=Object.fromEntries(new FormData(form));
    const account={
      name:String(f.name||'').trim(),userId:String(f.userId||'').trim(),password:String(f.password||''),accessTo:f.accessTo,
      department:f.accessTo==='ops'?(f.department||''):'',opsRole:f.accessTo==='ops'?(f.opsRole||''):'',zone:f.accessTo==='ops'?(f.zone||''):'',isActive:true
    };
    if(!/^[A-Za-z0-9._-]{3,40}$/.test(account.userId)) return toast('User ID: use 3–40 letters, numbers, dot, underscore or hyphen.');
    if(account.password.length<6) return toast('Password must be at least 6 characters.');
    btn.disabled=true;btn.textContent='Creating…';
    try{
      if(window.LiveOpsCloud?.isConfigured()){
        await window.LiveOpsCloud.createAccess(account);
      }else{
        if(state.users.some(x=>x.id.toLowerCase()===account.userId.toLowerCase())) throw new Error('This User ID already exists.');
        state.users.push({id:account.userId,password:account.password,role:account.accessTo,name:account.name,department:account.department,zone:account.zone});
      }
      if(account.accessTo==='ops'){
        const existing=state.team.find(x=>String(x.userId).toLowerCase()===account.userId.toLowerCase());
        const row={name:account.name,userId:account.userId,role:account.opsRole,department:account.department,zone:account.zone,access:'Assigned by role',status:'Active'};
        existing?Object.assign(existing,row):state.team.push(row);
      }
      localStorage.setItem(STORE,JSON.stringify(state));
      showCreatedAccessCard(account);
      toast('Access created successfully.');
      form.reset();accessTo.value='ops';syncAccessFields();
    }catch(err){console.error('CREATE ACCESS ERROR:',err);toast(err?.message||'Could not create access.');}
    finally{btn.disabled=false;btn.textContent='Create Access';}
  };
}


function showCreatedAccessCard(account){
  document.getElementById('createdAccessModal')?.remove();
  const type={ops:'Ops Team',client:'Client',admin:'Admin'}[account.accessTo]||account.accessTo;
  const overlay=document.createElement('div');
  overlay.className='access-modal-overlay';
  overlay.id='createdAccessModal';
  overlay.innerHTML=`<div class="access-modal-card" style="max-width:620px">
    <div class="access-modal-head">
      <div><h2>Access Created</h2><p>Share these credentials with the user now. The password will not be shown later.</p></div>
      <button class="access-modal-close" aria-label="Close">×</button>
    </div>
    <div class="panel" style="margin:0">
      <p><b>Full Name:</b> ${esc(account.name)}</p>
      <p><b>Access:</b> ${esc(type)}</p>
      <p><b>User ID:</b> <span id="createdUserId">${esc(account.userId)}</span></p>
      <p><b>Password:</b> <span id="createdPassword">${esc(account.password)}</span></p>
      ${account.accessTo==='ops'?`<p><b>Department:</b> ${esc(account.department||'—')}</p><p><b>Role:</b> ${esc(account.opsRole||'—')}</p><p><b>Zone:</b> ${esc(account.zone||'—')}</p>`:''}
      <div class="page-actions" style="margin-top:16px">
        <button class="btn primary" type="button" id="copyCreatedAccess">Copy Login Details</button>
        <button class="btn ghost" type="button" id="closeCreatedAccess">Done</button>
      </div>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  const close=()=>overlay.remove();
  overlay.querySelector('.access-modal-close').onclick=close;
  overlay.querySelector('#closeCreatedAccess').onclick=close;
  overlay.onclick=e=>{if(e.target===overlay)close();};
  overlay.querySelector('#copyCreatedAccess').onclick=async()=>{
    const text=`Marathon LiveOps\nName: ${account.name}\nAccess: ${type}\nUser ID: ${account.userId}\nPassword: ${account.password}${account.accessTo==='ops'?`\nDepartment: ${account.department||'—'}\nRole: ${account.opsRole||'—'}\nZone: ${account.zone||'—'}`:''}`;
    try{await navigator.clipboard.writeText(text);toast('Login details copied.');}
    catch(_){toast('Please screenshot the login details.');}
  };
}

function demoAccessList(){
  return (state.users||[]).map(u=>{
    const tm=(state.team||[]).find(t=>String(t.userId).toLowerCase()===String(u.id).toLowerCase());
    return {userId:u.id,name:u.name||u.id,accessTo:u.role,department:u.role==='ops'?(tm?.department||u.department||''):'',opsRole:u.role==='ops'?(tm?.role||''):'',zone:u.role==='ops'?(tm?.zone||u.zone||''):'',isActive:tm?.status!=='Disabled'};
  });
}

async function openAccessList(){
  let rows=[];
  try{
    rows=window.LiveOpsCloud?.isConfigured()?((await window.LiveOpsCloud.listAccess())?.accounts||[]):demoAccessList();
    const ownerId=String(session?.user?.id||'').trim().toLowerCase();
    rows=rows.filter(a=>{
      const id=String(a.userId||'').trim().toLowerCase();
      return !(session?.role==='admin' && ownerId && id===ownerId);
    });
  }catch(err){console.error(err);return toast(err?.message||'Could not load access list.');}
  document.getElementById('accessListModal')?.remove();
  const overlay=document.createElement('div');overlay.className='access-modal-overlay';overlay.id='accessListModal';
  overlay.innerHTML=`<div class="access-modal-card"><div class="access-modal-head"><div><h2>Access List</h2><p>${rows.length} account${rows.length===1?'':'s'} for this event</p></div><button class="access-modal-close" aria-label="Close">×</button></div><div class="access-table-wrap"><table class="access-table"><thead><tr><th>Full Name</th><th>User ID</th><th>Access To</th><th>Department</th><th>Role</th><th>Zone</th><th>Status</th><th>Actions</th></tr></thead><tbody>${rows.map(accessRowHtml).join('')||'<tr><td colspan="8" class="access-empty">No access has been created yet.</td></tr>'}</tbody></table></div></div>`;
  document.body.appendChild(overlay);
  overlay.querySelector('.access-modal-close').onclick=()=>overlay.remove();
  overlay.onclick=e=>{if(e.target===overlay)overlay.remove();};
  $$('[data-access-action]',overlay).forEach(b=>b.onclick=()=>handleAccessAction(b.dataset.accessAction,b.dataset.userId,b,overlay));
}

function accessRowHtml(a){
  const type={ops:'Ops Team',client:'Client',admin:'Admin'}[a.accessTo||a.role]||a.accessTo||a.role||'—';
  const active=a.isActive!==false;
  return `<tr data-access-user="${esc(a.userId)}"><td><b>${esc(a.name||'—')}</b></td><td>${esc(a.userId)}</td><td>${esc(type)}</td><td>${esc(a.department||'—')}</td><td>${esc(a.opsRole||'—')}</td><td>${esc(a.zone||'—')}</td><td><span class="status ${active?'green':'red'}">${active?'Active':'Disabled'}</span></td><td><div class="access-actions"><button data-access-action="toggle" data-user-id="${esc(a.userId)}">${active?'Disable':'Enable'}</button><button data-access-action="password" data-user-id="${esc(a.userId)}">Reset Password</button><button class="danger" data-access-action="delete" data-user-id="${esc(a.userId)}">Delete</button></div></td></tr>`;
}

async function handleAccessAction(action,userId,button,overlay){
  try{
    if(action==='toggle'){
      const isEnabling=button.textContent.trim()==='Enable';
      if(window.LiveOpsCloud?.isConfigured()) await window.LiveOpsCloud.setAccessActive(userId,isEnabling);
      else{
        const tm=state.team.find(x=>String(x.userId).toLowerCase()===userId.toLowerCase());if(tm)tm.status=isEnabling?'Active':'Disabled';
      }
      overlay.remove();toast(isEnabling?'Access enabled.':'Access disabled.');openAccessList();return;
    }
    if(action==='password'){
      const pw=prompt('Enter a new password (minimum 6 characters):');if(pw===null)return;if(pw.length<6)return toast('Password must be at least 6 characters.');
      if(window.LiveOpsCloud?.isConfigured()) await window.LiveOpsCloud.resetAccessPassword(userId,pw);
      else{const u=state.users.find(x=>x.id===userId);if(u)u.password=pw;localStorage.setItem(STORE,JSON.stringify(state));}
      toast('Password reset successfully.');return;
    }
    if(action==='delete'){
      if(!confirm(`Delete access for ${userId}? This user will no longer be able to log in.`))return;
      if(window.LiveOpsCloud?.isConfigured()) await window.LiveOpsCloud.deleteAccess(userId);
      else{state.users=state.users.filter(x=>x.id!==userId);state.team=state.team.filter(x=>x.userId!==userId);localStorage.setItem(STORE,JSON.stringify(state));}
      overlay.remove();toast('Access deleted.');openAccessList();
    }
  }catch(err){console.error(err);toast(err?.message||'Access action failed.');}
}

let builderFields=structuredClone(DEFAULT_TASK_FIELDS);
function resetBuilderFieldsFromState(){builderFields=structuredClone(state.fieldTemplate?.length?state.fieldTemplate:DEFAULT_TASK_FIELDS);}
function renderFieldBuilder(){ $('#appContent').innerHTML=`<div class="field-builder"><div class="panel"><h3>ADD FIELD</h3><div class="field-palette">${[['text','T  Text'],['number','123  Number'],['dropdown','⌄  Dropdown'],['multiselect','☑  Multi-select'],['yesno','◉  Yes / No'],['datetime','◷  Date & Time'],['location','⌖  Location'],['photo','▧  Photo'],['video','▶  Video'],['file','▤  File'],['remark','≡  Remark']].map(x=>`<button data-add-field="${x[0]}">${x[1]}</button>`).join('')}</div></div><div class="panel"><h3>REQUIRED INFORMATION TEMPLATE</h3><div class="field-list">${builderFields.map((f,i)=>fieldRow(f,i)).join('')}</div><div class="page-actions" style="margin-top:14px"><button class="btn primary" id="saveTemplate">Save Template</button><button class="btn ghost" id="applyTemplate">Apply to Selected Ops Task</button></div></div></div>`;$$('[data-add-field]').forEach(b=>b.onclick=()=>{builderFields.push({label:'New Field',type:b.dataset.addField,required:false,opsEdit:true,client:'No',options:b.dataset.addField==='dropdown'?['Option 1','Option 2']:[]});renderFieldBuilder()});$$('[data-field-index]').forEach(r=>{const i=Number(r.dataset.fieldIndex);r.querySelector('[name=label]').oninput=e=>builderFields[i].label=e.target.value;r.querySelector('[name=required]').onchange=e=>builderFields[i].required=e.target.value==='Yes';r.querySelector('[name=opsEdit]').onchange=e=>builderFields[i].opsEdit=e.target.value==='Yes';r.querySelector('[name=client]').onchange=e=>builderFields[i].client=e.target.value;r.querySelector('[data-remove-field]').onclick=()=>{builderFields.splice(i,1);renderFieldBuilder()}});$('#saveTemplate').onclick=()=>{state.fieldTemplate=structuredClone(builderFields);save();toast('Field template saved.');};$('#applyTemplate').onclick=()=>{const id=prompt('Enter Task ID to apply this template:');const t=state.tasks.find(x=>x.id===id);if(!t)return toast('Task not found.');t.fields=structuredClone(builderFields);save();toast('Field template applied to '+id);}}
function fieldRow(f,i){return `<div class="field-row" data-field-index="${i}"><input name="label" value="${esc(f.label)}"><span>${esc(f.type)}</span><select name="required"><option ${f.required?'selected':''}>Yes</option><option ${!f.required?'selected':''}>No</option></select><select name="opsEdit"><option ${f.opsEdit?'selected':''}>Yes</option><option ${!f.opsEdit?'selected':''}>No</option></select><select name="client"><option>${esc(f.client||'No')}</option><option>No</option><option>Yes</option><option>Status</option><option>Approved</option></select><button data-remove-field>×</button></div>`}
function renderProofs(){const pending=state.tasks.filter(t=>t.status==='Finished'&&!t.verified);$('#appContent').innerHTML=`<div class="proof-grid">${pending.map(t=>proofAdminCard(t)).join('')||'<div class="panel"><p>No proof awaiting verification.</p></div>'}</div>`;$$('[data-verify]').forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.verify);t.verified=true;save();renderProofs();toast('Task verified. Client visibility updated.');});$$('[data-rework]').forEach(b=>b.onclick=()=>{const t=state.tasks.find(x=>x.id===b.dataset.rework);const reason=prompt('Rework reason:','Please upload clearer proof and recheck alignment.');if(reason){t.status='Working';t.verified=false;state.messages.push({thread:t.id,from:'admin',to:'ops',text:'Rework required: '+reason,time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})});save();renderProofs();toast('Rework sent to Ops.')}})}
function proofAdminCard(t){const p=t.proofs[0]?.data;return `<div class="proof-card"><div class="proof-photo" style="${p?`background-image:url('${p}')`:''}">${p?'':'VERIFIED PHOTO / PROOF'}</div><div class="proof-body"><span class="status amber">PENDING VERIFICATION</span><h4>${esc(t.name)}</h4><p>${t.id} • ${esc(t.department)} • ${t.proofs.length} proof(s)<br>${esc(t.remark||'No remark')}</p><div class="proof-actions"><button class="verify" data-verify="${t.id}">✓ VERIFY</button><button class="rework" data-rework="${t.id}">↻ REWORK</button></div></div></div>`}
function proofClientCard(t){const p=t.proofs[0]?.data;return `<div class="proof-card"><div class="proof-photo" style="${p?`background-image:url('${p}')`:''}">${p?'':'VERIFIED GROUND PROOF'}</div><div class="proof-body"><span class="status green">✓ VERIFIED</span><h4>${esc(t.name)}</h4><p>${esc(t.department)} • ${esc(t.zone)}</p></div></div>`}
function chatThreadFor(viewer){
  if(viewer==='client') return 'client-general';
  if(viewer==='ops') return session.selectedTask||'ops-general';
  return session.chatThread||'ops-general';
}
function roleCanSeeMessage(viewer,m){
  if(viewer==='admin') return true;
  return m.from===viewer||m.to===viewer;
}
function markThreadRead(viewer,thread){
  if(viewer==='admin'||viewer==='ops'||viewer==='client'){
    let changed=false;
    state.messages.forEach(m=>{
      if(m.thread===thread && m.to===viewer){
        m.readBy=Array.isArray(m.readBy)?m.readBy:[];
        if(!m.readBy.includes(viewer)){m.readBy.push(viewer);changed=true;}
      }
    });
    if(changed) save();
  }
}
function renderChat(viewer){
  const allowed=state.messages.filter(m=>roleCanSeeMessage(viewer,m));
  let threads=[...new Set(allowed.map(m=>m.thread).filter(Boolean))];

  if(viewer==='ops'&&!threads.includes('ops-general')) threads.unshift('ops-general');
  if(viewer==='client'&&!threads.includes('client-general')) threads.unshift('client-general');
  if(viewer==='admin'&&!threads.length) threads=['ops-general','client-general'];

  let selected=session.chatThread;
  if(!selected || !threads.includes(selected)){
    selected=chatThreadFor(viewer);
    if(!threads.includes(selected)) threads.unshift(selected);
  }
  session.chatThread=selected;
  markThreadRead(viewer,selected);

  const messages=state.messages.filter(m=>roleCanSeeMessage(viewer,m)&&m.thread===selected);
  $('#appContent').innerHTML=`<div class="chat-layout">
    <div class="thread-list">
      ${threads.map(t=>{
        const last=allowed.filter(m=>m.thread===t).slice(-1)[0];
        const unread=state.messages.filter(m=>m.thread===t&&m.to===viewer&&!(m.readBy||[]).includes(viewer)).length;
        return `<div class="thread ${t===selected?'active':''}" data-thread="${esc(t)}">
          <b>${esc(t)}</b>
          <small>${last?esc(last.text):'Start conversation'}${unread?` • ${unread} new`:''}</small>
        </div>`;
      }).join('')}
    </div>
    <div class="chat-box">
      <div class="messages">
        ${messages.map(m=>`<div class="bubble ${m.from===viewer?'me':''}">${esc(m.text)}<small>${String(m.from||'').toUpperCase()} • ${esc(m.time||'')}</small></div>`).join('')||'<div style="padding:18px;color:#6e7682">No messages yet. Send the first message.</div>'}
      </div>
      <form class="chat-compose" id="chatForm">
        <input required placeholder="Type a message…">
        <button class="btn primary">Send</button>
      </form>
    </div>
  </div>`;

  $$('[data-thread]').forEach(x=>x.onclick=()=>{session.chatThread=x.dataset.thread;renderChat(viewer)});
  $('#chatForm').onsubmit=e=>{
    e.preventDefault();
    const input=e.target.querySelector('input'),text=input.value.trim();
    if(!text)return;
    let to='admin';
    if(viewer==='admin'){
      const historical=state.messages.filter(m=>m.thread===selected);
      to=selected.startsWith('client')||historical.some(m=>m.from==='client'||m.to==='client')?'client':'ops';
    }
    state.messages.push({
      id:'MSG-'+Date.now().toString(36).toUpperCase(),
      thread:selected,
      from:viewer,
      to,
      text,
      time:new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}),
      createdAt:new Date().toISOString(),
      readBy:[viewer]
    });
    save();
    input.value='';
    renderChat(viewer);
  };
}
function exportTasksCSV(){const rows=[['ID','Task','Department','Zone','Priority','Status','Progress','Deadline','Verified'],...state.tasks.map(t=>[t.id,t.name,t.department,t.zone,t.priority,t.status,t.progress,t.deadline,t.verified])];const csv=rows.map(r=>r.map(v=>`"${String(v).replaceAll('"','""')}"`).join(',')).join('\n');const blob=new Blob([csv],{type:'text/csv'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='marathon-liveops-tasks.csv';a.click();URL.revokeObjectURL(url);toast('CSV exported.')}

// Production-mode indicator: never disguise demo/local mode as a connected live backend.
if(!window.LiveOpsCloud?.isConfigured()){
  const lp=document.querySelector('.live-pill');
  if(lp){lp.textContent='● DEMO MODE';lp.style.background='#fff4d6';lp.style.color='#8a5a00';}
}


// V4 connectivity + offline queue UI
(function(){
  const host=document.querySelector('.header-actions');
  if(host){const badge=document.createElement('span');badge.id='syncBadge';badge.className='sync-badge';host.prepend(badge);}
  function updateSync(e){const d=e?.detail||{online:navigator.onLine,pending:0,syncing:false};const b=document.getElementById('syncBadge');if(!b)return;b.className='sync-badge '+(!d.online?'offline':d.pending?'pending':'online');b.textContent=!d.online?`OFFLINE • ${d.pending||0} QUEUED`:d.syncing?'SYNCING…':d.pending?`${d.pending} QUEUED`:'SYNCED';}
  window.addEventListener('liveops-sync-status',updateSync);updateSync();
  window.addEventListener('liveops-proof-synced',e=>{const {taskId,localData,remoteUrl}=e.detail||{};const t=state.tasks.find(x=>x.id===taskId);if(!t||!remoteUrl)return;const p=t.proofs.find(x=>x.localData===localData);if(p){p.data=remoteUrl;p.syncPending=false;localStorage.setItem(STORE,JSON.stringify(state));window.LiveOpsResilience?.safeSave(state,session.role);if(session.page==='ops-proof')renderOpsProof(t);toast('Queued proof synced.');}});
})();
