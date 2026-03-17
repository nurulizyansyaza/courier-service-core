import { getOffersRef } from './offersManager';

export function isValidPackageId(value: string): boolean {
  return /^(pkg|PKG)\d+$/i.test(value);
}

export function isValidOfferCode(value: string): boolean {
  const normalized = value.toUpperCase();
  if (normalized === 'NA') return true;
  return normalized in getOffersRef();
}

export function normalizeOfferCode(code: string): string {
  return code.toUpperCase();
}
