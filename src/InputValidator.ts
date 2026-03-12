import { Package, Fleet } from './types';

export function parsePackages(baseCost: number, count: number, lines: string[]): Package[] {
  if (baseCost <= 0) throw new Error('Base cost must be positive');
  if (count <= 0 || count !== lines.length) throw new Error(`Expected ${count} packages, got ${lines.length}`);

  return lines.map((line, i) => {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 3) throw new Error(`Package line ${i + 1}: expected at least 3 fields`);

    const [id, w, d, offerCode] = parts;
    const weight = Number(w), distance = Number(d);

    if (!id) throw new Error(`Package line ${i + 1}: missing ID`);
    if (isNaN(weight) || weight <= 0) throw new Error(`Package line ${i + 1}: invalid weight`);
    if (isNaN(distance) || distance <= 0) throw new Error(`Package line ${i + 1}: invalid distance`);

    return { id, weight, distance, offerCode };
  });
}

export function parseFleet(line: string): Fleet {
  const parts = line.trim().split(/\s+/);
  if (parts.length < 3) throw new Error('Fleet line: expected 3 fields');

  const [c, s, w] = parts.map(Number);
  if (isNaN(c) || c <= 0) throw new Error('Fleet: invalid vehicle count');
  if (isNaN(s) || s <= 0) throw new Error('Fleet: invalid max speed');
  if (isNaN(w) || w <= 0) throw new Error('Fleet: invalid max weight');

  return { count: c, maxSpeed: s, maxWeight: w };
}
