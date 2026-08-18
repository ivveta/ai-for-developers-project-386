# План: E2E-тесты (Playwright + Docker Compose)

Составлен на основании [`E2E-SCENARIOS.md`](./E2E-SCENARIOS.md) и текущей структуры проекта.

## Контекст

Приложение полностью реализовано. Прод-режим: один процесс на `:3000` (API + `frontend/dist`).
E2E-тесты требуют работающий стек (PostgreSQL + бэкенд + фронтенд) и запускаются через Playwright.
Всё разворачивается через Docker Compose для воспроизводимости (локально и в CI).

## Шаг 0. Docker Compose для E2E

`docker-compose.e2e.yml` + `e2e/Dockerfile.backend`:

- **postgres**: `postgres:16`, БД `calendar_test`, healthcheck
- **backend**: `node:22`, монтирование проекта, `npm install && npm run build`, `DATABASE_URL` → тестовая БД в Docker
- Сеть: одна общая, `backend` зависит от `postgres` (condition: service_healthy)

## Шаг 1. Playwright конфигурация

- `e2e/playwright.config.ts`: без `webServer` (Docker Compose управляет жизненным циклом)
- `baseURL: http://localhost:3000`

## Шаг 2. Makefile

```makefile
e2e:
	docker compose -f docker-compose.e2e.yml up -d --build --wait
	npx playwright test --config e2e/playwright.config.ts; ret=$$?; \
	docker compose -f docker-compose.e2e.yml down -v; exit $$ret
```

## Шаг 3. E2E-хелперы (`e2e/helpers.ts`)

- `resetDb()`: TRUNCATE через `pg` pool к `:5434` (хост-порт из `docker-compose.e2e.yml`)
- `seedDefaults()`, `createBooking()`, `findFreeSlot()`: API на `:3000`

## Шаг 4. Тесты (7 файлов, 22 сценария)

```
e2e/
  playwright.config.ts
  helpers.ts
  navigation.spec.ts   — Группа 1 (NAV-01, NAV-02)
  catalog.spec.ts      — Группа 2 (CAT-01, CAT-02)
  slots.spec.ts        — Группа 3 (SLOT-01 — SLOT-04)
  booking.spec.ts      — Группа 4 (BOOK-01 — BOOK-04)
  errors.spec.ts       — Группа 5 (ERR-01 — ERR-05)
  admin.spec.ts        — Группа 6 (ADM-01 — ADM-05)
  flow.spec.ts         — Группа 7 (FLOW-01)
```

## Шаг 5. CI

```yaml
- run: docker compose -f docker-compose.e2e.yml up -d --build --wait
- run: npx playwright test --config e2e/playwright.config.ts
- run: docker compose -f docker-compose.e2e.yml down -v
```

## Покрытие критериев приёмки

| Критерий | Сценарий | Файл |
|---|---|---|
| F1 | E2E-CAT-01 | `catalog.spec.ts` |
| F2 | E2E-SLOT-02 | `slots.spec.ts` |
| F3 | E2E-SLOT-01 | `slots.spec.ts` |
| F4 | E2E-ERR-05 | `errors.spec.ts` |
| F5 | E2E-NAV-01 | `navigation.spec.ts` |
| E1 | E2E-ADM-01 | `admin.spec.ts` |
| E2 | E2E-ADM-04 | `admin.spec.ts` |
| E3 | E2E-ADM-04 | `admin.spec.ts` |
| E4 | E2E-ADM-05 | `admin.spec.ts` |
| D1 | E2E-BOOK-01 | `booking.spec.ts` |
| D6 | E2E-ERR-02 | `errors.spec.ts` |
| D7 | E2E-ERR-03 | `errors.spec.ts` |
| D8 | E2E-ERR-01 | `errors.spec.ts` |
| A2 | E2E-ADM-03 | `admin.spec.ts` |

## Риски

- **Время**: `findFreeSlot()` через API — надёжнее хардкода дат.
- **E2E-SLOT-04**: все слоты дня — через API по одному.
- **E2E-ERR-01**: гонка — `browser.newContext()`.
- **CI**: Docker доступен в GitHub Actions, Playwright — headless.

## Troubleshooting

### resetDb() не работает: данные не удаляются (CAT-02, ADM-05, FLOW-01)

