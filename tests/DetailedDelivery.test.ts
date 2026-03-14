import { estimateDetailedDelivery, calculatePackageCost } from '../src/DetailedDelivery';
import { Package, CalcOfferCriteria } from '../src/types';

const OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

describe('calculatePackageCost', () => {
  describe('Given a package with a matching offer', () => {
    it('should apply the discount from the specified offer code', () => {
      const pkg: Package = { id: 'PKG1', weight: 75, distance: 100, offerCode: 'OFR001' };
      const result = calculatePackageCost(pkg, 100, OFFERS);
      // deliveryCost = 100 + 75*10 + 100*5 = 1350
      // OFR001: distance > 0 && < 200 ✓, weight >= 70 && <= 200 ✓
      // discount = 1350 * 10 / 100 = 135
      expect(result.deliveryCost).toBe(1350);
      expect(result.discount).toBe(135);
      expect(result.totalCost).toBe(1215);
      expect(result.offerCode).toBe('OFR001');
    });
  });

  describe('Given a package with an offer code that does not match criteria', () => {
    it('should return 0 discount', () => {
      const pkg: Package = { id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' };
      const result = calculatePackageCost(pkg, 100, OFFERS);
      // weight 5 not in OFR001 range (70-200)
      expect(result.discount).toBe(0);
      expect(result.totalCost).toBe(175); // 100 + 5*10 + 5*5
    });
  });

  describe('Given a package with an unknown offer code', () => {
    it('should auto-match the best offer if one matches', () => {
      const pkg: Package = { id: 'PKG1', weight: 75, distance: 100, offerCode: 'UNKNOWN' };
      const result = calculatePackageCost(pkg, 100, OFFERS);
      // Should auto-match OFR001 (10% > OFR003 5%)
      expect(result.discount).toBeGreaterThan(0);
      expect(result.offerCode).toBe('OFR001');
    });
  });

  describe('Given a package with no matching offers at all', () => {
    it('should return 0 discount', () => {
      const pkg: Package = { id: 'PKG1', weight: 5, distance: 5, offerCode: 'NA' };
      const result = calculatePackageCost(pkg, 100, OFFERS);
      expect(result.discount).toBe(0);
      expect(result.totalCost).toBe(175);
    });
  });
});

describe('estimateDetailedDelivery', () => {
  const packages: Package[] = [
    { id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 75, distance: 125, offerCode: 'OFR008' },
    { id: 'PKG3', weight: 175, distance: 100, offerCode: 'OFR003' },
    { id: 'PKG4', weight: 110, distance: 60, offerCode: 'OFR002' },
    { id: 'PKG5', weight: 155, distance: 95, offerCode: 'NA' },
  ];
  const vehicles = { count: 2, maxSpeed: 70, maxWeight: 200 };

  describe('Given the challenge Problem 2 scenario', () => {
    it('should include delivery round and vehicle info', () => {
      const results = estimateDetailedDelivery(100, packages, OFFERS, vehicles);
      expect(results).toHaveLength(5);

      // Each result should have delivery metadata
      for (const r of results) {
        expect(r).toHaveProperty('deliveryRound');
        expect(r).toHaveProperty('vehicleId');
        expect(r).toHaveProperty('baseCost');
        expect(r).toHaveProperty('weight');
        expect(r).toHaveProperty('distance');
        expect(r).toHaveProperty('deliveryCost');
      }
    });

    it('should compute correct delivery times matching the challenge', () => {
      const results = estimateDetailedDelivery(100, packages, OFFERS, vehicles);
      const timeMap = new Map(results.map(r => [r.id, r.deliveryTime]));
      expect(timeMap.get('PKG4')).toBe(0.85);
      expect(timeMap.get('PKG2')).toBe(1.78);
      expect(timeMap.get('PKG3')).toBe(1.42);
      expect(timeMap.get('PKG1')).toBe(3.98);
      expect(timeMap.get('PKG5')).toBe(4.19);
    });

    it('should preserve original package order in results', () => {
      const results = estimateDetailedDelivery(100, packages, OFFERS, vehicles);
      expect(results.map(r => r.id)).toEqual(['PKG1', 'PKG2', 'PKG3', 'PKG4', 'PKG5']);
    });
  });

  describe('Given a package exceeding vehicle max weight', () => {
    it('should mark it as undeliverable', () => {
      const heavyPkgs: Package[] = [
        { id: 'PKG1', weight: 300, distance: 100, offerCode: 'OFR001' },
      ];
      const results = estimateDetailedDelivery(100, heavyPkgs, OFFERS, { count: 1, maxSpeed: 70, maxWeight: 200 });
      expect(results[0].undeliverable).toBe(true);
      expect(results[0].undeliverableReason).toBeDefined();
    });
  });
});
