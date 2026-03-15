import { parseInput } from '../src/calculations/parser';
import { setOffers } from '../src/calculations/offersManager';
import type { CalcOfferCriteria } from '../src/types';

const DEFAULT_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

afterEach(() => {
  setOffers(DEFAULT_OFFERS);
});

describe('parseInput — cost mode', () => {
  it('parses valid cost mode input', () => {
    const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
    const result = parseInput(input, 'cost');

    expect(result.baseCost).toBe(100);
    expect(result.packages).toHaveLength(3);
    expect(result.vehicles).toBeUndefined();

    expect(result.packages[0]).toEqual({ id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' });
    expect(result.packages[1]).toEqual({ id: 'PKG2', weight: 15, distance: 5, offerCode: 'OFR002' });
    expect(result.packages[2]).toEqual({ id: 'PKG3', weight: 10, distance: 100, offerCode: 'OFR003' });
  });

  it('accepts NA as a valid offer code', () => {
    const input = '100 1\nPKG1 50 30 NA';
    const result = parseInput(input, 'cost');
    expect(result.packages[0].offerCode).toBe('NA');
  });

  it('normalizes offer codes to uppercase', () => {
    const input = '100 1\nPKG1 50 30 ofr001';
    const result = parseInput(input, 'cost');
    expect(result.packages[0].offerCode).toBe('OFR001');
  });
});

describe('parseInput — time mode', () => {
  it('parses valid time mode input with vehicle line', () => {
    const input = '100 1\nPKG1 50 30 OFR001\n2 70 200';
    const result = parseInput(input, 'time');

    expect(result.baseCost).toBe(100);
    expect(result.packages).toHaveLength(1);
    expect(result.packages[0]).toEqual({ id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' });
    expect(result.vehicles).toEqual({ count: 2, maxSpeed: 70, maxWeight: 200 });
  });

  it('parses multiple packages in time mode', () => {
    const input = '100 5\nPKG1 50 30 OFR001\nPKG2 75 125 OFR003\nPKG3 175 100 OFR003\nPKG4 110 60 OFR002\nPKG5 155 95 NA\n2 70 200';
    const result = parseInput(input, 'time');

    expect(result.packages).toHaveLength(5);
    expect(result.vehicles).toEqual({ count: 2, maxSpeed: 70, maxWeight: 200 });
  });
});

describe('parseInput — error cases', () => {
  it('throws on empty input', () => {
    expect(() => parseInput('', 'cost')).toThrow();
  });

  it('throws on missing header (single line with no packages)', () => {
    expect(() => parseInput('100', 'cost')).toThrow('Need at least header line and one package line');
  });

  it('throws when declared package count does not match actual', () => {
    const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002';
    expect(() => parseInput(input, 'cost')).toThrow(/Expected 3 packages but found 2/);
  });

  it('throws on duplicate package IDs', () => {
    const input = '100 2\nPKG1 5 5 OFR001\nPKG1 15 5 OFR002';
    expect(() => parseInput(input, 'cost')).toThrow(/Duplicate package ID/);
  });

  it('throws on non-incremental IDs', () => {
    const input = '100 2\nPKG1 5 5 OFR001\nPKG3 15 5 OFR002';
    expect(() => parseInput(input, 'cost')).toThrow(/incremental/i);
  });

  it('throws on invalid offer code', () => {
    const input = '100 1\nPKG1 5 5 BADCODE';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid offer code/);
  });

  it('throws on invalid package ID format', () => {
    const input = '100 1\nABC 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid package ID/);
  });

  it('throws when time mode is missing vehicle line', () => {
    const input = '100 1\nPKG1 50 30 OFR001';
    expect(() => parseInput(input, 'time')).toThrow();
  });

  it('throws when package line has wrong number of fields', () => {
    const input = '100 1\nPKG1 5 5';
    expect(() => parseInput(input, 'cost')).toThrow(/Expected 4 values/);
  });

  it('throws on non-numeric base cost', () => {
    const input = 'abc 1\nPKG1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/must be numbers/);
  });

  it('throws when package count is 0', () => {
    const input = '100 0\nPKG1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/at least 1/);
  });

  it('detects vehicle-like line in cost mode and warns', () => {
    const input = '100 1\nPKG1 5 5 OFR001\n2 70 200';
    expect(() => parseInput(input, 'cost')).toThrow(/Expected 1 packages but found 2|Delivery Cost mode/);
  });
});
