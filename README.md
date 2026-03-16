# @nurulizyansyaza/courier-service-core

Zero-dependency TypeScript library for the **Courier Service** App Calculator. Handles cost calculation, offer discounts, shipment planning, and delivery time estimation.

## Installation

```bash
npm install @nurulizyansyaza/courier-service-core
```

## API

### Types

| Type | Description |
|------|-------------|
| `Package` | `{ id, weight, distance, offerCode? }` |
| `Offer` | Offer definition with code, discount %, weight/distance ranges |
| `Fleet` | `{ count, maxSpeed, maxWeight }` |
| `DeliveryResult` | Simple result: `{ id, discount, cost, time }` |
| `DetailedDeliveryResult` | Extended result with vehicle/round/return-time metadata |
| `ParsedResult` | Result parsed from CLI-style text output |
| `CalcOfferCriteria` | Offer matching criteria |
| `TransitPackageInput` | In-transit package descriptor |
| `TransitAwareResult` | Delivery result that accounts for in-transit packages |

### Offers

- **`setOffers(offers)`** — Replace the global offer table.
- **`getOffers()`** — Get a copy of the current offer table.
- **`getOffersRef()`** — Get a direct reference to the offer table (for read-only use).

Built-in offers: `OFR001` (10%), `OFR002` (7%), `OFR003` (5%).

### Parsing & Validation

- **`parseInput(input, mode)`** — Parse multiline CLI-format text into `{ baseCost, packages, vehicles? }`. `mode` is `'cost'` or `'time'`.
- **`isValidPackageId(value)`** — Check if a string matches the `PKG\d+` pattern.
- **`isValidOfferCode(value)`** — Check if a string is a known offer code or `'NA'`.
- **`normalizeOfferCode(code)`** — Upper-case an offer code.

#### Input Format Rules

**Line 1 (header)** — exactly 2 values, both numbers only:
```
base_cost no_of_packages
```
| Field | Rule |
|-------|------|
| `base_cost` | Positive number (no letters, no negatives) |
| `no_of_packages` | Whole number ≥ 1 (no decimals, no letters) |

**Lines 2–N (packages)** — exactly 4 values per line:
```
pkg_id weight distance offer_code
```
| Field | Rule | Valid | Invalid |
|-------|------|-------|---------|
| `pkg_id` | `PKG` + digits, case-insensitive, no spaces/hyphens | `PKG1`, `pkg2` | `PKG 1`, `PKG-1`, `-pkg1`, `p-1`, `ABC` |
| `weight` | Positive number only | `5`, `10.5` | `abc`, `5kg`, `-5` |
| `distance` | Positive number only | `100`, `30.5` | `abc`, `10km`, `-10` |
| `offer_code` | `OFR` + digits or `NA`, case-insensitive, no spaces/hyphens | `OFR001`, `ofr002`, `NA` | `OFR 001`, `OFR-001`, `ofr1-`, `o-1`, `BADCODE` |

Package IDs must be incremental starting from 1 (`PKG1`, `PKG2`, `PKG3`, …) and unique.

**Last line (vehicles, time mode only)** — exactly 3 positive numbers:
```
no_of_vehicles max_speed max_weight
```

#### Multi-Error Collection

The parser collects **all** validation errors and reports them together in a single error message (newline-separated), so you can see everything that needs fixing at once:

```
Line 1: Base cost "abc" must be a number
Line 1: Package count "xyz" must be a whole number
Line 2: Invalid package ID "BAD": Must be "PKG" followed by digits (e.g., PKG1, pkg2)
Line 2: Invalid weight "-5": Must be a number
Line 3: Invalid distance "10km": Must be a number
Line 3: Invalid offer code "WRONG": Must be one of: OFR001/OFR002/OFR003, NA (case-insensitive)
```

Extra spaces **between** fields are handled gracefully (`PKG1   5   5   OFR001` works). Spaces **within** identifiers are detected and reported (`PKG 1` → use `PKG1`, `OFR 001` → use `OFR001`).

All IDs and offer codes are normalized to uppercase on output.

### Cost Calculation

- **`calculatePackageCost(pkg, baseCost)`** — Returns `{ discount, totalCost, offerCode?, deliveryCost }` for a single package.
- **`calculateDeliveryCost(input)`** — End-to-end: parse input → compute costs → return formatted string.
- **`findBestOffer(weight, distance)`** — Find the highest-discount matching offer for given weight/distance.

### Delivery Time

- **`computeDeliveryResultsFromParsed(baseCost, packages, vehicles)`** — Core planner: returns `DetailedDeliveryResult[]` with delivery times, vehicle assignments, and round info.
- **`computeDeliveryResultsWithTransit(input, transitPackages)`** — Same as above but merges in-transit packages.
- **`calculateDeliveryTime(input)`** — End-to-end: parse input → plan → return formatted string.
- **`calculateDeliveryTimeWithTransit(input, transitPackages)`** — End-to-end with transit support, returns `TransitAwareResult`.

### Output Parsing

- **`parseOutput(output, calculationType, input, transitPackages?)`** — Parse CLI-style output back into `ParsedResult[]`.
- **`getOfferCodeFromDiscount(deliveryCost, discount)`** — Reverse-lookup an offer code from a discount amount.

## Testing

```bash
npm test
```

## CI/CD

GitHub Actions workflow (`.github/workflows/ci.yml`) runs on push/PR to `main`:

1. **Test** — runs `npm test` on Node 18 + 20
2. **Trigger Staging Deploy** — on push to `main`, triggers a staging deploy on [`courier-service`](https://github.com/nurulizyansyaza/courier-service), which triggers the staging deployment pipeline

Requires a `DEPLOY_TRIGGER_TOKEN` secret (fine-grained PAT with Actions + Contents write access on the `courier-service` repo).

## Module Architecture

```mermaid
graph TB
    Consumer["Consumer<br/>(CLI · API · Frontend)"] --> Index["index.ts<br/>barrel re-exports"]

    subgraph Core["calculations/"]
        Index --> Parser["parser.ts<br/>parseInput"]
        Index --> Validators["validators.ts<br/>isValidPackageId · isValidOfferCode"]
        Index --> Cost["costCalculator.ts<br/>calculatePackageCost · findBestOffer"]
        Index --> Delivery["deliveryPlanner.ts<br/>computeDeliveryResults · transit"]
        Index --> Offers["offersManager.ts<br/>setOffers · getOffers"]
        Index --> Output["outputParser.ts<br/>parseOutput"]

        Parser --> Validators
        Cost --> Offers
        Delivery --> Cost
        Output --> Cost
    end

    Types["types.ts"] -.->|"shared types"| Core
```

## Project Structure

```
src/
  types.ts                     # All TypeScript interfaces
  index.ts                     # Barrel re-exports
  calculations/
    index.ts                   # Barrel for calculation modules
    costCalculator.ts          # calculatePackageCost, calculateDeliveryCost, findBestOffer
    deliveryPlanner.ts         # computeDeliveryResultsFromParsed, calculateDeliveryTime, transit support
    offersManager.ts           # setOffers, getOffers, getOffersRef + built-in offer table
    outputParser.ts            # parseOutput, getOfferCodeFromDiscount
    parser.ts                  # parseInput
    validators.ts              # isValidPackageId, isValidOfferCode, normalizeOfferCode
```
