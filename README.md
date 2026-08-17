### Hexlet tests and linter status:
[![Actions Status](https://github.com/ivveta/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/ivveta/ai-for-developers-project-386/actions)

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