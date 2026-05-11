"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import type { CreateHubPromotionInput, HubMenuSection, HubPromotion } from "@hull-eats/types";

type Props = {
  apiBaseUrl: string;
  token: string;
  hubId: string;
  menuSections: HubMenuSection[];
  onNotice: (message: string) => void;
};

function localYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function ymdAddDays(ymd: string, delta: number): string {
  const parts = ymd.split("-");
  const y = Number(parts[0]);
  const mo = Number(parts[1]);
  const da = Number(parts[2]);
  if (!Number.isFinite(y) || !Number.isFinite(mo) || !Number.isFinite(da)) return ymd;
  const d = new Date(y, mo - 1, da);
  d.setDate(d.getDate() + delta);
  return localYmd(d);
}

function expandInclusiveRange(a: string, b: string): string[] {
  const sorted = [a, b].sort((x, y) => x.localeCompare(y));
  const start = sorted[0]!;
  const end = sorted[1]!;
  const out: string[] = [];
  let cur: string = start;
  while (true) {
    out.push(cur);
    if (cur === end) break;
    cur = ymdAddDays(cur, 1);
    if (out.length > 400) break;
  }
  return out;
}

function monthMatrix(year: number, monthIndex: number): (string | null)[][] {
  const first = new Date(year, monthIndex, 1);
  const startWeekday = first.getDay();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(localYmd(new Date(year, monthIndex, d)));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  const rows: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
  return rows;
}

const presetPercents = [5, 10, 15, 20, 25, 33, 50];

const shell: React.CSSProperties = {
  display: "grid",
  gap: 10,
  alignContent: "start",
  borderRadius: 24,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
  padding: 18,
  boxShadow: "0 18px 34px rgba(15, 17, 21, 0.06)",
  minHeight: 260,
};

const eyebrow: React.CSSProperties = {
  margin: 0,
  color: "#9b4a12",
  fontSize: 12,
  fontWeight: 800,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
};

const title: React.CSSProperties = {
  margin: "8px 0 0",
  fontSize: "clamp(1.4rem, 2.2vw, 2rem)",
  fontFamily: "Georgia, serif",
};

const copy: React.CSSProperties = {
  margin: "10px 0 0",
  color: "#596271",
  lineHeight: 1.65,
  maxWidth: 900,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr) minmax(280px, 360px)",
  gap: 20,
  marginTop: 16,
  alignItems: "start",
};

const btn: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(15,17,21,0.14)",
  background: "#f4f6f9",
  padding: "8px 12px",
  fontWeight: 700,
  cursor: "pointer",
};

const btnActive: React.CSSProperties = {
  ...btn,
  background: "#101216",
  color: "#fff",
  borderColor: "#101216",
};

const primaryBtn: React.CSSProperties = {
  ...btn,
  background: "linear-gradient(180deg, #f4a020, #e07810)",
  borderColor: "rgba(0,0,0,0.08)",
  color: "#101216",
};

const field: React.CSSProperties = { display: "grid", gap: 6 };
const label: React.CSSProperties = { fontSize: 13, fontWeight: 800, color: "#101216" };
const input: React.CSSProperties = {
  borderRadius: 12,
  border: "1px solid rgba(15,17,21,0.14)",
  padding: "10px 12px",
  fontSize: 15,
};

const listCard: React.CSSProperties = {
  borderRadius: 14,
  border: "1px solid rgba(15,17,21,0.08)",
  padding: 12,
  display: "grid",
  gap: 6,
  cursor: "pointer",
  textAlign: "left" as const,
  background: "#fafbfc",
};

const listCardActive: React.CSSProperties = {
  ...listCard,
  borderColor: "#e07810",
  boxShadow: "0 0 0 1px rgba(224,120,16,0.35)",
};

function defaultForm(): CreateHubPromotionInput {
  const today = localYmd(new Date());
  return {
    title: "New offer",
    isActive: true,
    kind: "percent_off",
    scope: "whole_menu",
    percentOff: 10,
    fixedAmountOff: null,
    bundleFixedPrice: null,
    menuItemIds: [],
    categoryIds: [],
    bundleLines: null,
    validDates: [today],
    dailyStartTime: null,
    dailyEndTime: null,
  };
}

async function fetchPromotions(apiBaseUrl: string, token: string, hubId: string): Promise<HubPromotion[]> {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/promotions`, {
    cache: "no-store",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Offers list failed (${response.status})`);
  return (await response.json()) as HubPromotion[];
}

