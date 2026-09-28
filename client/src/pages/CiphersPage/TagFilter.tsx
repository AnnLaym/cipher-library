import { useState } from 'react';
import { Link } from 'react-router';
import type { TagDTO } from '../../../../shared/types';
import { Icon } from '../../components/Icon';
import { TagChip } from '../../components/TagChip';
import { useTags } from '../../context/TagsContext';
import type { TagIndex } from '../../lib/tagIndex';
import './TagFilter.css';

interface TagFilterProps {
  selectedIds: readonly number[];
  onToggle: (id: number) => void;
}

/** Ветки, в которых лежат выбранные теги, раскрыты сразу. */
function initiallyExpanded(index: TagIndex, selectedIds: readonly number[]): Set<number> {
  const expanded = new Set<number>();
  for (const id of selectedIds) {
    for (const ancestor of index.pathOf(id).slice(0, -1)) expanded.add(ancestor.id);
  }
  return expanded;
}

/** Дерево тегов-фильтров. Выбор тега включает всех его потомков (логика на сервере). */
export function TagFilter({ selectedIds, onToggle }: TagFilterProps) {
  const { index, status, error } = useTags();
  const [expanded, setExpanded] = useState<Set<number> | null>(null);
  const openIds = expanded ?? initiallyExpanded(index, selectedIds);

  const toggleExpanded = (id: number) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpanded(next);
  };

  const renderLevel = (tags: TagDTO[], depth: number) => (
    <ul className="tag-filter__level" role={depth === 0 ? 'tree' : 'group'}>
      {tags.map((tag) => {
        const children = index.childrenOf(tag.id);
        const isOpen = openIds.has(tag.id);
        return (
          <li key={tag.id} role="treeitem" aria-expanded={children.length > 0 ? isOpen : undefined}>
            <div className="tag-filter__row">
              {children.length > 0 ? (
                <button
                  type="button"
                  className={`tag-filter__toggle${isOpen ? ' is-open' : ''}`}
                  onClick={() => toggleExpanded(tag.id)}
                  aria-label={isOpen ? `Свернуть «${tag.name}»` : `Развернуть «${tag.name}»`}
                >
                  <Icon name="chevronRight" size={14} />
                </button>
              ) : (
                <span className="tag-filter__spacer" />
              )}
              <TagChip
                name={tag.name}
                color={tag.color}
                selected={selectedIds.includes(tag.id)}
                onClick={() => onToggle(tag.id)}
              />
            </div>
            {isOpen && children.length > 0 && renderLevel(children, depth + 1)}
          </li>
        );
      })}
    </ul>
  );

  return (
    <aside className="tag-filter" aria-label="Фильтр по тегам">
      <h2 className="tag-filter__title">Теги</h2>
      {status === 'loading' && <p className="tag-filter__note">Загрузка…</p>}
      {status === 'error' && <p className="tag-filter__note form-error">{error}</p>}
      {status === 'ready' && index.roots.length === 0 && (
        <p className="tag-filter__note">
          Тегов пока нет. Их можно создать при добавлении шифра или на странице <Link to="/tags">Теги</Link>.
        </p>
      )}
      {index.roots.length > 0 && renderLevel(index.roots, 0)}
    </aside>
  );
}
