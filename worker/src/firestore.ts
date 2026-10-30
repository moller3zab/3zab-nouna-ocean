import { APIError, PROJECT, member, hash } from './core';
type Value = { stringValue?:string;integerValue?:string;doubleValue?:number;booleanValue?:boolean;timestampValue?:string;nullValue?:null;mapValue?:{fields?:Record<string,Value>};arrayValue?:{values?:Value[]} };
function decode(v:Value):unknown { if('stringValue'in v)return v.stringValue;if('timestampValue'in v)return v.timestampValue;if('integerValue'in v)return Number(v.integerValue);if('doubleValue'in v)return v.doubleValue;if('booleanValue'in v)return v.booleanValue;if(v.mapValue)return fields(v.mapValue.fields||{});if(v.arrayValue)return(v.arrayValue.values||[]).map(decode);return null; }
function fields(v:Record<string,Value>):Record<string,unknown>{return Object.fromEntries(Object.entries(v).map(([k,value])=>[k,decode(value)]));}
export type SavedEvent = {data:Record<string,unknown>;uid:string;id:string;revision:string;created:boolean};
export async function savedEvent(token:string,uid:string,collection:string,id:string,fetcher:typeof fetch=fetch,attestedSince=0):Promise<SavedEvent>{
 if(!/^[A-Za-z0-9_-]{1,128}$/.test(id))throw new APIError(400,'Invalid document ID.');
 const base=`https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/${collection}/${id}`;
 const url=new URL(base);
 for(const path of ['pushMeta','sender','author','recipient','text','title','caption','note','message','artist','hidden','targetDate','item'])url.searchParams.append('mask.fieldPaths',path);
 const response=await fetcher(url.toString(),{headers:{Authorization:`Bearer ${token}`},redirect:'manual',signal:AbortSignal.timeout(7000)});
 if(response.status===404)throw new APIError(404,'The saved event is not available yet.');
 if(!response.ok)throw new APIError(response.status===403?403:503,'Firestore could not verify this saved event.');
 const reader=response.body!.getReader();const chunks:Uint8Array[]=[];let size=0;
 while(true){const r=await reader.read();if(r.done)break;size+=r.value.byteLength;if(size>65536){await reader.cancel();throw new APIError(413,'Saved content is too large for Free-tier notification processing.');}chunks.push(r.value);}
 const content=new Uint8Array(size);let offset=0;for(const chunk of chunks){content.set(chunk,offset);offset+=chunk.byteLength;}
 const doc=JSON.parse(new TextDecoder().decode(content)) as {fields:Record<string,Value>;createTime:string;updateTime:string};
 const data=fields(doc.fields||{});const meta=data.pushMeta as {uid?:string;eventId?:string;at?:string;media?:string}|undefined;
 if(!meta||meta.uid!==uid||typeof meta.at!=='string'||typeof meta.eventId!=='string'||!/^[\w-]{16,80}$/.test(meta.eventId))throw new APIError(403,'This event has no verified creator attribution.');
 if(!['photo','video','none'].includes(meta.media||''))throw new APIError(403,'Missing verified media classification.');
 data._media=meta.media;
 member(meta.uid);
 const time=Date.parse(meta.at);if(time<attestedSince)throw new APIError(403,'This record predates verified event attribution.');if(!Number.isFinite(time)||time>Date.now()+5000||time<Date.now()-3600000)throw new APIError(410,'This notification event is too old.');
 return {data,uid:meta.uid,id:await hash(`${collection}/${id}:${doc.updateTime}:${meta.uid}:${meta.eventId}`),revision:doc.updateTime,created:doc.createTime===doc.updateTime};
}
