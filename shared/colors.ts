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
