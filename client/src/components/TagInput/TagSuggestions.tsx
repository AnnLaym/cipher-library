import { useEffect, useRef, type CSSProperties, type MouseEvent } from 'react';
import type { TagDTO } from '../../../../shared/types';
import type { TagIndex } from '../../lib/tagIndex';
import { ColorPicker } from '../ColorPicker';
import { Icon } from '../Icon';

export type SuggestionRow = { type: 'tag'; tag: TagDTO; selected: boolean } | { type: 'create'; name: string };

interface TagSuggestionsProps {
  listId: string;
  index: TagIndex;
  rows: SuggestionRow[];
  activeIndex: number;
  /** Режим поиска: рядом с названием показывается путь по дереву. */
  searching: boolean;
  /** Путь внутрь дерева, по которому пользователь перешёл стрелкой «›». */
  browseLabel: string | null;
  duplicate: TagDTO | null;
  /** Цвет, который получит новый тег. */
  newColor: string;
  paletteOpen: boolean;
  onHover: (rowIndex: number) => void;
  onActivate: (row: SuggestionRow) => void;
  onDrill: (tag: TagDTO) => void;
  onBack: () => void;
  onUseDuplicate: () => void;
  onCancelDuplicate: () => void;
  onTogglePalette: () => void;
  onColorChange: (color: string) => void;
}

export const optionId = (listId: string, rowIndex: number) => `${listId}-option-${rowIndex}`;

// Поле ввода не должно терять фокус при кликах внутри списка.
export const keepFocus = (event: MouseEvent) => event.preventDefault();

export function TagSuggestions(props: TagSuggestionsProps) {
  const { listId, index, rows, activeIndex, searching, browseLabel, duplicate, newColor, paletteOpen } = props;
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.querySelector('.is-active')?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  if (duplicate) {
    return (
      <div className="tag-suggest tag-suggest--notice" onMouseDown={keepFocus} role="alert">
        <p className="tag-suggest__notice-title">Тег «{duplicate.name}» уже существует.</p>
        <p className="tag-suggest__notice-text">Использовать существующий тег?</p>
        <div className="tag-suggest__notice-actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={props.onCancelDuplicate}>
            Отмена
          </button>
          <button type="button" className="btn btn--primary btn--sm" onClick={props.onUseDuplicate}>
            Использовать
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="tag-suggest" onMouseDown={keepFocus}>
      {browseLabel && (
        <button type="button" className="tag-suggest__back" onClick={props.onBack}>
          <Icon name="chevronLeft" size={14} />
          <span>{browseLabel}</span>
        </button>
      )}

      <div ref={listRef} id={listId} role="listbox" aria-label="Теги">
        {rows.map((row, rowIndex) => {
          const active = rowIndex === activeIndex;
          const common = {
            id: optionId(listId, rowIndex),
            role: 'option',
            'aria-selected': active,
            onMouseEnter: () => props.onHover(rowIndex),
            onClick: () => props.onActivate(row),
          } as const;

          if (row.type === 'create') {
            return (
              <div key="create" className="tag-suggest__create">
                <div {...common} className={`tag-suggest__row${active ? ' is-active' : ''}`}>
                  <Icon name="plus" size={14} />
                  <span className="tag-suggest__name">Создать «{row.name}»</span>
                  <button
                    type="button"
                    className="tag-suggest__color"
                    style={{ '--swatch': newColor } as CSSProperties}
                    aria-label="Цвет нового тега"
                    aria-expanded={paletteOpen}
                    title="Цвет нового тега"
                    onClick={(event) => {
                      event.stopPropagation();
                      props.onTogglePalette();
                    }}
                  />
                  {activeIndex === -1 && <kbd className="tag-suggest__kbd">Enter</kbd>}
                </div>
                {paletteOpen && (
                  <div className="tag-suggest__palette">
                    <ColorPicker value={newColor} onChange={props.onColorChange} />
                  </div>
                )}
              </div>
            );
          }

          const { tag } = row;
          const childCount = index.childrenOf(tag.id).length;
          const path = searching ? index.parentsLabel(tag.id) : '';
          return (
            <div
              key={tag.id}
              {...common}
              className={`tag-suggest__row${active ? ' is-active' : ''}${row.selected ? ' is-selected' : ''}`}
            >
              <span className="tag-suggest__dot" style={{ background: tag.color }} />
              <span className="tag-suggest__name">{tag.name}</span>
              {path && <span className="tag-suggest__path">{path}</span>}
              {row.selected && (
                <span className="tag-suggest__check" aria-label="уже добавлен">
                  <Icon name="check" size={14} />
                </span>
              )}
              {childCount > 0 && (
                <button
                  type="button"
                  className="tag-suggest__drill"
                  aria-label={`Вложенные теги «${tag.name}»`}
                  onClick={(event) => {
                    event.stopPropagation();
                    props.onDrill(tag);
                  }}
                >
                  <span>{childCount}</span>
                  <Icon name="chevronRight" size={14} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {rows.length === 0 && (
        <p className="tag-suggest__empty">
          {searching ? 'Этот тег уже добавлен' : 'Тегов пока нет — начните вводить название, чтобы создать'}
        </p>
      )}
    </div>
  );
}
