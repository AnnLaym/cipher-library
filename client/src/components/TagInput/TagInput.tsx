import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { DEFAULT_TAG_COLOR } from '../../../../shared/colors';
import { cleanTagName, formatTagName, normalizeTagName } from '../../../../shared/tagName';
import type { TagDTO } from '../../../../shared/types';
import { useTags } from '../../context/TagsContext';
import { useDragReorder } from '../../hooks/useDragReorder';
import { searchTags } from '../../lib/tagIndex';
import { TagChip } from '../TagChip';
import { draftKey, type TagDraft } from './tagDraft';
import { TagSuggestions, optionId, type SuggestionRow } from './TagSuggestions';
import './TagInput.css';

const MAX_SEARCH_RESULTS = 50;

interface TagInputProps {
  id?: string;
  value: TagDraft[];
  onChange: (next: TagDraft[]) => void;
}

/**
 * Выбор тегов для шифра: поиск по существующим, переход вглубь дерева, создание новых,
 * защита от дубликатов и перетаскивание для изменения порядка.
 */
export function TagInput({ id, value, onChange }: TagInputProps) {
  const { index } = useTags();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [browseId, setBrowseId] = useState<number | null>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [duplicate, setDuplicate] = useState<TagDTO | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const drag = useDragReorder(value, onChange);
  const selectedKeys = useMemo(() => new Set(value.map(draftKey)), [value]);

  const text = cleanTagName(query);
  const exactMatch = text ? index.byNormalizedName.get(normalizeTagName(text)) : undefined;
  const browseTag = browseId === null ? null : (index.byId.get(browseId) ?? null);

  const rows = useMemo<SuggestionRow[]>(() => {
    const tags = text
      ? searchTags(index, text, { byPath: true }).slice(0, MAX_SEARCH_RESULTS)
      : index.childrenOf(browseTag?.id ?? null);
    const tagRows: SuggestionRow[] = tags.map((tag) => ({
      type: 'tag',
      tag,
      selected: selectedKeys.has(draftKey({ kind: 'existing', id: tag.id })),
    }));
    const canCreate = text && !exactMatch && !selectedKeys.has(draftKey({ kind: 'new', name: text }));
    return canCreate ? [...tagRows, { type: 'create', name: formatTagName(text) }] : tagRows;
  }, [index, text, browseTag, exactMatch, selectedKeys]);

  const clearQuery = () => {
    setQuery('');
    setActiveIndex(-1);
    setDuplicate(null);
  };

  const add = (draft: TagDraft, displayName: string) => {
    clearQuery();
    setOpen(false);
    if (selectedKeys.has(draftKey(draft))) {
      setNotice(`Тег «${displayName}» уже добавлен`);
      return;
    }
    setNotice(null);
    onChange([...value, draft]);
  };

  const addExisting = (tag: TagDTO) => add({ kind: 'existing', id: tag.id }, tag.name);

  /** Подтверждение введённого текста: существующий тег требует согласия, новый создаётся. */
  const confirmTyped = () => {
    if (!text) return;
    if (exactMatch && !selectedKeys.has(draftKey({ kind: 'existing', id: exactMatch.id }))) {
      setDuplicate(exactMatch);
      setOpen(true);
      return;
    }
    if (exactMatch) addExisting(exactMatch);
    else add({ kind: 'new', name: formatTagName(text) }, formatTagName(text));
  };

  const activate = (row: SuggestionRow) => {
    if (row.type === 'create') confirmTyped();
    else if (!row.selected) addExisting(row.tag);
  };

  const drillInto = (tag: TagDTO) => {
    setBrowseId(tag.id);
    clearQuery();
    setOpen(true);
    inputRef.current?.focus();
  };

  const goUp = () => {
    setBrowseId(browseTag?.parentId ?? null);
    setActiveIndex(-1);
  };

  const moveActive = (step: 1 | -1) => {
    setOpen(true);
    if (rows.length === 0) return;
    setActiveIndex((current) => {
      if (current === -1) return step === 1 ? 0 : rows.length - 1;
      return (current + step + rows.length) % rows.length;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    const activeRow = activeIndex >= 0 ? rows[activeIndex] : undefined;
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        event.preventDefault();
        moveActive(event.key === 'ArrowDown' ? 1 : -1);
        break;
      case 'ArrowRight':
        if (open && activeRow?.type === 'tag' && index.childrenOf(activeRow.tag.id).length > 0) {
          event.preventDefault();
          drillInto(activeRow.tag);
        }
        break;
      case 'ArrowLeft':
        if (open && !query && browseTag) {
          event.preventDefault();
          goUp();
        }
        break;
      case 'Enter':
        if (event.ctrlKey || event.metaKey) return; // Ctrl+Enter сохраняет всю форму
        event.preventDefault();
        if (duplicate) addExisting(duplicate);
        else if (open && activeRow) activate(activeRow);
        else confirmTyped();
        break;
      case 'Escape':
        if (duplicate || open) {
          event.preventDefault();
          event.stopPropagation();
          if (duplicate) setDuplicate(null);
          else setOpen(false);
        }
        break;
      case 'Backspace':
        if (!query && value.length > 0) onChange(value.slice(0, -1));
        break;
    }
  };

  return (
    <div
      className="tag-input"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setOpen(false);
          setDuplicate(null);
        }
      }}
    >
      <div className="tag-input__control">
        <div className="tag-input__box" onClick={() => inputRef.current?.focus()}>
          {value.map((draft, i) => {
            const tag = draft.kind === 'existing' ? index.byId.get(draft.id) : undefined;
            if (draft.kind === 'existing' && !tag) return null;
            const name = tag?.name ?? (draft.kind === 'new' ? draft.name : '');
            const side = drag.dropSide(i);
            return (
              <span
                key={draftKey(draft)}
                className={`tag-input__item${side ? ` drop-${side}` : ''}${drag.draggingIndex === i ? ' is-dragging' : ''}`}
                {...drag.itemProps(i)}
              >
                <TagChip
                  name={name}
                  color={tag?.color ?? DEFAULT_TAG_COLOR}
                  pending={draft.kind === 'new'}
                  onRemove={() => onChange(value.filter((_, j) => j !== i))}
                />
              </span>
            );
          })}
          <input
            ref={inputRef}
            id={id}
            className="tag-input__field"
            value={query}
            placeholder={value.length === 0 ? 'Найдите или создайте тег…' : 'Ещё тег…'}
            autoComplete="off"
            role="combobox"
            aria-expanded={open}
            aria-controls={listId}
            aria-activedescendant={open && activeIndex >= 0 ? optionId(listId, activeIndex) : undefined}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(-1);
              setDuplicate(null);
              setNotice(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {open && (
          <TagSuggestions
            listId={listId}
            index={index}
            rows={rows}
            activeIndex={activeIndex}
            searching={Boolean(text)}
            browseTag={text ? null : browseTag}
            duplicate={duplicate}
            onHover={setActiveIndex}
            onActivate={activate}
            onDrill={drillInto}
            onBack={goUp}
            onUseDuplicate={() => duplicate && addExisting(duplicate)}
            onCancelDuplicate={() => setDuplicate(null)}
          />
        )}
      </div>

      {notice && <p className="field-hint">{notice}</p>}
      {value.length > 1 && !notice && <p className="field-hint">Порядок тегов можно менять перетаскиванием.</p>}
    </div>
  );
}
