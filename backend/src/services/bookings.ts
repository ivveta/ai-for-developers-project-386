// Сценарии бронирований: окно слотов, создание брони (порядок проверок §9.3),
// список предстоящих встреч.

import type { Pool } from 'pg';

import type { components } from '@calendar/api-contract';

import {
  findOverlappingBookings,
  insertBooking,
  listUpcomingBookings,
  type BookingRow,
  type BookingWithEventTypeRow,
} from '../data/booking-repo.js';
import { findEventTypeById, type EventTypeRow } from '../data/event-type-repo.js';
import { NotFound, OutOfWindow, ValidationError, type FieldError } from '../domain/errors.js';
import {
  bookingWindowEnd,
  bookingWindowStart,
  buildWindowSlots,
  isAlignedToGrid,
  isWithinWorkday,
} from '../domain/slots.js';
import type { Clock } from '../lib/clock.js';
import { formatIsoMsk, parseIso } from '../lib/msk.js';

export type BookingDto = components['schemas']['Booking'];
export type WindowSlotsDto = components['schemas']['WindowSlots'];

export interface BookingInput {
  eventTypeId: string;
  startAt: string;
  guestName: string;
  guestEmail: string;
  notes?: string;
}

/** Слоты типа события на окно записи. 404, если тип не существует (§8.5). */
export async function getWindowSlots(
  pool: Pool,
  clock: Clock,
  eventTypeId: string,
): Promise<WindowSlotsDto> {
  const eventType = await findEventTypeById(pool, eventTypeId);
  if (!eventType) throw new NotFound();
  const now = clock.now();
  const bookings = await findOverlappingBookings(pool, bookingWindowStart(now), bookingWindowEnd(now));
  return buildWindowSlots(eventType, now, bookings);
}

/**
 * Создание бронирования — явная цепочка §9.3, первая сработавшая проверка
 * определяет ответ: формат → 400, существование типа → 404, сетка/рабочий день
 * → 400, прошлое/окно → 422, вставка (конфликт ограничения) → 409.
 */
export async function createBooking(
  pool: Pool,
  clock: Clock,
  input: BookingInput,
): Promise<BookingDto> {
  // §9.3.1 — формат и обязательность полей → 400 validation_error
  const { details, startAt } = parseBookingInput(input);
  if (details.length > 0) throw new ValidationError(details);

  // §9.3.2 — существование типа → 404 not_found
  const eventType = await findEventTypeById(pool, input.eventTypeId);
  if (!eventType) throw new NotFound();

  const start = startAt!; // после успешного парсинга (шаг 1) startAt не null
  const end = new Date(start.getTime() + eventType.durationMinutes * 60_000);

  // §9.3.3 — выравнивание по сетке (И6) и рамки рабочего дня (И7) → 400
  const gridDetails: FieldError[] = [];
  if (!isAlignedToGrid(start, eventType.durationMinutes)) {
    gridDetails.push({ field: 'startAt', message: 'Время не соответствует сетке слотов' });
  }
  if (!isWithinWorkday(start, end)) {
    gridDetails.push({ field: 'startAt', message: 'Время вне рабочих часов 09:00–18:00' });
  }
  if (gridDetails.length > 0) throw new ValidationError(gridDetails);

  // §9.3.4 — прошлое и границы окна → 422 out_of_window
  const now = clock.now();
  if (start.getTime() < now.getTime()) {
    throw new OutOfWindow('Нельзя записаться на прошедшее время');
  }
  if (start.getTime() >= bookingWindowEnd(now).getTime()) {
    throw new OutOfWindow('Запись доступна только на ближайшие 14 дней');
  }

  // §9.3.5 — атомарная вставка; нарушение EXCLUDE (И5) → 409 slot_taken
  const row = await insertBooking(pool, {
    eventTypeId: eventType.id,
    startAt: start,
    endAt: end,
    guestName: input.guestName,
    guestEmail: input.guestEmail,
    notes: input.notes ?? null,
  });

  return toBookingDto(row, eventType);
}

/** Список предстоящих встреч всех типов (§7.9, §8.7). */
export async function listBookings(pool: Pool, clock: Clock): Promise<BookingDto[]> {
  const rows = await listUpcomingBookings(pool, clock.now());
  return rows.map(toBookingWithTypeDto);
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseBookingInput(input: BookingInput): { details: FieldError[]; startAt: Date | null } {
  const details: FieldError[] = [];

  if (typeof input.eventTypeId !== 'string' || input.eventTypeId.trim() === '') {
    details.push({ field: 'eventTypeId', message: 'Тип события не найден' });
  }

  let startAt: Date | null = null;
  if (typeof input.startAt !== 'string') {
    details.push({ field: 'startAt', message: 'Некорректный формат времени' });
  } else {
    startAt = parseIso(input.startAt);
    if (startAt === null) {
      details.push({ field: 'startAt', message: 'Некорректный формат времени' });
    }
  }

  if (typeof input.guestName !== 'string' || input.guestName.trim() === '') {
    details.push({ field: 'guestName', message: 'Укажите имя, не длиннее 100 символов' });
  } else if (input.guestName.length > 100) {
    details.push({ field: 'guestName', message: 'Укажите имя, не длиннее 100 символов' });
  }

  if (typeof input.guestEmail !== 'string' || input.guestEmail.trim() === '') {
    details.push({ field: 'guestEmail', message: 'Укажите email' });
  } else if (input.guestEmail.length > 254 || !EMAIL_RE.test(input.guestEmail)) {
    details.push({ field: 'guestEmail', message: 'Некорректный email' });
  }

  if (input.notes !== undefined && input.notes !== null) {
    if (typeof input.notes !== 'string' || input.notes.length > 1000) {
      details.push({ field: 'notes', message: 'Заметка не длиннее 1000 символов' });
    }
  }

  return { details, startAt };
}

function toBookingDto(row: BookingRow, eventType: EventTypeRow): BookingDto {
  return {
    id: row.id,
    eventType: {
      id: eventType.id,
      title: eventType.title,
      durationMinutes: eventType.durationMinutes,
    },
    startAt: formatIsoMsk(row.startAt),
    endAt: formatIsoMsk(row.endAt),
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    notes: row.notes ?? undefined,
    createdAt: formatIsoMsk(row.createdAt),
  };
}

function toBookingWithTypeDto(row: BookingWithEventTypeRow): BookingDto {
  return {
    id: row.id,
    eventType: {
      id: row.eventTypeId,
      title: row.eventTypeTitle,
      durationMinutes: row.eventTypeDurationMinutes,
    },
    startAt: formatIsoMsk(row.startAt),
    endAt: formatIsoMsk(row.endAt),
    guestName: row.guestName,
    guestEmail: row.guestEmail,
    notes: row.notes ?? undefined,
    createdAt: formatIsoMsk(row.createdAt),
  };
}
