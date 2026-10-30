import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Camera, Plus, Heart, Tag, Image as ImageIcon, Trash2, Edit3 } from 'lucide-react';
import type { Memory } from '../../types';
import { INITIAL_MEMORIES } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';
import { PolaroidWall } from './PolaroidWall';

const CATEGORIES = ['All Preserved', 'Zamalek Date', 'Special Days', 'Sweet Snaps'];

export const MemoriesSection: React.FC = () => {
  const { identity } = useIdentity();
  const [memories, setMemories] = useState<Memory[]>(INITIAL_MEMORIES);
  const [destination, setDestination] = useState<'gallery' | 'wall'>(new URLSearchParams(location.search).get('pushView') === 'gallery' ? 'gallery' : 'wall');
  const [view, setView] = useState<'gallery' | 'wall'>(new URLSearchParams(location.search).get('pushView') === 'gallery' ? 'gallery' : 'wall');
  const [activeFilter, setActiveFilter] = useState('All Preserved');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [caption, setCaption] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tag, setTag] = useState('Zamalek Date');

  useEffect(() => {
    const unsub = subscribeCollection<Memory>('memories', INITIAL_MEMORIES, setMemories);
    return () => unsub();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800; // compress size to keep it well under 1MB Firestore limit
        
        if (width > height && width > MAX_SIZE) {
          height *= MAX_SIZE / width;
          width = MAX_SIZE;
        } else if (height > MAX_SIZE) {
          width *= MAX_SIZE / height;
          height = MAX_SIZE;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        // compress to JPEG with 70% quality (usually <100kb)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
        setImageUrl(dataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };


  const resetForm = () => {
    setTitle('');
    setDate('');
    setCaption('');
    setImageUrl('');
    setTag('Zamalek Date');
    setEditingId(null);
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!title || !caption || !imageUrl) return;

    const data = {
      title,
      date: date || 'Preserved Moment',
      caption,
      imageUrl,
      tag,
      createdBy: identity,
    };

    if (!editingId && destination === 'wall') {
      await addItem('polaroids', { imageUrl, note: caption || title, date: date || 'A new favorite', createdBy: identity, x: 48, y: 48, rotation: -4 });
      setView('wall');
    } else if (editingId) {
      await updateItem('memories', editingId, data);
    } else {
      await addItem<Partial<Memory>>('memories', { ...data, likes: 1 });
      setView('gallery');
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditMemory = (item: Memory) => {
    setTitle(item.title);
    setDate(item.date);
    setCaption(item.caption);
    setImageUrl(item.imageUrl);
    setTag(item.tag);
    setEditingId(item.id);
    setDestination('gallery');
    setIsModalOpen(true);
  };

  const handleToggleLike = async (memory: Memory) => {
    try {
    await updateItem('memories', memory.id, { likes: memory.likes + 1 });
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleDeleteMemory = async (id: string) => {
    try {
    if (window.confirm("Are you sure you want to delete this memory?")) {
      await removeItem('memories', id);
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const filteredMemories = activeFilter === 'All Preserved'
    ? memories
    : memories.filter(m => m.tag.toLowerCase().includes(activeFilter.toLowerCase()) || activeFilter.toLowerCase().includes(m.tag.toLowerCase()));

  return (
    <section id="memories" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            TACTILE ARCHIVES
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            Memories Scrapbook Wall
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Moments caught in sunlight, iced drinks, and stolen smiles.
          </p>
        </div>

        <Button onClick={() => { resetForm(); setDestination(view); setIsModalOpen(true); }} className="gap-2 shadow-md">
          <Camera className="w-4 h-4" />
          <span>Add Memory</span>
        </Button>
      </div>

      <div className="ocean-memory-tabs" role="group" aria-label="Memory view"><button type="button" aria-pressed={view === 'gallery'} onClick={() => setView('gallery')}>Curated Gallery</button><button type="button" aria-pressed={view === 'wall'} onClick={() => setView('wall')}>Polaroid Wall</button></div>
      {view === 'gallery' && <>
      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveFilter(cat)}
            className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all shadow-sm ${
              activeFilter === cat
                ? 'bg-primary text-white dark:bg-primary-container'
                : 'bg-surface-low text-ink-muted hover:bg-surface-high dark:bg-white/10 dark:text-ink-dark-muted dark:hover:bg-white/20'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Memories Polaroid Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <AnimatePresence>
          {filteredMemories.map((item, index) => (
            <motion.div
              key={item.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: index * 0.05 }}
              className="bg-surface-lowest dark:bg-surface-dark-card p-4 pb-6 rounded-2xl shadow-elevated border border-primary/10 dark:border-white/10 hover:-translate-y-1 transition-transform flex flex-col group"
            >
              {/* Image Frame */}
              <div className="relative overflow-hidden rounded-xl mb-4 bg-surface-low">
                <div className="absolute top-3 right-3 px-3 py-1 bg-surface-lowest/90 dark:bg-black/70 backdrop-blur-md rounded-full text-[10px] font-bold tracking-widest text-primary dark:text-surface-bright shadow-sm z-10">
                  {item.date}
                </div>

                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-64 object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>

              {/* Title & Actions */}
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-serif text-xl font-semibold text-primary dark:text-surface-bright">
                  {item.title}
                </h4>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => handleToggleLike(item)}
                    className="flex items-center gap-1.5 text-xs text-secondary hover:text-red-500 transition-colors font-semibold"
                  >
                    <Heart className="w-4 h-4 fill-secondary/20 hover:fill-secondary" />
                    <span>{item.likes}</span>
                  </button>
                  <button
                    onClick={() => handleEditMemory(item)}
                    className="text-ink-subtle hover:text-primary transition-colors"
                    title="Edit Memory"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteMemory(item.id)}
                    className="text-ink-subtle hover:text-red-500 transition-colors"
                    title="Delete Memory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <p className="text-xs text-ink-muted dark:text-ink-dark-muted leading-relaxed mb-4">
                {item.caption}
              </p>

              <div className="mt-auto pt-3 border-t border-primary/5 dark:border-white/5 flex items-center justify-between text-[11px] font-bold tracking-widest text-ink-subtle dark:text-ink-dark-muted uppercase">
                <span className="flex items-center gap-1">
                  <Tag className="w-3 h-3 text-secondary" /> #{item.tag}
                </span>
                <span className="text-secondary dark:text-secondary-light font-serif italic">
                  {item.createdBy}'s Vault
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {filteredMemories.length === 0 && (
        <div className="p-12 text-center bg-surface-low dark:bg-white/5 rounded-2xl border border-dashed border-primary/20 text-ink-muted">
          <p className="font-serif italic text-lg">"Our story is just getting started."</p>
        </div>
      )}

      </>}
      {view === 'wall' && <PolaroidWall />}

      {/* Add Memory Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Preserved Memory" : "Add Preserved Memory"}
        subtitle="SNAPSHOT IN TIME"
      >
        <form onSubmit={handleAddMemory} className="flex flex-col gap-4">
          {!editingId && <label className="flex flex-col gap-2 text-sm text-ink-muted">Save this memory to
            <select aria-label="Save this memory to" value={destination} onChange={e => setDestination(e.target.value as 'gallery' | 'wall')} className="rounded-xl border border-primary/20 bg-surface-low p-3 text-ink">
              <option value="gallery">Curated Gallery</option><option value="wall">Polaroid Wall</option>
            </select>
          </label>}
          <Input
            label="Memory Title"
            placeholder="e.g. Sunset Coffee Walk"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              placeholder="e.g. 04.09.2026"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Category Tag
              </label>
              <select
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-low dark:bg-white/5 border border-primary/10 text-ink dark:text-surface-bright text-xs font-semibold"
              >
                <option value="Zamalek Date">Zamalek Date</option>
                <option value="Special Days">Special Days</option>
                <option value="Sweet Snaps">Sweet Snaps</option>
              </select>
            </div>
          </div>
          <TextArea
            label="Caption / Story"
            rows={3}
            placeholder="Describe what made this moment unforgettable..."
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            required
          />
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Upload Photo (Free)
            </label>
            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                id="memory-image-upload"
              />
              <label
                htmlFor="memory-image-upload"
                className="w-full flex flex-col items-center justify-center gap-2 px-4 py-6 rounded-xl bg-surface-low dark:bg-white/5 border-2 border-dashed border-primary/20 dark:border-white/20 text-primary dark:text-surface-bright cursor-pointer hover:bg-surface-high dark:hover:bg-white/10 transition-colors"
              >
                <ImageIcon className="w-6 h-6 opacity-70" />
                <span className="text-sm font-semibold">
                  {imageUrl ? 'Photo Selected! Click to change' : 'Choose a photo from your device'}
                </span>
                <span className="text-xs text-ink-subtle opacity-70">
                  Compressed automatically & saved for free
                </span>
              </label>
            </div>
            {imageUrl && (
               <div className="mt-2 overflow-hidden rounded-xl border border-primary/10">
                 <img src={imageUrl} alt="Preview" className="w-full h-40 object-cover" />
               </div>
            )}
          </div>
          <Button type="submit" className="mt-2" fullWidth>
            Save Memory
          </Button>
        </form>
      </Modal>
    </section>
  );
};
