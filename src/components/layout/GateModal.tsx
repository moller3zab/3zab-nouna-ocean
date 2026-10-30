import { useEffect, useRef, useState } from 'react';
import { getAuth, sendPasswordResetEmail, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { ArrowRight, Eye, EyeOff, Heart, Loader2, LockKeyhole, Mail } from 'lucide-react';
import app from '../../lib/firebase';
import { isAllowedUser } from '../../config/access';
import { useIdentity } from '../../context/IdentityContext';
import { SanctuaryCharacter, type CharacterMood } from './SanctuaryCharacter';
import './sanctuary-login.css';

export function GateModal({ onCelebrating }: { onCelebrating: (value: boolean) => void }) {
  const { authLoading } = useIdentity();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [mood, setMood] = useState<CharacterMood>('idle');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || authLoading) return;
    setBusy(true); setMessage(''); setError(false); onCelebrating(true);
    try {
      const result = await signInWithEmailAndPassword(getAuth(app), email.trim(), password);
      if (!isAllowedUser(result.user.uid)) { await signOut(getAuth(app)); throw new Error('access-denied'); }
      setMood('success'); setPassword(''); setMessage('You’re home. Our little universe awaits.');
      timer.current = setTimeout(() => onCelebrating(false), 1500);
    } catch (cause) {
      onCelebrating(false); setMood('error'); setError(true); setBusy(false);
      const code = (cause as { code?: string }).code;
      setMessage(code === 'auth/network-request-failed' ? 'Connection lost. Please try again.' : code === 'auth/too-many-requests' ? 'Too many attempts. Please wait a little and try again.' : 'We couldn’t let you in. Check your email and password.');
    }
  };
  const resetPassword = async () => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError(true); setMessage('Enter your email above first.'); return; }
    setBusy(true); setMessage('');
    try { await sendPasswordResetEmail(getAuth(app), email.trim()); setError(false); setMessage('If this email has an account, a reset link is on its way.'); }
    catch { setError(true); setMessage('Couldn’t send the reset link. Please try again later.'); }
    finally { setBusy(false); }
  };
  return <main className="sanctuary-login">
    <div className="sanctuary-stars" aria-hidden="true"/><div className="sanctuary-window" aria-hidden="true"><i/><i/><i/></div><div className="sanctuary-lamp" aria-hidden="true"/>
    <section className="sanctuary-entry" aria-labelledby="sanctuary-title">
      <header className="sanctuary-heading"><p className="sanctuary-eyebrow">Confidential sanctuary</p><h1 id="sanctuary-title">Squidward</h1><p className="sanctuary-subtitle">A private world, just for us.</p></header>
      <SanctuaryCharacter mood={mood} gaze={mood === 'email' ? Math.min(9, email.length / 3) - 4 : 0}/>
      <form className="sanctuary-glass" onSubmit={handleSubmit} aria-busy={busy || authLoading}>
        <label className="sanctuary-field"><span className="sanctuary-field-icon"><Mail size={21}/></span><span className="sr-only">Email address</span><input type="email" autoComplete="username" required placeholder="Email address" value={email} onChange={(e) => setEmail(e.target.value)} onFocus={() => !busy && setMood('email')} onBlur={() => !busy && setMood('idle')} disabled={busy || authLoading}/></label>
        <label className="sanctuary-field"><span className="sanctuary-field-icon"><LockKeyhole size={21}/></span><span className="sr-only">Password</span><input type={showPassword ? 'text' : 'password'} autoComplete="current-password" required placeholder="Password" value={password} onChange={(e) => { setPassword(e.target.value); setMood(e.target.value ? 'password' : 'idle'); }} onFocus={() => !busy && setMood(password ? 'password' : 'idle')} onBlur={() => !busy && setMood('idle')} disabled={busy || authLoading}/><button type="button" className="sanctuary-reveal" aria-label={showPassword ? 'Hide password' : 'Show password'} aria-pressed={showPassword} onClick={() => { setShowPassword(!showPassword); setMood(password ? 'password' : 'idle'); }} disabled={busy || authLoading}>{showPassword ? <Eye size={21}/> : <EyeOff size={21}/>}</button></label>
        <button className="sanctuary-forgot" type="button" onClick={resetPassword} disabled={busy || authLoading}>Forgot password?</button>
        <p className={`sanctuary-message ${error ? 'is-error' : ''}`} role={error ? 'alert' : 'status'} aria-live="polite">{message || (mood === 'password' ? 'Your secret is safe. I’m not looking.' : 'Just you, me, and everything we keep.')}</p>
        <button className="sanctuary-submit" type="submit" disabled={busy || authLoading}><span>{mood === 'success' ? 'Welcome home' : busy ? 'Opening…' : authLoading ? 'One moment…' : 'Login'}</span><span className="sanctuary-submit-icon">{(busy && mood !== 'success') || authLoading ? <Loader2 className="animate-spin" size={23}/> : mood === 'success' ? <Heart size={23}/> : <ArrowRight size={23}/>}</span></button>
        <div className="sanctuary-private"><LockKeyhole size={12}/><span>Only our two accounts. Only our world.</span></div>
      </form>
      <footer className="sanctuary-signoff"><p>Your little universe awaits.</p><Heart size={16} fill="currentColor"/><span/></footer>
    </section>
  </main>;
}
