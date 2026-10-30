// Isolated browser-test adapter. Loaded only when the test intercepts store.ts.
const pixel = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a2ZcAAAAASUVORK5CYII=';
const seed = {
  milestones: [{ id:'seed', title:'Audit milestone', description:'Audit description', date:'2026-09-04', photos:[] }],
  memories: [{ id:'seed', title:'Audit memory', caption:'Audit caption', date:'2026-09-04', imageUrl:pixel, tag:'Sweet Snaps', likes:1, createdBy:'3zab' }],
  polaroids: [{ id:'seed', note:'Audit photo', imageUrl:pixel, date:'2026-09-04', x:40,y:40,rotation:0,createdBy:'3zab' }],
  songs: [{id:'seed',title:'Audit song',artist:'Audit artist',platform:'youtube',url:'https://www.youtube.com/watch?v=F_vGz8BqApw',createdBy:'3zab'}],
  loveReasons: [{id:'seed',text:'Audit reason',note:'Audit note',author:'3zab'}],
  letters: [{id:'seed',title:'Audit letter',message:'Audit message',author:'3zab',recipient:'Nouna'}],
  openWhen: [{id:'seed',title:'Audit envelope',category:'Missing you',message:'Audit message',author:'3zab'}],
  things21: [{id:'seed',title:'Audit item',description:'Audit description',number:1}],
  favorites: [{id:'seed',author:'3zab',category:'Coffee',item:'Audit favorite',icon:'coffee',color:'teal'}],
  futureDreams: [{id:'seed',title:'Audit dream',completed:false,createdBy:'3zab'}],
  countdowns: [{id:'seed',title:'Audit countdown',targetDate:'2027-09-04T00:00',icon:'heart'}],
  messages: [{id:'seed',text:'Audit chat',sender:'3zab'}],
  notifications: [{id:'seed',type:'memory',message:'Audit notification',isRead:false,linkId:'seed'}],
  moods: [],
};
const data = Object.fromEntries(Object.entries(seed).map(([name, records]) => [name, records.map(record => ({createdAt:Date.now(), ...record}))]));
const listeners = new Map(); let room = {reconciled:false,updatedAt:0}; let roomCallback; let serial=0;
window.__audit = {data, operations:[],failNext:false};
function emit(name) { for(const callback of listeners.get(name)||[]) callback(structuredClone(data[name]||[])); }
function operation(op,name,id,value) {
  if(window.__audit.failNext){window.__audit.failNext=false;window.dispatchEvent(new CustomEvent('ocean-write-error',{detail:'Test save rejected'}));throw Error('Test save rejected');}
  window.__audit.operations.push({op,name,id,value});
}
export function reportSync(){}
export function subscribeCollection(name, unused, callback){const list=listeners.get(name)||new Set();list.add(callback);listeners.set(name,list);setTimeout(()=>emit(name),0);return()=>list.delete(callback);}
export async function addItem(name,value){const id='audit-'+(++serial);operation('add',name,id,value);(data[name]||=[]).unshift({...value,id,createdAt:Date.now()});emit(name);return id;}
export async function updateItem(name,id,value){operation('update',name,id,value);data[name]=data[name].map(item=>item.id===id?{...item,...value}:item);emit(name);}
export async function removeItem(name,id){operation('delete',name,id);data[name]=data[name].filter(item=>item.id!==id);emit(name);}
export const subscribeMoods=callback=>subscribeCollection('moods',[],callback);
export async function saveMood(value){operation('set','moods',value.identity,value);data.moods=[value];emit('moods');}
export function subscribePeaceRoom(callback){roomCallback=callback;setTimeout(()=>callback(room),0);return()=>{};}
export async function savePeaceRoom(value){operation('set','peaceRoom','currentSession',value);room=value;roomCallback?.(room);}
export const addNotification=value=>addItem('notifications',value);
export const removeNotification=id=>removeItem('notifications',id);
export const markNotificationRead=id=>updateItem('notifications',id,{isRead:true});
