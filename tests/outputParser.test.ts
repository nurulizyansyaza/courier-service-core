import { parseOutput, getOfferCodeFromDiscount } from '../src/calculations/outputParser';
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

describe('getOfferCodeFromDiscount', () => {
  it('returns undefined for zero discount', () => {
    expect(getOfferCodeFromDiscount(1000, 0)).toBeUndefined();
  });

  it('identifies OFR001 from 10% discount', () => {
    // 10% of 1000 = 100
    expect(getOfferCodeFromDiscount(1000, 100)).toBe('OFR001');
  });

  it('identifies OFR002 from 7% discount', () => {
    // 7% of 1000 = 70
    expect(getOfferCodeFromDiscount(1000, 70)).toBe('OFR002');
  });

  it('identifies OFR003 from 5% discount', () => {
    // 5% of 500 = 25
    expect(getOfferCodeFromDiscount(500, 25)).toBe('OFR003');
  });

  it('returns "OFFER APPLIED" for unrecognized non-zero discount', () => {
    // 20% = not matching any default offer
    expect(getOfferCodeFromDiscount(1000, 200)).toBe('OFFER APPLIED');
  });
});

describe('parseOutput — cost mode', () => {
  it('parses cost output back to structured results', () => {
    const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
    const output = 'PKG1 0 175\nPKG2 0 275\nPKG3 35 665';

    const results = parseOutput(output, 'cost', input);

    expect(results).toHaveLength(3);

    expect(results[0].id).toBe('PKG1');
    expect(results[0].discount).toBe('0');
    expect(results[0].totalCost).toBe('175.00');
    expect(results[0].weight).toBe(5);
    expect(results[0].distance).toBe(5);
    expect(results[0].offerApplied).toBeUndefined(); // 0 discount

    expect(results[2].id).toBe('PKG3');
    expect(results[2].discount).toBe('35');
    expect(results[2].offerApplied).toBe('OFR003');
  });

  it('returns empty array for empty output', () => {
    expect(parseOutput('', 'cost', '100 1\nPKG1 5 5 OFR001')).toEqual([]);
  });
});

describe('parseOutput — time mode', () => {
  it('parses time output with delivery times', () => {
    const input = '100 1\nPKG1 50 30 OFR001\n1 70 200';
    const output = 'PKG1 0 750 0.42';

    const results = parseOutput(output, 'time', input);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('PKG1');
    expect(results[0].deliveryTime).toBe('0.42');
    expect(results[0].weight).toBe(50);
    expect(results[0].distance).toBe(30);
  });

  it('parses N/A delivery time for undeliverable packages', () => {
    const input = '100 1\nPKG1 300 50 NA\n1 70 200';
    const output = 'PKG1 0 3350 N/A';

    const results = parseOutput(output, 'time', input);

    expect(results).toHaveLength(1);
    expect(results[0].deliveryTime).toBe('N/A');
    expect(results[0].undeliverable).toBe(true);
  });
});

describe('parseOutput — integration via barrel export', () => {
  it('works when imported from barrel', async () => {
    const { parseOutput: barrelParseOutput } = await import('../src');
    const input = '100 1\nPKG1 50 30 OFR001\n1 70 200';
    const output = 'PKG1 0 750 0.42';

    const results = barrelParseOutput(output, 'time', input);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('PKG1');
  });
});
