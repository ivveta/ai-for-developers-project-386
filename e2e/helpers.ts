import { Pool } from 'pg';

const TEST_DB_URL =
  process.env.TEST_DATABASE_URL ?? 'postgres://calendar:calendar@localhost:5434/calendar_test';
const API_BASE = 'http://localhost:3000';

const pool = new Pool({ connectionString: TEST_DB_URL });

export async function resetDb(): Promise<void> {
  await pool.query('TRUNCATE booking, event_type RESTART IDENTITY CASCADE');
}

export async function seedDefaults(): Promise<void> {
  await createEventType({ id: 'meeting-15', title: 'Встреча 15 минут', description: 'Короткий тип события для быстрого слота.', durationMinutes: 15 });
  await createEventType({ id: 'meeting-30', title: 'Встреча 30 минут', description: 'Базовый тип события для бронирования.', durationMinutes: 30 });
}

export async function createEventType(data: {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}): Promise<Response> {
  return fetch(`${API_BASE}/api/event-types`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function createBooking(data: {
  eventTypeId: string;
  startAt: string;
  guestName: string;
  guestEmail: string;
  notes?: string;
}): Promise<Response> {
  return fetch(`${API_BASE}/api/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function closePool(): Promise<void> {
  await pool.end();
}

/**
 * Сегодняшний день в Europe/Moscow в формате YYYY-MM-DD.
 */
export function todayMsk(): string {
  return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Moscow' }).format(new Date());
}

/**
 * День со сдвигом от сегодня в Europe/Moscow в формате YYYY-MM-DD.
 */
function mskDateOffset(days: number): string {
  const now = new Date();
  const msk = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));
  msk.setDate(msk.getDate() + days);
  const y = msk.getFullYear();
  const m = String(msk.getMonth() + 1).padStart(2, '0');
  const d = String(msk.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Завтрашний день в Europe/Moscow в формате YYYY-MM-DD.
 */
export function tomorrowMsk(): string {
  return mskDateOffset(1);
}

/**
 * Послезавтрашний день в Europe/Moscow в формате YYYY-MM-DD.
 */
export function dayAfterTomorrowMsk(): string {
  return mskDateOffset(2);
}

/**
 * Получить первый свободный слот для типа события из API.
 * Возвращает { date, startAt, dayNumber, timeText }.
 * timeText — часы в формате "HH:MM" для поиска кнопки слота.
 */
export async function findFreeSlot(
  eventTypeId: string,
  opts?: { date?: string },
): Promise<{ date: string; startAt: string; dayNumber: number; timeText: string }> {
  const res = await fetch(`${API_BASE}/api/event-types/${eventTypeId}/slots`);
  const body = await res.json() as { data: { days: Array<{ date: string; slots: Array<{ start: string; status: string }> }> } };

  for (const day of body.data.days) {
    // Первый свободный слот сегодня всегда на границе «сейчас»: к моменту отправки
    // формы он становится прошлым → 422. Берём слот с завтра или позже.
    if (day.date === todayMsk()) continue;
    if (opts?.date && day.date !== opts.date) continue;
    const free = day.slots.find((s) => s.status === 'free');
    if (free) {
      // startAt в формате "2026-08-18T09:00:00+03:00" — время уже в MSK
      const m = free.start.match(/T(\d{2}):(\d{2})/);
      return {
        date: day.date,
        startAt: free.start,
        dayNumber: Number(day.date.split('-')[2]),
        timeText: m ? `${m[1]}:${m[2]}` : '',
      };
    }
  }
  throw new Error(`No free slot found for ${eventTypeId}`);
}
