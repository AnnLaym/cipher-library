import type { TagDTO } from '../../../../shared/types';
import type { TagIndex } from '../../lib/tagIndex';
import { keepFocus } from './TagSuggestions';

/** Добавляемый тег и уже назначенные шифру теги из той же ветки. */
export interface TagConflict {
  tag: TagDTO;
  ancestors: number[];
  descendants: number[];
}

interface TagConflictNoticeProps {
  conflict: TagConflict;
  index: TagIndex;
  onRemoveRelated: () => void;
  onKeepAll: () => void;
  onCancel: () => void;
}

/** «Еда» / «Еда» и «Сладости» / «Еда», «Сладости» и «Шоколад» */
function quoteNames(tags: readonly TagDTO[]): string {
  const names = tags.map((tag) => `«${tag.name}»`);
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} и ${names.at(-1)}` : (names[0] ?? '');
}

const isParentOf = (parent: TagDTO, child: TagDTO) => child.parentIds.includes(parent.id);

function removeLabel(ancestorCount: number, descendantCount: number): string {
  if (descendantCount === 0) return ancestorCount === 1 ? 'Удалить родителя' : 'Удалить родителей';
  if (ancestorCount === 0) return descendantCount === 1 ? 'Удалить дочерний тег' : 'Удалить дочерние теги';
  return 'Удалить лишние';
}

/**
 * Предупреждение: у шифра уже есть родитель (или ребёнок) добавляемого тега.
 * Ничего не меняется, пока пользователь сам не выберет, что оставить.
 */
export function TagConflictNotice({ conflict, index, onRemoveRelated, onKeepAll, onCancel }: TagConflictNoticeProps) {
  const { tag } = conflict;
  const ancestors = conflict.ancestors.flatMap((id) => index.byId.get(id) ?? []);
  const descendants = conflict.descendants.flatMap((id) => index.byId.get(id) ?? []);
  const related = [...ancestors, ...descendants];

  const lines: string[] = [];
  if (ancestors.length === 1) {
    const [ancestor] = ancestors;
    lines.push(
      `У этого шифра уже есть родительский тег «${ancestor.name}».`,
      `Добавляемый тег «${tag.name}» является ${isParentOf(ancestor, tag) ? 'его дочерним тегом' : 'его потомком'}.`,
    );
  } else if (ancestors.length > 1) {
    lines.push(
      `У этого шифра уже есть родительские теги ${quoteNames(ancestors)}.`,
      `Добавляемый тег «${tag.name}» вложен в каждый из них.`,
    );
  }
  if (descendants.length === 1) {
    const [descendant] = descendants;
    lines.push(
      `У этого шифра уже есть дочерний тег «${descendant.name}».`,
      `Добавляемый тег «${tag.name}» является ${isParentOf(tag, descendant) ? 'его родителем' : 'его предком'}.`,
    );
  } else if (descendants.length > 1) {
    lines.push(
      `У этого шифра уже есть дочерние теги ${quoteNames(descendants)}.`,
      `Добавляемый тег «${tag.name}» является для них родительским.`,
    );
  }

  return (
    <div className="tag-suggest tag-suggest--notice" onMouseDown={keepFocus} role="alert">
      <p className="tag-suggest__notice-title">{lines[0]}</p>
      {lines.slice(1).map((line) => (
        <p key={line} className="tag-suggest__notice-text">
          {line}
        </p>
      ))}
      <p className="tag-suggest__notice-text">Удалить {quoteNames(related)} из шифра?</p>
      <div className="tag-suggest__notice-actions">
        <button type="button" className="btn btn--ghost btn--sm" onClick={onCancel}>
          Отмена
        </button>
        <button type="button" className="btn btn--ghost btn--sm" onClick={onKeepAll}>
          {related.length === 1 ? 'Оставить оба' : 'Оставить все'}
        </button>
        <button type="button" className="btn btn--primary btn--sm" onClick={onRemoveRelated}>
          {removeLabel(ancestors.length, descendants.length)}
        </button>
      </div>
    </div>
  );
}
