import { OceanInterlude } from './components/ui/OceanInterlude';
import { OceanBackdrop } from './components/ui/OceanBackdrop';
import { PhotoViewer } from './components/ui/PhotoViewer';
import React, { useState } from 'react';
import { ArchiveProvider } from './context/ArchiveContext';
import { ArchiveStatus } from './components/ui/ArchiveStatus';
import { Footer } from './components/layout/Footer';
import './ocean.css';
import { ThemeProvider } from './context/ThemeContext';
import { IdentityProvider, useIdentity } from './context/IdentityContext';
import { Header } from './components/layout/Header';
import { GateModal } from './components/layout/GateModal';
import { HeroSection } from './components/sections/HeroSection';
import { TimelineSection } from './components/sections/TimelineSection';
import { MemoriesSection } from './components/sections/MemoriesSection';
import { SoundtrackSection } from './components/sections/SoundtrackSection';
import { LoveReasonsSection } from './components/sections/LoveReasonsSection';
import { LettersSection } from './components/sections/LettersSection';
import { OpenWhenSection } from './components/sections/OpenWhenSection';
import { Things21Section } from './components/sections/Things21Section';
import { FavoritesSection } from './components/sections/FavoritesSection';
import { FutureSection } from './components/sections/FutureSection';
import { ChatSection } from './components/sections/ChatSection';
import { PeaceRoomSection } from './components/sections/PeaceRoomSection';
import { FinalVideoSection } from './components/sections/FinalVideoSection';
import { CountdownSection } from './components/sections/CountdownSection';
import { ScrollReveal } from './components/ui/ScrollReveal';
import { MoodWidget } from './components/ui/MoodWidget';

export const AppContent: React.FC = () => {
  const { isUnlocked } = useIdentity();
  const [celebrating, setCelebrating] = useState(false);
  if (!isUnlocked || celebrating) return <GateModal onCelebrating={setCelebrating} />;
  return (
    <ArchiveProvider><div className="ocean-world min-h-screen bg-surface dark:bg-surface-dark text-ink dark:text-ink-dark transition-colors duration-300 relative selection:bg-secondary-light selection:text-primary">
      <OceanBackdrop />
      <Header />
      <ArchiveStatus />
      <main className="max-w-[1200px] mx-auto px-4 sm:px-8 space-y-12 overflow-hidden">

        <ScrollReveal><HeroSection /></ScrollReveal>
        <section id="mood" className="ocean-mood"><p className="ocean-eyebrow">FEELING THE SAME TIDE</p><h2>Atmospheric Mood Sync</h2><MoodWidget /></section>
        <ScrollReveal><CountdownSection /></ScrollReveal>
        <ScrollReveal><TimelineSection /></ScrollReveal>
        <OceanInterlude kind="house"/>
        <ScrollReveal><MemoriesSection /></ScrollReveal>
        <ScrollReveal><SoundtrackSection /></ScrollReveal>
        <ScrollReveal><LoveReasonsSection /></ScrollReveal>
        <ScrollReveal><LettersSection /></ScrollReveal>
        <OceanInterlude kind="note"/>
        <ScrollReveal><OpenWhenSection /></ScrollReveal>
        <ScrollReveal><Things21Section /></ScrollReveal>
        <ScrollReveal><FavoritesSection /></ScrollReveal>
        <ScrollReveal><FutureSection /></ScrollReveal>
        <OceanInterlude kind="squidward"/>
        <ScrollReveal><ChatSection /></ScrollReveal>
        <ScrollReveal><PeaceRoomSection /></ScrollReveal>
        <FinalVideoSection />
      </main>
      <Footer />
      <PhotoViewer />
      <div className="ocean-bubbles" aria-hidden="true"><i/><i/><i/><i/></div>
    </div></ArchiveProvider>
  );
};

export function App() {
  return (
    <ThemeProvider>
      <IdentityProvider>
        <AppContent />
      </IdentityProvider>
    </ThemeProvider>
  );
}

export default App;
