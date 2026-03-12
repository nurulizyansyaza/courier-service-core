export { Package, Offer, Fleet, DeliveryResult } from './types';
export { calculateCost } from './CostCalculator';
export { applyOffer } from './OfferService';
export { planShipments } from './ShipmentPlanner';
export { estimateCost, estimateDelivery } from './DeliveryEstimator';
export { parsePackages, parseFleet } from './InputValidator';

import { Offer } from './types';

export const DEFAULT_OFFERS: Offer[] = [
  { code: 'OFR001', discount: 10, minWeight: 70, maxWeight: 200, minDistance: 0, maxDistance: 200, exclusiveMax: true },
  { code: 'OFR002', discount: 7, minWeight: 100, maxWeight: 250, minDistance: 50, maxDistance: 150 },
  { code: 'OFR003', discount: 5, minWeight: 10, maxWeight: 150, minDistance: 50, maxDistance: 250 },
];
