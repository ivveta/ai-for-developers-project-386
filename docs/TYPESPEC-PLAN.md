# План: TypeSpec-спецификация API-контракта

Составлен на основании [`SPECIFICATION.md`](./SPECIFICATION.md) (§4, §8, §9) и
[`DOMAIN-MODEL.md`](./DOMAIN-MODEL.md). Раскладка файлов и роль пакета — по
[`STRUCTURE-PLAN.md`](./STRUCTURE-PLAN.md): `api/` — изолированный пакет `@calendar/api-contract`,
единственный источник правды об API для фронта и бэка.

## Решение об изоляции

`api/` — самостоятельный пакет внутри npm workspaces со своими TypeSpec-зависимостями.
Обоснование: типы из контракта потребляют и фронт, и бэк (именованный импорт вместо
относительных путей); тяжёлый dev-only тулчейн TypeSpec не попадает в прод-установку бэкенда;
один `npm install` и один lockfile на корне сохраняются благодаря workspaces.

## Объём

Входят только исходные файлы спецификации и манифесты. Установка зависимостей, компиляция и
генерация `api/openapi/openapi.yaml` и `api/types/schema.d.ts` выполнены отдельным шагом —
шагом 0 [FRONTEND-PLAN](./FRONTEND-PLAN.md). Артефакты генерируются скриптом `build` пакета
`@calendar/api-contract` (корневой `npm run contract`).

## Контракт, который фиксируем (§8)

| Метод | Путь | Успех | Ошибки |
|---|---|---|---|
| GET | `/api/event-types` | 200 `{data: EventType[]}` | — |
| POST | `/api/event-types` | 201 `{data: EventType}` | 400, 409 `event_type_id_taken` |
| GET | `/api/event-types/{id}/slots` | 200 `{data: WindowSlots}` | 404 |
| POST | `/api/bookings` | 201 `{data: Booking}` | 400, 404, 409 `slot_taken`, 422 `out_of_window` |
| GET | `/api/bookings` | 200 `{data: Booking[]}` (только предстоящие) | — |

Единый формат ошибки (§8.8): `{error: {code, message, details?}}`, `details` — только у
`validation_error`. Метки времени — ISO 8601 со смещением (`offsetDateTime`), даты —
`YYYY-MM-DD` (`plainDate`).

## Шаги

После каждого шага — остановка на проверку.

- [x] **Шаг 0.** Этот файл плана.
- [x] **Шаг 1. Каркас.** Корневой `package.json` (`workspaces: ["api"]`), `api/package.json`
      (имя `@calendar/api-contract`, скрипт `compile`, devDeps `@typespec/compiler`,
      `@typespec/http`, `@typespec/openapi3`), `api/tspconfig.yaml` (эмиттер openapi3 →
      `openapi/openapi.yaml`).
- [x] **Шаг 2. Модели.** `api/main.tsp` (`@service`, `@server`, `namespace Calendar`, импорты)
      и `api/models.tsp`: `EventTypeId` (паттерн `^[a-z0-9-]{1,64}$`), `DurationMinutes`
      (целое 1–540, И2), `EventType`, `EventTypeCreate`, `Slot`, `SlotStatus`, `DaySlots`,
      `WindowSlots`, `Booking`
      (вложенный `eventType`, без `eventTypeId` наружу), `BookingCreate` (без `endAt`),
      ошибки §8.8 со статусами и литеральными кодами. Примеры полей через `@example`.
- [x] **Шаг 3. Маршруты типов событий.** `api/routes/event-types.tsp`: 3 операции
      (`list`, `create`, `slots`) со статусами по таблице выше, `@opExample` из §8.
- [x] **Шаг 4. Маршруты бронирований.** `api/routes/bookings.tsp`: `create` (порядок проверок
      §9.3 в doc-комментарии) и `list` (только предстоящие, без параметров), `@opExample` из §8.

## Чек-лист сверки со спецификацией

- [x] 5 эндпоинтов, методы и пути — как в §8.1
- [x] Статусы и коды ошибок — как в §8.8 и таблицах «Ошибки» §8.3–§8.6
- [x] Конверты `{data: ...}` / `{error: ...}` — как в примерах §8
- [x] Ограничения полей — как в §4.2, §4.3, §9.1, §9.2 (длины, slug, 15|30, email, uuid)
- [x] В теле создания брони нет `endAt` (И3); в ответе брони вложен `eventType` (§8.6)
