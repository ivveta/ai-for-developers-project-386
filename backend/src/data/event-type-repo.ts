// Репозиторий типов событий. Возвращает доменные строки с Date-полями;
// сериализация в ISO 8601 +03:00 — на границе (сервисы/HTTP, §4.6).

import { DatabaseError } from 'pg';
import type { Pool } from 'pg';

import { EventTypeIdTaken } from '../domain/errors.js';

export interface EventTypeRow {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
  createdAt: Date;
}

interface EventTypeDbRow {
  id: string;
  title: string;
  description: string;
  duration_minutes: number;
  created_at: Date;
}

const COLUMNS = 'id, title, description, duration_minutes, created_at';

/** Список всех типов, по createdAt ↑ (§8.2). Вторичный ключ id — детерминированный порядок. */
export async function listEventTypes(pool: Pool): Promise<EventTypeRow[]> {
  const { rows } = await pool.query(
    `SELECT ${COLUMNS} FROM event_type ORDER BY created_at ASC, id ASC`,
  );
  return rows.map(rowToEventType);
}

export async function findEventTypeById(pool: Pool, id: string): Promise<EventTypeRow | null> {
  const { rows } = await pool.query(`SELECT ${COLUMNS} FROM event_type WHERE id = $1`, [id]);
  return rows.length > 0 ? rowToEventType(rows[0]) : null;
}

export interface EventTypeInput {
  id: string;
  title: string;
  description: string;
  durationMinutes: number;
}

/** Вставка типа события. SQLSTATE 23505 (уникальность id, И1) → EventTypeIdTaken. */
export async function insertEventType(pool: Pool, input: EventTypeInput): Promise<EventTypeRow> {
  try {
    const { rows } = await pool.query(
      `INSERT INTO event_type (id, title, description, duration_minutes)
       VALUES ($1, $2, $3, $4)
       RETURNING ${COLUMNS}`,
      [input.id, input.title, input.description, input.durationMinutes],
    );
    return rowToEventType(rows[0]);
  } catch (err) {
    if (isPgError(err) && err.code === '23505') throw new EventTypeIdTaken();
    throw err;
  }
}

function rowToEventType(row: EventTypeDbRow): EventTypeRow {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.duration_minutes,
    createdAt: row.created_at,
  };
}

function isPgError(err: unknown): err is DatabaseError {
  return err instanceof DatabaseError;
}
