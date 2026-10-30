const { createHash, randomBytes, timingSafeEqual, ECDH } = require('node:crypto');
const MEMBERS = ['EJ9SoDzXCLgHBgXglBU703ZOcXH2', 'NJRJQyKj7JbSVBQeAYbKUOm8vcY2'];
const hash = value => createHash('sha256').update(value).digest('hex');
const DEFAULTS = { previews: false, chat: true, memories: true, other: true };
function prefs(value = {}) {
  return Object.fromEntries(Object.entries(DEFAULTS).map(([k, fallback]) => [k, typeof value[k] === 'boolean' ? value[k] : fallback]));
}
function member(uid) { if (!MEMBERS.includes(uid)) throw new Error('Unauthorized account'); }
function subscription(value) {
  if (!value || typeof value.endpoint !== 'string' || value.endpoint.length > 2048) throw new Error('Invalid subscription');
  const url = new URL(value.endpoint);
  const allowed = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || url.pathname === '/' || !allowed.includes(url.hostname)) throw new Error('Unsupported push endpoint');
  const p256dh = value.keys?.p256dh, auth = value.keys?.auth;
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || !/^[\w-]+$/.test(p256dh) || !/^[\w-]+$/.test(auth)) throw new Error('Invalid subscription keys');
  const pub = Buffer.from(p256dh, 'base64url');
  if (pub.length !== 65 || Buffer.from(auth, 'base64url').length !== 16) throw new Error('Invalid subscription keys');
  ECDH.convertKey(pub, 'prime256v1'); // Reject invalid curve points.
  return { endpoint: value.endpoint, keys: { p256dh, auth } };
}
function sameHash(value, digest) { return typeof value === 'string' && value.length <= 200 && typeof digest === 'string' && timingSafeEqual(Buffer.from(hash(value), 'hex'), Buffer.from(digest, 'hex')); }
function createProtocol({ store, send, now = Date.now, random = () => randomBytes(32).toString('base64url') }) {
  return {
    async begin(uid, raw) {
      member(uid); const sub = subscription(raw); const id = hash(sub.endpoint);
      const nonce = random(), challengeId = random();
      await store.mutate('devices/' + id, old => {
        if (old?.active && old.uid !== uid) throw new Error('Device belongs to another account; sign out first');
        if (old?.pending && old.pending.expires > now()) throw new Error('A verification is pending; wait five minutes before retrying');
        return { ...(old || {}), uid: old?.uid || uid, pending: { uid, subscription: sub, digest: hash(nonce), challengeId, expires: now() + 300000 }, updatedAt: now() };
      });
      // No nonce in the callable result. Only the endpoint receiving encrypted push sees it.
      try {
        await send(sub, { kind: 'verify', deviceId: id, challengeId, nonce, uid, expires: now() + 300000 });
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) await store.mutate('devices/' + id, old => ({ ...old, active: false, pending: null }));
        throw new Error('Device verification push failed');
      }
      return { deviceId: id, challengeId };
    },
    async confirm(uid, id, nonce, challengeId) {
      member(uid); if (!/^[a-f0-9]{64}$/.test(id || '')) throw new Error('Invalid device');
      await store.mutate('devices/' + id, old => {
        const pending = old?.pending;
        if (!pending || pending.uid !== uid || pending.challengeId !== challengeId || pending.expires <= now() || !sameHash(nonce, pending.digest)) throw new Error('Invalid or expired device challenge');
        if (old?.active && old.uid !== uid) throw new Error('Device belongs to another account');
        return { uid, subscription: pending.subscription, active: true, verified: true, binding: challengeId, preferences: prefs(old?.uid === uid ? old.preferences : {}), verifiedAt: now(), verifiedUntil: now() + 30 * 86400000, updatedAt: now() };
      });
      return { deviceId: id, binding: challengeId };
    },
    async update(uid, id, binding, preferences, revoke = false) {
      member(uid); if (!/^[a-f0-9]{64}$/.test(id || '')) throw new Error('Invalid device');
      await store.mutate('devices/' + id, old => {
        if (!old || old.uid !== uid || old.binding !== binding || !old.verified) throw new Error('Unauthorized subscription');
        return { ...old, active: revoke ? false : old.active, preferences: prefs(preferences), pending: null, updatedAt: now() };
      });
      return { ok: true };
    },
  };
}
module.exports = { createProtocol, MEMBERS, prefs, DEFAULTS, hash, subscription };
