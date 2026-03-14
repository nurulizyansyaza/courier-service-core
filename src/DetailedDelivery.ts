import { Package, CalcOfferCriteria, DetailedDeliveryResult } from './types';
import { findBestOffer } from './OfferManager';

export function calculatePackageCost(
  pkg: Package,
  baseCost: number,
  offers: Record<string, CalcOfferCriteria>
): { discount: number; totalCost: number; offerCode?: string; deliveryCost: number } {
  const deliveryCost = baseCost + pkg.weight * 10 + pkg.distance * 5;

  let discount = 0;
  let appliedOfferCode: string | undefined;

  if (pkg.offerCode && offers[pkg.offerCode]) {
    const offer = offers[pkg.offerCode];
    const distanceValid = pkg.distance > offer.minDistance && pkg.distance < offer.maxDistance;
    const weightValid = pkg.weight >= offer.minWeight && pkg.weight <= offer.maxWeight;

    if (distanceValid && weightValid) {
      discount = (deliveryCost * offer.discount) / 100;
      appliedOfferCode = pkg.offerCode;
    }
  } else {
    const bestOffer = findBestOffer(pkg.weight, pkg.distance, offers);
    if (bestOffer) {
      discount = (deliveryCost * bestOffer.criteria.discount) / 100;
      appliedOfferCode = bestOffer.code;
    }
  }

  const totalCost = deliveryCost - discount;
  return { discount, totalCost, offerCode: appliedOfferCode, deliveryCost };
}

export function estimateDetailedDelivery(
  baseCost: number,
  packages: Package[],
  offers: Record<string, CalcOfferCriteria>,
  vehicles: { count: number; maxSpeed: number; maxWeight: number }
): DetailedDeliveryResult[] {
  const packagesWithCost = packages.map(pkg => {
    const costData = calculatePackageCost(pkg, baseCost, offers);
    return { ...pkg, ...costData, deliveryTime: 0 };
  });

  const deliverablePackages = packagesWithCost.filter(pkg => pkg.weight <= vehicles.maxWeight);
  const undeliverablePackages = packagesWithCost.filter(pkg => pkg.weight > vehicles.maxWeight);

  const sortedPackages = [...deliverablePackages].sort((a, b) => {
    if (b.weight !== a.weight) return b.weight - a.weight;
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
        baseCost,
        weight: pkg.weight,
        distance: pkg.distance,
        deliveryCost: pkg.deliveryCost,
        deliveryRound: roundNumber,
        vehicleId: vehicleIndex + 1,
        packagesRemaining: remainingPackages.length - shipment.length,
        currentTime,
        vehicleReturnTime: currentTime + 2 * Math.floor((maxDistance / vehicles.maxSpeed) * 100) / 100,
        roundTripTime: 2 * Math.floor((maxDistance / vehicles.maxSpeed) * 100) / 100,
      });
    }

    const truncatedMaxDist = Math.floor((maxDistance / vehicles.maxSpeed) * 100) / 100;
    const returnTime = currentTime + 2 * truncatedMaxDist;
    vehicleAvailability[vehicleIndex] = returnTime;

    remainingPackages = remainingPackages.filter(
      pkg => !shipment.some(s => s.id === pkg.id)
    );
  }

  return packages.map(pkg => {
    const undeliverable = undeliverablePackages.find(u => u.id === pkg.id);
    if (undeliverable) {
      return {
        id: undeliverable.id,
        discount: undeliverable.discount,
        totalCost: undeliverable.totalCost,
        offerCode: undeliverable.offerCode,
        baseCost,
        weight: undeliverable.weight,
        distance: undeliverable.distance,
        deliveryCost: undeliverable.deliveryCost,
        undeliverable: true,
        undeliverableReason: `${pkg.id} will be out for delivery if there is a vehicle that can carry ${undeliverable.weight}kg and above`,
      };
    }
    return deliveryResults.find(r => r.id === pkg.id)!;
  });
}

function findBestShipment<T extends Package & { discount: number; totalCost: number }>(
  packages: T[],
  maxWeight: number
): T[] {
  const n = packages.length;
  let bestShipment: T[] = [];
  let bestWeight = 0;

  function tryShipment(index: number, current: T[], weight: number) {
    if (weight > maxWeight) return;

    if (
      weight > bestWeight ||
      (weight === bestWeight && current.length > bestShipment.length)
    ) {
      bestShipment = [...current];
      bestWeight = weight;
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
