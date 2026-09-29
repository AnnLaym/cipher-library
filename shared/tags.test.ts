import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_TAG_COLOR, TAG_PALETTE, customColors, rankColorsByUsage } from './colors';
import { formatTagName, normalizeTagName } from './tagName';
import {
  buildChildrenMap,
  collectAncestorIds,
  collectDescendantIds,
  findAssignedRelatives,
  findCycleParent,
} from './tagTree';

// Еда(1) → Сладости(2) → Шоколад(3) → Тёмный шоколад(6); Еда(1) → Мясо(4);
// Подарки(7) → Шоколад(3) — у Шоколада два родителя; Космос(5).
const tags = [
  { id: 1, parentIds: [] },
  { id: 2, parentIds: [1] },
  { id: 3, parentIds: [2, 7] },
  { id: 4, parentIds: [1] },
  { id: 5, parentIds: [] },
  { id: 6, parentIds: [3] },
  { id: 7, parentIds: [] },
];
const children = buildChildrenMap(tags);
const parentsOf = new Map(tags.map((tag) => [tag.id, tag.parentIds]));
const sorted = (ids: Iterable<number>) => [...ids].sort((a, b) => a - b);

test('названия тегов нормализуются по регистру и пробелам', () => {
  assert.equal(formatTagName('еда'), 'Еда');
  assert.equal(formatTagName('ЕДА'), 'Еда');
  assert.equal(formatTagName('  тёмный   ШОКОЛАД '), 'Тёмный шоколад');
  assert.equal(normalizeTagName('Еда'), normalizeTagName('еДа'));
  assert.notEqual(normalizeTagName('Шоколад'), normalizeTagName('Шоколадка'));
});

test('тег с двумя родителями — один тег в обеих ветках', () => {
  assert.deepEqual(sorted((children.get(null) ?? []).map((tag) => tag.id)), [1, 5, 7]);
  assert.deepEqual((children.get(2) ?? []).map((tag) => tag.id), [3]);
  assert.deepEqual((children.get(7) ?? []).map((tag) => tag.id), [3]);
});

test('тег с удалённым родителем остаётся под вторым, а без родителей становится корневым', () => {
  const map = buildChildrenMap([
    { id: 1, parentIds: [] },
    { id: 3, parentIds: [2, 1] },
    { id: 4, parentIds: [99] },
  ]);
  assert.deepEqual((map.get(1) ?? []).map((tag) => tag.id), [3]);
  assert.deepEqual((map.get(null) ?? []).map((tag) => tag.id), [1, 4]);
});

test('потомки включают сам тег и все уровни ниже по всем веткам', () => {
  assert.deepEqual(sorted(collectDescendantIds(1, children)), [1, 2, 3, 4, 6]);
  assert.deepEqual(sorted(collectDescendantIds(2, children)), [2, 3, 6]);
  assert.deepEqual(sorted(collectDescendantIds(7, children)), [3, 6, 7]);
  assert.deepEqual(sorted(collectDescendantIds(6, children)), [6]);
});

test('предки собираются по обоим родителям', () => {
  assert.deepEqual(sorted(collectAncestorIds(3, parentsOf)), [1, 2, 7]);
  assert.deepEqual(sorted(collectAncestorIds(6, parentsOf)), [1, 2, 3, 7]);
  assert.deepEqual(sorted(collectAncestorIds(1, parentsOf)), []);
});

test('циклы обнаруживаются', () => {
  assert.equal(findCycleParent(1, [3], children), 3, 'Еда под Шоколадом');
  assert.equal(findCycleParent(7, [6], children), 6, 'Подарки под Тёмным шоколадом');
  assert.equal(findCycleParent(1, [1], children), 1, 'тег сам себе родитель');
  assert.equal(findCycleParent(3, [5, 6], children), 6, 'второй родитель — потомок');
  assert.equal(findCycleParent(2, [1, 7], children), null, 'Сладости под Едой и Подарками');
  assert.equal(findCycleParent(3, [], children), null, 'сделать корневым');
});

test('назначенные предки и потомки добавляемого тега', () => {
  const relatives = (tagId: number, assigned: number[]) => findAssignedRelatives(tagId, assigned, children, parentsOf);
  assert.deepEqual(relatives(2, [1]), { ancestors: [1], descendants: [] }, 'Еда уже есть, добавляем Сладости');
  assert.deepEqual(relatives(1, [2]), { ancestors: [], descendants: [2] }, 'Сладости уже есть, добавляем Еду');
  assert.deepEqual(relatives(3, [1]), { ancestors: [1], descendants: [] }, 'через уровень');
  assert.deepEqual(relatives(3, [1, 2, 5]), { ancestors: [1, 2], descendants: [] }, 'все избыточные предки');
  assert.deepEqual(relatives(3, [7]), { ancestors: [7], descendants: [] }, 'второй родитель');
  assert.deepEqual(relatives(2, [1, 6]), { ancestors: [1], descendants: [6] }, 'и выше, и ниже');
  assert.deepEqual(relatives(3, [4, 5]), { ancestors: [], descendants: [] }, 'соседние ветки не конфликтуют');
});

test('свои цвета живут, пока ими окрашен хотя бы один тег', () => {
  const base = TAG_PALETTE[1].value;
  assert.deepEqual(customColors([base, '#3478DB', DEFAULT_TAG_COLOR, '#3478db', '#112233']), ['#3478db', '#112233']);
  assert.deepEqual(customColors([base, DEFAULT_TAG_COLOR]), []);
});

test('цвета упорядочены по числу тегов, при равенстве — по базовой палитре', () => {
  const [gray, blue, violet] = TAG_PALETTE.map((color) => color.value);
  const rank = rankColorsByUsage([violet, blue, blue, '#3478db', violet, violet, gray, '#3478db']);
  assert.deepEqual([...rank.keys()], [violet, blue, '#3478db', gray]);
  const tie = rankColorsByUsage(['#3478db', violet, blue]);
  assert.deepEqual([...tie.keys()], [blue, violet, '#3478db']);
});
