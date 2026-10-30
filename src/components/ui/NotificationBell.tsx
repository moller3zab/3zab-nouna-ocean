import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Trash2, ChevronRight } from 'lucide-react';
import { subscribeCollection, removeNotification, markNotificationRead } from '../../lib/store';
import type { Notification as AppNotification } from '../../types';

const SECTION_MAP: Record<string, string> = {
  memory: 'memories',
  song: 'soundtrack',
  reason: 'why-i-love-you',
  letter: 'letters',
  open_when: 'open-when',
  thing21: 'things-21',
  favorite: 'favorites',
  future: 'our-future',
  chat: 'our-chat',
};

export const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsub = subscribeCollection<AppNotification>('notifications', [], setNotifications);
    return () => unsub();
  }, []);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleNavigate = async (notif: AppNotification) => {
    if (!notif.isRead) { try { await markNotificationRead(notif.id); } catch { return; } }
    const sectionId = SECTION_MAP[notif.type] || 'memories';
    const el = document.getElementById(sectionId);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
    setOpen(false);
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    try {
    e.stopPropagation();
    await removeNotification(id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const handleClearAll = async () => {
    try {
    for (const n of notifications) {
      await removeNotification(n.id);
    }
    setNotifications([]);
  
    } catch (error) { console.error('Archive operation failed:', error); }
  };

  const formatTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'الآن';
    if (mins < 60) return `منذ ${mins} دقيقة`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `منذ ${hrs} ساعة`;
    const days = Math.floor(hrs / 24);
    return `منذ ${days} يوم`;
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-full bg-surface-low dark:bg-white/10 flex items-center justify-center text-ink-muted dark:text-surface-bright hover:bg-surface-high dark:hover:bg-white/20 transition-all relative"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-secondary text-white text-[9px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] shadow-sm"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-12 w-72 sm:w-80 bg-surface-lowest dark:bg-surface-dark-card rounded-2xl border border-primary/10 dark:border-white/10 shadow-elevated overflow-hidden z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-primary/5 dark:border-white/5">
              <h3 className="text-sm font-bold text-ink dark:text-surface-bright">
                الجديد <span className="text-secondary">({notifications.length})</span>
              </h3>
              {notifications.length > 0 && (
                <button onClick={handleClearAll} className="text-[10px] font-semibold text-ink-subtle hover:text-secondary transition-colors uppercase tracking-wider">
                  مسح الكل
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-64 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-ink-subtle dark:text-ink-dark-muted">
                  لا توجد إشعارات جديدة ✨
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNavigate(notif)}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-surface-low dark:hover:bg-white/5 cursor-pointer transition-colors border-b border-primary/5 dark:border-white/5 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink dark:text-surface-bright truncate">{notif.message}</p>
                      <p className="text-[10px] text-ink-subtle dark:text-ink-dark-muted mt-0.5">{formatTime(notif.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={(e) => handleDelete(e, notif.id)}
                        className="w-6 h-6 rounded-full hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center text-ink-subtle hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                      <ChevronRight className="w-3 h-3 text-ink-subtle" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
