import { setOffers, getOffers, getOffersRef } from '../src/calculations/offersManager';
import type { CalcOfferCriteria } from '../src/types';

const DEFAULT_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

afterEach(() => {
  setOffers(DEFAULT_OFFERS);
});

describe('getOffers', () => {
  it('returns default offers including OFR001, OFR002, OFR003', () => {
    const offers = getOffers();
    expect(Object.keys(offers)).toEqual(expect.arrayContaining(['OFR001', 'OFR002', 'OFR003']));
    expect(Object.keys(offers)).toHaveLength(3);
  });

  it('returns correct discount values for defaults', () => {
    const offers = getOffers();
    expect(offers.OFR001.discount).toBe(10);
    expect(offers.OFR002.discount).toBe(7);
    expect(offers.OFR003.discount).toBe(5);
  });

  it('returns a shallow copy — adding keys does not affect internal state', () => {
    const offers = getOffers();
    offers['NEW_CODE'] = { discount: 50, minDistance: 0, maxDistance: 100, minWeight: 0, maxWeight: 100 };

    const offersAgain = getOffers();
    expect(offersAgain['NEW_CODE']).toBeUndefined();
  });

  it('shallow copy shares inner object references (spread is shallow)', () => {
    const offers = getOffers();
    // Spread only copies top-level keys; inner objects are shared references
    offers.OFR001.discount = 99;
    const offersAgain = getOffers();
    // This reflects the mutation because spread is shallow
    expect(offersAgain.OFR001.discount).toBe(99);
  });
});

describe('getOffersRef', () => {
  it('returns a reference — mutations are reflected', () => {
    const ref = getOffersRef();
    ref.OFR001.discount = 42;

    const ref2 = getOffersRef();
    expect(ref2.OFR001.discount).toBe(42);
  });
});

describe('setOffers', () => {
  it('replaces all offers', () => {
    const customOffers: Record<string, CalcOfferCriteria> = {
      CUSTOM1: { discount: 20, minDistance: 0, maxDistance: 100, minWeight: 0, maxWeight: 500 },
    };

    setOffers(customOffers);
    const offers = getOffers();
    expect(Object.keys(offers)).toEqual(['CUSTOM1']);
    expect(offers.CUSTOM1.discount).toBe(20);
    expect(offers['OFR001']).toBeUndefined();
  });

  it('makes a shallow copy — mutating original does not affect stored offers', () => {
    const customOffers: Record<string, CalcOfferCriteria> = {
      TEST: { discount: 5, minDistance: 0, maxDistance: 50, minWeight: 0, maxWeight: 50 },
    };

    setOffers(customOffers);
    customOffers['ADDED'] = { discount: 99, minDistance: 0, maxDistance: 100, minWeight: 0, maxWeight: 100 };

    const offers = getOffers();
    expect(offers['ADDED']).toBeUndefined();
  });
});
