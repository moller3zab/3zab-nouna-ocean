import { EmptyState } from '../ui/EmptyState';
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Plus, Calendar, MapPin, Star, Heart, Trash2, Edit3 } from 'lucide-react';
import type { Milestone } from '../../types';
import { INITIAL_MILESTONES } from '../../data/initialData';
import { subscribeCollection, addItem, removeItem, updateItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';

export const TimelineSection: React.FC = () => {
  const { identity } = useIdentity();
  const [milestones, setMilestones] = useState<Milestone[]>(INITIAL_MILESTONES);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');

  useEffect(() => {
    const unsub = subscribeCollection<Milestone>('milestones', INITIAL_MILESTONES, setMilestones);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle('');
    setSubtitle('');
    setDate('');
    setLocation('');
    setDescription('');
    setPhotoUrl('');
    setEditingId(null);
  };

  const handleAddMilestone = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!title || !description) return;

    const data = {
      title,
      subtitle,
      date: date || 'Special Day',
      location,
      description,
      photos: photoUrl ? [photoUrl] : [],
      createdBy: identity,
    };

    if (editingId) {
      await updateItem('milestones', editingId, data);
    } else {
      await addItem<Partial<Milestone>>('milestones', data);
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditMilestone = (item: Milestone) => {
    setTitle(item.title);
    setSubtitle(item.subtitle || '');
    setDate(item.date);
    setLocation(item.location || '');
    setDescription(item.description);
    setPhotoUrl(item.photos?.[0] || '');
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDeleteMilestone = async (id: string) => {
    try {
    if (window.confirm("Are you sure you want to delete this milestone?")) {
      await removeItem('milestones', id);
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="our-story" className="py-16 flex flex-col gap-10 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            CHAPTER BY CHAPTER
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            Chronicles of Our Hearts
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            The quiet coincidences, long walks, and destiny that held our hands.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md">
          <Plus className="w-4 h-4" />
          <span>Add Milestone</span>
        </Button>
      </div>

      {milestones.length === 0 && <EmptyState onAdd={() => setIsModalOpen(true)} label="نكتب أول حكاية؟"/>}
      {/* Timeline List */}
      <div className="relative pl-6 sm:pl-10 space-y-10">
        {/* Continuous Guideline */}
        <div className="absolute left-2.5 sm:left-4 top-4 bottom-4 w-0.5 bg-primary/10 dark:bg-white/10" />

        {milestones.map((item, index) => {
          const isFirstDate = item.title.toLowerCase().includes('first date') || item.date.includes('04.09.2026');

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 80, scale: 0.85, rotateX: 10 }}
              whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ 
                duration: 0.8, 
                delay: Math.min(index * 0.1, 0.3), 
                type: "spring", 
                bounce: 0.4 
              }}
              className={`relative flex flex-col lg:flex-row gap-6 p-6 sm:p-8 rounded-2xl border ${
                isFirstDate
                  ? 'bg-surface-container/60 dark:bg-surface-dark-card border-secondary/30 shadow-elevated'
                  : 'bg-surface-lowest dark:bg-surface-dark-card border-primary/10 dark:border-white/10 shadow-soft'
              }`}
            >
              {/* Bullet Node */}
              <div
                className={`absolute -left-[27px] sm:-left-[35px] top-8 w-7 h-7 rounded-full flex items-center justify-center shadow-md ${
                  isFirstDate
                    ? 'bg-secondary text-white'
                    : 'bg-primary text-white dark:bg-primary-container'
                }`}
              >
                {isFirstDate ? <Heart className="w-3.5 h-3.5 fill-current" /> : <Sparkles className="w-3.5 h-3.5" />}
              </div>

              {/* Left Details */}
              <div className="lg:w-1/3 flex flex-col justify-between">
                <div>
                  {isFirstDate && (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary text-white text-[10px] font-bold tracking-widest uppercase mb-3 shadow-sm">
                      <Star className="w-3 h-3 text-amber-300 fill-current" />
                      <span>HISTORIC FIRST DATE</span>
                    </div>
                  )}

                  <div className="flex items-start justify-between">
                    <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
                      {item.date}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditMilestone(item)}
                        className="text-ink-subtle hover:text-primary transition-colors"
                        title="Edit Milestone"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMilestone(item.id)}
                        className="text-ink-subtle hover:text-red-500 transition-colors"
                        title="Delete Milestone"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <h3 className="font-serif text-2xl font-semibold text-primary dark:text-surface-bright">
                    {item.title}
                  </h3>
                  {item.subtitle && (
                    <span className="text-xs text-ink-subtle dark:text-ink-dark-muted block mt-1">
                      {item.subtitle}
                    </span>
                  )}
                </div>

                {item.location && (
                  <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-secondary font-medium">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{item.location}</span>
                  </div>
                )}
              </div>

              {/* Right Content & Photos */}
              <div className="lg:w-2/3 flex flex-col justify-between gap-4">
                <p className="text-sm text-ink dark:text-surface-bright leading-relaxed">
                  {item.description}
                </p>

                {item.photos && item.photos.length > 0 && (
                  
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                    {item.photos.map((src, pIdx) => (
                      <div key={pIdx} className="overflow-hidden rounded-xl bg-surface-low dark:bg-white/5 border border-primary/10">
                        <img
                          src={src}
                          alt="Milestone photograph"
                          className="w-full h-40 object-cover hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {item.tags && item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.tags.map((tag, tIdx) => (
                      <span
                        key={tIdx}
                        className="px-3 py-1 rounded-full bg-surface-low dark:bg-white/10 text-primary dark:text-secondary-light text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Add Milestone Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Milestone" : "Add Milestone"}
        subtitle="PRESERVE A SPECIAL MOMENT"
      >
        <form onSubmit={handleAddMilestone} className="flex flex-col gap-4">
          <Input
            label="Title"
            placeholder="e.g. Our First Nile Walk"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <Input
            label="Subtitle"
            placeholder="e.g. Science Lesson at Ahmed's House"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Date"
              placeholder="e.g. 04.09.2026"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <Input
              label="Location"
              placeholder="e.g. Zamalek, Cairo"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          <TextArea
            label="Description"
            rows={3}
            placeholder="Share the story of what happened..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />
          <Input
            label="Photo URL (Optional)"
            placeholder="https://..."
            value={photoUrl}
            onChange={(e) => setPhotoUrl(e.target.value)}
          />
          <Button type="submit" className="mt-2" fullWidth>
            Save Milestone
          </Button>
        </form>
      </Modal>
    </section>
  );
};
