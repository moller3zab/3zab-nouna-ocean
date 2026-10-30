import React, { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Camera, Edit3, GripHorizontal, Image as ImageIcon, Plus, Trash2 } from 'lucide-react';
import type { Polaroid } from '../../types';
import { INITIAL_POLAROIDS } from '../../data/initialData';
import { addItem, removeItem, subscribeCollection, updateItem } from '../../lib/store';
import { useIdentity } from '../../context/IdentityContext';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';

const CARD_WIDTH = 208;
const CARD_HEIGHT = 273;
const NUDGE_DISTANCE = 20;

type Direction = 'left' | 'right' | 'up' | 'down';

const clamp = (value: number, max: number) => Math.max(0, Math.min(value, Math.max(0, max)));

const compressImage = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('Could not read image'));
  reader.onload = () => {
    const image = new Image();
    image.onerror = () => reject(new Error('Could not load image'));
    image.onload = () => {
      const maximumSide = 1_000;
      const scale = Math.min(1, maximumSide / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d')?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL('image/jpeg', 0.75));
    };
    image.src = reader.result as string;
  };
  reader.readAsDataURL(file);
});

interface PolaroidCardProps {
  item: Polaroid;
  draggable?: boolean;
  wallRef?: React.RefObject<HTMLDivElement>;
  onEdit: (item: Polaroid) => void;
  onDelete: (id: string) => void;
  onMove: (item: Polaroid, direction: Direction) => void;
  onDragEnd?: (item: Polaroid, offset: { x: number; y: number }) => void;
}

const PolaroidCard: React.FC<PolaroidCardProps> = ({ item, draggable = false, wallRef, onEdit, onDelete, onMove, onDragEnd }) => {
  const reducedMotion = useReducedMotion();
  const card = (
    <>
      <div className="relative aspect-[1.04/1] overflow-hidden bg-surface-low">
        <img src={item.imageUrl} alt={item.note || `Memory from ${item.date}`} className="h-full w-full object-cover" loading="lazy" />
        <button type="button" aria-label={`Edit photo: ${item.note || item.date}`} onPointerDown={event => event.stopPropagation()} onClick={() => onEdit(item)} className="absolute right-12 top-2 grid h-9 w-9 place-items-center rounded-full bg-black/45 text-white shadow-sm backdrop-blur-sm"><Edit3 size={15}/></button>
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onDelete(item.id)}
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/45 text-white opacity-100 shadow-sm backdrop-blur-sm transition hover:bg-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-white md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
          aria-label={`Delete photo: ${item.note || item.date}`}
        >
          <Trash2 className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
      <div className="relative min-h-[72px] px-3 pb-3 pt-2.5 text-left">
        <p className="font-hand text-[19px] font-medium leading-tight text-primary dark:text-surface-bright">{item.note}</p>
        <p className="mt-1 text-[10px] font-bold tracking-[0.16em] text-secondary dark:text-secondary-light">{item.date}</p>
        {draggable && (
          <div className="absolute bottom-2 right-2 flex gap-0.5 rounded-md bg-surface-low/90 p-0.5 opacity-100 shadow-sm backdrop-blur-sm md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 dark:bg-surface-dark-high/90">
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMove(item, 'left')} className="grid h-7 w-7 place-items-center rounded text-ink-muted transition hover:bg-white hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-ink-dark-muted dark:hover:bg-white/10" aria-label={`Move ${item.note || 'photo'} left`}><ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMove(item, 'right')} className="grid h-7 w-7 place-items-center rounded text-ink-muted transition hover:bg-white hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-ink-dark-muted dark:hover:bg-white/10" aria-label={`Move ${item.note || 'photo'} right`}><ArrowRight className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMove(item, 'up')} className="grid h-7 w-7 place-items-center rounded text-ink-muted transition hover:bg-white hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-ink-dark-muted dark:hover:bg-white/10" aria-label={`Move ${item.note || 'photo'} up`}><ArrowUp className="h-3.5 w-3.5" aria-hidden="true" /></button>
            <button type="button" onPointerDown={(event) => event.stopPropagation()} onClick={() => onMove(item, 'down')} className="grid h-7 w-7 place-items-center rounded text-ink-muted transition hover:bg-white hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary dark:text-ink-dark-muted dark:hover:bg-white/10" aria-label={`Move ${item.note || 'photo'} down`}><ArrowDown className="h-3.5 w-3.5" aria-hidden="true" /></button>
          </div>
        )}
      </div>
    </>
  );

  if (!draggable) {
    return <article className="group overflow-hidden rounded-sm bg-surface-lowest pb-0 shadow-[0_10px_22px_-14px_rgba(76,13,29,0.6)] ring-1 ring-primary/10 dark:bg-surface-dark-card dark:ring-white/10">{card}</article>;
  }

  return (
    <motion.article
      drag={!reducedMotion}
      dragConstraints={wallRef}
      dragElastic={0.08}
      dragMomentum={false}
      initial={{ opacity: 0, scale: 0.94, rotate: item.rotation }}
      animate={{ opacity: 1, scale: 1, rotate: item.rotation, x: item.x, y: item.y }}
      transition={{ type: 'spring', stiffness: 220, damping: 22 }}
      onDragEnd={(_, info) => onDragEnd?.(item, info.offset)}
      className="group absolute left-0 top-0 w-[208px] touch-none select-none overflow-hidden rounded-sm bg-surface-lowest pb-0 shadow-[0_18px_36px_-18px_rgba(76,13,29,0.75)] ring-1 ring-primary/10 focus-within:z-20 dark:bg-surface-dark-card dark:ring-white/10"
      style={{ zIndex: Math.round(item.y + item.x) }}
      aria-label={`Polaroid: ${item.note}. Drag to rearrange.`}
    >
      <div className="absolute left-1/2 top-1 z-10 -translate-x-1/2 rounded-full bg-black/30 px-2 py-0.5 text-white opacity-0 backdrop-blur-sm transition group-hover:opacity-100 group-focus-within:opacity-100">
        <GripHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
      {card}
    </motion.article>
  );
};

