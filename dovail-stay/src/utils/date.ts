const DATE_ONLY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})/;

export function parseCalendarDate(value?: string | null): Date | null {
  if (!value) return null;

  const match = value.trim().match(DATE_ONLY_PATTERN);
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day, 12);

    if (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date;
    }

    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function startOfLocalDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isTodayOrFuture(value?: string | null): boolean {
  const date = parseCalendarDate(value);
  return Boolean(date && date.getTime() >= startOfLocalDay().getTime());
}

export function toApiDate(value?: string | null): string {
  const date = parseCalendarDate(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(
  value?: string | null,
  fallback = "Date unavailable"
): string {
  const date = parseCalendarDate(value);
  if (!date) return fallback;

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
