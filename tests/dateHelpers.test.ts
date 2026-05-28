import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getDaysUntil, getLocalDateKey } from '../src/data/studyPlan.js';

describe('date helpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 28, 12, 0, 0));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('formats local date keys', () => {
    expect(getLocalDateKey()).toBe('2026-05-28');
  });

  it('calculates days until a date', () => {
    expect(getDaysUntil('2026-05-30')).toBe(2);
  });
});
