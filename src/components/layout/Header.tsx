import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, Sun, Moon, Menu, X, ShieldCheck, LogOut } from 'lucide-react';
import { NotificationBell } from '../ui/NotificationBell';
import { useTheme } from '../../context/ThemeContext';
import { useIdentity } from '../../context/IdentityContext';

const NAV_ITEMS = [
  { id: 'our-story', label: 'Our Story' },
  { id: 'countdowns', label: 'Countdowns' },
  { id: 'memories', label: 'Memories' },
  { id: 'soundtrack', label: 'Soundtrack' },
  { id: 'why-i-love-you', label: 'Why I Love You' },
  { id: 'letters', label: 'Letters' },
  { id: 'open-when', label: 'Open When' },
  { id: 'things-21', label: '21 Things' },
  { id: 'favorites', label: 'Favorites' },
  { id: 'our-future', label: 'Our Future' },
  { id: 'our-chat', label: 'Our Chat' },
  { id: 'peace-room', label: 'Peace Room' },
];

export const Header: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const { identity, toggleIdentity, logout } = useIdentity();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="fixed top-0 inset-x-0 z-40 bg-surface/85 dark:bg-surface-dark/85 backdrop-blur-xl border-b border-primary/5 dark:border-white/10 shadow-soft transition-colors">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8">
        <div className="h-20 flex items-center justify-between gap-4">
          
          {/* Logo & Identity */}
          <div className="flex items-center gap-4 shrink-0">
            <a href="#" className="flex flex-col">
              <span className="font-serif text-2xl font-bold tracking-tight text-primary dark:text-surface-bright flex items-center gap-1.5">
                3zab <Heart className="w-4 h-4 text-secondary fill-secondary animate-pulse" /> Nouna
              </span>
              <span className="text-[10px] font-bold tracking-widest uppercase text-ink-subtle dark:text-ink-dark-muted">
                OUR PRIVATE UNIVERSE
              </span>
            </a>

            <div className="hidden xl:flex items-center gap-1.5 bg-surface-container dark:bg-white/10 px-3 py-1 rounded-full text-secondary text-xs">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="font-semibold tracking-wider uppercase text-[10px] text-ink-muted dark:text-ink-dark-muted">
                Sanctuary Unlocked
              </span>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-1 bg-surface-low dark:bg-white/5 p-1.5 rounded-full border border-primary/5 dark:border-white/10 overflow-x-auto max-w-2xl">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => scrollToSection(item.id)}
                className="px-3 py-1 rounded-full text-xs font-medium text-ink-muted dark:text-ink-dark-muted hover:text-primary dark:hover:text-white hover:bg-surface-high dark:hover:bg-white/10 transition-all whitespace-nowrap"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            
            {/* Identity Switcher Pill */}
            <div className="flex items-center bg-surface-high dark:bg-white/10 p-1 rounded-full">
              <button
                type="button"
                onClick={toggleIdentity}
                className="px-3 py-1 rounded-full bg-primary dark:bg-primary-container text-white text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-all"
              >
                <Heart className="w-3 h-3 fill-current" />
                <span>{identity}</span>
              </button>
            </div>

            <button type="button" onClick={() => void logout()} aria-label="Sign out" className="w-9 h-9 rounded-full flex items-center justify-center text-secondary"><LogOut className="w-4 h-4" /></button>
            {/* Notification Bell */}
            <NotificationBell />

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle theme"
              className="w-9 h-9 rounded-full bg-surface-low dark:bg-white/10 flex items-center justify-center text-ink-muted dark:text-surface-bright hover:bg-surface-high dark:hover:bg-white/20 transition-all"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-primary" />}
            </button>


          </div>
        </div>
      </div>

    </header>
  );
};
