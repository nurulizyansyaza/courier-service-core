import { CalcOfferCriteria, Offer } from './types';

export const DEFAULT_CALC_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

export function toOfferArray(offers: Record<string, CalcOfferCriteria>): Offer[] {
  return Object.entries(offers).map(([code, c]) => ({
    code,
    discount: c.discount,
    weight: { min: c.minWeight, max: c.maxWeight },
    distance: { min: c.minDistance, max: c.maxDistance },
  }));
}

export interface OfferManager {
  getOffers(): Record<string, CalcOfferCriteria>;
  setOffers(offers: Record<string, CalcOfferCriteria>): void;
  isValidOfferCode(code: string): boolean;
}

export function createOfferManager(
  initial?: Record<string, CalcOfferCriteria>
): OfferManager {
  let offers = { ...(initial ?? DEFAULT_CALC_OFFERS) };

  return {
    getOffers: () => ({ ...offers }),
    setOffers: (newOffers) => { offers = { ...newOffers }; },
    isValidOfferCode: (code) => code.toUpperCase() in offers,
  };
}

export function findBestOffer(
  weight: number,
  distance: number,
  offers: Record<string, CalcOfferCriteria>
): { code: string; criteria: CalcOfferCriteria } | null {
  let best: { code: string; criteria: CalcOfferCriteria } | null = null;

  for (const [code, criteria] of Object.entries(offers)) {
    const distanceValid = distance > criteria.minDistance && distance < criteria.maxDistance;
    const weightValid = weight >= criteria.minWeight && weight <= criteria.maxWeight;

    if (distanceValid && weightValid) {
      if (!best || criteria.discount > best.criteria.discount) {
        best = { code, criteria };
      }
    }
  }

  return best;
}

export function getOfferCodeFromDiscount(
  deliveryCost: number,
  discount: number,
  offers: Record<string, CalcOfferCriteria>
): string | undefined {
  if (discount === 0) return undefined;
  if (deliveryCost <= 0) return undefined;

  const discountPercent = (discount / deliveryCost) * 100;

  for (const [code, criteria] of Object.entries(offers)) {
    if (Math.abs(discountPercent - criteria.discount) < 0.5) return code;
  }

  return 'OFFER APPLIED';
}
