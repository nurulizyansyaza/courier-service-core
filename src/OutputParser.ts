import { Package, CalcOfferCriteria, ParsedResult, TransitPackageInput } from './types';
import { parseInputBlock } from './InputParser';
import { getOfferCodeFromDiscount } from './OfferManager';

export function parseOutput(
  output: string,
  calculationType: 'cost' | 'time',
  input: string,
  offers: Record<string, CalcOfferCriteria>,
  transitPackages?: TransitPackageInput[]
): ParsedResult[] {
  if (!output.trim()) return [];

  let baseCost = 100;
  const packagesMap = new Map<string, Package>();

  try {
    const { baseCost: bc, packages } = parseInputBlock(input, calculationType, offers);
    baseCost = bc;
    packages.forEach(pkg => packagesMap.set(pkg.id, pkg));
    if (transitPackages) {
      for (const tp of transitPackages) {
        if (!packagesMap.has(tp.id)) {
          packagesMap.set(tp.id, { id: tp.id, weight: tp.weight, distance: tp.distance, offerCode: tp.offerCode });
        }
      }
    }
  } catch (_) {
    // If parsing fails, use defaults
  }

  const lines = output.trim().split('\n');
  const results: ParsedResult[] = [];

  for (const line of lines) {
    const parts = line.split(/\s+/);

    if (calculationType === 'cost' && parts.length >= 3) {
      const pkgId = parts[0];
      const discount = parseInt(parts[1]);
      const totalCost = parseInt(parts[2]);

      const pkg = packagesMap.get(pkgId);
      const weight = pkg?.weight || 0;
      const distance = pkg?.distance || 0;
      const deliveryCost = totalCost + discount;

      results.push({
        id: pkgId,
        discount: discount.toString(),
        totalCost: totalCost.toFixed(2),
        offerApplied: discount > 0 ? getOfferCodeFromDiscount(deliveryCost, discount, offers) : undefined,
        baseCost,
        weight,
        distance,
        deliveryCost,
      });
    } else if (calculationType === 'time' && parts.length >= 4) {
      const pkgId = parts[0];
      const discount = parseInt(parts[1]);
      const totalCost = parseInt(parts[2]);
      const deliveryTime = parts[3];

      const pkg = packagesMap.get(pkgId);
      const weight = pkg?.weight || 0;
      const distance = pkg?.distance || 0;
      const deliveryCost = totalCost + discount;

      results.push({
        id: pkgId,
        discount: discount.toString(),
        totalCost: totalCost.toFixed(2),
        deliveryTime,
        offerApplied: discount > 0 ? getOfferCodeFromDiscount(deliveryCost, discount, offers) : undefined,
        baseCost,
        weight,
        distance,
        deliveryCost,
      });
    }
  }

  return results;
}
