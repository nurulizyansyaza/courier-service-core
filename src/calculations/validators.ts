import { getOffersRef } from './offersManager';
import { PKG_ID_REGEX } from './constants';

export function isValidPackageId(value: string): boolean {
  return PKG_ID_REGEX.test(value);
}

export function isValidOfferCode(value: string): boolean {
  const normalized = value.toUpperCase();
  if (normalized === 'NA') return true;
  return normalized in getOffersRef();
}

export function normalizeOfferCode(code: string): string {
  return code.toUpperCase();
}
