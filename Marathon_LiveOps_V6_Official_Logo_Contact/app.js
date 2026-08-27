const seedEvent = {
  id:"evt-001",
  settings:{company:"The Nile Mile",project:"City Marathon 2026",client:"Event Partner",city:"Kolkata",date:"2026-12-06",lead:"Project Head",type:"Marathon"},
  tasks:[
    {id:"EXP-OPS-001",name:"Expo venue setup",dept:"Expo",location:"Expo Venue",status:"Completed",progress:100,owner:"Expo Team",client:true,proof:true,updated:"09:42"},
    {id:"VEN-PRO-001",name:"Start / Finish Gate structure",dept:"Venue",location:"Start Gate",status:"Completed",progress:100,owner:"Production",client:true,proof:true,updated:"09:35"},
    {id:"VEN-BRN-002",name:"Main venue branding",dept:"Branding",location:"Holding Area",status:"Working",progress:82,owner:"Branding Team",client:true,proof:true,updated:"09:28"},
    {id:"RC-BAR-001",name:"Race-course barricading",dept:"Race Course",location:"Sector C",status:"Working",progress:64,owner:"Course Team",client:true,proof:false,updated:"09:22"},
    {id:"RC-HYD-003",name:"Hydration Station H03",dept:"Hydration",location:"KM 7.5",status:"Delayed",progress:55,owner:"Hydration Team",client:true,proof:true,updated:"09:16"},
    {id:"MED-005",name:"Medical Station M05",dept:"Medical",location:"KM 15",status:"Verification",progress:95,owner:"Medical Team",client:true,proof:true,updated:"09:11"},
    {id:"SEC-G2-001",name:"Security deployment Gate 2",dept:"Security",location:"Gate 2",status:"Critical",progress:40,owner:"Security Team",client:false,proof:false,updated:"09:04"},
    {id:"LOG-VH-002",name:"Material vehicle dispatch",dept:"Logistics",location:"Warehouse → Venue",status:"Working",progress:70,owner:"Logistics",client:false,proof:false,updated:"08:56"},
    {id:"HK-RC-001",name:"Race-course housekeeping",dept:"Housekeeping",location:"Sector A",status:"Not Started",progress:0,owner:"HK Team",client:true,proof:false,updated:"08:40"},
    {id:"VEN-ELE-004",name:"Venue temporary power",dept:"Electrical",location:"Main Stage",status:"Completed",progress:100,owner:"Electrical",client:true,proof:true,updated:"08:31"}
  ],
  activity:[
    {time:"09:42",text:"Expo Team marked Expo venue setup as Completed with proof."},
    {time:"09:35",text:"Production completed Start / Finish Gate structure."},
    {time:"09:28",text:"Branding Team updated Main venue branding to 82%."},
    {time:"09:16",text:"Hydration H03 reported a delay; current progress is 55%."},
    {time:"09:04",text:"Security deployment at Gate 2 escalated to Critical."}
  ],
  proofs:[
    {task:"Start / Finish Gate",meta:"Venue • Verified",src:"https://images.unsplash.com/photo-1552674605-db6ffd4facb5?auto=format&fit=crop&w=700&q=80"},
    {task:"Expo Setup",meta:"Expo • Verified",src:"https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=700&q=80"},
    {task:"Hydration H03",meta:"Race Course • Updated",src:"https://images.unsplash.com/photo-1523362628745-0c100150b504?auto=format&fit=crop&w=700&q=80"}
  ]
};
let root=JSON.parse(localStorage.getItem("liveopsV2")||"null")||{activeEventId:"evt-001",events:[seedEvent]};
const $=s=>document.querySelector(s), $$=s=>document.querySelectorAll(s);
function activeEvent(){return root.events.find(e=>e.id===root.activeEventId)||root.events[0]}
function save(){localStorage.setItem("liveopsV2",JSON.stringify(root));renderAll()}
function statusClass(s){return s.replace(/\s/g,"")}
function calc(){const t=activeEvent().tasks,n=t.length||1;return {avg:Math.round(t.reduce((a,x)=>a+x.progress,0)/n),completed:t.filter(x=>x.status==="Completed").length,working:t.filter(x=>x.status==="Working").length,delayed:t.filter(x=>x.status==="Delayed").length,critical:t.filter(x=>x.status==="Critical").length,verify:t.filter(x=>x.status==="Verification").length}}
function formatDate(d){if(!d)return "—";return new Date(d+"T00:00:00").toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})}
function renderEventSwitcher(){const sel=$("#eventSwitcher");sel.innerHTML=root.events.map(e=>`<option value="${e.id}">${e.settings.project}</option>`).join("");sel.value=root.activeEventId}
function renderBrand(){
 const ev=activeEvent(); 

 const e=activeEvent(),s=e.settings;
 if($("#companyNameSidebar")) $("#companyNameSidebar").textContent=s.company;
 if($("#companyNameFooter")) $("#companyNameFooter").textContent=s.company;
 if($("#clientNameHero")) $("#clientNameHero").textContent="CLIENT: "+s.client.toUpperCase();
 if($("#projectNameHero")) $("#projectNameHero").textContent=s.project;
 if($("#projectMetaHero")) $("#projectMetaHero").textContent=`${s.city} • Race Day: ${formatDate(s.date)}`;
 if($("#clientEventDate")) $("#clientEventDate").textContent=formatDate(s.date);
 if($("#clientEventCity")) $("#clientEventCity").textContent=s.city;
 if($("#clientProjectLead")) $("#clientProjectLead").textContent=s.lead;
 if($("#clientInfoName")) $("#clientInfoName").textContent=s.client;
 $("#settingCompany").value=s.company;$("#settingProject").value=s.project;$("#settingClient").value=s.client;$("#settingCity").value=s.city;$("#settingDate").value=s.date;$("#settingLead").value=s.lead;
 if($("#heroProjectName")) $("#heroProjectName").textContent=s.project;
 if($("#opsEventName")) $("#opsEventName").textContent=s.project;
 if($("#footerCompanyName")) $("#footerCompanyName").textContent=s.company;
}
function renderMetrics(){
 const e=activeEvent(),c=calc(),t=e.tasks;
 if($("#overallPct")) $("#overallPct").textContent=c.avg+"%";
 if($("#overallRing")) $("#overallRing").style.setProperty("--pct",c.avg);
 if($("#heroReadyPct")) $("#heroReadyPct").textContent=c.avg+"%";
 $("#clientMetrics").innerHTML=[["Overall Progress",c.avg+"%","Verified readiness"],["Completed",c.completed,"Delivered"],["In Progress",c.working,"Currently active"],["Attention",c.delayed+c.critical,"Delayed / critical"],["Proof Available",t.filter(x=>x.proof).length,"Evidence uploaded"]].map(m=>`<div class="metric"><div class="label">${m[0]}</div><div class="value">${m[1]}</div><div class="hint">${m[2]}</div></div>`).join("");
 $("#adminMetrics").innerHTML=[["All Tasks",t.length,"Project scope"],["Completed",c.completed,"Closed"],["Working",c.working,"Live"],["Delayed",c.delayed,"Need action"],["Critical",c.critical,"Immediate escalation"]].map(m=>`<div class="metric"><div class="label">${m[0]}</div><div class="value">${m[1]}</div><div class="hint">${m[2]}</div></div>`).join("");
 $("#clientTodayUpdates").textContent=e.activity.length;$("#clientProofCoverage").textContent=(t.length?Math.round(t.filter(x=>x.proof).length/t.length*100):0)+"%";$("#clientVisibleCount").textContent=t.filter(x=>x.client).length;
}
function renderPhases(){const e=activeEvent(),groups={};e.tasks.filter(x=>x.client).forEach(x=>(groups[x.dept]??=[]).push(x));$("#phaseProgress").innerHTML=Object.entries(groups).slice(0,8).map(([d,a])=>{const p=Math.round(a.reduce((s,x)=>s+x.progress,0)/a.length);return `<div class="progress-row"><strong>${d}</strong><div class="bar"><span style="width:${p}%"></span></div><em>${p}%</em></div>`}).join("")}
function renderProofCarousel(){
 const e=activeEvent(), arr=e.proofs.slice(0,4);
 if($("#liveProofCount")) $("#liveProofCount").textContent=`${e.proofs.length} proof${e.proofs.length===1?"":"s"}`;
 if($("#proofCarousel")) $("#proofCarousel").innerHTML=arr.map(p=>`<div class="proof-thumb"><img src="${p.src}"><div><strong>${p.task}</strong><small>${p.meta}</small></div></div>`).join("")||"<p>No live proof uploaded yet.</p>";
}
function renderProofs(){const e=activeEvent();$("#proofGrid").innerHTML=e.proofs.slice(0,3).map(p=>`<div class="proof"><img src="${p.src}"><div class="proof-label"><strong>${p.task}</strong>${p.meta}</div></div>`).join("")||"<p>No proof uploaded yet.</p>"}
function renderMilestones(){const e=activeEvent(),arr=e.tasks.filter(x=>x.client&&x.status==="Completed").slice(0,6),c=calc();$("#milestoneList").innerHTML=arr.map(x=>`<div class="milestone"><div><strong>${x.name}</strong><small>${x.location} • ${x.owner}</small></div><span class="checkmark">✓ Delivered</span></div>`).join("")||"<p>No completed milestones yet.</p>";$("#clientSummary").innerHTML=`<strong>${c.avg}% Ready</strong><p>${e.settings.project} is currently at ${c.avg}% overall readiness. ${c.completed} tracked activities are completed and ${c.working} are actively under execution. Internal escalations are filtered from the client view unless approved by Admin.</p>`}
function depts(){return [...new Set(activeEvent().tasks.map(x=>x.dept))].sort()}
function renderFilters(){const opts=depts().map(d=>`<option>${d}</option>`).join("");$("#adminDeptFilter").innerHTML=`<option value="all">All departments</option>${opts}`;$("#opsDepartment").innerHTML=`<option value="">Select department</option>${opts}`;renderOpsTasks()}
function renderOpsTasks(){const d=$("#opsDepartment").value;const arr=d?activeEvent().tasks.filter(x=>x.dept===d):activeEvent().tasks;$("#opsTask").innerHTML=`<option value="">Select task / activity</option>`+arr.map(x=>`<option value="${x.id}">${x.id} — ${x.name}</option>`).join("")}
function renderTable(){const e=activeEvent(),dept=$("#adminDeptFilter")?.value||"all",st=$("#adminStatusFilter")?.value||"all";const arr=e.tasks.filter(x=>(dept==="all"||x.dept===dept)&&(st==="all"||x.status===st));$("#taskTable").innerHTML=arr.map(x=>`<tr><td><div class="task-title">${x.name}</div><div class="task-id">${x.id}</div></td><td>${x.dept}</td><td>${x.location}</td><td><span class="tag ${statusClass(x.status)}">${x.status}</span></td><td>${x.progress}%</td><td>${x.owner}</td><td>${x.proof?"✓ Yes":"—"}</td><td><button class="client-toggle" onclick="toggleClient('${x.id}')">${x.client?"Visible":"Internal"}</button></td></tr>`).join("")}
window.toggleClient=id=>{const x=activeEvent().tasks.find(t=>t.id===id);x.client=!x.client;save()}
function renderCritical(){const arr=activeEvent().tasks.filter(x=>["Critical","Delayed"].includes(x.status));$("#criticalList").innerHTML=arr.map(x=>`<div class="critical-item ${x.status==="Delayed"?"delayed":""}"><strong>${x.name}</strong><small>${x.location} • ${x.status} • ${x.progress}% complete<br>Owner: ${x.owner}</small></div>`).join("")||"<p>No critical issues.</p>"}
function renderActivity(){const e=activeEvent();$("#activityFeed").innerHTML=e.activity.slice(0,15).map(a=>`<div class="activity"><time>${a.time}</time><p>${a.text}</p></div>`).join("")||"<p>No updates yet.</p>"}
function renderAll(){renderEventSwitcher();renderBrand();renderMetrics();renderPhases();renderProofCarousel();renderProofs();renderMilestones();renderFilters();renderTable();renderCritical();renderActivity();if($("#lastUpdated"))$("#lastUpdated").textContent="just now"}
renderAll();

