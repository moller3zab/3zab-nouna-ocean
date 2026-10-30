import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Shuffle, Plus, Repeat, Volume2 } from 'lucide-react';
import type { Song } from '../../types';
const clock=(seconds:number)=>Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.floor(seconds%60)).padStart(2,'0')}`:'0:00';
export function StitchPlayer({song,songs,onSelect,onAdd}:{song:Song|null;songs:Song[];onSelect:(song:Song)=>void;onAdd:()=>void}) {
  const audio=useRef<HTMLAudioElement>(null);
  const continuePlaying=useRef(false);
  const [playing,setPlaying]=useState(false);
  const [time,setTime]=useState(0);
  const [duration,setDuration]=useState(0);
  const [volume,setVolume]=useState(.7);
  const [repeat,setRepeat]=useState(false);
  const [shuffle,setShuffle]=useState(false);
  const [error,setError]=useState('');
  useEffect(()=>{
    const player=audio.current;if(!player)return;
    setTime(0);setDuration(0);setError('');setPlaying(false);
    player.volume=volume;
    if(continuePlaying.current&&song)void player.play().catch(()=>{continuePlaying.current=false;setError('Press play to continue.');});
  },[song?.url]);
  const select=(offset:number,autoplay=playing)=>{if(!songs.length)return;continuePlaying.current=autoplay;const current=songs.findIndex(s=>s.id===song?.id);const choices=songs.filter(s=>s.id!==song?.id);const next=shuffle&&choices.length?choices[Math.floor(Math.random()*choices.length)]:songs[(current+offset+songs.length)%songs.length];onSelect(next);};
  const toggle=async()=>{const player=audio.current;if(!player||!song)return;setError('');if(!player.paused){continuePlaying.current=false;player.pause();}else{try{await player.play();continuePlaying.current=true;}catch{setError('This track could not play. Check the music file and try again.');}}};
  return <div className="stitch-studio">
    <audio ref={audio} src={song?.url} preload="metadata" loop={repeat} onLoadedMetadata={()=>setDuration(audio.current?.duration||0)} onDurationChange={()=>setDuration(audio.current?.duration||0)} onTimeUpdate={()=>setTime(audio.current?.currentTime||0)} onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>{if(!repeat){if(songs.length>1)select(1,true);else{continuePlaying.current=false;setPlaying(false);}}}} onError={()=>{setPlaying(false);continuePlaying.current=false;setError('Could not load this music file.');}}/>
    <div className="stitch-vinyl-side"><div className={`stitch-vinyl ${playing?'is-playing':''}`}><i/><i/><div><span>3zab ♡ Nouna</span><small>SIDE A</small></div></div><p>Squidward’s Music Studio</p><small>Our songs. Our little world.</small></div>
    <div className="stitch-track"><div className="stitch-track-heading"><div><p className="ocean-eyebrow">CURRENTLY RESONATING</p><h3>{song?.title||'Our next favorite song'}</h3><p>{song?.artist||'Choose a local track to begin.'}</p></div><button onClick={onAdd}><Plus size={15}/> Add Song</button></div>
      <div className={`stitch-wave ${playing?'is-playing':''}`} aria-hidden="true">{[18,34,44,26,39,20,32,46,23,36,27,18].map((height,i)=><span key={i} style={{height,animationDelay:`${i*.11}s`}}/>)}</div>
      <div className="stitch-seek"><input type="range" aria-label="Track progress" min="0" max={duration||0} step=".1" value={Math.min(time,duration||0)} disabled={!duration} onChange={event=>{const next=Number(event.target.value);if(audio.current){audio.current.currentTime=next;setTime(next);}}}/><div><span>{clock(time)}</span><span>{clock(duration)}</span></div></div>
      <div className="stitch-controls"><button aria-label="Shuffle songs" aria-pressed={shuffle} disabled={songs.length<2} onClick={()=>setShuffle(value=>!value)}><Shuffle size={19}/></button><button aria-label="Previous song" disabled={songs.length<2} onClick={()=>select(-1)}><SkipBack size={21}/></button><button className="stitch-play" aria-label={playing?'Pause song':'Play song'} disabled={!song} onClick={toggle}>{playing?<Pause size={22}/>:<Play size={23}/>}</button><button aria-label="Next song" disabled={songs.length<2} onClick={()=>select(1)}><SkipForward size={21}/></button><button aria-label="Repeat song" aria-pressed={repeat} disabled={!song} onClick={()=>setRepeat(value=>!value)}><Repeat size={19}/></button></div>
      <label className="stitch-volume"><Volume2 size={17}/><input aria-label="Volume" type="range" min="0" max="1" step=".05" value={volume} onChange={event=>{const value=Number(event.target.value);setVolume(value);if(audio.current)audio.current.volume=value;}}/></label>
      {error&&<p role="alert" className="text-sm text-red-600 mt-3">{error}</p>}
    </div>
  </div>;
}
