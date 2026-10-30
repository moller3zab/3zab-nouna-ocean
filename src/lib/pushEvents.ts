import { getAuth } from 'firebase/auth';
import { serverTimestamp } from 'firebase/firestore';
import app from './firebase';
import { pushRequest } from './pushApi';
const supported = new Set(['messages','memories','polaroids','letters','songs','milestones','loveReasons','openWhen','things21','favorites','futureDreams','countdowns']);
const KEY='ocean-push-outbox-v1';
type Pending={uid:string;collection:string;documentId:string;eventId:string;at:number;attempts:number;next:number};
function read():Pending[]{try{
 const values:unknown=JSON.parse(localStorage.getItem(KEY)||'[]');if(!Array.isArray(values))return [];
 return values.filter((v):v is Pending=>!!v&&typeof v==='object'&&typeof v.uid==='string'&&typeof v.collection==='string'&&supported.has(v.collection)&&typeof v.documentId==='string'&&/^[A-Za-z0-9_-]{1,128}$/.test(v.documentId)&&typeof v.eventId==='string'&&Number.isFinite(v.at)&&Number.isFinite(v.next)&&Number.isFinite(v.attempts)).slice(-100);
 }catch{return [];}}
function save(items:Pending[]){try{localStorage.setItem(KEY,JSON.stringify(items.slice(-100)));}catch{/* Saving application content never depends on outbox storage. */}}
export function preparePushEvent(collection:string,documentId:string,item:Record<string,unknown>={}){
 const uid=getAuth(app).currentUser?.uid;if(!uid||!supported.has(collection))return null;
 const event:Pending={uid,collection,documentId,eventId:crypto.randomUUID(),at:Date.now(),attempts:0,next:0};
 save([...read(),event]);
 return {event,metadata:{uid,eventId:event.eventId,at:serverTimestamp(),media:typeof item.videoUrl==='string'&&item.videoUrl.length?'video':typeof item.imageUrl==='string'&&item.imageUrl.length?'photo':'none'}};
}
export function cancelPushEvent(eventId:string){save(read().filter(item=>item.eventId!==eventId));}
let flushing=false;
export async function flushPushEvents(){
 if(flushing||!navigator.onLine)return;flushing=true;
 try{
  const uid=getAuth(app).currentUser?.uid;if(!uid)return;
  const candidates=read().filter(item=>item.uid===uid&&item.next<=Date.now()&&item.at>Date.now()-3600000).slice(0,3);
  for(const event of candidates){
   if(getAuth(app).currentUser?.uid!==uid)break;
   try{
    let result:{accepted:boolean;remaining:boolean;reason?:string};let count=0;
    do{result=await pushRequest('notifyEvent',{collection:event.collection,documentId:event.documentId});count++;}while(result.remaining&&count<6);
    if(result.remaining)throw new Error('More devices are waiting for delivery.');
    cancelPushEvent(event.eventId);
    if(!result.accepted)window.dispatchEvent(new CustomEvent('ocean-push-status',{detail:result.reason||'Saved. This activity has no configured notification recipient.'}));
   }catch(error){
    const status=(error as {status?:number}).status;
    if(status===410||status===403||status===400||status===413){cancelPushEvent(event.eventId);}
    else save(read().map(item=>item.eventId===event.eventId?{...item,attempts:item.attempts+1,next:Date.now()+Math.min(900000,15000*2**Math.min(item.attempts,6))}:item));
    window.dispatchEvent(new CustomEvent('ocean-push-status',{detail:status===403?'Saved. This record could not be verified for notifications.':'Saved. Notifications are pending and will retry while this account is online.'}));
   }
  }
  save(read().filter(item=>item.at>Date.now()-3600000));
 }finally{flushing=false;}
}
export function startPushOutbox(){
 const flush=()=>{void flushPushEvents();};window.addEventListener('online',flush);const timer=setInterval(flush,30000);flush();
 return()=>{window.removeEventListener('online',flush);clearInterval(timer);};
}
