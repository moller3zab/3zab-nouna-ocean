import { useEffect, useState } from 'react';
import { ArrowDown, Waves, Settings2, Heart } from 'lucide-react';
import { useArchive, saveArchive } from '../../context/ArchiveContext';
import { useIdentity } from '../../context/IdentityContext';
import { SanctuaryCharacter } from '../layout/SanctuaryCharacter';
import { Modal } from '../ui/Modal';
import { Input, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';

export function HeroSection() {
  const settings = useArchive();
  const { identity } = useIdentity();
  const [now, setNow] = useState(Date.now());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(timer); }, []);
  const configuredStart = Date.parse(settings.relationshipStartedAt || '');
  const start = Number.isFinite(configuredStart) ? configuredStart : Date.parse('2026-09-04T00:00:00');
  const elapsed = Number.isFinite(start) ? Math.max(0, Math.floor((now - start) / 1000)) : null;
  const units = elapsed === null ? ['—', '—', '—', '—'] : [Math.floor(elapsed / 86400), Math.floor(elapsed / 3600) % 24, Math.floor(elapsed / 60) % 60, elapsed % 60];
  return <section id="hero" className="ocean-hero">
    <p className="ocean-pill"><span className="ocean-live-dot"/> Our private universe · {identity}</p>
    <h1>{settings.title || '3zab ♡ Nouna'}</h1>
    <p className="ocean-hero-subtitle">{settings.subtitle || 'A little world beneath the waves. Just you, me, and everything we keep.'}</p>
    <div className="ocean-sanctuary-card">
      <div className="ocean-guardian"><SanctuaryCharacter mood="idle" gaze={0}/></div>
      <div><p className="ocean-eyebrow">OUR LITTLE SANCTUARY</p><h2>The Moai Pavilion</h2><p>{settings.sanctuaryNote || 'A quiet place to come back to each other.'}</p></div>
      <button aria-label="Edit our universe" onClick={() => { setDraft(settings); setError(''); setEditing(true); }}><Settings2 size={17}/></button>
    </div>
    <div className="ocean-elapsed">{units.map((value, index) => <div key={index}><strong>{value}</strong><span>{['Days', 'Hours', 'Minutes', 'Seconds'][index]}</span></div>)}</div>
    {!settings.relationshipStartedAt && <button className="ocean-text-button" onClick={() => { setDraft(settings); setEditing(true); }}>Set our special date <Heart size={12}/></button>}
    <a className="ocean-scroll" href="#mood"><span>SCROLL INTO OUR WORLD</span><ArrowDown size={18}/></a>
    <Modal isOpen={editing} onClose={() => setEditing(false)} title="Our universe settings">
      <form className="space-y-4" onSubmit={async event => {
        event.preventDefault(); setSaving(true); setError('');
        try { await saveArchive(draft); setEditing(false); } catch { setError('Could not save. Please check your archive access and try again.'); } finally { setSaving(false); }
      }}>
        <Input label="Title" value={draft.title || ''} onChange={e => setDraft({ ...draft, title: e.target.value })}/>
        <TextArea label="Subtitle" value={draft.subtitle || ''} onChange={e => setDraft({ ...draft, subtitle: e.target.value })}/>
        <Input label="Our special date" type="datetime-local" value={draft.relationshipStartedAt || ''} onChange={e => setDraft({ ...draft, relationshipStartedAt: e.target.value })}/>
        <Input label="Sanctuary note" value={draft.sanctuaryNote || ''} onChange={e => setDraft({ ...draft, sanctuaryNote: e.target.value })}/>
        <Input label="Video URL from your archive" type="url" value={draft.videoUrl || ''} onChange={e => setDraft({ ...draft, videoUrl: e.target.value })}/>
        <Input label="Video poster URL" type="url" value={draft.videoPosterUrl || ''} onChange={e => setDraft({ ...draft, videoPosterUrl: e.target.value })}/>
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save to our archive'}</Button>
      </form>
    </Modal>
  </section>;
}
