import type { Package, DetailedDeliveryResult, TransitPackageInput, TransitAwareResult } from '../types';
import { parseInput } from './parser';
import { calculatePackageCost } from './costCalculator';

const MAX_PACKAGES_FOR_EXACT = 20;

function findBestShipmentExact<T extends Package & { discount: number; totalCost: number }>(
  packages: T[],
  maxWeight: number
): T[] {
  const n = packages.length;
  let bestShipment: T[] = [];
  let bestWeight = 0;
  let bestMaxDist = Infinity;

  function tryShipment(index: number, current: typeof packages, weight: number) {
    if (weight > maxWeight) return;

    const maxDist = current.length > 0
      ? Math.max(...current.map(p => p.distance))
      : Infinity;

    if (
      weight > bestWeight ||
      (weight === bestWeight && current.length > bestShipment.length) ||
      (weight === bestWeight && current.length === bestShipment.length && maxDist < bestMaxDist)
    ) {
      bestShipment = [...current];
      bestWeight = weight;
      bestMaxDist = maxDist;
    }

    for (let i = index; i < n; i++) {
      const newWeight = weight + packages[i].weight;
      if (newWeight <= maxWeight) {
        tryShipment(i + 1, [...current, packages[i]], newWeight);
      }
    }
  }

  tryShipment(0, [], 0);
  return bestShipment;
}

// Greedy fallback for large package counts to avoid exponential blowup
function findBestShipmentGreedy<T extends Package & { discount: number; totalCost: number }>(
  packages: T[],
  maxWeight: number
): T[] {
  const sorted = [...packages].sort((a, b) => b.weight - a.weight || a.distance - b.distance);
  const shipment: T[] = [];
  let totalWeight = 0;

  for (const pkg of sorted) {
    if (totalWeight + pkg.weight <= maxWeight) {
      shipment.push(pkg);
      totalWeight += pkg.weight;
    }
  }

  return shipment;
}

function findBestShipment<T extends Package & { discount: number; totalCost: number }>(
  packages: T[],
  maxWeight: number
): T[] {
  if (packages.length <= MAX_PACKAGES_FOR_EXACT) {
    return findBestShipmentExact(packages, maxWeight);
  }
  return findBestShipmentGreedy(packages, maxWeight);
}

function resolveTransitConflicts(
  packages: Package[],
  transitPackages: TransitPackageInput[],
  maxWeight: number
): {
  workingPackages: Package[];
  clearedFromTransit: TransitPackageInput[];
  stillInTransit: TransitPackageInput[];
  renamedPackages: { oldId: string; newId: string }[];
} {
  const workingPackages = packages.map(p => ({ ...p }));
  const clearedFromTransit: TransitPackageInput[] = [];
  const stillInTransit: TransitPackageInput[] = [];
  const renamedPackages: { oldId: string; newId: string }[] = [];

  const allIds = [
    ...packages.map(p => {
      const m = p.id.match(/^(?:pkg|PKG)(\d+)$/i);
      return m ? parseInt(m[1]) : 0;
    }),
    ...transitPackages.map(tp => {
      const m = tp.id.match(/^(?:pkg|PKG)(\d+)$/i);
      return m ? parseInt(m[1]) : 0;
    }),
  ];
  let nextPkgNumber = Math.max(...allIds, 0) + 1;

  const workingIds = new Set(workingPackages.map(p => p.id.toLowerCase()));

  for (const tp of transitPackages) {
    const hasConflict = workingIds.has(tp.id.toLowerCase());

    if (hasConflict && tp.weight <= maxWeight) {
      const conflictingPkg = workingPackages.find(
        p => p.id.toLowerCase() === tp.id.toLowerCase()
      );
      if (conflictingPkg) {
        const oldId = conflictingPkg.id;
        const prefix = oldId.match(/^(pkg|PKG)/i)?.[0] || 'pkg';
        const newId = `${prefix}${nextPkgNumber}`;
        workingIds.delete(oldId.toLowerCase());
        workingIds.add(newId.toLowerCase());
        conflictingPkg.id = newId;
        renamedPackages.push({ oldId, newId });
        nextPkgNumber++;
      }
      clearedFromTransit.push(tp);
    } else if (hasConflict && tp.weight > maxWeight) {
      stillInTransit.push(tp);
    } else if (!hasConflict && tp.weight <= maxWeight) {
      clearedFromTransit.push(tp);
    } else {
      stillInTransit.push(tp);
    }
  }

  return { workingPackages, clearedFromTransit, stillInTransit, renamedPackages };
}

