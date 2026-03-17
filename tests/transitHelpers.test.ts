import { resolveTransitConflicts } from '../src/calculations/transitHelpers';
import type { Package, TransitPackageInput } from '../src/types';

describe('resolveTransitConflicts', () => {
  const makePackage = (id: string, weight = 50, distance = 100): Package => ({
    id,
    weight,
    distance,
    offerCode: 'NA',
  });

  const makeTransit = (id: string, weight = 50, distance = 100, offerCode = 'NA'): TransitPackageInput => ({
    id,
    weight,
    distance,
    offerCode,
  });

  describe('given no transit packages', () => {
    it('should return packages unchanged', () => {
      const packages = [makePackage('PKG1'), makePackage('PKG2')];
      const result = resolveTransitConflicts(packages, [], 200);

      expect(result.workingPackages).toHaveLength(2);
      expect(result.clearedFromTransit).toHaveLength(0);
      expect(result.stillInTransit).toHaveLength(0);
      expect(result.renamedPackages).toHaveLength(0);
    });
  });

  describe('given non-conflicting transit packages within weight limit', () => {
    it('should clear them from transit', () => {
      const packages = [makePackage('PKG1')];
      const transit = [makeTransit('PKG3', 50)];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.clearedFromTransit).toHaveLength(1);
      expect(result.clearedFromTransit[0].id).toBe('PKG3');
      expect(result.stillInTransit).toHaveLength(0);
    });
  });

  describe('given non-conflicting transit packages exceeding weight limit', () => {
    it('should keep them in transit', () => {
      const packages = [makePackage('PKG1')];
      const transit = [makeTransit('PKG3', 300)];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.stillInTransit).toHaveLength(1);
      expect(result.stillInTransit[0].id).toBe('PKG3');
      expect(result.clearedFromTransit).toHaveLength(0);
    });
  });

  describe('given conflicting transit packages within weight limit', () => {
    it('should rename the conflicting working package and clear transit', () => {
      const packages = [makePackage('PKG1'), makePackage('PKG2')];
      const transit = [makeTransit('PKG1', 50)];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.renamedPackages).toHaveLength(1);
      expect(result.renamedPackages[0].oldId).toBe('PKG1');
      expect(result.renamedPackages[0].newId).toBe('PKG3');
      expect(result.clearedFromTransit).toHaveLength(1);
      expect(result.workingPackages[0].id).toBe('PKG3');
    });
  });

  describe('given conflicting transit packages exceeding weight limit', () => {
    it('should keep transit package in transit without renaming', () => {
      const packages = [makePackage('PKG1')];
      const transit = [makeTransit('PKG1', 300)];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.stillInTransit).toHaveLength(1);
      expect(result.renamedPackages).toHaveLength(0);
      expect(result.workingPackages[0].id).toBe('PKG1');
    });
  });

  describe('given multiple conflicting transit packages', () => {
    it('should assign incremental IDs for each rename', () => {
      const packages = [makePackage('PKG1'), makePackage('PKG2')];
      const transit = [makeTransit('PKG1', 50), makeTransit('PKG2', 50)];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.renamedPackages).toHaveLength(2);
      expect(result.renamedPackages[0]).toEqual({ oldId: 'PKG1', newId: 'PKG3' });
      expect(result.renamedPackages[1]).toEqual({ oldId: 'PKG2', newId: 'PKG4' });
      expect(result.clearedFromTransit).toHaveLength(2);
    });
  });

  describe('given mixed case package IDs', () => {
    it('should detect conflicts case-insensitively', () => {
      const packages = [makePackage('pkg1')];
      const transit = [makeTransit('PKG1', 50)];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.renamedPackages).toHaveLength(1);
      expect(result.clearedFromTransit).toHaveLength(1);
    });

    it('should preserve original ID prefix casing in renamed packages', () => {
      const packages = [makePackage('pkg1')];
      const transit = [makeTransit('PKG1', 50)];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.renamedPackages[0].newId).toBe('pkg2');
    });
  });

  describe('given transit packages with offer codes', () => {
    it('should preserve offer codes on cleared packages', () => {
      const packages = [makePackage('PKG1')];
      const transit = [makeTransit('PKG3', 50, 100, 'OFR001')];
      const result = resolveTransitConflicts(packages, transit, 200);

      expect(result.clearedFromTransit[0].offerCode).toBe('OFR001');
    });
  });

  describe('resolveTransitConflictsForParse mode', () => {
    it('should only return workingPackages and clearedFromTransit', () => {
      const packages = [makePackage('PKG1'), makePackage('PKG2')];
      const transit = [
        makeTransit('PKG1', 50),   // conflict, within weight → clear + rename
        makeTransit('PKG3', 300),  // no conflict, over weight → still in transit
        makeTransit('PKG4', 50),   // no conflict, within weight → clear
      ];
      const result = resolveTransitConflicts(packages, transit, 200);

      // Full mode returns all four arrays
      expect(result.workingPackages).toBeDefined();
      expect(result.clearedFromTransit).toBeDefined();
      expect(result.stillInTransit).toBeDefined();
      expect(result.renamedPackages).toBeDefined();

      // PKG1 renamed to PKG5 (next after PKG4)
      expect(result.renamedPackages).toHaveLength(1);
      expect(result.renamedPackages[0].oldId).toBe('PKG1');
      expect(result.renamedPackages[0].newId).toBe('PKG5');

      // PKG1 (transit, within weight) + PKG4 (no conflict, within weight) cleared
      expect(result.clearedFromTransit).toHaveLength(2);

      // PKG3 (over weight) stays in transit
      expect(result.stillInTransit).toHaveLength(1);
      expect(result.stillInTransit[0].id).toBe('PKG3');
    });
  });
});
