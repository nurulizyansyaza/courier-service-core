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
} from './calculations';
