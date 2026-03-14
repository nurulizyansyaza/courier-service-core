import { Package, TransitPackageInput } from './types';

export interface TransitConflictResult {
  workingPackages: Package[];
  clearedFromTransit: TransitPackageInput[];
  stillInTransit: TransitPackageInput[];
  renamedPackages: { oldId: string; newId: string }[];
}

export function resolveTransitConflicts(
  packages: Package[],
  transitPackages: TransitPackageInput[],
  maxWeight: number
): TransitConflictResult {
  const workingPackages = packages.map(p => ({ ...p }));
  const clearedFromTransit: TransitPackageInput[] = [];
  const stillInTransit: TransitPackageInput[] = [];
  const renamedPackages: { oldId: string; newId: string }[] = [];

  const allIds = [
    ...packages.map(p => {
      const m = p.id.match(/^(?:pkg|PKG)(\d+)$/i);
      return m ? parseInt(m[1]) : 0;
    }),
    ...transitPackages.map(tp => {
      const m = tp.id.match(/^(?:pkg|PKG)(\d+)$/i);
      return m ? parseInt(m[1]) : 0;
    }),
  ];
  let nextPkgNumber = Math.max(...allIds, 0) + 1;

  const workingIds = new Set(workingPackages.map(p => p.id.toLowerCase()));

  for (const tp of transitPackages) {
    const hasConflict = workingIds.has(tp.id.toLowerCase());

    if (hasConflict && tp.weight <= maxWeight) {
      const conflictingPkg = workingPackages.find(
        p => p.id.toLowerCase() === tp.id.toLowerCase()
      );
      if (conflictingPkg) {
        const oldId = conflictingPkg.id;
        const prefix = oldId.match(/^(pkg|PKG)/i)?.[0] || 'pkg';
        const newId = `${prefix}${nextPkgNumber}`;
        workingIds.delete(oldId.toLowerCase());
        workingIds.add(newId.toLowerCase());
        conflictingPkg.id = newId;
        renamedPackages.push({ oldId, newId });
        nextPkgNumber++;
      }
      clearedFromTransit.push(tp);
    } else if (hasConflict && tp.weight > maxWeight) {
      stillInTransit.push(tp);
    } else if (!hasConflict && tp.weight <= maxWeight) {
      clearedFromTransit.push(tp);
    } else {
      stillInTransit.push(tp);
    }
  }

  return { workingPackages, clearedFromTransit, stillInTransit, renamedPackages };
}
