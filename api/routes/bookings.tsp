import "@typespec/http";
import "../models.tsp";

using TypeSpec.Http;

namespace Calendar;

/** Бронирования (§8.6, §8.7). */
@route("/api/bookings")
@tag("Бронирования")
interface Bookings {
  /**
   * Создать бронирование (§8.6, сценарий С3).
   *
   * Порядок проверок (§9.3), первая сработавшая определяет ответ:
   * 1. формат и обязательность полей → 400 validation_error;
   * 2. существование типа события → 404 not_found;
   * 3. выравнивание по сетке и рамки рабочего дня (И6, И7) → 400 validation_error;
   * 4. не в прошлом и в пределах 14-дневного окна → 422 out_of_window;
   * 5. пересечение с существующими бронями (И5), атомарно со вставкой (§5.4) → 409 slot_taken.
   */
  @post
  @opExample(
    #{
      parameters: #{
        body: #{
          eventTypeId: "meeting-15",
          startAt: offsetDateTime.fromISO("2026-04-01T10:00:00+03:00"),
          guestName: "Иван Петров",
          guestEmail: "ivan@example.com",
          notes: "Хочу обсудить интеграцию.",
        },
      },
      returnType: #{
        statusCode: 201,
        data: #{
          id: "6b1c2f4e-9a3d-4c77-9b6c-2f0d5a8e1b34",
          eventType: #{ id: "meeting-15", title: "Встреча 15 минут", durationMinutes: 15 },
          startAt: offsetDateTime.fromISO("2026-04-01T10:00:00+03:00"),
          endAt: offsetDateTime.fromISO("2026-04-01T10:15:00+03:00"),
          guestName: "Иван Петров",
          guestEmail: "ivan@example.com",
          notes: "Хочу обсудить интеграцию.",
          createdAt: offsetDateTime.fromISO("2026-03-31T11:20:00+03:00"),
        },
      },
    },
    #{ title: "Создание брони (§8.6)" }
  )
  @opExample(
    #{
      returnType: #{
        statusCode: 400,
        error: #{
          code: "validation_error",
          message: "Проверьте правильность заполнения полей",
          details: #[#{ field: "guestEmail", message: "Некорректный email" }],
        },
      },
    },
    #{ title: "Ошибка валидации (§8.8, §9.2)" }
  )
  @opExample(
    #{
      returnType: #{
        statusCode: 404,
        error: #{ code: "not_found", message: "Тип события не найден" },
      },
    },
    #{ title: "Тип события не найден (§9.2)" }
  )
  @opExample(
    #{
      returnType: #{
        statusCode: 409,
        error: #{ code: "slot_taken", message: "Это время уже занято" },
      },
    },
    #{ title: "Слот занят (§5.4, И5)" }
  )
  @opExample(
    #{
      returnType: #{
        statusCode: 422,
        error: #{ code: "out_of_window", message: "Запись доступна только на ближайшие 14 дней" },
      },
    },
    #{ title: "Вне окна записи (Р6, Р8)" }
  )
  create(@body body: BookingCreate): CreatedResponse<Booking> | ValidationFailed | NotFound | SlotTaken | OutOfWindow;

  /**
   * Список предстоящих бронирований (§8.7, сценарий С5).
   * Параметров нет: возвращаются только встречи, которые ещё не начались (§7.9).
   * Сортировка по startAt по возрастанию.
   */
  @get
  @opExample(
    #{
      returnType: #{
        data: #[
          #{
            id: "6b1c2f4e-9a3d-4c77-9b6c-2f0d5a8e1b34",
            eventType: #{ id: "meeting-15", title: "Встреча 15 минут", durationMinutes: 15 },
            startAt: offsetDateTime.fromISO("2026-04-01T10:00:00+03:00"),
            endAt: offsetDateTime.fromISO("2026-04-01T10:15:00+03:00"),
            guestName: "Иван Петров",
            guestEmail: "ivan@example.com",
            notes: "Хочу обсудить интеграцию.",
            createdAt: offsetDateTime.fromISO("2026-03-31T11:20:00+03:00"),
          },
        ],
      },
    },
    #{ title: "Предстоящие встречи (§8.7)" }
  )
  list(): DataResponse<Booking[]>;
}
