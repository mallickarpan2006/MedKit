import test from 'node:test';
import assert from 'node:assert/strict';
import { formatXlm, shortAddress } from '../src/lib/formatters.js';

test('formats stroops as XLM', () => assert.equal(formatXlm(12500000), '1.25'));
test('shortens Stellar addresses without losing the suffix', () => assert.equal(shortAddress('G12345678901234567890'), 'G1234567…567890'));
test('handles missing balances safely', () => assert.equal(formatXlm(undefined), '0.00'));
