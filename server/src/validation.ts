import { z } from 'zod';
import { DEFAULT_TAG_COLOR, isHexColor } from '../../shared/colors';
import { cleanTagName } from '../../shared/tagName';
import { badRequest } from './errors';

const tagName = z
  .string({ error: 'Введите название тега' })
  .transform(cleanTagName)
  .refine((name) => name.length > 0, 'Название тега не может быть пустым');

const id = z.number().int().positive();

export const tagInputSchema = z.object({
  name: tagName,
  color: z
    .string()
    .refine(isHexColor, 'Цвет должен быть в формате #rrggbb')
    .transform((color) => color.toLowerCase())
    .default(DEFAULT_TAG_COLOR),
  parentId: id.nullable().default(null),
});

export const cipherInputSchema = z.object({
  word: z.string({ error: 'Введите слово-шифр' }).trim().min(1, 'Слово-шифр не может быть пустым'),
  description: z
    .string()
    .default('')
    .transform((text) => text.trim()),
  tags: z.array(z.union([z.object({ id }), z.object({ name: tagName })])).default([]),
});

export const cipherQuerySchema = z.object({
  q: z.string().default(''),
  tags: z
    .string()
    .default('')
    .transform((value) =>
      value
        .split(',')
        .map(Number)
        .filter((tagId) => Number.isInteger(tagId) && tagId > 0),
    ),
});

export function parseId(raw: string): number {
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) throw badRequest('Некорректный идентификатор');
  return value;
}
