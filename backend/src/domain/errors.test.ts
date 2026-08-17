import { describe, expect, it } from 'vitest';

import {
  DomainError,
  EventTypeIdTaken,
  NotFound,
  OutOfWindow,
  SlotTaken,
  ValidationError,
} from './errors.js';

describe('доменные ошибки', () => {
  it('ValidationError несёт details и код validation_error', () => {
    const err = new ValidationError([{ field: 'durationMinutes', message: 'Длительность — целое число от 1 до 540 минут' }]);
    expect(err).toBeInstanceOf(DomainError);
    expect(err.code).toBe('validation_error');
    expect(err.details).toEqual([{ field: 'durationMinutes', message: 'Длительность — целое число от 1 до 540 минут' }]);
    expect(err.message).toBe('Проверьте правильность заполнения полей');
  });

  it('коды соответствуют §8.8', () => {
    expect(new NotFound().code).toBe('not_found');
    expect(new EventTypeIdTaken().code).toBe('event_type_id_taken');
    expect(new SlotTaken().code).toBe('slot_taken');
    expect(new OutOfWindow().code).toBe('out_of_window');
  });

  it('OutOfWindow принимает специфичное сообщение (§9.2)', () => {
    expect(new OutOfWindow().message).toBe('Запись доступна только на ближайшие 14 дней');
    expect(new OutOfWindow('Нельзя записаться на прошедшее время').message).toBe(
      'Нельзя записаться на прошедшее время',
    );
  });
});
