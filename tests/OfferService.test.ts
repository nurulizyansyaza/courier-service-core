import { applyOffer } from '../src/OfferService';
import { Offer, Package } from '../src/types';

const offers: Offer[] = [
  { code: 'OFR001', discount: 10, weight: { min: 70, max: 200 }, distance: { min: 0, max: 200, exclusive: true } },
  { code: 'OFR002', discount: 7, weight: { min: 100, max: 250 }, distance: { min: 50, max: 150 } },
  { code: 'OFR003', discount: 5, weight: { min: 10, max: 150 }, distance: { min: 50, max: 250 } },
];

const pkg = (weight: number, distance: number, offerCode: string): Package => ({
  id: 'P', weight, distance, offerCode,
});

describe('applyOffer', () => {
  it('applies OFR001 (10%) when criteria match', () => {
    expect(applyOffer(700, pkg(10, 100, 'OFR003'), offers)).toBe(35);
  });

  it('applies OFR002 (7%) when criteria match', () => {
    expect(applyOffer(1500, pkg(110, 60, 'OFR002'), offers)).toBe(105);
  });

  it('returns 0 for unknown offer code', () => {
    expect(applyOffer(1475, pkg(75, 125, 'OFR008'), offers)).toBe(0);
  });

  it('returns 0 when weight out of range', () => {
    expect(applyOffer(175, pkg(5, 5, 'OFR001'), offers)).toBe(0);
  });

  it('returns 0 when distance out of range', () => {
    expect(applyOffer(275, pkg(15, 5, 'OFR002'), offers)).toBe(0);
  });

  it('returns 0 when no offer code provided', () => {
    expect(applyOffer(500, pkg(50, 30, ''), offers)).toBe(0);
  });

  it('OFR001 distance is exclusive upper — 200 excluded', () => {
    expect(applyOffer(3100, pkg(100, 200, 'OFR001'), offers)).toBe(0);
  });

  it('OFR001 distance exclusive — 199 included', () => {
    expect(applyOffer(3085, pkg(100, 199, 'OFR001'), offers)).toBe(308.5);
  });

  it('OFR002 distance is inclusive — 150 included', () => {
    expect(applyOffer(2350, pkg(100, 150, 'OFR002'), offers)).toBe(164.5);
  });

  it('weight at exact min boundary (OFR003 min=10)', () => {
    expect(applyOffer(700, pkg(10, 100, 'OFR003'), offers)).toBe(35);
  });

  it('weight at exact max boundary (OFR003 max=150)', () => {
    expect(applyOffer(2350, pkg(150, 100, 'OFR003'), offers)).toBe(117.5);
  });

  it('weight below min returns 0', () => {
    expect(applyOffer(590, pkg(9, 100, 'OFR003'), offers)).toBe(0);
  });

  it('weight above max returns 0', () => {
    expect(applyOffer(2360, pkg(151, 100, 'OFR003'), offers)).toBe(0);
  });
});
