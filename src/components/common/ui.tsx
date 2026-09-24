import { useEffect, type ReactNode } from 'react';
import logoIcon from '../../assets/logo-icon-transparent.png';
import { useLanguage } from '../../contexts/LanguageContext';

/** Small branded spinner used inline (buttons, inline loading states). */
export function Spinner({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={`animate-spin ${className}`} viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/** Full-section loading state — replaces the bare "লোড হচ্ছে..." text everywhere. */
export function PageLoader({ label }: { label?: string }) {
  const { tr } = useLanguage();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-primary-700">
      <Spinner className="w-8 h-8" />
      <p className="text-sm text-gray-500">{label ?? tr('Loading...', 'লোড হচ্ছে...')}</p>
    </div>
  );
}

/** Friendly empty/error placeholder with an optional action slot. */
export function EmptyState({
  icon = '🛍️',
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center gap-2 py-20 px-4">
      <div className="text-5xl mb-2">{icon}</div>
      <h3 className="font-display font-semibold text-lg text-gray-800">{title}</h3>
      {description && <p className="text-sm text-gray-500 max-w-sm">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

const BADGE_TONES: Record<string, string> = {
  gray: 'bg-gray-100 text-gray-700',
  yellow: 'bg-amber-100 text-amber-800',
  indigo: 'bg-indigo-100 text-indigo-800',
  blue: 'bg-blue-100 text-blue-800',
  purple: 'bg-purple-100 text-purple-800',
  green: 'bg-primary-100 text-primary-800',
  red: 'bg-red-100 text-red-700',
  orange: 'bg-accent-100 text-accent-800',
};

export function Badge({ tone = 'gray', children }: { tone?: keyof typeof BADGE_TONES; children: ReactNode }) {
  return <span className={`badge ${BADGE_TONES[tone] ?? BADGE_TONES.gray}`}>{children}</span>;
}

/** Brand mark — icon-only, used in navbars/sidebars where space is tight. */
export function LogoMark({ className = 'w-9 h-9' }: { className?: string }) {
  return <img src={logoIcon} alt="Hadia Mart" className={`${className} object-contain drop-shadow-sm`} />;
}


interface ModalShellProps {
  children: ReactNode;
  onClose: () => void;
  maxWidthClass?: string;
  panelClassName?: string;
  contentClassName?: string;
  labelledBy?: string;
}

/**
 * Shared modal shell used across the dashboard.
 * Keeps all four corners rounded even when the body scrolls and exposes a
 * persistent close control in the top-right corner on phone, tablet and PC.
 */
export function ModalShell({
  children,
  onClose,
  maxWidthClass = 'max-w-lg',
  panelClassName = '',
  contentClassName = 'p-4 pt-14 sm:p-6 sm:pt-14',
  labelledBy,
}: ModalShellProps) {
  const { tr } = useLanguage();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKeyDown);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4 animate-fade-in"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={`relative w-full ${maxWidthClass} max-h-[calc(100dvh-1.5rem)] overflow-hidden rounded-2xl bg-white shadow-popover sm:max-h-[92vh] ${panelClassName}`}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-30 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-xl font-medium leading-none text-gray-500 shadow-sm transition hover:bg-gray-50 hover:text-gray-900 focus:outline-none focus:ring-4 focus:ring-primary-100 sm:right-4 sm:top-4"
          aria-label={tr('Close', 'বন্ধ করুন')}
          title={tr('Close', 'বন্ধ করুন')}
        >
          ×
        </button>

        <div className={`max-h-[calc(100dvh-1.5rem)] overflow-y-auto overscroll-contain sm:max-h-[92vh] ${contentClassName}`}>
          {children}
        </div>
      </div>
    </div>
  );
}
