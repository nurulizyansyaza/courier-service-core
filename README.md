# @nurulizyansyaza/courier-service-core

Zero-dependency TypeScript library for the **Courier Service** coding challenge. Handles cost calculation, offer discounts, shipment planning, and delivery time estimation.

## Installation

```bash
npm install @nurulizyansyaza/courier-service-core
```

## API

### `calculateCost(baseCost, pkg)`
Returns total cost: `baseCost + weight×10 + distance×5`

### `applyOffer(cost, pkg, offers)`
Returns the discount amount (as a `number`) after applying a matching offer to `cost`.

### `estimateCost(baseCost, packages, offers)`
**Problem 1** — Returns `DeliveryResult[]` with `id`, `discount`, `cost` for each package.

### `estimateDelivery(baseCost, packages, offers, fleet)`
**Problem 2** — Returns `DeliveryResult[]` with `id`, `discount`, `cost`, `time` for each package.

### `planShipments(packages, fleet)`
Optimizes vehicle dispatch using bitmask subset enumeration. Returns `Map<string, number>` of package ID → delivery time.

### `parsePackages(baseCost, count, lines)` / `parseFleet(line)`
Input validation and parsing helpers.

### `DEFAULT_OFFERS`
Built-in offer definitions: OFR001 (10%), OFR002 (7%), OFR003 (5%).

## Testing

```bash
npm test
```

## Project Structure

```
src/
  types.ts              # Interfaces: Package, Offer, Fleet, DeliveryResult
  CostCalculator.ts     # calculateCost
  OfferService.ts       # applyOffer, inRange
  ShipmentPlanner.ts    # planShipments, findBestShipment, truncate2
  DeliveryEstimator.ts  # estimateCost, estimateDelivery
  InputValidator.ts     # parsePackages, parseFleet
  index.ts              # Barrel exports + DEFAULT_OFFERS
tests/
  CostCalculator.test.ts
  OfferService.test.ts
  ShipmentPlanner.test.ts
  DeliveryEstimator.test.ts
  InputValidator.test.ts
```
