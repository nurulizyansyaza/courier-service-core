import type { CalcOfferCriteria } from '../types';

let OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: {
    discount: 10,
    minDistance: 0,
    maxDistance: 200,
    minWeight: 70,
    maxWeight: 200,
  },
  OFR002: {
    discount: 7,
    minDistance: 50,
    maxDistance: 150,
    minWeight: 100,
    maxWeight: 250,
  },
  OFR003: {
    discount: 5,
    minDistance: 50,
    maxDistance: 250,
    minWeight: 10,
    maxWeight: 150,
  },
};

export function setOffers(offers: Record<string, CalcOfferCriteria>) {
  OFFERS = { ...offers };
}

export function getOffers(): Record<string, CalcOfferCriteria> {
  return { ...OFFERS };
}

export function getOffersRef(): Record<string, CalcOfferCriteria> {
  return OFFERS;
}
