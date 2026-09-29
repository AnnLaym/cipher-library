import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import type { TagDTO } from '../../../../shared/types';
import { TagChip } from '../../components/TagChip';
import { useTags } from '../../context/TagsContext';
import type { TagIndex } from '../../lib/tagIndex';
import './TagFilter.css';

interface TagFilterProps {
  selectedIds: readonly number[];
  onToggle: (id: number) => void;
}

/** Выбранные теги раскрыты, а ветки, в которых они лежат, открыты — чтобы их было видно. */
function initiallyExpanded(index: TagIndex, selectedIds: readonly number[]): Set<number> {
  const expanded = new Set(selectedIds);
  for (const id of selectedIds) {
    for (const ancestorId of index.ancestorsOf(id)) expanded.add(ancestorId);
  }
  return expanded;
}

/**
 * Теги-фильтры. Нажатие выбирает тег и сразу показывает его детей под ним; повторное нажатие
 * снимает фильтр и сворачивает детей. Выбор тега включает всех его потомков, несколько тегов
 * работают через AND (логика на сервере). Порядок: сначала самые распространённые цвета, внутри цвета — по алфавиту.
 */
export function TagFilter({ selectedIds, onToggle }: TagFilterProps) {
  const { index, status, error } = useTags();
  const [expanded, setExpanded] = useState<Set<number> | null>(null);
  const [prevSelectedIds, setPrevSelectedIds] = useState(selectedIds);
  const openIds = expanded ?? initiallyExpanded(index, selectedIds);

  // Фильтр, снятый не здесь (крестиком над результатами или сбросом), тоже сворачивает детей тега.
  if (prevSelectedIds !== selectedIds) {
    setPrevSelectedIds(selectedIds);
    const removed = prevSelectedIds.filter((id) => !selectedIds.includes(id));
    if (expanded && removed.length > 0) setExpanded(new Set([...expanded].filter((id) => !removed.includes(id))));
  }

  const roots = useMemo(() => [...index.roots].sort(index.compareByColor), [index]);

  const toggle = (tag: TagDTO) => {
    const next = new Set(openIds);
    if (selectedIds.includes(tag.id)) next.delete(tag.id);
    else next.add(tag.id);
    setExpanded(next);
    onToggle(tag.id);
  };

  const renderLevel = (tags: TagDTO[], depth: number) => (
    <ul className="tag-filter__level" role={depth === 0 ? 'tree' : 'group'}>
      {tags.map((tag, i) => {
        const children = index.childrenOf(tag.id);
        const isOpen = children.length > 0 && openIds.has(tag.id);
        // Корневые теги разного цвета разделены небольшим отступом.
        const startsColorGroup = depth === 0 && i > 0 && tags[i - 1].color !== tag.color;
        return (
          <li
            key={tag.id}
            role="treeitem"
            aria-expanded={children.length > 0 ? isOpen : undefined}
            className={startsColorGroup ? 'tag-filter__group-start' : undefined}
          >
            <div className="tag-filter__row">
              <TagChip
                name={tag.name}
                color={tag.color}
                selected={selectedIds.includes(tag.id)}
                trailing={children.length > 0 && <span className="tag-chip__count">{children.length}</span>}
                onClick={() => toggle(tag)}
              />
            </div>
            {isOpen && renderLevel([...children].sort(index.compareByColor), depth + 1)}
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
      {status === 'ready' && roots.length === 0 && (
        <p className="tag-filter__note">
          Тегов пока нет. Их можно создать при добавлении шифра или на странице <Link to="/tags">Теги</Link>.
        </p>
      )}
      {roots.length > 0 && renderLevel(roots, 0)}
    </aside>
  );
}
