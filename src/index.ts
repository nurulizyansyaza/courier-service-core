// ── Types ────────────────────────────────────────────────────────────────
export { Package, Offer, Fleet, DeliveryResult, CalcOfferCriteria, DetailedDeliveryResult, ParsedResult, TransitPackageInput, TransitAwareResult } from './types';

// ── Frontend-based calculation engine ────────────────────────────────────
export {
  setOffers,
  getOffers,
  getOffersRef,
  parseInput,
  findBestOffer,
  calculatePackageCost,
  calculateDeliveryCost,
  computeDeliveryResultsFromParsed,
  computeDeliveryResultsWithTransit,
  calculateDeliveryTime,
  calculateDeliveryTimeWithTransit,
  parseOutput,
  getOfferCodeFromDiscount,
  isValidPackageId,
  isValidOfferCode,
  normalizeOfferCode,
} from './calculations';

// ── Transit conflict resolution ──────────────────────────────────────────
export { resolveTransitConflicts } from './TransitResolver';

// ── Legacy exports (backward compatibility for old tests) ────────────────
export { calculateCost } from './CostCalculator';
export { applyOffer } from './OfferService';
export { planShipments } from './ShipmentPlanner';
export { estimateCost, estimateDelivery } from './DeliveryEstimator';
export { parsePackages, parseFleet } from './InputValidator';
export { parseInputBlock, ParseInputOptions } from './InputParser';
export { createOfferManager, DEFAULT_CALC_OFFERS, toOfferArray } from './OfferManager';

import { Offer } from './types';

export const DEFAULT_OFFERS: Offer[] = [
  { code: 'OFR001', discount: 10, weight: { min: 70, max: 200 }, distance: { min: 0, max: 200, exclusive: true } },
  { code: 'OFR002', discount: 7, weight: { min: 100, max: 250 }, distance: { min: 50, max: 150 } },
  { code: 'OFR003', discount: 5, weight: { min: 10, max: 150 }, distance: { min: 50, max: 250 } },
];
