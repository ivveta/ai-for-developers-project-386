import { describe, expect, it } from 'vitest';

import {
  MSK_OFFSET_MINUTES,
  WORKDAY_END_HOUR,
  WORKDAY_LENGTH_MINUTES,
  WORKDAY_START_HOUR,
  formatIsoMsk,
  mskDateString,
  mskLocal,
  mskToUtc,
  parseIso,
} from './msk.js';

// Примеры из спеки: «31 марта 2026, 11:20 (Europe/Moscow)» — §5.2.
const MONDAY_1120_MSK = '2026-03-31T08:20:00Z';

describe('msk: локальное время', () => {
  it('mskLocal раскладывает момент UTC на календарь Europe/Moscow', () => {
    expect(mskLocal(new Date(MONDAY_1120_MSK))).toEqual({
      year: 2026,
      month: 3,
      day: 31,
      hour: 11,
      minute: 20,
      second: 0,
    });
  });

  it('сдвиг фиксированный: +03:00', () => {
    expect(MSK_OFFSET_MINUTES).toBe(180);
  });

  it('границы рабочего дня — 09:00–18:00, 540 минут', () => {
    expect(WORKDAY_START_HOUR).toBe(9);
    expect(WORKDAY_END_HOUR).toBe(18);
    expect(WORKDAY_LENGTH_MINUTES).toBe(540);
  });

  it('mskDateString даёт календарный день в Europe/Moscow (вечер 31.03 = 01.04)', () => {
    expect(mskDateString(new Date('2026-03-31T21:00:00Z'))).toBe('2026-04-01');
    expect(mskDateString(new Date(MONDAY_1120_MSK))).toBe('2026-03-31');
  });

  it('mskToUtc собирает момент UTC из местного времени', () => {
    expect(mskToUtc({ year: 2026, month: 3, day: 31, hour: 11, minute: 20 })).toEqual(
      new Date(MONDAY_1120_MSK),
    );
  });

  it('roundtrip mskToUtc → mskLocal сохраняет значение', () => {
    const local = { year: 2026, month: 12, day: 1, hour: 18, minute: 0 };
    expect(mskLocal(mskToUtc(local))).toEqual({ ...local, second: 0 });
  });
});

describe('msk: сериализация ISO 8601', () => {
  it('формат со смещением +03:00 — как в ответах §8', () => {
    expect(formatIsoMsk(new Date(MONDAY_1120_MSK))).toBe('2026-03-31T11:20:00+03:00');
    expect(formatIsoMsk(new Date('2026-03-31T06:00:00Z'))).toBe('2026-03-31T09:00:00+03:00');
  });

  it('parseIso принимает ISO со смещением и Z', () => {
    expect(parseIso('2026-04-01T10:00:00+03:00')).toEqual(new Date('2026-04-01T07:00:00Z'));
    expect(parseIso('2026-04-01T07:00:00Z')).toEqual(new Date('2026-04-01T07:00:00Z'));
    expect(parseIso('2026-03-31T11:20:00+03:00')).toEqual(new Date(MONDAY_1120_MSK));
  });

  it('parseIso отвергает строки без смещения и мусор', () => {
    expect(parseIso('2026-04-01')).toBeNull();
    expect(parseIso('2026-04-01T10:00:00')).toBeNull();
    expect(parseIso('2026-13-01T10:00:00+03:00')).toBeNull();
    expect(parseIso('не-дата')).toBeNull();
  });

  it('roundtrip parseIso(formatIsoMsk(date)) сохраняет момент', () => {
    const moment = new Date('2026-04-13T15:00:00Z');
    expect(parseIso(formatIsoMsk(moment))).toEqual(moment);
  });
});
