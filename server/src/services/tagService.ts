import type { Tag } from '@prisma/client';
import { DEFAULT_TAG_COLOR } from '../../../shared/colors';
import { formatTagName, normalizeTagName } from '../../../shared/tagName';
import { buildChildrenMap, collectDescendantIds, wouldCreateCycle } from '../../../shared/tagTree';
import type { TagDTO, TagInput } from '../../../shared/types';
import { prisma, type Tx } from '../db';
import { HttpError, notFound } from '../errors';

type TagWithCount = Tag & { _count: { ciphers: number } };

const withCount = { _count: { select: { ciphers: true } } } as const;

function toDTO(tag: TagWithCount): TagDTO {
  return {
    id: tag.id,
    name: tag.name,
    color: tag.color,
    parentId: tag.parentId,
    cipherCount: tag._count.ciphers,
  };
}

async function findTagOrThrow(id: number, db: Tx = prisma): Promise<TagWithCount> {
  const tag = await db.tag.findUnique({ where: { id }, include: withCount });
  if (!tag) throw notFound('Тег не найден');
  return tag;
}

/** Запрещает второй тег с тем же нормализованным названием. */
async function assertNameIsFree(normalizedName: string, exceptId?: number): Promise<void> {
  const existing = await prisma.tag.findUnique({ where: { normalizedName }, include: withCount });
  if (existing && existing.id !== exceptId) {
    throw new HttpError(409, 'TAG_EXISTS', `Тег «${existing.name}» уже существует.`, toDTO(existing));
  }
}

async function assertValidParent(tagId: number | null, parentId: number | null): Promise<void> {
  if (parentId === null) return;
  const parent = await prisma.tag.findUnique({ where: { id: parentId } });
  if (!parent) throw notFound('Родительский тег не найден');
  if (tagId === null) return;

  const links = await prisma.tag.findMany({ select: { id: true, parentId: true } });
  const parentOf = new Map(links.map((link) => [link.id, link.parentId]));
  if (wouldCreateCycle(tagId, parentId, parentOf)) {
    const tag = await findTagOrThrow(tagId);
    const message =
      tagId === parentId
        ? 'Тег не может быть родителем самого себя.'
        : `Нельзя сделать «${parent.name}» родителем тега «${tag.name}»: «${parent.name}» уже находится внутри него. Получился бы цикл.`;
    throw new HttpError(400, 'TAG_CYCLE', message);
  }
}

export const tagService = {
  async list(): Promise<TagDTO[]> {
    const tags = await prisma.tag.findMany({ include: withCount, orderBy: { id: 'asc' } });
    return tags.map(toDTO);
  },

  async create(input: TagInput): Promise<TagDTO> {
    const normalizedName = normalizeTagName(input.name);
    await assertNameIsFree(normalizedName);
    await assertValidParent(null, input.parentId);
    const tag = await prisma.tag.create({
      data: {
        name: formatTagName(input.name),
        normalizedName,
        color: input.color,
        parentId: input.parentId,
      },
      include: withCount,
    });
    return toDTO(tag);
  },

  async update(id: number, input: TagInput): Promise<TagDTO> {
    await findTagOrThrow(id);
    const normalizedName = normalizeTagName(input.name);
    await assertNameIsFree(normalizedName, id);
    await assertValidParent(id, input.parentId);
    const tag = await prisma.tag.update({
      where: { id },
      data: {
        name: formatTagName(input.name),
        normalizedName,
        color: input.color,
        parentId: input.parentId,
      },
      include: withCount,
    });
    return toDTO(tag);
  },

  /** Удаляет тег: шифры и дочерние теги сохраняются, дети становятся корневыми. */
  async remove(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await findTagOrThrow(id, tx);
      await tx.cipherTag.deleteMany({ where: { tagId: id } });
      await tx.tag.updateMany({ where: { parentId: id }, data: { parentId: null } });
      await tx.tag.delete({ where: { id } });
    });
  },

  /** Для каждого выбранного тега — множество id: сам тег и все его потомки. */
  async expandWithDescendants(tagIds: readonly number[]): Promise<Set<number>[]> {
    if (tagIds.length === 0) return [];
    const links = await prisma.tag.findMany({ select: { id: true, parentId: true } });
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
