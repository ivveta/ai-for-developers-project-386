### Hexlet tests and linter status:
[![Actions Status](https://github.com/ivveta/ai-for-developers-project-386/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/ivveta/ai-for-developers-project-386/actions)

## Запуск локально

Требования: Node.js 20+ и npm.

```bash
npm install        # установка зависимостей монорепо (workspaces: api, frontend)
```

```bash
make dev    # мок-сервер API (:4010) + фронтенд (:5173), остановка — Ctrl+C
```

Открыть в браузере: http://localhost:5173

То же самое вручную, в двух терминалах:

```bash
# Терминал 1 — мок-сервер API (Prism) на http://localhost:4010
npm run mock

# Терминал 2 — фронтенд (Vite) на http://localhost:5173
npm run dev -w @calendar/frontend
```

Реального бэкенда пока нет: фронтенд ходит в мок-сервер Prism, который отдаёт
ответы из примеров контракта `api/openapi/openapi.yaml`. Для подключения
настоящего API задайте фронтенду переменную окружения `VITE_API_URL`.

## Полезные команды

| Команда | Что делает |
|---|---|
| `npm run contract` | пересобрать контракт: TypeSpec → `openapi.yaml` → типы TS |
| `npm run build` | сборка всех пакетов |
| `npm test` | тесты всех пакетов |
| `npm run dev` | dev-режим всех пакетов разом |