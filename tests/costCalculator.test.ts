import { findBestOffer, calculatePackageCost, calculateDeliveryCost } from '../src/calculations/costCalculator';
import { setOffers } from '../src/calculations/offersManager';
import type { CalcOfferCriteria, Package } from '../src/types';

const DEFAULT_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

afterEach(() => {
  setOffers(DEFAULT_OFFERS);
});

describe('findBestOffer', () => {
  it('finds OFR001 for weight=100, distance=100 (matches OFR001 10%, OFR002 7%, OFR003 5%)', () => {
    const result = findBestOffer(100, 100);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('OFR001');
    expect(result!.criteria.discount).toBe(10);
  });

  it('finds OFR003 for weight=50, distance=100 (only OFR003 matches)', () => {
    const result = findBestOffer(50, 100);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('OFR003');
  });

  it('returns null when no offer matches', () => {
    // weight=5, distance=5 — too light for OFR001/OFR002, distance not > 50 for OFR003
    const result = findBestOffer(5, 5);
    expect(result).toBeNull();
  });

  it('excludes OFR001 at distance=200 boundary but OFR003 still matches', () => {
    // distance=200 is NOT < 200 for OFR001, but IS > 50 and < 250 for OFR003
    // weight=100 is in range 10-150 for OFR003
    const result = findBestOffer(100, 200);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('OFR003');
  });

  it('returns null when distance is at exclusive upper boundary for all offers', () => {
    // weight=10 only matches OFR003 (10-150), distance=250 is NOT < 250 → no match
    const result = findBestOffer(10, 250);
    expect(result).toBeNull();
  });

  it('returns null for boundary-exclusive distance=0 (not > 0 for OFR001)', () => {
    const result = findBestOffer(100, 0);
    expect(result).toBeNull();
  });

  it('matches weight at inclusive boundary (weight=70 meets >= 70 for OFR001)', () => {
    const result = findBestOffer(70, 100);
    expect(result).not.toBeNull();
    expect(result!.code).toBe('OFR001');
  });
});

describe('calculatePackageCost', () => {
  // deliveryCost = baseCost + weight*10 + distance*5

  it('applies discount when offer criteria match', () => {
    // PKG with OFR001: weight=100 (70-200 ✓), distance=100 (>0, <200 ✓)
    const pkg: Package = { id: 'PKG1', weight: 100, distance: 100, offerCode: 'OFR001' };
    const result = calculatePackageCost(pkg, 100);

    const expectedDeliveryCost = 100 + 100 * 10 + 100 * 5; // 1600
    const expectedDiscount = expectedDeliveryCost * 10 / 100; // 160
    expect(result.deliveryCost).toBe(expectedDeliveryCost);
    expect(result.discount).toBe(expectedDiscount);
    expect(result.totalCost).toBe(expectedDeliveryCost - expectedDiscount);
    expect(result.offerCode).toBe('OFR001');
  });

  it('gives 0 discount when criteria do not match', () => {
    // PKG with OFR001: weight=5 (< 70, doesn't meet min weight)
    const pkg: Package = { id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' };
    const result = calculatePackageCost(pkg, 100);

    expect(result.discount).toBe(0);
    expect(result.deliveryCost).toBe(100 + 5 * 10 + 5 * 5); // 175
    expect(result.totalCost).toBe(175);
    expect(result.offerCode).toBeUndefined();
  });

  it('gives 0 discount for NA offer code (does NOT auto-find)', () => {
    const pkg: Package = { id: 'PKG1', weight: 100, distance: 100, offerCode: 'NA' };
    const result = calculatePackageCost(pkg, 100);

    expect(result.discount).toBe(0);
    expect(result.offerCode).toBeUndefined();
  });

  it('gives 0 discount for unknown offer code like OFR008 (does NOT auto-find)', () => {
    const pkg: Package = { id: 'PKG1', weight: 100, distance: 100, offerCode: 'OFR008' };
    const result = calculatePackageCost(pkg, 100);

    expect(result.discount).toBe(0);
    expect(result.offerCode).toBeUndefined();
  });

  it('auto-finds best offer when offerCode is undefined', () => {
    const pkg: Package = { id: 'PKG1', weight: 100, distance: 100 };
    const result = calculatePackageCost(pkg, 100);

    // Should find OFR001 (10% discount, highest matching)
    const expectedDeliveryCost = 100 + 100 * 10 + 100 * 5; // 1600
    const expectedDiscount = expectedDeliveryCost * 10 / 100; // 160
    expect(result.discount).toBe(expectedDiscount);
    expect(result.offerCode).toBe('OFR001');
  });

  it('auto-finds no offer when nothing matches and offerCode is undefined', () => {
    const pkg: Package = { id: 'PKG1', weight: 5, distance: 5 };
    const result = calculatePackageCost(pkg, 100);

    expect(result.discount).toBe(0);
    expect(result.offerCode).toBeUndefined();
  });

  it('correctly applies OFR003 discount', () => {
    // OFR003: weight 10-150, distance >50, <250, discount 5%
    const pkg: Package = { id: 'PKG1', weight: 10, distance: 100, offerCode: 'OFR003' };
    const result = calculatePackageCost(pkg, 100);

    const expectedDeliveryCost = 100 + 10 * 10 + 100 * 5; // 700
    const expectedDiscount = 700 * 5 / 100; // 35
    expect(result.deliveryCost).toBe(700);
    expect(result.discount).toBe(35);
    expect(result.totalCost).toBe(665);
    expect(result.offerCode).toBe('OFR003');
  });
});

describe('calculateDeliveryCost', () => {
  it('formats output correctly for multiple packages', () => {
    const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
    const output = calculateDeliveryCost(input);
    const lines = output.split('\n');

    expect(lines).toHaveLength(3);

    // PKG1: deliveryCost = 100+50+25=175, OFR001 weight=5 < 70 → no discount
    expect(lines[0]).toBe('PKG1 0 175');

    // PKG2: deliveryCost = 100+150+25=275, OFR002 weight=15 < 100 → no discount
    expect(lines[1]).toBe('PKG2 0 275');

    // PKG3: deliveryCost = 100+100+500=700, OFR003 weight=10 (>=10), distance=100 (>50, <250) → 5% = 35
    expect(lines[2]).toBe('PKG3 35 665');
  });

  it('handles Everest challenge cost calculation', () => {
    const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
    const output = calculateDeliveryCost(input);
    expect(output).toBe('PKG1 0 175\nPKG2 0 275\nPKG3 35 665');
  });
});
