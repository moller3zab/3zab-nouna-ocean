import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, Heart, Plane, Star, Plus, Trash2, Edit3, X } from 'lucide-react';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import type { Countdown } from '../../types';

const ICON_MAP: Record<string, React.ReactNode> = {
  calendar: <Calendar className="w-5 h-5" />,
  heart: <Heart className="w-5 h-5" />,
  plane: <Plane className="w-5 h-5" />,
  star: <Star className="w-5 h-5" />,
};

const INITIAL_COUNTDOWNS: Countdown[] = [];

function getTimeLeft(targetDate: string) {
  const now = new Date().getTime();
  const target = new Date(targetDate).getTime();
  const diff = target - now;

  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, passed: true };

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((diff / (1000 * 60)) % 60),
    seconds: Math.floor((diff / 1000) % 60),
    passed: false,
  };
}

export const CountdownSection: React.FC = () => {
  const [countdowns, setCountdowns] = useState<Countdown[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newIcon, setNewIcon] = useState<'calendar' | 'heart' | 'plane' | 'star'>('heart');
  const [_, setTick] = useState(0);

  useEffect(() => {
    const unsub = subscribeCollection<Countdown>('countdowns', INITIAL_COUNTDOWNS, setCountdowns);
    return () => unsub();
  }, []);

  // Tick every second for live countdown
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAdd = async () => {
    try {
    if (!newTitle.trim() || !newDate) return;
    const record = {
      title: newTitle.trim(),
      targetDate: new Date(newDate).toISOString(),
      icon: newIcon,
    };
    if (editingId) await updateItem('countdowns', editingId, record); else await addItem('countdowns', record);
    setEditingId(null);
    setNewTitle('');
    setNewDate('');
    setShowAdd(false);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleDelete = async (id: string) => {
    try {
    if (!confirm('Delete this countdown?')) return;
    await removeItem('countdowns', id);
    setCountdowns(prev => prev.filter(c => c.id !== id));
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="countdowns" className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-serif text-2xl sm:text-3xl font-semibold text-primary dark:text-surface-bright">
            Our Awaited Horizons
          </h2>
          <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
            Little moments worth looking forward to.
          </p>
        </div>
        <button
          aria-label="Add countdown" onClick={() => { setEditingId(null); setNewTitle(''); setNewDate(''); setShowAdd(true); }}
          className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {countdowns.map((cd) => {
          const time = getTimeLeft(cd.targetDate);
          return (
            <motion.div
              key={cd.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface-lowest dark:bg-surface-dark-card p-5 rounded-2xl border border-primary/10 dark:border-white/10 shadow-soft relative group"
            >
              <button aria-label="Edit countdown" className="absolute top-3 right-12 w-7 h-7 grid place-items-center text-secondary" onClick={() => { const d = new Date(cd.targetDate); setEditingId(cd.id); setNewTitle(cd.title); setNewIcon(cd.icon); setNewDate(new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0,16)); setShowAdd(true); }}><Edit3 size={14}/></button>
              <button
                aria-label="Delete countdown" onClick={() => handleDelete(cd.id)}
                className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-500 transition-all hover:scale-110"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-secondary/10 dark:bg-secondary/20 flex items-center justify-center text-secondary">
                  {ICON_MAP[cd.icon] || ICON_MAP.heart}
                </div>
                <h3 className="text-sm font-bold text-ink dark:text-surface-bright">{cd.title}</h3>
              </div>

              <div className="ocean-countdown-ring"><span>{time.passed ? '♡' : time.days}</span><small>{time.passed ? 'TODAY' : 'DAYS TO GO'}</small></div>
              <p className="text-center text-xs text-ink-subtle mt-3">{time.passed ? 'Our moment is here.' : String(time.hours).padStart(2, '0') + ' hours · ' + String(time.minutes).padStart(2, '0') + ' minutes'}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title={editingId ? 'تعديل الحدث' : 'إضافة حدث جديد'}>
        <div className="space-y-4">
          <Input label="اسم الحدث" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="مثلاً: عيد ميلاد أنفال" />
          <div>
            <label className="block text-xs font-semibold text-ink-muted dark:text-ink-dark-muted mb-1.5 uppercase tracking-wider">التاريخ</label>
            <input
              type="datetime-local"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full bg-surface-low dark:bg-white/5 border border-primary/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-ink dark:text-surface-bright focus:outline-none focus:border-primary transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-ink-muted dark:text-ink-dark-muted mb-1.5 uppercase tracking-wider">الأيقونة</label>
            <div className="flex gap-2">
              {(['heart', 'calendar', 'plane', 'star'] as const).map((icon) => (
                <button
                  key={icon}
                  onClick={() => setNewIcon(icon)}
                  className={`w-10 h-10 rounded-xl flex items-center justify-center border-2 transition-all ${newIcon === icon ? 'border-primary bg-primary/5 dark:bg-primary/20 text-primary' : 'border-transparent bg-surface-low dark:bg-white/5 text-ink-muted hover:bg-surface-high'}`}
                >
                  {ICON_MAP[icon]}
                </button>
              ))}
            </div>
          </div>
          <Button onClick={handleAdd} disabled={!newTitle.trim() || !newDate}>{editingId ? 'حفظ' : 'إضافة'}</Button>
        </div>
      </Modal>
    </section>
  );
};
