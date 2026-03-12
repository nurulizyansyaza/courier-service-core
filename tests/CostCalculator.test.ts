import { calculateCost } from '../src/CostCalculator';

describe('calculateCost', () => {
  it.each([
    { baseCost: 100, weight: 5, distance: 5, expected: 175 },
    { baseCost: 100, weight: 15, distance: 5, expected: 275 },
    { baseCost: 100, weight: 10, distance: 100, expected: 700 },
    { baseCost: 50, weight: 50, distance: 30, expected: 700 },
    { baseCost: 100, weight: 75, distance: 125, expected: 1475 },
    { baseCost: 100, weight: 175, distance: 100, expected: 2350 },
    { baseCost: 100, weight: 110, distance: 60, expected: 1500 },
    { baseCost: 100, weight: 155, distance: 95, expected: 2125 },
  ])('baseCost=$baseCost weight=$weight distance=$distance → $expected', ({ baseCost, weight, distance, expected }) => {
    expect(calculateCost(baseCost, { id: 'P', weight, distance, offerCode: '' })).toBe(expected);
  });
});
