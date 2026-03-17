import type { Package, ParsedResult, TransitPackageInput } from '../types';
import { getOffersRef } from './offersManager';
import { parseInput } from './parser';
import { computeDeliveryResultsWithTransit } from './deliveryPlanner';
import { resolveTransitConflicts } from './transitHelpers';

export function getOfferCodeFromDiscount(deliveryCost: number, discount: number): string | undefined {
  if (discount === 0 || deliveryCost <= 0) return undefined;
  const OFFERS = getOffersRef();
  const discountPercent = (discount / deliveryCost) * 100;

  for (const [code, criteria] of Object.entries(OFFERS)) {
    if (Math.abs(discountPercent - criteria.discount) < 0.5) return code;
  }

  return 'OFFER APPLIED';
}

export function parseOutput(
  output: string,
  calculationType: 'cost' | 'time',
  input: string,
  transitPackages?: TransitPackageInput[]
): ParsedResult[] {
  if (!output.trim()) return [];

  let baseCost = 100;
  let packagesMap: Map<string, Package> = new Map();

  try {
    const { baseCost: bc, packages, vehicles } = parseInput(input, calculationType);
    baseCost = bc;
    packages.forEach(pkg => packagesMap.set(pkg.id.toLowerCase(), pkg));
    if (transitPackages) {
      for (const tp of transitPackages) {
        if (!packagesMap.has(tp.id.toLowerCase())) {
          packagesMap.set(tp.id.toLowerCase(), { id: tp.id, weight: tp.weight, distance: tp.distance, offerCode: tp.offerCode });
        }
      }
    }
    if (calculationType === 'time' && transitPackages && transitPackages.length > 0 && vehicles) {
      const { workingPackages, clearedFromTransit: cleared } = resolveTransitConflicts(packages, transitPackages, vehicles.maxWeight);
      for (const wp of workingPackages) {
        packagesMap.set(wp.id.toLowerCase(), wp);
      }
      for (const ct of cleared) {
        packagesMap.set(ct.id.toLowerCase(), { id: ct.id, weight: ct.weight, distance: ct.distance, offerCode: ct.offerCode });
      }
    }
  } catch (e) {
    // If parsing fails, just use defaults
  }

  const lines = output.trim().split('\n');
  const results: ParsedResult[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);

    if (calculationType === 'cost' && parts.length >= 3) {
      const pkgId = parts[0];
      const discount = parseInt(parts[1]);
      const totalCost = parseInt(parts[2]);

      const pkg = packagesMap.get(pkgId.toLowerCase());
      const weight = pkg?.weight || 0;
      const distance = pkg?.distance || 0;
      const deliveryCost = totalCost + discount;

      results.push({
        id: pkgId,
        discount: discount.toString(),
        totalCost: totalCost.toFixed(2),
        offerApplied: discount > 0 ? getOfferCodeFromDiscount(deliveryCost, discount) : undefined,
        baseCost,
        weight,
        distance,
        deliveryCost,
      });
    } else if (calculationType === 'time' && parts.length >= 4) {
      const pkgId = parts[0];
      const discount = parseInt(parts[1]);
      const totalCost = parseInt(parts[2]);
      const deliveryTime = parts[3];

      const pkg = packagesMap.get(pkgId.toLowerCase());
      const weight = pkg?.weight || 0;
      const distance = pkg?.distance || 0;
      const deliveryCost = totalCost + discount;

      results.push({
        id: pkgId,
        discount: discount.toString(),
        totalCost: totalCost.toFixed(2),
        deliveryTime: deliveryTime,
        offerApplied: discount > 0 ? getOfferCodeFromDiscount(deliveryCost, discount) : undefined,
        baseCost,
        weight,
        distance,
        deliveryCost,
      });
    }
  }

  if (calculationType === 'time' && results.length > 0) {
    try {
      const { results: deliveryResults, renamedPackages } = computeDeliveryResultsWithTransit(input, transitPackages || []);

      const renameMap = new Map<string, string>();
      for (const rp of renamedPackages) {
        renameMap.set(rp.newId.toLowerCase(), rp.oldId);
      }

      for (const result of results) {
        const match = deliveryResults.find(r => r.id === result.id);
        if (match) {
          result.deliveryRound = match.deliveryRound;
          result.vehicleId = match.vehicleId;
          result.packagesRemaining = match.packagesRemaining;
          result.currentTime = match.currentTime;
          result.vehicleReturnTime = match.vehicleReturnTime;
          result.roundTripTime = match.roundTripTime;
          result.undeliverable = match.undeliverable;
          result.undeliverableReason = match.undeliverableReason;
        }
        const originalId = renameMap.get(result.id.toLowerCase());
        if (originalId) {
          result.renamedFrom = originalId;
        }
      }
    } catch (e) {
      // If computation fails, results just won't have round/vehicle info
    }
  }

  return results;
}
