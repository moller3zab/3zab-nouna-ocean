const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createProtocol, MEMBERS, prefs, hash, subscription } = require('./device-protocol');
const { classify, makeActivity, recipientFor } = require('./activity');
const { deliver } = require('./delivery');
function device(endpoint = 'one') {
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  return { ecdh, subscription: { endpoint: 'https://fcm.googleapis.com/fcm/send/' + endpoint, keys: { p256dh: ecdh.getPublicKey().toString('base64url'), auth: crypto.randomBytes(16).toString('base64url') } } };
}
function setup() {
  const db = new Map(), sent = []; let time = 1000000; let queue = Promise.resolve();
  const store = { read: async key => structuredClone(db.get(key)), mutate: (key, fn) => {
    const pending = queue.catch(() => {}).then(() => { const next = fn(structuredClone(db.get(key))); if (next) db.set(key, structuredClone(next)); });
    queue = pending; return pending;
  } };
  const protocol = createProtocol({ store, now: () => time, send: async (sub, payload) => sent.push({ sub, payload }) });
  return { protocol, store, db, sent, advance: ms => { time += ms; }, now: () => time };
}
async function enroll(s, uid, sub) {
  const pending = await s.protocol.begin(uid, sub);
  const challenge = s.sent.at(-1).payload;
  return s.protocol.confirm(uid, pending.deviceId, challenge.nonce, pending.challengeId);
}
test('ownership nonce is push-only; unauthorized calls and UID impersonation cannot confirm', async () => {
  const s = setup(), sub = device().subscription;
  await assert.rejects(s.protocol.begin('attacker', sub), /Unauthorized/);
  const pending = await s.protocol.begin(MEMBERS[0], sub), received = s.sent[0].payload;
  assert.equal(pending.nonce, undefined); assert.equal(JSON.stringify([...s.db.values()]).includes(received.nonce), false);
  await assert.rejects(s.protocol.confirm(MEMBERS[1], pending.deviceId, received.nonce, pending.challengeId), /Invalid/);
  await assert.rejects(s.protocol.confirm(MEMBERS[0], pending.deviceId, 'guess', pending.challengeId), /Invalid/);
  const verified = await s.protocol.confirm(MEMBERS[0], pending.deviceId, received.nonce, pending.challengeId);
  assert.equal((await s.store.read('devices/' + verified.deviceId)).uid, MEMBERS[0]);
  await assert.rejects(s.protocol.confirm(MEMBERS[0], pending.deviceId, received.nonce, pending.challengeId), /Invalid/);
});
test('expired challenges and stolen subscription descriptors do not create verified devices', async () => {
  const s = setup(), sub = device().subscription;
  const pending = await s.protocol.begin(MEMBERS[0], sub), challenge = s.sent[0].payload;
  s.advance(300001);
  await assert.rejects(s.protocol.confirm(MEMBERS[0], pending.deviceId, challenge.nonce, pending.challengeId), /expired/);
  assert.notEqual((await s.store.read('devices/' + pending.deviceId)).verified, true);
  const verified = await enroll(s, MEMBERS[0], sub);
  await assert.rejects(s.protocol.begin(MEMBERS[1], sub), /another account/);
  await assert.rejects(s.protocol.update(MEMBERS[1], verified.deviceId, verified.binding, prefs()), /Unauthorized/);
});
test('logout revokes only one of multiple devices and cannot reactivate it by replay', async () => {
  const s = setup();
  const one = await enroll(s, MEMBERS[0], device('one').subscription), two = await enroll(s, MEMBERS[0], device('two').subscription);
  await s.protocol.update(MEMBERS[0], one.deviceId, one.binding, prefs(), true);
  await s.protocol.update(MEMBERS[0], one.deviceId, one.binding, prefs());
  assert.equal((await s.store.read('devices/' + one.deviceId)).active, false);
  assert.equal((await s.store.read('devices/' + two.deviceId)).active, true);
});
test('SSRF, malformed keys and invalid curve points are rejected before sending', () => {
  const valid = device().subscription;
  for (const endpoint of ['http://fcm.googleapis.com/fcm/send/a', 'https://127.0.0.1/a', 'https://fcm.googleapis.com.evil.test/a', 'https://user@fcm.googleapis.com/a', 'https://fcm.googleapis.com:444/a']) assert.throws(() => subscription({ ...valid, endpoint }));
  assert.throws(() => subscription({ ...valid, keys: { ...valid.keys, p256dh: Buffer.alloc(65).toString('base64url') } }));
});
test('Web Push payload is encrypted for the actual device key; copied public subscription cannot decrypt it', () => {
  const webpush = require('web-push'), ece = require('http_ece');
  const actual = device(), wrong = device(), vapid = webpush.generateVAPIDKeys();
  const details = webpush.generateRequestDetails(actual.subscription, 'private challenge nonce', { vapidDetails: { subject: 'mailto:test@example.com', ...vapid } });
  assert.equal(details.body.includes(Buffer.from('private challenge nonce')), false);
  const plain = ece.decrypt(details.body, { version: 'aes128gcm', privateKey: actual.ecdh, authSecret: actual.subscription.keys.auth });
  assert.equal(plain.toString(), 'private challenge nonce');
  assert.throws(() => ece.decrypt(details.body, { version: 'aes128gcm', privateKey: wrong.ecdh, authSecret: actual.subscription.keys.auth }));
});
const baseDevice = { uid: MEMBERS[1], active: true, verified: true, verifiedUntil: Date.now() + 100000, binding: 'binding', preferences: prefs({ previews: true }) };
const activityArgs = { collection: 'messages', data: { sender: 'Nouna', text: 'I love you 💙' }, uid: MEMBERS[0], name: 'Nouna', device: baseDevice, eventId: 'event', previewsEnabled: true };
test('actual text preview, display name and English activity descriptions; no media URLs', () => {
  const text = makeActivity(activityArgs); assert.equal(text.preview, 'I love you 💙'); assert.equal(text.title, 'Nouna ❤️');
  const photo = makeActivity({ ...activityArgs, data: { sender: 'Nouna', imageUrl: 'https://private.test/photo', text: 'caption' } });
  assert.match(photo.body, /sent you a photo in chat/); assert.equal(photo.preview, ''); assert.equal(JSON.stringify(photo).includes('private.test'), false);
  const video = makeActivity({ ...activityArgs, collection: 'memories', data: { title: 'Us', videoUrl: 'https://private.test/video', caption: 'Sweet day' } });
  assert.match(video.body, /video memory/); assert.equal(video.url, '/#memories');
});
test('private previews require verified recipient, enabled server gate and device opt-in', () => {
  for (const patch of [{ active: false }, { verified: false }, { uid: MEMBERS[0] }, { verifiedUntil: 0 }]) assert.equal(makeActivity({ ...activityArgs, device: { ...baseDevice, ...patch } }), null);
  assert.equal(makeActivity({ ...activityArgs, previewsEnabled: false }).preview, '');
  assert.equal(makeActivity({ ...activityArgs, device: { ...baseDevice, preferences: prefs() } }).preview, '');
  assert.equal(makeActivity({ ...activityArgs, device: { ...baseDevice, preferences: prefs({ chat: false }) } }), null);
});
test('letters use a validated real UID mapping; self-addressed or ambiguous letters never route', () => {
  const letter = { recipient: 'Nouna', message: 'A real letter' };
  assert.equal(recipientFor(MEMBERS[0], 'letters', letter), null);
  const map = { [MEMBERS[0]]: '3zab', [MEMBERS[1]]: 'Nouna' };
  assert.equal(recipientFor(MEMBERS[0], 'letters', letter, map), MEMBERS[1]);
  assert.equal(recipientFor(MEMBERS[0], 'letters', { recipient: '3zab' }, map), null);
  const result = makeActivity({ ...activityArgs, collection: 'letters', data: letter, identityMap: map });
  assert.equal(result.preview, letter.message); assert.equal(result.url, '/#letters');
});
test('saved events are distinguished from edits, local playlist metadata, hidden songs and notification mirrors', () => {
  assert.equal(classify('notifications', { type: 'chat' }), null);
  assert.equal(classify('messages', activityArgs.data, activityArgs.data), null);
  assert.equal(classify('songs', { title: 'Song', hidden: true }), null);
  assert.match(classify('songs', { title: 'Song' }).action, /saved a song/);
  assert.equal(classify('songs', { title: 'Song' }, { title: 'Song' }), null);
  assert.match(classify('songs', { title: 'New title' }, { title: 'Old title' }).action, /updated/);
  assert.equal(classify('memories', {}), null);
});
test('duplicate events are claimed once; expired endpoints revoke; transient errors allow retries', async () => {
  const s = setup(), registered = await enroll(s, MEMBERS[1], device().subscription);
  await s.protocol.update(MEMBERS[1], registered.deviceId, registered.binding, prefs({ previews: true }));
  const record = await s.store.read('devices/' + registered.deviceId);
  const payload = makeActivity({ ...activityArgs, device: record, now: s.now() }); let count = 0;
  const options = { store: s.store, deviceId: registered.deviceId, payload, now: s.now, send: async () => { count++; } };
  await Promise.all([deliver(options), deliver(options)]); assert.equal(count, 1);
  await deliver({ ...options, payload: { ...payload, eventId: 'expired' }, send: async () => { throw { statusCode: 410 }; } });
  assert.equal((await s.store.read('devices/' + registered.deviceId)).active, false);
  const renewed = await enroll(s, MEMBERS[1], device('renewed').subscription);
  const next = { ...options, deviceId: renewed.deviceId, payload: { ...payload, binding: renewed.binding, eventId: 'retry' } };
  await assert.rejects(deliver({ ...next, send: async () => { throw { statusCode: 503 }; } }));
  await deliver(next); assert.equal(count, 2);
});
test('delivery rechecks revocation, category and preview choices immediately before send', async () => {
  const s = setup(), registered = await enroll(s, MEMBERS[1], device().subscription);
  let count = 0; const payload = { ...makeActivity(activityArgs), binding: registered.binding };
  await deliver({ store: s.store, deviceId: registered.deviceId, payload, now: s.now, send: async (_, data) => { count++; assert.equal(data.preview, ''); } });
  await s.protocol.update(MEMBERS[1], registered.deviceId, registered.binding, prefs(), true);
  await deliver({ store: s.store, deviceId: registered.deviceId, payload: { ...payload, eventId: 'after-logout' }, now: s.now, send: async () => count++ });
  assert.equal(count, 1);
});

test('all supported saved collection types have valid English actions and exact section links', () => {
  const records = {
    memories: { title: 'Us', caption: 'Our day', imageUrl: 'data:image/jpeg;base64,private' },
    polaroids: { imageUrl: 'data:image/jpeg;base64,private', note: 'Us' },
    songs: { title: 'Our song' }, milestones: { title: 'Our first day' },
    loveReasons: { text: 'Your smile' }, openWhen: { message: 'Read this later' },
    things21: { title: 'Our walks' }, favorites: { item: 'Coffee' },
    futureDreams: { title: 'Travel' }, countdowns: { title: 'Our day', targetDate: '2027-01-01' },
  };
  for (const [collection, data] of Object.entries(records)) {
    const result = makeActivity({ ...activityArgs, collection, data });
    assert.ok(result, collection); assert.match(result.url, /^\/#/); assert.match(result.body, /Nouna/);
    assert.equal(JSON.stringify(result).includes('base64,private'), false);
  }
  for (const collection of ['notifications', 'moods', 'peaceRoom', 'settings', 'unknown']) assert.equal(classify(collection, { text: 'Anything' }), null);
});
