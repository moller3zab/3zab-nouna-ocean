import { useEffect, useState } from 'react';
import { Cloud, CloudOff, RefreshCw, X } from 'lucide-react';

export function ArchiveStatus() {
  const [states, setStates] = useState<Record<string, { status: string; message: string; count?: number }>>({});
  const [writeError, setWriteError] = useState('');
  useEffect(() => {
    const sync = (event: Event) => { const detail = (event as CustomEvent).detail; setStates(previous => ({ ...previous, [detail.name]: detail })); };
    const write = (event: Event) => setWriteError((event as CustomEvent).detail);
    window.addEventListener('ocean-sync', sync); window.addEventListener('ocean-write-error', write);
    return () => { window.removeEventListener('ocean-sync', sync); window.removeEventListener('ocean-write-error', write); };
  }, []);
  const errors = Object.values(states).filter(state => state.status === 'error');
  const pending = Object.values(states).some(state => state.status === 'loading');
  return <>
    <div className={`ocean-sync-status ${errors.length ? 'has-error' : ''}`} role={errors.length ? 'alert' : 'status'} data-record-counts={JSON.stringify(Object.fromEntries(Object.entries(states).filter(([, state]) => state.count !== undefined).map(([name, state]) => [name, state.count])))} data-error-count={errors.length}>
      {errors.length ? <CloudOff size={16}/> : <Cloud size={16}/>}
      <span>{errors.length ? errors[0].message : pending ? 'Opening your private archive…' : 'Connected to your private archive'}</span>
      {!!errors.length && <button onClick={() => location.reload()}><RefreshCw size={13}/> Retry</button>}
    </div>
    {writeError && <div className="ocean-write-error" role="alert"><p>{writeError} Your changes have not been saved.</p><button onClick={() => setWriteError('')} aria-label="Dismiss error"><X size={18}/></button></div>}
  </>;
}
