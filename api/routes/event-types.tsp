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
  @opExample(
    #{
      returnType: #{
        statusCode: 400,
        error: #{
          code: "validation_error",
          message: "Проверьте правильность заполнения полей",
          details: #[
            #{ field: "durationMinutes", message: "Длительность — целое число от 1 до 540 минут" },
          ],
        },
      },
    },
    #{ title: "Ошибка валидации (§8.8, §9.1)" }
  )
  @opExample(
    #{
      returnType: #{
        statusCode: 409,
        error: #{
          code: "event_type_id_taken",
          message: "Тип события с таким идентификатором уже существует",
        },
      },
    },
    #{ title: "Идентификатор занят (§9.1, И1)" }
  )
  create(@body body: EventTypeCreate): CreatedResponse<EventType> | ValidationFailed | EventTypeIdTaken;

  /**
   * Слоты типа события на всё окно записи: 14 дней, начиная с текущей даты (§8.5, §5.2).
   * Ответ справочный и может устареть к моменту отправки формы — клиент обязан
   * обработать 409 при бронировании (§5.4).
   * Из выдачи исключены слоты с началом в прошлом (Р8); дней вне окна в ответе нет (Р6).
   * Ошибки: 404 not_found.
   */
  @get
  @route("/{id}/slots")
  @opExample(
    #{
      parameters: #{ id: "meeting-15" },
      returnType: #{
        data: #{
          eventTypeId: "meeting-15",
          durationMinutes: 15,
          days: #[
            #{
              date: plainDate.fromISO("2026-03-31"),
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
            #{
              date: plainDate.fromISO("2026-04-01"),
              freeCount: 36,
              slots: #[
                #{
                  start: offsetDateTime.fromISO("2026-04-01T09:00:00+03:00"),
                  end: offsetDateTime.fromISO("2026-04-01T09:15:00+03:00"),
                  status: SlotStatus.free,
                },
              ],
            },
          ],
        },
      },
    },
    #{ title: "Фрагмент окна: 31 марта — первые три слота перекрыты бронями (§8.5)" }
  )
  slots(@path id: string): DataResponse<WindowSlots> | NotFound;
}
