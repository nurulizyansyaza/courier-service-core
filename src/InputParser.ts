import { Package, CalcOfferCriteria } from './types';

export interface ParseInputOptions {
  offers?: Record<string, CalcOfferCriteria>;
  /** When true, reject unknown offer codes. When false (default), accept any code. */
  strictOfferCodes?: boolean;
}

// ── Helpers ─────────────────────────────────────────────────────────

function isValidPackageId(value: string): boolean {
  return /^(pkg|PKG)\d+$/i.test(value);
}

function isValidOfferCode(
  value: string,
  offers: Record<string, unknown>
): boolean {
  return value.toUpperCase() in offers;
}

function normalizeOfferCode(code: string): string {
  return code.toUpperCase();
}

function parseHeaderLine(line: string): { baseCost: number; declaredPackageCount: number } {
  const parts = line.split(/\s+/);

  if (parts.length < 2) {
    throw new Error('Invalid format: Line 1 must have base_cost and no_of_packages');
  }

  const baseCost = Number(parts[0]);
  const declaredPackageCount = Number(parts[1]);

  if (isNaN(baseCost) || isNaN(declaredPackageCount)) {
    throw new Error('Invalid input: Base cost and package count must be numbers');
  }

  if (baseCost <= 0) {
    throw new Error('Invalid input: Base cost must be greater than 0');
  }

  if (declaredPackageCount < 1) {
    throw new Error('Invalid input: Package count must be at least 1');
  }

  return { baseCost, declaredPackageCount };
}

function detectVehicleLine(lines: string[]): number {
  const lastLine = lines[lines.length - 1];
  const lastParts = lastLine.split(/\s+/).filter(p => p.trim());
  const allNumbers = lastParts.length === 3
    && lastParts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));

  if (!allNumbers) {
    if (lastParts.length === 4 && isValidPackageId(lastParts[0])) {
      throw new Error('Missing vehicle info: Last line must be "no_of_vehicles max_speed max_weight" (3 numbers). Currently in Delivery Time mode which requires vehicle info');
    }
    throw new Error('Invalid vehicle info on last line: Expected 3 numbers (no_of_vehicles max_speed max_weight)');
  }

  return lines.length - 1;
}

function parsePackageLine(
  parts: string[],
  lineIndex: number,
  knownOffers: Record<string, CalcOfferCriteria>,
  strictOfferCodes: boolean
): Package {
  if (!isValidPackageId(parts[0])) {
    throw new Error(
      `Invalid package ID "${parts[0]}" at line ${lineIndex + 1}: Must be "PKG" or "pkg" followed by digits with no spaces (e.g., PKG1, pkg2)`
    );
  }

  const weight = Number(parts[1]);
  const distance = Number(parts[2]);

  if (isNaN(weight) || !/^\d+(\.\d+)?$/.test(parts[1])) {
    throw new Error(`Invalid weight "${parts[1]}" at line ${lineIndex + 1}: Must be a number`);
  }

  if (weight <= 0) {
    throw new Error(`Invalid weight "${parts[1]}" at line ${lineIndex + 1}: Must be greater than 0`);
  }

  if (isNaN(distance) || !/^\d+(\.\d+)?$/.test(parts[2])) {
    throw new Error(`Invalid distance "${parts[2]}" at line ${lineIndex + 1}: Must be a number`);
  }

  if (distance <= 0) {
    throw new Error(`Invalid distance "${parts[2]}" at line ${lineIndex + 1}: Must be greater than 0`);
  }

  const rawOfferCode = parts[3];
  if (strictOfferCodes && !isValidOfferCode(rawOfferCode, knownOffers)) {
    const validCodes = Object.keys(knownOffers).join('/');
    throw new Error(
      `Invalid offer code "${rawOfferCode}" at line ${lineIndex + 1}: Must be one of: ${validCodes} (case-insensitive)`
    );
  }

  return {
    id: parts[0],
    weight,
    distance,
    offerCode: normalizeOfferCode(rawOfferCode),
  };
}

function validateFieldCount(parts: string[], lineIndex: number): void {
  if (parts.length === 4) return;

  if (parts.length > 4) {
    const firstTwo = parts[0].toLowerCase() + parts[1];
    const hasSpacedPkgId = /^pkg\d+$/i.test(firstTwo);
    const lastTwo = parts[parts.length - 2] + parts[parts.length - 1];
    const hasSpacedOfferCode = /^(OFR|ofr)00[123]$/.test(lastTwo);

    if (hasSpacedPkgId && hasSpacedOfferCode) {
      throw new Error(
        `Line ${lineIndex + 1}: No spaces allowed in package ID or offer code. Use "${firstTwo}" not "${parts[0]} ${parts[1]}", and "${lastTwo}" not "${parts[parts.length - 2]} ${parts[parts.length - 1]}"`
      );
    } else if (hasSpacedPkgId) {
      throw new Error(
        `Line ${lineIndex + 1}: No spaces allowed in package ID. Use "${firstTwo}" not "${parts[0]} ${parts[1]}"`
      );
    } else if (hasSpacedOfferCode) {
      throw new Error(
        `Line ${lineIndex + 1}: No spaces allowed in offer code. Use "${lastTwo}" not "${parts[parts.length - 2]} ${parts[parts.length - 1]}"`
      );
    }
    throw new Error(
      `Line ${lineIndex + 1}: Expected exactly 4 values (pkg_id weight distance offer_code) but found ${parts.length}. Ensure no spaces within package ID (e.g., PKG1 not PKG 1) or offer code (e.g., OFR001 not OFR 001)`
    );
  }

  throw new Error(
    `Line ${lineIndex + 1}: Expected 4 values (pkg_id weight distance offer_code) but found ${parts.length}`
  );
}

