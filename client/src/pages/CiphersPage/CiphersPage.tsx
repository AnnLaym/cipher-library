import { useEffect, useState } from 'react';
import type { CipherInput } from '../../../../shared/types';
import { ciphersApi } from '../../api/ciphers';
import { Icon } from '../../components/Icon';
import { SearchInput } from '../../components/SearchInput';
import { EmptyState, ErrorState, SkeletonList } from '../../components/StatusViews';
import { useTags } from '../../context/TagsContext';
import { useCiphers } from '../../hooks/useCiphers';
import { CipherForm } from './CipherForm';
import { CipherList } from './CipherList';
import { ResultsBar } from './ResultsBar';
import { TagFilter } from './TagFilter';
import { useCipherFilters } from './useCipherFilters';
import './CiphersPage.css';

export function CiphersPage() {
  const filters = useCipherFilters();
  const tags = useTags();
  const { ciphers, status, error, reload } = useCiphers({
    query: filters.appliedQuery,
    tagIds: filters.tagIds,
    sort: filters.sort,
  });
  const [adding, setAdding] = useState(false);

  // Теги, удалённые на странице «Теги», убираем из фильтра.
  const { index } = tags;
  const { tagIds, setTagIds } = filters;
  useEffect(() => {
    if (tags.status !== 'ready') return;
    const existing = tagIds.filter((id) => index.byId.has(id));
    if (existing.length !== tagIds.length) setTagIds(existing);
  }, [tags.status, index, tagIds, setTagIds]);

  /** После сохранения шифра могли появиться новые теги и измениться счётчики. */
  const afterChange = async () => {
    reload();
    await tags.reload();
  };

  const createCipher = async (input: CipherInput) => {
    await ciphersApi.create(input);
    setAdding(false);
    await afterChange();
  };

  const updateCipher = async (id: number, input: CipherInput) => {
    await ciphersApi.update(id, input);
    await afterChange();
  };

  const deleteCipher = async (id: number) => {
    await ciphersApi.remove(id);
    await afterChange();
  };

  const renderResults = () => {
    if (status === 'loading') return <SkeletonList />;
    if (status === 'error') return <ErrorState message={error ?? 'Не удалось загрузить шифры'} onRetry={reload} />;
    if (ciphers.length === 0) {
      if (filters.hasFilters) return <EmptyState title="Ничего не найдено." />;
      if (adding) return null;
      return (
        <EmptyState title="Шифров пока нет.">
          <button type="button" className="btn btn--primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={15} />
            Добавить первый шифр
          </button>
        </EmptyState>
      );
    }
    return <CipherList ciphers={ciphers} onUpdate={updateCipher} onDelete={deleteCipher} />;
  };

  return (
    <>
      <div className="page-header">
        <h1 className="page-header__title">Шифры</h1>
        <div className="page-header__search">
          <SearchInput value={filters.query} onChange={filters.setQuery} placeholder="Поиск по слову и описанию" />
        </div>
        <button type="button" className="btn btn--primary" onClick={() => setAdding(true)} disabled={adding}>
          <Icon name="plus" size={15} />
          Добавить шифр
        </button>
      </div>

      <div className="ciphers-layout">
        <TagFilter selectedIds={filters.tagIds} onToggle={filters.toggleTag} />

        <section className="ciphers-main" aria-label="Шифры">
          {status === 'ready' && (ciphers.length > 0 || filters.hasFilters) && (
            <ResultsBar
              count={ciphers.length}
              hasFilters={filters.hasFilters}
              selectedTagIds={filters.tagIds}
              sort={filters.sort}
              onRemoveTag={filters.toggleTag}
              onReset={filters.reset}
              onSortChange={filters.setSort}
            />
          )}
          {adding && <CipherForm onSubmit={createCipher} onCancel={() => setAdding(false)} />}
          {renderResults()}
        </section>
      </div>
    </>
  );
}
