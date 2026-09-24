const ALLOWED_TAGS = new Set([
  'P',
  'DIV',
  'BR',
  'STRONG',
  'B',
  'EM',
  'I',
  'U',
  'UL',
  'OL',
  'LI',
]);

function stripHtmlFallback(value: string) {
  return value
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
}

export function richTextToPlainText(value: string) {
  if (!value) return '';
  if (typeof document === 'undefined') return stripHtmlFallback(value);
  const el = document.createElement('div');
  el.innerHTML = value;
  return el.innerText || el.textContent || '';
}

export function countRichTextWords(value: string) {
  const plain = richTextToPlainText(value).trim();
  if (!plain) return 0;
  return plain.split(/\s+/u).filter(Boolean).length;
}

export function sanitizeRichText(value: string) {
  if (!value) return '';
  if (typeof DOMParser === 'undefined') return value;

  const doc = new DOMParser().parseFromString(`<div>${value}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return '';

  const cleanElement = (element: Element) => {
    Array.from(element.children).forEach(cleanElement);

    if (!ALLOWED_TAGS.has(element.tagName)) {
      element.replaceWith(...Array.from(element.childNodes));
      return;
    }

    Array.from(element.attributes).forEach((attr) => element.removeAttribute(attr.name));
  };

  Array.from(root.children).forEach(cleanElement);
  return root.innerHTML.trim();
}

export function normalizeRichTextForEditor(value: string | null | undefined) {
  if (!value) return '';
  const looksLikeHtml = /<\/?(?:p|div|br|strong|b|em|i|u|ul|ol|li)\b/i.test(value);
  if (looksLikeHtml) return sanitizeRichText(value);

  const escaped = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

  return escaped.replace(/\r?\n/g, '<br>');
}
