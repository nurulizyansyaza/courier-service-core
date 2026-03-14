import { parseOutput } from '../src/OutputParser';
import { CalcOfferCriteria } from '../src/types';

const OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

describe('OutputParser', () => {
  describe('Given cost mode output', () => {
    it('should parse package results from output lines', () => {
      const output = 'PKG1 0 175\nPKG2 0 275\nPKG3 35 665';
      const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
      const results = parseOutput(output, 'cost', input, OFFERS);

      expect(results).toHaveLength(3);
      expect(results[0].id).toBe('PKG1');
      expect(results[0].discount).toBe('0');
      expect(results[0].totalCost).toBe('175.00');
      expect(results[2].id).toBe('PKG3');
      expect(results[2].discount).toBe('35');
      expect(results[2].offerApplied).toBe('OFR003');
    });
  });

  describe('Given time mode output', () => {
    it('should parse delivery time from output lines', () => {
      const output = 'PKG1 0 750 3.98\nPKG2 0 1475 1.78';
      const input = '100 2\nPKG1 50 30 OFR001\nPKG2 75 125 OFR008\n2 70 200';
      const results = parseOutput(output, 'time', input, OFFERS);

      expect(results).toHaveLength(2);
      expect(results[0].deliveryTime).toBe('3.98');
      expect(results[1].deliveryTime).toBe('1.78');
    });

    it('should handle N/A delivery time for undeliverable packages', () => {
      const output = 'PKG1 0 3100 N/A';
      const input = '100 1\nPKG1 300 100 OFR001\n1 70 200';
      const results = parseOutput(output, 'time', input, OFFERS);

      expect(results).toHaveLength(1);
      expect(results[0].deliveryTime).toBe('N/A');
    });
  });

  describe('Given empty output', () => {
    it('should return empty array', () => {
      expect(parseOutput('', 'cost', '', OFFERS)).toEqual([]);
      expect(parseOutput('   ', 'cost', '', OFFERS)).toEqual([]);
    });
  });

  describe('Given output with discount > 0', () => {
    it('should identify the applied offer code', () => {
      const output = 'PKG1 135 1215';
      const input = '100 1\nPKG1 75 100 OFR001';
      const results = parseOutput(output, 'cost', input, OFFERS);

      expect(results[0].offerApplied).toBe('OFR001');
    });
  });
});
