import { SignJWT, importPKCS8 } from 'jose';
import type { Env } from './env';
import { APIError, MEMBERS, PROJECT, hash } from './core';
import { sections } from './activity';
import { notifyEvent } from './events';
let tokenCache:{key:string;token:string;expires:number}|undefined;
async function readerToken(env:Env){
 if(!env.FIREBASE_READER_JSON)throw new APIError(503,'Read-only reconciliation credentials are not configured.');
 const service=JSON.parse(env.FIREBASE_READER_JSON) as {client_email:string;private_key:string;private_key_id:string};
 if(tokenCache?.key===service.private_key_id&&tokenCache.expires>Date.now()+60000)return tokenCache.token;
 const key=await importPKCS8(service.private_key,'RS256');
 const assertion=await new SignJWT({scope:'https://www.googleapis.com/auth/datastore'}).setProtectedHeader({alg:'RS256',kid:service.private_key_id}).setIssuer(service.client_email).setAudience('https://oauth2.googleapis.com/token').setIssuedAt().setExpirationTime('1h').sign(key);
 const res=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),signal:AbortSignal.timeout(7000)});
 if(!res.ok)throw new APIError(503,'Read-only Firestore access is unavailable.');
 const result=await res.json() as {access_token:string;expires_in:number};tokenCache={key:service.private_key_id,token:result.access_token,expires:Date.now()+result.expires_in*1000};return result.access_token;
}
async function readBudget(env:Env,cost:number){const now=Date.now();const result=await env.DB.prepare('INSERT INTO counters(bucket,count,expires_at) VALUES(?,?,?) ON CONFLICT(bucket) DO UPDATE SET count=count+excluded.count WHERE count+excluded.count<=5000 RETURNING count').bind('fs-day:'+Math.floor(now/86400000),cost,now+86400000).all();return result.results.length>0;}
export async function reconcile(env:Env,scheduledTime:number){
 if(env.PUSH_ENABLED!=='true'||env.RULES_ATTESTATION_READY!=='true'||!Number.isFinite(Date.parse(env.ATTESTATION_SINCE))||!env.FIREBASE_READER_JSON)return;
 const token=await readerToken(env);
 // One pending device delivery per minute. Credentials are read-only; never write Firestore.
 const pending=await env.DB.prepare("SELECT e.* FROM deliveries d JOIN events e ON e.id=d.event_id WHERE d.status!='sent' AND d.attempts<5 AND d.lease_until<=? AND e.expires_at>? ORDER BY d.updated_at LIMIT 1").bind(Date.now(),Date.now()).first<{id:string;uid:string;collection:string;document_id:string}>();
 if(pending&&await readBudget(env,1)){
  try{const r=await notifyEvent(env,token,pending.uid,{collection:pending.collection,documentId:pending.document_id},pending.id);if(!r.accepted)await env.DB.prepare("UPDATE deliveries SET status='sent' WHERE event_id=?").bind(pending.id).run();}
  catch(e){if(e instanceof APIError&&[403,404,410,413].includes(e.status))await env.DB.prepare("UPDATE deliveries SET status='sent' WHERE event_id=?").bind(pending.id).run();else throw e;}
 }
 const selected=Object.keys(sections)[Math.floor(scheduledTime/60000)%15];if(!selected)return;
 const now=Date.now();
 for(const collection of [selected]){
  if(!await readBudget(env,3))return;
  const cursor=await env.DB.prepare('SELECT cursor_time,cursor_name FROM sync_state WHERE collection=?').bind(collection).first<{cursor_time:string;cursor_name:string}>();
  const start=cursor?.cursor_time||new Date(Math.max(now-15*60000,Date.parse(env.ATTESTATION_SINCE))).toISOString();
  const query:Record<string,unknown>={from:[{collectionId:collection}],select:{fields:[{fieldPath:'pushMeta'}]},where:{fieldFilter:{field:{fieldPath:'pushMeta.at'},op:'GREATER_THAN_OR_EQUAL',value:{timestampValue:start}}},orderBy:[{field:{fieldPath:'pushMeta.at'},direction:'ASCENDING'},{field:{fieldPath:'__name__'},direction:'ASCENDING'}],limit:3};
  if(cursor?.cursor_name)query.startAt={values:[{timestampValue:start},{referenceValue:cursor.cursor_name}],before:false};
  const res=await fetch(`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:runQuery`,{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({structuredQuery:query}),signal:AbortSignal.timeout(7000)});
  if(!res.ok)throw new APIError(503,'Reconciliation query unavailable.');
  const rows=await res.json() as {document?:{name:string;updateTime:string;fields:{pushMeta?:{mapValue:{fields:Record<string,{stringValue?:string;timestampValue?:string}>}}}}}[];
  for(const row of rows){const doc=row.document;if(!doc)continue;const meta=doc.fields.pushMeta?.mapValue.fields;const uid=meta?.uid?.stringValue,at=meta?.at?.timestampValue,eventId=meta?.eventId?.stringValue;const documentId=doc.name.split('/').at(-1)!;
   if(uid&&MEMBERS.includes(uid)&&at&&eventId&&Date.parse(at)>now-3600000&&Date.parse(at)>=Date.parse(env.ATTESTATION_SINCE)){
    const key=await hash(`${collection}/${documentId}:${doc.updateTime}:${uid}:${eventId}`);
    const other=MEMBERS.find(v=>v!==uid)!;
    await env.DB.batch([env.DB.prepare('INSERT OR IGNORE INTO events(id,uid,collection,document_id,revision,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(key,uid,collection,documentId,doc.updateTime,now,now+7*86400000),
     env.DB.prepare('INSERT OR IGNORE INTO deliveries(event_id,device_id,binding,updated_at) SELECT ?,id,binding,? FROM devices WHERE uid=? AND active=1 AND verified_until>? LIMIT 6').bind(key,now,other,now)]);
   }
   if(at)await env.DB.prepare('INSERT INTO sync_state(collection,cursor_time,cursor_name,updated_at) VALUES(?,?,?,?) ON CONFLICT(collection) DO UPDATE SET cursor_time=excluded.cursor_time,cursor_name=excluded.cursor_name,updated_at=excluded.updated_at').bind(collection,at,doc.name,now).run();
  }
 }
}
