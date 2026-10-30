import { db, collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, setDoc } from './firebase';
import type { PeaceRoomData, MoodStatus, Notification as AppNotification } from '../types';

export function reportSync(name: string, status: 'loading' | 'ready' | 'error', message = '', count?: number) {
  window.dispatchEvent(new CustomEvent('ocean-sync', { detail: { name, status, message, count } }));
}
const errorMessage = (error: unknown) => (error as { code?: string }).code === 'permission-denied'
  ? 'Access to the private archive was denied. Publish the rules for your two accounts, then retry.'
  : 'The private archive could not connect. Check your connection and try again.';

// Firestore is the only source of journal records. No demo records or local-storage fallback.
export function subscribeCollection<T extends { id: string }>(name: string, _unused: T[], callback: (data: T[]) => void) {
  reportSync(name, 'loading');
  return onSnapshot(collection(db, name), (snapshot) => {
    const time = (value: unknown) => typeof value === 'number' ? value : (value as { toMillis?: () => number })?.toMillis?.() || 0;
    const data = snapshot.docs.map(d => {
      const fields = d.data();
      return { ...fields, ...(fields.createdAt !== undefined ? { createdAt: time(fields.createdAt) } : {}), id: d.id };
    }) as T[];
    data.sort((a, b) => time((b as Record<string, unknown>).createdAt) - time((a as Record<string, unknown>).createdAt));
    callback(data); // An empty collection clears the UI, including after deleting the final item.
    reportSync(name, 'ready', '', data.length);
  }, error => { callback([]); reportSync(name, 'error', errorMessage(error)); });
}
async function write<T>(action: () => Promise<T>): Promise<T> {
  try { return await action(); }
  catch (error) {
    window.dispatchEvent(new CustomEvent('ocean-write-error', { detail: errorMessage(error) }));
    throw error;
  }
}
export async function addItem<T extends Record<string, any>>(name: string, item: T) {
  return write(async () => (await addDoc(collection(db, name), { ...item, createdAt: Date.now() })).id);
}
export const updateItem = (name: string, id: string, updates: Record<string, any>) => write(() => updateDoc(doc(db, name, id), updates));
export const removeItem = (name: string, id: string) => write(() => deleteDoc(doc(db, name, id)));
export function subscribePeaceRoom(callback: (data: PeaceRoomData) => void) {
  reportSync('peaceRoom', 'loading');
  return onSnapshot(doc(db, 'peaceRoom', 'currentSession'), snapshot => {
    callback(snapshot.exists() ? snapshot.data() as PeaceRoomData : { reconciled: false, updatedAt: 0 });
    reportSync('peaceRoom', 'ready', '', snapshot.exists() ? 1 : 0);
  }, error => reportSync('peaceRoom', 'error', errorMessage(error)));
}
export const savePeaceRoom = (data: PeaceRoomData) => write(() => setDoc(doc(db, 'peaceRoom', 'currentSession'), JSON.parse(JSON.stringify(data))));
export function subscribeMoods(callback: (data: MoodStatus[]) => void) {
  return subscribeCollection<any>('moods', [], callback);
}
export const saveMood = (mood: MoodStatus) => write(() => setDoc(doc(db, 'moods', mood.identity), mood));
export async function addNotification(notification: Omit<AppNotification, 'id'>) {
  // A notification is secondary to the journal entry that was already saved.
  try { return (await addDoc(collection(db, 'notifications'), { ...notification, createdAt: Date.now() })).id; }
  catch (error) { console.warn('The journal was saved, but its notification could not be sent.', error); }
}
export const markNotificationRead = (id: string) => updateItem('notifications', id, { isRead: true });
export const removeNotification = (id: string) => removeItem('notifications', id);
