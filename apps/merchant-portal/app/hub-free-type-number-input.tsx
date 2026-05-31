"use client";

import { useEffect, useState, type InputHTMLAttributes } from "react";

type BaseProps = Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type" | "inputMode"> & {
  min?: number;
  max?: number;
  integer?: boolean;
  invalidClassName?: string;
};

type RequiredValueProps = BaseProps & {
  value: number;
  onCommit: (value: number) => void;
  nullable?: false;
};

type NullableValueProps = BaseProps & {
  value: number | null;
  onCommit: (value: number | null) => void;
  nullable: true;
};

export type HubFreeTypeNumberInputProps = RequiredValueProps | NullableValueProps;

function formatCommittedValue(value: number, integer: boolean): string {
  if (integer) {
    return String(Math.round(value));
  }
  return String(value);
}

function parseDraft(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "-" || trimmed === "." || trimmed === "-.") {
    return null;
  }
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
}

function clampValue(value: number, min?: number, max?: number, integer = false): number {
  let next = value;
  if (integer) {
    next = Math.round(next);
  }
  if (min != null) {
    next = Math.max(min, next);
  }
  if (max != null) {
    next = Math.min(max, next);
  }
  if (!integer) {
    next = Number(next.toFixed(2));
  }
  return next;
}

export function HubFreeTypeNumberInput(props: HubFreeTypeNumberInputProps) {
  const {
    value,
    onCommit,
    min,
    max,
    integer = false,
    nullable = false,
    invalidClassName = "hub-free-type-number-input--invalid",
    className,
    disabled,
    onBlur,
    onFocus,
    ...rest
  } = props;

  const displayValue = value == null ? "" : formatCommittedValue(value, integer);
  const [draft, setDraft] = useState(displayValue);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) {
      setDraft(displayValue);
    }
  }, [displayValue, focused]);

  const parsed = parseDraft(draft);
  const isInvalid = draft.trim() !== "" && parsed === null;

  const commit = () => {
    const next = parseDraft(draft);
    if (next === null) {
      if (nullable) {
        (onCommit as (value: number | null) => void)(null);
        setDraft("");
        return;
      }
      setDraft(displayValue);
      return;
    }

    const clamped = clampValue(next, min, max, integer);
    (onCommit as (value: number) => void)(clamped);
    setDraft(formatCommittedValue(clamped, integer));
  };

  return (
    <input
      {...rest}
      type="text"
      inputMode={integer ? "numeric" : "decimal"}
      disabled={disabled}
      className={[className, isInvalid ? invalidClassName : ""].filter(Boolean).join(" ")}
      value={draft}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={(event) => {
        setFocused(false);
        commit();
        onBlur?.(event);
      }}
    />
  );
}
