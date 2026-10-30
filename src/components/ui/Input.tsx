import React, { useId } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
  const generatedId = useId();
  const id = props.id || generatedId;
  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-ink-dark-muted">
          {label}
        </label>
      )}
      <input
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl bg-surface-low dark:bg-white/5 border border-primary/10 dark:border-white/10 text-ink dark:text-surface-bright placeholder:text-ink-subtle/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className = '', ...props }) => {
  const generatedId = useId();
  const id = props.id || generatedId;
  return (
    <div className="w-full flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={id} className="text-xs font-semibold uppercase tracking-wider text-ink-subtle dark:text-ink-dark-muted">
          {label}
        </label>
      )}
      <textarea
        id={id}
        className={`w-full px-4 py-2.5 rounded-xl bg-surface-low dark:bg-white/5 border border-primary/10 dark:border-white/10 text-ink dark:text-surface-bright placeholder:text-ink-subtle/60 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-red-500 font-medium">{error}</span>}
    </div>
  );
};