$("#eventSwitcher").onchange=e=>{root.activeEventId=e.target.value;renderAll()};
$$(".nav-btn").forEach(b=>b.onclick=()=>{$$(".nav-btn").forEach(x=>x.classList.remove("active"));b.classList.add("active");$$(".view").forEach(v=>v.classList.remove("active"));$("#"+b.dataset.view+"View").classList.add("active");const titles={client:"Client Progress Dashboard",admin:"Admin Command Center",ops:"Operations Live Update"};$("#topTitle").textContent=titles[b.dataset.view];$("#exportPptBtn").style.display=b.dataset.view==="client"?"inline-block":"none"});
$("#adminDeptFilter").onchange=renderTable;$("#adminStatusFilter").onchange=renderTable;$("#opsDepartment").onchange=renderOpsTasks;

$("#settingsForm").onsubmit=e=>{e.preventDefault();const s=activeEvent().settings;s.company=$("#settingCompany").value;s.project=$("#settingProject").value;s.client=$("#settingClient").value;s.city=$("#settingCity").value;s.date=$("#settingDate").value;s.lead=$("#settingLead").value;save()};

$("#createEventBtn").onclick=()=>$("#eventModal").classList.add("show");$("#closeEventModal").onclick=()=>$("#eventModal").classList.remove("show");
$("#eventForm").onsubmit=e=>{e.preventDefault();const id="evt-"+Date.now();const company=activeEvent().settings.company;root.events.push({id,settings:{company,project:$("#eventName").value,client:$("#eventClient").value,city:$("#eventCity").value,date:$("#eventDate").value,lead:$("#eventLead").value,type:$("#eventType").value},tasks:[],activity:[],proofs:[]});root.activeEventId=id;$("#eventModal").classList.remove("show");e.target.reset();save()};

