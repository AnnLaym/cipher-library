import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareCiphers, formatCipherSort, parseCipherSort, type CipherSort } from './cipherSort';

const ciphers = [
  { id: 1, word: 'Марс', createdAt: '2026-09-01T10:00:00.000Z', tags: [{}] },
  { id: 2, word: 'арбуз', createdAt: '2026-09-03T10:00:00.000Z', tags: [{}, {}, {}] },
  { id: 3, word: 'Яблоко', createdAt: '2026-09-02T10:00:00.000Z', tags: [] },
  { id: 4, word: 'Ёж', createdAt: '2026-09-04T10:00:00.000Z', tags: [{}, {}, {}] },
];

const order = (sort: CipherSort) => [...ciphers].sort(compareCiphers(sort)).map((cipher) => cipher.word);

test('шесть направлений сортировки', () => {
  assert.deepEqual(order({ field: 'date', direction: 'desc' }), ['Ёж', 'арбуз', 'Яблоко', 'Марс']);
  assert.deepEqual(order({ field: 'date', direction: 'asc' }), ['Марс', 'Яблоко', 'арбуз', 'Ёж']);
  assert.deepEqual(order({ field: 'name', direction: 'asc' }), ['арбуз', 'Ёж', 'Марс', 'Яблоко']);
  assert.deepEqual(order({ field: 'name', direction: 'desc' }), ['Яблоко', 'Марс', 'Ёж', 'арбуз']);
  // При одинаковом количестве тегов — по алфавиту.
  assert.deepEqual(order({ field: 'tags', direction: 'desc' }), ['арбуз', 'Ёж', 'Марс', 'Яблоко']);
  assert.deepEqual(order({ field: 'tags', direction: 'asc' }), ['Яблоко', 'Марс', 'арбуз', 'Ёж']);
});

test('параметр сортировки в адресе', () => {
  assert.deepEqual(parseCipherSort('tags-asc'), { field: 'tags', direction: 'asc' });
  assert.equal(formatCipherSort(parseCipherSort('date-desc')), 'date-desc');
  assert.deepEqual(parseCipherSort('rating-up'), { field: 'name', direction: 'asc' });
  assert.deepEqual(parseCipherSort(undefined), { field: 'name', direction: 'asc' });
});
