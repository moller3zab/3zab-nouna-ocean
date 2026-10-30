import { EmptyState } from '../ui/EmptyState';
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Plus, Heart, Feather, Calendar, Trash2, Edit3 } from 'lucide-react';
import type { Letter } from '../../types';
import { INITIAL_LETTERS } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input, TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';

export const LettersSection: React.FC = () => {
  const { identity } = useIdentity();
  const [letters, setLetters] = useState<Letter[]>(INITIAL_LETTERS);
  const [selectedLetter, setSelectedLetter] = useState<Letter | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form states
  const [recipient, setRecipient] = useState<'3zab' | 'Nouna'>(identity === '3zab' ? 'Nouna' : '3zab');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsub = subscribeCollection<Letter>('letters', INITIAL_LETTERS, setLetters);
    return () => unsub();
  }, []);

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setRecipient(identity === '3zab' ? 'Nouna' : '3zab');
    setEditingId(null);
  };

  const handleWriteLetter = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!title || !message) return;

    const data = {
      author: identity,
      recipient,
      title,
      message,
    };

    if (editingId) {
      await updateItem('letters', editingId, data);
    } else {
      await addItem<Partial<Letter>>('letters', data);
    }

    resetForm();
    setIsModalOpen(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleEditLetter = (item: Letter) => {
    setTitle(item.title);
    setMessage(item.message);
    setRecipient(item.recipient);
    setSelectedLetter(null);
    setEditingId(item.id);
    setSelectedLetter(null);
    setIsModalOpen(true);
  };

  const handleDeleteLetter = async (id: string) => {
    try {
    if (window.confirm("Are you sure you want to delete this letter?")) {
      await removeItem('letters', id);
      setSelectedLetter(null);
    }
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="letters" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
            SACRED CORRESPONDENCE
          </span>
          <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
            The Submerged Letters
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Sealed thoughts, personal confessions, and words written to last.
          </p>
        </div>

        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-md">
          <Feather className="w-4 h-4" />
          <span>Write a Letter</span>
        </Button>
      </div>

      {/* Envelopes Grid */}
      {letters.length === 0 && <EmptyState onAdd={() => setIsModalOpen(true)} label="نكتب أول رسالة؟"/>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {letters.map((letter) => (
          <motion.div
            key={letter.id}
            whileHover={{ y: -4 }}
            onClick={() => setSelectedLetter(letter)}
            className="cursor-pointer bg-surface-lowest dark:bg-surface-dark-card p-6 rounded-2xl shadow-soft border border-primary/10 dark:border-white/10 hover:shadow-elevated transition-all relative overflow-hidden flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-full bg-secondary-light/30 dark:bg-secondary/30 text-secondary dark:text-secondary-light flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold tracking-widest text-secondary uppercase block">
                    FROM {letter.author.toUpperCase()} TO {letter.recipient.toUpperCase()}
                  </span>
                  <h4 className="font-serif text-xl font-semibold text-primary dark:text-surface-bright">
                    {letter.title}
                  </h4>
                </div>
              </div>

              {/* Wax Seal Icon */}
              <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-xs shadow-sm font-serif italic">
                ♡
              </div>
            </div>

            <p className="text-xs text-ink-muted dark:text-ink-dark-muted line-clamp-3 leading-relaxed italic font-serif">
              "{letter.message}"
            </p>

            <div className="mt-4 pt-3 border-t border-primary/5 dark:border-white/5 flex items-center justify-between text-[11px] font-semibold text-ink-subtle dark:text-ink-dark-muted">
              <span>Click to open sealed letter</span>
              <span className="text-secondary">Read →</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Letter Reading Modal */}
      <Modal
        isOpen={!!selectedLetter}
        onClose={() => setSelectedLetter(null)}
        title={selectedLetter?.title}
        subtitle={selectedLetter ? `LETTER FROM ${selectedLetter.author.toUpperCase()} TO ${selectedLetter.recipient.toUpperCase()}` : ''}
        maxWidth="lg"
      >
        {selectedLetter && (
          <div className="space-y-6 text-left">
            <div className="p-6 sm:p-8 rounded-2xl bg-surface-low dark:bg-white/5 border border-primary/10 font-serif leading-relaxed text-ink dark:text-surface-bright text-base whitespace-pre-line shadow-inner">
              {selectedLetter.message}
            </div>

            <div className="flex items-center justify-between text-xs text-ink-subtle flex-wrap gap-4 mt-6">
              <span className="font-serif italic text-secondary font-semibold">
                With all my devotion, {selectedLetter.author}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditLetter(selectedLetter)}>
                  <Edit3 className="w-4 h-4 mr-1" /> Edit
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleDeleteLetter(selectedLetter.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Delete
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedLetter(null)}>
                  Close Envelope
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Write Letter Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); resetForm(); }}
        title={editingId ? "Edit Private Letter" : "Write a Private Letter"}
        subtitle="SEALED IN SANCTUARY"
      >
        <form onSubmit={handleWriteLetter} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-subtle">
              Recipient
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setRecipient('Nouna')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  recipient === 'Nouna'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-low dark:bg-white/5 text-ink border-primary/10'
                }`}
              >
                To: Nouna
              </button>
              <button
                type="button"
                onClick={() => setRecipient('3zab')}
                className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all ${
                  recipient === '3zab'
                    ? 'bg-primary text-white border-primary'
                    : 'bg-surface-low dark:bg-white/5 text-ink border-primary/10'
                }`}
              >
                To: 3zab
              </button>
            </div>
          </div>

          <Input
            label="Letter Title"
            placeholder="e.g. To My Sanctuary & Forever"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />

          <TextArea
            label="Letter Message"
            rows={6}
            placeholder="Write your heartfelt letter here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            required
          />

          <Button type="submit" className="mt-2" fullWidth>
            Seal & Save Letter
          </Button>
        </form>
      </Modal>
    </section>
  );
};
