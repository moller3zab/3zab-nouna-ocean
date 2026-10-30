import { buildPushPayload } from '@block65/webcrypto-web-push';
import type { Env } from './env';
import { APIError, hash, nonce, preferences, validateSubscription, type Device, type Subscription } from './core';
export function vapid(env:Env) {try{const value=JSON.parse(env.VAPID_JSON);if(!value.publicKey||!value.privateKey||!/^mailto:[^\s@]+@[^\s@]+$/.test(value.subject))throw Error();return value as {publicKey:string;privateKey:string;subject:string};}catch{throw new APIError(503,'The server notification key is not configured.');}}
export async function sendPush(env:Env,subscription:Subscription,data:Record<string,any>) {
 const request=await buildPushPayload({data,options:{ttl:data.kind==='verify'?300:90,urgency:'normal'}},subscription,vapid(env));
 const res=await fetch(subscription.endpoint,{...request,redirect:'manual',signal:AbortSignal.timeout(7000)});
 await res.body?.cancel();
 if(res.status===404||res.status===410)throw new APIError(410,'This device subscription has expired. Enable it again.');
 if(!res.ok)throw new APIError(503,'The push provider could not accept this notification. Retry later.');
}
export async function begin(env:Env,uid:string,raw:unknown){
 if(env.PUSH_ENABLED!=='true')throw new APIError(503,'Push enrollment is not enabled on the server.');
 const sub=await validateSubscription(raw),id=await hash(sub.endpoint),now=Date.now();
 const old=await env.DB.prepare('SELECT * FROM devices WHERE id=?').bind(id).first<Device>();
 if(old?.active&&old.uid!==uid)throw new APIError(409,'Sign out the previous account on this device before enrolling.');
 const count=await env.DB.prepare('SELECT COUNT(*) AS n FROM devices WHERE uid=? AND (active=1 OR challenge_expires>?)').bind(uid,now).first<{n:number}>();
 if(!old&&(count?.n||0)>=6)throw new APIError(429,'Six devices are already registered. Disable an old device first.');
 const value=nonce(),challengeId=nonce(),digest=await hash(value);
 const result=await env.DB.prepare(`INSERT INTO devices(id,uid,pending_uid,pending_sub,pending_hash,challenge_id,challenge_expires,created_at,updated_at)
 VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET pending_uid=excluded.pending_uid,pending_sub=excluded.pending_sub,pending_hash=excluded.pending_hash,challenge_id=excluded.challenge_id,challenge_expires=excluded.challenge_expires,updated_at=excluded.updated_at
 WHERE (devices.active=0 OR devices.uid=excluded.uid) AND devices.challenge_expires<=?`).bind(id,uid,uid,JSON.stringify(sub),digest,challengeId,now+300000,now,now,now).run();
 if(!result.meta.changes)throw new APIError(409,'A device verification is pending. Open that notification or retry in five minutes.');
 try{await sendPush(env,sub,{kind:'verify',deviceId:id,uid,challengeId,nonce:value,expires:now+300000});}
 catch(error){if(error instanceof APIError&&error.status===410)await env.DB.prepare('UPDATE devices SET active=0,challenge_expires=0,pending_hash=NULL,pending_sub=NULL WHERE id=? AND challenge_id=?').bind(id,challengeId).run();throw error;}
 return {deviceId:id,challengeId};
}
export async function confirm(env:Env,uid:string,data:Record<string,unknown>){
 const {deviceId,challengeId,nonce:value}=data;if(typeof deviceId!=='string'||!/^[a-f0-9]{64}$/.test(deviceId)||typeof challengeId!=='string'||typeof value!=='string'||value.length>100)throw new APIError(400,'Invalid device challenge.');
 const now=Date.now();
 const result=await env.DB.prepare(`UPDATE devices SET uid=pending_uid,subscription=pending_sub,binding=challenge_id,active=1,verified_until=?,prefs=CASE WHEN uid=pending_uid AND binding IS NOT NULL THEN prefs ELSE ? END,pending_uid=NULL,pending_sub=NULL,pending_hash=NULL,challenge_expires=0,updated_at=?
 WHERE id=? AND pending_uid=? AND challenge_id=? AND pending_hash=? AND challenge_expires>? AND (active=0 OR uid=?)`).bind(now+30*86400000,JSON.stringify(preferences({})),now,deviceId,uid,challengeId,await hash(value),now,uid).run();
 if(!result.meta.changes)throw new APIError(403,'Device verification failed or expired. Request a fresh verification push.');
 return {deviceId,binding:challengeId};
}
export async function update(env:Env,uid:string,data:Record<string,unknown>){
 if(typeof data.deviceId!=='string'||typeof data.binding!=='string')throw new APIError(400,'Verify this device first.');
 const prefs=preferences(data.preferences);if(env.PREVIEWS_ENABLED!=='true')prefs.previews=false;
 const result=await env.DB.prepare('UPDATE devices SET prefs=?,active=CASE WHEN ?=1 THEN 0 ELSE active END,pending_hash=NULL,challenge_expires=0,updated_at=? WHERE id=? AND uid=? AND binding=?').bind(JSON.stringify(prefs),data.revoke===true?1:0,Date.now(),data.deviceId,uid,data.binding).run();
 if(!result.meta.changes)throw new APIError(403,'This device does not belong to your signed-in account.');
 return {ok:true,preferences:prefs};
}
export async function rateLimit(env:Env,uid:string){
 const now=Date.now();const buckets=[[`minute:${uid}:${Math.floor(now/60000)}`,60,now+120000],[`day:${Math.floor(now/86400000)}`,3000,now+86400000]] as const;
 for(const [bucket,limit,expires]of buckets){const r=await env.DB.prepare('INSERT INTO counters(bucket,count,expires_at) VALUES(?,1,?) ON CONFLICT(bucket) DO UPDATE SET count=count+1 WHERE count<? RETURNING count').bind(bucket,expires,limit).all();if(!r.results.length)throw new APIError(429,'Notification request limit reached. The saved content is safe; retry later.');}
}
