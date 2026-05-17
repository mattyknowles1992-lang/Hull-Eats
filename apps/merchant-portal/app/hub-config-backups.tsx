"use client";

import type { CSSProperties } from "react";
import { useCallback, useEffect, useState } from "react";

import type { HubConfigSnapshot, HubMenuSection, HubSettings } from "@hull-eats/types";
import { HUB_CONFIG_SNAPSHOT_LIMIT } from "@hull-eats/types";

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

export function HubConfigBackups({
  apiBaseUrl,
  hubId,
  merchantToken,
  hubSettings,
  menuSections,
  onRestore,
  onNotice,
}: HubConfigBackupsProps) {
  const [snapshots, setSnapshots] = useState<HubConfigSnapshot[]>([]);
  const [backupName, setBackupName] = useState("");
  const [renameDrafts, setRenameDrafts] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const loadSnapshots = useCallback(async () => {
    const base = apiBaseUrl.replace(/\/$/, "");
    const response = await fetch(`${base}/v1/merchant/hubs/${encodeURIComponent(hubId)}/config-snapshots`, {
      headers: { Authorization: `Bearer ${merchantToken}` },
    });
    if (!response.ok) {
      throw new Error(`Could not load config backups (${response.status})`);
    }
    const body = (await response.json()) as HubConfigSnapshot[];
    setSnapshots(body);
    setRenameDrafts(Object.fromEntries(body.map((entry) => [entry.id, entry.name])));
  }, [apiBaseUrl, hubId, merchantToken]);

  useEffect(() => {
    void loadSnapshots().catch((error: unknown) => {
      onNotice(error instanceof Error ? error.message : "Could not load config backups.");
    });
  }, [loadSnapshots, onNotice]);

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
        throw new Error(`Save backup failed (${response.status})`);
      }
      setBackupName("");
      await loadSnapshots();
      onNotice("Config backup saved (delivery, menu, and hub settings).");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Save backup failed.");
    } finally {
      setBusy(null);
    }
  };

  const handleRestore = async (snapshotId: string) => {
    const snapshot = snapshots.find((entry) => entry.id === snapshotId);
    if (!snapshot) {
      return;
    }
    const ok = window.confirm(
      `Restore "${snapshot.name}"? This replaces your current hub setup (settings, delivery, menu). Save again if you want it live for customers.`,
    );
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
        throw new Error(`Restore failed (${response.status})`);
      }
      const workspace = (await response.json()) as { settings: HubSettings; menuSections: HubMenuSection[] };
      onRestore({ settings: workspace.settings, menuSections: workspace.menuSections });
      onNotice(`Restored "${snapshot.name}" to your live hub.`);
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Restore failed.");
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
        throw new Error(`Rename failed (${response.status})`);
      }
      await loadSnapshots();
      onNotice("Backup renamed.");
    } catch (error) {
      onNotice(error instanceof Error ? error.message : "Rename failed.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div style={card}>
      <div>
        <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Config backups</h3>
        <p style={{ margin: "8px 0 0", color: "#5b6470", lineHeight: 1.5 }}>
          Save your full hub setup — delivery map, fees, menu, and settings. Up to {HUB_CONFIG_SNAPSHOT_LIMIT} backups;
          older ones are replaced when you save a new one.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
        <input
          style={inputStyle}
          placeholder={`Backup name (e.g. Backup ${snapshots.length + 1})`}
          value={backupName}
          onChange={(event) => setBackupName(event.target.value)}
        />
        <button type="button" style={primaryBtn} disabled={busy != null} onClick={() => void handleSaveBackup()}>
          {busy === "save" ? "Saving…" : "Save current setup as backup"}
        </button>
      </div>

      {snapshots.length === 0 ? (
        <p style={{ margin: 0, color: "#5b6470" }}>No backups yet. Save one before big delivery or menu changes.</p>
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
                  Saved {new Date(snapshot.createdAt).toLocaleString("en-GB")}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button
                  type="button"
                  style={secondaryBtn}
                  disabled={busy != null}
                  onClick={() => void handleRename(snapshot.id)}
                >
                  Rename
                </button>
                <button
                  type="button"
                  style={primaryBtn}
                  disabled={busy != null}
                  onClick={() => void handleRestore(snapshot.id)}
                >
                  {busy === `restore-${snapshot.id}` ? "Restoring…" : "Restore"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
