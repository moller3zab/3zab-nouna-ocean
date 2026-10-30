import React from 'react';
import { Heart, ArrowUp } from 'lucide-react';

export const Footer: React.FC = () => {
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer className="w-full py-12 bg-surface-low dark:bg-surface-dark-card border-t border-primary/10 dark:border-white/10 mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-8 flex flex-col items-center justify-center text-center gap-4">
        
        {/* Monogram */}
        <div className="font-serif text-3xl font-bold text-primary dark:text-surface-bright flex items-center gap-2">
          3zab <Heart className="w-5 h-5 text-secondary fill-secondary animate-pulse" /> Nouna
        </div>

        <div className="text-xs font-bold tracking-widest text-ink-subtle uppercase">
          OUR LITTLE UNIVERSE
        </div>

        <p className="font-serif italic text-lg text-ink-muted dark:text-ink-dark-muted max-w-md">
          "And this is only the beginning." ❤️
        </p>

        {/* Scroll Top Button */}
        <button
          onClick={scrollToTop}
          className="mt-4 px-4 py-2 rounded-full bg-surface-lowest dark:bg-white/10 text-ink dark:text-surface-bright text-xs font-semibold shadow-soft hover:bg-primary hover:text-white dark:hover:bg-primary-container transition-all flex items-center gap-1.5"
        >
          <span>Return to Sanctuary Top</span>
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        <span className="text-[10px] text-ink-subtle/50 mt-4">
          Our Private Digital World • Ahmed & Anfal Forever
        </span>
      </div>
    </footer>
  );
};
