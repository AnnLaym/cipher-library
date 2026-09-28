import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatTagName, normalizeTagName } from './tagName';
import { buildChildrenMap, collectDescendantIds, wouldCreateCycle } from './tagTree';

// Еда(1) → Сладости(2) → Шоколад(3); Еда(1) → Мясо(4); Космос(5)
const tags = [
  { id: 1, parentId: null },
  { id: 2, parentId: 1 },
  { id: 3, parentId: 2 },
  { id: 4, parentId: 1 },
  { id: 5, parentId: null },
];
const parentOf = new Map(tags.map((tag) => [tag.id, tag.parentId]));

test('названия тегов нормализуются по регистру и пробелам', () => {
  assert.equal(formatTagName('еда'), 'Еда');
  assert.equal(formatTagName('ЕДА'), 'Еда');
  assert.equal(formatTagName('  тёмный   ШОКОЛАД '), 'Тёмный шоколад');
  assert.equal(normalizeTagName('Еда'), normalizeTagName('еДа'));
  assert.notEqual(normalizeTagName('Шоколад'), normalizeTagName('Шоколадка'));
});

test('потомки включают сам тег и все уровни ниже', () => {
  const children = buildChildrenMap(tags);
  assert.deepEqual([...collectDescendantIds(1, children)].sort(), [1, 2, 3, 4]);
  assert.deepEqual([...collectDescendantIds(2, children)].sort(), [2, 3]);
  assert.deepEqual([...collectDescendantIds(3, children)], [3]);
});

test('циклы обнаруживаются', () => {
  assert.equal(wouldCreateCycle(1, 3, parentOf), true, 'Еда под Шоколадом');
  assert.equal(wouldCreateCycle(1, 1, parentOf), true, 'тег сам себе родитель');
  assert.equal(wouldCreateCycle(3, 5, parentOf), false, 'Шоколад под Космосом');
  assert.equal(wouldCreateCycle(3, null, parentOf), false, 'сделать корневым');
});
