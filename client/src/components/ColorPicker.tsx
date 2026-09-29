import type { CSSProperties } from 'react';
import { TAG_PALETTE } from '../../../shared/colors';
import { useTags } from '../context/TagsContext';
import { Icon } from './Icon';
import './ColorPicker.css';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
}

const swatchStyle = (color: string) => ({ '--swatch': color }) as CSSProperties;

/**
 * 8 базовых цветов, свои цвета, которыми сейчас окрашен хоть один тег,
 * и произвольный через системную палитру.
 */
export function ColorPicker({ value, onChange }: ColorPickerProps) {
  const { index } = useTags();
  const current = value.toLowerCase();
  const swatches = [
    ...TAG_PALETTE,
    ...index.customColors.map((color) => ({ name: `Свой цвет ${color}`, value: color })),
  ];
  const isCustom = !swatches.some((color) => color.value === current);

  return (
    <div className="color-picker" role="radiogroup" aria-label="Цвет тега">
      {swatches.map((color) => (
        <button
          key={color.value}
          type="button"
          role="radio"
          aria-checked={color.value === current}
          aria-label={color.name}
          title={color.name}
          className="swatch"
          style={swatchStyle(color.value)}
          onClick={() => onChange(color.value)}
        />
      ))}
      <span
        className={`swatch swatch--custom${isCustom ? ' is-custom' : ''}`}
        style={isCustom ? swatchStyle(current) : undefined}
        aria-checked={isCustom}
        role="radio"
      >
        {!isCustom && <Icon name="plus" size={12} />}
        <input
          type="color"
          name="color"
          className="swatch__native"
          value={current}
          aria-label="Свой цвет"
          onChange={(event) => onChange(event.target.value)}
        />
      </span>
    </div>
  );
}
