// Интеграционные тесты API против тестовой БД из docker-compose (порт 5433).
// Запросы через app.inject(), «сейчас» — fixedClock. Критерии A1–A6, C5, D1–D8, E1–E3.
// Если тестовая БД недоступна (Docker не поднят), весь файл пропускается —
// прогоняются только юнит-тесты (риски из плана).

import type { FastifyInstance } from 'fastify';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

import { config } from '../config.js';
import { createPool } from '../data/db.js';
import { runMigrations } from '../data/migrate.js';
import { runSeed } from '../data/seed.js';
import { fixedClock } from '../lib/clock.js';
import { mskToUtc } from '../lib/msk.js';
import { buildApp } from './app.js';

const pool = createPool(config.testDatabaseUrl);

async function isTestDbAvailable(): Promise<boolean> {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  }
}

const dbAvailable = await isTestDbAvailable();

// §5.2: «31 марта 2026, 09:00 (Europe/Moscow)» — базовый «сейчас» для всех сценариев.
const NOW = mskToUtc({ year: 2026, month: 3, day: 31, hour: 9, minute: 0 });

let app: FastifyInstance;

describe.skipIf(!dbAvailable)('интеграционные тесты API', () => {
  beforeAll(async () => {
    await runMigrations(config.testDatabaseUrl);
    app = buildApp({ pool, clock: fixedClock(NOW) });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('TRUNCATE booking, event_type RESTART IDENTITY CASCADE');
  });

  async function insertType(id: string, durationMinutes: number, title = id): Promise<void> {
    await pool.query(
      `INSERT INTO event_type (id, title, description, duration_minutes)
       VALUES ($1, $2, $3, $4)`,
      [id, title, 'Описание типа.', durationMinutes],
    );
  }

  function typeBody(overrides: Record<string, unknown> = {}) {
    return {
      id: 'intro-call',
      title: 'Знакомство',
      description: 'Первый созвон, обсуждаем задачу.',
      durationMinutes: 30,
      ...overrides,
    };
  }

  function bookingBody(overrides: Record<string, unknown> = {}) {
    return {
      eventTypeId: 'meeting-15',
      startAt: '2026-04-01T10:00:00+03:00',
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
      ...overrides,
    };
  }

  async function post(url: string, payload: Record<string, unknown>) {
    return app.inject({ method: 'POST', url, payload });
  }

  async function get(url: string) {
    return app.inject({ method: 'GET', url });
  }

  describe('A: типы событий', () => {
    it('A1: создание типа и видимость в списке', async () => {
      const res = await post('/api/event-types', typeBody({ id: 'meeting-15', durationMinutes: 15 }));
      expect(res.statusCode).toBe(201);
      expect(res.json().data).toMatchObject({ id: 'meeting-15', durationMinutes: 15 });

      const list = await get('/api/event-types');
      expect(list.statusCode).toBe(200);
      expect(list.json().data.map((t: { id: string }) => t.id)).toContain('meeting-15');
    });

    it('A2: повторный id → 409 event_type_id_taken, второй тип не создан', async () => {
      await insertType('meeting-15', 15);
      const res = await post('/api/event-types', typeBody({ id: 'meeting-15' }));
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('event_type_id_taken');

      const list = await get('/api/event-types');
      expect(list.json().data.filter((t: { id: string }) => t.id === 'meeting-15')).toHaveLength(1);
    });

    it('A3: durationMinutes=541 → 400 с полем durationMinutes', async () => {
      const res = await post('/api/event-types', typeBody({ durationMinutes: 541 }));
      expect(res.statusCode).toBe(400);
      expect(res.json().error).toEqual({
        code: 'validation_error',
        message: 'Проверьте правильность заполнения полей',
        details: [{ field: 'durationMinutes', message: 'Длительность — целое число от 1 до 540 минут' }],
      });
      const list = await get('/api/event-types');
      expect(list.json().data).toHaveLength(0);
    });

    it('A4: id вне формата → 400, тип не создан', async () => {
      const res = await post('/api/event-types', typeBody({ id: 'Meeting 15' }));
      expect(res.statusCode).toBe(400);
      expect(res.json().error.details).toEqual([
        { field: 'id', message: 'Только строчные латинские буквы, цифры и дефис, до 64 символов' },
      ]);
      const list = await get('/api/event-types');
      expect(list.json().data).toHaveLength(0);
    });

    it('A5: допустимы крайние значения длительности 1 и 540', async () => {
      const min = await post('/api/event-types', typeBody({ id: 'min', durationMinutes: 1 }));
      const max = await post('/api/event-types', typeBody({ id: 'max', durationMinutes: 540 }));
      expect(min.statusCode).toBe(201);
      expect(max.statusCode).toBe(201);
    });

    it('A6: пустая система, durationMinutes=45 → 201 и тип в списке', async () => {
      const res = await post('/api/event-types', typeBody({ id: 'meeting-45', durationMinutes: 45 }));
      expect(res.statusCode).toBe(201);
      expect(res.json().data.durationMinutes).toBe(45);

      const list = await get('/api/event-types');
      expect(list.json().data.map((t: { id: string }) => t.id)).toContain('meeting-45');
    });
  });

  describe('D: бронирование', () => {
    it('D1: корректная форма → 201, endAt = startAt + duration, бронь в списке', async () => {
      await runSeed(pool);
      const res = await post(
        '/api/bookings',
        bookingBody({ notes: 'Хочу обсудить интеграцию.' }),
      );
      expect(res.statusCode).toBe(201);
      expect(res.json().data).toMatchObject({
        startAt: '2026-04-01T10:00:00+03:00',
        endAt: '2026-04-01T10:15:00+03:00',
        eventType: { id: 'meeting-15', title: 'Встреча 15 минут', durationMinutes: 15 },
        guestName: 'Иван Петров',
        guestEmail: 'ivan@example.com',
        notes: 'Хочу обсудить интеграцию.',
      });

      const list = await get('/api/bookings');
      expect(list.statusCode).toBe(200);
      expect(list.json().data).toHaveLength(1);
    });

    it('D2: 15-й день от сегодня → 422 out_of_window, бронь не создана', async () => {
      await runSeed(pool);
      const res = await post('/api/bookings', bookingBody({ startAt: '2026-04-14T10:00:00+03:00' }));
      expect(res.statusCode).toBe(422);
      expect(res.json().error.code).toBe('out_of_window');
      const list = await get('/api/bookings');
      expect(list.json().data).toHaveLength(0);
    });

    it('D3: прошедшее время → 422 out_of_window', async () => {
      await runSeed(pool);
      const res = await post(
        '/api/bookings',
        bookingBody({ eventTypeId: 'meeting-30', startAt: '2026-03-30T10:00:00+03:00' }),
      );
      expect(res.statusCode).toBe(422);
      expect(res.json().error.code).toBe('out_of_window');
    });

    it('D4: время не по сетке типа 30 мин (09:15) → 400', async () => {
      await runSeed(pool);
      const res = await post(
        '/api/bookings',
        bookingBody({ eventTypeId: 'meeting-30', startAt: '2026-04-01T09:15:00+03:00' }),
      );
      expect(res.statusCode).toBe(400);
      expect(res.json().error.details).toEqual([
        { field: 'startAt', message: 'Время не соответствует сетке слотов' },
      ]);
    });

    it('D5: начало в 18:00 → 400, встреча выходит за рабочий день', async () => {
      await runSeed(pool);
      const res = await post(
        '/api/bookings',
        bookingBody({ eventTypeId: 'meeting-30', startAt: '2026-04-01T18:00:00+03:00' }),
      );
      expect(res.statusCode).toBe(400);
      expect(res.json().error.details).toEqual([
        { field: 'startAt', message: 'Время вне рабочих часов 09:00–18:00' },
      ]);
    });

    it('D6: форма без email → 400 validation_error', async () => {
      await runSeed(pool);
      const res = await post('/api/bookings', bookingBody({ guestEmail: undefined }));
      expect(res.statusCode).toBe(400);
      expect(res.json().error.code).toBe('validation_error');
      expect(res.json().error.details).toEqual([
        { field: 'guestEmail', message: 'Укажите email' },
      ]);
    });

    it('D7: некорректный email → 400 с указанием поля', async () => {
      await runSeed(pool);
      const res = await post('/api/bookings', bookingBody({ guestEmail: 'ivan' }));
      expect(res.statusCode).toBe(400);
      expect(res.json().error.details).toEqual([{ field: 'guestEmail', message: 'Некорректный email' }]);
    });

    it('D8: слот занят до отправки формы → 409 slot_taken', async () => {
      await runSeed(pool);
      const first = await post('/api/bookings', bookingBody());
      expect(first.statusCode).toBe(201);

      const res = await post('/api/bookings', bookingBody({ guestEmail: 'other@example.com' }));
      expect(res.statusCode).toBe(409);
      expect(res.json().error.code).toBe('slot_taken');
      const list = await get('/api/bookings');
      expect(list.json().data).toHaveLength(1);
    });
  });

  describe('C5: конкурентное бронирование одного слота', () => {
    it('ровно один 201, второй 409, в системе одна бронь', async () => {
      await runSeed(pool);
      const payload = bookingBody();
      const [r1, r2] = await Promise.all([
        post('/api/bookings', payload),
        post('/api/bookings', payload),
      ]);
      expect([r1.statusCode, r2.statusCode].sort()).toEqual([201, 409]);
      const list = await get('/api/bookings');
      expect(list.json().data).toHaveLength(1);
    });
  });

  describe('E: админский список', () => {
    it('E1: брони разных типов в одном списке, по startAt ↑', async () => {
      await insertType('meeting-15', 15, 'Встреча 15 минут');
      await insertType('meeting-30', 30, 'Встреча 30 минут');

      const late = await post(
        '/api/bookings',
        bookingBody({ eventTypeId: 'meeting-15', startAt: '2026-04-01T11:00:00+03:00' }),
      );
      const early = await post(
        '/api/bookings',
        bookingBody({ eventTypeId: 'meeting-30', startAt: '2026-04-01T10:00:00+03:00' }),
      );
      expect([early.statusCode, late.statusCode]).toEqual([201, 201]);

      const list = await get('/api/bookings');
      expect(list.statusCode).toBe(200);
      expect(list.json().data.map((b: { eventType: { id: string } }) => b.eventType.id)).toEqual([
        'meeting-30',
        'meeting-15',
      ]);
    });

    it('E2: прошедшая встреча не показывается', async () => {
      await insertType('meeting-15', 15, 'Встреча 15 минут');
      // прошедшая бронь — напрямую в БД (API её не создаст)
      await pool.query(
        `INSERT INTO booking (event_type_id, start_at, end_at, guest_name, guest_email)
         VALUES ($1, $2, $3, $4, $5)`,
        [
          'meeting-15',
          mskToUtc({ year: 2026, month: 3, day: 30, hour: 10, minute: 0 }),
          mskToUtc({ year: 2026, month: 3, day: 30, hour: 10, minute: 15 }),
          'Гость',
          'past@example.com',
        ],
      );

      const future = await post('/api/bookings', bookingBody({ startAt: '2026-04-01T10:00:00+03:00' }));
      expect(future.statusCode).toBe(201);

      const list = await get('/api/bookings');
      const bookings = list.json().data as { guestEmail: string }[];
      expect(bookings).toHaveLength(1);
      expect(bookings[0].guestEmail).toBe('ivan@example.com');
    });

    it('E3: броней нет → пустой список, не ошибка', async () => {
      const res = await get('/api/bookings');
      expect(res.statusCode).toBe(200);
      expect(res.json().data).toEqual([]);
    });
  });

  describe('GET /api/event-types/:id/slots', () => {
    it('несуществующий тип → 404 not_found', async () => {
      const res = await get('/api/event-types/nope/slots');
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('not_found');
    });

    it('существующий тип → 14 дней, первый — текущая дата', async () => {
      await insertType('meeting-15', 15, 'Встреча 15 минут');
      const res = await get('/api/event-types/meeting-15/slots');
      expect(res.statusCode).toBe(200);
      const { data } = res.json();
      expect(data.eventTypeId).toBe('meeting-15');
      expect(data.days).toHaveLength(14);
      expect(data.days[0].date).toBe('2026-03-31');
      expect(data.days[1].date).toBe('2026-04-01');
    });
  });

  describe('статическая раздача фронтенда (шаг 8)', () => {
    let staticDir: string;
    let staticApp: FastifyInstance;

    beforeAll(async () => {
      staticDir = mkdtempSync(path.join(tmpdir(), 'calendar-dist-'));
      writeFileSync(path.join(staticDir, 'index.html'), '<!doctype html><html><body>SPA</body></html>');
      writeFileSync(path.join(staticDir, 'asset.js'), 'console.log("asset");');
      staticApp = buildApp({ pool, clock: fixedClock(NOW), staticDir });
      await staticApp.ready();
    });

    afterAll(async () => {
      await staticApp.close();
      rmSync(staticDir, { recursive: true, force: true });
    });

    it('GET / отдаёт index.html', async () => {
      const res = await staticApp.inject({ method: 'GET', url: '/' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toContain('SPA');
    });

    it('SPA-фолбэк: не-API путь отдаёт index.html', async () => {
      const res = await staticApp.inject({ method: 'GET', url: '/book/meeting-15' });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('SPA');
    });

    it('существующий ассет отдаётся как файл', async () => {
      const res = await staticApp.inject({ method: 'GET', url: '/asset.js' });
      expect(res.statusCode).toBe(200);
      expect(res.body).toBe('console.log("asset");');
    });

    it('неизвестный /api-путь → 404 JSON, не index.html', async () => {
      const res = await staticApp.inject({ method: 'GET', url: '/api/unknown' });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('not_found');
    });

    it('POST на неизвестный путь → 404 JSON', async () => {
      const res = await staticApp.inject({ method: 'POST', url: '/nope', payload: {} });
      expect(res.statusCode).toBe(404);
      expect(res.json().error.code).toBe('not_found');
    });
  });
});
