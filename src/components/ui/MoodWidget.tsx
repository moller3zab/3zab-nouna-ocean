import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { useIdentity } from '../../context/IdentityContext';
import { subscribeMoods, saveMood } from '../../lib/store';
import type { MoodStatus } from '../../types';

const MOOD_OPTIONS = [
  { id: 'happy', emoji: '🥰', label: 'مبسوط' },
  { id: 'miss_you', emoji: '🥺', label: 'مشتاق' },
  { id: 'stressed', emoji: '🤯', label: 'مضغوط' },
  { id: 'loved', emoji: '❤️', label: 'بحبك' },
  { id: 'tired', emoji: '😴', label: 'تعبان' },
  { id: 'excited', emoji: '✨', label: 'متحمس' },
];

export const MoodWidget: React.FC = () => {
  const { identity } = useIdentity();
  const [moods, setMoods] = useState<MoodStatus[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedMood, setSelectedMood] = useState('happy');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const unsub = subscribeMoods(setMoods);
    return () => unsub();
  }, []);

  const myMood = moods.find(m => m.identity === identity);
  const partnerIdentity = identity === '3zab' ? 'Nouna' : '3zab';
  const partnerMood = moods.find(m => m.identity === partnerIdentity);

  const handleSave = async () => {
    try {
    const moodObj = MOOD_OPTIONS.find(m => m.id === selectedMood);
    if (!moodObj) return;
    await saveMood({
      identity,
      mood: moodObj.id,
      emoji: moodObj.emoji,
      message,
      updatedAt: Date.now()
    });

    // Send notification
    import('../../lib/store').then(({ addNotification }) => {
      addNotification({
        type: 'future', // using a generic type, or you could add a 'mood' type
        message: `${identity === '3zab' ? 'أحمد' : 'أنفال'} غيّر حالته المزاجية إلى: ${moodObj.emoji} ${moodObj.label}`,
        linkId: 'hero',
        isRead: false,
        createdAt: Date.now()
      });
    });

    setIsEditing(false);
    setMessage('');
    } catch (error) { console.error('Mood save failed:', error); }
  };

  const renderMoodCard = (label: string, mood: MoodStatus | undefined, isMe: boolean) => (
    <div
      role={isMe ? 'button' : undefined}
      tabIndex={isMe ? 0 : undefined}
      aria-label={isMe ? 'Update my mood' : undefined}
      onKeyDown={event => { if (isMe && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); setIsEditing(true); } }}
      className={`flex flex-col gap-2 p-3 sm:p-4 bg-surface-low dark:bg-white/5 rounded-2xl flex-1 border border-primary/5 dark:border-white/10 transition-all ${isMe ? 'cursor-pointer hover:bg-surface-high dark:hover:bg-white/10' : ''}`}
      onClick={() => isMe && setIsEditing(true)}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold tracking-wider text-ink-muted dark:text-ink-dark-muted uppercase">{label}</span>
        <span className="text-xl">{mood?.emoji || '💭'}</span>
      </div>
      {mood?.message ? (
        <p className="text-xs text-ink-subtle dark:text-ink-dark-muted italic truncate">"{mood.message}"</p>
      ) : (
        <p className="text-[10px] text-ink-subtle dark:text-ink-dark-muted">{isMe ? 'اضغط لتحديث حالتك' : 'لم يحدد حالته بعد'}</p>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto mb-8 relative z-10">
      <div className="flex gap-3">
        {renderMoodCard(identity === '3zab' ? 'Ahmed' : 'Anfal', myMood, true)}
        {renderMoodCard(partnerIdentity === '3zab' ? 'Ahmed' : 'Anfal', partnerMood, false)}
      </div>

      <AnimatePresence>
        {isEditing && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden mt-3"
          >
            <div className="bg-surface-lowest dark:bg-surface-dark-card p-4 rounded-2xl border border-primary/10 dark:border-white/10 shadow-elevated">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-bold text-ink dark:text-surface-bright">كيف حالك اليوم؟</h3>
                <button onClick={() => setIsEditing(false)} className="text-ink-subtle hover:text-ink transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-3">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.id}
                    onClick={() => setSelectedMood(mood.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all ${selectedMood === mood.id ? 'border-primary bg-primary/5 dark:bg-primary/20 scale-105' : 'border-transparent hover:bg-surface-low dark:hover:bg-white/5'}`}
                  >
                    <span className="text-2xl">{mood.emoji}</span>
                    <span className="text-[10px] font-medium text-ink-muted dark:text-ink-dark-muted">{mood.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="رسالة صغيرة (اختياري)..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 bg-surface-low dark:bg-white/5 border border-primary/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-ink dark:text-surface-bright placeholder:text-ink-subtle focus:outline-none focus:border-primary transition-colors"
                  maxLength={60}
                />
                <button
                  aria-label="Save mood"
                  onClick={handleSave}
                  className="bg-primary text-white px-4 py-2 rounded-xl flex items-center justify-center hover:bg-primary/90 transition-colors shadow-sm"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
