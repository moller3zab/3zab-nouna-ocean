import { EmptyState } from '../ui/EmptyState';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Pizza, Coffee, Tv, Globe, Zap, Utensils, Plus, Trash2, Edit3 } from 'lucide-react';
import type { Favorite } from '../../types';
import { INITIAL_FAVORITES } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';

const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'utensils': return <Utensils className="w-5 h-5" />;
    case 'coffee': return <Coffee className="w-5 h-5" />;
    case 'tv': return <Tv className="w-5 h-5" />;
    case 'globe': return <Globe className="w-5 h-5" />;
    case 'zap': return <Zap className="w-5 h-5" />;
    case 'heart': return <Heart className="w-5 h-5" />;
    default: return <Heart className="w-5 h-5" />;
  }
};

const getColorClasses = (colorName: string) => {
  switch (colorName) {
    case 'red': return 'bg-red-100 dark:bg-red-900/30 text-red-500';
    case 'amber': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600';
    case 'purple': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-500';
    case 'blue': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-500';
    case 'orange': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-500';
    case 'emerald': return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-500';
    case 'stone': return 'bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300';
    case 'teal': return 'bg-teal-100 dark:bg-teal-900/30 text-teal-500';
    default: return 'bg-primary/10 text-primary';
  }
};

export const FavoritesSection: React.FC = () => {
  const { identity } = useIdentity();
  const [favorites, setFavorites] = useState<Favorite[]>(INITIAL_FAVORITES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [category, setCategory] = useState('');
  const [item, setItem] = useState('');
  const [icon, setIcon] = useState<Favorite['icon']>('heart');
  const [color, setColor] = useState<Favorite['color']>('red');

  useEffect(() => {
    const unsub = subscribeCollection<Favorite>('favorites', INITIAL_FAVORITES, setFavorites);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setCategory('');
    setItem('');
    setIcon('heart');
    setColor('red');
    setEditingId(null);
  };

  const handleAddFavorite = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!category || !item) return;

    const data = {
      author: identity,
      category,
      item,
      icon,
      color,
    };

    if (editingId) {
      await updateItem('favorites', editingId, data);
    } else {
      await addItem<Partial<Favorite>>('favorites', data);
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditFavorite = (fav: Favorite) => {
    setCategory(fav.category);
    setItem(fav.item);
    setIcon(fav.icon);
    setColor(fav.color);
    setEditingId(fav.id);
    setIsModalOpen(true);
  };

  const handleDeleteFavorite = async (id: string) => {
    try {
    if (window.confirm("Are you sure you want to delete this favorite?")) {
      await removeItem('favorites', id);
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const nounaFavorites = favorites.filter(f => f.author === 'Nouna');
  const azabFavorites = favorites.filter(f => f.author === '3zab');

  return (
    <section id="favorites" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="text-left">
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            THE ICONIC SHOWDOWN
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            Our Favorite Things
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Different tastes, aligned hearts.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          <span>Add Favorite</span>
        </Button>
      </div>

      {/* Side-by-side comparison grid */}
      {favorites.length === 0 && <EmptyState onAdd={() => setIsModalOpen(true)} label="نضيف حاجة بنحبها؟"/>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* Nouna Card */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-surface-low dark:bg-surface-dark-card p-6 sm:p-8 rounded-3xl shadow-elevated border border-primary/10 dark:border-white/10 flex flex-col gap-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-primary/10 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-secondary-light/30 dark:bg-secondary/30 text-secondary dark:text-secondary-light flex items-center justify-center font-bold text-lg font-serif">
              N
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-primary dark:text-surface-bright">
                Nouna's Favorites
              </h3>
              <span className="text-xs text-ink-muted dark:text-ink-dark-muted font-medium">Anfal's Signature Taste</span>
            </div>
          </div>

          <div className="space-y-4 text-left">
            {nounaFavorites.map((fav) => (
              <div key={fav.id} className="flex items-start gap-4 p-3 rounded-2xl bg-surface-lowest dark:bg-white/5 border border-primary/5 relative group">
                <div className={`p-2 rounded-xl ${getColorClasses(fav.color)}`}>
                  {getIconComponent(fav.icon)}
                </div>
                <div className="flex-1 pr-16">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{fav.category}</span>
                  <p className="font-serif text-lg font-bold text-primary dark:text-surface-bright">{fav.item}</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-2 opacity-0 sm:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button aria-label="Edit favorite" onClick={() => handleEditFavorite(fav)} className="text-ink-subtle hover:text-primary p-1">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button aria-label="Delete favorite" onClick={() => handleDeleteFavorite(fav.id)} className="text-ink-subtle hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {nounaFavorites.length === 0 && (
              <p className="text-sm text-ink-subtle italic">No favorites added yet.</p>
            )}
          </div>
        </motion.div>

        {/* 3zab Card */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          className="bg-surface-low dark:bg-surface-dark-card p-6 sm:p-8 rounded-3xl shadow-elevated border border-primary/10 dark:border-white/10 flex flex-col gap-6"
        >
          <div className="flex items-center gap-3 pb-4 border-b border-primary/10 dark:border-white/10">
            <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg font-serif">
              3
            </div>
            <div>
              <h3 className="font-serif text-2xl font-bold text-primary dark:text-surface-bright">
                3zab's Favorites
              </h3>
              <span className="text-xs text-ink-muted dark:text-ink-dark-muted font-medium">Ahmed's Signature Taste</span>
            </div>
          </div>

          <div className="space-y-4 text-left">
            {azabFavorites.map((fav) => (
              <div key={fav.id} className="flex items-start gap-4 p-3 rounded-2xl bg-surface-lowest dark:bg-white/5 border border-primary/5 relative group">
                <div className={`p-2 rounded-xl ${getColorClasses(fav.color)}`}>
                  {getIconComponent(fav.icon)}
                </div>
                <div className="flex-1 pr-16">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-subtle">{fav.category}</span>
                  <p className="font-serif text-lg font-bold text-primary dark:text-surface-bright">{fav.item}</p>
                </div>
                <div className="absolute top-1/2 -translate-y-1/2 right-3 flex gap-2 opacity-0 sm:opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                  <button aria-label="Edit favorite" onClick={() => handleEditFavorite(fav)} className="text-ink-subtle hover:text-primary p-1">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button aria-label="Delete favorite" onClick={() => handleDeleteFavorite(fav.id)} className="text-ink-subtle hover:text-red-500 p-1">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {azabFavorites.length === 0 && (
              <p className="text-sm text-ink-subtle italic">No favorites added yet.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Add Favorite Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Favorite" : "Add a Favorite"}
        subtitle="OUR SIGNATURE TASTES"
      >
        <form onSubmit={handleAddFavorite} className="flex flex-col gap-4">
          <Input
            label="Category"
            placeholder="e.g. FAVORITE DRINK"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
          <Input
            label="Favorite Item"
            placeholder="e.g. Iced Coffee ☕"
            value={item}
            onChange={(e) => setItem(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Icon
              </label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-low dark:bg-white/5 border border-primary/10 text-ink dark:text-surface-bright text-xs font-semibold"
              >
                <option value="utensils">Food / Utensils</option>
                <option value="coffee">Drink / Coffee</option>
                <option value="tv">TV / Movie</option>
                <option value="globe">Travel / Globe</option>
                <option value="zap">Energy / Zap</option>
                <option value="heart">Heart</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5 text-left">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
                Color
              </label>
              <select
                value={color}
                onChange={(e) => setColor(e.target.value as any)}
                className="w-full px-4 py-2.5 rounded-xl bg-surface-low dark:bg-white/5 border border-primary/10 text-ink dark:text-surface-bright text-xs font-semibold"
              >
                <option value="red">Red</option>
                <option value="amber">Amber / Yellow</option>
                <option value="emerald">Green</option>
                <option value="blue">Blue</option>
                <option value="purple">Purple</option>
                <option value="orange">Orange</option>
                <option value="teal">Teal</option>
                <option value="stone">Gray / Stone</option>
              </select>
            </div>
          </div>
          <Button type="submit" className="mt-2" fullWidth>
            Save Favorite
          </Button>
        </form>
      </Modal>
    </section>
  );
};
