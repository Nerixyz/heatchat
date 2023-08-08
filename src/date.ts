import { RecordedDays } from './worker/messages';
import { createElement } from './dom';
import { AvailableLog, availableLogNextMonth, availableLogToDate } from './justlog';

const MONTH_MAP = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function* months(start: Date, end: Date) {
  while (start < end) {
    yield new Date(start);
    start.setUTCMonth(start.getUTCMonth() + 1);
  }
}

function* monthNames(start: Date, end: Date) {
  for (const date of months(start, end)) {
    yield MONTH_MAP[date.getUTCMonth()] as string;
  }
}

export function generateMonthNames(host: HTMLDivElement, start: Date, end: Date) {
  for (const name of monthNames(start, end)) {
    const el = document.createElement('div');
    el.classList.add('month-name');
    el.textContent = name;
    host.append(el);
  }
}

export function daysInMonth(log: AvailableLog): number {
  const start = Number(availableLogToDate(log));
  const end = Number(availableLogNextMonth(log));
  return (end - start) / (1000 * 60 * 60 * 24);
}

export function daysInDateMonth(date: Date): number {
  const start = Date.UTC(date.getUTCFullYear(), date.getUTCMonth());
  const end = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1);
  return (end - start) / (1000 * 60 * 60 * 24);
}

export function logMonthID(log: AvailableLog): number {
  return (Number(log.year) << 5) | (Number(log.month) - 1);
}

export function dateMonthID(date: Date): number {
  return (Number(date.getUTCFullYear()) << 5) | Number(date.getUTCMonth());
}

export function generateMonthVisuals(host: HTMLDivElement, start: Date, end: Date): Map<number, HTMLDivElement> {
  const days = new Map<number, HTMLDivElement>();
  let year = 0;
  for (const date of months(start, end)) {
    if (year != date.getUTCFullYear()) {
      const yearName = createElement('div', 'year-name');
      yearName.textContent = date.getUTCFullYear().toString();

      host.append(yearName);
      if (year === 0 && date.getUTCMonth() != 0) {
        const filler = createElement('div', 'filler');
        filler.style.setProperty('--span', date.getUTCMonth().toString());
        host.append(filler);
      }

      year = date.getUTCFullYear();
    }
    generateMonthVisual(host, start, days);
  }
  return days;
}

export function updateDays(days: Map<number, HTMLDivElement>, recorded: RecordedDays) {
  for (const [key, value] of recorded.days) {
    const el = days.get(key);
    if (el) {
      el.style.setProperty('--intensity', (value / recorded.maxAmount).toString());
    } else {
      console.log('no month', key, new Date(key));
    }
  }
}

const DT_FORMAT = new Intl.DateTimeFormat(undefined, { dateStyle: 'long' });
function generateMonthVisual(host: HTMLDivElement, start: Date, days: Map<number, HTMLDivElement>) {
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  end.setUTCHours(0, 0, 0, 0);
  start.setUTCHours(0, 0, 0, 0);

  const wrapper = createElement('div', 'month');

  const monthName = createElement('div', 'month-name');
  monthName.textContent = MONTH_MAP[start.getUTCMonth()] as string;

  const monthEl = createElement('div', 'month-visual');

  wrapper.append(monthEl, monthName);
  host.append(wrapper);

  const day = new Date(start);

  const startEl = createElement('div', 'day', `start-day-${day.getUTCDay()}`);
  monthEl.append(startEl);
  days.set(Number(day), startEl);

  day.setUTCDate(day.getUTCDate() + 1);
  for (; day < end; day.setUTCDate(day.getUTCDate() + 1)) {
    if (day.getUTCHours() != 0) {
      day.setUTCHours(0, 0, 0, 0);
    }

    const el = createElement('div', 'day');
    el.style.setProperty('--date', `'${DT_FORMAT.format(day)}'`);
    monthEl.append(el);
    days.set(Number(day), el);
  }
}
