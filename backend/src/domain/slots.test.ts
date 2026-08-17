import { describe, expect, it } from 'vitest';

import { mskToUtc } from '../lib/msk.js';
import {
  WINDOW_DAYS,
  buildWindowSlots,
  isAlignedToGrid,
  isInBookingWindow,
  isWithinWorkday,
  type BookingInterval,
  type WindowView,
} from './slots.js';

// Момент «31 марта 2026» в Europe/Moscow (§5.2).
function msk(month: number, day: number, hour: number, minute = 0): Date {
  return mskToUtc({ year: 2026, month, day, hour, minute });
}

function booking(startAt: Date, endAt: Date): BookingInterval {
  return { startAt, endAt };
}

const NOW_0900 = msk(3, 31, 9);

describe('B1: сетка 15 минут', () => {
  const w = buildWindowSlots({ id: 'meeting-15', durationMinutes: 15 }, NOW_0900, []);

  it('у будущего дня ровно 36 слотов, все free', () => {
    const day = w.days[1];
    expect(day.slots).toHaveLength(36);
    expect(day.freeCount).toBe(36);
    expect(day.slots.every((s) => s.status === 'free')).toBe(true);
  });

  it('первый слот 09:00–09:15, последний 17:45–18:00', () => {
    expect(w.days[1].slots[0]).toEqual({
      start: '2026-04-01T09:00:00+03:00',
      end: '2026-04-01T09:15:00+03:00',
      status: 'free',
    });
    const last = w.days[1].slots[35];
    expect(last.start).toBe('2026-04-01T17:45:00+03:00');
    expect(last.end).toBe('2026-04-01T18:00:00+03:00');
  });
});

describe('B2: сетка 30 минут', () => {
  const w = buildWindowSlots({ id: 'meeting-30', durationMinutes: 30 }, NOW_0900, []);

  it('у будущего дня ровно 18 слотов', () => {
    const day = w.days[1];
    expect(day.slots).toHaveLength(18);
    expect(day.freeCount).toBe(18);
    expect(day.slots[0].start).toBe('2026-04-01T09:00:00+03:00');
    expect(day.slots[0].end).toBe('2026-04-01T09:30:00+03:00');
    expect(day.slots[17].start).toBe('2026-04-01T17:30:00+03:00');
    expect(day.slots[17].end).toBe('2026-04-01T18:00:00+03:00');
  });
});

describe('B3: текущий момент внутри сетки (11:20, §5.5)', () => {
  const w = buildWindowSlots({ id: 'meeting-15', durationMinutes: 15 }, msk(3, 31, 11, 20), []);

  it('слоты сегодня до 11:30 отсутствуют, первый — 11:30–11:45', () => {
    const day = w.days[0];
    expect(day.date).toBe('2026-03-31');
    expect(day.slots[0]).toEqual({
      start: '2026-03-31T11:30:00+03:00',
      end: '2026-03-31T11:45:00+03:00',
      status: 'free',
    });
    // Выпали слоты 09:00–11:15 (10 шт.), осталось 36 − 10 = 26
    expect(day.freeCount).toBe(26);
  });
});

describe('B4: окно — ровно 14 дней', () => {
  const w = buildWindowSlots({ id: 'meeting-15', durationMinutes: 15 }, NOW_0900, []);

  it('первый — текущая дата, последний — 14-й день, без дат вне окна', () => {
    expect(w.days).toHaveLength(WINDOW_DAYS);
    expect(w.days[0].date).toBe('2026-03-31');
    expect(w.days[13].date).toBe('2026-04-13');
  });
});

describe('B5: слоты на 14-й день', () => {
  it('у последнего дня окна слоты присутствуют', () => {
    const w = buildWindowSlots({ id: 'meeting-15', durationMinutes: 15 }, NOW_0900, []);
    expect(w.days[13].freeCount).toBe(36);
    expect(w.days[13].slots[0].start).toBe('2026-04-13T09:00:00+03:00');
  });
});

describe('B6: длительность не делит 540 (100 минут, §5.1)', () => {
  const w = buildWindowSlots({ id: 't', durationMinutes: 100 }, NOW_0900, []);

  it('ровно 5 слотов, первый 09:00–10:40, последний 15:40–17:20', () => {
    const day = w.days[1];
    expect(day.slots).toHaveLength(5);
    expect(day.slots[0].start).toBe('2026-04-01T09:00:00+03:00');
    expect(day.slots[0].end).toBe('2026-04-01T10:40:00+03:00');
    expect(day.slots[4].start).toBe('2026-04-01T15:40:00+03:00');
    expect(day.slots[4].end).toBe('2026-04-01T17:20:00+03:00');
  });

  it('слот, выходящий за 18:00, не генерируется', () => {
    expect(daySlotStarts(w, 1)).not.toContain('2026-04-01T17:20:00+03:00');
  });
});

