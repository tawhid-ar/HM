import { useEffect, useRef, useState } from 'react';
import { countRichTextWords, normalizeRichTextForEditor, sanitizeRichText } from '../../lib/richText';
import { useLanguage } from '../../contexts/LanguageContext';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  maxWords?: number;
  error?: string;
}

type Command = 'bold' | 'italic' | 'underline' | 'insertUnorderedList' | 'insertOrderedList' | 'removeFormat';

const toolbarButtons: Array<{ command: Command; label: string; title: string; titleBn: string; className?: string }> = [
  { command: 'bold', label: 'B', title: 'Bold', titleBn: 'বোল্ড', className: 'font-bold' },
  { command: 'italic', label: 'I', title: 'Italic', titleBn: 'ইটালিক', className: 'italic' },
  { command: 'underline', label: 'U', title: 'Underline', titleBn: 'আন্ডারলাইন', className: 'underline' },
  { command: 'insertUnorderedList', label: '• List', title: 'Bulleted list', titleBn: 'বুলেট লিস্ট' },
  { command: 'insertOrderedList', label: '1. List', title: 'Numbered list', titleBn: 'নাম্বার লিস্ট' },
  { command: 'removeFormat', label: 'Clear', title: 'Clear formatting', titleBn: 'ফরম্যাট মুছুন' },
];

export function RichTextEditor({ value, onChange, maxWords = 600, error }: RichTextEditorProps) {
  const { tr } = useLanguage();
  const editorRef = useRef<HTMLDivElement>(null);
  const lastEmittedRef = useRef('');
  const lastValidHtmlRef = useRef('');
  const [wordCount, setWordCount] = useState(() => countRichTextWords(value));
  const [limitReached, setLimitReached] = useState(false);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    if (value === lastEmittedRef.current) return;

    const normalized = normalizeRichTextForEditor(value);
    editor.innerHTML = normalized;
    lastValidHtmlRef.current = normalized;
    setWordCount(countRichTextWords(normalized));
  }, [value]);

  const emitCurrentValue = () => {
    const editor = editorRef.current;
    if (!editor) return;

    const raw = editor.innerHTML;
    const count = countRichTextWords(raw);

    if (count > maxWords) {
      editor.innerHTML = lastValidHtmlRef.current;
      setWordCount(countRichTextWords(lastValidHtmlRef.current));
      setLimitReached(true);
      editor.focus();
      return;
    }

    const cleaned = sanitizeRichText(raw);
    lastValidHtmlRef.current = cleaned;
    lastEmittedRef.current = cleaned;
    setWordCount(count);
    setLimitReached(count >= maxWords);
    onChange(cleaned);
  };

  const runCommand = (command: Command) => {
    editorRef.current?.focus();
    document.execCommand(command, false);
    emitCurrentValue();
  };

  const handlePaste = (event: React.ClipboardEvent<HTMLDivElement>) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text/plain');
    const currentWords = countRichTextWords(editorRef.current?.innerHTML ?? '');
    const remaining = Math.max(0, maxWords - currentWords);

    if (remaining === 0) {
      setLimitReached(true);
      return;
    }

    const chunks = pasted.trim().split(/\s+/u).filter(Boolean);
    const safeText = chunks.slice(0, remaining).join(' ');
    document.execCommand('insertText', false, safeText);
    setLimitReached(chunks.length > remaining);
    emitCurrentValue();
  };

  return (
    <div>
      <div className={`rounded-xl border bg-white overflow-hidden transition-shadow focus-within:ring-2 focus-within:ring-primary-100 ${error ? 'border-red-300' : 'border-gray-200'}`}>
        <div className="flex flex-wrap items-center gap-1 border-b border-gray-100 bg-gray-50 px-2 py-2">
          {toolbarButtons.map((button) => (
            <button
              key={button.command}
              type="button"
              title={tr(button.title, button.titleBn)}
              aria-label={tr(button.title, button.titleBn)}
              className={`min-w-9 h-8 px-2 rounded-lg text-xs text-gray-700 hover:bg-white hover:shadow-sm border border-transparent hover:border-gray-200 ${button.className ?? ''}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => runCommand(button.command)}
            >
              {button.label}
            </button>
          ))}
        </div>

        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-multiline="true"
          aria-label={tr('Product description', 'প্রোডাক্টের বিবরণ')}
          data-placeholder={tr('Write product details...', 'প্রোডাক্টের বিস্তারিত লিখুন...')}
          className="rich-editor min-h-[220px] sm:min-h-[260px] max-h-[360px] overflow-y-auto px-4 py-3 text-sm leading-7 text-gray-800 outline-none"
          onInput={emitCurrentValue}
          onBlur={emitCurrentValue}
          onPaste={handlePaste}
          suppressContentEditableWarning
        />
      </div>

      <div className="mt-1.5 flex items-start justify-between gap-3 text-xs">
        <div>
          {error && <p className="text-red-600">{error}</p>}
          {!error && limitReached && <p className="text-amber-600">{tr(`${maxWords} word limit reached.`, `${maxWords} শব্দের সীমা পূর্ণ হয়েছে।`)}</p>}
        </div>
        <span className={wordCount >= maxWords ? 'font-semibold text-amber-600' : 'text-gray-400'}>
          {wordCount}/{maxWords} {tr('words', 'শব্দ')}
        </span>
      </div>
    </div>
  );
}