$("#newTaskBtn").onclick=()=>$("#taskModal").classList.add("show");$("#closeTaskModal").onclick=()=>$("#taskModal").classList.remove("show");
$("#taskForm").onsubmit=e=>{e.preventDefault();const ev=activeEvent();ev.tasks.push({id:$("#taskId").value,name:$("#taskName").value,dept:$("#taskDept").value,location:$("#taskLocation").value,status:$("#taskStatus").value,progress:+$("#taskProgress").value,owner:$("#taskOwner").value,client:$("#taskClientVisible").checked,proof:false,updated:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})});$("#taskModal").classList.remove("show");e.target.reset();save()};

let photoData="";
$("#opsPhoto").onchange=e=>{const f=e.target.files[0];if(!f)return;const r=new FileReader();r.onload=()=>{photoData=r.result;$("#photoPreview").src=photoData;$("#photoPreview").style.display="block";$("#uploadText").style.display="none"};r.readAsDataURL(f)};

$("#opsForm").onsubmit=e=>{
 e.preventDefault();const ev=activeEvent(),id=$("#opsTask").value,x=ev.tasks.find(t=>t.id===id);if(!x)return;
 const now=new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});x.status=$("#opsStatus").value;x.progress=+$("#opsProgress").value;x.location=$("#opsLocation").value||x.location;x.owner=$("#opsName").value||x.owner;x.proof=!!photoData||x.proof;x.updated=now;
 const issue=$("#opsIssue").value,remark=$("#opsRemark").value,eta=$("#opsEta").value,designation=$("#opsDesignation").value,mobile=$("#opsMobile").value,verified=$("#opsVerified").value==="yes"?"physically verified":"not physically verified";
 ev.activity.unshift({time:now,text:`${x.owner} (${designation}) updated ${x.name} to ${x.status} (${x.progress}%). ${issue?`Issue: ${issue}. `:""}${eta?`ETA: ${eta}. `:""}${remark?remark+". ":""}Mobile: ${mobile}. ${verified}.`});
 if(photoData)ev.proofs.unshift({task:x.name,meta:`${x.dept} • ${verified}`,src:photoData});
 save();$("#successToast").classList.add("show");setTimeout(()=>$("#successToast").classList.remove("show"),2500);photoData="";$("#photoPreview").style.display="none";$("#uploadText").style.display="block";$("#opsPhoto").value="";
};