describe('C1: бронь 30 мин на 09:00–09:30, сетка 15 мин', () => {
  const w = buildWindowSlots(
    { id: 'meeting-15', durationMinutes: 15 },
    NOW_0900,
    [booking(msk(4, 1, 9), msk(4, 1, 9, 30))],
  );

  it('слоты 09:00–09:15 и 09:15–09:30 busy, 09:30–09:45 free', () => {
    const day = w.days[1];
    expect(day.slots[0].status).toBe('busy');
    expect(day.slots[1].status).toBe('busy');
    expect(day.slots[2].status).toBe('free');
    expect(day.freeCount).toBe(34);
  });
});

describe('C2: бронь 15 мин на 09:15–09:30, сетка 30 мин', () => {
  const w = buildWindowSlots(
    { id: 'meeting-30', durationMinutes: 30 },
    NOW_0900,
    [booking(msk(4, 1, 9, 15), msk(4, 1, 9, 30))],
  );

  it('слот 09:00–09:30 busy, 09:30–10:00 free', () => {
    const day = w.days[1];
    expect(day.slots[0].status).toBe('busy');
    expect(day.slots[1].status).toBe('free');
  });
});

describe('C3: смежные интервалы не пересекаются (§5.3)', () => {
  const w = buildWindowSlots(
    { id: 'meeting-15', durationMinutes: 15 },
    NOW_0900,
    [booking(msk(4, 1, 9), msk(4, 1, 9, 15))],
  );

  it('слот 09:15–09:30 после брони 09:00–09:15 — free', () => {
    expect(w.days[1].slots[1].status).toBe('free');
  });
});

describe('C4: пересечение по интервалу, а не по началу', () => {
  const w = buildWindowSlots(
    { id: 'meeting-30', durationMinutes: 30 },
    NOW_0900,
    [booking(msk(4, 1, 10), msk(4, 1, 10, 15))],
  );

  it('слот 10:00–10:30 занят бронью 10:00–10:15', () => {
    const day = w.days[1];
    expect(day.slots[2].start).toBe('2026-04-01T10:00:00+03:00');
    expect(day.slots[2].status).toBe('busy');
  });
});

describe('§5.5: граничные случаи окна', () => {
  it('после 18:00 на сегодня нет свободных слотов, день в выдаче с freeCount 0', () => {
    const w = buildWindowSlots({ id: 'meeting-15', durationMinutes: 15 }, msk(3, 31, 18, 30), []);
    expect(w.days[0].date).toBe('2026-03-31');
    expect(w.days[0].slots).toHaveLength(0);
    expect(w.days[0].freeCount).toBe(0);
    expect(w.days[1].freeCount).toBe(36);
  });

  it('до 09:00 доступны все слоты сегодняшнего дня', () => {
    const w = buildWindowSlots({ id: 'meeting-15', durationMinutes: 15 }, msk(3, 31, 8), []);
    expect(w.days[0].freeCount).toBe(36);
    expect(w.days[0].slots[0].start).toBe('2026-03-31T09:00:00+03:00');
  });
});

describe('предикаты для сервиса бронирований', () => {
  it('isAlignedToGrid: И6', () => {
    expect(isAlignedToGrid(msk(4, 1, 10, 0), 30)).toBe(true);
    expect(isAlignedToGrid(msk(4, 1, 9, 15), 30)).toBe(false);
    expect(isAlignedToGrid(msk(4, 1, 8, 59), 15)).toBe(false);
  });

  it('isWithinWorkday: И7', () => {
    expect(isWithinWorkday(msk(4, 1, 9, 0), msk(4, 1, 9, 15))).toBe(true);
    expect(isWithinWorkday(msk(4, 1, 17, 45), msk(4, 1, 18, 0))).toBe(true);
    expect(isWithinWorkday(msk(4, 1, 18, 0), msk(4, 1, 18, 15))).toBe(false);
    expect(isWithinWorkday(msk(4, 1, 17, 45), msk(4, 1, 18, 15))).toBe(false);
    expect(isWithinWorkday(msk(4, 1, 8, 0), msk(4, 1, 8, 15))).toBe(false);
  });

  it('isInBookingWindow: Р6/Р8', () => {
    const now = msk(3, 31, 11, 20);
    expect(isInBookingWindow(msk(3, 31, 11, 20), now)).toBe(true);
    expect(isInBookingWindow(msk(3, 31, 11, 0), now)).toBe(false);
    expect(isInBookingWindow(msk(4, 13, 9, 0), now)).toBe(true); // 14-й день окна
    expect(isInBookingWindow(msk(4, 13, 18, 0), now)).toBe(false); // верхняя граница
    expect(isInBookingWindow(msk(4, 14, 9, 0), now)).toBe(false); // 15-й день (D2)
  });
});

function daySlotStarts(w: WindowView, day: number): string[] {
  return w.days[day].slots.map((s) => s.start);
}
