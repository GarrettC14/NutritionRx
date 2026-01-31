/**
 * generateId Utility Tests
 * Tests for unique ID generation without crypto.getRandomValues()
 */

import { generateId } from '@/utils/generateId';

describe('generateId', () => {
  it('returns a string', () => {
    const id = generateId();

    expect(typeof id).toBe('string');
  });

  it('has correct format with exactly 2 hyphens', () => {
    const id = generateId();
    const parts = id.split('-');

    expect(parts).toHaveLength(3);
  });

  it('has three non-empty parts separated by hyphens', () => {
    const id = generateId();
    const parts = id.split('-');

    parts.forEach((part) => {
      expect(part.length).toBeGreaterThan(0);
    });
  });

  it('starts with a base-36 encoded timestamp', () => {
    const before = Date.now();
    const id = generateId();
    const after = Date.now();

    const timestampPart = id.split('-')[0];
    const decoded = parseInt(timestampPart, 36);

    expect(decoded).toBeGreaterThanOrEqual(before);
    expect(decoded).toBeLessThanOrEqual(after);
  });

  it('generates unique IDs across multiple calls', () => {
    const ids = new Set<string>();

    for (let i = 0; i < 100; i++) {
      ids.add(generateId());
    }

    expect(ids.size).toBe(100);
  });

  it('contains only valid base-36 characters and hyphens', () => {
    const id = generateId();

    // Base-36 uses lowercase a-z and 0-9, plus hyphens as separators
    expect(id).toMatch(/^[a-z0-9]+-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('has reasonable length for each part', () => {
    const id = generateId();
    const parts = id.split('-');

    // Timestamp part: Date.now() in base-36 is typically 8-9 chars
    expect(parts[0].length).toBeGreaterThanOrEqual(1);
    expect(parts[0].length).toBeLessThanOrEqual(15);

    // Random parts: Math.random().toString(36).substring(2,15) yields up to 13 chars
    expect(parts[1].length).toBeGreaterThanOrEqual(1);
    expect(parts[1].length).toBeLessThanOrEqual(13);

    expect(parts[2].length).toBeGreaterThanOrEqual(1);
    expect(parts[2].length).toBeLessThanOrEqual(13);
  });

  it('produces different random parts even within the same millisecond', () => {
    // Generate two IDs as fast as possible
    const id1 = generateId();
    const id2 = generateId();

    const parts1 = id1.split('-');
    const parts2 = id2.split('-');

    // Even if timestamp parts match, at least one random part should differ
    const randomParts1 = `${parts1[1]}-${parts1[2]}`;
    const randomParts2 = `${parts2[1]}-${parts2[2]}`;

    // It is theoretically possible but astronomically unlikely for both random
    // parts to match. We test that the full IDs differ.
    expect(id1).not.toBe(id2);
  });

  it('does not return empty string', () => {
    const id = generateId();

    expect(id).not.toBe('');
    expect(id.length).toBeGreaterThan(0);
  });
});
