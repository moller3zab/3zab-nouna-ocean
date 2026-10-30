import { Film } from 'lucide-react';
import { useArchive } from '../../context/ArchiveContext';

export function FinalVideoSection() {
  const { videoUrl, videoPosterUrl } = useArchive();
  const source = videoUrl || '/our-favorite-30-seconds.mp4';
  return <section id="final-scene" className="ocean-finale">
    <p className="ocean-eyebrow">OUR STORY, IN MOTION</p><h2>Our Journey in 4K</h2>
    <p>A little film of a world that belongs to us.</p>
    {source ? <video key={source} src={source} poster={videoPosterUrl || undefined} controls playsInline preload="metadata" className="w-full rounded-2xl mt-8"/> : <div className="ocean-empty-video"><Film size={35}/><p>No film in the archive yet.</p><span>Add your video URL in “Edit our universe”.</span></div>}
  </section>;
}
