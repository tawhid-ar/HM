export function normalizeBangladeshPhone(value: string) {
  const compact = value.replace(/[\s()-]/g, '');
  if (/^01[3-9]\d{8}$/.test(compact)) return `+88${compact}`;
  if (/^8801[3-9]\d{8}$/.test(compact)) return `+${compact}`;
  if (/^\+8801[3-9]\d{8}$/.test(compact)) return compact;
  return null;
}

export function isBangladeshPhone(value: string) {
  return normalizeBangladeshPhone(value) !== null;
}
