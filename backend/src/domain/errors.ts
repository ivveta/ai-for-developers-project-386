// Типизированные доменные ошибки. Каждая несёт машиночитаемый code — по нему
// HTTP-слой (шаг 6) маппит ошибку в формат §8.8. Формулировки сообщений — §9.1, §9.2.

export interface FieldError {
  field: string;
  message: string;
}

export class DomainError extends Error {
  /** Машиночитаемый код (§8.8), конкретный — в каждой подошибке. */
  readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = new.target.name;
    this.code = 'domain_error';
  }
}

/** 400 validation_error — единственная ошибка с details (§8.8). */
export class ValidationError extends DomainError {
  readonly code = 'validation_error' as const;
  readonly details: readonly FieldError[];

  constructor(details: readonly FieldError[]) {
    super('Проверьте правильность заполнения полей');
    this.details = details;
  }
}

/** 404 not_found — тип события не существует (И8). */
export class NotFound extends DomainError {
  readonly code = 'not_found' as const;

  constructor() {
    super('Тип события не найден');
  }
}

/** 409 event_type_id_taken — id уже занят (И1). */
export class EventTypeIdTaken extends DomainError {
  readonly code = 'event_type_id_taken' as const;

  constructor() {
    super('Тип события с таким идентификатором уже существует');
  }
}

/** 409 slot_taken — интервал пересекается с существующей бронью (И5, §5.4). */
export class SlotTaken extends DomainError {
  readonly code = 'slot_taken' as const;

  constructor() {
    super('Это время уже занято');
  }
}

/** 422 out_of_window — начало в прошлом либо вне 14-дневного окна (Р6, Р8). */
export class OutOfWindow extends DomainError {
  readonly code = 'out_of_window' as const;

  constructor(message = 'Запись доступна только на ближайшие 14 дней') {
    super(message);
  }
}
