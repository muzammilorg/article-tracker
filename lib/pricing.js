import { getPakistanDateRange } from './date-time.js';
export const pakistanToday = () => new Date(Date.now() + 18000000).toISOString().slice(0, 10);
export function ratesAt(site, date) {
  if (!site?.priceHistory?.length) return { basePrice: site?.basePrice || 0, primeStarPrice: site?.primeStarPrice || 0 };
  return [...site.priceHistory].sort((a,b) => new Date(b.effectiveFrom)-new Date(a.effectiveFrom)).find(r => new Date(r.effectiveFrom) <= new Date(date)) || { basePrice: 0, primeStarPrice: 0 };
}
export function priceAt(site, author, date) {
  const name = author?.trim().toLowerCase();
  if (!name || site?.admins?.some(a => a.trim().toLowerCase() === name)) return 0;
  const rate = ratesAt(site, date);
  return ['prime star','prime star seo'].includes(name) && rate.primeStarPrice > 0 ? rate.primeStarPrice : rate.basePrice || 0;
}
export function addPriceChange(site, input) {
  const effectiveFrom = getPakistanDateRange({date: input.effectiveFrom || pakistanToday()}).startDate;
  if (effectiveFrom > getPakistanDateRange({date: pakistanToday()}).startDate) throw new Error('Choose today or a past date.');
  const rates = {};
  const previous = ratesAt(site, effectiveFrom);
  for (const key of ['basePrice','primeStarPrice']) {
    const value = input[key] === undefined ? previous[key] : input[key];
    if (value === null || value === '' || !['number','string'].includes(typeof value) || !Number.isFinite(Number(value)) || Number(value)<0) throw new Error('Prices must be non-negative numbers.');
    rates[key] = Number(value);
  }
  const history = (site.priceHistory || []).map(r => ({ effectiveFrom: new Date(r.effectiveFrom), basePrice: r.basePrice, primeStarPrice: r.primeStarPrice }));
  if (!history.length) history.push({effectiveFrom: new Date(0), basePrice: site.basePrice || 0, primeStarPrice: site.primeStarPrice || 0});
  const next = history.filter(r => +r.effectiveFrom !== +effectiveFrom);
  next.push({effectiveFrom, ...rates});
  next.sort((a,b) => a.effectiveFrom-b.effectiveFrom);
  return {priceHistory: next, basePrice: next.at(-1).basePrice, primeStarPrice: next.at(-1).primeStarPrice};
}
