import type { CSSProperties } from 'react';

// Цвет тега показывается текстом, тонкой рамкой и лёгкой подложкой.
// Контраст текста проверяется по WCAG и при необходимости цвет осветляется.

type Rgb = readonly [number, number, number];

/** Самая светлая поверхность, на которой встречаются теги (--bg-input). */
const SURFACE: Rgb = [0x1f, 0x20, 0x25];
const WHITE: Rgb = [255, 255, 255];
const DARK_TEXT = '#131417';
const LIGHT_TEXT = '#ffffff';
const MIN_CONTRAST = 4.5;
const BACKGROUND_ALPHA = 0.14;
const BORDER_ALPHA = 0.38;

function parseHex(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`;
}

function mix(from: Rgb, to: Rgb, amount: number): Rgb {
  const channel = (i: 0 | 1 | 2) => from[i] + (to[i] - from[i]) * amount;
  return [channel(0), channel(1), channel(2)];
}

function luminance(rgb: Rgb): number {
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: Rgb, b: Rgb): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

const rgba = (rgb: Rgb, alpha: number) => `rgba(${rgb.join(', ')}, ${alpha})`;

/** Цвет текста тега: исходный цвет, осветлённый ровно настолько, чтобы читаться на тёмном фоне. */
function readableOnDark(color: Rgb): Rgb {
  const background = mix(SURFACE, color, BACKGROUND_ALPHA);
  let text = color;
  for (let step = 1; contrast(text, background) < MIN_CONTRAST && step <= 10; step++) {
    text = mix(color, WHITE, step / 10);
  }
  return text;
}

const cache = new Map<string, CSSProperties>();

/** CSS-переменные для отображения тега. Используются в .tag-chip. */
export function tagColorVars(hex: string): CSSProperties {
  const cached = cache.get(hex);
  if (cached) return cached;

  const color = parseHex(hex);
  const onSolid = contrast(color, parseHex(DARK_TEXT)) >= contrast(color, WHITE) ? DARK_TEXT : LIGHT_TEXT;
  const vars = {
    '--tag-text': toHex(readableOnDark(color)),
    '--tag-bg': rgba(color, BACKGROUND_ALPHA),
    '--tag-border': rgba(color, BORDER_ALPHA),
    '--tag-solid': hex,
    '--tag-on-solid': onSolid,
  } as CSSProperties;
  cache.set(hex, vars);
  return vars;
}
