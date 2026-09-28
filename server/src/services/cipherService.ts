import type { Prisma } from '@prisma/client';
import type { CipherDTO, CipherInput } from '../../../shared/types';
import { prisma, type Tx } from '../db';
import { notFound } from '../errors';
import { tagService } from './tagService';

const includeTags = {
  tags: {
    orderBy: { position: 'asc' },
    include: { tag: { select: { id: true, name: true, color: true } } },
  },
} satisfies Prisma.CipherInclude;

type CipherWithTags = Prisma.CipherGetPayload<{ include: typeof includeTags }>;

function toDTO(cipher: CipherWithTags): CipherDTO {
  return {
    id: cipher.id,
    word: cipher.word,
    description: cipher.description,
    tags: cipher.tags.map((link) => link.tag),
    createdAt: cipher.createdAt.toISOString(),
    updatedAt: cipher.updatedAt.toISOString(),
  };
}

const alphabetical = new Intl.Collator('ru', { sensitivity: 'base', numeric: true });

function byWord(a: CipherDTO, b: CipherDTO): number {
  return alphabetical.compare(a.word, b.word) || a.id - b.id;
}

// SQLite LIKE не учитывает регистр кириллицы, поэтому текстовый поиск выполняется здесь.
function matchesText(cipher: CipherDTO, query: string): boolean {
  return cipher.word.toLowerCase().includes(query) || cipher.description.toLowerCase().includes(query);
}

async function replaceTags(tx: Tx, cipherId: number, input: CipherInput): Promise<void> {
  const tagIds = await tagService.resolveForCipher(tx, input.tags);
  await tx.cipherTag.deleteMany({ where: { cipherId } });
  await tx.cipherTag.createMany({
    data: tagIds.map((tagId, position) => ({ cipherId, tagId, position })),
  });
}

async function findOrThrow(id: number, db: Tx = prisma): Promise<CipherWithTags> {
  const cipher = await db.cipher.findUnique({ where: { id }, include: includeTags });
  if (!cipher) throw notFound('Шифр не найден');
  return cipher;
}

export const cipherService = {
  /**
   * Текст ищется по слову и описанию, а каждый выбранный тег — с учётом всех его потомков.
   * Условия объединяются через AND.
   */
  async list(query: string, tagIds: readonly number[]): Promise<CipherDTO[]> {
    const tagGroups = await tagService.expandWithDescendants(tagIds);
    const ciphers = await prisma.cipher.findMany({
      where: {
        AND: tagGroups.map((ids) => ({ tags: { some: { tagId: { in: [...ids] } } } })),
      },
      include: includeTags,
    });

    const text = query.trim().toLowerCase();
    return ciphers
      .map(toDTO)
      .filter((cipher) => text === '' || matchesText(cipher, text))
      .sort(byWord);
  },

  async get(id: number): Promise<CipherDTO> {
    return toDTO(await findOrThrow(id));
  },

  async create(input: CipherInput): Promise<CipherDTO> {
    const cipher = await prisma.$transaction(async (tx) => {
      const created = await tx.cipher.create({
        data: { word: input.word, description: input.description },
      });
      await replaceTags(tx, created.id, input);
      return findOrThrow(created.id, tx);
    });
    return toDTO(cipher);
  },

  async update(id: number, input: CipherInput): Promise<CipherDTO> {
    const cipher = await prisma.$transaction(async (tx) => {
      await findOrThrow(id, tx);
      await tx.cipher.update({
        where: { id },
        data: { word: input.word, description: input.description },
      });
      await replaceTags(tx, id, input);
      return findOrThrow(id, tx);
    });
    return toDTO(cipher);
  },

  async remove(id: number): Promise<void> {
    await prisma.$transaction(async (tx) => {
      await findOrThrow(id, tx);
      await tx.cipherTag.deleteMany({ where: { cipherId: id } });
      await tx.cipher.delete({ where: { id } });
    });
  },
};
