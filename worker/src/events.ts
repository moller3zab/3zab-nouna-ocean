import type { Env } from './env';
import { APIError, type Device } from './core';
import { savedEvent } from './firestore';
import { makePayload, recipientFor, sections } from './activity';
import { sendPush } from './registry';
export async function notifyEvent(env:Env,token:string,uid:string,body:Record<string,unknown>,expectedId?:string){
 if(env.PUSH_ENABLED!=='true'||env.RULES_ATTESTATION_READY!=='true'||!Number.isFinite(Date.parse(env.ATTESTATION_SINCE)))throw new APIError(503,'Verified notification events are not enabled on the server.');
 const collection=body.collection,id=body.documentId;
 if(typeof collection!=='string'||!Object.hasOwn(sections,collection)||typeof id!=='string')throw new APIError(400,'Unsupported saved event.');
 const event=await savedEvent(token,uid,collection,id,fetch,Date.parse(env.ATTESTATION_SINCE));if(expectedId&&event.id!==expectedId)return {accepted:false,remaining:false,reason:'Saved revision changed.'};let map:Record<string,string>;try{map=JSON.parse(env.IDENTITY_MAP||'{}');}catch{throw new APIError(503,'Recipient configuration is invalid.');}
 const recipient=recipientFor(uid,collection,event.data,map);
 if(!recipient)return {accepted:false,remaining:false,reason:'No verified recipient mapping for this event.'};
 const devices=(await env.DB.prepare('SELECT * FROM devices WHERE uid=? AND active=1 AND verified_until>? ORDER BY id LIMIT 6').bind(recipient,Date.now()).all<Device>()).results;
 const eligible=devices.map(device=>({device,payload:makePayload(event,collection,uid,device,false,map)})).filter(entry=>entry.payload);
 // Actor display name comes from a previously verified Firebase token, never body fields.
 const profile=await env.DB.prepare('SELECT name FROM profiles WHERE uid=?').bind(uid).first<{name:string}>();
 const now=Date.now();
 const existing=await env.DB.prepare('SELECT revision FROM events WHERE id=?').bind(event.id).first<{revision:string}>();
 if(existing&&existing.revision!==event.revision)throw new APIError(409,'Event identifier has already been used for another saved revision.');
 await env.DB.batch([
  env.DB.prepare('INSERT OR IGNORE INTO events(id,uid,collection,document_id,revision,created_at,expires_at) VALUES(?,?,?,?,?,?,?)').bind(event.id,uid,collection,id,event.revision,now,now+7*86400000),
  ...eligible.map(({device})=>env.DB.prepare('INSERT OR IGNORE INTO deliveries(event_id,device_id,binding,updated_at) VALUES(?,?,?,?)').bind(event.id,device.id,device.binding,now))
 ]);
 if(!eligible.length){await env.DB.prepare("UPDATE deliveries SET status='sent' WHERE event_id=?").bind(event.id).run();return {accepted:true,remaining:false};}
 // At most ONE encryption/signing/send per invocation keeps Free CPU/subrequests bounded.
 for(const {device}of eligible){
  const claim=await env.DB.prepare("UPDATE deliveries SET status='sending',lease_until=?,attempts=attempts+1,updated_at=? WHERE event_id=? AND device_id=? AND binding=? AND status!='sent' AND lease_until<=? AND attempts<5").bind(now+15000,now,event.id,device.id,device.binding,now).run();
  if(!claim.meta.changes)continue;
  const latest=await env.DB.prepare('SELECT * FROM devices WHERE id=?').bind(device.id).first<Device>();
  const payload=latest&&latest.binding===device.binding?makePayload(event,collection,profile?.name||map[uid]||'Your partner',latest,env.PREVIEWS_ENABLED==='true',map):null;
  if(!payload){await env.DB.prepare("UPDATE deliveries SET status='sent' WHERE event_id=? AND device_id=? AND binding=?").bind(event.id,device.id,device.binding).run();continue;}
  try{
   await sendPush(env,JSON.parse(latest!.subscription),payload);
   await env.DB.prepare("UPDATE deliveries SET status='sent',updated_at=? WHERE event_id=? AND device_id=? AND binding=?").bind(Date.now(),event.id,device.id,device.binding).run();
  }catch(error){
   if(error instanceof APIError&&error.status===410){await env.DB.batch([env.DB.prepare('UPDATE devices SET active=0 WHERE id=? AND binding=?').bind(device.id,device.binding),env.DB.prepare("UPDATE deliveries SET status='sent' WHERE event_id=? AND device_id=? AND binding=?").bind(event.id,device.id,device.binding)]);}
   else{await env.DB.prepare("UPDATE deliveries SET status='pending',lease_until=0 WHERE event_id=? AND device_id=? AND binding=?").bind(event.id,device.id,device.binding).run();throw error;}
  }
  const pending=await env.DB.prepare("SELECT COUNT(*) AS n FROM deliveries WHERE event_id=? AND status!='sent' AND attempts<5").bind(event.id).first<{n:number}>();
  return {accepted:true,remaining:!!pending?.n};
 }
 return {accepted:true,remaining:false};
}
