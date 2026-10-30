import type { Env } from './env';
import { authenticate } from './auth';
import { APIError } from './core';
import { begin, confirm, rateLimit, update, vapid } from './registry';
import { notifyEvent } from './events';
import { reconcile } from './reconcile';
import { benchmark } from './benchmark';
const ORIGIN='https://ahmedwanfal.web.app';
export async function readJSON(request:Request,limit=8192):Promise<Record<string,unknown>>{
 if(!request.headers.get('content-type')?.startsWith('application/json'))throw new APIError(415,'Use application/json.');
 const reader=request.body?.getReader();if(!reader)throw new APIError(400,'Missing request body.');let length=0;const parts:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;length+=value.byteLength;if(length>limit){await reader.cancel();throw new APIError(413,'Request is too large.');}parts.push(value);}
 const bytes=new Uint8Array(length);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.byteLength;}
 try{const data=JSON.parse(new TextDecoder().decode(bytes));if(!data||typeof data!=='object'||Array.isArray(data))throw Error();return data;}catch{throw new APIError(400,'Invalid JSON request.');}
}
export default {
 async fetch(request:Request,env:Env):Promise<Response>{
  const origin=request.headers.get('Origin');const path=new URL(request.url).pathname;
  const headers:Record<string,string>={'Content-Type':'application/json','Cache-Control':'no-store','Vary':'Origin','X-Content-Type-Options':'nosniff'};
  if(origin===ORIGIN){headers['Access-Control-Allow-Origin']=ORIGIN;headers['Access-Control-Allow-Headers']='authorization,content-type';headers['Access-Control-Allow-Methods']='POST,OPTIONS';}
  const respond=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers});
  if(origin&&origin!==ORIGIN)return respond({error:'This website origin is not allowed.'},403);
  if(request.method==='GET'&&path==='/health')return respond({service:'ocean-free-push',configured:!!env.VAPID_JSON,pushEnabled:env.PUSH_ENABLED==='true',previewsEnabled:env.PREVIEWS_ENABLED==='true'});
  if(request.method==='OPTIONS')return new Response(null,{status:origin===ORIGIN?204:403,headers});
  try{
   if(request.method!=='POST')throw new APIError(405,'Use an authenticated POST request.');
   if(path==='/admin/benchmark')return respond(await benchmark(request,env));
   const authorization=request.headers.get('Authorization');if(!authorization?.startsWith('Bearer '))throw new APIError(401,'Sign in before managing notifications.');
   const token=authorization.slice(7);if(token.length>8192)throw new APIError(401,'Invalid authentication token.');
   const auth=await authenticate(token);await rateLimit(env,auth.uid);const body=await readJSON(request);
   let result:unknown;
   if(path==='/config')result={publicKey:vapid(env).publicKey,enabled:env.PUSH_ENABLED==='true',previewsEnabled:env.PREVIEWS_ENABLED==='true'};
   else if(path==='/subscriptions/begin')result=await begin(env,auth.uid,body.subscription);
   else if(path==='/subscriptions/confirm')result=await confirm(env,auth.uid,body);
   else if(path==='/subscriptions/update')result=await update(env,auth.uid,body);
   else if(path==='/events'){
    await env.DB.prepare('INSERT INTO profiles(uid,name,updated_at) VALUES(?,?,?) ON CONFLICT(uid) DO UPDATE SET name=excluded.name,updated_at=excluded.updated_at').bind(auth.uid,auth.name==='Your partner'?(JSON.parse(env.IDENTITY_MAP||'{}')[auth.uid]||auth.name):auth.name,Date.now()).run();
    result=await notifyEvent(env,token,auth.uid,body);
   }else throw new APIError(404,'Unknown notification endpoint.');
   return respond(result);
  }catch(error){if(error instanceof APIError)return respond({error:error.message},error.status);console.error(JSON.stringify({event:'push_request_failed'}));return respond({error:'Notification service unavailable. Your saved content is unaffected.'},503);}
 },
 async scheduled(event:ScheduledController,env:Env):Promise<void>{
  try{await reconcile(env,event.scheduledTime);}catch{console.error(JSON.stringify({event:'reconciliation_pending'}));}
  if(Math.floor(event.scheduledTime/60000)%1440!==17)return;
  // Daily indexed cleanup only. No Firestore polling or credentials stored for cron.
  const now=Date.now();await env.DB.batch([
   env.DB.prepare('DELETE FROM counters WHERE bucket IN (SELECT bucket FROM counters WHERE expires_at<? LIMIT 1000)').bind(now),
   env.DB.prepare('DELETE FROM deliveries WHERE event_id IN (SELECT id FROM events WHERE expires_at<? LIMIT 250)').bind(now),
   env.DB.prepare('DELETE FROM events WHERE id IN (SELECT id FROM events WHERE expires_at<? LIMIT 250)').bind(now),
   env.DB.prepare('DELETE FROM devices WHERE id IN (SELECT id FROM devices WHERE updated_at<? AND active=0 LIMIT 100)').bind(now-60*86400000)
  ]);
 }
} satisfies ExportedHandler<Env>;
