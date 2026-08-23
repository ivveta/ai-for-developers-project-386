# План: запуск тестов в CI (GitHub Actions)

Составлен на основании `Makefile`, `E2E-TESTS-PLAN.md` и текущей структуры проекта.

## Контекст

Приложение — монорепо (npm workspaces `api`, `backend`, `frontend`). Тесты трёх уровней:

- **юнит** бэкенда (`backend/src/**/*.test.ts`) и фронтенда (`frontend/src/App.test.tsx`) — через `npm test`;
- **интеграционные** API-тесты (`backend/src/http/app.integration.test.ts`) — требуют PostgreSQL
  на `:5433`, иначе весь файл пропускается (`describe.skipIf`). В CI БД обязательна,
  чтобы тесты реально выполнялись;
- **e2e** Playwright (`e2e/*.spec.ts`) — требуют стенда из `docker-compose.e2e.yml`
  (PostgreSQL `:5434` + бэкенд `:3000`), запуск через `make e2e-dev` + `make e2e`.

В `.github/workflows/` уже есть только системный `hexlet-check.yml` — его не трогаем.

## Шаг 1. Новый workflow `.github/workflows/ci.yml`

- **Триггеры**: `push` (все ветки) + `pull_request`.
- **Node 22** — совпадает с `e2e/Dockerfile.backend` (`node:22-slim`).
- **Две независимые джобы**: `test` (быстрая) и `e2e` (тяжёлая, Docker-сборка).

### Джоба `test` — юнит + интеграционные тесты

- `runs-on: ubuntu-latest`.
- **PostgreSQL-сервис** через `services:` (image `postgres:16`), хост-порт `5433:5432`,
  `POSTGRES_USER=calendar`, `POSTGRES_PASSWORD=calendar`, `POSTGRES_DB=calendar_test`,
  healthcheck `pg_isready`. Соответствует `docker-compose.yml` (postgres-test).
- Шаги:
  1. `actions/checkout@v6`
  2. `actions/setup-node@v4` (node 22, `cache: npm`)
  3. `npm ci`
  4. `npm run build` — сборка всех workspace (контракт + TS)
  5. `npm test` с env `TEST_DATABASE_URL=postgres://calendar:calendar@localhost:5433/calendar_test`

### Джоба `e2e` — Playwright

- `runs-on: ubuntu-latest`.
- Шаги:
  1. `actions/checkout@v6` + `actions/setup-node@v4` + `npm ci` (Playwright запускается с хоста)
  2. `npx playwright install --with-deps chromium`
  3. `make e2e-dev` — сборка и поднятие стенда (Compose, `--wait`)
  4. `make e2e` — прогон Playwright-тестов
  5. при падении — upload `test-results/` как artifact

## Шаг 2. Чек-лист реализации

- [ ] Создать `.github/workflows/ci.yml` по схеме выше
- [ ] Не изменять `hexlet-check.yml` и `.github/workflows/README.md`
- [ ] Проверить, что в `test`-джобе интеграционные тесты НЕ пропускаются (видны в логе vitest)
- [ ] Проверить, что e2e-джоба проходит с `--project-name calendar-e2e` (изоляция от основного compose)

## Риски

- **Дублирование сборки**: e2e-джоба делает `npm ci` на хосте (для Playwright) и повторную
  сборку внутри Docker-образа. Приемлемо, но удлиняет джобу.
- **Время**: Docker-сборка образа бэкенда в e2e-джобе — основной источник задержки.
  Альтернатива (не требуется): переиспользовать артефакты `npm run build` из `test`-джобы.
- **Скип интеграционных тестов**: если `services.postgres` настроен неверно (порт/креды),
  `app.integration.test.ts` молча пропустится — CI «позеленит», а интеграционные тесты не
  выполнятся. Обязательно проверить лог vitest на факт выполнения.
- **Порт 5434 в e2e**: `e2e/helpers.ts` по умолчанию ходит на `localhost:5434` — это порт
  postgres из `docker-compose.e2e.yml`. На раннере конфликтов нет.
- **make**: `ubuntu-latest` включает GNU Make, цели `e2e-dev`/`e2e` доступны как есть.

## Troubleshooting

### Интеграционные тесты «пропущены»

Проверить в логе vitest строку `describe.skipIf` / «integration» с количеством пройденных тестов.
Если 0 — проверить `TEST_DATABASE_URL` и доступность сервиса (`pg_isready` из healthcheck).

### e2e падает на `make e2e-dev`

Причина обычно в порте `:3000` или в healthcheck. На чистом раннере порт свободен;
стоит убедиться, что `--wait` дождался healthcheck `backend` (`fetch /api/event-types` → 200).