async function postPromotion(apiBaseUrl: string, token: string, hubId: string, body: CreateHubPromotionInput) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/promotions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `Create failed (${response.status})`);
  }
  return (await response.json()) as HubPromotion;
}

async function patchPromotion(
  apiBaseUrl: string,
  token: string,
  hubId: string,
  promotionId: string,
  body: CreateHubPromotionInput,
) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/promotions/${promotionId}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const t = await response.text();
    throw new Error(t || `Update failed (${response.status})`);
  }
  return (await response.json()) as HubPromotion;
}

async function deletePromotionApi(apiBaseUrl: string, token: string, hubId: string, promotionId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/merchant/hubs/${hubId}/promotions/${promotionId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error(`Delete failed (${response.status})`);
}

export function HubOffersWorkbench({ apiBaseUrl, token, hubId, menuSections, onNotice }: Props) {
  const [promotions, setPromotions] = useState<HubPromotion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<CreateHubPromotionInput>(() => defaultForm());
  const [calendarIntent, setCalendarIntent] = useState<"preset1" | "preset7" | "preset30" | "custom" | "multi">("preset7");
  const [previewDates, setPreviewDates] = useState<string[]>(() => defaultForm().validDates);
  const [customAnchor, setCustomAnchor] = useState<string | null>(null);
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [percentMode, setPercentMode] = useState<"preset" | "custom">("preset");

  const todayYmd = useMemo(() => localYmd(new Date()), []);
  const flatItems = useMemo(
    () => menuSections.flatMap((s) => s.items.map((it) => ({ ...it, sectionName: s.name }))),
    [menuSections],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchPromotions(apiBaseUrl, token, hubId);
      setPromotions(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load offers.");
    } finally {
      setLoading(false);
    }
  }, [apiBaseUrl, hubId, token]);

  useEffect(() => {
    void load();
  }, [load]);

  const calendarRows = useMemo(
    () => monthMatrix(visibleMonth.y, visibleMonth.m),
    [visibleMonth.y, visibleMonth.m],
  );

  const monthLabel = useMemo(
    () => new Date(visibleMonth.y, visibleMonth.m, 1).toLocaleString(undefined, { month: "long", year: "numeric" }),
    [visibleMonth.y, visibleMonth.m],
  );

  const handleDayClick = (ymd: string | null) => {
    if (!ymd) return;
    if (calendarIntent === "multi") {
      setPreviewDates((prev) => (prev.includes(ymd) ? prev.filter((x) => x !== ymd) : [...prev, ymd].sort()));
      return;
    }
    if (calendarIntent === "custom") {
      if (!customAnchor) {
        setCustomAnchor(ymd);
        setPreviewDates([ymd]);
        return;
      }
      setPreviewDates(expandInclusiveRange(customAnchor, ymd));
      setCustomAnchor(null);
      return;
    }
    const n = calendarIntent === "preset1" ? 1 : calendarIntent === "preset7" ? 7 : 30;
    const days: string[] = [];
    for (let i = 0; i < n; i++) days.push(ymdAddDays(ymd, i));
    setPreviewDates(days);
  };

  const confirmPreviewDates = () => {
    const sorted = [...new Set(previewDates)].sort();
    if (!sorted.length) return;
    setForm((f) => ({ ...f, validDates: sorted }));
    onNotice(`${sorted.length} day(s) saved to this offer.`);
  };

  const applyFormFromPromotion = (p: HubPromotion) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      isActive: p.isActive,
      kind: p.kind,
      scope: p.scope,
      percentOff: p.percentOff,
      fixedAmountOff: p.fixedAmountOff,
      bundleFixedPrice: p.bundleFixedPrice,
      menuItemIds: [...p.menuItemIds],
      categoryIds: [...p.categoryIds],
      bundleLines: p.bundleLines ? [...p.bundleLines] : null,
      validDates: [...p.validDates],
      dailyStartTime: p.dailyStartTime,
      dailyEndTime: p.dailyEndTime,
    });
    setPreviewDates([...p.validDates]);
    setPercentMode(p.percentOff != null && !presetPercents.includes(p.percentOff) ? "custom" : "preset");
  };

  const startNew = () => {
    setEditingId(null);
    const d = defaultForm();
    setForm(d);
    setPreviewDates(d.validDates);
    setCustomAnchor(null);
    setPercentMode("preset");
  };

  const toggleItem = (id: string) => {
    setForm((f) => {
      const has = f.menuItemIds.includes(id);
      return { ...f, menuItemIds: has ? f.menuItemIds.filter((x) => x !== id) : [...f.menuItemIds, id] };
    });
  };

  const toggleCategory = (id: string) => {
    setForm((f) => {
      const has = f.categoryIds.includes(id);
      return { ...f, categoryIds: has ? f.categoryIds.filter((x) => x !== id) : [...f.categoryIds, id] };
    });
  };

  const addBundleLine = () => {
    const first = flatItems[0]?.id;
    if (!first) return;
    setForm((f) => ({
      ...f,
      kind: "bundle_fixed_price",
      bundleLines: [...(f.bundleLines ?? []), { menuItemId: first, quantity: 1 }],
    }));
  };

  const save = async () => {
    setError("");
    try {
      if (editingId) {
        await patchPromotion(apiBaseUrl, token, hubId, editingId, form);
        onNotice("Offer updated.");
      } else {
        const created = await postPromotion(apiBaseUrl, token, hubId, form);
        setEditingId(created.id);
        onNotice("Offer created.");
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed.");
    }
  };

  const remove = async () => {
    if (!editingId) return;
    if (!window.confirm("Delete this offer?")) return;
    setError("");
    try {
      await deletePromotionApi(apiBaseUrl, token, hubId, editingId);
      onNotice("Offer deleted.");
      startNew();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed.");
    }
  };

  const kindLabel: Record<CreateHubPromotionInput["kind"], string> = {
    bogo_item: "Buy one get one free (selected items)",
    percent_off: "Percentage off",
    fixed_amount_item: "Fixed amount off per item (£)",
    bundle_fixed_price: "Bundle / meal deal (fixed bundle price)",
  };

  return (
    <section style={shell}>
      <p style={eyebrow}>Offers &amp; deals</p>
      <h2 style={title}>Run promos on your menu</h2>
      <p style={copy}>
        Choose the mechanic, what it applies to, and when it runs. Dates are all-day unless you add a daily time window.
        Use the quick ranges (1 / 7 / 30 days), a custom from–to range, or pick individual days — then confirm into this
        offer.
      </p>

      {error ? (
        <p style={{ margin: 0, color: "#b42318", fontWeight: 700 }}>
          {error}
        </p>
      ) : null}

      <div
        style={{
          ...grid2,
          gridTemplateColumns: "minmax(0, 1.1fr) minmax(260px, 340px)",
        }}
      >
        <div style={{ display: "grid", gap: 14 }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <button type="button" style={primaryBtn} onClick={startNew}>
              New offer
            </button>
            <button type="button" style={primaryBtn} onClick={() => void save()}>
              {editingId ? "Save changes" : "Create offer"}
            </button>
            {editingId ? (
              <button type="button" style={btn} onClick={() => void remove()}>
                Delete
              </button>
            ) : null}
          </div>

          <div style={field}>
            <label style={label} htmlFor="offer-title">
              Offer name (internal)
            </label>
            <input
              id="offer-title"
              style={input}
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            />
          </div>

          <div style={field}>
            <span style={label}>Mechanic</span>
            <select
              style={input}
              value={form.kind}
              onChange={(e) => {
                const kind = e.target.value as CreateHubPromotionInput["kind"];
                setForm((f) => ({
                  ...f,
                  kind,
                  scope:
                    kind === "bogo_item" || kind === "bundle_fixed_price"
                      ? "items"
                      : kind === "percent_off" || kind === "fixed_amount_item"
                        ? "whole_menu"
                        : f.scope,
                  menuItemIds: kind === "percent_off" || kind === "fixed_amount_item" ? [] : f.menuItemIds,
                  categoryIds: kind === "percent_off" || kind === "fixed_amount_item" ? [] : f.categoryIds,
                  bundleLines:
                    kind === "bundle_fixed_price"
                      ? f.bundleLines && f.bundleLines.length > 0
                        ? f.bundleLines
                        : flatItems[0]
                          ? [{ menuItemId: flatItems[0].id, quantity: 1 }]
                          : []
                      : null,
                }));
              }}
            >
              {(Object.keys(kindLabel) as CreateHubPromotionInput["kind"][]).map((k) => (
                <option key={k} value={k}>
                  {kindLabel[k]}
                </option>
              ))}
            </select>
          </div>

          {(form.kind === "percent_off" || form.kind === "fixed_amount_item") && (
            <div style={field}>
              <span style={label}>Applies to</span>
              <select
                style={input}
                value={form.scope}
                onChange={(e) => setForm((f) => ({ ...f, scope: e.target.value as CreateHubPromotionInput["scope"] }))}
              >
                <option value="whole_menu">Whole menu</option>
                <option value="categories">Selected categories</option>
                <option value="items">Selected items</option>
              </select>
            </div>
          )}

          {form.kind === "percent_off" && (
            <div style={{ display: "grid", gap: 10 }}>
              <span style={label}>% off</span>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button type="button" style={percentMode === "preset" ? btnActive : btn} onClick={() => setPercentMode("preset")}>
                  Preset %
                </button>
                <button type="button" style={percentMode === "custom" ? btnActive : btn} onClick={() => setPercentMode("custom")}>
                  Custom %
                </button>
              </div>
              {percentMode === "preset" ? (
                <select
                  style={input}
                  value={form.percentOff ?? 10}
                  onChange={(e) => setForm((f) => ({ ...f, percentOff: Number(e.target.value) }))}
                >
                  {presetPercents.map((n) => (
                    <option key={n} value={n}>
                      {n}% off
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  style={input}
                  value={form.percentOff ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      percentOff: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              )}
            </div>
          )}

          {form.kind === "fixed_amount_item" && (
            <div style={field}>
              <label style={label} htmlFor="fixed-off">
                £ off each qualifying line item
              </label>
              <input
                id="fixed-off"
                type="number"
                min={0}
                step={0.01}
                style={input}
                value={form.fixedAmountOff ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    fixedAmountOff: e.target.value === "" ? null : Number(e.target.value),
                  }))
                }
              />
            </div>
          )}

          {form.kind === "bundle_fixed_price" && (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={field}>
                <label style={label} htmlFor="bundle-price">
                  Bundle price (£)
                </label>
                <input
                  id="bundle-price"
                  type="number"
                  min={0}
                  step={0.01}
                  style={input}
                  value={form.bundleFixedPrice ?? ""}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      bundleFixedPrice: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                />
              </div>
              <div style={{ display: "grid", gap: 8 }}>
                <span style={label}>Items in bundle</span>
                {(form.bundleLines ?? []).map((line, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                    <select
                      style={{ ...input, flex: "1 1 200px" }}
                      value={line.menuItemId}
                      onChange={(e) =>
                        setForm((f) => {
                          const lines = [...(f.bundleLines ?? [])];
                          lines[idx] = { ...lines[idx]!, menuItemId: e.target.value };
                          return { ...f, bundleLines: lines };
                        })
                      }
                    >
                      {flatItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.sectionName}: {it.name}
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      min={1}
                      style={{ ...input, width: 72 }}
                      value={line.quantity}
                      onChange={(e) =>
                        setForm((f) => {
                          const lines = [...(f.bundleLines ?? [])];
                          lines[idx] = { ...lines[idx]!, quantity: Math.max(1, Number(e.target.value) || 1) };
                          return { ...f, bundleLines: lines };
                        })
                      }
                    />
                    <button
                      type="button"
                      style={btn}
                      onClick={() =>
                        setForm((f) => ({
                          ...f,
                          bundleLines: (f.bundleLines ?? []).filter((_, j) => j !== idx),
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>
                ))}
                <button type="button" style={btn} onClick={addBundleLine}>
                  Add item to bundle
                </button>
              </div>
            </div>
          )}

          {(form.kind === "bogo_item" || (form.kind !== "bundle_fixed_price" && form.scope === "items")) && (
            <div style={{ display: "grid", gap: 8 }}>
              <span style={label}>Pick menu items</span>
              <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid rgba(15,17,21,0.1)", borderRadius: 12, padding: 8 }}>
                {menuSections.map((sec) => (
                  <div key={sec.id} style={{ marginBottom: 10 }}>
                    <div style={{ fontWeight: 800, fontSize: 13, marginBottom: 6 }}>{sec.name}</div>
                    {sec.items.map((it) => (
                      <label key={it.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14, marginBottom: 4 }}>
                        <input type="checkbox" checked={form.menuItemIds.includes(it.id)} onChange={() => toggleItem(it.id)} />
                        {it.name}
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {form.kind !== "bundle_fixed_price" && form.scope === "categories" && (
            <div style={{ display: "grid", gap: 8 }}>
              <span style={label}>Pick categories</span>
              {menuSections.map((sec) => (
                <label key={sec.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
                  <input type="checkbox" checked={form.categoryIds.includes(sec.id)} onChange={() => toggleCategory(sec.id)} />
                  {sec.name}
                </label>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 14 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
              />
              Offer is active
            </label>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <span style={label}>Optional daily time window (leave empty for all day)</span>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <input
                type="time"
                style={input}
                value={form.dailyStartTime ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dailyStartTime: e.target.value ? e.target.value.slice(0, 5) : null,
                  }))
                }
              />
              <span style={{ alignSelf: "center" }}>to</span>
              <input
                type="time"
                style={input}
                value={form.dailyEndTime ?? ""}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    dailyEndTime: e.target.value ? e.target.value.slice(0, 5) : null,
                  }))
                }
              />
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gap: 12 }}>
          <div>
            <span style={label}>Calendar</span>
            <p style={{ ...copy, fontSize: 13, marginTop: 4 }}>
              Today is outlined. Choose how clicks work, tap a day, then <strong>Confirm dates into offer</strong>.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {(
                [
                  ["preset1", "1 day"],
                  ["preset7", "7 days"],
                  ["preset30", "30 days"],
                  ["custom", "Custom range"],
                  ["multi", "Multiple days"],
                ] as const
              ).map(([key, lab]) => (
                <button key={key} type="button" style={calendarIntent === key ? btnActive : btn} onClick={() => setCalendarIntent(key)}>
                  {lab}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
            <button type="button" style={btn} onClick={() => setVisibleMonth((v) => ({ y: v.m === 0 ? v.y - 1 : v.y, m: v.m === 0 ? 11 : v.m - 1 }))}>
              ←
            </button>
            <strong>{monthLabel}</strong>
            <button type="button" style={btn} onClick={() => setVisibleMonth((v) => ({ y: v.m === 11 ? v.y + 1 : v.y, m: v.m === 11 ? 0 : v.m + 1 }))}>
              →
            </button>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, fontSize: 11, fontWeight: 800, color: "#596271" }}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <span key={d} style={{ textAlign: "center" }}>
                {d}
              </span>
            ))}
          </div>

          {calendarRows.map((week, wi) => (
            <div key={wi} style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4 }}>
              {week.map((ymd, di) => {
                const inPreview = ymd && previewDates.includes(ymd);
                const isToday = ymd === todayYmd;
                return (
                  <button
                    key={di}
                    type="button"
                    disabled={!ymd}
                    onClick={() => handleDayClick(ymd)}
                    style={{
                      minHeight: 36,
                      borderRadius: 10,
                      border: isToday ? "2px solid #e07810" : "1px solid rgba(15,17,21,0.1)",
                      background: inPreview ? "rgba(224,120,16,0.25)" : "#fff",
                      cursor: ymd ? "pointer" : "default",
                      opacity: ymd ? 1 : 0,
                      fontWeight: 700,
                      fontSize: 13,
                    }}
                  >
                    {ymd ? Number(ymd.slice(8)) : ""}
                  </button>
                );
              })}
            </div>
          ))}

          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            <button type="button" style={primaryBtn} onClick={confirmPreviewDates}>
              Confirm dates into offer
            </button>
            <span style={{ fontSize: 13, color: "#596271", alignSelf: "center" }}>
              Preview: {previewDates.length ? previewDates.join(", ") : "—"}
            </span>
          </div>

          <div>
            <span style={label}>Saved on this offer</span>
            <p style={{ fontSize: 13, color: "#596271", margin: "4px 0 0" }}>{form.validDates.join(", ")}</p>
          </div>
        </div>
      </div>

      <div style={{ marginTop: 22 }}>
        <span style={label}>{loading ? "Loading offers…" : "Your offers"}</span>
        <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
          {promotions.map((p) => (
            <button
              key={p.id}
              type="button"
              style={editingId === p.id ? listCardActive : listCard}
              onClick={() => applyFormFromPromotion(p)}
            >
              <strong>{p.title}</strong>
              <span style={{ fontSize: 13, color: "#596271" }}>
                {kindLabel[p.kind]} · {p.validDates.length} day(s)
                {!p.isActive ? " · paused" : ""}
              </span>
            </button>
          ))}
          {!loading && promotions.length === 0 ? <div style={{ fontSize: 14, color: "#596271" }}>No offers yet — create one above.</div> : null}
        </div>
      </div>
    </section>
  );
}
