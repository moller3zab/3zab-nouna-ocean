import { useEffect, useState } from 'react';
import { useIdentity } from '../../context/IdentityContext';
import { confirmPush, defaultPushPreferences, disablePush, enablePush, getPushConfig, getPushState, savePushPreferences, syncPushIdentity } from '../../lib/push';
import type { PushPreferences } from '../../lib/push';
export function PushSubscription() {
  const { uid } = useIdentity();
  const [busy, setBusy] = useState(false);
  const [preferences, setPreferences] = useState<PushPreferences>(defaultPushPreferences);
  const [previewsAllowed, setPreviewsAllowed] = useState(false);
  const [status, setStatus] = useState('Verify this device before receiving personal notifications.');
  useEffect(() => {
    let alive = true;
    syncPushIdentity(uid).then(() => getPushState()).then(state => { if (alive && state.session?.uid === uid && state.session.preferences) setPreferences({...defaultPushPreferences,...state.session.preferences}); }).catch(() => {});
    getPushConfig().then(config => { if (alive) setPreviewsAllowed(config.previewsEnabled); }).catch(() => {});
    const listener = (event: MessageEvent) => { if (event.data?.type === 'ocean-push-challenge') setStatus('Verification push received. Select Verify device to finish.'); };
    const pending = (event: Event) => setStatus((event as CustomEvent<string>).detail);
    window.addEventListener('ocean-push-status', pending);
    navigator.serviceWorker?.addEventListener('message', listener);
    return () => { window.removeEventListener('ocean-push-status', pending); alive = false; navigator.serviceWorker?.removeEventListener('message', listener); };
  }, [uid]);
  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true); try { await action(); setStatus(success); }
    catch (error) { setStatus(error instanceof Error ? error.message : 'Notifications could not connect.'); }
    finally { setBusy(false); }
  };
  return <div className="max-w-2xl mx-auto w-full rounded-2xl border border-primary/10 bg-surface-lowest dark:bg-surface-dark-card p-4 space-y-3">
    <h3 className="font-serif text-lg">Notification preferences</h3>
    <p className="text-xs text-ink-muted dark:text-ink-dark-muted">Preferences apply to this device. Message text stays in its original language.</p>
    <fieldset disabled={busy || !uid} className="space-y-2 text-sm">
      <legend className="sr-only">Message privacy and notification categories</legend>
      <label className="flex gap-2"><input type="checkbox" checked={preferences.previews} disabled={!previewsAllowed} onChange={e => setPreferences(p => ({ ...p, previews: e.target.checked }))}/>Show message previews</label>
      <p className="text-xs text-ink-muted dark:text-ink-dark-muted">{preferences.previews ? 'Previews appear on your lock screen.' : 'Hide message previews: show activity descriptions only.'}{!previewsAllowed && ' Private previews await server approval and device verification.'}</p>
      {([['chat', 'Chat notifications'], ['photos', 'Photo notifications'], ['memories', 'Memory notifications'], ['letters', 'Letter notifications'], ['songs', 'Song notifications'], ['other', 'Other activity notifications']] as const).map(([key, label]) => <label key={key} className="flex gap-2"><input type="checkbox" checked={preferences[key]} onChange={e => setPreferences(p => ({ ...p, [key]: e.target.checked }))}/>{label}</label>)}
    </fieldset>
    <div className="flex flex-wrap gap-2">
      <button disabled={busy || !uid} className="rounded-xl bg-primary px-4 py-2 text-white disabled:opacity-50" onClick={() => {
        if (!uid) return;
        // The permission request must run before the first await on iOS.
        const permission = 'Notification' in window ? Notification.requestPermission() : Promise.resolve('denied' as NotificationPermission);
        void run(() => enablePush(uid, permission, preferences), 'Verification sent. Open the notification, then select Verify device.');
      }}>Enable on this device</button>
      <button disabled={busy || !uid} className="rounded-xl border border-primary/20 px-3 py-2" onClick={() => uid && void run(() => confirmPush(uid, preferences), 'Device verified. Your notification preferences are saved.')}>Verify device</button>
      <button disabled={busy || !uid} className="rounded-xl border border-primary/20 px-3 py-2" onClick={() => uid && void run(() => savePushPreferences(uid, preferences), 'Preferences saved.')}>Save preferences</button>
      <button disabled={busy || !uid} className="rounded-xl border border-primary/20 px-3 py-2" onClick={() => uid && void run(() => disablePush(uid), 'Notifications disabled on this device.')}>Disable</button>
    </div>
    <p role="status" className="text-xs text-ink-muted dark:text-ink-dark-muted">{busy ? 'Connecting…' : status}</p>
    <p className="text-xs text-ink-muted dark:text-ink-dark-muted">iPhone: Safari → Share → Add to Home Screen, then open the app there (iOS 16.4+).</p>
  </div>;
}
