import { isValidPackageId, isValidOfferCode, normalizeOfferCode } from '../src/calculations/validators';
import { setOffers, getOffers } from '../src/calculations/offersManager';
import type { CalcOfferCriteria } from '../src/types';

const DEFAULT_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

afterEach(() => {
  setOffers(DEFAULT_OFFERS);
});

describe('isValidPackageId', () => {
  it.each(['PKG1', 'PKG2', 'PKG10', 'PKG999', 'pkg1', 'pkg99', 'Pkg5'])(
    'accepts valid ID "%s"',
    (id) => {
      expect(isValidPackageId(id)).toBe(true);
    }
  );

  it.each(['ABC', 'P1', 'PKG', 'PKG 1', '', '123', 'PACKAGE1', 'pk1', 'PK1', 'PKGone'])(
    'rejects invalid ID "%s"',
    (id) => {
      expect(isValidPackageId(id)).toBe(false);
    }
  );
});

describe('isValidOfferCode', () => {
  it.each(['OFR001', 'OFR002', 'OFR003', 'ofr001', 'Ofr002', 'NA', 'na', 'OFR999', 'OFR100'])(
    'accepts valid offer code "%s"',
    (code) => {
      expect(isValidOfferCode(code)).toBe(true);
    }
  );

  it.each(['RANDOM', '', 'ABC', 'OFR', 'OFR00A', 'OFR 001', '123', 'OFFER1'])(
    'rejects invalid offer code "%s"',
    (code) => {
      expect(isValidOfferCode(code)).toBe(false);
    }
  );

  it('accepts a custom offer code that exists in the offers map', () => {
    setOffers({ ...DEFAULT_OFFERS, CUSTOM99: { discount: 15, minDistance: 0, maxDistance: 100, minWeight: 0, maxWeight: 100 } });
    expect(isValidOfferCode('CUSTOM99')).toBe(true);
  });
});

describe('normalizeOfferCode', () => {
  it('uppercases lowercase codes', () => {
    expect(normalizeOfferCode('ofr001')).toBe('OFR001');
  });

  it('leaves uppercase codes unchanged', () => {
    expect(normalizeOfferCode('OFR003')).toBe('OFR003');
  });

  it('handles mixed case', () => {
    expect(normalizeOfferCode('Ofr002')).toBe('OFR002');
  });

  it('uppercases NA', () => {
    expect(normalizeOfferCode('na')).toBe('NA');
  });
});