**Симптом**: тесты, ожидающие пустую БД, падают — на странице видны данные из прошлых запусков.
Playwright показывает на странице реальные записи (например, бронирования из ADM-04),
хотя `resetDb()` вызывается в `beforeEach`.

**Корневая причина**: конфликт портов — на `:3000` одновременно работают два процесса:

```
com.docke (Docker)  PID 1414  *:3000 (LISTEN)  ← e2e-бэкенд в контейнере
node (локальный)    PID 38329 *:3000 (LISTEN)  ← npm run dev / make dev
```

Playwright подключается к `localhost:3000` и может попасть на **локальный** dev-сервер,
который подключён к **другой** БД (порт 5432). А `resetDb()` чистит БД e2e (порт 5434)
— т.е. очищает не ту базу.

**Как проверить**: `lsof -i :3000 -P -n | grep LISTEN`

**Решение**: перед запуском `make e2e` убедиться, что на порту 3000 нет локальных процессов:

```bash
# остановить make dev / npm run dev (Ctrl+C), либо:
kill $(lsof -ti :3000)
```

**Профилактика**: добавить в Makefile-цель `e2e` проверку перед стартом:

```makefile
e2e:
	@if lsof -ti :3000 >/dev/null 2>&1; then \
		echo "ERROR: port 3000 is in use. Stop dev server first (Ctrl+C in 'make dev')."; \
		exit 1; \
	fi
	docker compose -f docker-compose.e2e.yml up -d --build --wait
	npx playwright test --config e2e/playwright.config.ts; ret=$$?; \
	docker compose -f docker-compose.e2e.yml down -v; exit $$ret
```

### Карта портов

| Сервис | Хост-порт | Назначение |
|---|---|---|
| postgres (dev) | 5432 | `docker-compose.yml` → основная БД `calendar` |
| postgres-test | 5433 | `docker-compose.yml` → тестовая БД `calendar_test` (интеграционные тесты API) |
| postgres (e2e) | **5434** | `docker-compose.e2e.yml` → тестовая БД `calendar_test` (e2e) |
| backend (e2e) | 3000 | `docker-compose.e2e.yml` → API + frontend |

**Важно**: `resetDb()` в `e2e/helpers.ts` подключается к порту **5434** (хост),
а не 5433. Это соответствует `docker-compose.e2e.yml`, но **не** `docker-compose.yml`.
Порт 5433 — для юнит/интеграционных тестов бэкенда, не для e2e.

### runSeed() при старте бэкенда

`server.ts` вызывает `runSeed()` после миграций — вставляет `meeting-15` и `meeting-30`
(`ON CONFLICT DO NOTHING`). Seed выполняется **один раз** при старте контейнера.
`resetDb()` (TRUNCATE) корректно удаляет эти данные, но при перезапуске контейнера
seed вставит их снова. Это ожидаемое поведение.

### Фронтенд ходит на мок ( :4010 ) вместо бэкенда ( :3000 )

**Симптом**: тесты с выбором даты/слота падают — кнопка дня найдена, но `disabled`.
`findFreeSlot()` через API (:3000) возвращает одну дату, а календарь в браузере
получает данные от мок-сервера Prism (:4010) с другими датами → `byDate.get(date)`
не находит ключ → кнопка неактивна.

**Корневая причина**: `frontend/src/api/client.ts` по умолчанию ходит на `:4010`:

```typescript
const baseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:4010';
```

В `e2e/Dockerfile.backend` сборка фронтенда (`npm run build`) не передаёт `VITE_API_URL`,
поэтому собранный SPA использует мок по умолчанию.

**Решение**: добавить `ARG VITE_API_URL=http://localhost:3000` в `e2e/Dockerfile.backend`
(уже сделано). Сборка подставляет реальный адрес бэкенда.

**Карта API-вызовов**:

| Кто | Куда ходит | Порт |
|---|---|---|
| `e2e/helpers.ts` (resetDb, findFreeSlot) | `localhost:3000` | реальный бэкенд |
| Фронтенд в браузере (Docker-сборка) | `localhost:3000` | реальный бэкенд ✓ |
| Фронтенд в браузере (без `VITE_API_URL`) | `localhost:4010` | мок Prism ✗ |
