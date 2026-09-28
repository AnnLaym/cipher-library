import { useState, type DragEvent } from 'react';

/** Перемещает элемент from так, чтобы он оказался перед позицией insertAt (0..length). */
export function moveItem<T>(items: readonly T[], from: number, insertAt: number): T[] {
  const target = insertAt > from ? insertAt - 1 : insertAt;
  if (target === from) return [...items];
  const next = [...items];
  const [moved] = next.splice(from, 1);
  next.splice(target, 0, moved);
  return next;
}

/** Drag-and-drop для горизонтального ряда элементов (нативный HTML5 DnD). */
export function useDragReorder<T>(items: readonly T[], onReorder: (next: T[]) => void) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const reset = () => {
    setDragIndex(null);
    setInsertAt(null);
  };

  const itemProps = (index: number) => ({
    draggable: true,
    onDragStart: (event: DragEvent<HTMLElement>) => {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', String(index));
      setDragIndex(index);
    },
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (dragIndex === null) return;
      event.preventDefault();
      const rect = event.currentTarget.getBoundingClientRect();
      setInsertAt(event.clientX > rect.left + rect.width / 2 ? index + 1 : index);
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault();
      if (dragIndex !== null && insertAt !== null) onReorder(moveItem(items, dragIndex, insertAt));
      reset();
    },
    onDragEnd: reset,
  });

  /** 'before' | 'after' — где показать линию вставки у элемента index. */
  const dropSide = (index: number): 'before' | 'after' | null => {
    if (dragIndex === null || insertAt === null) return null;
    if (insertAt === dragIndex || insertAt === dragIndex + 1) return null;
    if (insertAt === index) return 'before';
    if (insertAt === items.length && index === items.length - 1) return 'after';
    return null;
  };

  return { itemProps, dropSide, draggingIndex: dragIndex };
}
