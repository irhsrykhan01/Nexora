import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateExpression } from '../src/core/calculator.js';

test('calculates basic arithmetic and respects operator precedence', () => {
  assert.equal(calculateExpression('12 * (3 + 2)'), 60);
  assert.equal(calculateExpression('10 + 6 / 2'), 13);
  assert.equal(calculateExpression('18 % 5'), 3);
});

test('supports decimals, unary signs, and right-associative powers', () => {
  assert.equal(calculateExpression('-2 + 4.5'), 2.5);
  assert.equal(calculateExpression('2 ^ 3 ^ 2'), 512);
});

test('rejects empty, malformed, and unsupported expressions', () => {
  for (const expression of ['', '2 +', '2 ** 3', 'abc', '2 + (3']) {
    assert.throws(() => calculateExpression(expression));
  }
});

test('rejects division by zero and non-finite results', () => {
  assert.throws(() => calculateExpression('5 / 0'), /nol/i);
  assert.throws(() => calculateExpression('10 ^ 10000'), /batas/i);
});

test('does not execute JavaScript input', () => {
  assert.throws(() => calculateExpression('process.exit()'));
  assert.throws(() => calculateExpression('globalThis.pwned = true'));
  assert.equal(globalThis.pwned, undefined);
});

test('limits oversized expressions and excessive nesting', () => {
  assert.throws(() => calculateExpression('1+'.repeat(70) + '1'), /panjang/i);
  assert.throws(() => calculateExpression('('.repeat(30) + '1' + ')'.repeat(30)));
});
