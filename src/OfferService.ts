import { Package, Offer } from './types';

const inRange = (val: number, min: number, max: number, exclusive?: boolean): boolean =>
  val >= min && (exclusive ? val < max : val <= max);

export const applyOffer = (cost: number, pkg: Package, offers: Offer[]): number => {
  const offer = offers.find(
    o => o.code === pkg.offerCode
      && inRange(pkg.weight, o.weight.min, o.weight.max)
      && inRange(pkg.distance, o.distance.min, o.distance.max, o.distance.exclusive)
  );
  return offer ? Math.round(cost * offer.discount) / 100 : 0;
};
