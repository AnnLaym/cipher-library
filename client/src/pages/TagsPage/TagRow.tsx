import type { TagDTO } from '../../../../shared/types';
import { Icon } from '../../components/Icon';
import { TagChip } from '../../components/TagChip';
import type { TagTreeController } from './tagTreeController';

interface TagRowProps {
  tag: TagDTO;
  /** Положение строки в дереве или в результатах поиска. */
  at: string;
  tree: TagTreeController;
  size: 'sm' | 'md';
  /** Показывать путь к тегу (в результатах поиска и во вложенных ветках). */
  showPath?: boolean;
}

/** Строка тега с действиями, которые появляются при наведении. */
export function TagRow({ tag, at, tree, size, showPath }: TagRowProps) {
  const parentPath = tree.index.parentsLabel(tag.id);

  return (
    <div className="tag-row hover-host">
      <TagChip name={tag.name} color={tag.color} size={size} />
      {showPath && parentPath && <span className="tag-row__path">в {parentPath}</span>}
      <div className="hover-actions tag-row__actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => tree.startCreateChild(tag, at)}>
          <Icon name="plus" size={13} />
          Дочерний
        </button>
        <button
          type="button"
          className="icon-btn"
          onClick={() => tree.startEdit(tag, at)}
          aria-label={`Редактировать тег «${tag.name}»`}
        >
          <Icon name="pencil" size={15} />
        </button>
        <button
          type="button"
          className="icon-btn icon-btn--danger"
          onClick={() => tree.startDelete(tag)}
          aria-label={`Удалить тег «${tag.name}»`}
        >
          <Icon name="trash" size={15} />
        </button>
      </div>
    </div>
  );
}
