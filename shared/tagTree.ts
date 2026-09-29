// Логика иерархии тегов. Используется сервером (фильтрация, защита от циклов) и клиентом (отображение).
// У тега может быть до двух родителей, поэтому один и тот же тег встречается сразу в нескольких ветках.

export const MAX_TAG_PARENTS = 2;

export interface TagLink {
  id: number;
  parentIds: readonly number[];
}

/** parentId → непосредственные дети. Тег с двумя родителями лежит у обоих. Корневые теги — под ключом null. */
export function buildChildrenMap<T extends TagLink>(tags: readonly T[]): Map<number | null, T[]> {
  const ids = new Set(tags.map((tag) => tag.id));
  const map = new Map<number | null, T[]>();
  const add = (key: number | null, tag: T) => {
    const siblings = map.get(key);
    if (siblings) siblings.push(tag);
    else map.set(key, [tag]);
  };
  for (const tag of tags) {
    // Несуществующих родителей пропускаем; тег без родителей считаем корневым, чтобы он не пропал из дерева.
    const parents = new Set(tag.parentIds.filter((parentId) => ids.has(parentId)));
    if (parents.size === 0) add(null, tag);
    for (const parentId of parents) add(parentId, tag);
  }
  return map;
}

/** Сам тег и все его потомки на любой глубине, по всем веткам. */
export function collectDescendantIds(
  rootId: number,
  childrenMap: ReadonlyMap<number | null, readonly TagLink[]>,
): Set<number> {
  const result = new Set<number>([rootId]);
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of childrenMap.get(current) ?? []) {
      if (!result.has(child.id)) {
        result.add(child.id);
        queue.push(child.id);
      }
    }
  }
  return result;
}

/** Все предки тега по всем родительским веткам (без самого тега). */
export function collectAncestorIds(id: number, parentsOf: ReadonlyMap<number, readonly number[]>): Set<number> {
  const result = new Set<number>();
  const queue = [...(parentsOf.get(id) ?? [])];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (result.has(current)) continue;
    result.add(current);
    queue.push(...(parentsOf.get(current) ?? []));
  }
  return result;
}

/** Родитель из parentIds, который замкнул бы цикл (сам тег или его потомок); null — циклов нет. */
export function findCycleParent(
  tagId: number,
  parentIds: readonly number[],
  childrenMap: ReadonlyMap<number | null, readonly TagLink[]>,
): number | null {
  const descendants = collectDescendantIds(tagId, childrenMap);
  return parentIds.find((parentId) => descendants.has(parentId)) ?? null;
}

export interface AssignedRelatives {
  /** Назначенные предки добавляемого тега — с ним они становятся избыточными. */
  ancestors: number[];
  /** Назначенные потомки добавляемого тега — рядом с ними избыточным становится он сам. */
  descendants: number[];
}

/** Какие из уже назначенных шифру тегов лежат выше или ниже добавляемого в той же ветке. */
export function findAssignedRelatives(
  tagId: number,
  assignedIds: readonly number[],
  childrenMap: ReadonlyMap<number | null, readonly TagLink[]>,
  parentsOf: ReadonlyMap<number, readonly number[]>,
): AssignedRelatives {
  const ancestors = collectAncestorIds(tagId, parentsOf);
  const descendants = collectDescendantIds(tagId, childrenMap);
  return {
    ancestors: assignedIds.filter((id) => ancestors.has(id)),
    descendants: assignedIds.filter((id) => id !== tagId && descendants.has(id)),
  };
}
