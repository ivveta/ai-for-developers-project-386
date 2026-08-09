import "@typespec/http";

using TypeSpec.Http;

namespace Calendar;

// ---------- Общие скалярные типы ----------

/**
 * Идентификатор типа события (slug). Задаёт владелец, уникален в системе (И1),
 * используется в URL. Формат — §9.1.
 */
@pattern("^[a-z0-9-]{1,64}$")
scalar EventTypeId extends string;

/**
 * Длительность встречи в минутах, она же — шаг сетки слотов (Р1, Р2, И2).
 * Произвольная: целое от 1 до 540 (540 минут — длина рабочего дня 09:00–18:00).
 */
@minValue(1)
@maxValue(540)
scalar DurationMinutes extends int32;

// ---------- Тип события (§4.2) ----------

/**
 * Тип события — хранимый шаблон встречи.
 * После создания не изменяется и не удаляется (§3).
 */
model EventType {
  /** Идентификатор-slug */
  @example("meeting-15")
  id: EventTypeId;

  /** Название встречи */
  @minLength(1)
  @maxLength(100)
  @example("Встреча 15 минут")
  title: string;

  /** Описание для карточки в каталоге */
  @minLength(1)
  @maxLength(500)
  description: string;

  /** Длительность встречи, она же — шаг сетки слотов */
  durationMinutes: DurationMinutes;

  /** Момент создания, задаётся системой */
  createdAt: offsetDateTime;
}

/** Тело POST /api/event-types (§8.3). `createdAt` клиентом не передаётся — задаётся системой. */
model EventTypeCreate {
  /** Идентификатор-slug */
  @example("intro-call")
  id: EventTypeId;

  /** Название встречи */
  @minLength(1)
  @maxLength(100)
  @example("Знакомство")
  title: string;

  /** Описание */
  @minLength(1)
  @maxLength(500)
  description: string;

  /** Длительность в минутах: целое от 1 до 540 (Р1) */
  durationMinutes: DurationMinutes;
}

// ---------- Слот (§4.4) ----------

/**
 * Статус слота. Слоты с началом в прошлом и слоты вне окна записи
 * в выдачу не попадают вовсе — отдельного статуса для них нет (§4.4, §5.1).
 */
enum SlotStatus {
  /** Слот свободен и доступен для брони */
  free,

  /** Слот пересекается с существующим бронированием любого типа (Р7, §5.3) */
  busy,
}

/**
 * Слот — интервал [start, end) длиной в длительность типа события.
 * Вычисляемая структура, в хранилище отсутствует (§4.4).
 */
model Slot {
  /** Начало слота */
  start: offsetDateTime;

  /** Конец слота: start + durationMinutes типа события */
  end: offsetDateTime;

  status: SlotStatus;
}

/**
 * Слоты одного дня окна записи (§8.5).
 * Если доступных слотов нет (все в прошлом), день присутствует с пустым `slots` (§5.5).
 */
model DaySlots {
  /** Дата в таймзоне Europe/Moscow (Р5) */
  date: plainDate;

  /** Число свободных слотов — счётчик «N св.» в календаре (§7.5) */
  @minValue(0)
  freeCount: int32;

  /** Слоты дня со статусами, по времени начала */
  slots: Slot[];
}

/**
 * Слоты типа события на всё окно записи: ровно 14 дней, начиная с текущей даты (§5.2, §8.5).
 * Дней вне окна в ответе нет.
 */
model WindowSlots {
  /** Тип события, для которого построена сетка */
  eventTypeId: EventTypeId;

  /** Шаг сетки = длительность типа события (Р2) */
  durationMinutes: DurationMinutes;

  /** Дни окна записи по возрастанию даты, первый — текущая дата */
  days: DaySlots[];
}

// ---------- Бронирование (§4.3) ----------

/** Краткая карточка типа события, встраивается в ответы бронирований (§8.6, §8.7). */
model BookingEventType {
  id: EventTypeId;
  title: string;
  durationMinutes: DurationMinutes;
}

/**
 * Бронирование — подтверждённая запись гостя на интервал.
 * После создания не изменяется и не отменяется (Р9).
 */
model Booking {
  /** Идентификатор брони, генерируется системой */
  @format("uuid")
  id: string;

  /** Тип события */
  eventType: BookingEventType;

  /** Начало встречи */
  startAt: offsetDateTime;

  /** Конец встречи: startAt + durationMinutes типа события на момент создания (И3) */
  endAt: offsetDateTime;

  /** Имя гостя */
  @minLength(1)
  @maxLength(100)
  guestName: string;

  /** Email гостя */
  @format("email")
  @maxLength(254)
  guestEmail: string;

  /** Заметка гостя */
  @maxLength(1000)
  notes?: string;

  /** Момент создания, задаётся системой */
  createdAt: offsetDateTime;
}

/**
 * Тело POST /api/bookings (§8.6).
 * `endAt` клиентом не передаётся: система вычисляет его из длительности типа события (И3).
 */
model BookingCreate {
  /** Ссылка на существующий тип события (И8) */
  eventTypeId: EventTypeId;

  /**
   * Начало встречи: выровнено по сетке слотов типа (И6), целиком внутри рабочего дня
   * 09:00–18:00 Europe/Moscow (И7), не в прошлом и в пределах 14-дневного окна (Р6, Р8).
   */
  startAt: offsetDateTime;

  /** Имя гостя */
  @minLength(1)
  @maxLength(100)
  guestName: string;

  /** Email гостя */
  @format("email")
  @maxLength(254)
  guestEmail: string;

  /** Заметка гостя */
  @maxLength(1000)
  notes?: string;
}

// ---------- Конверты ответов и ошибки (§8, §8.8) ----------

/** Успешное чтение: конверт `{ data: ... }` (§8). */
model DataResponse<T> {
  data: T;
}

/** Успешное создание: 201 + конверт `{ data: ... }` (§8). */
model CreatedResponse<T> {
  @statusCode statusCode: 201;
  data: T;
}

/** Детализация ошибки валидации по полю (§8.8). */
model FieldError {
  /** Имя поля запроса */
  field: string;

  /** Сообщение об ошибке (формулировки — §9.1, §9.2) */
  message: string;
}

/** Тело ошибки без details (§8.8). */
model ErrorBody<Code extends string> {
  /** Машиночитаемый код ошибки */
  code: Code;

  /** Человекочитаемое сообщение */
  message: string;
}

/** Тело validation_error — единственной ошибки с details (§8.8). */
model ValidationErrorBody {
  code: "validation_error";
  message: string;
  details: FieldError[];
}

/** 400 validation_error: поля не прошли проверку; время не по сетке (И6) или вне рабочего дня (И7). */
model ValidationFailed {
  @statusCode statusCode: 400;
  error: ValidationErrorBody;
}

/** 404 not_found: тип события не существует. */
model NotFound {
  @statusCode statusCode: 404;
  error: ErrorBody<"not_found">;
}

/** 409 event_type_id_taken: тип события с таким id уже создан (И1). */
model EventTypeIdTaken {
  @statusCode statusCode: 409;
  error: ErrorBody<"event_type_id_taken">;
}

/** 409 slot_taken: интервал пересекается с существующим бронированием (И5, §5.4). */
model SlotTaken {
  @statusCode statusCode: 409;
  error: ErrorBody<"slot_taken">;
}

/** 422 out_of_window: начало брони в прошлом либо вне 14-дневного окна (Р6, Р8). */
model OutOfWindow {
  @statusCode statusCode: 422;
  error: ErrorBody<"out_of_window">;
}