$("#showGalleryBtn").onclick=()=>alert("Full proof gallery module will be added in the production build. Latest proofs are already visible here.");

$("#exportPptBtn").onclick=()=>{
 if(typeof PptxGenJS==="undefined"){alert("PPT library could not load. Please check internet connection and try again.");return}
 const ev=activeEvent(),s0=ev.settings,c=calc(),pptx=new PptxGenJS();pptx.layout="LAYOUT_WIDE";pptx.author=s0.company;pptx.title=s0.project+" — Project Status";
 let s=pptx.addSlide();s.background={color:"0D1E48"};s.addText(s0.project,{x:.7,y:1.5,w:11.8,h:.7,fontFace:"Aptos Display",fontSize:30,bold:true,color:"FFFFFF"});s.addText(`${s0.client} • ${s0.city} • ${formatDate(s0.date)}`,{x:.72,y:2.35,w:11,h:.4,fontSize:13,color:"C7D4F2"});s.addText(`${c.avg}% PROJECT READINESS`,{x:.72,y:4.5,w:6,h:.5,fontSize:22,bold:true,color:"6FE0AF"});s.addText(s0.company,{x:.72,y:6.65,w:8,h:.3,fontSize:10,color:"9FB0D4"});
 s=pptx.addSlide();s.addText("Executive Project Status",{x:.7,y:.55,w:8,h:.45,fontSize:24,bold:true,color:"12234A"});const vals=[["Overall",c.avg+"%"],["Completed",c.completed],["Working",c.working],["Delayed",c.delayed],["Critical",c.critical]];vals.forEach((m,i)=>{s.addText(String(m[1]),{x:.8+i*2.4,y:1.55,w:1.8,h:.4,fontSize:20,bold:true,color:"173F8C",align:"center"});s.addText(m[0],{x:.8+i*2.4,y:2.0,w:1.8,h:.2,fontSize:9,color:"647089",align:"center"})});
 let y=2.8;ev.tasks.filter(x=>x.client).slice(0,9).forEach(x=>{s.addText(x.name,{x:.8,y,w:5.8,h:.25,fontSize:10,bold:true,color:"18243E"});s.addText(`${x.dept} • ${x.location}`,{x:.8,y:y+.23,w:5.8,h:.18,fontSize:7,color:"748096"});s.addText(`${x.progress}% • ${x.status}`,{x:9.3,y,w:2.8,h:.25,fontSize:9,bold:true,color:"173F8C",align:"right"});y+=.46});
 s=pptx.addSlide();s.addText("Delivered Milestones",{x:.7,y:.55,w:8,h:.45,fontSize:24,bold:true,color:"12234A"});y=1.4;ev.tasks.filter(x=>x.client&&x.status==="Completed").slice(0,10).forEach(x=>{s.addText("✓",{x:.85,y,w:.3,h:.25,fontSize:14,bold:true,color:"138A5B"});s.addText(x.name,{x:1.25,y,w:6.8,h:.28,fontSize:11,bold:true,color:"18243E"});s.addText(`${x.location} • ${x.owner}`,{x:1.25,y:y+.27,w:6.8,h:.18,fontSize:8,color:"748096"});y+=.55});
 pptx.writeFile({fileName:`${s0.project.replace(/\s+/g,"_")}_Status_Report.pptx`});
};
document.querySelectorAll("[data-jump]").forEach(el=>el.addEventListener("click",e=>{
 e.preventDefault(); const target=el.dataset.jump;
 const btn=[...document.querySelectorAll(".nav-btn")].find(x=>x.dataset.view===target);
 if(btn) btn.click();
 window.scrollTo({top:0,behavior:"smooth"});
}));
if($("#quickCreateEvent")) $("#quickCreateEvent").onclick=()=>$("#createEventBtn").click();
if($("#quickAddTask")) $("#quickAddTask").onclick=()=>$("#newTaskBtn").click();

