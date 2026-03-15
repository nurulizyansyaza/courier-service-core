import type { Package, CalcOfferCriteria } from '../types';
import { getOffersRef } from './offersManager';
import { parseInput } from './parser';

export function findBestOffer(weight: number, distance: number): { code: string; criteria: CalcOfferCriteria } | null {
  const OFFERS = getOffersRef();
  let bestOffer: { code: string; criteria: CalcOfferCriteria } | null = null;

  for (const [code, criteria] of Object.entries(OFFERS)) {
    const distanceValid = distance > criteria.minDistance && distance < criteria.maxDistance;
    const weightValid = weight >= criteria.minWeight && weight <= criteria.maxWeight;

    if (distanceValid && weightValid) {
      if (!bestOffer || criteria.discount > bestOffer.criteria.discount) {
        bestOffer = { code, criteria };
      }
    }
  }

  return bestOffer;
}

export function calculatePackageCost(
  pkg: Package,
  baseCost: number
): { discount: number; totalCost: number; offerCode?: string; deliveryCost: number } {
  const OFFERS = getOffersRef();
  const deliveryCost = baseCost + pkg.weight * 10 + pkg.distance * 5;

  let discount = 0;
  let appliedOfferCode: string | undefined;

  if (pkg.offerCode && pkg.offerCode !== 'NA' && OFFERS[pkg.offerCode]) {
    const offer = OFFERS[pkg.offerCode];
    const distanceValid = pkg.distance > offer.minDistance && pkg.distance < offer.maxDistance;
    const weightValid = pkg.weight >= offer.minWeight && pkg.weight <= offer.maxWeight;

    if (distanceValid && weightValid) {
      discount = (deliveryCost * offer.discount) / 100;
      appliedOfferCode = pkg.offerCode;
    }
  } else if (!pkg.offerCode) {
    const bestOffer = findBestOffer(pkg.weight, pkg.distance);
    if (bestOffer) {
      discount = (deliveryCost * bestOffer.criteria.discount) / 100;
      appliedOfferCode = bestOffer.code;
    }
  }

  const totalCost = deliveryCost - discount;

  return { discount, totalCost, offerCode: appliedOfferCode, deliveryCost };
}

export function calculateDeliveryCost(input: string): string {
  const { baseCost, packages } = parseInput(input, 'cost');

  const results: string[] = [];

  for (const pkg of packages) {
    const { discount, totalCost } = calculatePackageCost(pkg, baseCost);
    results.push(
      `${pkg.id} ${Math.round(discount)} ${Math.round(totalCost)}`
    );
  }

  return results.join('\n');
}
