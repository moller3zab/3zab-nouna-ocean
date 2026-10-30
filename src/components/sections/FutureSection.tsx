import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, CheckCircle, Circle, Sparkles, Trash2, Edit3 } from 'lucide-react';
import type { FutureDream } from '../../types';
import { INITIAL_FUTURE_DREAMS } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';

export const FutureSection: React.FC = () => {
  const { identity } = useIdentity();
  const [dreams, setDreams] = useState<FutureDream[]>(INITIAL_FUTURE_DREAMS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');

  useEffect(() => {
    const unsub = subscribeCollection<FutureDream>('futureDreams', INITIAL_FUTURE_DREAMS, setDreams);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle('');
    setEditingId(null);
  };

  const handleAddDream = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!title) return;

    if (editingId) {
      await updateItem('futureDreams', editingId, { title });
    } else {
      const id = await addItem<Partial<FutureDream>>('futureDreams', {
        title,
        completed: false,
        createdBy: identity,
      });

      // Send notification
      import('../../lib/store').then(({ addNotification }) => {
        addNotification({
          type: 'future',
          message: `${identity === '3zab' ? 'أحمد' : 'أنفال'} أضاف حلم جديد للمستقبل: "${title}"`,
          linkId: id,
          isRead: false,
          createdAt: Date.now()
        });
      });
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditDream = (item: FutureDream) => {
    setTitle(item.title);
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleToggleComplete = async (dream: FutureDream) => {
    try {
    await updateItem('futureDreams', dream.id, {
      completed: !dream.completed,
      completedAt: !dream.completed ? Date.now() : null
    });
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleDelete = async (id: string) => {
    try {
    if (!window.confirm('Delete this dream?')) return;
    await removeItem('futureDreams', id);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="our-future" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            THINGS WE HAVEN'T DONE YET
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            Our Shared Dreams
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Our shared bucket list, future home dreams, and upcoming adventures.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          <span>Add Dream</span>
        </Button>
      </div>

      {/* Dreams List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnimatePresence>
          {dreams.map((dream) => (
            <motion.div
              key={dream.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`p-5 rounded-2xl border transition-all flex items-center justify-between gap-4 shadow-soft ${
                dream.completed
                  ? 'bg-secondary-light/10 dark:bg-secondary/20 border-secondary/40'
                  : 'bg-surface-lowest dark:bg-surface-dark-card border-primary/10 dark:border-white/10'
              }`}
            >
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                <button
                  aria-label={dream.completed ? `Mark ${dream.title} incomplete` : `Complete ${dream.title}`} onClick={() => handleToggleComplete(dream)}
                  className="text-secondary hover:scale-110 transition-transform shrink-0"
                >
                  {dream.completed ? (
                    <CheckCircle className="w-6 h-6 fill-secondary text-white" />
                  ) : (
                    <Circle className="w-6 h-6 text-primary/30 dark:text-white/30" />
                  )}
                </button>

                <div className="flex flex-col min-w-0 text-left">
                  <span
                    className={`font-serif text-lg font-semibold truncate ${
                      dream.completed
                        ? 'line-through text-ink-subtle dark:text-ink-dark-muted'
                        : 'text-primary dark:text-surface-bright'
                    }`}
                  >
                    {dream.title}
                  </span>

                  {dream.completed ? (
                    <span className="text-xs font-bold text-secondary dark:text-secondary-light flex items-center gap-1 mt-0.5">
                      <Heart className="w-3 h-3 fill-current" /> We did it. ❤️
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-ink-subtle uppercase">
                      Dream by {dream.createdBy}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => handleEditDream(dream)}
                  className="text-ink-subtle hover:text-primary transition-colors p-1"
                  title="Edit dream"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDelete(dream.id)}
                  className="text-ink-subtle hover:text-red-500 transition-colors p-1"
                  title="Delete dream"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {dreams.length === 0 && (
        <div className="p-12 text-center bg-surface-low dark:bg-white/5 rounded-2xl border border-dashed border-primary/20 text-ink-muted">
          <p className="font-serif italic text-lg">"Let's add something we want to do together."</p>
        </div>
      )}

      {/* Add Dream Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Future Dream" : "Add Future Dream"}
        subtitle="OUR SHARED BUCKET LIST"
      >
        <form onSubmit={handleAddDream} className="flex flex-col gap-4">
          <Input
            label="Dream / Goal Title"
            placeholder="e.g. Travel abroad together to Spain"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Button type="submit" className="mt-2" fullWidth>
            Save Dream
          </Button>
        </form>
      </Modal>
    </section>
  );
};
