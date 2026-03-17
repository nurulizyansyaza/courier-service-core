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

  it('normalizes package IDs to uppercase', () => {
    const input = '100 1\npkg1 50 30 OFR001';
    const result = parseInput(input, 'cost');
    expect(result.packages[0].id).toBe('PKG1');
  });

  it('handles extra spaces between fields gracefully', () => {
    const input = '100   3\nPKG1   5   5   OFR001\nPKG2   15   5   OFR002\nPKG3   10   100   OFR003';
    const result = parseInput(input, 'cost');
    expect(result.packages).toHaveLength(3);
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
    expect(() => parseInput(input, 'cost')).toThrow(/must be a number/);
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

describe('parseInput — strict header validation', () => {
  it('rejects header with more than 2 values', () => {
    const input = '100 3 extra\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
    expect(() => parseInput(input, 'cost')).toThrow(/Line 1: Must have exactly 2 values/);
  });

  it('rejects header with only 1 value', () => {
    const input = '100\nPKG1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Line 1: Must have exactly 2 values/);
  });

  it('rejects non-numeric base cost', () => {
    const input = 'abc 1\nPKG1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Base cost "abc" must be a number/);
  });

  it('rejects non-numeric package count', () => {
    const input = '100 abc\nPKG1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Package count "abc" must be a whole number/);
  });

  it('rejects decimal package count', () => {
    const input = '100 2.5\nPKG1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Package count "2.5" must be a whole number/);
  });

  it('rejects negative base cost', () => {
    const input = '-100 1\nPKG1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Base cost "-100" must be a number/);
  });
});

describe('parseInput — strict package line validation', () => {
  it('rejects non-numeric weight', () => {
    const input = '100 1\nPKG1 abc 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid weight "abc": Must be a number/);
  });

  it('rejects non-numeric distance', () => {
    const input = '100 1\nPKG1 5 abc OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid distance "abc": Must be a number/);
  });

  it('rejects negative weight', () => {
    const input = '100 1\nPKG1 -5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid weight "-5": Must be a number/);
  });

  it('rejects negative distance', () => {
    const input = '100 1\nPKG1 5 -10 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid distance "-10": Must be a number/);
  });

  it('rejects weight with letters', () => {
    const input = '100 1\nPKG1 5kg 10 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid weight "5kg": Must be a number/);
  });

  it('rejects distance with letters', () => {
    const input = '100 1\nPKG1 5 10km OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/Invalid distance "10km": Must be a number/);
  });
});

describe('parseInput — extra spaces in identifiers', () => {
  it('detects space in package ID (PKG 1)', () => {
    const input = '100 1\nPKG 1 5 5 OFR001';
    expect(() => parseInput(input, 'cost')).toThrow(/No spaces allowed in package ID/);
  });

  it('detects space in offer code (OFR 001)', () => {
    const input = '100 1\nPKG1 5 5 OFR 001';
    expect(() => parseInput(input, 'cost')).toThrow(/No spaces allowed in offer code/);
  });

  it('detects spaces in both package ID and offer code', () => {
    const input = '100 1\nPKG 1 5 5 OFR 001';
    const error = getErrorMessage(() => parseInput(input, 'cost'));
    expect(error).toContain('No spaces allowed in package ID');
    expect(error).toContain('No spaces allowed in offer code');
  });

  it('does not falsely flag valid package ID as spaced when offer code has space', () => {
    const input = '100 1\npkg3 100 40 ofr 002';
    const error = getErrorMessage(() => parseInput(input, 'cost'));
    expect(error).toContain('No spaces allowed in offer code');
    expect(error).not.toContain('No spaces allowed in package ID');
  });
});

describe('parseInput — multi-error collection', () => {
  it('collects multiple errors across different lines', () => {
    const input = '100 2\nABC 5 5 BADCODE\nXYZ abc def INVALID';
    const error = getErrorMessage(() => parseInput(input, 'cost'));
    expect(error).toContain('Invalid package ID "ABC"');
    expect(error).toContain('Invalid offer code "BADCODE"');
    expect(error).toContain('Invalid package ID "XYZ"');
    expect(error).toContain('Invalid weight "abc"');
    expect(error).toContain('Invalid distance "def"');
    expect(error).toContain('Invalid offer code "INVALID"');
  });

  it('collects header error plus package errors', () => {
    const input = 'abc xyz\nBAD -5 abc WRONG';
    const error = getErrorMessage(() => parseInput(input, 'cost'));
    expect(error).toContain('Base cost "abc" must be a number');
    expect(error).toContain('Package count "xyz" must be a whole number');
    expect(error).toContain('Invalid package ID "BAD"');
    expect(error).toContain('Invalid weight "-5"');
    expect(error).toContain('Invalid distance "abc"');
    expect(error).toContain('Invalid offer code "WRONG"');
  });

  it('collects errors from multiple package lines at once', () => {
    const input = '100 3\nPKG1 abc 5 OFR001\nPKG2 10 def OFR002\nPKG3 5 5 BADCODE';
    const error = getErrorMessage(() => parseInput(input, 'cost'));
    expect(error).toContain('Line 2: Invalid weight "abc"');
    expect(error).toContain('Line 3: Invalid distance "def"');
    expect(error).toContain('Line 4: Invalid offer code "BADCODE"');
  });

  it('shows all field errors within a single package line', () => {
    const input = '100 1\nBAD abc def WRONG';
    const error = getErrorMessage(() => parseInput(input, 'cost'));
    expect(error).toContain('Invalid package ID "BAD"');
    expect(error).toContain('Invalid weight "abc"');
    expect(error).toContain('Invalid distance "def"');
    expect(error).toContain('Invalid offer code "WRONG"');
  });

  it('includes vehicle errors alongside package errors in time mode', () => {
    const input = '100 1\nBAD 5 5 OFR001\n0 0 0';
    const error = getErrorMessage(() => parseInput(input, 'time'));
    expect(error).toContain('Invalid package ID "BAD"');
    expect(error).toContain('Number of vehicles must be at least 1');
    expect(error).toContain('Max speed must be greater than 0');
    expect(error).toContain('Max weight must be greater than 0');
  });
});

function getErrorMessage(fn: () => void): string {
  try {
    fn();
    return '';
  } catch (e: unknown) {
    return (e as Error).message;
  }
}
