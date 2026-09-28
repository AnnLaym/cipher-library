import { normalizeTagName } from '../../../shared/tagName';
import { buildChildrenMap, collectDescendantIds } from '../../../shared/tagTree';
import type { TagDTO } from '../../../shared/types';

const collator = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

export const compareNames = (a: string, b: string): number => collator.compare(a, b);

/** Готовая к использованию структура дерева тегов (строится один раз при каждой загрузке тегов). */
export interface TagIndex {
  list: TagDTO[];
  byId: Map<number, TagDTO>;
  byNormalizedName: Map<string, TagDTO>;
  /** parentId → дети по алфавиту; корни под ключом null. */
  children: Map<number | null, TagDTO[]>;
  roots: TagDTO[];
  childrenOf(id: number | null): TagDTO[];
  /** Цепочка от корня до самого тега. */
  pathOf(id: number): TagDTO[];
  /** «Еда → Сладости → Шоколад» */
  pathLabel(id: number): string;
  /** Сам тег и все его потомки. */
  descendantsOf(id: number): Set<number>;
}

export function createTagIndex(tags: TagDTO[]): TagIndex {
  const byId = new Map(tags.map((tag) => [tag.id, tag]));
  const byNormalizedName = new Map(tags.map((tag) => [normalizeTagName(tag.name), tag]));
  const children = buildChildrenMap(tags);
  for (const siblings of children.values()) siblings.sort((a, b) => compareNames(a.name, b.name));

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
      current = current.parentId === null ? undefined : byId.get(current.parentId);
    }
    pathCache.set(id, path);
    return path;
  };

  return {
    list: tags,
    byId,
    byNormalizedName,
    children,
    roots: children.get(null) ?? [],
    childrenOf: (id) => children.get(id) ?? [],
    pathOf,
    pathLabel: (id) =>
      pathOf(id)
        .map((tag) => tag.name)
        .join(' → '),
    descendantsOf: (id) => collectDescendantIds(id, children),
  };
}

/**
 * Поиск тегов без учёта регистра. Сначала точное совпадение, затем начало названия,
 * затем вхождение в название; с `byPath` — ещё и теги, у которых совпал кто-то из предков.
 */
export function searchTags(index: TagIndex, query: string, { byPath = false } = {}): TagDTO[] {
  const needle = normalizeTagName(query);
  if (!needle) return [];

  const rank = (tag: TagDTO): number => {
    const name = tag.name.toLowerCase();
    if (name === needle) return 0;
    if (name.startsWith(needle)) return 1;
    if (name.includes(needle)) return 2;
    if (byPath && index.pathLabel(tag.id).toLowerCase().includes(needle)) return 3;
    return -1;
  };

  return index.list
    .map((tag) => ({ tag, rank: rank(tag) }))
    .filter((item) => item.rank >= 0)
    .sort((a, b) => a.rank - b.rank || compareNames(index.pathLabel(a.tag.id), index.pathLabel(b.tag.id)))
    .map((item) => item.tag);
}

/** Все теги в порядке обхода дерева — для выпадающего списка родителей. */
export function flattenTree(index: TagIndex): TagDTO[] {
  const result: TagDTO[] = [];
  const visit = (tags: TagDTO[]) => {
    for (const tag of tags) {
      result.push(tag);
      visit(index.childrenOf(tag.id));
    }
  };
  visit(index.roots);
  return result;
}
