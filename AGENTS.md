## Проект

«Календарь звонков» — упрощённый сервис бронирования времени на созвоны. Владелец календаря публикует *виды брони*, а
любой посетитель выбирает свободный слот и записывается на встречу.

Это небольшое, но законченное приложение: без авторизации, личных кабинетов и интеграций с внешними календарями.

## Общие правила

- Исправляй причину, а не следствие
- Если видишь изменения, которые ты не делал, игнорируй их
- Предлагай и вноси минимальные изменения
- Сообщения коммитов — по Conventional Commits (`feat:`, `fix:`, …); формат проверяет хук commitlint

## Структура и команды

- `api/` — пакет `@calendar/api-contract`: HTTP-контракт §8 (TypeSpec → `openapi.yaml` → типы TS).
- `backend/` — пакет `@calendar/backend`: API на Fastify + PostgreSQL; в проде раздаёт `frontend/dist`
  (планы: `docs/BACKEND-PLAN.md`, `docs/STRUCTURE-PLAN.md`).
- `frontend/` — пакет `@calendar/frontend`: React + Vite SPA (план: `docs/FRONTEND-PLAN.md`).
- `docs/SPECIFICATION.md` — внешнее поведение: сценарии, контракт, критерии приёмки §11.

| Команда | Что делает |
|---|---|
| `make db` / `make db-down` | поднять / остановить PostgreSQL (dev :5432, test :5433) |
| `make dev` | реальный стек: бэкенд (:3000) + фронтенд (:5173) |
| `make mock` / `make frontend` | вариант без бэкенда: мок Prism (:4010) + фронтенд |
| `make prod` | прод-сборка: один процесс на :3000 (API + `frontend/dist`) |
| `npm run build` / `npm test` | сборка / тесты всех workspace |
| `npm run contract` | пересобрать контракт и типы |

### Порты

| Порт | Сервис | Когда活跃ен |
|------|--------|------------|
| 3000 | backend (Fastify) | `make dev`, `make prod`, e2e |
| 5173 | frontend (Vite dev) | `make dev` |
| 4010 | Prism mock | `make mock` |
| 5432 | PostgreSQL dev | `make db` |
| 5433 | PostgreSQL test | `make db` |
| 5434 | PostgreSQL e2e | `make e2e` |

Юнит-тесты бэкенда и тесты фронтенда запускаются без внешних зависимостей;
интеграционные API-тесты бэкенда требуют поднятого Docker (`make db`) и иначе
пропускаются.
