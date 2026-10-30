const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { MEMBERS } = require('./device-protocol');
function setup(enabled = true) {
  const db = new Map(), sent = []; let disabled = false, validAfter = '1970-01-01T00:00:00Z';
  const ref = path => ({ path, get: async () => ({ data: () => db.get(path) }) });
  const privateDb = { doc: ref,
    runTransaction: async fn => fn({ get: async r => ({ data: () => db.get(r.path) }), set: (r, data) => db.set(r.path, data) }),
    collection: collection => ({ where: (_, __, uid) => ({ get: async () => ({ docs: [...db].filter(([path, data]) => path.startsWith(collection + '/') && data.uid === uid).map(([path, data]) => ({ id: path.split('/')[1], data: () => data })) }) }) }),
  };
  const module = { exports: {} };
  vm.runInNewContext(fs.readFileSync(__dirname + '/index.js', 'utf8'), { module, exports: module.exports, Date,
    require(name) {
      if (name === 'firebase-admin/app') return { initializeApp: () => ({}) };
      if (name === 'firebase-admin/auth') return { getAuth: () => ({ getUser: async () => ({ displayName: 'Nouna', disabled, tokensValidAfterTime: validAfter }) }) };
      if (name === 'firebase-admin/firestore') return { getFirestore: (_, database) => { assert.equal(database, 'ocean-push-private'); return privateDb; } };
      if (name.endsWith('/https')) return { onCall: (_, fn) => fn, HttpsError: class extends Error { constructor(code, message) { super(message); this.code = code; } } };
      if (name.endsWith('/firestore')) return { onDocumentWrittenWithAuthContext: (_, fn) => fn };
      if (name.endsWith('/params')) return { defineSecret: () => ({ value: () => JSON.stringify({ publicKey: 'public', privateKey: 'private', subject: 'mailto:test@example.com' }) }), defineBoolean: key => ({ value: () => key === 'WEB_PUSH_ENABLED' ? enabled : false }), defineString: () => ({ value: () => '{}' }) };
      if (name === 'web-push') return { sendNotification: async (sub, json) => sent.push({ sub, data: JSON.parse(json) }) };
      return require(name);
    },
  });
  return { api: module.exports, sent, db, disable: () => { disabled = true; }, revoke: () => { validAfter = '2100-01-01T00:00:00Z'; } };
}
const request = (data = {}, uid = MEMBERS[0]) => ({ auth: { uid, token: { auth_time: 10000 } }, data });
function subscription() { const key = crypto.createECDH('prime256v1'); key.generateKeys(); return { endpoint: 'https://fcm.googleapis.com/fcm/send/device', keys: { p256dh: key.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } }; }
test('actual exported callables reject anonymous, nonmember, disabled and revoked-token accounts', async () => {
  const s = setup();
  await assert.rejects(s.api.getWebPushConfig({}), /authorized/);
  await assert.rejects(s.api.getWebPushConfig(request({}, 'attacker')), /authorized/);
  s.disable(); await assert.rejects(s.api.getWebPushConfig(request()), /Sign in again/);
  const revoked = setup(); revoked.revoke(); await assert.rejects(revoked.api.getWebPushConfig(request()), /Sign in again/);
});
test('actual registration ignores forged UID and never returns challenge nonce or VAPID private key', async () => {
  const s = setup(), config = await s.api.getWebPushConfig(request());
  assert.equal(config.privateKey, undefined);
  const pending = await s.api.beginWebPush(request({ subscription: subscription(), uid: MEMBERS[1] }));
  assert.equal(pending.nonce, undefined); assert.equal(s.sent[0].data.uid, MEMBERS[0]);
  const proof = { ...pending, nonce: s.sent[0].data.nonce };
  await assert.rejects(s.api.confirmWebPush(request(proof, MEMBERS[1])));
  const confirmed = await s.api.confirmWebPush(request(proof)); assert.equal(confirmed.deviceId, pending.deviceId);
});
test('default-off dispatch gate prevents verification enrollment and activity sends', async () => {
  const s = setup(false); await assert.rejects(s.api.beginWebPush(request({ subscription: subscription() })));
  await s.api.notify_messages({ authId: MEMBERS[0] }); assert.equal(s.sent.length, 0);
});

test('exported activity trigger reads only verified private registry devices and honors recipient revocation', async () => {
  const s = setup(true), now = Date.now();
  s.db.set('devices/actual-device', { uid: MEMBERS[1], active: true, verified: true, verifiedAt: now,
    verifiedUntil: now + 100000, binding: 'binding', preferences: { chat: true, previews: true }, subscription: subscription() });
  const event = { authId: MEMBERS[0], id: 'event-one', params: { recordId: 'record' }, data: {
    after: { exists: true, data: () => ({ sender: 'Nouna', text: 'Private message' }) }, before: { exists: false },
  } };
  await s.api.notify_messages(event);
  assert.equal(s.sent.length, 1); assert.equal(s.sent[0].data.preview, '');
  await s.api.notify_messages(event); assert.equal(s.sent.length, 1);
  s.revoke(); await s.api.notify_messages({ ...event, id: 'after-revocation' }); assert.equal(s.sent.length, 1);
});