document.querySelectorAll(".modal").forEach(modal=>{
  modal.addEventListener("click",e=>{
    if(e.target===modal) modal.classList.remove("show");
  });
});
document.addEventListener("keydown",e=>{
  if(e.key==="Escape") document.querySelectorAll(".modal.show").forEach(m=>m.classList.remove("show"));
});

// ===== V4 PUBLIC ENTRY EXPERIENCE =====
const publicSite=document.getElementById("publicSite"),appShell=document.getElementById("appShell"),accessModal=document.getElementById("accessModal"),clientAccessOptions=document.getElementById("clientAccessOptions"),opsAccessOptions=document.getElementById("opsAccessOptions");
function showPublicSite(){if(publicSite)publicSite.style.display="block";if(appShell)appShell.classList.add("app-hidden");window.scrollTo({top:0,behavior:"smooth"})}
function enterPortal(view){if(publicSite)publicSite.style.display="none";if(appShell)appShell.classList.remove("app-hidden");const b=[...document.querySelectorAll(".nav-btn")].find(x=>x.dataset.view===view);if(b)b.click();window.scrollTo({top:0,behavior:"smooth"})}
function openAccess(mode){if(!accessModal)return;accessModal.classList.add("show");if(mode==="ops"){if(clientAccessOptions)clientAccessOptions.style.display="none";if(opsAccessOptions)opsAccessOptions.style.display="grid";document.getElementById("accessTitle").textContent="Operations Access"}else{if(clientAccessOptions)clientAccessOptions.style.display="grid";if(opsAccessOptions)opsAccessOptions.style.display="none";document.getElementById("accessTitle").textContent="Client / Admin Access"}}
document.querySelectorAll(".client-login-trigger").forEach(b=>b.addEventListener("click",()=>openAccess("client")));
document.querySelectorAll(".ops-login-trigger").forEach(b=>b.addEventListener("click",()=>openAccess("ops")));
document.querySelectorAll(".access-choice").forEach(b=>b.addEventListener("click",()=>{accessModal.classList.remove("show");enterPortal(b.dataset.access)}));
if(document.getElementById("closeAccessModal"))document.getElementById("closeAccessModal").onclick=()=>accessModal.classList.remove("show");
if(document.getElementById("backHomeBtn"))document.getElementById("backHomeBtn").onclick=showPublicSite;
document.querySelectorAll("[data-public-link]").forEach(link=>link.addEventListener("click",e=>{e.preventDefault();const t=document.getElementById(link.dataset.publicLink);if(t)t.scrollIntoView({behavior:"smooth",block:"start"});const n=document.getElementById("publicNav");if(n)n.classList.remove("open")}));
if(document.getElementById("mobileMenuBtn"))document.getElementById("mobileMenuBtn").onclick=()=>document.getElementById("publicNav").classList.toggle("open");
if(document.getElementById("contactForm"))document.getElementById("contactForm").onsubmit=e=>{e.preventDefault();document.getElementById("contactSuccess").classList.add("show");e.target.reset()};
