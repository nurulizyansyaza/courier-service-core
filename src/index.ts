export { Package, Offer, Fleet, DeliveryResult, CalcOfferCriteria, DetailedDeliveryResult, ParsedResult, TransitPackageInput, TransitAwareResult } from './types';
export { calculateCost } from './CostCalculator';
export { applyOffer } from './OfferService';
export { planShipments } from './ShipmentPlanner';
export { estimateCost, estimateDelivery } from './DeliveryEstimator';
export { parsePackages, parseFleet } from './InputValidator';
export { parseInputBlock, ParseInputOptions } from './InputParser';
export { createOfferManager, findBestOffer, getOfferCodeFromDiscount, DEFAULT_CALC_OFFERS, toOfferArray } from './OfferManager';
export { resolveTransitConflicts } from './TransitResolver';
export { calculatePackageCost, estimateDetailedDelivery } from './DetailedDelivery';
export { parseOutput } from './OutputParser';
export { calculateDeliveryTimeWithTransit } from './TransitDelivery';

import { Offer } from './types';

export const DEFAULT_OFFERS: Offer[] = [
  { code: 'OFR001', discount: 10, weight: { min: 70, max: 200 }, distance: { min: 0, max: 200, exclusive: true } },
  { code: 'OFR002', discount: 7, weight: { min: 100, max: 250 }, distance: { min: 50, max: 150 } },
  { code: 'OFR003', discount: 5, weight: { min: 10, max: 150 }, distance: { min: 50, max: 250 } },
];
