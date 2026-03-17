import {
  WEIGHT_MULTIPLIER,
  DISTANCE_MULTIPLIER,
  MAX_PACKAGES_FOR_EXACT,
  PKG_ID_REGEX,
  extractPackageNumber,
} from '../src/calculations/constants';

describe('constants', () => {
  describe('calculation multipliers', () => {
    it('should define weight multiplier as 10', () => {
      expect(WEIGHT_MULTIPLIER).toBe(10);
    });

    it('should define distance multiplier as 5', () => {
      expect(DISTANCE_MULTIPLIER).toBe(5);
    });

    it('should define max packages for exact algorithm as 20', () => {
      expect(MAX_PACKAGES_FOR_EXACT).toBe(20);
    });
  });

  describe('PKG_ID_REGEX', () => {
    it('should match uppercase PKG followed by digits', () => {
      expect(PKG_ID_REGEX.test('PKG1')).toBe(true);
      expect(PKG_ID_REGEX.test('PKG123')).toBe(true);
    });

    it('should match lowercase pkg followed by digits', () => {
      expect(PKG_ID_REGEX.test('pkg1')).toBe(true);
      expect(PKG_ID_REGEX.test('pkg99')).toBe(true);
    });

    it('should match mixed case', () => {
      expect(PKG_ID_REGEX.test('Pkg1')).toBe(true);
      expect(PKG_ID_REGEX.test('pKg2')).toBe(true);
    });

    it('should not match without digits', () => {
      expect(PKG_ID_REGEX.test('PKG')).toBe(false);
      expect(PKG_ID_REGEX.test('pkg')).toBe(false);
    });

    it('should not match non-pkg prefixes', () => {
      expect(PKG_ID_REGEX.test('ABC1')).toBe(false);
      expect(PKG_ID_REGEX.test('123')).toBe(false);
    });

    it('should not match with spaces or hyphens', () => {
      expect(PKG_ID_REGEX.test('PKG 1')).toBe(false);
      expect(PKG_ID_REGEX.test('PKG-1')).toBe(false);
    });
  });

  describe('extractPackageNumber', () => {
    it('should extract number from uppercase PKG id', () => {
      expect(extractPackageNumber('PKG1')).toBe(1);
      expect(extractPackageNumber('PKG42')).toBe(42);
    });

    it('should extract number from lowercase pkg id', () => {
      expect(extractPackageNumber('pkg3')).toBe(3);
      expect(extractPackageNumber('pkg100')).toBe(100);
    });

    it('should return 0 for non-matching ids', () => {
      expect(extractPackageNumber('ABC1')).toBe(0);
      expect(extractPackageNumber('123')).toBe(0);
      expect(extractPackageNumber('')).toBe(0);
    });
  });
});
