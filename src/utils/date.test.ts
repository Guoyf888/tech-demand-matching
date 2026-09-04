/**
 * 工具函数单元测试
 */
import { describe, it, expect } from 'vitest';
import { safeDate, byCreatedAtDesc, byUpdatedAtDesc } from './date';
import { encodeData, decodeData } from './encryptedStorage';

describe('safeDate', () => {
  it('parses valid ISO string', () => {
    expect(safeDate('2026-05-20T00:00:00Z')).toBe(new Date('2026-05-20T00:00:00Z').getTime());
  });
  it('returns 0 for undefined/null/empty', () => {
    expect(safeDate(undefined)).toBe(0);
    expect(safeDate(null)).toBe(0);
    expect(safeDate('')).toBe(0);
  });
  it('returns 0 for invalid string', () => {
    expect(safeDate('not a date')).toBe(0);
  });
  it('handles Date object', () => {
    const d = new Date('2026-01-01');
    expect(safeDate(d)).toBe(d.getTime());
  });
  it('handles numeric timestamp', () => {
    expect(safeDate(1700000000000)).toBe(1700000000000);
  });
});

describe('byCreatedAtDesc', () => {
  it('sorts newest first', () => {
    const items = [
      { id: 'a', createdAt: '2026-01-01' },
      { id: 'b', createdAt: '2026-03-01' },
      { id: 'c', createdAt: '2026-02-01' },
    ];
    const sorted = [...items].sort(byCreatedAtDesc);
    expect(sorted.map(i => i.id)).toEqual(['b', 'c', 'a']);
  });
  it('handles missing createdAt gracefully (no NaN)', () => {
    const items = [
      { id: 'a' },
      { id: 'b', createdAt: '2026-01-01' },
    ];
    const sorted = [...items].sort(byCreatedAtDesc);
    expect(sorted[0].id).toBe('b');
    expect(Number.isFinite(byCreatedAtDesc(items[0], items[1]))).toBe(true);
  });
});

describe('byUpdatedAtDesc', () => {
  it('mirrors byCreatedAtDesc behavior for updatedAt', () => {
    const items = [
      { id: 'a', updatedAt: '2026-01-01' },
      { id: 'b', updatedAt: '2026-03-01' },
    ];
    const sorted = [...items].sort(byUpdatedAtDesc);
    expect(sorted[0].id).toBe('b');
  });
});

describe('encryptedStorage (XOR 混淆)', () => {
  it('round-trips an API key', () => {
    const original = 'sk-test-1234567890abcdef';
    const encoded = encodeData(original);
    expect(encoded.startsWith('ENC:')).toBe(true);
    expect(encoded).not.toContain(original); // 编码后不应出现明文
    expect(decodeData(encoded)).toBe(original);
  });
  it('returns empty string for non-ENC prefix', () => {
    expect(decodeData('plaintext')).toBe('');
  });
  it('handles unicode characters', () => {
    const original = '测试 API Key 中文 🔑';
    const encoded = encodeData(original);
    expect(decodeData(encoded)).toBe(original);
  });
  it('handles large payloads (no stack overflow)', () => {
    const large = 'x'.repeat(100_000);
    const encoded = encodeData(large);
    expect(decodeData(encoded).length).toBe(100_000);
  });
});
