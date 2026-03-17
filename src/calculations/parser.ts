import type { Package } from '../types';
import { getOffersRef } from './offersManager';
import { isValidPackageId, isValidOfferCode, normalizeOfferCode } from './validators';
import { extractPackageNumber } from './constants';

interface HeaderResult {
  baseCost: number;
  declaredPackageCount: number;
}

function validateHeader(parts: string[], errors: string[]): HeaderResult {
  if (parts.length !== 2) {
    errors.push(`Line 1: Must have exactly 2 values (base_cost no_of_packages) but found ${parts.length}`);
  }

  let baseCost = NaN;
  let declaredPackageCount = NaN;

  if (parts.length >= 1) {
    if (!/^\d+(\.\d+)?$/.test(parts[0])) {
      errors.push(`Line 1: Base cost "${parts[0]}" must be a number`);
    } else {
      baseCost = Number(parts[0]);
      if (baseCost <= 0) {
        errors.push('Line 1: Base cost must be greater than 0');
      }
    }
  }

  if (parts.length >= 2) {
    if (!/^\d+$/.test(parts[1])) {
      errors.push(`Line 1: Package count "${parts[1]}" must be a whole number`);
    } else {
      declaredPackageCount = Number(parts[1]);
      if (declaredPackageCount < 1) {
        errors.push('Line 1: Package count must be at least 1');
      }
    }
  }

  return { baseCost, declaredPackageCount };
}

function validateVehicleLine(
  lastLine: string,
  errors: string[]
): { count: number; maxSpeed: number; maxWeight: number } | undefined {
  const lastParts = lastLine.split(/\s+/).filter(p => p.trim());
  const allNumbers = lastParts.length === 3 && lastParts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));

  if (!allNumbers) {
    if (lastParts.length === 4 && isValidPackageId(lastParts[0])) {
      errors.push('Missing vehicle info: Last line must be "no_of_vehicles max_speed max_weight" (3 numbers). Currently in Delivery Time mode which requires vehicle info');
    } else {
      const allNums = lastParts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));
      if (allNums && lastParts.length !== 3) {
        errors.push(`Invalid vehicle info on last line: Expected exactly 3 numbers (no_of_vehicles max_speed max_weight) but found ${lastParts.length}`);
      } else {
        errors.push('Invalid vehicle info on last line: Expected 3 numbers (no_of_vehicles max_speed max_weight)');
      }
    }
    return undefined;
  }

  const vehicleParts = lastParts.map(Number);
  const vehicles = {
    count: vehicleParts[0],
    maxSpeed: vehicleParts[1],
    maxWeight: vehicleParts[2],
  };

  if (vehicles.count < 1) {
    errors.push('Vehicle info: Number of vehicles must be at least 1');
  }
  if (vehicles.maxSpeed <= 0) {
    errors.push('Vehicle info: Max speed must be greater than 0');
  }
  if (vehicles.maxWeight <= 0) {
    errors.push('Vehicle info: Max weight must be greater than 0');
  }

  return vehicles;
}

function validatePackageLine(
  parts: string[],
  lineNum: number,
  validCodes: string,
  errors: string[]
): Package | null {
  const lineErrors: string[] = [];

  // Field 1: Package ID
  const rawId = parts[0];
  if (!isValidPackageId(rawId)) {
    lineErrors.push(`Invalid package ID "${rawId}": Must be "PKG" followed by digits (e.g., PKG1, pkg2)`);
  }

  // Field 2: Weight
  const rawWeight = parts[1];
  let weight = NaN;
  if (!/^\d+(\.\d+)?$/.test(rawWeight)) {
    lineErrors.push(`Invalid weight "${rawWeight}": Must be a number`);
  } else {
    weight = Number(rawWeight);
    if (weight <= 0) {
      lineErrors.push(`Invalid weight "${rawWeight}": Must be greater than 0`);
    }
  }

  // Field 3: Distance
  const rawDistance = parts[2];
  let distance = NaN;
  if (!/^\d+(\.\d+)?$/.test(rawDistance)) {
    lineErrors.push(`Invalid distance "${rawDistance}": Must be a number`);
  } else {
    distance = Number(rawDistance);
    if (distance <= 0) {
      lineErrors.push(`Invalid distance "${rawDistance}": Must be greater than 0`);
    }
  }

  // Field 4: Offer code
  const rawOfferCode = parts[3];
  if (!isValidOfferCode(rawOfferCode)) {
    lineErrors.push(`Invalid offer code "${rawOfferCode}": Must be one of: ${validCodes}, NA (case-insensitive)`);
  }

  if (lineErrors.length > 0) {
    errors.push(...lineErrors.map(e => `Line ${lineNum}: ${e}`));
    return null;
  }

  return {
    id: rawId.toUpperCase(),
    weight,
    distance,
    offerCode: normalizeOfferCode(rawOfferCode),
  };
}

