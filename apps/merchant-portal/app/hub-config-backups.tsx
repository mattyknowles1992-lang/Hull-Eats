"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

import type { HubConfigSnapshot, HubMenuSection, HubSettings } from "@hull-eats/types";
import { HUB_CONFIG_SNAPSHOT_LIMIT } from "@hull-eats/types";
import { useHubPortalI18n } from "@hull-eats/i18n";

type HubConfigBackupsProps = {
  apiBaseUrl: string;
  hubId: string;
  merchantToken: string;
  hubSettings: HubSettings;
  menuSections: HubMenuSection[];
  onRestore: (workspace: { settings: HubSettings; menuSections: HubMenuSection[] }) => void;
  onNotice: (message: string) => void;
};

const card: CSSProperties = {
  display: "grid",
  gap: 14,
  padding: 18,
  borderRadius: 18,
  border: "1px solid rgba(7, 155, 200, 0.2)",
  background: "linear-gradient(180deg, rgba(35, 205, 255, 0.06), rgba(255, 255, 255, 0.98))",
};

const row: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  alignItems: "center",
  justifyContent: "space-between",
  padding: "12px 14px",
  borderRadius: 14,
  border: "1px solid rgba(15, 17, 21, 0.1)",
  background: "#fff",
};

const primaryBtn: CSSProperties = {
  minHeight: 42,
  padding: "0 16px",
  borderRadius: 12,
  border: "none",
  background: "linear-gradient(180deg, #23cdff, #079bc8)",
  color: "#fff",
  fontWeight: 800,
  cursor: "pointer",
};

const secondaryBtn: CSSProperties = {
  minHeight: 42,
  padding: "0 14px",
  borderRadius: 12,
  border: "1px solid rgba(7, 155, 200, 0.35)",
  background: "rgba(7, 155, 200, 0.08)",
  color: "#0a4d66",
  fontWeight: 800,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  minHeight: 42,
  padding: "0 12px",
  borderRadius: 12,
  border: "1px solid rgba(15, 17, 21, 0.14)",
  background: "#fff",
  flex: "1 1 180px",
};

async function readApiErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const body = (await response.json()) as { message?: string | string[] };
    if (Array.isArray(body.message)) {
      return body.message.join(", ");
    }
    if (typeof body.message === "string" && body.message.trim()) {
      return body.message;
    }
  } catch {
    // ignore parse errors
  }
  return fallback;
}

