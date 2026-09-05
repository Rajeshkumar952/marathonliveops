(function(){
  const cfg = window.LIVEOPS_CONFIG || {mode:'demo'};
  const isConfigured = ['cloud','supabase'].includes(cfg.mode) && cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.projectId && window.supabase;
  let client = null;
  let channel = null;
  if(isConfigured){ client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey); }

  const sanitizeClientState = (state) => {
    const r=state.clientRules||{};
    return {
      project:r.eventIdentity===false?null:state.project,
      departments:r.departments===false?[]:state.departments,
      tasks:(state.tasks||[])
        .filter(t=>t.clientVisibility&&t.clientVisibility!=='Hidden')
        .map(t=>({
          id:t.id,name:t.name,phase:t.phase,department:t.department,zone:t.zone,
          priority:t.priority,status:t.status,deadline:t.deadline,progress:t.progress,
          clientVisibility:t.clientVisibility,verified:t.verified,
          proofs:(r.approvedProof!==false&&t.verified&&/Proof|Full/i.test(t.clientVisibility||''))?t.proofs:[],
          remark:(r.internalRemarks!==false&&/Full/i.test(t.clientVisibility||''))?t.remark:''
        })),
      approvals:r.approvals===false?[]:state.approvals,
      messages:r.messages===false?[]:(state.messages||[]).filter(m=>m.from==='client'||m.to==='client'),
      documents:r.documents===false?[]:(state.documents||[]).filter(d=>(d.audience||'both')==='both'||d.audience==='client'),
      vendors:r.vendorContacts===false?[]:(state.vendors||[]),
      contacts:(state.contacts||[]),
      clientRules:state.clientRules
    };
  };

  async function signIn(userId, password){
    if(!client) return {demo:true};

    const rawId=String(userId).trim().toLowerCase();
    const email = rawId.includes('@')
      ? rawId
      : `${rawId}@users.marathonliveops.in`;

    const {data,error} = await client.auth.signInWithPassword({email,password});
    if(error) throw error;

    const {data:profile,error:pErr} = await client
      .from('profiles')
      .select('*')
      .eq('id',data.user.id)
      .maybeSingle();
    if(pErr) throw pErr;

    const {data:membership,error:mErr} = await client
      .from('project_memberships')
      .select('*')
      .eq('project_id',cfg.projectId)
      .eq('user_id',data.user.id)
      .maybeSingle();
    if(mErr) throw mErr;
    if(!membership?.is_active) throw new Error('Project access is inactive');

    return {user:data.user,profile,membership};
  }

  async function signOut(){ if(client) await client.auth.signOut(); }

  async function loadState(role){
    if(!client || !cfg.projectId) return null;
    const audience = role === 'client' ? 'client' : 'internal';
    const {data,error} = await client.from('project_snapshots')
      .select('payload,updated_at').eq('project_id',cfg.projectId).eq('audience',audience).maybeSingle();
    if(error) throw error;
    return data?.payload || null;
  }

  async function saveState(state, role){
    if(!client || !cfg.projectId) return {demo:true};
    // Internal users write the internal snapshot; client-safe data is maintained separately.
    if(role === 'client'){
      console.warn('Client mutations require the dedicated client-actions layer before production launch. Local browser copy retained.');
      return {clientWriteDeferred:true};
    }
    const {error:e1} = await client.from('project_snapshots').upsert({project_id:cfg.projectId,audience:'internal',payload:state});
    if(e1) throw e1;
    const {error:e2} = await client.from('project_snapshots').upsert({project_id:cfg.projectId,audience:'client',payload:sanitizeClientState(state)});
    if(e2) throw e2;
  }

  function subscribe(role,onState){
    if(!client || !cfg.projectId) return ()=>{};
    const audience = role === 'client' ? 'client' : 'internal';
    channel = client.channel(`liveops-${cfg.projectId}-${audience}`)
      .on('postgres_changes',{event:'*',schema:'public',table:'project_snapshots',filter:`project_id=eq.${cfg.projectId}`},payload=>{
        if(payload.new?.audience === audience && payload.new?.payload) onState(payload.new.payload);
      }).subscribe();
    return ()=>{ if(channel) client.removeChannel(channel); channel=null; };
  }

  async function uploadProof(taskId,file){
    if(!client || !cfg.projectId) return null;
    const ext=(file.name.split('.').pop()||'jpg').replace(/[^a-z0-9]/gi,'').toLowerCase();
    const path=`${cfg.projectId}/${taskId}/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await client.storage.from('proofs').upload(path,file,{cacheControl:'3600',upsert:false});
    if(error) throw error;
    const {data:signed,error:sErr}=await client.storage.from('proofs').createSignedUrl(path,60*60*24*7);
    if(sErr) throw sErr;
    return {path,url:signed.signedUrl};
  }


  async function loadPublicSiteContent(){
    if(!client || !cfg.projectId) return null;
    const {data,error}=await client.from('project_snapshots')
      .select('payload,updated_at')
      .eq('project_id',cfg.projectId)
      .eq('audience','public')
      .maybeSingle();
    if(error){
      // The V9 public policy may not have been installed yet.
      console.warn('Public landing content unavailable:',error.message);
      return null;
    }
    return data?.payload||null;
  }

  async function savePublicSiteContent(content){
    if(!client || !cfg.projectId) return {demo:true};
    const {error}=await client.from('project_snapshots').upsert({
      project_id:cfg.projectId,
      audience:'public',
      payload:content
    });
    if(error) throw error;
    return {ok:true};
  }

  async function uploadDocument(file){
    if(!client || !cfg.projectId) throw new Error('Live backend is not configured.');
    const ext=(file.name.split('.').pop()||'file').replace(/[^a-z0-9]/gi,'').toLowerCase();
    const path=`${cfg.projectId}/documents/${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const {error}=await client.storage.from('documents').upload(path,file,{cacheControl:'3600',upsert:false});
    if(error) throw error;
    return {path};
  }

  async function getDocumentUrl(path){
    if(!client) throw new Error('Live backend is not configured.');
    const {data,error}=await client.storage.from('documents').createSignedUrl(path,60*60);
    if(error) throw error;
    return data?.signedUrl||'';
  }

  async function removeDocument(path){
    if(!client || !path) return;
    const {error}=await client.storage.from('documents').remove([path]);
    if(error) throw error;
  }

  async function submitEnquiry(form){
    if(!client) return {demo:true};
    const {error}=await client.from('enquiries').insert(form);
    if(error) throw error;
  }

  async function manageAccess(action,payload={}){
    if(!client || !cfg.projectId) throw new Error('Live backend is not configured.');

    const {data:sessionData,error:sessionError}=await client.auth.getSession();
    if(sessionError) throw sessionError;
    const accessToken=sessionData?.session?.access_token;
    if(!accessToken) throw new Error('Sign in to Command Center again before managing access.');

    const {data,error}=await client.functions.invoke('manage-access',{
      body:{action,projectId:cfg.projectId,...payload},
      headers:{Authorization:`Bearer ${accessToken}`}
    });

    if(error){
      let msg=error.message||'Access request failed.';
      try{
        const ctx=error.context;
        if(ctx && typeof ctx.json==='function'){
          const body=await ctx.json();
          if(body?.error) msg=body.error;
        }
      }catch(_){}
      throw new Error(msg);
    }

    if(data?.error) throw new Error(data.error);
    return data;
  }

  const createAccess=(account)=>manageAccess('create',{account});
  const listAccess=()=>manageAccess('list');
  const updateAccess=(account)=>manageAccess('update',{account});
  const setAccessActive=(userId,isActive)=>manageAccess('set-active',{userId,isActive});
  const resetAccessPassword=(userId,password)=>manageAccess('reset-password',{userId,password});
  const deleteAccess=(userId)=>manageAccess('delete',{userId});

  window.LiveOpsCloud = {isConfigured:()=>!!client, signIn, signOut, loadState, saveState, subscribe, uploadProof, loadPublicSiteContent, savePublicSiteContent, uploadDocument, getDocumentUrl, removeDocument, submitEnquiry, sanitizeClientState, createAccess, listAccess, updateAccess, setAccessActive, resetAccessPassword, deleteAccess};
})();
