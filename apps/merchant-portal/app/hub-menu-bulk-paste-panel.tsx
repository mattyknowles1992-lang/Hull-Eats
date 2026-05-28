"use client";

import { useState } from "react";

import { parseBulkMenuPasteLines, type BulkPasteRow } from "./menu-studio-core";

type Props = {
  readOnly?: boolean;
  placeholder?: string;
  onApply: (rows: BulkPasteRow[]) => void;
};

export function HubMenuBulkPastePanel({
  readOnly = false,
  placeholder = "Paste one product per line — e.g.\nMargherita £7.65\nGarlic bread 4.50\n6 Wings 5.99",
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [notice, setNotice] = useState("");

  const handleApply = () => {
    const rows = parseBulkMenuPasteLines(text);
    if (rows.length === 0) {
      setNotice("Could not read any lines — try one name (and optional price) per line.");
      return;
    }
    onApply(rows);
    setText("");
    setNotice(`Added ${rows.length} row${rows.length === 1 ? "" : "s"}.`);
  };

  if (readOnly) {
    return null;
  }

  return (
    <details
      className="hub-menu-bulk-paste"
      open={open}
      onToggle={(event) => setOpen((event.target as HTMLDetailsElement).open)}
    >
      <summary className="hub-menu-bulk-paste__summary">Bulk paste lines</summary>
      <div className="hub-menu-bulk-paste__body">
        <p className="hub-menu-bulk-paste__hint">
          Paste from Just Eat, Uber Eats, or a spreadsheet — one item per line. Prices at the end of the line are picked up
          automatically; names-only is fine too.
        </p>
        <textarea
          className="hub-menu-bulk-paste__textarea"
          value={text}
          placeholder={placeholder}
          rows={6}
          onChange={(event) => {
            setText(event.target.value);
            setNotice("");
          }}
        />
        <div className="hub-menu-bulk-paste__actions">
          <button type="button" className="hub-menu-order-builder__primary-btn" onClick={handleApply}>
            Split into rows
          </button>
          {notice ? <span className="hub-menu-bulk-paste__notice">{notice}</span> : null}
        </div>
      </div>
    </details>
  );
}
