// Сценарий «типы событий»: валидация §9.1, вставка, список.

import type { Pool } from 'pg';

import type { components } from '@calendar/api-contract';

import {
  insertEventType,
  listEventTypes as repoListEventTypes,
  type EventTypeRow,
} from '../data/event-type-repo.js';
import { ValidationError, type FieldError } from '../domain/errors.js';
import { formatIsoMsk } from '../lib/msk.js';

export type EventTypeDto = components['schemas']['EventType'];
export type EventTypeInput = components['schemas']['EventTypeCreate'];

const EVENT_TYPE_ID_RE = /^[a-z0-9-]{1,64}$/;

/** Список всех типов, по createdAt ↑ (§8.2). */
export async function listEventTypes(pool: Pool): Promise<EventTypeDto[]> {
  return (await repoListEventTypes(pool)).map(toEventTypeDto);
}

/** Создание типа события: валидация §9.1 → вставка (конфликт id — 409, §8.3). */
export async function createEventType(pool: Pool, input: EventTypeInput): Promise<EventTypeDto> {
  const details = validateEventType(input);
  if (details.length > 0) throw new ValidationError(details);
  const row = await insertEventType(pool, {
    id: input.id,
    title: input.title,
    description: input.description,
    durationMinutes: input.durationMinutes,
  });
  return toEventTypeDto(row);
}

function validateEventType(input: EventTypeInput): FieldError[] {
  const details: FieldError[] = [];

  if (typeof input.id !== 'string' || input.id.trim() === '') {
    details.push({ field: 'id', message: 'Укажите идентификатор' });
  } else if (!EVENT_TYPE_ID_RE.test(input.id)) {
    details.push({ field: 'id', message: 'Только строчные латинские буквы, цифры и дефис, до 64 символов' });
  }

  checkRequiredString(details, 'title', input.title, 'Укажите название, не длиннее 100 символов', 100);
  checkRequiredString(details, 'description', input.description, 'Укажите описание, не длиннее 500 символов', 500);

  if (
    typeof input.durationMinutes !== 'number' ||
    !Number.isInteger(input.durationMinutes) ||
    input.durationMinutes < 1 ||
    input.durationMinutes > 540
  ) {
    details.push({ field: 'durationMinutes', message: 'Длительность — целое число от 1 до 540 минут' });
  }

  return details;
}

function checkRequiredString(
  details: FieldError[],
  field: string,
  value: unknown,
  message: string,
  maxLength: number,
): void {
  if (typeof value !== 'string' || value.trim() === '') {
    details.push({ field, message });
  } else if (value.length > maxLength) {
    details.push({ field, message });
  }
}

function toEventTypeDto(row: EventTypeRow): EventTypeDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    durationMinutes: row.durationMinutes,
    createdAt: formatIsoMsk(row.createdAt),
  };
}
