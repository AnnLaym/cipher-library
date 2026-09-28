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
import { isAddingChildTo, isEditing, type TagEditor, type TagTreeController } from './tagTreeController';
import './TagsPage.css';

export function TagsPage() {
  const { index, status, error, reload } = useTags();
  const [query, setQuery] = useState('');
  const [editor, setEditor] = useState<TagEditor>(null);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());
  const [deleting, setDeleting] = useState<TagDTO | null>(null);

  /** Раскрывает ветки так, чтобы тег с указанным родителем был виден в дереве. */
  const revealUnder = (parentId: number | null) => {
    if (parentId === null) return;
    setOpenIds((prev) => new Set([...prev, ...index.pathOf(parentId).map((tag) => tag.id)]));
  };

  const tree: TagTreeController = {
    index,
    editor,
    isOpen: (id) => openIds.has(id),
    toggleOpen: (id) =>
      setOpenIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    startCreateChild: (parent) => {
      setEditor({ mode: 'create', parentId: parent.id });
      revealUnder(parent.id);
    },
    startEdit: (tag) => setEditor({ mode: 'edit', tagId: tag.id }),
    startDelete: setDeleting,
    closeEditor: () => setEditor(null),
    save: async (input: TagInput) => {
      if (editor?.mode === 'edit') await tagsApi.update(editor.tagId, input);
      else await tagsApi.create(input);
      await reload();
      revealUnder(input.parentId);
      setEditor(null);
    },
  };

  const startCreateRoot = () => setEditor({ mode: 'create', parentId: null });

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
        {results.map((tag) => (
          <div key={tag.id} className="tag-branch">
            {isEditing(editor, tag.id) ? (
              <TagForm tag={tag} onSubmit={tree.save} onCancel={tree.closeEditor} />
            ) : (
              <TagRow tag={tag} tree={tree} size="sm" showPath />
            )}
            {isAddingChildTo(editor, tag.id) && (
              <TagForm defaultParentId={tag.id} onSubmit={tree.save} onCancel={tree.closeEditor} />
            )}
          </div>
        ))}
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
          <TagBranch key={root.id} tag={root} depth={0} tree={tree} />
        ))}
      </div>
    );
  };

  const renderContent = () => {
    if (status === 'loading') return <SkeletonList count={2} />;
    if (status === 'error') return <ErrorState message={error ?? 'Не удалось загрузить теги'} onRetry={reload} />;
    return query.trim() ? renderSearchResults() : renderTree();
  };

  const creatingRoot = editor?.mode === 'create' && editor.parentId === null;

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
