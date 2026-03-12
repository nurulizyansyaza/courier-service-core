import { Package, Offer, Fleet, DeliveryResult } from './types';
import { calculateCost } from './CostCalculator';
import { applyOffer } from './OfferService';
import { planShipments } from './ShipmentPlanner';

export const estimateCost = (baseCost: number, packages: Package[], offers: Offer[]): DeliveryResult[] =>
  packages.map(pkg => {
    const cost = calculateCost(baseCost, pkg);
    const discount = applyOffer(cost, pkg, offers);
    return { id: pkg.id, discount, cost: cost - discount, time: 0 };
  });

export const estimateDelivery = (
  baseCost: number, packages: Package[], offers: Offer[], fleet: Fleet
): DeliveryResult[] => {
  const times = planShipments(packages, fleet);
  return estimateCost(baseCost, packages, offers).map(r => ({
    ...r, time: times.get(r.id) ?? 0,
  }));
};
