# План: бэкенд «Календаря звонков»

Составлен на основании [`SPECIFICATION.md`](./SPECIFICATION.md) (§4–§5, §8–§11),
[`STRUCTURE-PLAN.md`](./STRUCTURE-PLAN.md) (стек, шаги 4–5) и
[`DOMAIN-MODEL.md`](./DOMAIN-MODEL.md).

## Контекст

Стек зафиксирован в STRUCTURE-PLAN: Node.js 22 + TypeScript, Fastify; PostgreSQL 16 в
docker-compose; `pg` + `node-pg-migrate`; тесты на Vitest; типы тел запросов/ответов — из
пакета `@calendar/api-contract`.

Готово к началу работы: контракт в `api/` собран (`openapi.yaml`, `types/schema.d.ts`),
фронтенд реализован по FRONTEND-PLAN и работает против мок-сервера Prism; base URL API
настраивается через `VITE_API_URL`, код клиента менять не потребуется. Каталог `backend/`,
`docker-compose.yml` и `.env.example` отсутствуют — бэкенд не начат.

## Шаг 0. Каркас workspace `backend/` ✅ (выполнено)

1. Добавить `backend` в `workspaces` корневого `package.json`.
2. `backend/package.json` (`@calendar/backend`): deps — `fastify`, `@fastify/cors`,
   `@fastify/static`, `pg`, `node-pg-migrate`, `@calendar/api-contract`; devDeps —
   `typescript`, `tsx`, `vitest`, `@types/node`, `@types/pg`. Скрипты: `dev` (tsx watch),
   `build` (tsc), `start`, `test`.
3. `backend/tsconfig.json` — наследует `tsconfig.base.json`, включает emit в `dist`.
4. `docker-compose.yml`: `postgres:16` (порт 5432, healthcheck) и тестовая БД (порт 5433)
   для интеграционных тестов.
5. `.env.example`: `DATABASE_URL`, `TEST_DATABASE_URL`, `PORT=3000`; `.gitignore` — добавить
   `.env`, `backend/dist`.

## Шаг 1. БД: миграция + сид ✅ (выполнено)

- `migrations/0001_init.sql`: расширение `btree_gist`; таблица `event_type` (ограничения по
  §4.2, И2); таблица `booking` (FK на `event_type`, `CHECK start_at < end_at` — И4);
  `EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)` — И5 на уровне БД;
  индекс по `booking.start_at` (§4.6). Метки времени — `timestamptz` (UTC, Р5).
- `src/data/seed.ts`: идемпотентный сид `meeting-15`/`meeting-30` (`ON CONFLICT DO NOTHING`,
  §10). Владелец `Tota`/`Host` — константа фронта, в БД не хранится (DOMAIN-MODEL §2).
- `src/config.ts` (env), `src/data/db.ts` (pool); миграции и сид запускаются при старте
  `server.ts`.

## Шаг 2. `lib/`: время ✅ (выполнено)

- `clock.ts`: интерфейс `Clock`, `systemClock`, `fixedClock` для тестов (спека оперирует
  конкретными моментами — «31 марта, 11:20», §5.2).
- `msk.ts`: границы рабочего дня 09:00–18:00 `Europe/Moscow`, сериализация ISO 8601 со
  смещением `+03:00`. Хранение в UTC, преобразование на границе системы (§4.6).

## Шаг 3. `domain/`: чистые функции + юнит-тесты

- `errors.ts`: типизированные доменные ошибки (`ValidationError` с `details`, `NotFound`,
  `EventTypeIdTaken`, `SlotTaken`, `OutOfWindow`).
- `slots.ts`: `buildWindowSlots(eventType, now, bookings) → { days[14] }` — сетка §5.1,
  окно §5.2, занятость пересечением полуоткрытых интервалов §5.3, `freeCount`. Предикаты
  для сервиса бронирований: выравнивание по сетке (И6), рабочий день (И7), окно записи.
- Юнит-тесты с `fixedClock`, дословно повторяющие критерии **B1–B6, C1–C4** и граничные
  случаи §5.5 (после 18:00, до 09:00, текущий момент внутри слота, D не делит 540, день
  без доступных слотов).

## Шаг 4. `data/`: репозитории

- `event-type-repo.ts`: `list` (по `createdAt` ↑, §8.2), `findById`, `insert` (SQLSTATE
  `23505` → `event_type_id_taken`).
- `booking-repo.ts`: `listUpcoming(now)` (JOIN типа, по `startAt` ↑, §8.7),
  `findOverlapping(окно)` для построения слотов, `insert` (`23P01` → `slot_taken`).

## Шаг 5. `services/`: сценарии

- `createEventType` — валидация §9.1 с `details` по полям.
- `getWindowSlots` — `404` при отсутствии типа; сборка окна через `domain/slots`.
- `createBooking` — явная цепочка проверок §9.3: формат и обязательность полей → 400;
  существование типа → 404; сетка И6 и рабочий день И7 → 400; прошлое и окно → 422;
  вставка, конфликт ограничения → 409. `endAt` вычисляется из длительности типа (И3).
- `listBookings` — только предстоящие встречи (§7.9).

## Шаг 6. `http/`: Fastify

- `app.ts`: `buildApp({ pool, clock })` — CORS для dev (STRUCTURE-PLAN, решение 8),
  `setErrorHandler` с маппингом доменных ошибок в формат §8.8 (400/404/409/422).
- `routes/event-types.ts`, `routes/bookings.ts` — пять эндпоинтов §8.1, тела типизированы
  из `@calendar/api-contract`.
- `server.ts`: entrypoint — миграции → seed → `listen(PORT)`.

## Шаг 7. Интеграционные тесты

- Против тестовой БД из docker-compose: миграции в `setup`, `TRUNCATE` между тестами,
  `buildApp` с `fixedClock`, запросы через `app.inject()` без реальных портов.
- Покрытие: **A1–A6** (типы событий), **C5** (два параллельных POST на один слот → ровно
  один 201, второй 409, в системе одна бронь), **D1–D8** (бронирование), **E1–E3**
  (админский список).

## Шаг 8. Финал: прод-режим и документация

- Бэкенд раздаёт `frontend/dist` через `@fastify/static` + SPA-fallback для не-`/api`
  путей (STRUCTURE-PLAN, шаг 5).
- `Makefile` и корневые скрипты: цели для БД и бэкенда.
- Обновить `README.md` (запуск с реальным бэкендом: docker compose, `VITE_API_URL`),
  `AGENTS.md` (структура, команды), блок «Статус реализации» в `SPECIFICATION.md`.
- Полный прогон: `npm run build`, `npm test` по всем workspace.

## Покрытие критериев приёмки

| Критерии | Где проверяются |
|---|---|
| B1–B6 (сетка, окно), C1–C4 (занятость) | Юнит-тесты `domain/slots` с `fixedClock` (шаг 3) |
| A1–A6, C5, D1–D8, E1–E3 | Интеграционные API-тесты против тестовой БД (шаг 7) |
| F1–F5 (интерфейс) | Уже покрыты тестами фронтенда (FRONTEND-PLAN) |

## Риски и допущения

- Интеграционные тесты требуют поднятого Docker с PostgreSQL; без него прогоняются только
  юнит-тесты домена.
- Контракт не меняется: эндпоинты, модели и формат ошибок уже зафиксированы в `api/`;
  если в ходе реализации вскроется расхождение со спецификацией — сначала правится
  контракт и пересобираются артефакты (`npm run contract`).
- Осознанные упрощения из STRUCTURE-PLAN сохраняются: без пагинации, кэширования и
  advisory locks — гонки закрывает exclusion constraint в БД.
