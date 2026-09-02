(function(){
  const cfg = window.LIVEOPS_CONFIG || {mode:'demo'};
  const isConfigured = ['cloud','supabase'].includes(cfg.mode) && cfg.supabaseUrl && cfg.supabaseAnonKey && cfg.projectId && window.supabase;
  let client = null;
  let channel = null;
  if(isConfigured){ client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey); }

  const sanitizeClientState = (state) => ({
    project: state.project,
    departments: state.clientRules?.departments === false ? [] : state.departments,
    tasks: state.tasks
      .filter(t => t.clientVisibility && t.clientVisibility !== 'Hidden')
      .map(t => ({
        id:t.id,name:t.name,phase:t.phase,department:t.department,zone:t.zone,
        priority:t.priority,status:t.status,deadline:t.deadline,progress:t.progress,
        clientVisibility:t.clientVisibility,verified:t.verified,
        proofs:(t.verified && /Proof|Full/i.test(t.clientVisibility||'')) ? t.proofs : [],
        remark:/Full/i.test(t.clientVisibility||'') ? t.remark : ''
      })),
    approvals: state.approvals,
    messages: state.messages.filter(m => m.from === 'client' || m.to === 'client'),
    clientRules: state.clientRules
  });

  async function signIn(userId, password){
    if(!client) return {demo:true};
    // Production convention: each LiveOps User ID maps to a private auth alias.
    // Accounts are provisioned by Admin through the secure server-side function.
    const rawId=String(userId).trim().toLowerCase();
    const email = rawId.includes('@') ? rawId : `${rawId}@users.marathonliveops.in`;
    const {data,error} = await client.auth.signInWithPassword({email,password});
    if(error) throw error;
    const {data:profile,error:pErr} = await client.from('profiles').select('*').eq('id',data.user.id).single();
    if(pErr) throw pErr;
    const {data:membership,error:mErr} = await client.from('project_memberships')
      .select('role,department,zone,is_active').eq('project_id',cfg.projectId).eq('user_id',data.user.id).single();
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

  async function submitEnquiry(form){
    if(!client) return {demo:true};
    const {error}=await client.from('enquiries').insert(form);
    if(error) throw error;
  }

  async function manageAccess(action,payload={}){
    if(!client || !cfg.projectId) throw new Error('Live backend is not configured.');
    const {data,error}=await client.functions.invoke('manage-access',{
      body:{action,projectId:cfg.projectId,...payload}
    });
    if(error){
      let msg=error.message||'Access request failed.';
      try{
        const ctx=error.context;
        if(ctx && typeof ctx.json==='function'){
          const body=await ctx.json();
          if(body?.error) msg=body.error;
        }
      }catch(_){ }
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

  window.LiveOpsCloud = {isConfigured:()=>!!client, signIn, signOut, loadState, saveState, subscribe, uploadProof, submitEnquiry, sanitizeClientState, createAccess, listAccess, updateAccess, setAccessActive, resetAccessPassword, deleteAccess};
})();
