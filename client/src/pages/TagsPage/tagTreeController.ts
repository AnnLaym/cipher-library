import type { TagDTO, TagInput } from '../../../../shared/types';
import type { TagIndex } from '../../lib/tagIndex';

/**
 * Положение ветки в дереве — id от корня до тега: «1/2/3». Тег с двумя родителями показывается
 * в нескольких местах, а раскрытие и формы относятся только к тому месту, где с ним работают.
 */
export const branchKey = (parentAt: string | null, tagId: number): string =>
  parentAt === null ? String(tagId) : `${parentAt}/${tagId}`;

/** Открытая форма: создание (at = null — форма вверху страницы, иначе под веткой at) или редактирование. */
export type TagEditor = { mode: 'create'; at: string | null } | { mode: 'edit'; tagId: number; at: string } | null;

/** Состояние и действия страницы тегов, общие для всех веток дерева. */
export interface TagTreeController {
  index: TagIndex;
  editor: TagEditor;
  isOpen: (at: string) => boolean;
  toggleOpen: (at: string) => void;
  startCreateChild: (parent: TagDTO, at: string) => void;
  startEdit: (tag: TagDTO, at: string) => void;
  startDelete: (tag: TagDTO) => void;
  closeEditor: () => void;
  save: (input: TagInput) => Promise<void>;
}

export const isEditing = (editor: TagEditor, at: string) => editor?.mode === 'edit' && editor.at === at;

export const isAddingChildTo = (editor: TagEditor, at: string) => editor?.mode === 'create' && editor.at === at;
