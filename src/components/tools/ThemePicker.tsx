'use client';

import type { CSSProperties } from 'react';
import { MK_THEMES } from '@/content';

interface ThemePickerProps {
  name: string;
  selected: string;
  onChange: (value: string) => void;
}

export function ThemePicker({ name, selected, onChange }: ThemePickerProps) {
  return (
    <div className="mk-themes">
      {Object.keys(MK_THEMES).map((key) => {
        const theme = MK_THEMES[key];
        if (!theme) return null;
        const style = { '--mk1': theme[1], '--mk2': theme[2] } as CSSProperties;
        return (
          <label className="mk-theme" key={key}>
            <input
              type="radio"
              name={name}
              value={key}
              checked={selected === key}
              onChange={() => onChange(key)}
            />
            <span style={style}>
              <i />
              {theme[0]}
            </span>
          </label>
        );
      })}
    </div>
  );
}

