const PAKISTAN_TIMEZONE_OFFSET_MINUTES = 5 * 60;

export function getPakistanDateRange({ date, month }) {
  if (date && month) {
    throw new RangeError('Choose either a date or a month.');
  }

  if (date) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      throw new RangeError('Invalid date format.');
    }

    const utcMidnight = new Date(`${date}T00:00:00.000Z`);
    if (Number.isNaN(utcMidnight.getTime()) || utcMidnight.toISOString().slice(0, 10) !== date) {
      throw new RangeError('Invalid date.');
    }

    const startDate = new Date(utcMidnight.getTime() - PAKISTAN_TIMEZONE_OFFSET_MINUTES * 60_000);
    const endDate = new Date(utcMidnight.getTime() + 24 * 60 * 60_000 - PAKISTAN_TIMEZONE_OFFSET_MINUTES * 60_000);
    return { startDate, endDate };
  }

  if (month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      throw new RangeError('Invalid month format.');
    }

    const [year, monthNumber] = month.split('-').map(Number);
    const startDate = new Date(Date.UTC(year, monthNumber - 1, 1) - PAKISTAN_TIMEZONE_OFFSET_MINUTES * 60_000);
    const endDate = new Date(Date.UTC(year, monthNumber, 1) - PAKISTAN_TIMEZONE_OFFSET_MINUTES * 60_000);
    return { startDate, endDate };
  }

  return null;
}

export function parsePublishedAt(value, fallback = new Date()) {
  if (!value) return fallback;

  const input = String(value).trim();
  const hasTimezone = /(?:z|[+-]\d{2}:?\d{2}|gmt|utc|ut|est|edt|cst|cdt|mst|mdt|pst|pdt)$/i.test(input);
  const normalized = hasTimezone
    ? input
    : /^\d{4}-\d{2}-\d{2}$/.test(input)
      ? `${input}T00:00:00+05:00`
      : /^[a-z]{3},/i.test(input)
        ? `${input} +0500`
        : `${input}+05:00`;
  const parsed = new Date(normalized);

  if (Number.isNaN(parsed.getTime())) {
    throw new RangeError(`Invalid publication date: ${input}`);
  }

  return parsed;
}

export function formatPakistanDate(value, options) {
  return new Intl.DateTimeFormat('en-US', {
    ...options,
    timeZone: 'Asia/Karachi',
  }).format(new Date(value));
}
