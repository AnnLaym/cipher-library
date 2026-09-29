import { useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { DEFAULT_TAG_COLOR } from '../../../../shared/colors';
import { cleanTagName, formatTagName, normalizeTagName } from '../../../../shared/tagName';
import type { TagDTO } from '../../../../shared/types';
import { ApiError, errorMessage } from '../../api/http';
import { tagsApi } from '../../api/tags';
import { useTags } from '../../context/TagsContext';
import { useDragReorder } from '../../hooks/useDragReorder';
import { searchTags } from '../../lib/tagIndex';
import { TagChip } from '../TagChip';
import { TagConflictNotice, type TagConflict } from './TagConflictNotice';
import { TagSuggestions, optionId, type SuggestionRow } from './TagSuggestions';
import './TagInput.css';

const MAX_SEARCH_RESULTS = 50;

interface TagInputProps {
  id?: string;
  /** id назначенных тегов в порядке отображения. */
  value: number[];
  onChange: (next: number[]) => void;
}

/**
 * Выбор тегов для шифра: поиск по существующим, переход вглубь дерева, быстрое создание нового тега
 * с выбором цвета, предупреждение о родителе и ребёнке из одной ветки, защита от дубликатов
 * и перетаскивание для изменения порядка.
 */
export function TagInput({ id, value, onChange }: TagInputProps) {
  const { index, reload } = useTags();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [browsePath, setBrowsePath] = useState<number[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [duplicate, setDuplicate] = useState<TagDTO | null>(null);
  const [conflict, setConflict] = useState<TagConflict | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [newColor, setNewColor] = useState(DEFAULT_TAG_COLOR);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const drag = useDragReorder(value, onChange);

  const text = cleanTagName(query);
  const exactMatch = text ? index.byNormalizedName.get(normalizeTagName(text)) : undefined;
  // Путь, по которому пользователь перешёл вглубь дерева стрелкой «›» (удалённые теги пропускаются).
  const browseTrail = browsePath.flatMap((tagId) => index.byId.get(tagId) ?? []);
  const browseTag = browseTrail.at(-1) ?? null;

  const rows = useMemo<SuggestionRow[]>(() => {
    const tags = text
      ? searchTags(index, text, { byPath: true }).slice(0, MAX_SEARCH_RESULTS)
      : index.childrenOf(browseTag?.id ?? null);
    const tagRows: SuggestionRow[] = tags.map((tag) => ({ type: 'tag', tag, selected: value.includes(tag.id) }));
    return text && !exactMatch ? [...tagRows, { type: 'create', name: formatTagName(text) }] : tagRows;
  }, [index, text, browseTag, exactMatch, value]);

  const clearQuery = () => {
    setQuery('');
    setActiveIndex(-1);
    setDuplicate(null);
  };

  /** Добавляет тег. Если у шифра уже есть его предок или потомок — сначала спрашивает, что оставить. */
  const addExisting = (tag: TagDTO) => {
    clearQuery();
    if (value.includes(tag.id)) {
      setOpen(false);
      setNotice(`Тег «${tag.name}» уже добавлен`);
      return;
    }
    setNotice(null);
    const relatives = index.assignedRelatives(tag.id, value);
    if (relatives.ancestors.length > 0 || relatives.descendants.length > 0) {
      setConflict({ tag, ...relatives });
      return;
    }
    setOpen(false);
    onChange([...value, tag.id]);
  };

  const resolveConflict = (removeRelated: boolean) => {
    if (!conflict) return;
    const { tag, ancestors, descendants } = conflict;
    setConflict(null);
    setOpen(false);
    if (!removeRelated) {
      onChange([...value, tag.id]);
      return;
    }
    // Новый тег встаёт на место первого удалённого, порядок остальных не меняется.
    const related = new Set([...ancestors, ...descendants]);
    const next = value.filter((tagId) => !related.has(tagId));
    next.splice(value.findIndex((tagId) => related.has(tagId)), 0, tag.id);
    onChange(next);
  };

  /** Быстрое создание: тег сразу сохраняется с выбранным цветом, появляется в списке тегов и добавляется к шифру. */
  const createTag = async (name: string) => {
    if (creating) return;
    setCreating(true);
    setNotice(null);
    try {
      const tag = await tagsApi.create({ name, color: newColor, parentIds: [] });
      await reload();
      clearQuery();
      setOpen(false);
      setPaletteOpen(false);
      setNewColor(DEFAULT_TAG_COLOR);
      onChange([...value, tag.id]);
    } catch (err) {
      // Тег с таким названием успели создать в другой вкладке — используем его.
      const existing = err instanceof ApiError ? err.body?.existingTag : undefined;
      if (existing) {
        await reload();
        addExisting(existing);
      } else {
        setNotice(errorMessage(err));
      }
    } finally {
      setCreating(false);
    }
  };

  /** Подтверждение введённого текста: существующий тег требует согласия, новый создаётся. */
  const confirmTyped = () => {
    if (!text) return;
    if (exactMatch && !value.includes(exactMatch.id)) {
      setDuplicate(exactMatch);
      setOpen(true);
      return;
    }
    if (exactMatch) addExisting(exactMatch);
    else void createTag(text);
  };

  const activate = (row: SuggestionRow) => {
    if (row.type === 'create') confirmTyped();
    else if (!row.selected) addExisting(row.tag);
  };

  const drillInto = (tag: TagDTO) => {
    // Из результатов поиска переходим по основному пути тега, из дерева — на уровень глубже.
    const trail = text ? index.pathOf(tag.id).slice(0, -1) : browseTrail;
    setBrowsePath([...trail.map((ancestor) => ancestor.id), tag.id]);
    clearQuery();
    setOpen(true);
    inputRef.current?.focus();
  };

  const goUp = () => {
    setBrowsePath(browseTrail.slice(0, -1).map((tag) => tag.id));
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
    if (conflict) {
      // Пока открыто предупреждение, выбор делается только кнопками.
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setConflict(null);
      } else if (event.key === 'Enter' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
      }
      return;
    }
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
        // Системное окно выбора цвета уводит фокус из страницы — это не повод закрывать список.
        if (!event.currentTarget.contains(event.relatedTarget) && document.hasFocus()) {
          setOpen(false);
          setDuplicate(null);
          setConflict(null);
          setPaletteOpen(false);
        }
      }}
    >
      <div className="tag-input__control">
        <div className="tag-input__box" onClick={() => inputRef.current?.focus()}>
          {value.map((tagId, i) => {
            const tag = index.byId.get(tagId);
            if (!tag) return null;
            const side = drag.dropSide(i);
            return (
              <span
                key={tagId}
                className={`tag-input__item${side ? ` drop-${side}` : ''}${drag.draggingIndex === i ? ' is-dragging' : ''}`}
                {...drag.itemProps(i)}
              >
                <TagChip name={tag.name} color={tag.color} onRemove={() => onChange(value.filter((_, j) => j !== i))} />
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
              setConflict(null);
              setNotice(null);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={handleKeyDown}
          />
        </div>

        {conflict ? (
          <TagConflictNotice
            conflict={conflict}
            index={index}
            onRemoveRelated={() => resolveConflict(true)}
            onKeepAll={() => resolveConflict(false)}
            onCancel={() => setConflict(null)}
          />
        ) : (
          open && (
            <TagSuggestions
              listId={listId}
              index={index}
              rows={rows}
              activeIndex={activeIndex}
              searching={Boolean(text)}
              browseLabel={text || !browseTag ? null : browseTrail.map((tag) => tag.name).join(' → ')}
              duplicate={duplicate}
              newColor={newColor}
              paletteOpen={paletteOpen}
              onHover={setActiveIndex}
              onActivate={activate}
              onDrill={drillInto}
              onBack={goUp}
              onUseDuplicate={() => duplicate && addExisting(duplicate)}
              onCancelDuplicate={() => setDuplicate(null)}
              onTogglePalette={() => setPaletteOpen((current) => !current)}
              onColorChange={setNewColor}
            />
          )
        )}
      </div>

      {notice && <p className="field-hint">{notice}</p>}
      {value.length > 1 && !notice && <p className="field-hint">Порядок тегов можно менять перетаскиванием.</p>}
    </div>
  );
}
