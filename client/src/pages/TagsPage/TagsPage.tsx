import { useState } from 'react';
import type { TagDTO, TagInput } from '../../../../shared/types';
import { tagsApi } from '../../api/tags';
import { Icon } from '../../components/Icon';
import { SearchInput } from '../../components/SearchInput';
import { EmptyState, ErrorState, SkeletonList } from '../../components/StatusViews';
import { useTags } from '../../context/TagsContext';
import { searchTags } from '../../lib/tagIndex';
import { DeleteTagDialog } from './DeleteTagDialog';
import { TagBranch } from './TagBranch';
import { TagForm } from './TagForm';
import { TagRow } from './TagRow';
import {
  branchKey,
  isAddingChildTo,
  isEditing,
  type TagEditor,
  type TagTreeController,
} from './tagTreeController';
import './TagsPage.css';

export function TagsPage() {
  const { index, status, error, reload } = useTags();
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<TagEditor>(null);
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState<TagDTO | null>(null);

  /** Раскрывает ветки так, чтобы тег с указанным родителем был виден в дереве. */
  const revealUnder = (parentId: number | undefined) => {
    if (parentId === undefined) return;
    const keys: string[] = [];
    for (const tag of index.pathOf(parentId)) keys.push(branchKey(keys.at(-1) ?? null, tag.id));
    setOpenKeys((prev) => new Set([...prev, ...keys]));
  };

  const tree: TagTreeController = {
    index,
    editor,
    isOpen: (at) => openKeys.has(at),
    toggleOpen: (at) =>
      setOpenKeys((prev) => {
        const next = new Set(prev);
        if (next.has(at)) next.delete(at);
        else next.add(at);
        return next;
      }),
    startCreateChild: (parent, at) => {
      setEditor({ mode: 'create', at });
      revealUnder(parent.id);
    },
    startEdit: (tag, at) => setEditor({ mode: 'edit', tagId: tag.id, at }),
    startDelete: setDeleting,
    closeEditor: () => setEditor(null),
    save: async (input: TagInput) => {
      if (editor?.mode === 'edit') await tagsApi.update(editor.tagId, input);
      else await tagsApi.create(input);
      await reload();
      revealUnder(input.parentIds[0]);
      setEditor(null);
    },
  };

  const startCreateRoot = () => setEditor({ mode: 'create', at: null });

  const deleteTag = async (tag: TagDTO) => {
    await tagsApi.remove(tag.id);
    setEditor(null);
    await reload();
  };

  const renderSearchResults = () => {
    const results = searchTags(index, query);
    if (results.length === 0) return <EmptyState title="Ничего не найдено." />;
    return (
      <div className="tag-panel">
        {results.map((tag) => {
          const at = `search:${tag.id}`;
          return (
            <div key={tag.id} className="tag-branch">
              {isEditing(editor, at) ? (
                <TagForm tag={tag} onSubmit={tree.save} onCancel={tree.closeEditor} />
              ) : (
                <TagRow tag={tag} at={at} tree={tree} size="sm" showPath />
              )}
              {isAddingChildTo(editor, at) && (
                <TagForm defaultParentId={tag.id} onSubmit={tree.save} onCancel={tree.closeEditor} />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  const renderTree = () => {
    if (index.roots.length === 0) {
      if (editor) return null;
      return (
        <EmptyState title="Тегов пока нет.">
          <button type="button" className="btn btn--primary" onClick={startCreateRoot}>
            <Icon name="plus" size={15} />
            Добавить первый тег
          </button>
        </EmptyState>
      );
    }
    return (
      <div className="tag-panel">
        {index.roots.map((root) => (
          <TagBranch key={root.id} tag={root} at={branchKey(null, root.id)} depth={0} tree={tree} />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (status === 'loading') return <SkeletonList count={2} />;
    if (status === 'error') return <ErrorState message={error ?? 'Не удалось загрузить теги'} onRetry={reload} />;
    return query.trim() ? renderSearchResults() : renderTree();
  };

  const creatingRoot = editor?.mode === 'create' && editor.at === null;

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Теги</h1>
        <div className="page-header__search">
          <SearchInput value={query} onChange={setQuery} placeholder="Поиск тегов" />
        </div>
        <button type="button" className="btn btn--primary" onClick={startCreateRoot} disabled={creatingRoot}>
          <Icon name="plus" size={15} />
          Добавить тег
        </button>
      </div>

      <div className="tags-page">
        {creatingRoot && (
          <div className="tag-panel tag-panel--form">
            <TagForm onSubmit={tree.save} onCancel={tree.closeEditor} />
          </div>
        )}
        {renderContent()}
      </div>

      {deleting && (
        <DeleteTagDialog
          tag={deleting}
          childCount={index.childrenOf(deleting.id).length}
          onConfirm={() => deleteTag(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </>
  );
}
