// Логика иерархии тегов. Используется сервером (фильтрация, защита от циклов) и клиентом (отображение).

export interface TagLink {
  id: number;
  parentId: number | null;
}

/** parentId → непосредственные дети. Корневые теги лежат под ключом null. */
export function buildChildrenMap<T extends TagLink>(tags: readonly T[]): Map<number | null, T[]> {
  const ids = new Set(tags.map((tag) => tag.id));
  const map = new Map<number | null, T[]>();
  for (const tag of tags) {
    // Тег с несуществующим родителем считаем корневым, чтобы он не пропал из дерева.
    const key = tag.parentId !== null && ids.has(tag.parentId) ? tag.parentId : null;
    const siblings = map.get(key);
    if (siblings) siblings.push(tag);
    else map.set(key, [tag]);
  }
  return map;
}

/** Сам тег и все его потомки на любой глубине. */
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

/** true, если назначение newParentId родителем тега tagId замкнёт цикл (включая tagId === newParentId). */
export function wouldCreateCycle(
  tagId: number,
  newParentId: number | null,
  parentOf: ReadonlyMap<number, number | null>,
): boolean {
  const visited = new Set<number>();
  let current = newParentId;
  while (current !== null && !visited.has(current)) {
    if (current === tagId) return true;
    visited.add(current);
    current = parentOf.get(current) ?? null;
  }
  return false;
}
