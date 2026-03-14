import {
  createOfferManager,
  findBestOffer,
  getOfferCodeFromDiscount,
} from '../src/OfferManager';
import { CalcOfferCriteria } from '../src/types';

const DEFAULT_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

describe('OfferManager', () => {
  describe('Given a mutable offer registry', () => {
    it('should initialize with default offers', () => {
      const mgr = createOfferManager();
      const offers = mgr.getOffers();
      expect(offers).toHaveProperty('OFR001');
      expect(offers).toHaveProperty('OFR002');
      expect(offers).toHaveProperty('OFR003');
    });

    it('should allow setting custom offers', () => {
      const mgr = createOfferManager();
      mgr.setOffers({ CUSTOM: { discount: 20, minDistance: 0, maxDistance: 100, minWeight: 0, maxWeight: 50 } });
      const offers = mgr.getOffers();
      expect(offers).toHaveProperty('CUSTOM');
      expect(offers).not.toHaveProperty('OFR001');
    });

    it('should return a copy (not a reference) from getOffers', () => {
      const mgr = createOfferManager();
      const offers1 = mgr.getOffers();
      offers1['MUTATED'] = { discount: 99, minDistance: 0, maxDistance: 0, minWeight: 0, maxWeight: 0 };
      const offers2 = mgr.getOffers();
      expect(offers2).not.toHaveProperty('MUTATED');
    });

    it('should validate offer codes against the registry', () => {
      const mgr = createOfferManager();
      expect(mgr.isValidOfferCode('OFR001')).toBe(true);
      expect(mgr.isValidOfferCode('ofr001')).toBe(true);
      expect(mgr.isValidOfferCode('INVALID')).toBe(false);
    });
  });

  describe('findBestOffer', () => {
    it('should find the offer with highest discount when multiple match', () => {
      const result = findBestOffer(75, 100, DEFAULT_OFFERS);
      expect(result).not.toBeNull();
      expect(result!.code).toBe('OFR001');
      expect(result!.criteria.discount).toBe(10);
    });

    it('should return null when no offers match', () => {
      const result = findBestOffer(5, 5, DEFAULT_OFFERS);
      expect(result).toBeNull();
    });

    it('should use exclusive distance bounds (> min and < max)', () => {
      // OFR001 distance: 0-200, weight: 70-200
      // At distance=0 (boundary), should NOT match (exclusive)
      const atMin = findBestOffer(100, 0, DEFAULT_OFFERS);
      // Weight 100 matches OFR001 (70-200) but distance 0 is NOT > 0
      expect(atMin === null || atMin.code !== 'OFR001').toBe(true);

      // At distance=200 (boundary), should NOT match (exclusive)
      const atMax = findBestOffer(100, 200, DEFAULT_OFFERS);
      expect(atMax === null || atMax.code !== 'OFR001').toBe(true);
    });

    it('should use inclusive weight bounds (>= min and <= max)', () => {
      // OFR003: weight 10-150, distance 50-250
      const atMinWeight = findBestOffer(10, 100, DEFAULT_OFFERS);
      expect(atMinWeight).not.toBeNull();

      const atMaxWeight = findBestOffer(150, 100, DEFAULT_OFFERS);
      expect(atMaxWeight).not.toBeNull();
    });
  });

  describe('getOfferCodeFromDiscount', () => {
    it('should identify OFR001 from a 10% discount', () => {
      const deliveryCost = 1000;
      const discount = 100; // 10%
      const result = getOfferCodeFromDiscount(deliveryCost, discount, DEFAULT_OFFERS);
      expect(result).toBe('OFR001');
    });

    it('should identify OFR002 from a 7% discount', () => {
      const deliveryCost = 1500;
      const discount = 105; // 7%
      const result = getOfferCodeFromDiscount(deliveryCost, discount, DEFAULT_OFFERS);
      expect(result).toBe('OFR002');
    });

    it('should identify OFR003 from a 5% discount', () => {
      const deliveryCost = 700;
      const discount = 35; // 5%
      const result = getOfferCodeFromDiscount(deliveryCost, discount, DEFAULT_OFFERS);
      expect(result).toBe('OFR003');
    });

    it('should return undefined when discount is 0', () => {
      expect(getOfferCodeFromDiscount(1000, 0, DEFAULT_OFFERS)).toBeUndefined();
    });

    it('should return "OFFER APPLIED" when no matching offer found', () => {
      const result = getOfferCodeFromDiscount(1000, 150, DEFAULT_OFFERS); // 15% — no match
      expect(result).toBe('OFFER APPLIED');
    });
  });
});