function detectFieldCountErrors(
  parts: string[],
  lineNum: number,
  mode: 'cost' | 'time',
  isLastLine: boolean,
  errors: string[]
): boolean {
  // Detect vehicle-like line in cost mode
  if (mode === 'cost' && isLastLine) {
    const allNumbers = parts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));
    if (allNumbers && !isValidPackageId(parts[0])) {
      if (parts.length === 3) {
        errors.push(`Line ${lineNum} looks like vehicle info (3 numbers), but you're in Delivery Cost mode which doesn't need vehicle info. Switch to Delivery Time mode if you need time estimation`);
      } else {
        errors.push(`Line ${lineNum} looks like vehicle info (all numbers), but you're in Delivery Cost mode which doesn't need vehicle info. Switch to Delivery Time mode if you need time estimation. Note: vehicle info expects exactly 3 values (no_of_vehicles max_speed max_weight) but found ${parts.length}`);
      }
      return true;
    }
  }

  if (parts.length !== 4) {
    if (parts.length > 4) {
      const spacedIdErrors: string[] = [];
      const firstTwo = parts[0].toLowerCase() + parts[1];
      const hasSpacedPkgId = !isValidPackageId(parts[0]) && /^pkg\d+$/i.test(firstTwo);
      const lastTwo = parts[parts.length - 2] + parts[parts.length - 1];
      const hasSpacedOfferCode = /^(OFR|ofr)\d+$/i.test(lastTwo) || /^na$/i.test(lastTwo);

      if (hasSpacedPkgId) {
        spacedIdErrors.push(`No spaces allowed in package ID. Use "${firstTwo.toUpperCase()}" not "${parts[0]} ${parts[1]}"`);
      }
      if (hasSpacedOfferCode) {
        spacedIdErrors.push(`No spaces allowed in offer code. Use "${lastTwo.toUpperCase()}" not "${parts[parts.length - 2]} ${parts[parts.length - 1]}"`);
      }

      if (spacedIdErrors.length > 0) {
        errors.push(`Line ${lineNum}: ${spacedIdErrors.join('. ')}`);
      } else {
        errors.push(`Line ${lineNum}: Expected exactly 4 values (pkg_id weight distance offer_code) but found ${parts.length}. Ensure no spaces within package ID (e.g., PKG1 not PKG 1) or offer code (e.g., OFR001 not OFR 001)`);
      }
    } else {
      errors.push(`Line ${lineNum}: Expected 4 values (pkg_id weight distance offer_code) but found ${parts.length}`);
    }
    return true;
  }

  return false;
}

function validatePackages(
  lines: string[],
  packageLineEnd: number,
  mode: 'cost' | 'time',
  errors: string[]
): Package[] {
  const packages: Package[] = [];
  const OFFERS = getOffersRef();
  const validCodes = Object.keys(OFFERS).join('/');

  for (let i = 1; i < packageLineEnd; i++) {
    const parts = lines[i].split(/\s+/).filter(p => p.trim());
    const lineNum = i + 1;
    const isLastLine = i === lines.length - 1;

    if (detectFieldCountErrors(parts, lineNum, mode, isLastLine, errors)) {
      continue;
    }

    const pkg = validatePackageLine(parts, lineNum, validCodes, errors);
    if (pkg) {
      packages.push(pkg);
    }
  }

  return packages;
}

