const { initializeApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentWrittenWithAuthContext } = require('firebase-functions/v2/firestore');
const { defineSecret, defineBoolean, defineString } = require('firebase-functions/params');
const webpush = require('web-push');
const { createProtocol, MEMBERS, hash, subscription } = require('./device-protocol');
const { sections, makeActivity } = require('./activity');
const { deliver } = require('./delivery');
const app = initializeApp();
// This named database MUST have deny-all client rules. Never use the shared app DB.
const privateDb = getFirestore(app, 'ocean-push-private');
const vapid = defineSecret('WEB_PUSH_VAPID_JSON');
const enabled = defineBoolean('WEB_PUSH_ENABLED', { default: false });
const previews = defineBoolean('WEB_PUSH_PREVIEWS_ENABLED', { default: false });
const identities = defineString('PUSH_IDENTITY_MAP', { default: '{}' });
const store = {
  async read(path) { return (await privateDb.doc(path).get()).data(); },
  async mutate(path, fn) {
    return privateDb.runTransaction(async tx => {
      const ref = privateDb.doc(path); const old = (await tx.get(ref)).data(); const next = fn(old);
      if (next) tx.set(ref, next);
    });
  },
};
function keys() {
  const parsed = JSON.parse(vapid.value());
  if (!parsed.publicKey || !parsed.privateKey || !/^mailto:[^\s@]+@[^\s@]+$/.test(parsed.subject || '')) throw new Error('Configure VAPID keys and a contact email');
  return parsed;
}
async function send(subscription, payload) {
  return webpush.sendNotification(subscription, JSON.stringify(payload), {
    vapidDetails: keys(), TTL: payload.kind === 'verify' ? 300 : 90, timeout: 10000,
    ...(payload.eventId ? { topic: hash(payload.eventId).slice(0, 32) } : {}),
  });
}
const protocol = createProtocol({ store, send });
function callable(fn) {
  return onCall({ region: 'us-central1', secrets: [vapid], cors: ['https://ahmedwanfal.web.app'], maxInstances: 2 }, async request => {
    const uid = request.auth?.uid;
    if (!MEMBERS.includes(uid)) throw new HttpsError('permission-denied', 'Sign in with an authorized account.');
    const user = await getAuth().getUser(uid);
    if (user.disabled || !Number.isFinite(Number(request.auth.token.auth_time)) || Date.parse(user.tokensValidAfterTime || '') > Number(request.auth.token.auth_time) * 1000) throw new HttpsError('unauthenticated', 'Sign in again.');
    try { return await fn(uid, request.data || {}); }
    catch { throw new HttpsError('failed-precondition', 'Notification verification failed or expired. Check settings and try again.'); }
  });
}
exports.getWebPushConfig = callable(async () => ({ publicKey: keys().publicKey, enabled: enabled.value(), previewsEnabled: previews.value() }));
exports.beginWebPush = callable(async (uid, data) => {
  if (!enabled.value()) throw new Error('Push not enabled');
  const normalized = subscription(data.subscription);
  const existing = await store.read('devices/' + hash(normalized.endpoint));
  const devices = await privateDb.collection('devices').where('uid', '==', uid).get();
  const occupied = devices.docs.filter(doc => doc.data().active || doc.data().pending?.expires > Date.now());
  if (occupied.length >= 20 && existing?.uid !== uid) throw new Error('Device limit reached');
  return protocol.begin(uid, normalized);
});
exports.confirmWebPush = callable((uid, data) => protocol.confirm(uid, data.deviceId, data.nonce, data.challengeId));
exports.updateWebPush = callable((uid, data) => protocol.update(uid, data.deviceId, data.binding, data.preferences, data.revoke === true));
// Retire previous OneSignal exports. They are not used for any private delivery.
// Only approved deployment can remove previously deployed functions.
async function handleActivity(event) {
  if (!enabled.value() || !MEMBERS.includes(event.authId) || !event.data?.after.exists) return;
  const collection = event.params.collection || event.__collection;
  if (!sections[collection]) return;
  const data = event.data.after.data();
  const before = event.data.before.exists ? event.data.before.data() : undefined;
  const actor = await getAuth().getUser(event.authId);
  if (actor.disabled) return;
  const recipient = MEMBERS.find(uid => uid !== event.authId);
  const recipientAccount = await getAuth().getUser(recipient);
  if (recipientAccount.disabled) return;
  const revokedBefore = Date.parse(recipientAccount.tokensValidAfterTime || '') || 0;
  const devices = await privateDb.collection('devices').where('uid', '==', recipient).get();
  let identityMap;
  try { identityMap = JSON.parse(identities.value()); } catch { return; }
  for (const doc of devices.docs) {
    if (!doc.data().verifiedAt || doc.data().verifiedAt < revokedBefore) continue;
    const payload = makeActivity({ collection, data, before, uid: event.authId, name: actor.displayName,
      identityMap, device: doc.data(), eventId: event.id, previewsEnabled: previews.value() });
    if (payload) await deliver({ store, send, deviceId: doc.id, payload });
  }
}
// Dedicated collection paths prevent recursive notification-on-notification loops.
for (const collection of Object.keys(sections)) {
  exports['notify_' + collection] = onDocumentWrittenWithAuthContext({ document: collection + '/{recordId}',
    region: 'us-central1', secrets: [vapid], retry: true, maxInstances: 2 }, event => handleActivity({ ...event, __collection: collection }));
}