export function computeDeliveryResultsFromParsed(
  baseCost: number,
  packages: Package[],
  vehicles: { count: number; maxSpeed: number; maxWeight: number }
): DetailedDeliveryResult[] {
  const packagesWithCost = packages.map(pkg => {
    const costData = calculatePackageCost(pkg, baseCost);
    return {
      ...pkg,
      ...costData,
      deliveryTime: 0,
    };
  });

  const deliverablePackages = packagesWithCost.filter(pkg => pkg.weight <= vehicles.maxWeight);
  const undeliverablePackages = packagesWithCost.filter(pkg => pkg.weight > vehicles.maxWeight);

  const sortedPackages = [...deliverablePackages].sort((a, b) => {
    if (b.weight !== a.weight) {
      return b.weight - a.weight;
    }
    return a.distance - b.distance;
  });

  const vehicleAvailability = Array(vehicles.count).fill(0);
  const deliveryResults: DetailedDeliveryResult[] = [];

  let remainingPackages = [...sortedPackages];
  let roundNumber = 0;

  while (remainingPackages.length > 0) {
    roundNumber++;

    const minTime = Math.min(...vehicleAvailability);
    const vehicleIndex = vehicleAvailability.indexOf(minTime);
    const currentTime = vehicleAvailability[vehicleIndex];

    const shipment = findBestShipment(remainingPackages, vehicles.maxWeight);

    if (shipment.length === 0) {
      remainingPackages.shift();
      roundNumber--;
      continue;
    }

    const maxDistance = Math.max(...shipment.map(pkg => pkg.distance));

    for (const pkg of shipment) {
      const pkgDeliveryTime = currentTime + pkg.distance / vehicles.maxSpeed;
      const truncatedTime = Math.floor(pkgDeliveryTime * 100) / 100;
      deliveryResults.push({
        id: pkg.id,
        discount: pkg.discount,
        totalCost: pkg.totalCost,
        deliveryTime: truncatedTime,
        offerCode: pkg.offerCode,
        baseCost: baseCost,
        weight: pkg.weight,
        distance: pkg.distance,
        deliveryCost: pkg.deliveryCost,
        deliveryRound: roundNumber,
        vehicleId: vehicleIndex + 1,
        packagesRemaining: remainingPackages.length - shipment.length,
        currentTime: currentTime,
        vehicleReturnTime: currentTime + 2 * (maxDistance / vehicles.maxSpeed),
        roundTripTime: 2 * (maxDistance / vehicles.maxSpeed),
      });
    }

    const returnTime = currentTime + 2 * (maxDistance / vehicles.maxSpeed);
    vehicleAvailability[vehicleIndex] = returnTime;

    remainingPackages = remainingPackages.filter(
      pkg => !shipment.some(s => s.id === pkg.id)
    );
  }

  // Order by delivery round (ascending), then undeliverable at end
  const orderedResults: DetailedDeliveryResult[] = [
    ...deliveryResults,
    ...undeliverablePackages.map(pkg => ({
      id: pkg.id,
      discount: pkg.discount,
      totalCost: pkg.totalCost,
      offerCode: pkg.offerCode,
      baseCost: baseCost,
      weight: pkg.weight,
      distance: pkg.distance,
      deliveryCost: pkg.deliveryCost,
      undeliverable: true,
      undeliverableReason: `${pkg.id} will be out for delivery if there is a vehicle that can carry ${pkg.weight}kg and above`,
    } as DetailedDeliveryResult)),
  ];

  return orderedResults;
}

function computeDeliveryResults(input: string): DetailedDeliveryResult[] {
  const { baseCost, packages, vehicles } = parseInput(input, 'time');

  if (!vehicles) {
    throw new Error('Vehicle information required for delivery time calculation');
  }

  return computeDeliveryResultsFromParsed(baseCost, packages, vehicles);
}

export function computeDeliveryResultsWithTransit(
  input: string,
  transitPackages: TransitPackageInput[]
): { results: DetailedDeliveryResult[]; renamedPackages: { oldId: string; newId: string }[] } {
  const { baseCost, packages, vehicles } = parseInput(input, 'time');

  if (!vehicles) {
    throw new Error('Vehicle information required for delivery time calculation');
  }

  const { workingPackages, clearedFromTransit, renamedPackages } =
    resolveTransitConflicts(packages, transitPackages, vehicles.maxWeight);

  const mergedPackages: Package[] = [
    ...workingPackages,
    ...clearedFromTransit.map(tp => ({ id: tp.id, weight: tp.weight, distance: tp.distance, offerCode: tp.offerCode })),
  ];

  return { results: computeDeliveryResultsFromParsed(baseCost, mergedPackages, vehicles), renamedPackages };
}

export function calculateDeliveryTime(input: string): string {
  const orderedResults = computeDeliveryResults(input);

  const results = orderedResults.map(r => {
    if (r.undeliverable) {
      return `${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} N/A`;
    }
    return `${r.id} ${Math.round(r.discount)} ${Math.round(r.totalCost)} ${r.deliveryTime!.toFixed(2)}`;
  });

  return results.join('\n');
}

export function calculateDeliveryTimeWithTransit(
  input: string,
  transitPackages: TransitPackageInput[]
): TransitAwareResult {
  const { baseCost, packages, vehicles } = parseInput(input, 'time');

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

  const orderedResults = computeDeliveryResultsFromParsed(baseCost, mergedPackages, vehicles);

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
    results: orderedResults,
    newTransitPackages,
    clearedFromTransit,
    stillInTransit,
    renamedPackages,
  };
}
