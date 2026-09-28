// Правила названий тегов: «еда», «ЕДА» и « Еда » — это один и тот же тег «Еда».

/** Убирает крайние пробелы и схлопывает повторяющиеся внутри. */
export function cleanTagName(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/** Ключ для сравнения и уникальности (Tag.normalizedName). */
export function normalizeTagName(raw: string): string {
  return cleanTagName(raw).toLowerCase();
}

/** Название для хранения и отображения: первая буква заглавная, остальные строчные. */
export function formatTagName(raw: string): string {
  const normalized = normalizeTagName(raw);
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
