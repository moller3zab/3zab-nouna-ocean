import { MEMBERS } from './core';
export function clean(value: unknown, limit = 110) {
  if (typeof value !== 'string') return '';
  return [...value.replace(/<[^>]*>/g, '').replace(/(?:https?:\/\/|data:|blob:)\S+/gi, '[link]').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()].slice(0, limit).join('');
}
export const sections: Record<string,string> = { messages: 'our-chat', memories: 'memories', polaroids: 'memories', letters: 'letters', songs: 'soundtrack', milestones: 'our-story', loveReasons: 'why-i-love-you', openWhen: 'open-when', things21: 'things-21', favorites: 'favorites', futureDreams: 'our-future', countdowns: 'countdowns' };
export function classify(collection: string, data: Record<string, any>, before?: Record<string, any>) {
  if (!data || !sections[collection]) return null;
  if (collection === 'songs' && data.hidden === true) return null;
  if (before && collection !== 'songs') return null; // Other collections: creates only.
  switch (collection) {
    case 'messages':
      if (!['3zab', 'Nouna'].includes(data.sender)) return null;
      if (data._media === 'video') return { group: 'photos', secondaryGroup: 'chat', action: 'shared a new video in chat', emoji: '🎬', preview: '' };
      if (data._media === 'photo') return { group: 'photos', secondaryGroup: 'chat', action: 'sent you a photo in chat', emoji: '📸', preview: '' };
      if (!clean(data.text)) return null;
      return { group: 'chat', action: 'sent you a message', emoji: '❤️', preview: clean(data.text) };
    case 'memories': if (!(data._media === 'photo' || data._media === 'video') || !clean(data.title || data.caption)) return null; return { group: 'memories', action: data._media === 'video' ? 'added a video memory' : 'added a new memory', emoji: data._media === 'video' ? '🎬' : '❤️', preview: clean(data.caption || data.title) };
    case 'polaroids': if (data._media !== 'photo') return null; return { group: 'photos', action: 'added a photo to our Polaroid Wall', emoji: '📸', preview: clean(data.note) };
    case 'letters': if (!clean(data.message) || !['3zab', 'Nouna'].includes(data.recipient)) return null; return { group: 'letters', action: 'sent you a new letter', emoji: '💌', preview: clean(data.message) };
    case 'songs': {
      if (!clean(data.title)) return null;
      const restored = before?.hidden === true;
      if (before && !restored && before.title === data.title && before.artist === data.artist && before.note === data.note) return null;
      return { group: 'songs', action: restored ? 'added a song back to our playlist' : before ? 'updated a song in our playlist' : 'saved a song to our playlist', emoji: '🎵', preview: clean(data.title) };
    }
    case 'milestones': if (!clean(data.title)) return null; return { group: 'other', action: 'added a new milestone', emoji: '✨', preview: clean(data.title) };
    case 'loveReasons': if (!clean(data.text)) return null; return { group: 'other', action: 'added a new reason to love you', emoji: '❤️', preview: clean(data.text) };
    case 'openWhen': if (!clean(data.message)) return null; return { group: 'other', action: 'added a new Open When note', emoji: '💌', preview: '' };
    case 'things21': if (!clean(data.title)) return null; return { group: 'other', action: 'added a new little thing about us', emoji: '❤️', preview: clean(data.title) };
    case 'favorites': if (!clean(data.item)) return null; return { group: 'other', action: 'added a new favorite', emoji: '⭐', preview: clean(data.item) };
    case 'futureDreams': if (!clean(data.title)) return null; return { group: 'other', action: 'added a new dream for our future', emoji: '✨', preview: clean(data.title) };
    case 'countdowns': if (!clean(data.title) || !data.targetDate) return null; return { group: 'other', action: 'added a new countdown', emoji: '🗓️', preview: clean(data.title) };
    default: return null;
  }
}
export function recipientFor(uid: string, collection: string, data: Record<string, any>, identityMap: Record<string,string> = {}) {
  if (!MEMBERS.includes(uid)) return null;
  const other = MEMBERS.find(id => id !== uid)!;
  if (collection === 'letters') {
    // Persona is editable in the UI. Require an administrator-confirmed UID mapping.
    if (new Set(MEMBERS.map(id => identityMap[id])).size !== 2 || !MEMBERS.every(id => ['3zab', 'Nouna'].includes(identityMap[id]))) return null;
    if (data.recipient !== identityMap[other]) return null;
  }
  return other;
}

export function makePayload(event: {data:Record<string,any>;uid:string;id:string;created:boolean}, collection:string, name:string, device:import('./core').Device, previewsEnabled:boolean, identityMap:Record<string,string>) {
 const data=event.data;
 const activity=classify(collection,data,event.created?undefined:collection==='songs'?{hidden:false}:data);
 if(!activity||!event.created&&collection!=='songs'||recipientFor(event.uid,collection,data,identityMap)!==device.uid||!device.active||device.verified_until<=Date.now())return null;
 const prefs=JSON.parse(device.prefs) as Record<string,boolean>;
 if(!prefs[activity.group]||activity.secondaryGroup&&!prefs[activity.secondaryGroup])return null;
 const sender=clean(name,45)||'Your partner';
 return {kind:'activity',uid:device.uid,binding:device.binding,eventId:event.id,group:activity.group,secondaryGroup:activity.secondaryGroup||'',expires:Math.min(Date.now()+90000,device.verified_until),title:`${sender} ${activity.emoji}`,body:`${sender} ${activity.emoji} — ${activity.action}`,preview:previewsEnabled&&prefs.previews?activity.preview:'',url:'/#'+sections[collection],view:collection==='memories'?'gallery':collection==='polaroids'?'wall':''};
}
