/* Standards-based encrypted Web Push. Independent of the root Workbox worker. */
const DB = 'ocean-verified-push-v1';
function database() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore('state');
    req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
  });
}
async function read(key) {
  const db = await database();
  try { return await new Promise((resolve, reject) => { const req = db.transaction('state').objectStore('state').get(key); req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error); }); }
  finally { db.close(); }
}
async function write(key, value) {
  const db = await database();
  try { await new Promise((resolve, reject) => { const tx = db.transaction('state', 'readwrite'); tx.objectStore('state').put(value, key); tx.oncomplete = resolve; tx.onerror = () => reject(tx.error); }); }
  finally { db.close(); }
}
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
async function closeNotifications() {
  for (const notification of await self.registration.getNotifications?.() || []) notification.close();
}
self.addEventListener('message', event => {
  if (!event.source || new URL(event.source.url).origin !== self.location.origin) return;
  event.waitUntil((async () => {
    const message = event.data || {}; let result;
    if (message.type === 'get') result = { session: await read('session'), challenge: await read('challenge') };
    else if (message.type === 'session') {
      const old = await read('session');
      if (old?.uid !== message.uid) await closeNotifications();
      const next = old?.uid === message.uid ? { ...old, uid: message.uid } : { uid: message.uid, preferences: { previews: false } };
      if (!message.uid) { next.binding = null; await write('challenge', null); }
      await write('session', next); result = next;
    } else if (message.type === 'suspend') {
      await closeNotifications();
      const old = await read('session');
      await write('session', { ...old, paused: true }); result = true;
    } else if (message.type === 'verified') {
      const old = await read('session');
      if (old?.uid !== message.uid) throw new Error('Account changed');
      await write('session', { ...old, paused: false, deviceId: message.deviceId, binding: message.binding });
      await write('challenge', null); result = true;
    } else if (message.type === 'preferences') {
      const old = await read('session');
      if (old?.uid !== message.uid) throw new Error('Account changed');
      await write('session', { ...old, preferences: message.preferences }); result = true;
    }
    event.ports[0]?.postMessage({ result });
  })().catch(() => event.ports[0]?.postMessage({ error: 'Device state unavailable' })));
});
async function claimEvent(id) {
  const db = await database();
  try { return await new Promise((resolve, reject) => {
    const tx = db.transaction('state', 'readwrite'); const store = tx.objectStore('state'); let claimed = false;
    const req = store.get('seen:' + id);
    req.onsuccess = () => { if (!req.result) { store.put(Date.now(), 'seen:' + id); claimed = true; } };
    tx.oncomplete = () => resolve(claimed); tx.onerror = () => reject(tx.error);
  }); } finally { db.close(); }
}
const allowedSections = new Set(['our-chat','memories','letters','soundtrack','our-story','why-i-love-you','open-when','things-21','favorites','our-future','countdowns']);
self.addEventListener('push', event => event.waitUntil((async () => {
  let data; try { data = event.data.json(); } catch { return; }
  if (data.kind === 'verify') {
    if (data.expires <= Date.now() || typeof data.nonce !== 'string') return;
    await write('challenge', data);
    await self.registration.showNotification('Confirm Sanctuary notifications', {
      body: 'Open Sanctuary to finish verifying this device.', icon: '/pwa-192x192.png', tag: 'ocean-device-verification', data: { url: '/#our-chat' },
    });
    for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) client.postMessage({ type: 'ocean-push-challenge' });
    return;
  }
  const session = await read('session');
  if (data.kind !== 'activity' || !Number.isFinite(data.expires) || data.expires <= Date.now() || !session?.uid || session.paused || data.uid !== session.uid || !session.binding || session.binding !== data.binding || !session.preferences?.[data.group]) return;
  if (data.secondaryGroup && !session.preferences[data.secondaryGroup]) return;
  if (typeof data.eventId !== 'string' || !await claimEvent(data.eventId)) return;
  const url = new URL(data.url || '/', self.location.origin);
  if (url.origin !== self.location.origin || !allowedSections.has(url.hash.slice(1))) return;
  if (data.view === 'gallery' || data.view === 'wall') url.searchParams.set('pushView', data.view);
  await self.registration.showNotification(data.title || 'Sanctuary', {
    body: session.preferences.previews && data.preview ? data.preview : data.body,
    icon: '/pwa-192x192.png', tag: 'ocean:' + data.eventId,
    data: { url: url.pathname + url.search + url.hash },
  });
})()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const url = new URL(event.notification.data?.url || '/#our-chat', self.location.origin);
    if (url.origin !== self.location.origin) return;
    for (const client of await self.clients.matchAll({ type: 'window', includeUncontrolled: true })) {
      if (new URL(client.url).origin === url.origin && 'navigate' in client) { await client.navigate(url.href); return client.focus(); }
    }
    return self.clients.openWindow(url.href);
  })());
});
// Renewals require a fresh authenticated ownership challenge when the app is reopened.
self.addEventListener('pushsubscriptionchange', event => event.waitUntil(write('session', { uid: null, binding: null, preferences: { previews: false } })));
