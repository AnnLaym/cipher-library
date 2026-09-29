import { customColors, rankColorsByUsage } from '../../../shared/colors';
import { normalizeTagName } from '../../../shared/tagName';
import {
  buildChildrenMap,
  collectAncestorIds,
  collectDescendantIds,
  findAssignedRelatives,
  type AssignedRelatives,
} from '../../../shared/tagTree';
import type { TagDTO } from '../../../shared/types';

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

export const compareNames = (a: string, b: string): number => collator.compare(a, b);

/** Готовая к использованию структура дерева тегов (строится один раз при каждой загрузке тегов). */
export interface TagIndex {
  list: TagDTO[];
  byId: Map<number, TagDTO>;
  byNormalizedName: Map<string, TagDTO>;
  /** parentId → дети по алфавиту; корни под ключом null. Тег с двумя родителями есть у обоих. */
  children: Map<number | null, TagDTO[]>;
  roots: TagDTO[];
  childrenOf(id: number | null): TagDTO[];
  /** Родители тега по алфавиту (0–2). */
  parentsOf(id: number): TagDTO[];
  /** Цепочка от корня до самого тега (при двух родителях — через первого по алфавиту). */
  pathOf(id: number): TagDTO[];
  /** «Еда → Сладости → Шоколад» */
  pathLabel(id: number): string;
  /** Где лежит тег: путь к каждому родителю — «Еда → Сладости · Подарки». Пусто у корневого. */
  parentsLabel(id: number): string;
  /** Все предки по всем веткам. */
  ancestorsOf(id: number): Set<number>;
  /** Сам тег и все его потомки. */
  descendantsOf(id: number): Set<number>;
  /** Назначенные шифру теги, которые лежат выше или ниже добавляемого. */
  assignedRelatives(tagId: number, assignedIds: readonly number[]): AssignedRelatives;
  /** Свои цвета (не из базовой палитры), которыми окрашен хотя бы один тег. */
  customColors: string[];
  /** Сначала цвета, которыми окрашено больше всего тегов; внутри цвета — по алфавиту. */
  compareByColor(a: TagDTO, b: TagDTO): number;
}

export function createTagIndex(tags: TagDTO[]): TagIndex {
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const byNormalizedName = new Map(tags.map((tag) => [normalizeTagName(tag.name), tag]));
  const children = buildChildrenMap(tags);
  for (const siblings of children.values()) siblings.sort((a, b) => compareNames(a.name, b.name));
  const parentIdsOf = new Map(tags.map((tag) => [tag.id, tag.parentIds]));

  const parentsOf = (id: number): TagDTO[] =>
    (byId.get(id)?.parentIds ?? [])
      .flatMap((parentId) => byId.get(parentId) ?? [])
      .sort((a, b) => compareNames(a.name, b.name));

  const pathCache = new Map<number, TagDTO[]>();
  const pathOf = (id: number): TagDTO[] => {
    const cached = pathCache.get(id);
    if (cached) return cached;
    const path: TagDTO[] = [];
    const seen = new Set<number>();
    let current = byId.get(id);
    while (current && !seen.has(current.id)) {
      path.unshift(current);
      seen.add(current.id);
      current = parentsOf(current.id)[0];
    }
    pathCache.set(id, path);
    return path;
  };

  const pathLabel = (id: number) =>
    pathOf(id)
      .map((tag) => tag.name)
      .join(' → ');

  const colorRank = rankColorsByUsage(tags.map((tag) => tag.color));
  const rankOf = (color: string) => colorRank.get(color.toLowerCase()) ?? colorRank.size;

  return {
    list: tags,
    byId,
    byNormalizedName,
    children,
    roots: children.get(null) ?? [],
    childrenOf: (id) => children.get(id) ?? [],
    parentsOf,
    pathOf,
    pathLabel,
    parentsLabel: (id) =>
      parentsOf(id)
        .map((parent) => pathLabel(parent.id))
        .join(' · '),
    ancestorsOf: (id) => collectAncestorIds(id, parentIdsOf),
    descendantsOf: (id) => collectDescendantIds(id, children),
    assignedRelatives: (tagId, assignedIds) => findAssignedRelatives(tagId, assignedIds, children, parentIdsOf),
    customColors: customColors(tags.map((tag) => tag.color)),
    compareByColor: (a, b) => rankOf(a.color) - rankOf(b.color) || compareNames(a.name, b.name),
  };
}

/**
 * Поиск тегов без учёта регистра. Сначала точное совпадение, затем начало названия,
 * затем вхождение в название; с `byPath` — ещё и теги, у которых совпал кто-то из предков.
 */
export function searchTags(index: TagIndex, query: string, { byPath = false } = {}): TagDTO[] {
  const needle = normalizeTagName(query);
  if (!needle) return [];

  const ancestorMatches = (tag: TagDTO) =>
    [...index.ancestorsOf(tag.id)].some((id) => index.byId.get(id)?.name.toLowerCase().includes(needle));

  const rank = (tag: TagDTO): number => {
    const name = tag.name.toLowerCase();
    if (name === needle) return 0;
    if (name.startsWith(needle)) return 1;
    if (name.includes(needle)) return 2;
    if (byPath && ancestorMatches(tag)) return 3;
    return -1;
  };

  return index.list
    .map((tag) => ({ tag, rank: rank(tag) }))
    .filter((item) => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || compareNames(index.pathLabel(a.tag.id), index.pathLabel(b.tag.id)))
    .map((item) => item.tag);
}

/**
 * Все теги в порядке обхода дерева — для выпадающего списка родителей. Тег с двумя родителями
 * встречается один раз: под тем, через кого идёт его pathLabel.
 */
export function flattenTree(index: TagIndex): TagDTO[] {
  const result: TagDTO[] = [];
  const visit = (parentId: number | null) => {
    for (const tag of index.childrenOf(parentId)) {
      if (parentId !== null && index.parentsOf(tag.id)[0]?.id !== parentId) continue;
      result.push(tag);
      visit(tag.id);
    }
  };
  visit(null);
  return result;
}