function validateCrossPackage(
  packages: Package[],
  declaredPackageCount: number,
  mode: 'cost' | 'time',
  errors: string[]
): void {
  if (packages.length > 0) {
    // Duplicate ID check
    const seenIds = new Set<string>();
    for (const pkg of packages) {
      const normalizedId = pkg.id.toUpperCase();
      if (seenIds.has(normalizedId)) {
        errors.push(`Duplicate package ID "${pkg.id}": Each package must have a unique ID`);
      }
      seenIds.add(normalizedId);
    }

    // Incremental ID check
    const pkgNumbers = packages.map(pkg => extractPackageNumber(pkg.id));
    for (let i = 0; i < pkgNumbers.length; i++) {
      if (pkgNumbers[i] !== i + 1) {
        errors.push(`Package IDs must be incremental starting from 1 (PKG1, PKG2, PKG3, ...). Found "${packages[i].id}" but expected "PKG${i + 1}" at position ${i + 1}`);
        break;
      }
    }
  } else if (errors.length === 0) {
    errors.push('No valid packages found');
  }

  // Package count mismatch
  if (!isNaN(declaredPackageCount) && packages.length !== declaredPackageCount && packages.length > 0) {
    if (mode === 'cost' && packages.length < declaredPackageCount) {
      errors.push(`Expected ${declaredPackageCount} packages but found ${packages.length}. Make sure all package lines have 4 fields: pkg_id weight distance offer_code`);
    } else {
      errors.push(`Expected ${declaredPackageCount} packages but found ${packages.length}`);
    }
  }
}

export function parseInput(input: string, mode: 'cost' | 'time'): {
  baseCost: number;
  packages: Package[];
  vehicles?: { count: number; maxSpeed: number; maxWeight: number };
} {
  const lines = input.trim().split('\n').filter(line => line.trim());

  // Minimum line count check (fatal — cannot continue without lines)
  if (mode === 'cost' && lines.length < 2) {
    throw new Error('Invalid input: Need at least header line and one package line');
  }
  if (mode === 'time' && lines.length < 3) {
    throw new Error('Invalid input: Need header line, at least one package line, and vehicle info line');
  }

  // Step 1: Validate header — stop if errors
  const headerErrors: string[] = [];
  const firstLineParts = lines[0].split(/\s+/).filter(p => p.trim());
  const { baseCost, declaredPackageCount } = validateHeader(firstLineParts, headerErrors);
  if (headerErrors.length > 0) {
    throw new Error(headerErrors.join('\n'));
  }

  // Step 2: Validate package lines one by one — stop at first line with errors
  const packageLineEnd = mode === 'time' ? lines.length - 1 : lines.length;
  const packages: Package[] = [];
  const OFFERS = getOffersRef();
  const validCodes = Object.keys(OFFERS).join('/');

  for (let i = 1; i < packageLineEnd; i++) {
    const parts = lines[i].split(/\s+/).filter(p => p.trim());
    const lineNum = i + 1;
    const isLastLine = i === lines.length - 1;
    const lineErrors: string[] = [];

    if (detectFieldCountErrors(parts, lineNum, mode, isLastLine, lineErrors)) {
      throw new Error(lineErrors.join('\n'));
    }

    const pkg = validatePackageLine(parts, lineNum, validCodes, lineErrors);
    if (lineErrors.length > 0) {
      throw new Error(lineErrors.join('\n'));
    }
    if (pkg) packages.push(pkg);
  }

  // Step 3: Validate vehicle line (time mode) — stop if errors
  let vehicles: { count: number; maxSpeed: number; maxWeight: number } | undefined;
  if (mode === 'time') {
    const vehicleErrors: string[] = [];
    vehicles = validateVehicleLine(lines[lines.length - 1], vehicleErrors);
    if (vehicleErrors.length > 0) {
      throw new Error(vehicleErrors.join('\n'));
    }
  }

  // Step 4: Cross-package validations (only after all lines pass individually)
  const crossErrors: string[] = [];
  validateCrossPackage(packages, declaredPackageCount, mode, crossErrors);
  if (crossErrors.length > 0) {
    throw new Error(crossErrors.join('\n'));
  }

  return { baseCost, packages, vehicles };
}
