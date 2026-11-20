export type TransportOptions = {primary:string;fallbacks:string[];fetcher?:typeof fetch;now?:()=>number};
export type TransportInit = RequestInit & {replaySafe?:boolean};

/** A remembered route avoids paying the failed origin's timeout on every request. */
export function createFailoverFetch({primary,fallbacks,fetcher=fetch,now=Date.now}:TransportOptions) {
  let preferred=primary;let preferredUntil=0;
  const bases=[...new Set([primary,...fallbacks])];
  return async function transport(path:string,init:TransportInit={},timeoutMs=10_000):Promise<Response> {
    const {replaySafe=false,...requestInit}=init;
    const method=(init.method||'GET').toUpperCase();
    const safe=['GET','HEAD'].includes(method)||replaySafe;
    const sessionPath=path.startsWith('/chat/session')||path.startsWith('/chat/auth/');
    const ordered=safe&&!sessionPath&&preferredUntil>now()?[preferred,...bases.filter(base=>base!==preferred)]:bases;
    const candidates=safe&&!sessionPath?ordered:[preferredUntil>now()&&!sessionPath?preferred:primary];
    let lastError:unknown;
    for(let index=0;index<candidates.length;index++){
      if(init.signal?.aborted)throw init.signal.reason||new DOMException('Aborted','AbortError');
      const base=candidates[index];const controller=new AbortController();
      const abort=()=>controller.abort(init.signal?.reason);init.signal?.addEventListener('abort',abort,{once:true});
      const deadline=setTimeout(()=>controller.abort(),index===0&&candidates.length>1?Math.min(timeoutMs,5500):timeoutMs);
      try{
        const response=await fetcher(`${base}${path}`,{...requestInit,signal:controller.signal,credentials:base===primary?init.credentials:'omit'});
        const wrongType=requestInit.headers && new Headers(requestInit.headers).get('Accept')==='application/json'&&response.ok&&response.status!==204&&!response.headers.get('content-type')?.includes('json');
        if((response.status===408||response.status>=500||wrongType)&&index<candidates.length-1){await response.body?.cancel();continue;}
        if(!wrongType&&response.status<500&&response.status!==408){preferred=base;preferredUntil=base===primary?0:now()+60_000;}
        return response;
      }catch(error){lastError=error;if(init.signal?.aborted)throw error;if(index===candidates.length-1)throw error;}
      finally{clearTimeout(deadline);init.signal?.removeEventListener('abort',abort);}
    }
    throw lastError||new Error('API unavailable');
  };
}
