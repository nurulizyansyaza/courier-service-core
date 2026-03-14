export interface Package {
  id: string;
  weight: number;
  distance: number;
  offerCode: string;
}

export interface Offer {
  code: string;
  discount: number;
  weight: { min: number; max: number };
  distance: { min: number; max: number; exclusive?: boolean };
}

export interface Fleet {
  count: number;
  maxSpeed: number;
  maxWeight: number;
}

export interface DeliveryResult {
  id: string;
  discount: number;
  cost: number;
  time: number;
}

export interface CalcOfferCriteria {
  discount: number;
  minDistance: number;
  maxDistance: number;
  minWeight: number;
  maxWeight: number;
}

export interface DetailedDeliveryResult {
  id: string;
  discount: number;
  totalCost: number;
  deliveryTime?: number;
  offerCode?: string;
  baseCost: number;
  weight: number;
  distance: number;
  deliveryCost: number;
  deliveryRound?: number;
  vehicleId?: number;
  packagesRemaining?: number;
  currentTime?: number;
  vehicleReturnTime?: number;
  roundTripTime?: number;
  undeliverable?: boolean;
  undeliverableReason?: string;
}

export interface ParsedResult {
  id: string;
  discount: string;
  totalCost: string;
  deliveryTime?: string;
  offerApplied?: string;
  baseCost: number;
  weight: number;
  distance: number;
  deliveryCost: number;
  deliveryRound?: number;
  vehicleId?: number;
  packagesRemaining?: number;
  currentTime?: number;
  vehicleReturnTime?: number;
  roundTripTime?: number;
  undeliverable?: boolean;
  undeliverableReason?: string;
  renamedFrom?: string;
}

export interface TransitPackageInput {
  id: string;
  weight: number;
  distance: number;
  offerCode: string;
}

export interface TransitAwareResult {
  output: string;
  newTransitPackages: TransitPackageInput[];
  clearedFromTransit: TransitPackageInput[];
  stillInTransit: TransitPackageInput[];
  renamedPackages: { oldId: string; newId: string }[];
}
