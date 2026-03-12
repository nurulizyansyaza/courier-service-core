import { parsePackages, parseFleet } from '../src/InputValidator';

describe('parsePackages', () => {
  it('parses valid input', () => {
    const lines = ['PKG1 5 5 OFR001', 'PKG2 15 5 OFR002'];
    expect(parsePackages(100, 2, lines)).toEqual([
      { id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' },
      { id: 'PKG2', weight: 15, distance: 5, offerCode: 'OFR002' },
    ]);
  });

  it('throws on line with missing fields', () => {
    expect(() => parsePackages(100, 1, ['PKG1 5'])).toThrow('expected at least 3 fields');
  });

  it('throws on non-numeric weight', () => {
    expect(() => parsePackages(100, 1, ['PKG1 abc 5 OFR001'])).toThrow('invalid weight');
  });

  it('throws on non-numeric distance', () => {
    expect(() => parsePackages(100, 1, ['PKG1 5 abc OFR001'])).toThrow('invalid distance');
  });

  it('throws on count mismatch', () => {
    expect(() => parsePackages(100, 2, ['PKG1 5 5 OFR001'])).toThrow('Expected 2 packages');
  });

  it('throws on negative baseCost', () => {
    expect(() => parsePackages(-1, 1, ['PKG1 5 5 OFR001'])).toThrow('Base cost');
  });
});

describe('parseFleet', () => {
  it('parses valid fleet line', () => {
    expect(parseFleet('2 70 200')).toEqual({ count: 2, maxSpeed: 70, maxWeight: 200 });
  });

  it('throws on missing fields', () => {
    expect(() => parseFleet('2 70')).toThrow('expected 3 fields');
  });

  it('throws on non-numeric value', () => {
    expect(() => parseFleet('a 70 200')).toThrow('invalid vehicle count');
  });

  it('throws on zero count', () => {
    expect(() => parseFleet('0 70 200')).toThrow('count');
  });
});
