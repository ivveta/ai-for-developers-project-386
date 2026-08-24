### Hexlet tests and linter status:
[![Actions Status](https://github.com/ivveta/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/ivveta/ai-for-developers-project-386/actions)

## Демо

Приложение доступно по адресу: https://ai-for-developers-project-386-tchb.onrender.com

## Деплой (Render, запуск по PORT)

- Корневой `Dockerfile` собирает монорепо (`npm ci` + `npm run build`) и запускает
  один процесс `node backend/dist/server.js`: бэкенд раздаёт и API, и собранный фронтенд.
- Приложение слушает порт из переменной окружения `PORT`, которую платформа
  Render задаёт сама (`backend/src/config.ts`); хост — `0.0.0.0`
  (`backend/src/server.ts`). Дефолтный порт объявлен в самом образе
  (`ENV PORT=3000` + `EXPOSE 3000` в `Dockerfile`), локально без `PORT`
  используется 3000.
- База — бесплатный Render Postgres, подключение через env `DATABASE_URL`;
  при недоступной БД сервер всё равно стартует на `$PORT` и отвечает ошибками API.
- Сборка фронтенда в образе идёт с пустым `VITE_API_URL`, поэтому SPA ходит
  в API по относительным URL (same-origin) и работает за публичной ссылкой.

## Запуск локально

Требования: Node.js 20+, npm и Docker.

```bash
npm install        # установка зависимостей монорепо (workspaces: api, backend, frontend)
```

Поднять PostgreSQL и запустить реальный стек одной командой:

```bash
make db     # PostgreSQL в docker compose (порт 5432 — dev, 5433 — тесты)
make dev    # бэкенд (:3000) + фронтенд (:5173), остановка — Ctrl+C
```

Открыть в браузере: http://localhost:5173

Фронтенд обращается к API по адресу из переменной `VITE_API_URL`: в `make dev`
это реальный бэкенд `http://localhost:3000`, без неё по умолчанию используется
мок-сервер Prism на `http://localhost:4010`.

То же самое вручную, в трёх терминалах:

```bash
docker compose up -d                        # PostgreSQL
npm run dev -w @calendar/backend            # бэкенд на http://localhost:3000
VITE_API_URL=http://localhost:3000 npm run dev -w @calendar/frontend
```

Вариант без реального бэкенда — мок-сервер API (Prism):

```bash
make mock        # мок-сервер на http://localhost:4010
make frontend    # фронтенд на http://localhost:5173
```

Прод-режим: `make prod` собирает все пакеты и запускает один процесс — бэкенд
раздаёт API и собранный фронтенд на http://localhost:3000.

## Полезные команды

| Команда | Что делает |
|---|---|
| `make db` / `make db-down` | поднять / остановить PostgreSQL (dev :5432, test :5433) |
| `make dev` | реальный стек: бэкенд (:3000) + фронтенд (:5173) |
| `make mock` / `make frontend` | вариант без бэкенда: мок Prism (:4010) + фронтенд |
| `make prod` | прод-сборка: бэкенд раздаёт фронтенд на :3000 |
| `npm run contract` | пересобрать контракт: TypeSpec → `openapi.yaml` → типы TS |
| `npm run build` | сборка всех пакетов |
| `npm test` | тесты всех пакетов (интеграционные — при поднятом Docker) |

## Коммиты и релизы

Сообщения коммитов — по [Conventional Commits](https://www.conventionalcommits.org/ru/):
`feat:` — новая функциональность (minor), `fix:` — исправление (patch),
`feat!:` или `BREAKING CHANGE:` в теле — ломающее изменение (major).
Формат проверяется хуком commitlint локально при каждом коммите.

После мерджа в `main` [release-please](https://github.com/googleapis/release-please-action)
сам ведёт Release PR с обновлёнными `CHANGELOG.md` и версией пакета; мёрдж этого
PR ставит тег и создаёт GitHub Release.
