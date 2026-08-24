# План: Docker-образ и деплой (Render / Railway)

Составлен по результатам аудита соответствия требованиям: корневой `Dockerfile`,
автостарт в контейнере, запуск по `$PORT`, публичная ссылка после деплоя.

## Аудит текущего состояния

| Требование | Статус | Детали |
|---|---|---|
| Корневой `Dockerfile` | ✅ | Добавлен корневой `Dockerfile` с `npm ci`, `npm run build` и `CMD ["node", "backend/dist/server.js"]` |
| Автостарт в контейнере | ✅ | `server.ts` продолжает запуск при ошибке миграций/сида и поднимает HTTP-сервер без БД |
| Запуск по `$PORT` | ✅ | Читается из окружения (`backend/src/config.ts:20`), слушает `0.0.0.0` (`backend/src/server.ts:20`) |
| Публичная ссылка | ❌ | Деплоя нет. Дополнительно: сборка фронтенда с `VITE_API_URL=http://localhost:3000` ломает SPA у посетителя публичной ссылки — браузер пойдёт на свой localhost |

Прочие факты:

- Статику фронтенда раздаёт бэкенд из `frontend/dist` с SPA-фолбэком (`backend/src/http/app.ts`) —
  в проде достаточно одного процесса.
- `.dockerignore` исключает `.env`, `node_modules`, `dist` — секреты и мусор в образ не попадут.
- Миграции лежат в `backend/migrations` и резолвятся от `dist/data/migrate.js` —
  копирование каталога `backend/` целиком их сохраняет.
- Фронтенд: `VITE_API_URL ?? 'http://localhost:4010'` (`frontend/src/api/client.ts`). Пустая строка
  не триггерит fallback (`??` срабатывает только на null/undefined), поэтому сборка с
  `VITE_API_URL=""` даёт относительные URL — same-origin, работает за публичной ссылкой.

## Принятые решения

- **Мягкий старт без БД**: если PostgreSQL недоступен при старте, сервер всё равно поднимается
  на `$PORT` и пишет ошибку в лог; API отвечает 500 до появления БД. Нужно, чтобы контейнер прошёл
  автопроверку (там БД не дают). При заданном `DATABASE_URL` (деплой) — полноценная работа;
  pg-pool переподключается сам на каждый запрос.
- **БД для деплоя**: бесплатный Render Postgres рядом с Web Service (минус: живёт ~30 дней,
  для проверки курса хватает). Fallback платформы — Railway.

## Шаг 1. Корневой `Dockerfile` ✅

Новый файл на основе `e2e/Dockerfile.backend`:

- `FROM node:22-slim`, `WORKDIR /app`.
- Copy манифестов (`package.json`, `package-lock.json`, `api/package.json`,
  `backend/package.json`, `frontend/package.json`) → `npm ci`.
- Copy исходников (`api/`, `backend/`, `frontend/`, `tsconfig.base.json`).
- `ENV VITE_API_URL=""` перед сборкой → относительные URL, same-origin.
- `RUN npm run build` (workspaces собираются топологически: api → backend/frontend).
- `CMD ["node", "backend/dist/server.js"]`.

`EXPOSE` не нужен: платформа задаёт порт переменной `PORT`.

## Шаг 2. Мягкий старт без БД ✅

Правка `backend/src/server.ts` (~5 строк):

- `runMigrations()` + `runSeed()` обернуть в try/catch: при ошибке — лог и продолжение.
- HTTP-сервер поднимается на `$PORT` всегда.

## Шаг 3. Локальная проверка образа

- [x] `docker build -t calendar .`
- [x] `docker run -e PORT=8080 -p 8080:8080 calendar` без БД → сервер отвечает, SPA открывается
      (контейнер не падает)
- [x] Полный прогон с БД (`make db` + `DATABASE_URL`) → создание брони через UI работает

## Шаг 4. Деплой на Render (через MCP)

- [x] Создать бесплатный Render Postgres → взять Internal Database URL
- [x] Создать Web Service из Docker-образа репозитория, env: `DATABASE_URL`;
      `PORT` платформа задаёт сама
- [x] Дождаться деплоя, проверить публичную ссылку: открыть SPA, забронировать слот

## Шаг 5. Fallback: Railway (через MCP)

Если Render требует оплату или недоступен: тот же Docker-образ, Postgres-плагин,
env `DATABASE_URL`, публичный домен. Критерий тот же — приложение опубликовано и работает по `PORT`.

## Шаг 6. Ссылка на приложение

- [x] Добавить раздел «Демо» с публичным URL в `README.md`

## Шаг 7. Коммиты (по команде)

Conventional Commits, отдельными коммитами: `feat:` (Dockerfile + мягкий старт),
`docs:` (ссылка на демо). Не коммитить самостоятельно — только по явной команде.

## Риски

- **Автопроверка без БД**: API будет отвечать 500 — это ожидаемо; важно лишь, что процесс жив
  и слушает `$PORT`.
- **Render free Postgres протухает через ~30 дней** — к моменту повторной проверки пересоздать БД
  или переехать на Neon/Supabase.
- **Railway trial ($5)** может закончиться раньше Render free tier — поэтому Railway только fallback.
