import { Package } from './types';

export const calculateCost = (baseCost: number, pkg: Package): number =>
  baseCost + pkg.weight * 10 + pkg.distance * 5;
