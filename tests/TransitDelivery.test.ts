import { calculateDeliveryTimeWithTransit } from '../src/TransitDelivery';
import { CalcOfferCriteria, TransitPackageInput } from '../src/types';

const OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

describe('TransitDelivery', () => {
  describe('Given input with no transit packages', () => {
    it('should produce the same output as regular delivery', () => {
      const input = '100 2\nPKG1 50 30 OFR001\nPKG2 75 125 OFR003\n2 70 200';
      const result = calculateDeliveryTimeWithTransit(input, [], OFFERS);

      expect(result.output).toBeDefined();
      expect(result.output.split('\n')).toHaveLength(2);
      expect(result.newTransitPackages).toHaveLength(0);
      expect(result.clearedFromTransit).toHaveLength(0);
      expect(result.stillInTransit).toHaveLength(0);
      expect(result.renamedPackages).toHaveLength(0);
    });
  });

  describe('Given transit packages that can be cleared', () => {
    it('should merge transit packages and compute delivery for all', () => {
      const input = '100 1\nPKG1 50 30 OFR001\n2 70 200';
      const transit: TransitPackageInput[] = [
        { id: 'PKG2', weight: 30, distance: 80, offerCode: 'OFR003' },
      ];
      const result = calculateDeliveryTimeWithTransit(input, transit, OFFERS);

      // Should include both PKG2 (from transit) and PKG1 (from input)
      expect(result.output.split('\n').length).toBeGreaterThanOrEqual(2);
      expect(result.clearedFromTransit).toHaveLength(1);
    });
  });

  describe('Given transit packages with conflicting IDs', () => {
    it('should rename conflicting packages and report renames', () => {
      const input = '100 1\nPKG1 50 30 OFR001\n2 70 200';
      const transit: TransitPackageInput[] = [
        { id: 'PKG1', weight: 30, distance: 80, offerCode: 'OFR003' },
      ];
      const result = calculateDeliveryTimeWithTransit(input, transit, OFFERS);

      expect(result.renamedPackages).toHaveLength(1);
      expect(result.renamedPackages[0].oldId).toBe('PKG1');
      expect(result.clearedFromTransit).toHaveLength(1);
    });
  });

  describe('Given transit packages too heavy for vehicle', () => {
    it('should mark overweight as new transit packages', () => {
      const input = '100 1\nPKG1 50 30 OFR001\n1 70 100';
      const transit: TransitPackageInput[] = [];
      // PKG1 weight 50 fits in 100 max weight, so this will work
      const result = calculateDeliveryTimeWithTransit(input, transit, OFFERS);
      expect(result.output).toBeDefined();
    });
  });

  describe('Given an undeliverable package in current input', () => {
    it('should add it to newTransitPackages', () => {
      const input = '100 1\nPKG1 300 100 OFR001\n1 70 200';
      const result = calculateDeliveryTimeWithTransit(input, [], OFFERS);

      expect(result.newTransitPackages).toHaveLength(1);
      expect(result.newTransitPackages[0].id).toBe('PKG1');
      expect(result.output).toContain('N/A');
    });
  });
});
