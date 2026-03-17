// ── Types ────────────────────────────────────────────────────────────────
export { Package, Offer, Fleet, DeliveryResult, CalcOfferCriteria, DetailedDeliveryResult, ParsedResult, TransitPackageInput, TransitAwareResult } from './types';

// ── Calculation engine ───────────────────────────────────────────────────
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
  resolveTransitConflicts,
  WEIGHT_MULTIPLIER,
  DISTANCE_MULTIPLIER,
  MAX_PACKAGES_FOR_EXACT,
  PKG_ID_REGEX,
  extractPackageNumber,
} from './calculations';

export type { TransitConflictResult } from './calculations';
