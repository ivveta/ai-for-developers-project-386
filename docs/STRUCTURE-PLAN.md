# План: структура приложения «Календарь звонков»

Составлен на основании [`docs/SPECIFICATION.md`](./docs/SPECIFICATION.md) и
[`docs/DOMAIN-MODEL.md`](./docs/DOMAIN-MODEL.md). Спецификация фиксирует внешнее поведение, но
оставляет язык, фреймворк, СУБД и структуру каталогов на наш выбор — этот документ фиксирует
принятые решения.

## Стек

| Слой | Выбор | Почему |
|---|---|---|
| Контракт | TypeSpec (`@typespec/http`, `@typespec/openapi3`) → `openapi.yaml` → `openapi-typescript` | Один источник правды; типы из контракта используют и фронт, и бэк |
| Бэкенд | Node.js 22 + TypeScript, Fastify | Лёгкий фреймворк, валидация JSON Schema из коробки; NestJS для 6 эндпоинтов избыточен |
| Доступ к данным | `pg` + `node-pg-migrate` | 2 таблицы, ~5 запросов; exclusion constraint пишется прямо в SQL-миграции |
| БД | PostgreSQL 16 в docker-compose | `EXCLUDE USING gist` на `tstzrange` — буквальное выполнение И5 из §4.6 |
| Фронтенд | React + Vite + TS + React Router, SPA | SEO не нужен; в проде бэкенд раздаёт статику — один сервис для облачного деплоя |
| Тесты | Vitest (unit + integration) | Один раннер на весь монорепозиторий |

## Структура каталогов

```
ai-for-developers-project-386/
├── package.json                 # npm workspaces: api, backend, frontend; общие скрипты
├── docker-compose.yml           # postgres:16 для разработки и тестов
├── .env.example                 # DATABASE_URL, PORT
│
├── api/                         # пакет @calendar/api-contract — единственный источник правды об API
│   ├── main.tsp                 # @service/@server, импорты
│   ├── models.tsp               # EventType, Booking, Slot, Error; duration: целое 1–540
│   ├── routes/event-types.tsp   # GET/POST /api/event-types, GET /{id}/slots
│   ├── routes/bookings.tsp      # POST /api/bookings, GET /api/bookings
│   ├── tspconfig.yaml           # эмиттер openapi3 → openapi/openapi.yaml
│   ├── openapi/openapi.yaml     # артефакт генерации, коммитится
│   └── types/schema.d.ts        # типы из openapi-typescript, экспортируются пакетом
│
├── backend/
│   ├── migrations/0001_init.sql # btree_gist; event_type; booking + EXCLUDE на tstzrange(start_at,end_at)
│   └── src/
│       ├── server.ts            # entrypoint: миграции → seed → listen; в проде раздаёт frontend/dist
│       ├── config.ts            # env
│       ├── http/                # app.ts, routes/, error-handler.ts — маппинг доменных ошибок
│       │                        #   в формат §8.8 (400/404/409/422)
│       ├── services/            # сценарии: createBooking с порядком проверок §9.3, createEventType, listSlots
│       ├── domain/              # ЧИСТЫЕ функции: slots.ts (сетка §5.1, окно §5.2, пересечения §5.3),
│       │                        #   errors.ts (типизированные доменные ошибки)
│       ├── data/                # db.ts (pool), event-type-repo.ts, booking-repo.ts, seed.ts (meeting-15/30)
│       └── lib/                 # clock.ts (интерфейс + fixedClock для тестов), msk.ts (конвертации Europe/Moscow)
│
└── frontend/
    └── src/
        ├── api/client.ts        # openapi-fetch, типизированный типами из @calendar/api-contract
        ├── pages/               # 8 маршрутов §7.1: Home, BookCatalog, BookEventType, Confirm, Success,
        │                        #   AdminEventTypes, AdminEventTypeNew, AdminBookings
        ├── components/          # Header (шапка §7.2), Calendar (§7.5), SlotPanel, формы
        └── lib/format.ts        # форматы §7.11 («вторник, 31 марта», «36 св.») через Intl + Europe/Moscow
```

## Ключевые проектные решения

