import type { Tag } from '@prisma/client';
import { DEFAULT_TAG_COLOR } from '../../../shared/colors';
import { formatTagName, normalizeTagName } from '../../../shared/tagName';
import { buildChildrenMap, collectDescendantIds, findCycleParent, type TagLink } from '../../../shared/tagTree';
import type { TagDTO, TagInput } from '../../../shared/types';
import { prisma, type Tx } from '../db';
import { HttpError, notFound } from '../errors';

type TagWithRelations = Tag & { _count: { ciphers: number }; parentLinks: { parentId: number }[] };

const withRelations = {
  _count: { select: { ciphers: true } },
  parentLinks: { select: { parentId: true }, orderBy: { parentId: 'asc' } },
} as const;

function toDTO(tag: TagWithRelations): TagDTO {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    parentIds: tag.parentLinks.map((link) => link.parentId),
    cipherCount: tag._count.ciphers,
  };
}

async function findTagOrThrow(id: number, db: Tx = prisma): Promise<TagWithRelations> {
  const tag = await db.tag.findUnique({ where: { id }, include: withRelations });
  if (!tag) throw notFound('Тег не найден');
  return tag;
}

/** Все теги со списками родителей — для обхода дерева. */
async function loadLinks(db: Tx = prisma): Promise<TagLink[]> {
  const tags = await db.tag.findMany({ select: { id: true, parentLinks: { select: { parentId: true } } } });
  return tags.map((tag) => ({ id: tag.id, parentIds: tag.parentLinks.map((link) => link.parentId) }));
}

/** Запрещает второй тег с тем же нормализованным названием. */
async function assertNameIsFree(normalizedName: string, exceptId?: number): Promise<void> {
  const existing = await prisma.tag.findUnique({ where: { normalizedName }, include: withRelations });
  if (existing && existing.id !== exceptId) {
    throw new HttpError(409, 'TAG_EXISTS', `Тег «${existing.name}» уже существует.`, toDTO(existing));
  }
}

async function assertValidParents(tagId: number | null, parentIds: readonly number[]): Promise<void> {
  if (parentIds.length === 0) return;
  const parents = await prisma.tag.findMany({ where: { id: { in: [...parentIds] } } });
  if (parents.length !== parentIds.length) throw notFound('Родительский тег не найден');
  if (tagId === null) return;

  const cycleParentId = findCycleParent(tagId, parentIds, buildChildrenMap(await loadLinks()));
  if (cycleParentId !== null) {
    const tag = await findTagOrThrow(tagId);
    const parent = parents.find((candidate) => candidate.id === cycleParentId)!;
    const message =
      tagId === cycleParentId
        ? 'Тег не может быть родителем самого себя.'
        : `Нельзя сделать «${parent.name}» родителем тега «${tag.name}»: «${parent.name}» уже находится внутри него. Получился бы цикл.`;
    throw new HttpError(400, 'TAG_CYCLE', message);
  }
}

function tagData(input: TagInput) {
  return { name: formatTagName(input.name), normalizedName: normalizeTagName(input.name), color: input.color };
}

async function replaceParents(tx: Tx, childId: number, parentIds: readonly number[]): Promise<void> {
  await tx.tagParent.deleteMany({ where: { childId } });
  await tx.tagParent.createMany({ data: parentIds.map((parentId) => ({ childId, parentId })) });
}

export const tagService = {
  async list(): Promise<TagDTO[]> {
    const tags = await prisma.tag.findMany({ include: withRelations, orderBy: { id: 'asc' } });
    return tags.map(toDTO);
  },

  async create(input: TagInput): Promise<TagDTO> {
    await assertNameIsFree(normalizeTagName(input.name));
    await assertValidParents(null, input.parentIds);
    const tag = await prisma.$transaction(async (tx) => {
      const created = await tx.tag.create({ data: tagData(input) });
      await replaceParents(tx, created.id, input.parentIds);
      return findTagOrThrow(created.id, tx);
    });
    return toDTO(tag);
  },

  async update(id: number, input: TagInput): Promise<TagDTO> {
    await findTagOrThrow(id);
    await assertNameIsFree(normalizeTagName(input.name), id);
    await assertValidParents(id, input.parentIds);
    const tag = await prisma.$transaction(async (tx) => {
      await tx.tag.update({ where: { id }, data: tagData(input) });
      await replaceParents(tx, id, input.parentIds);
      return findTagOrThrow(id, tx);
    });
    return toDTO(tag);
  },

  /**
   * Удаляет тег: шифры и дочерние теги сохраняются. Дети теряют этого родителя —
   * остаются под вторым, если он есть, иначе становятся корневыми.
   */
  async remove(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await findTagOrThrow(id, tx);
      await tx.cipherTag.deleteMany({ where: { tagId: id } });
      await tx.tagParent.deleteMany({ where: { OR: [{ childId: id }, { parentId: id }] } });
      await tx.tag.delete({ where: { id } });
    });
  },

  /** Для каждого выбранного тега — множество id: сам тег и все его потомки по всем веткам. */
  async expandWithDescendants(tagIds: readonly number[]): Promise<Set<number>[]> {
    if (tagIds.length === 0) return [];
    const links = await loadLinks();
    const known = new Set(links.map((link) => link.id));
    const children = buildChildrenMap(links);
    return tagIds.filter((id) => known.has(id)).map((id) => collectDescendantIds(id, children));
  },

  /**
   * Превращает теги из формы шифра в список id в том же порядке.
   * Новые названия создаются, а если такой тег уже есть (с учётом регистра) — используется существующий.
   */
  async resolveForCipher(tx: Tx, inputs: readonly ({ id: number } | { name: string })[]): Promise<number[]> {
    const result: number[] = [];
    for (const input of inputs) {
      let tagId: number;
      if ('id' in input) {
        const tag = await tx.tag.findUnique({ where: { id: input.id }, select: { id: true } });
        if (!tag) throw notFound('Один из выбранных тегов был удалён. Обновите страницу.');
        tagId = tag.id;
      } else {
        const normalizedName = normalizeTagName(input.name);
        const tag = await tx.tag.upsert({
          where: { normalizedName },
          update: {},
          create: { name: formatTagName(input.name), normalizedName, color: DEFAULT_TAG_COLOR },
          select: { id: true },
        });
        tagId = tag.id;
      }
      if (!result.includes(tagId)) result.push(tagId);
    }
    return result;
  },
};
