import { parseInputBlock } from '../src/InputParser';

describe('InputParser', () => {
  describe('Given a cost mode input', () => {
    it('should parse valid header and package lines', () => {
      const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003';
      const result = parseInputBlock(input, 'cost');
      expect(result.baseCost).toBe(100);
      expect(result.packages).toHaveLength(3);
      expect(result.packages[0]).toEqual({ id: 'PKG1', weight: 5, distance: 5, offerCode: 'OFR001' });
      expect(result.packages[2]).toEqual({ id: 'PKG3', weight: 10, distance: 100, offerCode: 'OFR003' });
      expect(result.vehicles).toBeUndefined();
    });

    it('should throw when input has fewer than 2 lines', () => {
      expect(() => parseInputBlock('100 3', 'cost'))
        .toThrow('Need at least header line and one package line');
    });

    it('should throw when header has missing fields', () => {
      expect(() => parseInputBlock('100\nPKG1 5 5 OFR001', 'cost'))
        .toThrow('Line 1 must have base_cost and no_of_packages');
    });

    it('should throw when base cost is not a number', () => {
      expect(() => parseInputBlock('abc 2\nPKG1 5 5 OFR001\nPKG2 10 10 OFR002', 'cost'))
        .toThrow('must be numbers');
    });

    it('should throw for duplicate package IDs', () => {
      expect(() => parseInputBlock('100 2\nPKG1 5 5 OFR001\nPKG1 10 10 OFR002', 'cost'))
        .toThrow('Duplicate package ID');
    });

    it('should throw when package IDs are not incremental', () => {
      expect(() => parseInputBlock('100 2\nPKG1 5 5 OFR001\nPKG3 10 10 OFR002', 'cost'))
        .toThrow('incremental');
    });

    it('should throw for invalid package ID format', () => {
      expect(() => parseInputBlock('100 1\nABC1 5 5 OFR001', 'cost'))
        .toThrow('Must be "PKG" or "pkg"');
    });

    it('should throw when package count mismatches declared count', () => {
      expect(() => parseInputBlock('100 3\nPKG1 5 5 OFR001\nPKG2 10 10 OFR002', 'cost'))
        .toThrow('Expected 3 packages but found 2');
    });

    it('should throw when weight is not a number', () => {
      expect(() => parseInputBlock('100 1\nPKG1 abc 5 OFR001', 'cost'))
        .toThrow('Invalid weight');
    });

    it('should throw when distance is not a number', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 abc OFR001', 'cost'))
        .toThrow('Invalid distance');
    });

    it('should throw when weight is 0', () => {
      expect(() => parseInputBlock('100 1\nPKG1 0 5 OFR001', 'cost'))
        .toThrow('Must be greater than 0');
    });

    it('should throw when distance is 0', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 0 OFR001', 'cost'))
        .toThrow('Must be greater than 0');
    });

    it('should throw when base cost is 0', () => {
      expect(() => parseInputBlock('0 1\nPKG1 5 5 OFR001', 'cost'))
        .toThrow('Base cost must be greater than 0');
    });

    it('should throw when a package line has wrong field count', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 5', 'cost'))
        .toThrow('Expected 4 values');
    });

    it('should detect vehicle info line in cost mode', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 5 OFR001\n2 70 200', 'cost'))
        .toThrow("Delivery Cost mode which doesn't need vehicle info");
    });

    it('should accept case-insensitive package IDs', () => {
      const result = parseInputBlock('100 2\npkg1 5 5 OFR001\npkg2 10 10 OFR002', 'cost');
      expect(result.packages).toHaveLength(2);
    });

    it('should normalize offer codes to uppercase', () => {
      const result = parseInputBlock('100 1\nPKG1 5 5 ofr001', 'cost');
      expect(result.packages[0].offerCode).toBe('OFR001');
    });
  });

  describe('Given a time mode input', () => {
    it('should parse packages and vehicle info', () => {
      const input = '100 3\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002\nPKG3 10 100 OFR003\n2 70 200';
      const result = parseInputBlock(input, 'time');
      expect(result.packages).toHaveLength(3);
      expect(result.vehicles).toEqual({ count: 2, maxSpeed: 70, maxWeight: 200 });
    });

    it('should throw when input has fewer than 3 lines', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 5 OFR001', 'time'))
        .toThrow('Need header line, at least one package line, and vehicle info line');
    });

    it('should throw when vehicle line is missing (last line looks like a package)', () => {
      expect(() => parseInputBlock('100 2\nPKG1 5 5 OFR001\nPKG2 15 5 OFR002', 'time'))
        .toThrow('Missing vehicle info');
    });

    it('should throw when vehicle count is 0', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 5 OFR001\n0 70 200', 'time'))
        .toThrow('Number of vehicles must be at least 1');
    });

    it('should throw when vehicle max speed is 0', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 5 OFR001\n2 0 200', 'time'))
        .toThrow('Max speed must be greater than 0');
    });

    it('should throw when vehicle max weight is 0', () => {
      expect(() => parseInputBlock('100 1\nPKG1 5 5 OFR001\n2 70 0', 'time'))
        .toThrow('Max weight must be greater than 0');
    });
  });

  describe('Given package count < 1', () => {
    it('should throw', () => {
      expect(() => parseInputBlock('100 0\n2 70 200', 'cost'))
        .toThrow('Package count must be at least 1');
    });
  });

  describe('Given spaced package ID or offer code', () => {
    it('should suggest joining spaced package ID', () => {
      expect(() => parseInputBlock('100 1\nPKG 1 5 5 OFR001', 'cost'))
        .toThrow('No spaces allowed in package ID');
    });

    it('should suggest joining spaced offer code', () => {
      // Input "ABC 5 5 OFR 001" — 5 parts, ABC is not a PKG pattern, only offer is spaced
      expect(() => parseInputBlock('100 1\nPKG1 5 5 OFR 001', 'cost'))
        .toThrow('No spaces allowed');
    });
  });
});
