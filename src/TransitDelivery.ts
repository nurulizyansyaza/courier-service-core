import { Package, CalcOfferCriteria, TransitPackageInput, TransitAwareResult } from './types';
import { parseInputBlock } from './InputParser';
import { resolveTransitConflicts } from './TransitResolver';
import { estimateDetailedDelivery } from './DetailedDelivery';

export function calculateDeliveryTimeWithTransit(
  input: string,
  transitPackages: TransitPackageInput[],
  offers: Record<string, CalcOfferCriteria>
): TransitAwareResult {
  const { baseCost, packages, vehicles } = parseInputBlock(input, 'time', offers);

  if (!vehicles) {
    throw new Error('Vehicle information required for delivery time calculation');
  }

  const { workingPackages, clearedFromTransit, stillInTransit, renamedPackages } =
    resolveTransitConflicts(packages, transitPackages, vehicles.maxWeight);

  const mergedPackages: Package[] = [
    ...workingPackages,
    ...clearedFromTransit.map(tp => ({
      id: tp.id,
      weight: tp.weight,
      distance: tp.distance,
      offerCode: tp.offerCode,
    })),
  ];

  const orderedResults = estimateDetailedDelivery(baseCost, mergedPackages, offers, vehicles);

  const stillInTransitIds = new Set(stillInTransit.map(tp => tp.id.toLowerCase()));
  const workingPkgIds = new Set(workingPackages.map(p => p.id.toLowerCase()));
  const newTransitPackages: TransitPackageInput[] = [];
  const outputLines: string[] = [];

  for (const r of orderedResults) {
    if (r.undeliverable) {
      const isFromCurrentInput = workingPkgIds.has(r.id.toLowerCase());
      if (isFromCurrentInput && !stillInTransitIds.has(r.id.toLowerCase())) {
        newTransitPackages.push({
          id: r.id,
          weight: r.weight,
          distance: r.distance,
          offerCode: r.offerCode || '',
        });
      }
      outputLines.push(`${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} N/A`);
    } else {
      outputLines.push(`${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} ${r.deliveryTime!.toFixed(2)}`);
    }
  }

  return {
    output: outputLines.join('\n'),
    newTransitPackages,
    clearedFromTransit,
    stillInTransit,
    renamedPackages,
  };
}
