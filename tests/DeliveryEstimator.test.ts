import { estimateCost, estimateDelivery } from '../src/DeliveryEstimator';
import { Offer, Package, Fleet } from '../src/types';

const offers: Offer[] = [
  { code: 'OFR001', discount: 10, weight: { min: 70, max: 200 }, distance: { min: 0, max: 200, exclusive: true } },
  { code: 'OFR002', discount: 7, weight: { min: 100, max: 250 }, distance: { min: 50, max: 150 } },
  { code: 'OFR003', discount: 5, weight: { min: 10, max: 150 }, distance: { min: 50, max: 250 } },
];

describe('estimateCost (Problem 1)', () => {
  const packages: Package[] = [
    { id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 15, distance: 5, offerCode: 'OFR002' },
    { id: 'PKG3', weight: 10, distance: 100, offerCode: 'OFR003' },
  ];

  it('returns correct results for challenge Problem 1', () => {
    const results = estimateCost(100, packages, offers);
    expect(results).toEqual([
      { id: 'PKG1', discount: 0, cost: 175, time: 0 },
      { id: 'PKG2', discount: 0, cost: 275, time: 0 },
      { id: 'PKG3', discount: 35, cost: 665, time: 0 },
    ]);
  });
});

describe('estimateDelivery (Problem 2)', () => {
  const packages: Package[] = [
    { id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' },
    { id: 'PKG2', weight: 75, distance: 125, offerCode: 'OFR008' },
    { id: 'PKG3', weight: 175, distance: 100, offerCode: 'OFR003' },
    { id: 'PKG4', weight: 110, distance: 60, offerCode: 'OFR002' },
    { id: 'PKG5', weight: 155, distance: 95, offerCode: 'NA' },
  ];
  const fleet: Fleet = { count: 2, maxSpeed: 70, maxWeight: 200 };

  it('returns correct results for challenge Problem 2', () => {
    const results = estimateDelivery(100, packages, offers, fleet);
    expect(results).toEqual([
      { id: 'PKG1', discount: 0, cost: 750, time: 3.98 },
      { id: 'PKG2', discount: 0, cost: 1475, time: 1.78 },
      { id: 'PKG3', discount: 0, cost: 2350, time: 1.42 },
      { id: 'PKG4', discount: 105, cost: 1395, time: 0.85 },
      { id: 'PKG5', discount: 0, cost: 2125, time: 4.19 },
    ]);
  });
});
