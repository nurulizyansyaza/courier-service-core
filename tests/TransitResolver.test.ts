import { resolveTransitConflicts } from '../src/TransitResolver';
import { Package, TransitPackageInput } from '../src/types';

describe('TransitResolver', () => {
  describe('Given no transit packages', () => {
    it('should return working packages unchanged', () => {
      const packages: Package[] = [
        { id: 'PKG1', weight: 50, distance: 100, offerCode: 'OFR001' },
      ];
      const result = resolveTransitConflicts(packages, [], 200);
      expect(result.workingPackages).toEqual(packages);
      expect(result.clearedFromTransit).toHaveLength(0);
      expect(result.stillInTransit).toHaveLength(0);
      expect(result.renamedPackages).toHaveLength(0);
    });
  });

  describe('Given transit packages with no ID conflicts', () => {
    it('should clear transit packages that fit in vehicle', () => {
      const packages: Package[] = [
        { id: 'PKG1', weight: 50, distance: 100, offerCode: 'OFR001' },
      ];
      const transit: TransitPackageInput[] = [
        { id: 'PKG2', weight: 30, distance: 80, offerCode: 'OFR002' },
      ];
      const result = resolveTransitConflicts(packages, transit, 200);
      expect(result.clearedFromTransit).toHaveLength(1);
      expect(result.clearedFromTransit[0].id).toBe('PKG2');
      expect(result.stillInTransit).toHaveLength(0);
    });

    it('should keep transit packages that exceed vehicle max weight', () => {
      const packages: Package[] = [
        { id: 'PKG1', weight: 50, distance: 100, offerCode: 'OFR001' },
      ];
      const transit: TransitPackageInput[] = [
        { id: 'PKG2', weight: 300, distance: 80, offerCode: 'OFR002' },
      ];
      const result = resolveTransitConflicts(packages, transit, 200);
      expect(result.clearedFromTransit).toHaveLength(0);
      expect(result.stillInTransit).toHaveLength(1);
      expect(result.stillInTransit[0].id).toBe('PKG2');
    });
  });

  describe('Given transit packages with ID conflicts', () => {
    it('should rename conflicting current package when transit fits', () => {
      const packages: Package[] = [
        { id: 'PKG1', weight: 50, distance: 100, offerCode: 'OFR001' },
      ];
      const transit: TransitPackageInput[] = [
        { id: 'PKG1', weight: 30, distance: 80, offerCode: 'OFR002' },
      ];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.renamedPackages).toHaveLength(1);
      expect(result.renamedPackages[0].oldId).toBe('PKG1');
      expect(result.renamedPackages[0].newId).toMatch(/^PKG\d+$/i);

      expect(result.clearedFromTransit).toHaveLength(1);
      expect(result.clearedFromTransit[0].id).toBe('PKG1');

      // Working package should have new ID
      expect(result.workingPackages[0].id).not.toBe('PKG1');
    });

    it('should keep transit in stillInTransit when conflicting and overweight', () => {
      const packages: Package[] = [
        { id: 'PKG1', weight: 50, distance: 100, offerCode: 'OFR001' },
      ];
      const transit: TransitPackageInput[] = [
        { id: 'PKG1', weight: 300, distance: 80, offerCode: 'OFR002' },
      ];
      const result = resolveTransitConflicts(packages, transit, 200);
      expect(result.stillInTransit).toHaveLength(1);
      expect(result.renamedPackages).toHaveLength(0);
      // Working packages unchanged
      expect(result.workingPackages[0].id).toBe('PKG1');
    });
  });

  describe('Given case-insensitive ID matching', () => {
    it('should detect conflict regardless of case', () => {
      const packages: Package[] = [
        { id: 'pkg1', weight: 50, distance: 100, offerCode: 'OFR001' },
      ];
      const transit: TransitPackageInput[] = [
        { id: 'PKG1', weight: 30, distance: 80, offerCode: 'OFR002' },
      ];
      const result = resolveTransitConflicts(packages, transit, 200);
      expect(result.renamedPackages).toHaveLength(1);
    });
  });

  describe('Given multiple transit packages', () => {
    it('should handle a mix of conflicts and non-conflicts', () => {
      const packages: Package[] = [
        { id: 'PKG1', weight: 50, distance: 100, offerCode: 'OFR001' },
        { id: 'PKG2', weight: 60, distance: 120, offerCode: 'OFR002' },
      ];
      const transit: TransitPackageInput[] = [
        { id: 'PKG1', weight: 30, distance: 80, offerCode: 'OFR002' },   // conflict, fits
        { id: 'PKG3', weight: 40, distance: 90, offerCode: 'OFR003' },   // no conflict, fits
        { id: 'PKG4', weight: 500, distance: 200, offerCode: 'OFR001' }, // no conflict, overweight
      ];
      const result = resolveTransitConflicts(packages, transit, 200);
      expect(result.renamedPackages).toHaveLength(1);
      expect(result.clearedFromTransit).toHaveLength(2); // PKG1 (transit) + PKG3
      expect(result.stillInTransit).toHaveLength(1); // PKG4
    });
  });
});
