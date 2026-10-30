import { PushSubscription } from '../ui/PushSubscription';
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Heart, Sparkles, MessageCircle, Edit3, Trash2, X } from 'lucide-react';
import type { ChatMessage } from '../../types';
import { INITIAL_MESSAGES } from '../../data/initialData';
import { subscribeCollection, addItem, updateItem, removeItem } from '../../lib/store';
import { useIdentity } from '../../context/IdentityContext';

export const ChatSection: React.FC = () => {
  const { identity } = useIdentity();
  const [messages, setMessages] = useState<ChatMessage[]>(INITIAL_MESSAGES);
  const [text, setText] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (location.hash === '#our-chat') requestAnimationFrame(() => document.getElementById('our-chat')?.scrollIntoView());
  }, []);

  useEffect(() => {
    const unsub = subscribeCollection<ChatMessage>('messages', INITIAL_MESSAGES, (data) => {
      // Sort oldest to newest for chat
      const sorted = [...data].sort((a, b) => a.createdAt - b.createdAt);
      setMessages(sorted);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    try {
    e.preventDefault();
    if (!text.trim()) return;

    if (editingId) { await updateItem('messages', editingId, { text: text.trim() }); setEditingId(null); setText(''); return; }
    const msg = text;

    const id = await addItem<Partial<ChatMessage>>('messages', {
      sender: identity,
      text: msg,
    });

    setText('');
    // Send notification
    import('../../lib/store').then(({ addNotification }) => {
      addNotification({
        type: 'chat',
        message: `${identity === '3zab' ? 'أحمد' : 'أنفال'}: ${msg.length > 20 ? msg.substring(0, 20) + '...' : msg}`,
        linkId: id,
        isRead: false,
        createdAt: Date.now()
      });
    });
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  return (
    <section id="our-chat" className="py-16 flex flex-col gap-8 scroll-mt-24">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <span className="text-xs font-bold tracking-widest text-secondary uppercase block mb-1">
          PRIVATE REALTIME MESSAGING
        </span>
        <h2 className="font-serif text-3xl sm:text-4xl font-bold text-primary dark:text-surface-bright tracking-tight">
          Our Abyssal Chatter
        </h2>
        <p className="text-sm text-ink-muted dark:text-ink-dark-muted mt-1">
          A secluded space for quiet hellos, love notes, and late-night whispers.
        </p>
      </div>

      <PushSubscription />
      {/* Chat Container Box */}
      <div className="max-w-2xl mx-auto w-full bg-surface-lowest dark:bg-surface-dark-card rounded-3xl shadow-elevated border border-primary/10 dark:border-white/10 flex flex-col h-[500px] overflow-hidden">
        
        {/* Top Chat Bar */}
        <div className="px-6 py-4 border-b border-primary/10 dark:border-white/10 bg-surface-low dark:bg-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-serif font-bold text-sm text-primary dark:text-surface-bright">
              3zab ♡ Nouna Connected
            </span>
          </div>
          <span className="text-xs font-bold text-secondary uppercase">
            Active as {identity}
          </span>
        </div>

        {/* Message Stream */}
        <div ref={chatContainerRef} className="flex-1 p-6 overflow-y-auto space-y-4 bg-surface/50 dark:bg-black/20">
          {messages.map((msg) => {
            const isMe = msg.sender === identity;

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center gap-1.5 mb-1 text-[10px] font-bold text-ink-subtle uppercase">
                  <span>{msg.sender}</span>
                  <span>•</span>
                  <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>

                <div
                  className={`max-w-xs sm:max-w-md px-4 py-3 rounded-2xl text-sm font-sans leading-relaxed shadow-soft ${
                    isMe
                      ? 'bg-primary text-white rounded-br-none dark:bg-primary-container'
                      : 'bg-surface-low dark:bg-white/10 text-ink dark:text-surface-bright rounded-bl-none border border-primary/5'
                  }`}
                >
                  {msg.imageUrl && <img src={msg.imageUrl} alt="Shared photo" className="mb-2 max-h-64 rounded-lg"/>}
                  {msg.text}
                  <div className="flex justify-end gap-2 mt-2">
                    <button type="button" aria-label="Edit message" onClick={() => { setText(msg.text || ''); setEditingId(msg.id); }}><Edit3 size={13}/></button>
                    <button type="button" aria-label="Delete message" onClick={async () => { if (!confirm('Delete this message?')) return; try { await removeItem('messages', msg.id); if (editingId === msg.id) { setEditingId(null); setText(''); } } catch (error) { console.error(error); } }}><Trash2 size={13}/></button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Chat Input Form */}
        <form onSubmit={handleSend} className="p-4 border-t border-primary/10 dark:border-white/10 bg-surface-low dark:bg-white/5 flex items-center gap-2">
          <input
            aria-label="Message"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Type a private message as ${identity}...`}
            className="flex-1 px-4 py-2.5 rounded-xl bg-surface-lowest dark:bg-white/5 border border-primary/10 dark:border-white/10 text-sm text-ink dark:text-surface-bright placeholder:text-ink-subtle focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
          {editingId && <button type="button" aria-label="Cancel message edit" onClick={() => { setEditingId(null); setText(''); }}><X size={18}/></button>}
          <button
            aria-label={editingId ? 'Save message' : 'Send message'}
            disabled={!text.trim()}
            type="submit"
            className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-md hover:bg-primary-container transition-colors shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
};