export const PolaroidWall: React.FC = () => {
  const { identity } = useIdentity();
  const wallRef = useRef<HTMLDivElement>(null);
  const [polaroids, setPolaroids] = useState<Polaroid[]>(INITIAL_POLAROIDS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState('');

  useEffect(() => subscribeCollection<Polaroid>('polaroids', INITIAL_POLAROIDS, setPolaroids), []);

  const handleEdit = (item: Polaroid) => { setEditingId(item.id); setImageUrl(item.imageUrl); setNote(item.note); setDate(item.date); setIsModalOpen(true); };
  const resetForm = () => {
    setEditingId(null);
    setImageUrl('');
    setNote('');
    setDate('');
  };

  const updatePolaroid = async (id: string, updates: Partial<Polaroid>) => {
    try { await updateItem('polaroids', id, updates); } catch (error) { console.error('Position was not saved:', error); }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      setImageUrl(await compressImage(file));
    } catch {
      setImageUrl('');
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleAdd = async (event: React.FormEvent) => {
    try {
    event.preventDefault();
    if (!imageUrl || !note) return;
    const count = polaroids.length;
    const createdAt = Date.now();
    const newPolaroid = {
      imageUrl,
      note,
      date: date || 'A new favorite',
      createdBy: identity,
      x: 48 + ((count * 92) % 650),
      y: 48 + ((count * 48) % 260),
      rotation: [-6, -3, 4, 7][count % 4],
      createdAt,
    };
    if (editingId) { await updateItem('polaroids', editingId, { imageUrl, note, date }); resetForm(); setIsModalOpen(false); return; }
    const id = await addItem<Partial<Polaroid>>('polaroids', newPolaroid);
    
    // Send notification
    import('../../lib/store').then(({ addNotification }) => {
      addNotification({
        type: 'memory',
        message: `${identity === '3zab' ? 'أحمد' : 'أنفال'} أضاف صورة جديدة للذكريات: "${note}"`,
        linkId: id,
        isRead: false,
        createdAt: Date.now()
      });
    });

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Remove this photo from the wall?')) {
      try { await removeItem('polaroids', id); } catch (error) { console.error('Photo was not removed:', error); }
    }
  };

  const handleMove = (item: Polaroid, direction: Direction) => {
    const wall = wallRef.current;
    if (!wall) return;
    const maxX = wall.clientWidth - CARD_WIDTH;
    const maxY = wall.clientHeight - CARD_HEIGHT;
    const delta = direction === 'left' ? [-NUDGE_DISTANCE, 0] : direction === 'right' ? [NUDGE_DISTANCE, 0] : direction === 'up' ? [0, -NUDGE_DISTANCE] : [0, NUDGE_DISTANCE];
    updatePolaroid(item.id, { x: clamp(item.x + delta[0], maxX), y: clamp(item.y + delta[1], maxY) });
  };

  const handleDragEnd = (item: Polaroid, offset: { x: number; y: number }) => {
    const wall = wallRef.current;
    if (!wall) return;
    updatePolaroid(item.id, {
      x: clamp(item.x + offset.x, wall.clientWidth - CARD_WIDTH),
      y: clamp(item.y + offset.y, wall.clientHeight - CARD_HEIGHT),
    });
  };

  return (
    <section className="mt-4 border-t border-primary/10 pt-10 dark:border-white/10" aria-labelledby="polaroid-wall-title">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase">THE TABLETOP EDIT</span>
          <h3 id="polaroid-wall-title" className="mt-1 font-serif text-2xl font-semibold text-primary dark:text-surface-bright sm:text-3xl">Our Polaroid Wall</h3>
          <p className="mt-1 text-sm text-ink-muted dark:text-ink-dark-muted">Drag a memory into its perfect little place.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" aria-hidden="true" />
          <span>Add a photo</span>
        </Button>
      </div>

      <div className="ocean-photo-wall mt-6 rounded-[1.75rem] border border-primary/15 bg-[#acd8ea] p-3 shadow-inner dark:border-white/10 dark:bg-[#2a2021] sm:p-5">
        <p className="mb-3 flex items-center gap-2 px-1 text-xs font-medium text-primary/70 dark:text-surface-bright/70"><GripHorizontal className="h-4 w-4" aria-hidden="true" /> Drag photos around — their places are saved.</p>
        <div ref={wallRef} className="relative hidden min-h-[530px] overflow-hidden rounded-[1.15rem] border border-primary/10 bg-[#d6b894] [background-image:linear-gradient(rgba(76,13,29,0.045)_1px,transparent_1px),linear-gradient(90deg,rgba(76,13,29,0.045)_1px,transparent_1px)] [background-size:24px_24px] dark:border-white/5 dark:bg-[#1c1515] md:block">
          {polaroids.map((item) => <PolaroidCard key={item.id} item={item} draggable wallRef={wallRef} onEdit={handleEdit} onDelete={handleDelete} onMove={handleMove} onDragEnd={handleDragEnd} />)}
        </div>
        <div className="grid grid-cols-2 gap-3 md:hidden">
          {polaroids.map((item) => <PolaroidCard key={item.id} item={item} onEdit={handleEdit} onDelete={handleDelete} onMove={handleMove} />)}
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); resetForm(); }} title={editingId ? "Edit Polaroid" : "Add to the Polaroid Wall"} subtitle="A LITTLE MOMENT TO KEEP">
        <form onSubmit={handleAdd} className="flex flex-col gap-4">
          <Input label="Small note" placeholder="e.g. Your laugh after the first sip" value={note} onChange={(event) => setNote(event.target.value)} required />
          <Input label="Date or tiny caption" placeholder="e.g. 04.09.2026" value={date} onChange={(event) => setDate(event.target.value)} />
          <div className="flex flex-col gap-1.5 text-left">
            <label htmlFor="polaroid-image-upload" className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-ink-dark-muted">Photo</label>
            <input id="polaroid-image-upload" type="file" accept="image/*" onChange={handleImageUpload} className="sr-only" />
            <label htmlFor="polaroid-image-upload" className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/20 bg-surface-low px-4 py-5 text-center text-primary transition hover:bg-surface-high dark:border-white/20 dark:bg-white/5 dark:text-surface-bright dark:hover:bg-white/10">
              <ImageIcon className="h-6 w-6" aria-hidden="true" />
              <span className="text-sm font-semibold">{imageUrl ? 'Photo selected — choose another to replace it' : 'Choose a photo from your device'}</span>
            </label>
          </div>
          {imageUrl && <img src={imageUrl} alt="New polaroid preview" className="h-40 w-full rounded-xl object-cover" />}
          <Button type="submit" className="mt-1 gap-2" fullWidth disabled={!imageUrl || !note}><Camera className="h-4 w-4" aria-hidden="true" />Save to the wall</Button>
        </form>
      </Modal>
    </section>
  );
};
