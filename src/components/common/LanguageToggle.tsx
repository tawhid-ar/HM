import { useLanguage } from '../../contexts/LanguageContext';

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div
      className={`inline-flex items-center rounded-full border border-gray-200 bg-white p-1 shadow-sm ${
        compact ? 'text-[11px]' : 'text-xs'
      }`}
      role="group"
      aria-label="Language"
    >
      <button
        type="button"
        onClick={() => setLanguage('en')}
        aria-pressed={language === 'en'}
        className={`rounded-full px-2.5 py-1.5 font-semibold transition-all ${
          language === 'en'
            ? 'bg-primary-700 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLanguage('bn')}
        aria-pressed={language === 'bn'}
        className={`rounded-full px-2.5 py-1.5 font-semibold transition-all ${
          language === 'bn'
            ? 'bg-primary-700 text-white shadow-sm'
            : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
        }`}
      >
        বাংলা
      </button>
    </div>
  );
}