function validatePackageIds(packages: Package[]): void {
  const seenIds = new Set<string>();
  for (const pkg of packages) {
    const normalizedId = pkg.id.toLowerCase();
    if (seenIds.has(normalizedId)) {
      throw new Error(`Duplicate package ID "${pkg.id}": Each package must have a unique ID`);
    }
    seenIds.add(normalizedId);
  }

  const pkgNumbers = packages.map(pkg => {
    const match = pkg.id.match(/^(?:pkg|PKG)(\d+)$/i);
    return match ? parseInt(match[1]) : 0;
  });
  for (let i = 0; i < pkgNumbers.length; i++) {
    if (pkgNumbers[i] !== i + 1) {
      throw new Error(
        `Package IDs must be incremental starting from 1 (pkg1, pkg2, pkg3, ...). Found "${packages[i].id}" but expected "PKG${i + 1}" at position ${i + 1}`
      );
    }
  }
}

function parseVehicleInfo(line: string): { count: number; maxSpeed: number; maxWeight: number } {
  const vehicleParts = line.split(/\s+/).map(Number);
  const vehicles = {
    count: vehicleParts[0],
    maxSpeed: vehicleParts[1],
    maxWeight: vehicleParts[2],
  };

  if (vehicles.count < 1) {
    throw new Error('Invalid vehicle info: Number of vehicles must be at least 1');
  }
  if (vehicles.maxSpeed <= 0) {
    throw new Error('Invalid vehicle info: Max speed must be greater than 0');
  }
  if (vehicles.maxWeight <= 0) {
    throw new Error('Invalid vehicle info: Max weight must be greater than 0');
  }

  return vehicles;
}

// ── Default offers ──────────────────────────────────────────────────

const DEFAULT_OFFERS: Record<string, CalcOfferCriteria> = {
  OFR001: { discount: 10, minDistance: 0, maxDistance: 200, minWeight: 70, maxWeight: 200 },
  OFR002: { discount: 7, minDistance: 50, maxDistance: 150, minWeight: 100, maxWeight: 250 },
  OFR003: { discount: 5, minDistance: 50, maxDistance: 250, minWeight: 10, maxWeight: 150 },
};

// ── Main parser ─────────────────────────────────────────────────────

export function parseInputBlock(
  input: string,
  mode: 'cost' | 'time',
  offersOrOptions?: Record<string, CalcOfferCriteria> | ParseInputOptions
): {
  baseCost: number;
  packages: Package[];
  vehicles?: { count: number; maxSpeed: number; maxWeight: number };
} {
  let offers: Record<string, CalcOfferCriteria> | undefined;
  let strictOfferCodes = false;

  if (offersOrOptions && typeof offersOrOptions === 'object' && 'strictOfferCodes' in offersOrOptions) {
    const opts = offersOrOptions as ParseInputOptions;
    offers = opts.offers;
    strictOfferCodes = opts.strictOfferCodes ?? false;
  } else {
    offers = offersOrOptions as Record<string, CalcOfferCriteria> | undefined;
  }

  const lines = input.trim().split('\n').filter(line => line.trim());

  if (mode === 'cost' && lines.length < 2) {
    throw new Error('Invalid input: Need at least header line and one package line');
  }

  if (mode === 'time' && lines.length < 3) {
    throw new Error('Invalid input: Need header line, at least one package line, and vehicle info line');
  }

  const { baseCost, declaredPackageCount } = parseHeaderLine(lines[0]);

  let vehicleLineIndex = -1;
  if (mode === 'time') {
    vehicleLineIndex = detectVehicleLine(lines);
  }

  const knownOffers = offers ?? DEFAULT_OFFERS;
  const packageLineEnd = mode === 'time' ? lines.length - 1 : lines.length;
  const packages: Package[] = [];

  for (let i = 1; i < packageLineEnd; i++) {
    const parts = lines[i].split(/\s+/).filter(p => p.trim());

    if (mode === 'cost' && i === lines.length - 1 && parts.length === 3) {
      const allNumbers = parts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));
      if (allNumbers) {
        throw new Error(
          `Line ${i + 1} looks like vehicle info (3 numbers), but you're in Delivery Cost mode which doesn't need vehicle info. Switch to Delivery Time mode if you need time estimation`
        );
      }
    }

    validateFieldCount(parts, i);
    packages.push(parsePackageLine(parts, i, knownOffers, strictOfferCodes));
  }

  if (packages.length === 0) {
    throw new Error('No valid packages found');
  }

  validatePackageIds(packages);

  if (packages.length !== declaredPackageCount) {
    if (mode === 'cost' && packages.length < declaredPackageCount) {
      throw new Error(
        `Expected ${declaredPackageCount} packages but found ${packages.length}. Make sure all package lines have 4 fields: pkg_id weight distance offer_code`
      );
    }
    throw new Error(`Expected ${declaredPackageCount} packages but found ${packages.length}`);
  }

  const vehicles = vehicleLineIndex !== -1 ? parseVehicleInfo(lines[vehicleLineIndex]) : undefined;

  return { baseCost, packages, vehicles };
}
