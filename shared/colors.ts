// Базовая палитра тегов: приглушённые цвета, которые хорошо читаются на тёмном фоне.

export interface PaletteColor {
  name: string;
  value: string;
}

export const TAG_PALETTE: readonly PaletteColor[] = [
  { name: 'Серый', value: '#8e929b' },
  { name: 'Синий', value: '#6e9bd8' },
  { name: 'Фиолетовый', value: '#9d86dc' },
  { name: 'Розовый', value: '#d07fae' },
  { name: 'Красный', value: '#d9756f' },
  { name: 'Оранжевый', value: '#d99a5e' },
  { name: 'Жёлтый', value: '#cdb45f' },
  { name: 'Бирюзовый', value: '#58ad9e' },
];

export const DEFAULT_TAG_COLOR = TAG_PALETTE[0].value;

const HEX_COLOR = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string): boolean {
  return HEX_COLOR.test(value);
}

const isBaseColor = (color: string) => TAG_PALETTE.some((base) => base.value === color);

/**
 * Свои цвета, которыми сейчас окрашен хотя бы один тег (в порядке списка тегов).
 * Отдельно не хранятся: цвет пропадает из палитры, как только последний тег перекрашен или удалён.
 */
export function customColors(tagColors: readonly string[]): string[] {
  return [...new Set(tagColors.map((color) => color.toLowerCase()))].filter((color) => !isBaseColor(color));
}

/**
 * Порядковый номер каждого используемого цвета: чем больше тегов этого цвета, тем раньше он идёт.
 * При равенстве — порядок базовой палитры, свои цвета после базовых.
 */
export function rankColorsByUsage(tagColors: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const color of tagColors) {
    const key = color.toLowerCase();
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const paletteIndex = (color: string) => {
    const index = TAG_PALETTE.findIndex((base) => base.value === color);
    return index === -1 ? TAG_PALETTE.length : index;
  };
  const ordered = [...counts.keys()].sort(
    (a, b) => counts.get(b)! - counts.get(a)! || paletteIndex(a) - paletteIndex(b) || a.localeCompare(b),
  );
  return new Map(ordered.map((color, rank) => [color, rank]));
}
