import "@typespec/http";
import "../models.tsp";

using TypeSpec.Http;

namespace Calendar;

/** Типы событий (§8.2–§8.5). */
@route("/api/event-types")
@tag("Типы событий")
interface EventTypes {
  /** Список всех типов событий, сортировка по createdAt по возрастанию (§8.2, §7.4). */
  @get
  @opExample(
    #{
      returnType: #{
        data: #[
          #{
            id: "meeting-15",
            title: "Встреча 15 минут",
            description: "Короткий тип события для быстрого слота.",
            durationMinutes: 15,
            createdAt: offsetDateTime.fromISO("2026-03-01T12:00:00+03:00"),
          },
          #{
            id: "meeting-30",
            title: "Встреча 30 минут",
            description: "Базовый тип события для бронирования.",
            durationMinutes: 30,
            createdAt: offsetDateTime.fromISO("2026-03-01T12:05:00+03:00"),
          },
        ],
      },
    },
    #{ title: "Каталог с двумя типами (§8.2)" }
  )
  list(): DataResponse<EventType[]>;

  /**
   * Создать тип события (§8.3, сценарий С4).
   * Ошибки: 400 validation_error (формат и обязательность, §9.1),
   * 409 event_type_id_taken (И1).
   */
  @post
  @opExample(
    #{
      parameters: #{
        body: #{
          id: "intro-call",
          title: "Знакомство",
          description: "Первый созвон, обсуждаем задачу.",
          durationMinutes: 30,
        },
      },
      returnType: #{
        statusCode: 201,
        data: #{
          id: "intro-call",
          title: "Знакомство",
          description: "Первый созвон, обсуждаем задачу.",
          durationMinutes: 30,
          createdAt: offsetDateTime.fromISO("2026-03-31T11:20:00+03:00"),
        },
      },
    },
    #{ title: "Создание типа события (§8.3)" }
  )
  create(@body body: EventTypeCreate): CreatedResponse<EventType> | ValidationFailed | EventTypeIdTaken;

  /**
   * Один тип события (§8.4).
   * Ошибки: 404 not_found.
   */
  @get
  @route("/{id}")
  @opExample(
    #{
      parameters: #{ id: "meeting-15" },
      returnType: #{
        data: #{
          id: "meeting-15",
          title: "Встреча 15 минут",
          description: "Короткий тип события для быстрого слота.",
          durationMinutes: 15,
          createdAt: offsetDateTime.fromISO("2026-03-01T12:00:00+03:00"),
        },
      },
    },
    #{ title: "Тип события (§8.4)" }
  )
  getById(@path id: string): DataResponse<EventType> | NotFound;

  /**
   * Слоты типа события на дату (§8.5). Ответ справочный и может устареть
   * к моменту отправки формы — клиент обязан обработать 409 при бронировании (§5.4).
   * Из выдачи исключены слоты с началом в прошлом (Р8) и вне окна записи (Р6);
   * дата вне окна даёт пустой `slots`, а не ошибку (§5.5).
   * Ошибки: 400 validation_error (некорректный формат `date`), 404 not_found.
   */
  @get
  @route("/{id}/slots")
  @opExample(
    #{
      parameters: #{ id: "meeting-15", date: plainDate.fromISO("2026-03-31") },
      returnType: #{
        data: #{
          eventTypeId: "meeting-15",
          date: plainDate.fromISO("2026-03-31"),
          durationMinutes: 15,
          freeCount: 33,
          slots: #[
            #{
              start: offsetDateTime.fromISO("2026-03-31T09:00:00+03:00"),
              end: offsetDateTime.fromISO("2026-03-31T09:15:00+03:00"),
              status: SlotStatus.busy,
            },
            #{
              start: offsetDateTime.fromISO("2026-03-31T09:15:00+03:00"),
              end: offsetDateTime.fromISO("2026-03-31T09:30:00+03:00"),
              status: SlotStatus.busy,
            },
            #{
              start: offsetDateTime.fromISO("2026-03-31T09:30:00+03:00"),
              end: offsetDateTime.fromISO("2026-03-31T09:45:00+03:00"),
              status: SlotStatus.busy,
            },
            #{
              start: offsetDateTime.fromISO("2026-03-31T09:45:00+03:00"),
              end: offsetDateTime.fromISO("2026-03-31T10:00:00+03:00"),
              status: SlotStatus.free,
            },
            #{
              start: offsetDateTime.fromISO("2026-03-31T10:00:00+03:00"),
              end: offsetDateTime.fromISO("2026-03-31T10:15:00+03:00"),
              status: SlotStatus.free,
            },
          ],
        },
      },
    },
    #{ title: "Слоты на 31 марта, первые три перекрыты бронями (§8.5)" }
  )
  slots(
    @path id: string,
    /** Дата в таймзоне Europe/Moscow, YYYY-MM-DD */
    @query date: plainDate,
  ): DataResponse<DaySlots> | ValidationFailed | NotFound;
}
