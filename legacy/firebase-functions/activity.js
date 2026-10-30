const { MEMBERS } = require('./device-protocol');
function clean(value, limit = 110) {
  if (typeof value !== 'string') return '';
  return [...value.replace(/<[^>]*>/g, '').replace(/(?:https?:\/\/|data:|blob:)\S+/gi, '[link]').replace(/[\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g, '').replace(/\s+/g, ' ').trim()].slice(0, limit).join('');
}
const sections = { messages: 'our-chat', memories: 'memories', polaroids: 'memories', letters: 'letters', songs: 'soundtrack', milestones: 'our-story', loveReasons: 'why-i-love-you', openWhen: 'open-when', things21: 'things-21', favorites: 'favorites', futureDreams: 'our-future', countdowns: 'countdowns' };
function classify(collection, data, before) {
  if (!data || !sections[collection]) return null;
  if (collection === 'songs' && data.hidden === true) return null;
  if (before && collection !== 'songs') return null; // Other collections: creates only.
  switch (collection) {
    case 'messages':
      if (!['3zab', 'Nouna'].includes(data.sender)) return null;
      if (typeof data.imageUrl === 'string' && data.imageUrl.trim()) return { group: 'chat', secondaryGroup: 'memories', action: 'sent you a photo in chat', emoji: '📸', preview: '' };
      if (!clean(data.text)) return null;
      return { group: 'chat', action: 'sent you a message', emoji: '❤️', preview: clean(data.text) };
    case 'memories': if (!(typeof data.imageUrl === 'string' && data.imageUrl.trim() || typeof data.videoUrl === 'string' && data.videoUrl.trim()) || !clean(data.title || data.caption)) return null; return { group: 'memories', action: typeof data.videoUrl === 'string' && data.videoUrl.trim() ? 'added a video memory' : 'added a new memory', emoji: typeof data.videoUrl === 'string' && data.videoUrl.trim() ? '🎬' : '❤️', preview: clean(data.caption || data.title) };
    case 'polaroids': if (typeof data.imageUrl !== 'string' || !data.imageUrl.trim()) return null; return { group: 'memories', action: 'added a photo to our Polaroid Wall', emoji: '📸', preview: clean(data.note) };
    case 'letters': if (!clean(data.message) || !['3zab', 'Nouna'].includes(data.recipient)) return null; return { group: 'other', action: 'sent you a new letter', emoji: '💌', preview: clean(data.message) };
    case 'songs': {
      if (!clean(data.title)) return null;
      const restored = before?.hidden === true;
      if (before && !restored && before.title === data.title && before.artist === data.artist && before.note === data.note) return null;
      return { group: 'other', action: restored ? 'added a song back to our playlist' : before ? 'updated a song in our playlist' : 'saved a song to our playlist', emoji: '🎵', preview: clean(data.title) };
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
function recipientFor(uid, collection, data, identityMap = {}) {
  if (!MEMBERS.includes(uid)) return null;
  const other = MEMBERS.find(id => id !== uid);
  if (collection === 'letters') {
    // Persona is editable in the UI. Require an administrator-confirmed UID mapping.
    if (new Set(MEMBERS.map(id => identityMap[id])).size !== 2 || !MEMBERS.every(id => ['3zab', 'Nouna'].includes(identityMap[id]))) return null;
    if (data.recipient !== identityMap[other]) return null;
  }
  return other;
}
function makeActivity({ collection, data, before, uid, name, identityMap, device, eventId, previewsEnabled, now = Date.now() }) {
  const activity = classify(collection, data, before);
  const recipient = recipientFor(uid, collection, data, identityMap);
  if (!activity || !recipient || !device?.active || !device.verified || device.verifiedUntil <= now || device.uid !== recipient || !device.preferences?.[activity.group]) return null;
  if (activity.secondaryGroup && !device.preferences[activity.secondaryGroup]) return null;
  const sender = clean(name, 45) || 'Your partner';
  const generic = `${sender} ${activity.emoji} — ${activity.action}`;
  return { kind: 'activity', eventId, binding: device.binding, uid: recipient, group: activity.group, secondaryGroup: activity.secondaryGroup || '',
    expires: Math.min(now + 90000, device.verifiedUntil),
    title: `${sender} ${activity.emoji}`, body: generic,
    preview: previewsEnabled && device.preferences.previews ? activity.preview : '',
    url: '/#' + sections[collection], view: collection === 'polaroids' ? 'wall' : collection === 'memories' ? 'gallery' : '' };
}
module.exports = { classify, clean, recipientFor, makeActivity, sections };
