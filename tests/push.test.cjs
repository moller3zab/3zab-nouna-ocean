const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { IDBFactory } = require('fake-indexeddb');
function worker() {
  const handlers = {}, notifications = [], messages = [];
  const self = { location: { origin: 'https://ahmedwanfal.web.app' }, addEventListener: (type, fn) => { handlers[type] = fn; }, skipWaiting() {},
    clients: { claim() {}, matchAll: async () => [], openWindow: async url => messages.push(url) },
    registration: { showNotification: async (title, options) => notifications.push({ title, ...options }) },
  };
  vm.runInNewContext(fs.readFileSync('public/push/webpush/worker.js', 'utf8'), { self, indexedDB: new IDBFactory(), URL, Date, console });
  async function emit(type, data) { let pending; handlers[type]({ data: { json: () => data }, waitUntil: value => { pending = value; } }); await pending; }
  async function message(data) {
    let pending, result;
    handlers.message({ source: { url: self.location.origin + '/' }, data, ports: [{ postMessage: value => { result = value; } }], waitUntil: value => { pending = value; } });
    await pending; if (result.error) throw new Error(result.error); return result.result;
  }
  return { notifications, messages, emit, message, handlers };
}
const payload = { kind: 'activity', expires: Date.now() + 90000, uid: 'member', binding: 'verified-binding', eventId: 'event', group: 'chat', title: 'Nouna ❤️', body: 'Nouna ❤️ — sent you a message', preview: 'Actual message text', url: '/#our-chat' };
async function ready(w, preview = false) {
  await w.message({ type: 'session', uid: 'member' });
  await w.message({ type: 'verified', uid: 'member', deviceId: 'device', binding: 'verified-binding' });
  await w.message({ type: 'preferences', uid: 'member', preferences: { previews: preview, chat: true, memories: true, other: true } });
}
test('receiving device stores push-only challenge and shows an English verification notification', async () => {
  const w = worker(); const challenge = { kind: 'verify', uid: 'member', nonce: 'push-only', challengeId: 'id', expires: Date.now() + 300000 };
  await w.emit('push', challenge); const state = await w.message({ type: 'get' });
  assert.equal(state.challenge.nonce, 'push-only'); assert.equal(w.notifications[0].title, 'Confirm Sanctuary notifications');
});
test('worker refuses unverified, wrong-account, wrong-binding or logged-out private deliveries', async () => {
  const w = worker(); await w.emit('push', payload); assert.equal(w.notifications.length, 0);
  await ready(w, true);
  await w.emit('push', { ...payload, uid: 'other' }); await w.emit('push', { ...payload, binding: 'old' });
  assert.equal(w.notifications.length, 0);
  await w.message({ type: 'session', uid: null }); await w.emit('push', payload);
  assert.equal(w.notifications.length, 0);
});
test('hide-preview preference is enforced on device, including already queued private payloads', async () => {
  const w = worker(); await ready(w); await w.emit('push', payload);
  assert.equal(w.notifications[0].body, payload.body);
  await w.message({ type: 'preferences', uid: 'member', preferences: { previews: true, chat: true } });
  await w.emit('push', { ...payload, eventId: 'second' }); assert.equal(w.notifications[1].body, payload.preview);
});
test('concurrent duplicate events display once using a durable IndexedDB transaction', async () => {
  const w = worker(); await ready(w, true); await Promise.all([w.emit('push', payload), w.emit('push', payload)]);
  assert.equal(w.notifications.length, 1); await w.emit('push', payload); assert.equal(w.notifications.length, 1);
});
test('multiple devices keep independent sessions and account switching suppresses previous content', async () => {
  const one = worker(), two = worker(); await ready(one, true); await ready(two, true);
  await one.message({ type: 'session', uid: 'another-account' });
  await one.emit('push', payload); await two.emit('push', payload);
  assert.equal(one.notifications.length, 0); assert.equal(two.notifications.length, 1);
});
test('chat photo respects both category choices, and untrusted external click URLs are rejected', async () => {
  const w = worker(); await ready(w, true);
  await w.message({ type: 'preferences', uid: 'member', preferences: { chat: true, memories: false } });
  await w.emit('push', { ...payload, secondaryGroup: 'memories' }); assert.equal(w.notifications.length, 0);
  await w.emit('push', { ...payload, url: 'https://attacker.test/#our-chat' }); assert.equal(w.notifications.length, 0);
});
test('memory deep link selects the actual gallery or wall', async () => {
  const w = worker(); await ready(w); await w.emit('push', { ...payload, url: '/#memories', view: 'gallery' });
  assert.equal(w.notifications[0].data.url, '/?pushView=gallery#memories');
});

test('paused sessions and expired private payloads never display', async () => {
  const w = worker(); await ready(w, true);
  await w.emit('push', { ...payload, expires: Date.now() - 1 }); assert.equal(w.notifications.length, 0);
  await w.message({ type: 'suspend' }); await w.emit('push', payload); assert.equal(w.notifications.length, 0);
});
