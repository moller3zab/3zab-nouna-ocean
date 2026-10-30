export const PROJECT = 'ahmedwanfal';
export const MEMBERS = ['EJ9SoDzXCLgHBgXglBU703ZOcXH2','NJRJQyKj7JbSVBQeAYbKUOm8vcY2'];
export class APIError extends Error { constructor(public status: number, message: string) { super(message); } }
export function member(uid: string) { if (!MEMBERS.includes(uid)) throw new APIError(403,'This account is not authorized.'); }
export function bytes(value: string) { try { return Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0)); } catch { throw new APIError(400,'Invalid encoded key.'); } }
export function b64(value: Uint8Array) { return btoa(String.fromCharCode(...value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,''); }
export function nonce() { return b64(crypto.getRandomValues(new Uint8Array(32))); }
export async function hash(value: string) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))].map(b=>b.toString(16).padStart(2,'0')).join(''); }
export const DEFAULTS = {previews:false,chat:true,photos:true,memories:true,letters:true,songs:true,other:true};
export type Preferences = typeof DEFAULTS;
export function preferences(value: unknown): Preferences { const v = value && typeof value === 'object' ? value as Record<string,unknown> : {}; return Object.fromEntries(Object.entries(DEFAULTS).map(([k,fallback])=>[k,typeof v[k]==='boolean'?v[k]:fallback])) as Preferences; }
export type Subscription = {endpoint:string;expirationTime:null;keys:{p256dh:string;auth:string}};
export async function validateSubscription(raw: unknown): Promise<Subscription> {
 if (!raw || typeof raw !== 'object') throw new APIError(400,'Invalid subscription.');
 const v=raw as Partial<Subscription>;
 if(typeof v.endpoint!=='string'||v.endpoint.length>2048)throw new APIError(400,'Invalid endpoint.');
 const u=new URL(v.endpoint);if(u.protocol!=='https:'||u.port||u.username||u.password||u.hash||u.pathname==='/'||!['fcm.googleapis.com','updates.push.services.mozilla.com','web.push.apple.com'].includes(u.hostname))throw new APIError(400,'Unsupported push service.');
 if(!v.keys||typeof v.keys.p256dh!=='string'||typeof v.keys.auth!=='string'||!/^[\w-]+$/.test(v.keys.p256dh)||!/^[\w-]+$/.test(v.keys.auth)||bytes(v.keys.p256dh).length!==65||bytes(v.keys.auth).length!==16)throw new APIError(400,'Invalid subscription keys.');
 try {await crypto.subtle.importKey('raw',bytes(v.keys.p256dh),{name:'ECDH',namedCurve:'P-256'},false,[]);}catch{throw new APIError(400,'Invalid device public key.');}
 return {endpoint:v.endpoint,expirationTime:null,keys:v.keys};
}
export type Device = {id:string;uid:string;subscription:string;binding:string;active:number;verified_until:number;prefs:string;pending_uid?:string;pending_hash?:string;challenge_id?:string;challenge_expires:number};
