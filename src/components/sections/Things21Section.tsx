import { EmptyState } from '../ui/EmptyState';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Trash2, Edit3 } from 'lucide-react';
import type { Thing21 } from '../../types';
import { INITIAL_THINGS21 } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';

export const Things21Section: React.FC = () => {
  const [items, setItems] = useState<Thing21[]>(INITIAL_THINGS21);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    const unsub = subscribeCollection<Thing21>('things21', INITIAL_THINGS21, setItems);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setImageUrl('');
    setEditingId(null);
  };

  const handleAddItem = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!title || !description) return;

    const data = {
      title,
      description,
      imageUrl,
    };

    if (editingId) {
      await updateItem('things21', editingId, data);
    } else {
      await addItem<Partial<Thing21>>('things21', {
        ...data,
        number: items.length + 1,
      });
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditItem = (item: Thing21) => {
    setTitle(item.title);
    setDescription(item.description);
    setImageUrl(item.imageUrl || '');
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
    if (window.confirm("Are you sure you want to delete this item?")) {
      await removeItem('things21', id);
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="things-21" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            OUR UNIQUE INSIDE WORLD
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            21 Pieces of Our Universe
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Inside jokes, unspoken habits, and quiet things only we understand.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          <span>Add Item</span>
        </Button>
      </div>

      {/* Numbered Cards Grid */}
      {items.length === 0 && <EmptyState onAdd={() => setIsModalOpen(true)} label="نضيف حاجة بتجمعنا؟"/>}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.05 }}
            className="bg-surface-lowest dark:bg-surface-dark-card p-6 rounded-2xl shadow-soft border border-primary/10 dark:border-white/10 flex flex-col justify-between hover:shadow-elevated transition-all"
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif text-3xl font-bold text-secondary dark:text-secondary-light">
                  #{String(item.number || index + 1).padStart(2, '0')}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditItem(item)}
                    className="text-ink-subtle hover:text-primary transition-colors"
                    title="Edit Item"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-ink-subtle hover:text-red-500 transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <h4 className="font-serif text-xl font-bold text-primary dark:text-surface-bright mb-2">
                {item.title}
              </h4>
              <p className="text-xs text-ink-muted dark:text-ink-dark-muted leading-relaxed">
                {item.description}
              </p>
            </div>

            {item.imageUrl && (
              <img
                src={item.imageUrl}
                alt={item.title}
                className="mt-4 w-full h-32 object-cover rounded-xl border border-primary/5"
              />
            )}
          </motion.div>
        ))}
      </div>

      {/* Add 21 Things Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Item" : "Add to 21 Things"}
        subtitle="ANOTHER INSIDE MEMORY"
      >
        <form onSubmit={handleAddItem} className="flex flex-col gap-4">
          <Input
            label="Item Title"
            placeholder="e.g. Something only we understand"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <TextArea
            label="Description"
            rows={3}
            placeholder="Describe this special thing..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <Input
            label="Image URL (Optional)"
            placeholder="https://..."
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
          />
          <Button type="submit" className="mt-2" fullWidth>
            Save Item
          </Button>
        </form>
      </Modal>
    </section>
  );
};
