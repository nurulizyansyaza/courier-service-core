import {
  computeDeliveryResultsFromParsed,
  calculateDeliveryTime,
  calculateDeliveryTimeWithTransit,
} from '../src/calculations/deliveryPlanner';
import { setOffers } from '../src/calculations/offersManager';
import type { CalcOfferCriteria, Package, TransitPackageInput } from '../src/types';

const DEFAULT_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

afterEach(() => {
  setOffers(DEFAULT_OFFERS);
});

describe('computeDeliveryResultsFromParsed — Everest challenge', () => {
  const baseCost = 100;
  const packages: Package[] = [
    { id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 75, distance: 125, offerCode: 'OFR008' },
    { id: 'PKG3', weight: 175, distance: 100, offerCode: 'OFR003' },
    { id: 'PKG4', weight: 110, distance: 60, offerCode: 'OFR002' },
    { id: 'PKG5', weight: 155, distance: 95, offerCode: 'NA' },
  ];
  const vehicles = { count: 2, maxSpeed: 70, maxWeight: 200 };

  it('produces correct discount, cost, and time for all 5 packages', () => {
    const results = computeDeliveryResultsFromParsed(baseCost, packages, vehicles);

    expect(results).toHaveLength(5);

    // Results are ordered by input order
    // PKG1: deliveryCost=100+500+150=750, OFR001 weight=50 <70 → no discount → 0, 750
    const pkg1 = results.find(r => r.id === 'PKG1')!;
    expect(Math.round(pkg1.discount)).toBe(0);
    expect(Math.round(pkg1.totalCost)).toBe(750);

    // PKG2: deliveryCost=100+750+625=1475, OFR008 unknown → 0
    const pkg2 = results.find(r => r.id === 'PKG2')!;
    expect(Math.round(pkg2.discount)).toBe(0);
    expect(Math.round(pkg2.totalCost)).toBe(1475);

    // PKG3: deliveryCost=100+1750+500=2350, OFR003 weight=175 >150 → no discount → 0
    const pkg3 = results.find(r => r.id === 'PKG3')!;
    expect(Math.round(pkg3.discount)).toBe(0);
    expect(Math.round(pkg3.totalCost)).toBe(2350);

    // PKG4: deliveryCost=100+1100+300=1500, OFR002 weight=110 (100-250), distance=60 (>50, <150) → 7% = 105
    const pkg4 = results.find(r => r.id === 'PKG4')!;
    expect(Math.round(pkg4.discount)).toBe(105);
    expect(Math.round(pkg4.totalCost)).toBe(1395);

    // PKG5: deliveryCost=100+1550+475=2125, NA → 0
    const pkg5 = results.find(r => r.id === 'PKG5')!;
    expect(Math.round(pkg5.discount)).toBe(0);
    expect(Math.round(pkg5.totalCost)).toBe(2125);
  });

  it('computes correct delivery times', () => {
    const results = computeDeliveryResultsFromParsed(baseCost, packages, vehicles);

    const pkg1 = results.find(r => r.id === 'PKG1')!;
    const pkg2 = results.find(r => r.id === 'PKG2')!;
    const pkg3 = results.find(r => r.id === 'PKG3')!;
    const pkg4 = results.find(r => r.id === 'PKG4')!;
    const pkg5 = results.find(r => r.id === 'PKG5')!;

    // Expected from Everest challenge:
    // PKG1 → 3.98 (truncated to 2 decimal places)
    // PKG2 → 1.78
    // PKG3 → 1.42
    // PKG4 → 0.85
    // PKG5 → 4.18 or similar
    expect(pkg4.deliveryTime).toBe(0.85);   // 60/70 = 0.857... → truncated to 0.85
    expect(pkg3.deliveryTime).toBe(1.42);   // 100/70 = 1.428... → truncated to 1.42
    expect(pkg2.deliveryTime).toBe(1.78);   // 125/70 = 1.785... → truncated to 1.78
  });

  it('marks packages with deliveryRound and vehicleId', () => {
    const results = computeDeliveryResultsFromParsed(baseCost, packages, vehicles);

    for (const r of results) {
      if (!r.undeliverable) {
        expect(r.deliveryRound).toBeGreaterThanOrEqual(1);
        expect(r.vehicleId).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

describe('computeDeliveryResultsFromParsed — undeliverable packages', () => {
  it('marks packages exceeding maxWeight as undeliverable', () => {
    const baseCost = 100;
    const packages: Package[] = [
      { id: 'PKG1', weight: 300, distance: 50, offerCode: 'NA' },
    ];
    const vehicles = { count: 1, maxSpeed: 70, maxWeight: 200 };

    const results = computeDeliveryResultsFromParsed(baseCost, packages, vehicles);

    expect(results).toHaveLength(1);
    expect(results[0].undeliverable).toBe(true);
    expect(results[0].undeliverableReason).toContain('300kg');
    expect(results[0].deliveryTime).toBeUndefined();
  });
});

describe('computeDeliveryResultsFromParsed — single package', () => {
  it('delivers a single package correctly', () => {
    const baseCost = 100;
    const packages: Package[] = [
      { id: 'PKG1', weight: 50, distance: 100, offerCode: 'NA' },
    ];
    const vehicles = { count: 1, maxSpeed: 50, maxWeight: 200 };

    const results = computeDeliveryResultsFromParsed(baseCost, packages, vehicles);

    expect(results).toHaveLength(1);
    expect(results[0].deliveryTime).toBe(2); // 100/50 = 2.00
    expect(results[0].undeliverable).toBeUndefined();
  });
});

describe('calculateDeliveryTime', () => {
  it('returns formatted output string for Everest challenge', () => {
    const input = '100 5\nPKG1 50 30 OFR001\nPKG2 75 125 OFR008\nPKG3 175 100 OFR003\nPKG4 110 60 OFR002\nPKG5 155 95 NA\n2 70 200';
    const output = calculateDeliveryTime(input);
    const lines = output.split('\n');

    expect(lines).toHaveLength(5);

    // Each line: id discount totalCost time
    for (const line of lines) {
      const parts = line.split(/\s+/);
      expect(parts).toHaveLength(4);
      expect(parts[0]).toMatch(/^PKG\d+$/);
    }
  });

  it('marks undeliverable packages as N/A in output', () => {
    const input = '100 1\nPKG1 300 50 NA\n1 70 200';
    const output = calculateDeliveryTime(input);
    expect(output).toContain('N/A');
  });
});

describe('calculateDeliveryTimeWithTransit', () => {
  it('merges transit packages into delivery plan', () => {
    const input = '100 1\nPKG1 50 30 OFR001\n1 70 200';
    const transitPackages: TransitPackageInput[] = [
      { id: 'PKG2', weight: 80, distance: 100, offerCode: 'OFR001' },
    ];

    const result = calculateDeliveryTimeWithTransit(input, transitPackages);

    expect(result.output).toContain('PKG1');
    expect(result.output).toContain('PKG2');
    expect(result.clearedFromTransit).toHaveLength(1);
    expect(result.clearedFromTransit[0].id).toBe('PKG2');
  });

  it('handles ID conflicts by renaming new packages', () => {
    const input = '100 1\nPKG1 50 30 OFR001\n1 70 200';
    const transitPackages: TransitPackageInput[] = [
      { id: 'PKG1', weight: 80, distance: 100, offerCode: 'OFR001' },
    ];

    const result = calculateDeliveryTimeWithTransit(input, transitPackages);

    // The new PKG1 from input should be renamed
    expect(result.renamedPackages).toHaveLength(1);
    expect(result.renamedPackages[0].oldId).toBe('PKG1');
    expect(result.renamedPackages[0].newId).toMatch(/^PKG\d+$/);
  });

  it('keeps undeliverable transit packages in stillInTransit', () => {
    const input = '100 1\nPKG1 50 30 OFR001\n1 70 200';
    const transitPackages: TransitPackageInput[] = [
      { id: 'PKG2', weight: 300, distance: 100, offerCode: 'NA' },
    ];

    const result = calculateDeliveryTimeWithTransit(input, transitPackages);
    expect(result.stillInTransit).toHaveLength(1);
    expect(result.stillInTransit[0].id).toBe('PKG2');
  });

  it('returns empty arrays when no transit packages', () => {
    const input = '100 1\nPKG1 50 30 OFR001\n1 70 200';
    const result = calculateDeliveryTimeWithTransit(input, []);

    expect(result.clearedFromTransit).toHaveLength(0);
    expect(result.stillInTransit).toHaveLength(0);
    expect(result.renamedPackages).toHaveLength(0);
    expect(result.newTransitPackages).toHaveLength(0);
  });
});
