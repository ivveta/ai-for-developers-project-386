import { describe, expect, it } from 'vitest';

import { fixedClock, systemClock } from './clock.js';

describe('clock', () => {
  it('systemClock возвращает текущий момент', () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(Date.now());
  });

  it('fixedClock фиксирует момент и возвращает свежую копию', () => {
    const moment = new Date('2026-03-31T08:20:00Z');
    const clock = fixedClock(moment);
    expect(clock.now()).toEqual(moment);

    const a = clock.now();
    a.setFullYear(2000);
    expect(clock.now()).toEqual(moment);
  });
});
