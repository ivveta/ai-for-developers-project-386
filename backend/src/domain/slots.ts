// Чистые функции построения слотов (STRUCTURE-PLAN, решение 3): не знают про HTTP
// и SQL, время принимают зависимостью (Clock). Сетка §5.1, окно §5.2, занятость
// пересечением полуоткрытых интервалов §5.3 (Р7 — глобально, по всем типам).
// Хранение в UTC; в ответ уходят ISO 8601 со смещением +03:00 (Р5, §4.6).

import type { components } from '@calendar/api-contract';

import {
  WORKDAY_END_HOUR,
  WORKDAY_LENGTH_MINUTES,
  WORKDAY_START_HOUR,
  formatIsoMsk,
  mskDateString,
  mskLocal,
  mskToUtc,
} from '../lib/msk.js';

type SlotStatus = components['schemas']['SlotStatus'];

/** Окно записи — 14 календарных дней: сегодняшний и последующие 13 (Р6). */
export const WINDOW_DAYS = 14;

const DAY_MS = 86_400_000;

/** Интервал бронирования, как его отдаёт репозиторий (шаг 4). */
export interface BookingInterval {
  startAt: Date;
  endAt: Date;
}

export interface SlotView {
  start: string;
  end: string;
  status: SlotStatus;
}

export interface DayView {
  /** Дата в Europe/Moscow, YYYY-MM-DD */
  date: string;
  freeCount: number;
  slots: SlotView[];
}

export interface WindowView {
  eventTypeId: string;
  durationMinutes: number;
  days: DayView[];
}

/**
 * Слоты типа события на всё окно записи (§8.5). Ровно 14 дней: первый — текущая
 * дата, последний — 14-й. Из выдачи исключены слоты с началом в прошлом (Р8);
 * если у дня не осталось доступных слотов, он присутствует с пустым `slots`
 * и `freeCount = 0` (§5.5).
 */
/** Полночь текущего дня в Europe/Moscow — нижняя граница выборки пересечений. */
export function bookingWindowStart(now: Date): Date {
  const today = mskLocal(now);
  return mskToUtc({ year: today.year, month: today.month, day: today.day, hour: 0, minute: 0 });
}

/** Верхняя граница окна записи: 18:00 14-го дня (§5.2). */
export function bookingWindowEnd(now: Date): Date {
  return new Date(
    bookingWindowStart(now).getTime() + (WINDOW_DAYS - 1) * DAY_MS + WORKDAY_END_HOUR * 3_600_000,
  );
}

export function buildWindowSlots(
  eventType: { id: string; durationMinutes: number },
  now: Date,
  bookings: readonly BookingInterval[],
): WindowView {
  const todayMidnight = bookingWindowStart(now);
  const stepMs = eventType.durationMinutes * 60_000;
  // Полные слоты в рабочем дне: неполный «хвост» у 18:00 не генерируется (§5.1).
  const slotsPerDay = Math.floor(WORKDAY_LENGTH_MINUTES / eventType.durationMinutes);
  const nowMs = now.getTime();

  const days: DayView[] = [];
  for (let i = 0; i < WINDOW_DAYS; i++) {
    const dayStart = new Date(todayMidnight.getTime() + i * DAY_MS);
    const workdayStart = new Date(dayStart.getTime() + WORKDAY_START_HOUR * 3_600_000);

    const slots: SlotView[] = [];
    let freeCount = 0;
    for (let k = 0; k < slotsPerDay; k++) {
      const start = new Date(workdayStart.getTime() + k * stepMs);
      if (start.getTime() < nowMs) continue;
      const end = new Date(start.getTime() + stepMs);
      const status: SlotStatus = overlaps(bookings, start, end) ? 'busy' : 'free';
      if (status === 'free') freeCount++;
      slots.push({ start: formatIsoMsk(start), end: formatIsoMsk(end), status });
    }

    days.push({ date: mskDateString(dayStart), freeCount, slots });
  }

  return { eventTypeId: eventType.id, durationMinutes: eventType.durationMinutes, days };
}

// §5.3: интервалы полуоткрытые [start, end); смежные (09:00–09:15 и 09:15–09:30)
// не пересекаются. Занятость глобальная, от типа события брони не зависит (Р7).
function overlaps(
  bookings: readonly BookingInterval[],
  slotStart: Date,
  slotEnd: Date,
): boolean {
  return bookings.some(
    (b) => slotStart.getTime() < b.endAt.getTime() && b.startAt.getTime() < slotEnd.getTime(),
  );
}

function workdayStartUtc(startAt: Date): Date {
  const local = mskLocal(startAt);
  return mskToUtc({
    year: local.year,
    month: local.month,
    day: local.day,
    hour: WORKDAY_START_HOUR,
    minute: 0,
  });
}

/** И6: начало выровнено по сетке типа: 09:00 + k × durationMinutes, k ≥ 0 (§5.1). */
export function isAlignedToGrid(startAt: Date, durationMinutes: number): boolean {
  const diffMs = startAt.getTime() - workdayStartUtc(startAt).getTime();
  if (diffMs < 0) return false;
  return diffMs % (durationMinutes * 60_000) === 0;
}

/** И7: встреча целиком помещается в рабочий день 09:00–18:00 Europe/Moscow. */
export function isWithinWorkday(startAt: Date, endAt: Date): boolean {
  const local = mskLocal(startAt);
  const dayStart = mskToUtc({
    year: local.year,
    month: local.month,
    day: local.day,
    hour: 0,
    minute: 0,
  });
  const workdayStart = dayStart.getTime() + WORKDAY_START_HOUR * 3_600_000;
  const workdayEnd = dayStart.getTime() + WORKDAY_END_HOUR * 3_600_000;
  return startAt.getTime() >= workdayStart && endAt.getTime() <= workdayEnd;
}

/** Р6/Р8: начало не в прошлом и внутри 14-дневного окна (до 18:00 14-го дня, §5.2). */
export function isInBookingWindow(startAt: Date, now: Date): boolean {
  if (startAt.getTime() < now.getTime()) return false;
  return startAt.getTime() < bookingWindowEnd(now).getTime();
}
