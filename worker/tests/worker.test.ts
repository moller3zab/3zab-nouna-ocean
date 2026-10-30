import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {Miniflare,createFetchMock} from 'miniflare';
import fs from 'node:fs';
import {generateKeyPair,exportJWK,exportPKCS8,SignJWT,createLocalJWKSet} from 'jose';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url); const ece=require('http_ece');
import {createECDH,randomBytes} from 'node:crypto';
import {authenticate} from '../src/auth';
import {MEMBERS,DEFAULTS} from '../src/core';
import {savedEvent} from '../src/firestore';
import {makePayload,sections} from '../src/activity';
const ORIGIN='https://ahmedwanfal.web.app';let mf:Miniflare,db:any,mock:any,key:any,jwk:any,vapid:any;
const privateKeys=new Map<string,ReturnType<typeof createECDH>>();
const signed=async(uid=MEMBERS[0],patch:Record<string,unknown>={})=>new SignJWT({auth_time:Math.floor(Date.now()/1000),name:'Nouna',...patch}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://securetoken.google.com/ahmedwanfal').setAudience('ahmedwanfal').setSubject(uid).setIssuedAt().setExpirationTime('1h').sign(key.privateKey);
function sub(name='test'){const e=createECDH('prime256v1');e.generateKeys();privateKeys.set(name,e);return {endpoint:'https://fcm.googleapis.com/fcm/send/'+name,expirationTime:null,keys:{p256dh:e.getPublicKey().toString('base64url'),auth:randomBytes(16).toString('base64url')}};}
async function post(path:string,data:unknown={},uid=MEMBERS[0]){return mf.dispatchFetch('https://worker.test'+path,{method:'POST',headers:{Origin:ORIGIN,Authorization:'Bearer '+await signed(uid),'Content-Type':'application/json'},body:JSON.stringify(data)});}
beforeAll(async()=>{
 key=await generateKeyPair('RS256',{extractable:true});jwk={...await exportJWK(key.publicKey),kid:'test',alg:'RS256',use:'sig'};
 const ec=createECDH('prime256v1');ec.generateKeys();vapid={subject:'mailto:test@example.com',publicKey:ec.getPublicKey().toString('base64url'),privateKey:ec.getPrivateKey().toString('base64url')};
 mock=createFetchMock();mock.disableNetConnect();
 mock.get('https://oauth2.googleapis.com').intercept({path:'/token',method:'POST'}).reply(200,{access_token:'test-reader-token',expires_in:3600},{headers:{'Content-Type':'application/json'}}).persist();
 mock.get('https://www.googleapis.com').intercept({path:'/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com'}).reply(200,{keys:[jwk]},{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=3600'}}).persist();
 mf=new Miniflare({modules:true,script:fs.readFileSync('dist/worker.js','utf8'),compatibilityDate:'2026-07-30',d1Databases:['DB'],fetchMock:mock,bindings:{VAPID_JSON:JSON.stringify(vapid),PUSH_ENABLED:'true',PREVIEWS_ENABLED:'true',RULES_ATTESTATION_READY:'true',ATTESTATION_SINCE:'2026-01-01T00:00:00Z',IDENTITY_MAP:JSON.stringify({[MEMBERS[0]]:'Nouna',[MEMBERS[1]]:'3zab'}),FIREBASE_READER_JSON:JSON.stringify({client_email:'test-reader@example.iam.gserviceaccount.com',private_key:await exportPKCS8(key.privateKey),private_key_id:'test-reader'})}});
 db=await mf.getD1Database('DB');const statements=fs.readFileSync('migrations/0001.sql','utf8').split(';').filter(s=>s.trim());await db.batch(statements.map(sql=>db.prepare(sql)));
},30000);
afterAll(async()=>{await mf?.dispose();});
describe('Firebase token verification',()=>{
 it('validates signature, issuer, audience, expiry and allowlist',async()=>{
  const keys=createLocalJWKSet({keys:[jwk]});expect((await authenticate(await signed(),keys)).uid).toBe(MEMBERS[0]);
  await expect(authenticate(await signed('attacker'),keys)).rejects.toThrow();
  const wrong=await new SignJWT({auth_time:1}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://securetoken.google.com/other').setAudience('other').setSubject(MEMBERS[0]).setIssuedAt().setExpirationTime('1h').sign(key.privateKey);
  await expect(authenticate(wrong,keys)).rejects.toThrow();
  const expired=await new SignJWT({auth_time:1}).setProtectedHeader({alg:'RS256',kid:'test'}).setIssuer('https://securetoken.google.com/ahmedwanfal').setAudience('ahmedwanfal').setSubject(MEMBERS[0]).setIssuedAt(1).setExpirationTime(2).sign(key.privateKey);
  await expect(authenticate(expired,keys)).rejects.toThrow();
 });
});
it('runs the production bundle in workerd WITHOUT Node compatibility; enforces CORS/auth/body bounds',async()=>{
 expect((await mf.dispatchFetch('https://worker.test/health')).status).toBe(200);
 expect((await mf.dispatchFetch('https://worker.test/config',{method:'POST',body:'{}'})).status).toBe(401);
 expect((await mf.dispatchFetch('https://worker.test/health',{headers:{Origin:'https://evil.test'}})).status).toBe(403);
 expect((await post('/config',{},'attacker')).status).toBe(401);
 const config=await (await post('/config')).json() as any;expect(config.publicKey).toBe(vapid.publicKey);expect(config.privateKey).toBeUndefined();
 expect((await post('/config',{large:'x'.repeat(9000)})).status).toBe(413);
});
it('encrypted enrollment stores only nonce hash, cannot be hijacked, and expired/replayed confirmations fail',async()=>{
 const subscription=sub('enroll');let encrypted:Uint8Array|undefined;
 mock.get('https://fcm.googleapis.com').intercept({path:'/fcm/send/enroll',method:'POST'}).reply((opts:any)=>{encrypted=opts.body;return {statusCode:201,data:''};}).persist();
 const response=await post('/subscriptions/begin',{subscription,uid:MEMBERS[1]});expect(response.status).toBe(200);const pending=await response.json() as any;
 expect(pending.nonce).toBeUndefined();const record=await db.prepare('SELECT * FROM devices WHERE id=?').bind(pending.deviceId).first();expect(record.pending_uid).toBe(MEMBERS[0]);expect(record.pending_hash).toHaveLength(64);expect(record.active).toBe(0);expect(encrypted).toBeTruthy();
 expect((await post('/subscriptions/confirm',{...pending,nonce:'guessed'})).status).toBe(403);
 expect((await post('/subscriptions/confirm',{...pending,nonce:'guessed'},MEMBERS[1])).status).toBe(403);
 const proof=JSON.parse(ece.decrypt(Buffer.from(await new Response(encrypted as any).arrayBuffer()),{version:'aes128gcm',privateKey:privateKeys.get('enroll'),authSecret:subscription.keys.auth}).toString());
 expect(proof.kind).toBe('verify');
 const verified=await (await post('/subscriptions/confirm',{...pending,nonce:proof.nonce})).json() as any;
 expect(verified.binding).toBe(pending.challengeId);
 expect((await post('/subscriptions/confirm',{...pending,nonce:proof.nonce})).status).toBe(403);
 expect((await post('/subscriptions/begin',{subscription},MEMBERS[1])).status).toBe(409);
 expect((await post('/subscriptions/update',{deviceId:pending.deviceId,binding:pending.challengeId,revoke:true},MEMBERS[1])).status).toBe(403);
 expect((await post('/subscriptions/update',{deviceId:pending.deviceId,binding:pending.challengeId,revoke:true})).status).toBe(200);
 expect((await db.prepare('SELECT active FROM devices WHERE id=?').bind(pending.deviceId).first()).active).toBe(0);
});
it('validates actual Firestore content using masks; rejects forged, stale or changed creator metadata',async()=>{
 const time=new Date().toISOString();const doc={createTime:time,updateTime:time,fields:{text:{stringValue:'Actual text'},sender:{stringValue:'Nouna'},pushMeta:{mapValue:{fields:{uid:{stringValue:MEMBERS[0]},eventId:{stringValue:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'},at:{timestampValue:time},media:{stringValue:'none'}}}}}};
 let path='';const fetcher=async(url:any)=>{path=String(url);return Response.json(doc);};
 const event=await savedEvent('verified-token',MEMBERS[0],'messages','message',fetcher as any);expect(event.data.text).toBe('Actual text');expect(path).toContain('mask.fieldPaths=pushMeta');expect(path).not.toContain('mask.fieldPaths=imageUrl');
 await expect(savedEvent('token',MEMBERS[1],'messages','message',fetcher as any)).rejects.toThrow();
 doc.fields.pushMeta.mapValue.fields.uid.stringValue=MEMBERS[1];await expect(savedEvent('token',MEMBERS[0],'messages','message',fetcher as any)).rejects.toThrow();
});
it('payloads require active owned devices and category/preview preferences; every section has a safe anchor',()=>{
 const device:any={uid:MEMBERS[1],active:1,verified_until:Date.now()+100000,binding:'proof',prefs:JSON.stringify({...DEFAULTS,previews:true})};
 const event={data:{sender:'Nouna',text:'بحبك 💙',_media:'none'},uid:MEMBERS[0],id:'event',created:true};
 const map={[MEMBERS[0]]:'Nouna',[MEMBERS[1]]:'3zab'};
 expect(makePayload(event,'messages','Nouna',device,true,map)?.preview).toBe('بحبك 💙');expect(makePayload(event,'messages','Nouna',device,false,map)?.preview).toBe('');
 expect(makePayload(event,'messages','Nouna',{...device,active:0},true,map)).toBeNull();
 const photo=makePayload({...event,data:{sender:'Nouna',_media:'photo'}},'messages','Nouna',device,true,map);expect(photo?.group).toBe('photos');expect(photo?.preview).toBe('');
 expect(Object.values(sections).every(v=>/^[a-z0-9-]+$/.test(v))).toBe(true);
});
it('reads saved events through Firestore REST, delivers original previews to multiple devices once, and retires expired endpoints',async()=>{
 const captured:{name:string;body:any}[]=[];
 for(const name of ['recipient-a','recipient-b']){
  const subscription=sub(name);await db.prepare('INSERT INTO devices(id,uid,subscription,binding,active,verified_until,prefs,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?,?)').bind(name,MEMBERS[1],JSON.stringify(subscription),'proof-'+name,Date.now()+100000,JSON.stringify({...DEFAULTS,previews:true}),Date.now(),Date.now()).run();
  mock.get('https://fcm.googleapis.com').intercept({path:'/fcm/send/'+name,method:'POST'}).reply((opts:any)=>{captured.push({name,body:opts.body});return {statusCode:201,data:''};}).persist();
 }
 const time=new Date().toISOString();const doc={createTime:time,updateTime:time,fields:{sender:{stringValue:'Nouna'},text:{stringValue:'Original saved message 💙'},pushMeta:{mapValue:{fields:{uid:{stringValue:MEMBERS[0]},eventId:{stringValue:'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee'},at:{timestampValue:time},media:{stringValue:'none'}}}}}};
 mock.get('https://firestore.googleapis.com').intercept({path:/^\/v1\/projects\/ahmedwanfal\/databases\/\(default\)\/documents\/messages\/saved\?/,method:'GET'}).reply(200,doc,{headers:{'Content-Type':'application/json'}}).persist();
 const body={collection:'messages',documentId:'saved',senderId:'attacker',text:'FAKE CLIENT CONTENT'};
 const first=await post('/events',body);expect(first.status).toBe(200);expect((await first.json() as any).remaining).toBe(true);expect(captured.length).toBe(1);
 expect((await post('/events',body)).status).toBe(200);expect(captured.length).toBe(2);
 expect((await post('/events',body)).status).toBe(200);expect(captured.length).toBe(2);
 for(const sent of captured){const row=await db.prepare('SELECT subscription FROM devices WHERE id=?').bind(sent.name).first();const keys=JSON.parse(row.subscription).keys;
  const decoded=JSON.parse(ece.decrypt(Buffer.from(await new Response(sent.body).arrayBuffer()),{version:'aes128gcm',privateKey:privateKeys.get(sent.name),authSecret:keys.auth}).toString());
  expect(decoded.uid).toBe(MEMBERS[1]);expect(decoded.preview).toBe('Original saved message 💙');expect(decoded.title).toBe('Nouna ❤️');expect(JSON.stringify(decoded)).not.toContain('FAKE CLIENT CONTENT');
 }
 // A new saved revision has its own durable event key; 410 disables only the dead device.
 await db.prepare('UPDATE devices SET active=0 WHERE uid=?').bind(MEMBERS[1]).run();
 const dead=sub('dead');await db.prepare('INSERT INTO devices(id,uid,subscription,binding,active,verified_until,prefs,created_at,updated_at) VALUES(?,?,?,?,1,?,?,?,?)').bind('dead',MEMBERS[1],JSON.stringify(dead),'dead-proof',Date.now()+100000,JSON.stringify(DEFAULTS),Date.now(),Date.now()).run();
 mock.get('https://fcm.googleapis.com').intercept({path:'/fcm/send/dead',method:'POST'}).reply(410,'').persist();
 expect((await post('/events',body)).status).toBe(200);expect((await db.prepare('SELECT active FROM devices WHERE id=?').bind('dead').first()).active).toBe(0);
});
it('scheduled reconciliation queries a single masked collection within the free read budget',async()=>{
 mock.get('https://firestore.googleapis.com').intercept({path:'/v1/projects/ahmedwanfal/databases/(default)/documents:runQuery',method:'POST'}).reply(200,[],{headers:{'Content-Type':'application/json'}}).persist();
 const worker=await mf.getWorker();
 await worker.scheduled({scheduledTime:Math.floor(Date.now()/900000)*900000,cron:'* * * * *'});
 const budget=await db.prepare("SELECT count FROM counters WHERE bucket LIKE 'fs-day:%'").first();expect(budget.count).toBe(3);
});
it('rate limit is durable in D1 and stops excess writes without enabling billing',async()=>{
 const bucket=`minute:${MEMBERS[1]}:${Math.floor(Date.now()/60000)}`;
 await db.prepare('INSERT OR REPLACE INTO counters(bucket,count,expires_at) VALUES(?,60,?)').bind(bucket,Date.now()+60000).run();
 expect((await post('/config',{},MEMBERS[1])).status).toBe(429);
});
