// `uplift` checked against figures worked by hand.
import {describe, expect, it} from 'vitest';
import {uplift} from '../src/index';

describe('uplift', () => {
  it('raises an amount by a decimal rate', () => {
    // 3 per cent on £1,000 is £30.
    expect(uplift(1_000, 0.03)).toBeCloseTo(1_030, 9);
  });

  it('leaves an amount as it is at a nil rate', () => {
    expect(uplift(1_000, 0)).toBe(1_000);
  });

  it('lowers an amount at a negative rate', () => {
    // A fall of 1 per cent on £1,000 is £10.
    expect(uplift(1_000, -0.01)).toBeCloseTo(990, 9);
  });
});
