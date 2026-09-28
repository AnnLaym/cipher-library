import { normalizeTagName } from '../../../../shared/tagName';
import type { CipherTagDTO, CipherTagInput } from '../../../../shared/types';
import type { TagIndex } from '../../lib/tagIndex';

/** Тег в форме шифра: уже существующий или новый, который сервер создаст при сохранении. */
export type TagDraft = { kind: 'existing'; id: number } | { kind: 'new'; name: string };

export function draftKey(draft: TagDraft): string {
  return draft.kind === 'existing' ? `id:${draft.id}` : `new:${normalizeTagName(draft.name)}`;
}

export function draftsFromCipher(tags: readonly CipherTagDTO[]): TagDraft[] {
  return tags.map((tag) => ({ kind: 'existing', id: tag.id }));
}

/** Порядок сохраняется; теги, удалённые за время редактирования, пропускаются. */
export function draftsToInput(drafts: readonly TagDraft[], index: TagIndex): CipherTagInput[] {
  return drafts.flatMap((draft): CipherTagInput[] => {
    if (draft.kind === 'new') return [{ name: draft.name }];
    return index.byId.has(draft.id) ? [{ id: draft.id }] : [];
  });
}
