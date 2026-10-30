import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Shield, CheckCircle2, RefreshCw } from 'lucide-react';
import type { PeaceRoomData, PeaceResponse } from '../../types';
import { subscribePeaceRoom, savePeaceRoom } from '../../lib/store';
import { TextArea } from '../ui/Input';
import { Button } from '../ui/Button';
import { useIdentity } from '../../context/IdentityContext';

export const PeaceRoomSection: React.FC = () => {
  const { identity } = useIdentity();
  const [data, setData] = useState<PeaceRoomData>({ reconciled: false, updatedAt: Date.now() });

  // Form states for current user
  const [happened, setHappened] = useState('');
  const [feeling, setFeeling] = useState('');
  const [understand, setUnderstand] = useState('');
  const [sorryFor, setSorryFor] = useState('');
  const [wantToDo, setWantToDo] = useState('');

  useEffect(() => {
    const unsub = subscribePeaceRoom((roomData) => {
      setData(roomData);

      // Pre-fill existing submission for current user if available
      const existing = identity === '3zab' ? roomData.user3zab : roomData.userNouna;
      if (existing) {
        setHappened(existing.happened || '');
        setFeeling(existing.feeling || '');
        setUnderstand(existing.understand || '');
        setSorryFor(existing.sorryFor || '');
        setWantToDo(existing.wantToDo || '');
      }
    });
    return () => unsub();
  }, [identity]);

  const handleSubmit = async (e: React.FormEvent) => {
    try {
    e.preventDefault();

    const response: PeaceResponse = {
      happened,
      feeling,
      understand,
      sorryFor,
      wantToDo,
      submittedAt: Date.now()
    };

    const updatedData: PeaceRoomData = {
      ...data,
      user3zab: identity === '3zab' ? response : data.user3zab,
      userNouna: identity === 'Nouna' ? response : data.userNouna,
      updatedAt: Date.now()
    };

    // Check if both have submitted -> trigger reconciliation state!
    if (updatedData.user3zab && updatedData.userNouna) {
      updatedData.reconciled = true;
    }

    await savePeaceRoom(updatedData);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleResetSession = async () => {
    try {
    const empty: PeaceRoomData = { reconciled: false, updatedAt: Date.now() };
    await savePeaceRoom(empty);
    setHappened('');
    setFeeling('');
    setUnderstand('');
    setSorryFor('');
    setWantToDo('');
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const myResponse = identity === '3zab' ? data.user3zab : data.userNouna;
  const partnerResponse = identity === '3zab' ? data.userNouna : data.user3zab;

  return (
    <section id="peace-room" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto mb-3">
          <Heart className="w-6 h-6 fill-current" />
        </div>
        <span className="text-xs font-bold tracking-widest text-emerald-600 dark:text-emerald-400 uppercase block mb-1">
          SAFE HAVEN FOR RECONCILIATION
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
          The Peace Room
        </h2>
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
          A calm, quiet space for moments when misunderstanding touches our hearts.
        </p>
      </div>

      {/* Main Sanctuary Card */}
      <div className="max-w-3xl mx-auto w-full bg-surface-lowest dark:bg-surface-dark-card p-6 sm:p-10 rounded-3xl shadow-elevated border border-emerald-500/20">
        
        {/* Reconciled State */}
        <AnimatePresence>
          {data.reconciled ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-8 flex flex-col items-center text-center gap-6"
            >
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center animate-bounce">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div className="space-y-2">
                <h3 className="font-serif text-3xl font-bold text-primary dark:text-surface-bright">
                  You both chose to understand each other. ❤️
                </h3>
                <p className="text-sm text-ink-muted dark:text-ink-dark-muted max-w-md mx-auto">
                  Love isn't the absence of misunderstandings — it's the willingness to listen and hold hands through them.
                </p>
              </div>

              <Button onClick={handleResetSession} variant="outline" className="mt-4 gap-2">
                <RefreshCw className="w-4 h-4" />
                <span>Start Fresh Peace Room Session</span>
              </Button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-6 text-left">
              <div className="flex items-center justify-between pb-4 border-b border-primary/10 dark:border-white/10">
                <span className="text-xs font-bold tracking-wider text-secondary uppercase">
                  ACTIVE PERSPECTIVE: {identity.toUpperCase()}
                </span>
                {myResponse && (
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> Your side is submitted
                  </span>
                )}
              </div>

              <TextArea
                label="1. What happened?"
                rows={2}
                placeholder="Describe what occurred calmly..."
                value={happened}
                onChange={(e) => setHappened(e.target.value)}
                required
              />

              <TextArea
                label="2. What am I feeling?"
                rows={2}
                placeholder="Share your feelings openly..."
                value={feeling}
                onChange={(e) => setFeeling(e.target.value)}
                required
              />

              <TextArea
                label="3. What I want you to understand"
                rows={2}
                placeholder="Help them understand your heart..."
                value={understand}
                onChange={(e) => setUnderstand(e.target.value)}
                required
              />

              <TextArea
                label="4. I'm sorry for..."
                rows={2}
                placeholder="Acknowledge any misstep..."
                value={sorryFor}
                onChange={(e) => setSorryFor(e.target.value)}
                required
              />

              <TextArea
                label="5. What I want us to do"
                rows={2}
                placeholder="Suggest how we resolve this together..."
                value={wantToDo}
                onChange={(e) => setWantToDo(e.target.value)}
                required
              />

              <Button type="submit" size="lg" className="mt-4 gap-2" fullWidth>
                <Heart className="w-5 h-5 fill-current" />
                <span>Let's Make Peace ❤️</span>
              </Button>
            </form>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
};