1. **Поток контракта**: правка `.tsp` → `tsp compile` → `openapi.yaml` → генерация `schema.d.ts` →
   типы подхватывают фронт (`openapi-fetch`) и бэк (типы тел запросов/ответов). В CI — шаг
   «скомпилировать и сравнить с закоммиченным», расхождение ломает сборку.
2. **И5 на уровне БД**: миграция создаёт
   `EXCLUDE USING gist (tstzrange(start_at, end_at, '[)') WITH &&)`; нарушение прилетает как
   SQLSTATE `23P01` и мапится в `409 slot_taken`. Критерий C5 (гонка двух запросов) выполняется
   без ручных блокировок. Плюс индексы: unique на `event_type.id`, btree на `booking.start_at` (§4.6).
3. **Слоты — чистая функция** `(eventType, now, bookings) → { days: [{ date, slots, freeCount }] }`
   в `domain/`: строит всё окно из 14 дней одним проходом. Не знает про HTTP и SQL; покрывается
   юнит-тестами, дословно повторяющими критерии B1–B6 и C1–C4.
4. **Время**: хранение в `timestamptz` (UTC), преобразование в `Europe/Moscow` на границах
   (сериализация ответов, отображение). `Clock` как зависимость сервисов — в тестах «сейчас»
   фиксируется (спека оперирует конкретными моментами вроде «31 марта, 11:20»).
5. **Порядок проверок §9.3** — в `services/bookings.ts` явной цепочкой: формат → существование
   типа → сетка/рабочий день → окно → вставка (конфликт → `slot_taken`).
6. **Сид** идемпотентный (`INSERT ... ON CONFLICT DO NOTHING`) при старте: `meeting-15`,
   `meeting-30`; владелец `Tota`/`Host` — константа в коде фронта, не запись в БД (§2 DOMAIN-MODEL).
7. **Фронт**: при `400` подсвечивает поля из `error.details`; при `409 slot_taken` — сообщение
   «Этот слот только что заняли…» и возврат на выбор слота с перезапросом; `404` типа — экран
   «Тип события не найден» (§7.10). Счётчики «N св.» и слоты календаря — один запрос `slots`,
   возвращающий всё окно (14 дней); эндпоинт спекой зафиксирован window-based (§8.5).

## Порядок реализации

1. **Каркас монорепо**: workspaces, общий `tsconfig.base.json`, eslint/prettier, docker-compose,
   корневые скрипты (`dev`, `build`, `test`, `lint`, `contract:check`).
2. **`api/`**: модели и операции в TypeSpec дословно по §8 (включая формат ошибок §8.8 и примеры)
   → компиляция → типы.
3. **`backend/`**: миграция + seed → `domain/slots` + юнит-тесты (B*, C1–C4) → сервисы и HTTP →
    интеграционные тесты против тестовой БД из docker-compose (A1–A6, C5, D1–D8, E1–E3).
4. **`frontend/`**: клиент из контракта → 8 страниц по §7 → тесты F1–F5 на testing-library.
5. **Финал**: прод-сборка (бэк раздаёт `frontend/dist`), полный прогон, обновление `README.md` и
   `AGENTS.md` (структура, команды).

## Покрытие критериев приёмки

| Критерии | Где проверяются |
|---|---|
| A1–A6 (типы событий) | Интеграционные тесты `POST /api/event-types` |
| B1–B6 (сетка, окно) | Юнит-тесты `domain/slots` с фиксированным `Clock` |
| C1–C5 (занятость, гонка) | Юнит C1–C4; C5 — интеграционный: два параллельных `POST` → ровно один 201 |
| D1–D8, E1–E3 | Интеграционные API-тесты |
| F1–F5 (интерфейс) | Тесты фронта на testing-library |

## Осознанные упрощения

- Без кэширования, пагинации (объёмы данных крошечные), без логирования-фреймворков сверх
  встроенного в Fastify.
- Нет batch-эндпоинта для счётчиков календаря — спека его не фиксирует, добавление было бы
  выходом за объём.
- Гонки оставляем на БД (exclusion constraint), без advisory locks и сериализуемых транзакций
  в коде.
