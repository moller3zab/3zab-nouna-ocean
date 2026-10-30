const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const subscriptions = [], events = [], writes = [];
  let fail = false;
  const api = {
    db: {}, getDoc: async()=>({data:()=>({})}), collection: (_, name) => ({ name }), doc: (parent, name, id) => name === undefined ? ({name:parent.name,id:'new-id'}) : ({ name, id }),
    onSnapshot: (ref, next, error) => { subscriptions.push({ ref, next, error }); return () => {}; },
    addDoc: async (ref, data) => { if (fail) throw { code: 'permission-denied' }; writes.push({ ref, data }); return { id: 'new-id' }; },
    setDoc: async (ref, data) => { if (fail) throw { code: 'permission-denied' }; writes.push({ ref, data }); },
    updateDoc: async (ref, data) => { if (fail) throw { code: 'permission-denied' }; writes.push({ ref, data }); },
    deleteDoc: async ref => { if (fail) throw { code: 'permission-denied' }; writes.push({ ref }); },
  };
  const code = ts.transpileModule(fs.readFileSync('src/lib/store.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name === './pushEvents' ? {preparePushEvent:()=>null,cancelPushEvent(){},flushPushEvents:async()=>{}} : api, Date, Event, CustomEvent,
    window: { dispatchEvent: event => events.push(event) },
    localStorage: new Proxy({}, { get() { throw new Error('Journal must never use localStorage'); } }),
  });
  return { store: module.exports, subscriptions, events, writes, failWrites: () => { fail = true; } };
}

test('all documents are read without filtering out missing createdAt; document IDs cannot be spoofed', () => {
  const { store, subscriptions } = setup(); let items;
  store.subscribeCollection('polaroids', [{ id: 'demo' }], value => { items = value; });
  subscriptions[0].next({ docs: [{ id: 'real-id', data: () => ({ id: 'spoof', imageUrl: 'data:image/jpeg;base64,photo' }) }] });
  assert.equal(items.length, 1); assert.equal(items[0].id, 'real-id'); assert.equal(items[0].imageUrl, 'data:image/jpeg;base64,photo');
});
test('empty snapshots clear the last item and never restore demo content', () => {
  const { store, subscriptions } = setup(); let items;
  store.subscribeCollection('memories', [{ id: 'demo' }], value => { items = value; });
  subscriptions[0].next({ docs: [] }); assert.equal(items.length, 0);
});
test('permission failures clear content and surface an explicit access error', () => {
  const { store, subscriptions, events } = setup(); let items;
  store.subscribeCollection('polaroids', [], value => { items = value; });
  subscriptions[0].error({ code: 'permission-denied' });
  assert.equal(items.length, 0); assert.equal(events.at(-1).detail.status, 'error');
  assert.match(events.at(-1).detail.message, /denied/i);
});
test('failed saves reject and show an error rather than reporting local success', async () => {
  const { store, failWrites, events } = setup(); failWrites();
  await assert.rejects(store.addItem('memories', { title: 'Unsaved' }));
  assert.equal(events.at(-1).type, 'ocean-write-error');
});
test('new images are written to the existing collection with their image value intact', async () => {
  const { store, writes } = setup(); const image = 'data:image/jpeg;base64,photo';
  const id = await store.addItem('polaroids', { imageUrl: image, note: 'Our photo' });
  assert.equal(id, 'new-id'); assert.equal(writes[0].ref.name, 'polaroids'); assert.equal(writes[0].data.imageUrl, image);
});
test('peace room writes remove undefined optional fields Firestore cannot accept', async () => {
  const { store, writes } = setup();
  await store.savePeaceRoom({ user3zab: undefined, reconciled: false, updatedAt: 1 });
  assert.equal(Object.hasOwn(writes[0].data, 'user3zab'), false);
});
test('legacy Firestore timestamps become numeric dates used by chat and letters', () => {
  const { store, subscriptions } = setup(); let items;
  store.subscribeCollection('messages', [], value => { items = value; });
  subscriptions[0].next({ docs: [{ id: 'timestamp', data: () => ({ createdAt: { toMillis: () => 123456 }, text: 'Earlier message' }) }] });
  assert.equal(items[0].createdAt, 123456);
});
test('failed edits and deletes reject without pretending a record was changed', async () => {
  const { store, failWrites, writes, events } = setup(); failWrites();
  await assert.rejects(store.updateItem('letters', 'existing', { title: 'Unsaved' }));
  await assert.rejects(store.removeItem('polaroids', 'existing'));
  assert.equal(writes.length, 0);
  assert.equal(events.filter(event => event.type === 'ocean-write-error').length, 2);
});
