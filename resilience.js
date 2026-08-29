(function(){
  const DB='liveops-offline-v1', STORE='queue';
  let dbPromise=null, syncing=false;
  function db(){
    if(dbPromise) return dbPromise;
    dbPromise=new Promise((resolve,reject)=>{
      const r=indexedDB.open(DB,1);
      r.onupgradeneeded=()=>{ if(!r.result.objectStoreNames.contains(STORE)) r.result.createObjectStore(STORE,{keyPath:'id'}); };
      r.onsuccess=()=>resolve(r.result); r.onerror=()=>reject(r.error);
    });
    return dbPromise;
  }
  async function put(item){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).put(item);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function del(id){const d=await db();return new Promise((res,rej)=>{const tx=d.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}
  async function all(){const d=await db();return new Promise((res,rej)=>{const r=d.transaction(STORE).objectStore(STORE).getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>rej(r.error);});}
  async function count(){return (await all()).length;}
  function emit(){count().then(n=>window.dispatchEvent(new CustomEvent('liveops-sync-status',{detail:{online:navigator.onLine,pending:n,syncing}}))).catch(()=>{});}
  async function queueState(state,role){
    await put({id:'state-latest',kind:'state',createdAt:Date.now(),role,payload:structuredClone(state)}); emit();
  }
  async function queueProof(taskId,file,localData){
    const id='proof-'+Date.now()+'-'+Math.random().toString(36).slice(2);
    await put({id,kind:'proof',createdAt:Date.now(),taskId,file,localData,name:file.name,type:file.type}); emit(); return id;
  }
  async function flush(){
    if(syncing || !navigator.onLine || !window.LiveOpsCloud?.isConfigured()) return;
    syncing=true; emit();
    try{
      const items=(await all()).sort((a,b)=>a.createdAt-b.createdAt);
      // Proofs first so latest snapshot can contain remote proof references after the app updates them.
      for(const item of items.filter(x=>x.kind==='proof')){
        try{
          const uploaded=await window.LiveOpsCloud.uploadProof(item.taskId,item.file);
          await del(item.id);
          window.dispatchEvent(new CustomEvent('liveops-proof-synced',{detail:{taskId:item.taskId,localData:item.localData,remoteUrl:uploaded?.url||'',path:uploaded?.path||''}}));
        }catch(e){console.warn('Proof remains queued',e);}
      }
      const latest=(await all()).find(x=>x.kind==='state');
      if(latest){
        try{await window.LiveOpsCloud.saveState(latest.payload,latest.role);await del(latest.id);}catch(e){console.warn('State remains queued',e);}
      }
    }finally{syncing=false;emit();}
  }
  async function safeSave(state,role){
    if(!window.LiveOpsCloud?.isConfigured()) return {demo:true};
    if(!navigator.onLine){await queueState(state,role);return {queued:true};}
    try{await window.LiveOpsCloud.saveState(state,role);return {synced:true};}
    catch(e){await queueState(state,role);return {queued:true,error:e};}
  }
  window.addEventListener('online',()=>{emit();flush();}); window.addEventListener('offline',emit);
  window.LiveOpsResilience={queueState,queueProof,flush,safeSave,count};
  emit(); setTimeout(flush,1200);
})();
