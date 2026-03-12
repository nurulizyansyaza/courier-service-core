import { Package, Fleet } from './types';

const truncate2 = (n: number): number => Math.floor(n * 100 + 1e-9) / 100;

export const planShipments = (packages: Package[], fleet: Fleet): Map<string, number> => {
  const times = new Map<string, number>();
  const remaining = [...packages];
  const available: number[] = new Array(fleet.count).fill(0);

  while (remaining.length > 0) {
    const best = findBestShipment(remaining, fleet.maxWeight);
    const vehicle = Math.min(...available);
    const idx = available.indexOf(vehicle);
    const maxDist = Math.max(...best.map(i => remaining[i].distance));

    for (const i of best) {
      times.set(remaining[i].id, truncate2(vehicle + remaining[i].distance / fleet.maxSpeed));
    }

    available[idx] = vehicle + 2 * truncate2(maxDist / fleet.maxSpeed);
    for (const i of [...best].sort((a, b) => b - a)) remaining.splice(i, 1);
  }

  return times;
};

const MAX_BITMASK_PACKAGES = 20;

const findBestShipment = (packages: Package[], maxWeight: number): number[] => {
  if (packages.length > MAX_BITMASK_PACKAGES) {
    throw new Error(`Too many packages (${packages.length}): bitmask enumeration supports at most ${MAX_BITMASK_PACKAGES}`);
  }

  let best: number[] = [];
  let bestWeight = 0;
  let bestMaxDist = Infinity;

  for (let mask = 1; mask < (1 << packages.length); mask++) {
    const indices: number[] = [];
    let weight = 0;
    for (let j = 0; j < packages.length; j++) {
      if (mask & (1 << j)) { indices.push(j); weight += packages[j].weight; }
    }
    if (weight > maxWeight) continue;

    const maxDist = Math.max(...indices.map(i => packages[i].distance));
    if (
      indices.length > best.length
      || (indices.length === best.length && weight > bestWeight)
      || (indices.length === best.length && weight === bestWeight && maxDist < bestMaxDist)
    ) {
      best = indices;
      bestWeight = weight;
      bestMaxDist = maxDist;
    }
  }
  return best;
};
