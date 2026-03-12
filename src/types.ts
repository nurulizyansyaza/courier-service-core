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
