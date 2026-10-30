import { getAuth } from 'firebase/auth';
import { pushRequest } from './pushApi';
import app from './firebase';
export type PushPreferences = { previews: boolean; chat: boolean; photos: boolean; memories: boolean; letters: boolean; songs: boolean; other: boolean };
export const defaultPushPreferences: PushPreferences = { previews: false, chat: true, photos: true, memories: true, letters: true, songs: true, other: true };
type Session = { uid?: string; deviceId?: string; binding?: string; preferences?: PushPreferences };
type Challenge = { uid: string; deviceId: string; challengeId: string; nonce: string; expires: number };
let desiredUid: string | null = null;
let chain: Promise<unknown> = Promise.resolve();
async function call<T>(name: string, data: unknown = {}) {
  return pushRequest<T>(name,data);
}
export async function pushWorker() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Use a supported browser or an installed iPhone Home Screen app (iOS 16.4+).');
  const reg = await navigator.serviceWorker.register('/push/webpush/worker.js', { scope: '/push/webpush/' });
  const worker = reg.active || reg.installing || reg.waiting;
  if (!worker) throw new Error('Notification worker is unavailable.');
  if (worker.state !== 'activated') await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Notification worker timed out.')), 12000);
    worker.addEventListener('statechange', () => { if (worker.state === 'activated') { clearTimeout(timeout); resolve(); } });
  });
  return reg;
}
async function workerMessage<T>(message: Record<string, unknown>): Promise<T> {
  const reg = await pushWorker();
  return new Promise<T>((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => reject(new Error('Device state timed out.')), 5000);
    channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); event.data.error ? reject(new Error(event.data.error)) : resolve(event.data.result); };
    reg.active!.postMessage(message, [channel.port2]);
  });
}
export async function getPushState() { return workerMessage<{ session?: Session; challenge?: Challenge }>({ type: 'get' }); }
export async function getPushConfig() { return call<{ publicKey: string; enabled: boolean; previewsEnabled: boolean }>('getWebPushConfig'); }
function check(uid: string) { if (desiredUid !== uid || getAuth(app).currentUser?.uid !== uid) throw new Error('Your account changed.'); }
export function syncPushIdentity(uid: string | null) {
  desiredUid = uid;
  chain = chain.catch(() => {}).then(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    const state = await getPushState(); const old = state.session;
    const next = desiredUid;
    if (old?.uid && old.uid !== next) {
      // Clear local display permission before any network operation or sign-out.
      await workerMessage({ type: 'suspend' });
      if (getAuth(app).currentUser?.uid === old.uid && old.deviceId && old.binding) {
        await call('updateWebPush', { deviceId: old.deviceId, binding: old.binding, revoke: true, preferences: old.preferences || defaultPushPreferences });
      }
      const reg = await pushWorker(); const sub = await reg.pushManager.getSubscription();
      if (sub && !await sub.unsubscribe()) throw new Error('Could not unsubscribe this device.');
    }
    await workerMessage({ type: 'session', uid: desiredUid });
  });
  return chain;
}
export async function enablePush(uid: string, permission: Promise<NotificationPermission>, preferences: PushPreferences) {
  if (await permission !== 'granted') throw new Error('Allow notifications in browser settings first.');
  check(uid);
  await syncPushIdentity(uid); check(uid);
  const config = await getPushConfig(); check(uid);
  if (!config.enabled) throw new Error('Notifications have not been enabled on the server yet.');
  const reg = await pushWorker();
  const key = Uint8Array.from(atob(config.publicKey.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
  const sub = await reg.pushManager.getSubscription() || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key });
  check(uid);
  await workerMessage({ type: 'preferences', uid, preferences });
  const pending = await call<{ deviceId: string; challengeId: string }>('beginWebPush', { subscription: sub.toJSON() });
  check(uid);
  return pending;
}
export async function confirmPush(uid: string, preferences: PushPreferences) {
  check(uid); const state = await getPushState(); const challenge = state.challenge;
  if (!challenge || challenge.uid !== uid || challenge.expires <= Date.now()) throw new Error('Waiting for the verification push. Open its notification, then try Verify device.');
  const verified = await call<{ deviceId: string; binding: string }>('confirmWebPush', challenge);
  check(uid); await workerMessage({ type: 'verified', uid, ...verified });
  await savePushPreferences(uid, preferences);
}
export async function savePushPreferences(uid: string, preferences: PushPreferences) {
  check(uid); const { session } = await getPushState();
  if (!session?.binding || !session.deviceId || session.uid !== uid) throw new Error('Verify this device first.');
  // Tightening privacy is immediate locally, even if the network write fails.
  await workerMessage({ type: 'preferences', uid, preferences: { ...preferences, previews: false } });
  await call('updateWebPush', { deviceId: session.deviceId, binding: session.binding, preferences });
  check(uid); await workerMessage({ type: 'preferences', uid, preferences });
}
export async function disablePush(uid: string) { check(uid); await syncPushIdentity(null); await syncPushIdentity(uid); }
