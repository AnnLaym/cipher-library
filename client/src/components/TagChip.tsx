import type { ReactNode } from 'react';
import { tagColorVars } from '../lib/tagColors';
import { Icon } from './Icon';
import './TagChip.css';

interface TagChipProps {
  name: string;
  color: string;
  size?: 'sm' | 'md';
  /** Залитый цветом тега — например, выбранный фильтр. */
  selected?: boolean;
  /** Обводка — например, раскрытый тег в дереве. */
  active?: boolean;
  /** Дополнительное содержимое справа от названия. */
  trailing?: ReactNode;
  onClick?: () => void;
  onRemove?: () => void;
}

export function TagChip({
  name,
  color,
  size = 'sm',
  selected,
  active,
  trailing,
  onClick,
  onRemove,
}: TagChipProps) {
  const className = [
    'tag-chip',
    `tag-chip--${size}`,
    selected && 'is-selected',
    active && 'is-active',
    onClick && 'is-clickable',
  ]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      <span className="tag-chip__name">{name}</span>
      {trailing}
    </>
  );

  if (onClick) {
    return (
      <button type="button" className={className} style={tagColorVars(color)} onClick={onClick} aria-pressed={selected}>
        {content}
      </button>
    );
  }

  return (
    <span className={className} style={tagColorVars(color)}>
      {content}
      {onRemove && (
        <button type="button" className="tag-chip__remove" onClick={onRemove} aria-label={`Убрать тег «${name}»`}>
          <Icon name="x" size={12} />
        </button>
      )}
    </span>
  );
}
