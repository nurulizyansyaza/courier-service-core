import type { Package } from '../types';
import { getOffersRef } from './offersManager';
import { isValidPackageId, isValidOfferCode, normalizeOfferCode } from './validators';

export function parseInput(input: string, mode: 'cost' | 'time'): {
  baseCost: number;
  packages: Package[];
  vehicles?: { count: number; maxSpeed: number; maxWeight: number };
} {
  const errors: string[] = [];
  const lines = input.trim().split('\n').filter(line => line.trim());

  // --- Minimum line count check (fatal — cannot continue without lines) ---
  if (mode === 'cost' && lines.length < 2) {
    throw new Error('Invalid input: Need at least header line and one package line');
  }
  if (mode === 'time' && lines.length < 3) {
    throw new Error('Invalid input: Need header line, at least one package line, and vehicle info line');
  }

  // --- Header line validation (line 1): must be exactly 2 numeric values ---
  const firstLineParts = lines[0].split(/\s+/).filter(p => p.trim());

  if (firstLineParts.length !== 2) {
    errors.push(`Line 1: Must have exactly 2 values (base_cost no_of_packages) but found ${firstLineParts.length}`);
  }

  let baseCost = NaN;
  let declaredPackageCount = NaN;

  if (firstLineParts.length >= 1) {
    if (!/^\d+(\.\d+)?$/.test(firstLineParts[0])) {
      errors.push(`Line 1: Base cost "${firstLineParts[0]}" must be a number`);
    } else {
      baseCost = Number(firstLineParts[0]);
      if (baseCost <= 0) {
        errors.push('Line 1: Base cost must be greater than 0');
      }
    }
  }

  if (firstLineParts.length >= 2) {
    if (!/^\d+$/.test(firstLineParts[1])) {
      errors.push(`Line 1: Package count "${firstLineParts[1]}" must be a whole number`);
    } else {
      declaredPackageCount = Number(firstLineParts[1]);
      if (declaredPackageCount < 1) {
        errors.push('Line 1: Package count must be at least 1');
      }
    }
  }

  // --- Vehicle line validation (time mode) ---
  let vehicleLineIndex = -1;
  let vehicles: { count: number; maxSpeed: number; maxWeight: number } | undefined;

  if (mode === 'time') {
    const lastLine = lines[lines.length - 1];
    const lastParts = lastLine.split(/\s+/).filter(p => p.trim());
    const allNumbers = lastParts.length === 3 && lastParts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));

    if (!allNumbers) {
      if (lastParts.length === 4 && isValidPackageId(lastParts[0])) {
        errors.push('Missing vehicle info: Last line must be "no_of_vehicles max_speed max_weight" (3 numbers). Currently in Delivery Time mode which requires vehicle info');
      } else {
        errors.push('Invalid vehicle info on last line: Expected 3 numbers (no_of_vehicles max_speed max_weight)');
      }
    } else {
      vehicleLineIndex = lines.length - 1;
      const vehicleParts = lastParts.map(Number);
      vehicles = {
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
    }
  }

  // --- Package lines validation ---
  const packages: Package[] = [];
  const packageLineEnd = mode === 'time' ? lines.length - 1 : lines.length;
  const OFFERS = getOffersRef();
  const validCodes = Object.keys(OFFERS).join('/');

  for (let i = 1; i < packageLineEnd; i++) {
    const parts = lines[i].split(/\s+/).filter(p => p.trim());
    const lineNum = i + 1;
    const lineErrors: string[] = [];

    // Detect vehicle-like line in cost mode
    if (mode === 'cost' && i === lines.length - 1 && parts.length === 3) {
      const allNumbers = parts.every(p => !isNaN(Number(p)) && /^\d+(\.\d+)?$/.test(p));
      if (allNumbers) {
        errors.push(`Line ${lineNum} looks like vehicle info (3 numbers), but you're in Delivery Cost mode which doesn't need vehicle info. Switch to Delivery Time mode if you need time estimation`);
        continue;
      }
    }

    // Check field count
    if (parts.length !== 4) {
      if (parts.length > 4) {
        // Detect spaces within identifiers
        const spacedIdErrors: string[] = [];
        const firstTwo = parts[0].toLowerCase() + parts[1];
        const hasSpacedPkgId = /^pkg\d+$/i.test(firstTwo);
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
      continue;
    }

    // Validate each of the 4 fields and collect all errors for this line

    // Field 1: Package ID — must be "PKG" followed by digits (case-insensitive)
    const rawId = parts[0];
    if (!isValidPackageId(rawId)) {
      lineErrors.push(`Invalid package ID "${rawId}": Must be "PKG" followed by digits (e.g., PKG1, pkg2)`);
    }

    // Field 2: Weight — must be a positive number
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

    // Field 3: Distance — must be a positive number
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

    // Field 4: Offer code — must be OFR+digits, NA, or a known custom code
    const rawOfferCode = parts[3];
    if (!isValidOfferCode(rawOfferCode)) {
      lineErrors.push(`Invalid offer code "${rawOfferCode}": Must be one of: ${validCodes}, NA (case-insensitive)`);
    }

    if (lineErrors.length > 0) {
      errors.push(...lineErrors.map(e => `Line ${lineNum}: ${e}`));
    } else {
      packages.push({
        id: rawId.toUpperCase(),
        weight,
        distance,
        offerCode: normalizeOfferCode(rawOfferCode),
      });
    }
  }

  // --- Cross-package validations (only if we have valid packages) ---
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
    const pkgNumbers = packages.map(pkg => {
      const match = pkg.id.match(/^PKG(\d+)$/i);
      return match ? parseInt(match[1]) : 0;
    });
    for (let i = 0; i < pkgNumbers.length; i++) {
      if (pkgNumbers[i] !== i + 1) {
        errors.push(`Package IDs must be incremental starting from 1 (PKG1, PKG2, PKG3, ...). Found "${packages[i].id}" but expected "PKG${i + 1}" at position ${i + 1}`);
        break;
      }
    }
  } else if (errors.length === 0) {
    errors.push('No valid packages found');
  }

  // --- Package count mismatch ---
  if (!isNaN(declaredPackageCount) && packages.length !== declaredPackageCount && packages.length > 0) {
    if (mode === 'cost' && packages.length < declaredPackageCount) {
      errors.push(`Expected ${declaredPackageCount} packages but found ${packages.length}. Make sure all package lines have 4 fields: pkg_id weight distance offer_code`);
    } else {
      errors.push(`Expected ${declaredPackageCount} packages but found ${packages.length}`);
    }
  }

  // --- Throw all collected errors ---
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }

  return { baseCost, packages, vehicles };
}
