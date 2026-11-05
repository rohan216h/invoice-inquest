// ============================================================
// INVOICE INQUEST — Engine Unit Tests
// ============================================================
import { describe, it, expect } from 'vitest';
import { normalizeInvoiceNumber, levenshtein, tokenJaccard, parseDate, daysBetween } from '../lib/engine/utils';

describe('normalizeInvoiceNumber', () => {
  it('uppercases and removes spaces/hyphens', () => {
    expect(normalizeInvoiceNumber('INV-2041')).toBe('INV2041');
    expect(normalizeInvoiceNumber('INV 2041 ')).toBe('INV2041');
    expect(normalizeInvoiceNumber('inv2041')).toBe('INV2041');
    expect(normalizeInvoiceNumber('INV.2041')).toBe('INV2041');
    expect(normalizeInvoiceNumber('  inv - 2041  ')).toBe('INV2041');
  });

  it('removes leading zeros after letter prefix', () => {
    expect(normalizeInvoiceNumber('INV-00042')).toBe('INV42');
    expect(normalizeInvoiceNumber('PO-001')).toBe('PO1');
  });

  it('handles edge cases', () => {
    expect(normalizeInvoiceNumber('')).toBe('');
    expect(normalizeInvoiceNumber('12345')).toBe('12345');
  });
});

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('hello', 'hello')).toBe(0);
  });

  it('returns correct distance', () => {
    expect(levenshtein('kitten', 'sitting')).toBe(3);
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });
});

describe('tokenJaccard', () => {
  it('returns 1 for identical strings', () => {
    expect(tokenJaccard('hello world', 'hello world')).toBe(1);
  });

  it('returns 0 for completely different strings', () => {
    expect(tokenJaccard('hello world', 'foo bar')).toBe(0);
  });

  it('returns correct similarity', () => {
    const score = tokenJaccard('Industrial Safety Gloves Box of 100', 'Industrial Safety Gloves (Box of 100)');
    expect(score).toBeGreaterThan(0.7);
  });

  it('is case-insensitive', () => {
    expect(tokenJaccard('Hello World', 'hello world')).toBe(1);
  });
});

describe('parseDate', () => {
  it('parses ISO dates', () => {
    expect(parseDate('2026-10-28')).toBe('2026-10-28');
  });

  it('parses common date formats', () => {
    expect(parseDate('28/10/2026')).toBe('2026-10-28');
    expect(parseDate('10/28/2026')).toBe('2026-10-28');
    expect(parseDate('October 28, 2026')).toBe('2026-10-28');
    expect(parseDate('28 Oct 2026')).toBe('2026-10-28');
  });

  it('returns null for invalid dates', () => {
    expect(parseDate('')).toBeNull();
    expect(parseDate('not a date')).toBeNull();
  });
});

describe('daysBetween', () => {
  it('calculates days between dates', () => {
    expect(daysBetween('2026-10-15', '2026-10-18')).toBe(3);
    expect(daysBetween('2026-10-18', '2026-10-15')).toBe(3);
  });

  it('returns 0 for same date', () => {
    expect(daysBetween('2026-10-15', '2026-10-15')).toBe(0);
  });
});

