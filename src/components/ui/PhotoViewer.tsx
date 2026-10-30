import { useEffect, useRef, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

export function PhotoViewer() {
  const [photos, setPhotos] = useState<{ src: string; title: string }[]>([]);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const points = useRef(new Map<number, {x:number;y:number}>());
  const gesture = useRef({ x:0,y:0,distance:0,pinch:false });
  const down = useRef({x:0,y:0});
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const change = (offset:number) => { setIndex(i => (i + offset + photos.length) % photos.length); setZoom(1); setPan({x:0,y:0}); };
  useEffect(() => {
    const start = (e:PointerEvent) => { down.current={x:e.clientX,y:e.clientY}; };
    const open = (e:MouseEvent) => {
      const target=e.target;
      if (!(target instanceof HTMLImageElement) || Math.hypot(e.clientX-down.current.x,e.clientY-down.current.y)>8) return;
      const section=target.closest('#memories,#our-story,#things-21,#our-chat'); if (!section || target.closest('[role=dialog]')) return;
      const unique=[...new Map(Array.from(section.querySelectorAll('img')).map(img=>[img.src,{src:img.src,title:img.alt}])).values()];
      previousFocus.current=document.activeElement as HTMLElement;
      setPhotos(unique);setIndex(unique.findIndex(photo=>photo.src===target.src));setZoom(1);setPan({x:0,y:0});
    };
    document.addEventListener('pointerdown',start);document.addEventListener('click',open);
    return()=>{document.removeEventListener('pointerdown',start);document.removeEventListener('click',open);};
  },[]);
  useEffect(() => {
    if (!photos.length) { points.current.clear(); return; }
    const overflow=document.body.style.overflow;document.body.style.overflow='hidden';closeButton.current?.focus();
    const key=(e:KeyboardEvent)=>{if(e.key==='Escape')setPhotos([]);if(e.key==='ArrowRight')change(1);if(e.key==='ArrowLeft')change(-1);if(e.key==='Tab'){const buttons=Array.from(document.querySelectorAll<HTMLButtonElement>('.ocean-lightbox button:not(:disabled)'));const first=buttons[0],last=buttons.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}};
    window.addEventListener('keydown',key);return()=>{document.body.style.overflow=overflow;window.removeEventListener('keydown',key);previousFocus.current?.focus();};
  },[photos.length]);
  if (!photos.length) return null;
  return <div className="ocean-lightbox" role="dialog" aria-modal="true" aria-label="Photo viewer">
    <div className="ocean-lightbox-tools"><span>{index+1} / {photos.length}</span><button aria-label="Zoom out" disabled={zoom<=1} onClick={()=>{setZoom(z=>Math.max(1,z-.5));setPan({x:0,y:0});}}><ZoomOut/></button><button aria-label="Zoom in" disabled={zoom>=4} onClick={()=>setZoom(z=>Math.min(4,z+.5))}><ZoomIn/></button><button ref={closeButton} aria-label="Close photo" onClick={()=>setPhotos([])}><X/></button></div>
    <button className="ocean-lightbox-prev" aria-label="Previous photo" disabled={photos.length<2} onClick={()=>change(-1)}><ChevronLeft/></button>
    <div className="ocean-lightbox-stage" onWheel={e=>setZoom(z=>Math.max(1,Math.min(4,z+(e.deltaY<0?.2:-.2))))} onDoubleClick={()=>{setZoom(z=>z===1?2:1);setPan({x:0,y:0});}} onPointerDown={e=>{e.currentTarget.setPointerCapture(e.pointerId);points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});gesture.current={x:e.clientX,y:e.clientY,distance:0,pinch:points.current.size>1};}} onPointerMove={e=>{if(!points.current.has(e.pointerId))return;const old=points.current.get(e.pointerId)!;points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const pair=[...points.current.values()];if(pair.length===2){const d=Math.hypot(pair[0].x-pair[1].x,pair[0].y-pair[1].y);if(gesture.current.distance)setZoom(z=>Math.max(1,Math.min(4,z*d/gesture.current.distance)));gesture.current.distance=d;gesture.current.pinch=true;}else if(zoom>1)setPan(p=>({x:p.x+e.clientX-old.x,y:p.y+e.clientY-old.y}));}} onPointerUp={e=>{points.current.delete(e.pointerId);const dx=e.clientX-gesture.current.x,dy=e.clientY-gesture.current.y;if(!gesture.current.pinch&&zoom===1&&Math.abs(dx)>60&&Math.abs(dy)<100)change(dx<0?1:-1);}} onPointerCancel={()=>points.current.clear()}>
      <img src={photos[index].src} alt={photos[index].title} draggable={false} style={{transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}/>
    </div><button className="ocean-lightbox-next" aria-label="Next photo" disabled={photos.length<2} onClick={()=>change(1)}><ChevronRight/></button><p className="ocean-lightbox-caption">{photos[index].title}</p>
  </div>;
}


