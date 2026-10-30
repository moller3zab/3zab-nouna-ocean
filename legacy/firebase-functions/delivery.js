const { hash } = require('./device-protocol');
async function deliver({ store, send, deviceId, payload, now = Date.now }) {
  const path = 'deliveries/' + hash(payload.eventId + ':' + deviceId + ':' + payload.binding);
  let claimed = false;
  await store.mutate(path, old => {
    claimed = !old || (!old.sent && old.leaseUntil <= now());
    return claimed ? { sent: false, leaseUntil: now() + 60000, expiresAt: now() + 7 * 86400000 } : old;
  });
  if (!claimed) return;
  const device = await store.read('devices/' + deviceId);
  if (!device?.active || !device.verified || device.binding !== payload.binding || device.uid !== payload.uid || device.verifiedUntil <= now() || !device.preferences?.[payload.group]) return;
  if (payload.secondaryGroup && !device.preferences[payload.secondaryGroup]) return;
  // Re-check hide-preview preference immediately before sending.
  if (!device.preferences.previews) payload = { ...payload, preview: '' };
  try {
    await send(device.subscription, payload);
    await store.mutate(path, old => ({ ...old, sent: true }));
  } catch (error) {
    if (error.statusCode === 404 || error.statusCode === 410) {
      await store.mutate('devices/' + deviceId, old => old?.binding === payload.binding ? { ...old, active: false } : old);
      await store.mutate(path, old => ({ ...old, sent: true }));
      return;
    }
    await store.mutate(path, old => ({ ...old, leaseUntil: 0 }));
    throw new Error('Push delivery failed; retry without logging private data');
  }
}
module.exports = { deliver };
