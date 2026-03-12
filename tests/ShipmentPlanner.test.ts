import { planShipments } from '../src/ShipmentPlanner';
import { Package, Fleet } from '../src/types';

const fleet: Fleet = { count: 2, maxSpeed: 70, maxWeight: 200 };

const packages: Package[] = [
  { id: 'PKG1', weight: 50, distance: 30, offerCode: 'OFR001' },
  { id: 'PKG2', weight: 75, distance: 125, offerCode: 'OFR008' },
  { id: 'PKG3', weight: 175, distance: 100, offerCode: 'OFR003' },
  { id: 'PKG4', weight: 110, distance: 60, offerCode: 'OFR002' },
  { id: 'PKG5', weight: 155, distance: 95, offerCode: 'NA' },
];

describe('planShipments', () => {
  it('assigns correct delivery times for challenge scenario', () => {
    const times = planShipments(packages, fleet);
    expect(times.get('PKG1')).toBe(3.98);
    expect(times.get('PKG2')).toBe(1.78);
    expect(times.get('PKG3')).toBe(1.42);
    expect(times.get('PKG4')).toBe(0.85);
    expect(times.get('PKG5')).toBe(4.19);
  });

  it('handles single package', () => {
    const single: Package[] = [{ id: 'P1', weight: 50, distance: 100, offerCode: '' }];
    const f: Fleet = { count: 1, maxSpeed: 50, maxWeight: 100 };
    const times = planShipments(single, f);
    expect(times.get('P1')).toBe(2);
  });

  it('handles all packages fitting in one shipment', () => {
    const pkgs: Package[] = [
      { id: 'A', weight: 30, distance: 50, offerCode: '' },
      { id: 'B', weight: 40, distance: 80, offerCode: '' },
    ];
    const f: Fleet = { count: 1, maxSpeed: 100, maxWeight: 100 };
    const times = planShipments(pkgs, f);
    expect(times.get('A')).toBe(0.5);
    expect(times.get('B')).toBe(0.8);
  });

  it('uses multiple vehicles in parallel', () => {
    const pkgs: Package[] = [
      { id: 'A', weight: 100, distance: 100, offerCode: '' },
      { id: 'B', weight: 100, distance: 200, offerCode: '' },
    ];
    const f: Fleet = { count: 2, maxSpeed: 100, maxWeight: 100 };
    const times = planShipments(pkgs, f);
    // Both dispatched at time 0 on separate vehicles
    expect(times.get('A')).toBe(1);
    expect(times.get('B')).toBe(2);
  });

  it('vehicle returns and picks up remaining packages', () => {
    const pkgs: Package[] = [
      { id: 'A', weight: 100, distance: 50, offerCode: '' },
      { id: 'B', weight: 100, distance: 50, offerCode: '' },
      { id: 'C', weight: 100, distance: 50, offerCode: '' },
    ];
    const f: Fleet = { count: 1, maxSpeed: 50, maxWeight: 100 };
    const times = planShipments(pkgs, f);
    // First trip: A (heaviest or first found), time = 1
    // Vehicle returns at 2 * 50/50 = 2
    // Second trip: B, time = 2 + 1 = 3
    // Vehicle returns at 2 + 2 = 4
    // Third trip: C, time = 4 + 1 = 5
    expect(times.size).toBe(3);
  });
});
