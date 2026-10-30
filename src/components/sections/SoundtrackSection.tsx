import { useEffect, useState } from 'react';
import { Edit3, Trash2, Music } from 'lucide-react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { subscribeCollection, saveSong } from '../../lib/store';
import type { Song } from '../../types';
import catalog from '../../data/localMusic.json';
import { StitchPlayer } from './StitchPlayer';
import { Modal } from '../ui/Modal';
import { Input, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
type LocalSong=Song&{hidden?:boolean};
const localTracks=catalog as LocalSong[];
export function SoundtrackSection() {
  const [metadata,setMetadata]=useState<LocalSong[]>([]);
  const [activeId,setActiveId]=useState(localTracks[0]?.id||'');
  const [editing,setEditing]=useState<LocalSong|null>(null);
  const [open,setOpen]=useState(false);
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>subscribeCollection<LocalSong>('songs',[],setMetadata),[]);
  const tracks=localTracks.map(track=>({...track,...metadata.find(item=>item.id===track.id),url:track.url,id:track.id})).filter(track=>!track.hidden);
  const active=tracks.find(track=>track.id===activeId)||tracks[0]||null;
  const edit=(song:LocalSong)=>{setEditing({...song});setError('');setOpen(true);};
  const hide=async(song:LocalSong)=>{if(!confirm('Remove this track from our playlist? The music file stays safe.'))return;try{await saveSong(song.id,{...song,hidden:true});}catch{setError('Could not update the playlist. Please try again.');}};
  return <section id="soundtrack" className="py-16 flex flex-col gap-8 scroll-mt-24">
    <div><p className="ocean-eyebrow">OUR LOCAL SOUNDTRACK</p><h2 className="font-serif text-3xl">Our Underwater Soundtrack</h2><p className="text-sm text-ink-muted mt-2">The songs we keep, played right here.</p></div>
    <StitchPlayer song={active} songs={tracks} onSelect={song=>setActiveId(song.id)} onAdd={()=>edit(localTracks.find(track=>!tracks.some(song=>song.id===track.id))||active||localTracks[0])}/>
    {error&&!open&&<p role="alert" className="text-sm text-red-600">{error}</p>}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-5">{tracks.map(song=><article key={song.id} className={`local-song-card ${active?.id===song.id?'is-active':''}`}><button className="local-song-select" aria-label={`Select ${song.title}`} onClick={()=>setActiveId(song.id)}><Music size={22}/><h3>{song.title}</h3><p>{song.artist}</p></button>{song.note&&<p className="text-xs text-ink-muted">{song.note}</p>}<div className="flex justify-end gap-3"><button aria-label="Edit Song" onClick={()=>edit(song)}><Edit3 size={16}/></button><button aria-label="Delete Song" onClick={()=>hide(song)}><Trash2 size={16}/></button></div></article>)}</div>
    <Modal isOpen={open} onClose={()=>setOpen(false)} title="Our local songs"><form className="space-y-4" onSubmit={async event=>{event.preventDefault();if(!editing)return;setSaving(true);setError('');try{await saveSong(editing.id,{...editing,platform:'other',hidden:false,createdAt:Date.now()});setActiveId(editing.id);setOpen(false);}catch{setError('Could not save the song details. Please try again.');}finally{setSaving(false);}}}>
      <label className="flex flex-col gap-2 text-sm">Music file<select aria-label="Music file" value={editing?.id||''} className="p-3 rounded-xl bg-surface-low text-ink" onChange={event=>{const track=localTracks.find(song=>song.id===event.target.value);if(track)setEditing({...track,...metadata.find(song=>song.id===track.id),hidden:false});}}>{localTracks.map(song=><option key={song.id} value={song.id}>{song.title}</option>)}</select></label>
      <Input label="Song title" required value={editing?.title||''} onChange={event=>setEditing(song=>song?{...song,title:event.target.value}:song)}/><Input label="Artist" value={editing?.artist||''} onChange={event=>setEditing(song=>song?{...song,artist:event.target.value}:song)}/><TextArea label="Our note" value={editing?.note||''} onChange={event=>setEditing(song=>song?{...song,note:event.target.value}:song)}/>{error&&<p role="alert">{error}</p>}<Button type="submit" disabled={saving||!editing}>{saving?'Saving…':'Save song'}</Button>
    </form></Modal>
  </section>;
}
