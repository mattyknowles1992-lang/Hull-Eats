"use client";

import type { CSSProperties } from "react";

import type { HubMenuBoardKind, HubMenuBoardPublishMode, HubMenuBoardRecord } from "./menu-studio-core";

type Props = {
  boards: HubMenuBoardRecord[];
  editingBoardId: string | null;
  readOnly: boolean;
  onSelectMain: () => void;
  onSelectBoard: (boardId: string) => void;
  onCreateBoard: (kind: HubMenuBoardKind) => void;
  onUpdateBoardPublishMode: (boardId: string, mode: HubMenuBoardPublishMode) => void;
  onRenameBoard: (boardId: string, name: string) => void;
};

export function HubMenuBoardsBar({
  boards,
  editingBoardId,
  readOnly,
  onSelectMain,
  onSelectBoard,
  onCreateBoard,
  onUpdateBoardPublishMode,
  onRenameBoard,
}: Props) {
  const editingBoard = boards.find((board) => board.id === editingBoardId) ?? null;

  return (
    <section className="hub-menu-boards-bar">
      <div style={headerRow}>
        <div>
          <p style={eyebrow}>Menus</p>
          <strong style={title}>{editingBoard ? editingBoard.name : "Main menu"}</strong>
          <p style={copy}>
            {editingBoard
              ? "You are editing a draft menu. Choose how it goes live when you publish."
              : "Your everyday customer menu. Create seasonal or alternative menus without losing the main one."}
          </p>
        </div>
        {readOnly ? null : (
          <div className="he-btn-row" style={createRow}>
            <button type="button" style={secondaryBtn} onClick={() => onCreateBoard("standard")}>
              + New menu
            </button>
            <button type="button" style={secondaryBtn} onClick={() => onCreateBoard("seasonal")}>
              + Seasonal
            </button>
            <button type="button" style={secondaryBtn} onClick={() => onCreateBoard("alternative")}>
              + Alternative
            </button>
          </div>
        )}
      </div>

      <div style={switcherRow}>
        <button
          type="button"
          style={editingBoardId === null ? switchBtnActive : switchBtn}
          onClick={onSelectMain}
        >
          Main menu
        </button>
        {boards.map((board) => (
          <button
            key={board.id}
            type="button"
            style={editingBoardId === board.id ? switchBtnActive : switchBtn}
            onClick={() => onSelectBoard(board.id)}
          >
            {board.name}
            <span style={switchMeta}>{board.kind === "seasonal" ? "Seasonal" : board.kind === "alternative" ? "Alt" : "Draft"}</span>
          </button>
        ))}
      </div>

      {editingBoard && !readOnly ? (
        <div style={publishModeRow}>
          <label style={modeField}>
            <span style={modeLabel}>When published, this menu should</span>
            <select
              style={modeSelect}
              value={editingBoard.publishMode}
              onChange={(e) => onUpdateBoardPublishMode(editingBoard.id, e.target.value as HubMenuBoardPublishMode)}
            >
              <option value="addon">Add to existing menu (new categories)</option>
              <option value="replace">Replace the current live menu</option>
            </select>
          </label>
          <label style={modeField}>
            <span style={modeLabel}>Menu label</span>
            <input
              style={modeSelect}
              value={editingBoard.name}
              onChange={(e) => onRenameBoard(editingBoard.id, e.target.value)}
            />
          </label>
        </div>
      ) : null}
    </section>
  );
}

const eyebrow: CSSProperties = {
  margin: 0,
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#0680a6",
};
const title: CSSProperties = { fontSize: "1.05rem" };
const copy: CSSProperties = { margin: "4px 0 0", fontSize: "0.86rem", lineHeight: 1.45, color: "rgba(15, 17, 21, 0.72)" };
const headerRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, justifyContent: "space-between", alignItems: "flex-start" };
const createRow: CSSProperties = { flexWrap: "wrap" };
const switcherRow: CSSProperties = { display: "flex", flexWrap: "wrap", gap: 8 };
const switchBtn: CSSProperties = {
  minHeight: 40,
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.12)",
  background: "#fff",
  fontWeight: 700,
  fontSize: "0.86rem",
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};
const switchBtnActive: CSSProperties = {
  ...switchBtn,
  borderColor: "rgba(7, 155, 200, 0.45)",
  background: "var(--he-blue-wash)",
};
const switchMeta: CSSProperties = { fontSize: "0.72rem", fontWeight: 700, color: "rgba(15, 17, 21, 0.5)" };
const publishModeRow: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1.4fr) minmax(0, 1fr)",
  gap: 12,
  alignItems: "end",
};
const modeField: CSSProperties = { display: "grid", gap: 6, minWidth: 0 };
const modeLabel: CSSProperties = { fontSize: "0.78rem", fontWeight: 700, color: "rgba(15, 17, 21, 0.6)" };
const modeSelect: CSSProperties = {
  minHeight: 44,
  padding: "10px 12px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.15)",
  font: "inherit",
  width: "100%",
  boxSizing: "border-box",
};
const secondaryBtn: CSSProperties = {
  minHeight: 40,
  padding: "0 14px",
  borderRadius: 10,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  fontWeight: 700,
  fontSize: "0.86rem",
  cursor: "pointer",
};
