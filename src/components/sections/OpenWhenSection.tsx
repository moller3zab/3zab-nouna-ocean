import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Plus, MailOpen, Smile, Frown, Moon, Shield, Sparkles, Trash2, Edit3 } from 'lucide-react';
import type { OpenWhen } from '../../types';
import { INITIAL_OPEN_WHEN } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';

export const OpenWhenSection: React.FC = () => {
  const { identity } = useIdentity();
  const [openWhenList, setOpenWhenList] = useState<OpenWhen[]>(INITIAL_OPEN_WHEN);
  const [selectedEnvelope, setSelectedEnvelope] = useState<OpenWhen | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [category, setCategory] = useState("Open when you're sad");
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsub = subscribeCollection<OpenWhen>('openWhen', INITIAL_OPEN_WHEN, setOpenWhenList);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setCategory("Open when you're sad");
    setTitle('');
    setMessage('');
    setEditingId(null);
  };

  const handleAddOpenWhen = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!title || !message) return;

    const data = {
      author: identity,
      category,
      title,
      message,
    };

    if (editingId) {
      await updateItem('openWhen', editingId, data);
    } else {
      await addItem<Partial<OpenWhen>>('openWhen', data);
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditOpenWhen = (item: OpenWhen) => {
    setCategory(item.category);
    setTitle(item.title);
    setMessage(item.message);
    setSelectedEnvelope(null);
    setEditingId(item.id);
    setSelectedEnvelope(null);
    setIsModalOpen(true);
  };

  const handleDeleteOpenWhen = async (id: string) => {
    try {
    if (window.confirm("Are you sure you want to delete this envelope?")) {
      await removeItem('openWhen', id);
      setSelectedEnvelope(null);
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="open-when" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            FOR WHENEVER YOU NEED ME
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            Open When...
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Special sealed letters waiting for specific moments in life.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          <span>Add Open When Letter</span>
        </Button>
      </div>

      {/* Envelopes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {openWhenList.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ y: -4 }}
            onClick={() => setSelectedEnvelope(item)}
            className="cursor-pointer bg-surface-low dark:bg-surface-dark-card p-6 rounded-2xl shadow-soft border border-primary/10 dark:border-white/10 hover:shadow-elevated transition-all flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-full bg-primary/10 dark:bg-white/10 text-primary dark:text-secondary-light flex items-center justify-center mb-4">
                <MailOpen className="w-5 h-5" />
              </div>

              <span className="text-xs font-bold tracking-wider text-secondary uppercase block mb-1">
                {item.category}
              </span>
              <h4 className="font-serif text-lg font-bold text-primary dark:text-surface-bright">
                {item.title}
              </h4>
            </div>

            <div className="mt-6 pt-3 border-t border-primary/5 dark:border-white/5 flex items-center justify-between text-xs font-semibold text-ink-subtle">
              <span>By {item.author}</span>
              <span className="text-primary dark:text-secondary-light">Open Envelope →</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Letter Reading Modal */}
      <Modal
        isOpen={!!selectedEnvelope}
        onClose={() => setSelectedEnvelope(null)}
        title={selectedEnvelope?.title}
        subtitle={selectedEnvelope?.category.toUpperCase()}
        maxWidth="md"
      >
        {selectedEnvelope && (
          <div className="space-y-6 text-left">
            <div className="p-6 rounded-2xl bg-surface-lowest dark:bg-white/5 border border-primary/10 font-serif leading-relaxed text-ink dark:text-surface-bright text-base italic shadow-inner">
              "{selectedEnvelope.message}"
            </div>

            <div className="flex items-center justify-between text-xs text-ink-subtle flex-wrap gap-4 mt-6">
              <span className="text-secondary font-semibold">Written with devotion by {selectedEnvelope.author}</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditOpenWhen(selectedEnvelope)}>
                  <Edit3 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDeleteOpenWhen(selectedEnvelope.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
                <Button size="sm" onClick={() => setSelectedEnvelope(null)}>
                  Keep Safe ❤️
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Add Open When Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Open When Envelope" : "Add Open When Envelope"}
        subtitle="FUTURE COMFORT"
      >
        <form onSubmit={handleAddOpenWhen} className="flex flex-col gap-4">
          <Input
            label="Category / Trigger"
            placeholder="e.g. Open when you can't sleep"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
          />
          <Input
            label="Envelope Title"
            placeholder="e.g. A Soft Hug For Your Mind"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <TextArea
            label="Message"
            rows={5}
            placeholder="Write words of comfort or love..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />
          <Button type="submit" className="mt-2" fullWidth>
            Save Envelope
          </Button>
        </form>
      </Modal>
    </section>
  );
};
