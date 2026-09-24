export type ReportPeriod = 'month' | 'year';
export function reportRange(period: ReportPeriod, month: string, year: number) {
  if (period === 'year') return { from: `${year}-01-01`, to: `${year}-12-31` };
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: `${y}-${String(m).padStart(2, '0')}-${String(last).padStart(2, '0')}` };
}
