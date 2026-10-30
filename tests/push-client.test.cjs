const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const ts = require('typescript');
function setup() {
  let session = {}, challenge; const calls = [], auth = { currentUser: { uid: 'one' } }; let fail = false, unsubscribed = false;
  class MessageChannel {
    constructor() { this.port1 = { close() {} }; this.port2 = { postMessage: data => queueMicrotask(() => this.port1.onmessage({ data })) }; }
  }
  const worker = { state: 'activated', postMessage(data, [port]) {
    calls.push(data.type); let result;
    if (data.type === 'get') result = { session, challenge };
    if (data.type === 'session') session = session.uid === data.uid ? { ...session } : { uid: data.uid, preferences: { previews: false } };
    if (data.type === 'suspend') session = { ...session, paused: true };
    if (data.type === 'verified') { session = { ...session, ...data, paused: false }; challenge = null; }
    if (data.type === 'preferences') session = { ...session, preferences: data.preferences };
    port.postMessage({ result });
  } };
  const sub = { toJSON: () => ({ endpoint: 'endpoint' }), unsubscribe: async () => { calls.push('unsubscribe'); unsubscribed = true; return true; } };
  const reg = { active: worker, pushManager: { getSubscription: async () => unsubscribed ? null : sub, subscribe: async () => { unsubscribed = false; return sub; } } };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync('src/lib/push.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, {
    module, exports: module.exports, MessageChannel, setTimeout, clearTimeout, Uint8Array, atob,
    window: { PushManager: {} }, navigator: { serviceWorker: { register: async () => reg } },
    require(name) {
      if (name === 'firebase/auth') return { getAuth: () => auth };
      if (name === './pushApi') return { pushRequest: async (name, data) => {
        calls.push(name);
        if (name === 'getWebPushConfig') return { publicKey: 'YWJj', enabled: true, previewsEnabled: false };
        if (name === 'updateWebPush' && fail) throw new Error('offline');
        if (name === 'beginWebPush') return { deviceId: 'id', challengeId: 'challenge' };
        if (name === 'confirmWebPush') return { deviceId: 'id', binding: 'binding' };
        return {};
      } };
      return {};
    },
  });
  return { api: module.exports, calls, auth, session: () => session, setSession: value => { session = value; }, challenge: value => { challenge = value; }, fail: value => { fail = value; } };
}
test('logout suspends private display before server revocation and unsubscribing', async () => {
  const s = setup(); s.setSession({ uid: 'one', deviceId: 'id', binding: 'binding', preferences: { previews: true } });
  await s.api.syncPushIdentity(null);
  assert.ok(s.calls.indexOf('suspend') < s.calls.indexOf('updateWebPush'));
  assert.ok(s.calls.indexOf('updateWebPush') < s.calls.indexOf('unsubscribe'));
  assert.equal(s.session().uid, null);
});
test('offline logout fails closed, retains retry state, and can revoke on retry', async () => {
  const s = setup(); s.setSession({ uid: 'one', deviceId: 'id', binding: 'binding' }); s.fail(true);
  await assert.rejects(s.api.syncPushIdentity(null), /offline/);
  assert.equal(s.session().paused, true); assert.equal(s.session().binding, 'binding');
  s.fail(false); await s.api.syncPushIdentity(null); assert.equal(s.session().uid, null);
});
test('client refuses wrong-account challenges and cannot enroll as another UID', async () => {
  const s = setup(); await s.api.syncPushIdentity('one');
  await assert.rejects(s.api.enablePush('victim', Promise.resolve('granted'), { previews: true }), /changed/);
  s.challenge({ uid: 'victim', nonce: 'nonce', expires: Date.now() + 10000 });
  await assert.rejects(s.api.confirmPush('one', { previews: true }), /Waiting/);
  assert.equal(s.calls.includes('confirmWebPush'), false);
});