export function HubConfigBackups({
  apiBaseUrl,
  hubId,
  merchantToken,
  hubSettings,
  menuSections,
  onRestore,
  onNotice,
}: HubConfigBackupsProps) {
  const { t } = useHubPortalI18n();
  const onNoticeRef = useRef(onNotice);
  onNoticeRef.current = onNotice;

  const [snapshots, setSnapshots] = useState<HubConfigSnapshot[]>([]);
  const [backupName, setBackupName] = useState("");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadSnapshots = useCallback(async () => {
    setLoading(true);
    const base = apiBaseUrl.replace(/\/$/, "");
    const response = await fetch(`${base}/v1/merchant/hubs/${encodeURIComponent(hubId)}/config-snapshots`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    if (!response.ok) {
      const message = await readApiErrorMessage(
        response,
        `Could not load config backups (${response.status})`,
      );
      throw new Error(message);
    }
    const body = (await response.json()) as HubConfigSnapshot[];
    setSnapshots(body);
    setRenameDrafts(Object.fromEntries(body.map((entry) => [entry.id, entry.name])));
    setLoadError(null);
  }, [apiBaseUrl, hubId, merchantToken]);

  useEffect(() => {
    void loadSnapshots()
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error.message : t("errors.couldNotLoadBackups"));
        setSnapshots([]);
      })
      .finally(() => setLoading(false));
  }, [loadSnapshots, t]);

  const handleSaveBackup = async () => {
    setBusy("save");
    try {
      const base = apiBaseUrl.replace(/\/$/, "");
      const response = await fetch(`${base}/v1/merchant/hubs/${encodeURIComponent(hubId)}/config-snapshots`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${merchantToken}`,
        },
        body: JSON.stringify({
          name: backupName.trim() || undefined,
          settings: hubSettings,
          menuSections,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, `Save backup failed (${response.status})`));
      }
      setBackupName("");
      await loadSnapshots();
      onNoticeRef.current(t("settings.backupSaved"));
    } catch (error) {
      onNoticeRef.current(error instanceof Error ? error.message : t("settings.backupSaveFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    const snapshot = snapshots.find((entry) => entry.id === snapshotId);
    if (!snapshot) {
      return;
    }
    const ok = window.confirm(t("settings.restoreConfirm", { name: snapshot.name }));
    if (!ok) {
      return;
    }
    setBusy(`restore-${snapshotId}`);
    try {
      const base = apiBaseUrl.replace(/\/$/, "");
      const response = await fetch(
        `${base}/v1/merchant/hubs/${encodeURIComponent(hubId)}/config-snapshots/${encodeURIComponent(snapshotId)}/restore`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${merchantToken}` },
        },
      );
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, `Restore failed (${response.status})`));
      }
      const workspace = (await response.json()) as { settings: HubSettings; menuSections: HubMenuSection[] };
      onRestore({ settings: workspace.settings, menuSections: workspace.menuSections });
      onNoticeRef.current(t("settings.restoreSuccess", { name: snapshot.name }));
    } catch (error) {
      onNoticeRef.current(error instanceof Error ? error.message : t("settings.restoreFailed"));
    } finally {
      setBusy(null);
    }
  };

  const handleRename = async (snapshotId: string) => {
    const name = renameDrafts[snapshotId]?.trim();
    if (!name) {
      return;
    }
    setBusy(`rename-${snapshotId}`);
    try {
      const base = apiBaseUrl.replace(/\/$/, "");
      const response = await fetch(
        `${base}/v1/merchant/hubs/${encodeURIComponent(hubId)}/config-snapshots/${encodeURIComponent(snapshotId)}`,
        {
          method: "PATCH",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${merchantToken}`,
          },
          body: JSON.stringify({ name }),
        },
      );
      if (!response.ok) {
        throw new Error(await readApiErrorMessage(response, `Rename failed (${response.status})`));
      }
      await loadSnapshots();
      onNoticeRef.current(t("settings.backupRenamed"));
    } catch (error) {
      onNoticeRef.current(error instanceof Error ? error.message : t("settings.renameFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={card}>
      <div>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{t("settings.configBackups")}</h3>
        <p style={{ margin: "8px 0 0", color: "#5b6470", lineHeight: 1.5 }}>
          {t("settings.backupsIntro", { limit: HUB_CONFIG_SNAPSHOT_LIMIT })}
        </p>
      </div>

      {loadError ? (
        <div
          style={{
            padding: "10px 12px",
            borderRadius: 12,
            border: "1px solid rgba(198, 40, 40, 0.25)",
            background: "rgba(198, 40, 40, 0.06)",
            color: "#8b1a1a",
            fontSize: "0.86rem",
            lineHeight: 1.45,
          }}
        >
          {loadError}
          <button
            type="button"
            style={{ ...secondaryBtn, marginTop: 10, display: "block" }}
            disabled={busy != null}
            onClick={() => void loadSnapshots().catch(() => undefined)}
          >
            Retry
          </button>
        </div>
      ) : null}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          style={inputStyle}
          placeholder={t("settings.backupNamePlaceholder", { number: snapshots.length + 1 })}
          value={backupName}
          onChange={(event) => setBackupName(event.target.value)}
        />
        <button
          type="button"
          style={primaryBtn}
          disabled={busy != null || loading || Boolean(loadError)}
          onClick={() => void handleSaveBackup()}
        >
          {busy === "save" ? t("common.saving") : t("settings.saveSetupBackup")}
        </button>
      </div>

      {loading ? (
        <p style={{ margin: 0, color: "#5b6470" }}>Loading backups…</p>
      ) : snapshots.length === 0 && !loadError ? (
        <p style={{ margin: 0, color: "#5b6470" }}>{t("settings.noBackupsHint")}</p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {snapshots.map((snapshot) => (
            <div key={snapshot.id} style={row}>
              <div style={{ display: "grid", gap: 6, flex: "1 1 200px" }}>
                <input
                  style={{ ...inputStyle, flex: "1 1 auto", minWidth: 0 }}
                  value={renameDrafts[snapshot.id] ?? snapshot.name}
                  onChange={(event) =>
                    setRenameDrafts((current) => ({ ...current, [snapshot.id]: event.target.value }))
                  }
                />
                <span style={{ fontSize: "0.82rem", color: "#5b6470" }}>
                  {t("settings.backupSavedAt", { date: new Date(snapshot.createdAt).toLocaleString("en-GB") })}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  style={secondaryBtn}
                  disabled={busy != null}
                  onClick={() => void handleRename(snapshot.id)}
                >
                  {t("common.rename")}
                </button>
                <button
                  type="button"
                  style={primaryBtn}
                  disabled={busy != null}
                  onClick={() => void handleRestore(snapshot.id)}
                >
                  {busy === `restore-${snapshot.id}` ? t("common.restoring") : t("common.restore")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
