import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Heart, Plus, Quote, Trash2, Edit3 } from 'lucide-react';
import type { LoveReason } from '../../types';
import { INITIAL_REASONS } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';

export const LoveReasonsSection: React.FC = () => {
  const { identity } = useIdentity();
  const [reasons, setReasons] = useState<LoveReason[]>(INITIAL_REASONS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [text, setText] = useState('');
  const [note, setNote] = useState('');

  useEffect(() => {
    const unsub = subscribeCollection<LoveReason>('loveReasons', INITIAL_REASONS, setReasons);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setText('');
    setNote('');
    setEditingId(null);
  };

  const handleAddReason = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!text) return;

    const data = {
      author: identity,
      text,
      note,
    };

    if (editingId) {
      await updateItem('loveReasons', editingId, data);
    } else {
      await addItem<Partial<LoveReason>>('loveReasons', data);
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditReason = (item: LoveReason) => {
    setText(item.text);
    setNote(item.note || '');
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDeleteReason = async (id: string) => {
    try {
    if (window.confirm("Are you sure you want to delete this reason?")) {
      await removeItem('loveReasons', id);
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="why-i-love-you" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            UNFILTERED DEVOTION
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            Why I Love You
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Written from the depths of Ahmed & Anfal's real hearts.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          <span>Add a Reason</span>
        </Button>
      </div>

      {/* Masonry Reason Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reasons.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="relative bg-surface-low dark:bg-surface-dark-card p-6 rounded-2xl shadow-soft border border-primary/10 dark:border-white/10 flex flex-col justify-between hover:shadow-elevated transition-all overflow-hidden"
          >
            <Quote className="absolute -right-3 -bottom-3 w-28 h-28 text-primary/5 dark:text-white/5 pointer-events-none" />

            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center text-[10px] font-bold">
                  {item.author === '3zab' ? '3' : 'N'}
                </span>
                <span className="text-xs font-bold tracking-widest text-secondary uppercase">
                  {item.author === '3zab' ? '3ZAB (AHMED)' : 'NOUNAL (ANFAL)'}
                </span>
              </div>
              <div className="absolute top-4 right-4 flex gap-2">
                <button
                  onClick={() => handleEditReason(item)}
                  className="text-ink-subtle hover:text-primary transition-colors z-10"
                  title="Edit Reason"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleDeleteReason(item.id)}
                  className="text-ink-subtle hover:text-red-500 transition-colors z-10"
                  title="Delete Reason"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <p className="font-serif italic text-xl text-primary dark:text-surface-bright mb-3 leading-relaxed">
                "{item.text}"
              </p>
            </div>

            {item.note && (
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted mt-2 pt-3 border-t border-primary/5 dark:border-white/5">
                {item.note}
              </p>
            )}
          </motion.div>
        ))}
      </div>

      {reasons.length === 0 && (
        <div className="p-12 text-center bg-surface-low dark:bg-white/5 rounded-2xl border border-dashed border-primary/20 text-ink-muted">
          <p className="font-serif italic text-lg">"Love speaks in a thousand unspoken ways."</p>
        </div>
      )}

      {/* Add Reason Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Love Reason" : "Add a Love Reason"}
        subtitle="DEVOTION FROM THE HEART"
      >
        <form onSubmit={handleAddReason} className="flex flex-col gap-4">
          <TextArea
            label="Why do you love them?"
            rows={3}
            placeholder="e.g. She is completely herself around me — pure heart."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
          <TextArea
            label="Additional Reflection / Note (Optional)"
            rows={2}
            placeholder="e.g. The noise of the outside world turns to silence when you sit beside me..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <Button type="submit" className="mt-2" fullWidth>
            Save Reason
          </Button>
        </form>
      </Modal>
    </section>
  );
};
