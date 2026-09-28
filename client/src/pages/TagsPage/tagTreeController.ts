import type { TagDTO, TagInput } from '../../../../shared/types';
import type { TagIndex } from '../../lib/tagIndex';

/** Открытая форма: создание (parentId = null — форма вверху страницы, иначе под родителем) или редактирование. */
export type TagEditor = { mode: 'create'; parentId: number | null } | { mode: 'edit'; tagId: number } | null;

/** Состояние и действия страницы тегов, общие для всех веток дерева. */
export interface TagTreeController {
  index: TagIndex;
  editor: TagEditor;
  isOpen: (id: number) => boolean;
  toggleOpen: (id: number) => void;
  startCreateChild: (parent: TagDTO) => void;
  startEdit: (tag: TagDTO) => void;
  startDelete: (tag: TagDTO) => void;
  closeEditor: () => void;
  save: (input: TagInput) => Promise<void>;
}

export const isEditing = (editor: TagEditor, tagId: number) => editor?.mode === 'edit' && editor.tagId === tagId;

export const isAddingChildTo = (editor: TagEditor, tagId: number) =>
  editor?.mode === 'create' && editor.parentId === tagId;
