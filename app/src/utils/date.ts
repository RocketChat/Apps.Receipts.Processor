export function toDateString(date: string | Date): string {
  let d: Date;

  if (date instanceof Date) {
    d = date;
  } else if (typeof date === "string") {
    const trimmed = date.trim();
    d = parseFlexibleDate(trimmed);
  } else {
    d = new Date();
  }

  if (isNaN(d.getTime())) {
    d = new Date();
  }

  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function normalizeYear(year: number): number {
  if (year >= 100) return year;
  const currentYearShort = new Date().getFullYear() % 100;
  return year <= currentYearShort + 10 ? 2000 + year : 1900 + year;
}

function isValidDate(d: Date): boolean {
  if (isNaN(d.getTime())) return false;
  const year = d.getFullYear();
  return year >= 1900 && year <= 2100;
}

const MONTH_MAP: Record<string, number> = {
  jan: 0, january: 0,
  feb: 1, february: 1,
  mar: 2, march: 2,
  apr: 3, april: 3,
  may: 4,
  jun: 5, june: 5,
  jul: 6, july: 6,
  aug: 7, august: 7,
  sep: 8, sept: 8, september: 8,
  oct: 9, october: 9,
  nov: 10, november: 10,
  dec: 11, december: 11,
};

function parseMonthName(name: string): number | null {
  const normalized = name.toLowerCase().replace(/\.$/, '');
  return MONTH_MAP[normalized] ?? null;
}

function parseFlexibleDate(input: string): Date {
  let cleaned = input.trim();

  cleaned = cleaned.replace(/(\d+)(st|nd|rd|th)\b/gi, '$1');

  const isoMatch = cleaned.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})(?:T|$|\s)/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    const d = new Date(year, month - 1, day);
    if (isValidDate(d)) return d;
  }

  const dmy = cleaned.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/);
  if (dmy) {
    const first = parseInt(dmy[1], 10);
    const second = parseInt(dmy[2], 10);
    let year = normalizeYear(parseInt(dmy[3], 10));

    let day: number, month: number;

    if (first > 12 && second <= 12) {
      day = first;
      month = second;
    } else if (second > 12 && first <= 12) {
      month = first;
      day = second;
    } else {
      day = first;
      month = second;
    }

    const d = new Date(year, month - 1, day);
    if (isValidDate(d) && d.getDate() === day) return d;
  }

  const dayMonthYear = cleaned.match(/^(\d{1,2})\s+([a-zA-Z]+)\s+(\d{2,4})$/);
  if (dayMonthYear) {
    const day = parseInt(dayMonthYear[1], 10);
    const month = parseMonthName(dayMonthYear[2]);
    const year = normalizeYear(parseInt(dayMonthYear[3], 10));

    if (month !== null) {
      const d = new Date(year, month, day);
      if (isValidDate(d)) return d;
    }
  }

  const monthDayYear = cleaned.match(/^([a-zA-Z]+)\s+(\d{1,2}),?\s+(\d{2,4})$/);
  if (monthDayYear) {
    const month = parseMonthName(monthDayYear[1]);
    const day = parseInt(monthDayYear[2], 10);
    const year = normalizeYear(parseInt(monthDayYear[3], 10));

    if (month !== null) {
      const d = new Date(year, month, day);
      if (isValidDate(d)) return d;
    }
  }

  const yearMonthDay = cleaned.match(/^(\d{4})\s+([a-zA-Z]+)\s+(\d{1,2})$/);
  if (yearMonthDay) {
    const year = parseInt(yearMonthDay[1], 10);
    const month = parseMonthName(yearMonthDay[2]);
    const day = parseInt(yearMonthDay[3], 10);

    if (month !== null) {
      const d = new Date(year, month, day);
      if (isValidDate(d)) return d;
    }
  }

  const compact8 = cleaned.match(/^(\d{2})(\d{2})(\d{4})$/);
  if (compact8) {
    const day = parseInt(compact8[1], 10);
    const month = parseInt(compact8[2], 10);
    const year = parseInt(compact8[3], 10);
    const d = new Date(year, month - 1, day);
    if (isValidDate(d) && d.getDate() === day) return d;
  }

  const compact6 = cleaned.match(/^(\d{2})(\d{2})(\d{2})$/);
  if (compact6) {
    const day = parseInt(compact6[1], 10);
    const month = parseInt(compact6[2], 10);
    const year = normalizeYear(parseInt(compact6[3], 10));
    const d = new Date(year, month - 1, day);
    if (isValidDate(d) && d.getDate() === day) return d;
  }

  const nativeParsed = Date.parse(cleaned);
  if (!isNaN(nativeParsed)) {
    const d = new Date(nativeParsed);
    if (isValidDate(d)) return d;
  }

  const originalParsed = Date.parse(input);
  if (!isNaN(originalParsed)) {
    const d = new Date(originalParsed);
    if (isValidDate(d)) return d;
  }

  return new Date();
}

export function formatDateDDMMYY(dateStr: string): string {
  const date = new Date(dateStr);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear()).slice(-2);

  return `${day}-${month}-${year}`;
}
