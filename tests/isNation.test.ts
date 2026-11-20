import {describe, it, expect} from 'vitest';
import {NATIONS, isNation} from '../src/index.js';
import type {Nation} from '../src/index.js';

describe('isNation', () => {
  it('accepts every nation key', () => {
    for (const nation of Object.keys(NATIONS) as Nation[]) {
      expect(isNation(nation)).toBe(true);
    }
  });

  it('refuses anything else, an inherited key included', () => {
    for (const raw of ['', 'England', 'uk', 'toString', null, undefined]) {
      expect(isNation(raw)).toBe(false);
    }
  });
});
