export { setOffers, getOffers, getOffersRef } from './offersManager';
export { isValidPackageId, isValidOfferCode, normalizeOfferCode } from './validators';
export { parseInput } from './parser';
export { findBestOffer, calculatePackageCost, calculateDeliveryCost } from './costCalculator';
export {
  computeDeliveryResultsFromParsed,
  computeDeliveryResultsWithTransit,
  calculateDeliveryTime,
  calculateDeliveryTimeWithTransit,
} from './deliveryPlanner';
export { parseOutput, getOfferCodeFromDiscount } from './outputParser';
export { resolveTransitConflicts } from './transitHelpers';
export type { TransitConflictResult } from './transitHelpers';
export {
  WEIGHT_MULTIPLIER,
  DISTANCE_MULTIPLIER,
  MAX_PACKAGES_FOR_EXACT,
  PKG_ID_REGEX,
  extractPackageNumber,
} from './constants';
