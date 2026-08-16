// Репозиторий бронирований. Возвращает доменные строки с Date-полями;
// сериализация в ISO 8601 +03:00 — на границе (сервисы/HTTP, §4.6).

import { DatabaseError } from 'pg';
import type { Pool } from 'pg';

import { SlotTaken } from '../domain/errors.js';

export interface BookingRow {
  id: string;
  eventTypeId: string;
  startAt: Date;
  endAt: Date;
  guestName: string;
  guestEmail: string;
  notes: string | null;
  createdAt: Date;
}

/** Строка брони вместе с данными типа события (JOIN, §8.6/§8.7). */
export interface BookingWithEventTypeRow extends BookingRow {
  eventTypeTitle: string;
  eventTypeDurationMinutes: number;
}

interface BookingDbRow {
  id: string;
  event_type_id: string;
  start_at: Date;
  end_at: Date;
  guest_name: string;
  guest_email: string;
  notes: string | null;
  created_at: Date;
}

interface BookingWithTypeDbRow extends BookingDbRow {
  event_type_title: string;
  event_type_duration_minutes: number;
}

const COLUMNS =
  'id, event_type_id, start_at, end_at, guest_name, guest_email, notes, created_at';

/** Предстоящие встречи всех типов, по startAt ↑ (§7.9, §8.7). */
export async function listUpcomingBookings(
  pool: Pool,
  now: Date,
): Promise<BookingWithEventTypeRow[]> {
  const { rows } = await pool.query(
    `SELECT b.id, b.event_type_id, b.start_at, b.end_at, b.guest_name, b.guest_email,
            b.notes, b.created_at,
            t.title AS event_type_title, t.duration_minutes AS event_type_duration_minutes
     FROM booking b
     JOIN event_type t ON t.id = b.event_type_id
     WHERE b.start_at > $1
     ORDER BY b.start_at ASC`,
    [now],
  );
  return rows.map(rowToBookingWithType);
}

/**
 * Бронирования, пересекающие интервал [from, to) (§5.3, полуоткрытые).
 * Нижняя граница — полночь текущего дня в Europe/Moscow: иначе бронь, начавшаяся
 * до «сейчас», не попала бы в выборку, и слот 09:15–09:30 сегодня был бы free.
 */
export async function findOverlappingBookings(
  pool: Pool,
  from: Date,
  to: Date,
): Promise<BookingRow[]> {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM booking WHERE start_at < $2 AND end_at > $1 ORDER BY start_at ASC`,
    [from, to],
  );
  return rows.map(rowToBooking);
}

export interface BookingInput {
  eventTypeId: string;
  startAt: Date;
  endAt: Date;
  guestName: string;
  guestEmail: string;
  notes: string | null;
}

/** Вставка брони. SQLSTATE 23P01 (нарушение EXCLUDE, И5) → SlotTaken (§5.4). */
export async function insertBooking(pool: Pool, input: BookingInput): Promise<BookingRow> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO booking (event_type_id, start_at, end_at, guest_name, guest_email, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${COLUMNS}`,
      [input.eventTypeId, input.startAt, input.endAt, input.guestName, input.guestEmail, input.notes],
    );
    return rowToBooking(rows[0]);
  } catch (err) {
    if (isPgError(err) && err.code === '23P01') throw new SlotTaken();
    throw err;
  }
}

function rowToBooking(row: BookingDbRow): BookingRow {
  return {
    id: row.id,
    eventTypeId: row.event_type_id,
    startAt: row.start_at,
    endAt: row.end_at,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    notes: row.notes,
    createdAt: row.created_at,
  };
}

function rowToBookingWithType(row: BookingWithTypeDbRow): BookingWithEventTypeRow {
  return {
    ...rowToBooking(row),
    eventTypeTitle: row.event_type_title,
    eventTypeDurationMinutes: row.event_type_duration_minutes,
  };
}

function isPgError(err: unknown): err is DatabaseError {
  return err instanceof DatabaseError;
}
