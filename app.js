const seed={
activeEventId:"evt1",
events:[{
id:"evt1",
settings:{project:"City Marathon 2026",client:"Event Partner",city:"Kolkata",date:"2026-12-06",expoStart:"",expoEnd:"",participants:10000,lead:"Project Head",categories:"21K, 10K, 5K"},
masters:{
team:["Rahul | 9876543210 | Supervisor","Amit | 9876501234 | Department Head","Priya | 9830012345 | Field Executive"],
departments:["Expo","Venue","Race Course","Branding","Hydration","Medical","Security","Logistics","Housekeeping","Electrical"],
designations:["Department Head","Sub Head","Supervisor","Zone In-charge","Vendor POC","Field Executive"],
zones:["Expo Venue","Start Gate","Finish Gate","Holding Area","Baggage Area","Medical Zone","Hydration H01","Hydration H02","Hydration H03","KM 5","KM 10","KM 15","Turnaround Point","Parking","Warehouse"],
issues:["No issue","Material pending","Vendor delayed","Manpower shortage","Vehicle / logistics delay","Power / electrical issue","Permission issue","Weather impact","Client approval pending","Site access issue"],
eta:["Within 15 min","Within 30 min","Within 1 hour","Within 2 hours","Before race start","Awaiting dependency"]
},
tasks:[
{id:"VEN-PRO-001",name:"Start / Finish Gate Structure",dept:"Venue",zone:"Start Gate",status:"Completed",progress:100,owner:"Production",client:true,proof:true},
{id:"VEN-BRN-002",name:"Main Venue Branding",dept:"Branding",zone:"Holding Area",status:"Working",progress:82,owner:"Branding Team",client:true,proof:true},
{id:"RC-BAR-001",name:"Race-course Barricading",dept:"Race Course",zone:"KM 10",status:"Working",progress:64,owner:"Course Team",client:true,proof:false},
{id:"RC-HYD-003",name:"Hydration Station H03",dept:"Hydration",zone:"Hydration H03",status:"Delayed",progress:55,owner:"Hydration Team",client:true,proof:true},
{id:"MED-005",name:"Medical Station M05",dept:"Medical",zone:"KM 15",status:"Verification",progress:95,owner:"Medical Team",client:true,proof:true},
{id:"SEC-002",name:"Security Deployment Gate 2",dept:"Security",zone:"Start Gate",status:"Critical",progress:40,owner:"Security Team",client:false,proof:false}
],
proofs:[
{task:"Start / Finish Gate Structure",meta:"Venue • Verified",src:"assets/marathon-ops-sunrise.jpg"},
{task:"Main Venue Branding",meta:"Branding • Field proof",src:"assets/marathon-ops-sunrise.jpg"},
{task:"Hydration Station H03",meta:"Hydration • Updated",src:"assets/marathon-ops-sunrise.jpg"}
],
activity:[{time:"09:42",text:"Start / Finish Gate Structure completed with proof."},{time:"09:28",text:"Main Venue Branding updated to 82%."},{time:"09:16",text:"Hydration H03 reported delay."}]
}]};
let state=JSON.parse(localStorage.getItem("marathonLiveOpsFresh")||"null")||seed;
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
const event=()=>state.events.find(e=>e.id===state.activeEventId)||state.events[0];
function save(){localStorage.setItem("marathonLiveOpsFresh",JSON.stringify(state));renderAll()}
function fmt(d){return d?new Date(d+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—"}
function stats(){const t=event().tasks,n=t.length||1;return{avg:Math.round(t.reduce((a,x)=>a+x.progress,0)/n),completed:t.filter(x=>x.status==="Completed").length,working:t.filter(x=>x.status==="Working").length,delayed:t.filter(x=>x.status==="Delayed").length,critical:t.filter(x=>x.status==="Critical").length}}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderSwitcher(){eventSwitcher.innerHTML=state.events.map(e=>`<option value="${e.id}">${esc(e.settings.project)}</option>`).join("");eventSwitcher.value=state.activeEventId}
function renderStats(){
 const s=stats(),e=event();
 readyPct.textContent=s.avg+"%"; clientProject.textContent=e.settings.project; clientMeta.textContent=`${e.settings.city} • ${fmt(e.settings.date)} • ${e.settings.client}`;
 clientStats.innerHTML=[["Overall",s.avg+"%"],["Completed",s.completed],["Working",s.working],["Attention",s.delayed+s.critical],["Proof",e.tasks.filter(x=>x.proof).length]].map(x=>`<div class="stat"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
 adminStats.innerHTML=[["Tasks",e.tasks.length],["Completed",s.completed],["Working",s.working],["Delayed",s.delayed],["Critical",s.critical]].map(x=>`<div class="stat"><small>${x[0]}</small><strong>${x[1]}</strong></div>`).join("");
}
function renderDept(){const groups={};event().tasks.filter(x=>x.client).forEach(x=>(groups[x.dept]??=[]).push(x));deptProgress.innerHTML=Object.entries(groups).map(([d,a])=>{const p=Math.round(a.reduce((s,x)=>s+x.progress,0)/a.length);return`<div class="progress-row"><b>${esc(d)}</b><div class="bar"><span style="width:${p}%"></span></div><em>${p}%</em></div>`}).join("")}
function renderProofs(){clientProofs.innerHTML=event().proofs.slice(0,6).map(p=>`<div class="proof"><img src="${p.src}"><span>${esc(p.task)}<br>${esc(p.meta)}</span></div>`).join("")||"<p class='muted'>No proof yet.</p>"}
function renderMilestones(){const arr=event().tasks.filter(x=>x.client&&x.status==="Completed");milestones.innerHTML=arr.map(x=>`<div class="list-item"><strong>✓ ${esc(x.name)}</strong><small>${esc(x.zone)} • ${esc(x.owner)}</small></div>`).join("")||"<p class='muted'>No completed milestones yet.</p>";const s=stats();summary.innerHTML=`${esc(event().settings.project)} is currently at <b>${s.avg}% readiness</b>. ${s.completed} tasks are completed and ${s.working} are actively under execution.`}
function depts(){return [...new Set(event().tasks.map(x=>x.dept))]}
function renderTable(){deptFilter.innerHTML=`<option value="all">All Departments</option>`+depts().map(d=>`<option>${esc(d)}</option>`).join("");const d=deptFilter.value||"all",st=statusFilter.value||"all";taskTable.innerHTML=event().tasks.filter(x=>(d==="all"||x.dept===d)&&(st==="all"||x.status===st)).map(x=>`<tr><td>${esc(x.name)}<br><small>${esc(x.id)}</small></td><td>${esc(x.dept)}</td><td>${esc(x.zone)}</td><td><span class="tag ${x.status.replace(/\s/g,"")}">${esc(x.status)}</span></td><td>${x.progress}%</td><td>${esc(x.owner)}</td><td>${x.proof?"Yes":"—"}</td><td><button onclick="toggleClient('${x.id}')" class="btn ghost small">${x.client?"Visible":"Internal"}</button></td></tr>`).join("")}
window.toggleClient=id=>{const x=event().tasks.find(t=>t.id===id);x.client=!x.client;save()}
function renderSettings(){const s=event().settings;setProject.value=s.project;setClient.value=s.client;setCity.value=s.city;setDate.value=s.date;setExpoStart.value=s.expoStart||"";setExpoEnd.value=s.expoEnd||"";setParticipants.value=s.participants||"";setLead.value=s.lead||"";setCategories.value=s.categories||""}
function renderMasters(){const m=event().masters;masterTeam.value=m.team.join("\n");masterDepartments.value=m.departments.join("\n");masterDesignations.value=m.designations.join("\n");masterZones.value=m.zones.join("\n");masterIssues.value=m.issues.join("\n");masterEta.value=m.eta.join("\n")}
function options(sel,arr,label){sel.innerHTML=`<option value="">${label}</option>`+arr.map(x=>`<option>${esc(x)}</option>`).join("")}
function renderOps(){
 const m=event().masters, team=m.team.map(x=>x.split("|").map(y=>y.trim()));
 options(opsName,team.map(x=>x[0]),"Select name"); options(opsMobile,team.map(x=>x[1]),"Select mobile"); options(opsDesignation,m.designations,"Select designation"); options(opsDepartment,m.departments,"Select department"); options(opsZone,m.zones,"Select zone"); options(opsIssue,m.issues,"Select issue"); options(opsEta,m.eta,"Select ETA"); options(opsTask,event().tasks.map(x=>`${x.id} — ${x.name}`),"Select assigned task");
}
function renderIssues(){const arr=event().tasks.filter(x=>["Critical","Delayed"].includes(x.status));issueList.innerHTML=criticalList.innerHTML=arr.map(x=>`<div class="list-item"><strong>${esc(x.name)}</strong><small>${esc(x.status)} • ${x.progress}% • ${esc(x.zone)}</small></div>`).join("")||"<p class='muted'>No critical issues.</p>"}
function renderActivity(){activityFeed.innerHTML=event().activity.map(a=>`<div class="list-item"><strong>${esc(a.time)}</strong><small>${esc(a.text)}</small></div>`).join("")}
function renderAll(){renderSwitcher();renderStats();renderDept();renderProofs();renderMilestones();renderTable();renderSettings();renderMasters();renderOps();renderIssues();renderActivity()}
renderAll();

menuBtn.onclick=()=>nav.classList.toggle("open");
document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener("click",()=>nav.classList.remove("open")));
contactForm.onsubmit=e=>{e.preventDefault();contactSuccess.classList.add("show");e.target.reset()};
function openAccess(mode){accessChoices.innerHTML=mode==="ops"?`<button class="choice" data-enter="ops"><div><strong>Ops Update</strong><small>Submit field progress and photo proof</small></div></button>`:`<button class="choice" data-enter="client"><div><strong>Client Dashboard</strong><small>View approved project status</small></div></button><button class="choice" data-enter="admin"><div><strong>Admin / Project Head</strong><small>Manage the full project</small></div></button>`;accessModal.classList.add("show");accessChoices.querySelectorAll("[data-enter]").forEach(b=>b.onclick=()=>enterApp(b.dataset.enter))}
document.querySelectorAll("[data-access]").forEach(b=>b.onclick=()=>openAccess(b.dataset.access));
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>document.getElementById(b.dataset.close).classList.remove("show"));
document.querySelectorAll(".modal").forEach(m=>m.onclick=e=>{if(e.target===m)m.classList.remove("show")});
function enterApp(view){accessModal.classList.remove("show");publicSite.classList.add("hidden");app.classList.remove("hidden");const b=[...document.querySelectorAll(".side-btn")].find(x=>x.dataset.view===view);b?.click();window.scrollTo(0,0)}
homeBtn.onclick=()=>{app.classList.add("hidden");publicSite.classList.remove("hidden");window.scrollTo(0,0)}
$$(".side-btn").forEach(b=>b.onclick=()=>{$$(".side-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".view").forEach(v=>v.classList.remove("active"));$("#"+b.dataset.view+"View").classList.add("active");viewTitle.textContent={client:"Client Progress Dashboard",admin:"Admin Command Center",ops:"Operations Update"}[b.dataset.view];pptBtn.style.display=b.dataset.view==="client"?"inline-block":"none"});
$$(".tab").forEach(b=>b.onclick=()=>{$$(".tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".pane").forEach(p=>p.classList.remove("active"));$("#"+b.dataset.pane+"Pane").classList.add("active")});
eventSwitcher.onchange=e=>{state.activeEventId=e.target.value;renderAll()};
deptFilter.onchange=renderTable;statusFilter.onchange=renderTable;
createEvent.onclick=()=>eventModal.classList.add("show");
addTask.onclick=()=>taskModal.classList.add("show");
eventForm.onsubmit=e=>{e.preventDefault();const id="evt"+Date.now(),base=JSON.parse(JSON.stringify(event()));base.id=id;base.settings={project:eventName.value,client:eventClient.value,city:eventCity.value,date:eventDate.value,expoStart:"",expoEnd:"",participants:+eventParticipants.value||0,lead:eventLead.value,categories:"21K, 10K, 5K"};base.tasks=[];base.proofs=[];base.activity=[];state.events.push(base);state.activeEventId=id;eventModal.classList.remove("show");e.target.reset();save()};
duplicateEvent.onclick=()=>{const copy=JSON.parse(JSON.stringify(event()));copy.id="evt"+Date.now();copy.settings.project+=" Copy";state.events.push(copy);state.activeEventId=copy.id;save()};
taskForm.onsubmit=e=>{e.preventDefault();event().tasks.push({id:taskId.value,name:taskName.value,dept:taskDept.value,zone:taskZone.value,status:taskStatus.value,progress:+taskProgress.value,owner:taskOwner.value,client:taskClient.checked,proof:false});taskModal.classList.remove("show");e.target.reset();save()};
settingsForm.onsubmit=e=>{e.preventDefault();event().settings={project:setProject.value,client:setClient.value,city:setCity.value,date:setDate.value,expoStart:setExpoStart.value,expoEnd:setExpoEnd.value,participants:+setParticipants.value||0,lead:setLead.value,categories:setCategories.value};save()};
masterForm.onsubmit=e=>{e.preventDefault();const lines=v=>v.split("\n").map(x=>x.trim()).filter(Boolean);event().masters={team:lines(masterTeam.value),departments:lines(masterDepartments.value),designations:lines(masterDesignations.value),zones:lines(masterZones.value),issues:lines(masterIssues.value),eta:lines(masterEta.value)};save()};
let photoData="";
opsPhoto.onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{photoData=r.result;preview.src=photoData;preview.style.display="block";uploadText.style.display="none"};r.readAsDataURL(f)};
opsForm.onsubmit=e=>{e.preventDefault();const raw=opsTask.value,id=raw.split(" — ")[0],t=event().tasks.find(x=>x.id===id);if(!t)return;t.status=opsStatus.value;t.progress=+opsProgress.value;t.zone=opsZone.value||t.zone;t.owner=opsName.value||t.owner;t.proof=!!photoData||t.proof;const time=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});event().activity.unshift({time,text:`${opsName.value} updated ${t.name} to ${t.status} (${t.progress}%). Issue: ${opsIssue.value||"No issue"}. ETA: ${opsEta.value||"—"}. ${opsRemark.value||""}`});if(photoData)event().proofs.unshift({task:t.name,meta:`${t.dept} • ${opsVerified.value==="yes"?"Physically verified":"Remote update"}`,src:photoData});save();opsSuccess.classList.add("show");setTimeout(()=>opsSuccess.classList.remove("show"),2200);photoData="";preview.style.display="none";uploadText.style.display="block";opsPhoto.value=""};
pptBtn.onclick=()=>{if(typeof PptxGenJS==="undefined"){alert("PPT export needs internet access to load the export library.");return}const e=event(),s=stats(),pptx=new PptxGenJS();pptx.layout="LAYOUT_WIDE";pptx.author="Marathon LiveOps";let sl=pptx.addSlide();sl.background={color:"07131F"};sl.addText(e.settings.project,{x:.7,y:1.3,w:11,h:.6,fontSize:30,bold:true,color:"FFFFFF"});sl.addText(`${e.settings.client} • ${e.settings.city} • ${fmt(e.settings.date)}`,{x:.7,y:2.1,w:10,h:.35,fontSize:12,color:"A9BAC6"});sl.addText(`${s.avg}% PROJECT READINESS`,{x:.7,y:4.3,w:6,h:.5,fontSize:22,bold:true,color:"22D3EE"});sl.addText("Marathon LiveOps — Operations Technology Service",{x:.7,y:6.5,w:8,h:.25,fontSize:9,color:"7F94A3"});sl=pptx.addSlide();sl.addText("Client-visible Project Status",{x:.7,y:.5,w:8,h:.45,fontSize:24,bold:true,color:"0B2239"});let y=1.3;e.tasks.filter(x=>x.client).slice(0,10).forEach(x=>{sl.addText(x.name,{x:.8,y,w:6,h:.24,fontSize:10,bold:true,color:"0E1B26"});sl.addText(`${x.dept} • ${x.zone}`,{x:.8,y:y+.23,w:5,h:.18,fontSize:7,color:"748494"});sl.addText(`${x.progress}% • ${x.status}`,{x:9.2,y,w:2.8,h:.24,fontSize:9,bold:true,color:"0284C7",align:"right"});y+=.48});pptx.writeFile({fileName:e.settings.project.replace(/\s+/g,"_")+"_Status_Report.pptx"})};
