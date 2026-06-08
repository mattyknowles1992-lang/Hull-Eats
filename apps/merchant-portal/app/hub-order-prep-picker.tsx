"use client";

import { listPrepTimeOptions } from "@hull-eats/types";

type Props = {
  value: number;
  disabled?: boolean;
  onChange: (next: number) => void;
};

const options = listPrepTimeOptions();

export function HubOrderPrepPicker({ value, disabled, onChange }: Props) {
  const current = options.includes(value) ? value : options[0] ?? 40;

  const step = (delta: number) => {
    const index = options.indexOf(current);
    const nextIndex = Math.max(0, Math.min(options.length - 1, index + delta));
    onChange(options[nextIndex] ?? current);
  };

  return (
    <div className="he-order-prep-picker">
      <span className="he-order-prep-picker__label">Prep time</span>
      <div className="he-order-prep-picker__controls">
        <button type="button" className="he-order-prep-picker__step" disabled={disabled || current <= options[0]!} onClick={() => step(-1)}>
          −
        </button>
        <select
          className="he-order-prep-picker__select"
          disabled={disabled}
          value={current}
          onChange={(event) => onChange(Number(event.target.value))}
        >
          {options.map((minutes) => (
            <option key={minutes} value={minutes}>
              {minutes} min
            </option>
          ))}
        </select>
        <button
          type="button"
          className="he-order-prep-picker__step"
          disabled={disabled || current >= options.at(-1)!}
          onClick={() => step(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}
