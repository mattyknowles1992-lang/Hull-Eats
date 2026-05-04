"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  initialCouriers,
  initialHubs,
  initialUsers,
  type BusinessType,
  type CourierRecord,
  type CourierStatus,
  type PlatformRole,
} from "./data";

const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000").replace(/\/$/, "");

type AdminHubSummary = {
  id: string;
  businessName: string;
  slug: string;
  type: BusinessType;
  hubUsername: string;
  deliveryLeadTime: string;
  status: "live" | "onboarding" | "paused";
  ownerName: string;
  orderVolumeToday: number;
  orderVolumeWeek: number;
  grossSalesWeek: string;
  averageOrderValue: string;
  activeOrders: Array<{
    id: string;
    customerName: string;
    status: string;
    total: string;
    placedAgo: string;
  }>;
  notes: string[];
};

type AdminCreateHubResponse = {
  hub: AdminHubSummary;
  ownerUser: {
    id: string;
    fullName: string;
    email: string;
    username: string;
    role: "owner" | "manager" | "staff";
  };
  temporaryPassword: string;
};

type AdminHubUserSummary = {
  id: string;
  hubId: string;
  hubBusinessName: string;
  fullName: string;
  email: string;
  username: string;
  role: "owner" | "manager" | "staff";
  status: "active" | "invited" | "disabled";
};

type AdminLoginResponse = {
  token: string;
  admin: {
    email: string;
  };
};

function mapApiHubToRecord(hub: AdminHubSummary) {
  return {
    ...hub,
    status: hub.status === "onboarding" ? "setup" : hub.status,
  } as const;
}

async function loginToAdmin(email: string, password: string): Promise<AdminLoginResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/admin/auth/login`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    throw new Error(`Admin login failed with status ${response.status}`);
  }

  return (await response.json()) as AdminLoginResponse;
}

async function fetchAdminHubs(token: string): Promise<AdminHubSummary[]> {
  const response = await fetch(`${apiBaseUrl}/v1/admin/hubs`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin hub fetch failed with status ${response.status}`);
  }

  return (await response.json()) as AdminHubSummary[];
}

async function fetchAdminUsers(token: string): Promise<AdminHubUserSummary[]> {
  const response = await fetch(`${apiBaseUrl}/v1/admin/users`, {
    cache: "no-store",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin user fetch failed with status ${response.status}`);
  }

  return (await response.json()) as AdminHubUserSummary[];
}

async function createAdminHub(
  token: string,
  input: {
    businessName: string;
    ownerEmail: string;
    hubPassword: string;
  },
): Promise<AdminCreateHubResponse> {
  const response = await fetch(`${apiBaseUrl}/v1/admin/hubs`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Admin hub create failed with status ${response.status}`);
  }

  return (await response.json()) as AdminCreateHubResponse;
}

async function deleteAdminHub(token: string, hubId: string) {
  const response = await fetch(`${apiBaseUrl}/v1/admin/hubs/${hubId}`, {
    method: "DELETE",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Admin hub delete failed with status ${response.status}`);
  }

  return (await response.json()) as { deletedHubId: string; deletedBusinessName: string };
}

async function createAdminHubUser(
  token: string,
  hubId: string,
  input: {
    fullName: string;
    email: string;
    username: string;
    password: string;
    role: "owner" | "manager" | "staff";
  },
) {
  const response = await fetch(`${apiBaseUrl}/v1/admin/hubs/${hubId}/users`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    throw new Error(`Admin hub user create failed with status ${response.status}`);
  }

  return (await response.json()) as {
    id: string;
    hubId: string;
    fullName: string;
    email: string;
    username: string;
    role: "owner" | "manager" | "staff";
    status: "active" | "invited";
  };
}

function mapHubRoleToPlatformRole(role: AdminHubUserSummary["role"]) {
  if (role === "owner") {
    return "business_owner" as const;
  }

  return "business_manager" as const;
}

function mapApiUserToRecord(user: AdminHubUserSummary) {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role: mapHubRoleToPlatformRole(user.role),
    hub: user.hubBusinessName,
    loginType: "hub" as const,
  };
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(255, 107, 0, 0.14), transparent 24%), radial-gradient(circle at top right, rgba(35, 88, 189, 0.18), transparent 26%), linear-gradient(180deg, #020814 0%, #041120 40%, #091a31 100%)",
    color: "#f7fbff",
    padding: "24px 18px 60px",
    fontFamily: "Manrope, system-ui, sans-serif",
  } as const,
  shell: {
    width: "min(100%, 1220px)",
    margin: "0 auto",
  } as const,
  card: {
    borderRadius: 28,
    border: "1px solid rgba(188, 213, 255, 0.14)",
    background: "linear-gradient(180deg, rgba(10, 22, 42, 0.92), rgba(5, 15, 29, 0.9))",
    boxShadow: "0 22px 60px rgba(0, 0, 0, 0.28)",
  } as const,
  sectionCard: {
    borderRadius: 24,
    border: "1px solid rgba(188, 213, 255, 0.14)",
    background: "rgba(11, 24, 44, 0.78)",
    boxShadow: "0 18px 42px rgba(0, 0, 0, 0.22)",
    padding: 20,
  } as const,
  input: {
    width: "100%",
    minHeight: 50,
    borderRadius: 16,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#f7fbff",
    padding: "0 14px",
    outline: "none",
  } as const,
  passwordWrap: {
    position: "relative",
    display: "block",
  } as const,
  passwordReveal: {
    position: "absolute",
    top: 7,
    right: 8,
    minHeight: 36,
    padding: "0 12px",
    borderRadius: 12,
    border: "1px solid rgba(255, 255, 255, 0.16)",
    color: "#f7fbff",
    background: "rgba(255,255,255,0.1)",
    fontWeight: 900,
    cursor: "pointer",
  } as const,
  textarea: {
    width: "100%",
    minHeight: 108,
    borderRadius: 16,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#f7fbff",
    padding: "14px",
    outline: "none",
    resize: "vertical",
  } as const,
  buttonPrimary: {
    minHeight: 50,
    padding: "0 18px",
    borderRadius: 16,
    border: "1px solid rgba(255, 176, 113, 0.2)",
    color: "#fff",
    fontWeight: 900,
    background: "linear-gradient(180deg, #ff8a33, #ff6b00)",
    boxShadow: "0 18px 34px rgba(255, 107, 0, 0.28)",
    cursor: "pointer",
  } as const,
  buttonGlass: {
    minHeight: 48,
    padding: "0 16px",
    borderRadius: 16,
    border: "1px solid rgba(255, 255, 255, 0.18)",
    color: "#f7fbff",
    fontWeight: 800,
    background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.05))",
    cursor: "pointer",
  } as const,
};

const statusColors: Record<string, { bg: string; fg: string }> = {
  live: { bg: "rgba(111, 240, 191, 0.12)", fg: "#6ff0bf" },
  active: { bg: "rgba(111, 240, 191, 0.12)", fg: "#6ff0bf" },
  accepted: { bg: "rgba(111, 240, 191, 0.12)", fg: "#6ff0bf" },
  setup: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  break: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  pending: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  assigned: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  preparing: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  paused: { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" },
  offline: { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" },
};

type NotificationRecord = {
  id: string;
  audience: string;
  channel: string;
  body: string;
  sentAt: string;
};

function StatusPill({ value }: { value: string }) {
  const colors = statusColors[value] ?? { bg: "rgba(255,255,255,0.08)", fg: "#f7fbff" };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 34,
        padding: "0 12px",
        borderRadius: 999,
        background: colors.bg,
        color: colors.fg,
        fontWeight: 800,
        textTransform: "capitalize",
      }}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  copy,
}: {
  eyebrow?: string;
  title: string;
  copy: string;
}) {
  return (
    <div>
      {eyebrow ? (
        <p
          style={{
            margin: 0,
            color: "#ffb47d",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
          }}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2 style={{ margin: eyebrow ? "8px 0 0" : 0, fontSize: 28, fontFamily: "Georgia, serif" }}>{title}</h2>
      <p style={{ margin: "8px 0 0", color: "#9fb2c9", lineHeight: 1.6 }}>{copy}</p>
    </div>
  );
}

export function AdminConsole() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showHubPassword, setShowHubPassword] = useState(false);
  const [showUserPassword, setShowUserPassword] = useState(false);

  const [hubs, setHubs] = useState(initialHubs);
  const [users, setUsers] = useState(initialUsers.filter((user) => user.loginType === "platform"));
  const [couriers, setCouriers] = useState(initialCouriers);
  const [notifications, setNotifications] = useState<NotificationRecord[]>([
    {
      id: "notice_1",
      audience: "All hubs",
      channel: "Operational notice",
      body: "Evening demand is rising. Keep prep times realistic and update stock before the dinner push.",
      sentAt: "Today, 16:45",
    },
  ]);

  const [businessName, setBusinessName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [hubPassword, setHubPassword] = useState("");

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<PlatformRole>("business_manager");
  const [selectedHub, setSelectedHub] = useState("Hull Eats HQ");

  const [courierName, setCourierName] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [courierZone, setCourierZone] = useState("Hull Central");
  const [courierStatus, setCourierStatus] = useState<CourierStatus>("active");

  const [messageAudience, setMessageAudience] = useState("All hubs");
  const [messageChannel, setMessageChannel] = useState("Operational notice");
  const [messageBody, setMessageBody] = useState("");
  const [hubNotice, setHubNotice] = useState("");

  const metrics = useMemo(
    () => [
      { label: "Live hubs", value: String(hubs.filter((hub) => hub.status === "live").length) },
      { label: "Platform users", value: String(users.filter((user) => user.loginType === "platform").length) },
      { label: "Hub users", value: String(users.filter((user) => user.loginType === "hub").length) },
      { label: "Active couriers", value: String(couriers.filter((courier) => courier.status === "active").length) },
      { label: "Open orders", value: String(hubs.reduce((count, hub) => count + hub.activeOrders.length, 0)) },
      {
        label: "Weekly GMV",
        value: `£${hubs
          .reduce((sum, hub) => sum + Number(hub.grossSalesWeek.replace(/[^\d.]/g, "")), 0)
          .toLocaleString("en-GB")}`,
      },
    ],
    [couriers, hubs, users],
  );

  const activeOrders = useMemo(
    () =>
      hubs.flatMap((hub) =>
        hub.activeOrders.map((order) => ({
          ...order,
          hubName: hub.businessName,
          hubSlug: hub.slug,
        })),
      ),
    [hubs],
  );

  const courierMetrics = useMemo(
    () => [
      {
        label: "Average rating",
        value: (couriers.reduce((sum, courier) => sum + courier.rating, 0) / couriers.length).toFixed(1),
      },
      {
        label: "Completed deliveries",
        value: couriers.reduce((sum, courier) => sum + courier.completedDeliveries, 0).toLocaleString("en-GB"),
      },
      { label: "On break", value: String(couriers.filter((courier) => courier.status === "break").length) },
      { label: "Offline", value: String(couriers.filter((courier) => courier.status === "offline").length) },
    ],
    [couriers],
  );

  const audienceOptions = useMemo(
    () => ["All hubs", "All couriers", ...hubs.map((hub) => hub.businessName), ...couriers.map((courier) => courier.fullName)],
    [couriers, hubs],
  );

  const handleLogin = async () => {
    try {
      const response = await loginToAdmin(loginEmail.trim(), loginPassword);
      setAuthToken(response.token);
      setIsLoggedIn(true);
      setLoginError("");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Admin sign-in failed.";
      setLoginError(message);
    }
  };

  useEffect(() => {
    if (!isLoggedIn || !authToken) {
      return;
    }

    void (async () => {
      try {
        const [apiHubs, apiUsers] = await Promise.all([fetchAdminHubs(authToken), fetchAdminUsers(authToken)]);
        setHubs(apiHubs.map(mapApiHubToRecord));
        setUsers([
          ...initialUsers.filter((user) => user.loginType === "platform"),
          ...apiUsers.map(mapApiUserToRecord),
        ]);
      } catch (error) {
        console.error(error);
      }
    })();
  }, [authToken, isLoggedIn]);

  useEffect(() => {
    if (selectedHub === "Hull Eats HQ" && (newUserRole === "business_owner" || newUserRole === "business_manager")) {
      setNewUserRole("platform_staff");
    }

    if (selectedHub !== "Hull Eats HQ" && (newUserRole === "platform_admin" || newUserRole === "platform_staff")) {
      setNewUserRole("business_manager");
    }
  }, [newUserRole, selectedHub]);

  const handleCreateHub = async () => {
    if (!authToken || !businessName.trim() || !ownerEmail.trim() || !hubPassword.trim()) {
      return;
    }

    try {
      const created = await createAdminHub(authToken, {
        businessName: businessName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        hubPassword,
      });

      const hubRecord = mapApiHubToRecord(created.hub);

      setHubs((current) => [hubRecord, ...current.filter((hub) => hub.id !== hubRecord.id)]);
      setUsers((current) => [
        ...current.filter((user) => user.email !== created.ownerUser.email),
        {
          id: created.ownerUser.id,
          fullName: created.ownerUser.fullName,
          email: created.ownerUser.email,
          role: "business_owner",
          hub: created.hub.businessName,
          loginType: "hub",
        },
      ]);
      setNotifications((current) => [
        {
          id: `notice_${current.length + 1}`,
          audience: created.hub.businessName,
          channel: "Hub message",
          body: `Hub provisioned. Email: ${created.ownerUser.email} / Username: ${created.ownerUser.username} / Temporary password: ${created.temporaryPassword}`,
          sentAt: "Just now",
        },
        ...current,
      ]);
      setSelectedHub(created.hub.businessName);
      setBusinessName("");
      setOwnerEmail("");
      setHubPassword("");
      setHubNotice(`Hub created and provisioned for ${created.hub.businessName}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hub creation failed.";
      setHubNotice(message);
    }
  };

  const handleDeleteHub = async (hubId: string, businessName: string) => {
    if (!authToken) {
      return;
    }

    try {
      await deleteAdminHub(authToken, hubId);
      setHubs((current) => current.filter((hub) => hub.id !== hubId));
      setUsers((current) => current.filter((user) => user.hub !== businessName));
      setNotifications((current) => [
        {
          id: `notice_${current.length + 1}`,
          audience: businessName,
          channel: "Hub message",
          body: `${businessName} hub was removed from the internal system.`,
          sentAt: "Just now",
        },
        ...current,
      ]);
      setHubNotice(`Hub deleted: ${businessName}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Hub deletion failed.";
      setHubNotice(message);
    }
  };

  const handleCreateUser = () => {
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      return;
    }

    if (selectedHub === "Hull Eats HQ") {
      setHubNotice("HQ internal user persistence is not wired yet. Hub-user creation is persistent and ready.");
      return;
    }

    if (newUserRole !== "business_owner" && newUserRole !== "business_manager") {
      setHubNotice("Hub users must use business owner or business manager access.");
      return;
    }

    const targetHub = hubs.find((hub) => hub.businessName === selectedHub);
    if (!authToken || !targetHub) {
      setHubNotice("Pick a valid hub before creating a business user.");
      return;
    }

    void (async () => {
      try {
        const createdUser = await createAdminHubUser(authToken, targetHub.id, {
          fullName: newUserName.trim(),
          email: newUserEmail.trim(),
          username: newUserEmail.trim().split("@")[0] || newUserName.trim().toLowerCase().replace(/\s+/g, "-"),
          password: newUserPassword,
          role: newUserRole === "business_owner" ? "owner" : "manager",
        });

        setUsers((current) => [
          mapApiUserToRecord({
            ...createdUser,
            hubBusinessName: selectedHub,
          }),
          ...current.filter((user) => user.email !== createdUser.email),
        ]);

        setNotifications((current) => [
          {
            id: `notice_${current.length + 1}`,
            audience: selectedHub,
            channel: "Operational notice",
            body: `${newUserName.trim()} was provisioned with ${newUserRole.replaceAll("_", " ")} access.`,
            sentAt: "Just now",
          },
          ...current,
        ]);

        setNewUserName("");
        setNewUserEmail("");
        setNewUserPassword("");
        setHubNotice(`Business user created for ${selectedHub}.`);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Business user creation failed.";
        setHubNotice(message);
      }
    })();
  };

  const handleCreateCourier = () => {
    if (!courierName.trim() || !courierPhone.trim()) {
      return;
    }

    setCouriers((current) => [
      {
        id: `courier_${current.length + 1}`,
        fullName: courierName.trim(),
        phone: courierPhone.trim(),
        rating: 5,
        completedDeliveries: 0,
        status: courierStatus,
        zone: courierZone.trim() || "Hull Central",
      },
      ...current,
    ]);

    setNotifications((current) => [
      {
        id: `notice_${current.length + 1}`,
        audience: courierName.trim(),
        channel: "Courier dispatch update",
        body: `${courierName.trim()} was added to the roster in ${courierZone.trim() || "Hull Central"}.`,
        sentAt: "Just now",
      },
      ...current,
    ]);

    setCourierName("");
    setCourierPhone("");
    setCourierZone("Hull Central");
    setCourierStatus("active");
  };

  const handleSendMessage = () => {
    if (!messageBody.trim()) {
      return;
    }

    setNotifications((current) => [
      {
        id: `notice_${current.length + 1}`,
        audience: messageAudience,
        channel: messageChannel,
        body: messageBody.trim(),
        sentAt: "Just now",
      },
      ...current,
    ]);

    setMessageBody("");
  };

  if (!isLoggedIn) {
    return (
      <main style={styles.page}>
        <div style={styles.shell}>
          <style jsx>{`
            .login-stage {
              position: relative;
              overflow: hidden;
              min-height: calc(100vh - 84px);
              display: grid;
              align-items: center;
            }

            .login-shell {
              position: relative;
              display: grid;
              grid-template-columns: minmax(0, 1.08fr) minmax(320px, 0.92fr);
              gap: 24px;
            }

            .login-panel {
              position: relative;
              overflow: hidden;
              animation: login-rise 0.75s ease-out both;
            }

            .login-panel::before {
              content: "";
              position: absolute;
              inset: -35% auto auto -8%;
              width: 240px;
              height: 240px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(255, 138, 51, 0.28), transparent 72%);
              filter: blur(2px);
              animation: halo-drift 7s ease-in-out infinite;
            }

            .login-panel::after {
              content: "";
              position: absolute;
              right: -60px;
              bottom: -70px;
              width: 260px;
              height: 260px;
              border-radius: 50%;
              background: radial-gradient(circle, rgba(88, 146, 255, 0.26), transparent 72%);
              animation: halo-drift 8.5s ease-in-out infinite reverse;
            }

            .login-grid {
              position: relative;
              display: grid;
              gap: 18px;
              z-index: 1;
            }

            .ambient-card {
              position: relative;
              border-radius: 28px;
              border: 1px solid rgba(188, 213, 255, 0.14);
              background: linear-gradient(180deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.03));
              box-shadow: 0 24px 50px rgba(0, 0, 0, 0.24);
              backdrop-filter: blur(24px);
              animation: login-rise 0.85s ease-out both;
            }

            .ambient-card:nth-child(2) {
              animation-delay: 0.08s;
            }

            .ambient-card:nth-child(3) {
              animation-delay: 0.16s;
            }

            .signal-chip {
              display: inline-flex;
              align-items: center;
              gap: 8px;
              min-height: 38px;
              padding: 0 14px;
              border-radius: 999px;
              border: 1px solid rgba(255, 255, 255, 0.1);
              background: rgba(255, 255, 255, 0.05);
              color: #dce9ff;
              font-size: 13px;
              font-weight: 700;
            }

            .signal-dot {
              width: 8px;
              height: 8px;
              border-radius: 50%;
              background: #6ff0bf;
              box-shadow: 0 0 0 0 rgba(111, 240, 191, 0.7);
              animation: pulse-dot 2s infinite;
            }

            .login-button {
              position: relative;
              overflow: hidden;
            }

            .login-button::before {
              content: "";
              position: absolute;
              inset: 0;
              background: linear-gradient(110deg, transparent 15%, rgba(255, 255, 255, 0.34), transparent 52%);
              transform: translateX(-120%);
              animation: shimmer-pass 3.2s ease-in-out infinite;
            }

            .floating-line {
              height: 1px;
              width: 100%;
              background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.32), transparent);
              transform-origin: center;
              animation: line-breathe 3.4s ease-in-out infinite;
            }

            @keyframes login-rise {
              from {
                opacity: 0;
                transform: translateY(22px) scale(0.98);
              }
              to {
                opacity: 1;
                transform: translateY(0) scale(1);
              }
            }

            @keyframes halo-drift {
              0%,
              100% {
                transform: translate3d(0, 0, 0) scale(1);
              }
              50% {
                transform: translate3d(12px, -18px, 0) scale(1.08);
              }
            }

            @keyframes shimmer-pass {
              0% {
                transform: translateX(-130%);
              }
              55%,
              100% {
                transform: translateX(135%);
              }
            }

            @keyframes pulse-dot {
              0% {
                box-shadow: 0 0 0 0 rgba(111, 240, 191, 0.6);
              }
              70% {
                box-shadow: 0 0 0 10px rgba(111, 240, 191, 0);
              }
              100% {
                box-shadow: 0 0 0 0 rgba(111, 240, 191, 0);
              }
            }

            @keyframes line-breathe {
              0%,
              100% {
                opacity: 0.35;
                transform: scaleX(0.82);
              }
              50% {
                opacity: 0.95;
                transform: scaleX(1);
              }
            }

            @media (max-width: 920px) {
              .login-shell {
                grid-template-columns: 1fr;
              }
            }
          `}</style>

          <section className="login-stage">
            <div className="login-shell">
              <section style={{ ...styles.card, padding: 30 }} className="login-panel">
                <div className="login-grid">
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span className="signal-chip">
                      <span className="signal-dot" />
                      Admin portal protected
                    </span>
                    <span className="signal-chip">Mobile operations ready</span>
                  </div>

                  <div>
                    <p
                      style={{
                        margin: 0,
                        color: "#ffb47d",
                        fontSize: 13,
                        fontWeight: 800,
                        letterSpacing: "0.16em",
                        textTransform: "uppercase",
                      }}
                    >
                      Admin portal
                    </p>
                    <h1 style={{ margin: "12px 0 0", fontSize: 54, lineHeight: 0.92, fontFamily: "Georgia, serif" }}>
                      Hull Eats admin
                    </h1>
                    <p style={{ margin: "18px 0 0", color: "#c7d8ed", lineHeight: 1.8, maxWidth: 560 }}>
                      Hull Eats HQ command surface for hub creation, courier operations, live alerts, and marketplace
                      oversight. This portal now lives on its own admin service URL.
                    </p>
                  </div>

                  <div className="floating-line" />

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {[
                      { label: "Live hubs", value: String(hubs.filter((hub) => hub.status === "live").length) },
                      { label: "Couriers active", value: String(couriers.filter((courier) => courier.status === "active").length) },
                      { label: "Orders moving", value: String(activeOrders.length) },
                    ].map((metric) => (
                      <article
                        key={metric.label}
                        style={{
                          borderRadius: 20,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.05)",
                          padding: 16,
                          backdropFilter: "blur(16px)",
                        }}
                      >
                        <div style={{ color: "#9fb2c9", fontSize: 12, fontWeight: 700 }}>{metric.label}</div>
                        <strong style={{ display: "block", marginTop: 10, fontSize: 28 }}>{metric.value}</strong>
                      </article>
                    ))}
                  </div>

                  <div
                    style={{
                      borderRadius: 22,
                      border: "1px solid rgba(255,255,255,0.09)",
                      background: "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))",
                      padding: 18,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <strong style={{ fontSize: 16 }}>Operations heartbeat</strong>
                      <span style={{ color: "#6ff0bf", fontWeight: 800, fontSize: 13 }}>Live sync preview</span>
                    </div>
                    <p style={{ margin: "10px 0 0", color: "#9fb2c9", lineHeight: 1.7 }}>
                      New hub setup, courier roster changes, and urgent broadcasts all surface here first so the admin
                      team can react quickly on desktop or mobile.
                    </p>
                  </div>
                </div>
              </section>

              <section style={{ ...styles.card, padding: 28 }} className="ambient-card">
                <div style={{ position: "relative", zIndex: 1 }}>
                  <p
                    style={{
                      margin: 0,
                      color: "#ffb47d",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                    }}
                  >
                    Admin sign-in
                  </p>
                  <h2 style={{ margin: "10px 0 0", fontSize: 34, lineHeight: 1.02, fontFamily: "Georgia, serif" }}>
                    Access Hull Eats HQ
                  </h2>
                  <p style={{ margin: "12px 0 0", color: "#9fb2c9", lineHeight: 1.7 }}>
                    Sign in to create hubs, provision merchant users, manage couriers, and monitor active orders.
                  </p>

                  <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={{ fontWeight: 800, color: "#dce9ff" }}>Email</span>
                      <input style={styles.input} value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
                    </label>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={{ fontWeight: 800, color: "#dce9ff" }}>Password</span>
                      <span style={styles.passwordWrap}>
                        <input
                          style={{ ...styles.input, paddingRight: 88 }}
                          type={showLoginPassword ? "text" : "password"}
                          value={loginPassword}
                          onChange={(event) => setLoginPassword(event.target.value)}
                        />
                        <button type="button" style={styles.passwordReveal} onClick={() => setShowLoginPassword((current) => !current)}>
                          {showLoginPassword ? "Hide" : "Show"}
                        </button>
                      </span>
                    </label>
                  </div>

                  <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
                    <button type="button" style={{ ...styles.buttonPrimary, width: "100%" }} className="login-button" onClick={handleLogin}>
                      Sign in to admin
                    </button>
                    <div
                      style={{
                        minHeight: 52,
                        display: "grid",
                        placeItems: "center",
                        padding: "12px 16px",
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.12)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#9fb2c9",
                        fontSize: 14,
                        textAlign: "center",
                        lineHeight: 1.6,
                      }}
                    >
                      Internal admin access uses the Render bootstrap email and password.
                    </div>
                  </div>

                  {loginError ? (
                    <p
                      style={{
                        marginTop: 16,
                        padding: "14px 16px",
                        borderRadius: 16,
                        color: "#ffd7d7",
                        background: "rgba(255, 95, 95, 0.12)",
                        border: "1px solid rgba(255, 95, 95, 0.2)",
                      }}
                    >
                      {loginError}
                    </p>
                  ) : null}
                </div>
              </section>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main style={styles.page}>
      <div style={styles.shell}>
        <style jsx>{`
          .hero-grid,
          .split-grid,
          .ops-grid,
          .courier-grid {
            display: grid;
            gap: 18px;
          }

          .hero-grid {
            grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
            margin-bottom: 18px;
          }

          .split-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }

          .ops-grid {
            grid-template-columns: minmax(0, 1.15fr) minmax(320px, 0.85fr);
          }

          .courier-grid {
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          }

          @media (max-width: 920px) {
            .ops-grid {
              grid-template-columns: 1fr;
            }
          }
        `}</style>

        <header
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: 16,
            marginBottom: 22,
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#ffb47d",
                fontSize: 13,
                fontWeight: 800,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
              }}
            >
              Hull Eats HQ
            </p>
            <h1 style={{ margin: "8px 0 0", fontSize: 46, lineHeight: 0.95, fontFamily: "Georgia, serif" }}>
              Admin operations console
            </h1>
            <p style={{ margin: "14px 0 0", color: "#9fb2c9", lineHeight: 1.7, maxWidth: 760 }}>
              Mobile-responsive internal control panel for user creation, hub provisioning, courier operations,
              messaging, and live marketplace monitoring.
            </p>
          </div>

          <button
            type="button"
            style={styles.buttonGlass}
            onClick={() => {
              setIsLoggedIn(false);
              setAuthToken("");
              setLoginPassword("");
            }}
          >
            Sign out
          </button>
        </header>

        <section className="hero-grid">
          {metrics.map((metric) => (
            <article key={metric.label} style={{ ...styles.sectionCard, padding: 18 }}>
              <p style={{ margin: 0, color: "#9fb2c9", fontSize: 13, fontWeight: 700 }}>{metric.label}</p>
              <strong style={{ display: "block", marginTop: 10, fontSize: 28 }}>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section style={{ display: "grid", gap: 18 }}>
          <section style={styles.sectionCard}>
            <SectionHeading
              eyebrow="Live queue"
              title="Active orders now"
              copy="Critical live orders surface first so admin can see operational pressure before drilling into a hub."
            />

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: 12,
                marginTop: 16,
              }}
            >
              {activeOrders.map((order) => (
                <Link
                  key={order.id}
                  href={`/hubs/${order.hubSlug}`}
                  style={{
                    textDecoration: "none",
                    borderRadius: 20,
                    border: "1px solid rgba(255,255,255,0.1)",
                    background: "rgba(255,255,255,0.04)",
                    padding: 16,
                    color: "#f7fbff",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                    <strong>{order.id}</strong>
                    <StatusPill value={order.status} />
                  </div>
                  <div style={{ marginTop: 12, display: "grid", gap: 6, color: "#9fb2c9", fontSize: 14 }}>
                    <span>{order.hubName}</span>
                    <span>{order.customerName}</span>
                    <span>{order.total}</span>
                    <span>{order.placedAgo}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="split-grid">
            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Provisioning"
                title="Create new hub"
                copy="A hub is a business on the marketplace. Create it here, then hand over the merchant portal login."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: 14,
                  marginTop: 16,
                }}
              >
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Business name</span>
                  <input style={styles.input} value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Login email</span>
                  <input
                    style={styles.input}
                    type="email"
                    value={ownerEmail}
                    onChange={(event) => setOwnerEmail(event.target.value)}
                  />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Temporary hub password</span>
                  <span style={styles.passwordWrap}>
                    <input
                      style={{ ...styles.input, paddingRight: 88 }}
                      type={showHubPassword ? "text" : "password"}
                      value={hubPassword}
                      onChange={(event) => setHubPassword(event.target.value)}
                    />
                    <button type="button" style={styles.passwordReveal} onClick={() => setShowHubPassword((current) => !current)}>
                      {showHubPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
              </div>

              <div style={{ marginTop: 18, display: "flex", gap: 12, flexWrap: "wrap" }}>
                <button type="button" style={styles.buttonPrimary} onClick={handleCreateHub}>
                  Create hub
                </button>
                <div
                  style={{
                    minHeight: 48,
                    display: "inline-flex",
                    alignItems: "center",
                    padding: "0 14px",
                    borderRadius: 16,
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#9fb2c9",
                    fontSize: 14,
                  }}
                >
                  Hub records now persist in the database and can be provisioned or removed from admin
                </div>
              </div>

              {hubNotice ? (
                <p
                  style={{
                    marginTop: 14,
                    padding: "14px 16px",
                    borderRadius: 16,
                    color: "#dce9ff",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                  }}
                >
                  {hubNotice}
                </p>
              ) : null}
            </section>

            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Access"
                title="Create users"
                copy="Platform staff stay in HQ access. Hub users belong to one business and sign into the merchant portal."
              />

              <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Full name</span>
                  <input style={styles.input} value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Email</span>
                  <input style={styles.input} value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Temporary password</span>
                  <span style={styles.passwordWrap}>
                    <input
                      style={{ ...styles.input, paddingRight: 88 }}
                      type={showUserPassword ? "text" : "password"}
                      value={newUserPassword}
                      onChange={(event) => setNewUserPassword(event.target.value)}
                    />
                    <button type="button" style={styles.passwordReveal} onClick={() => setShowUserPassword((current) => !current)}>
                      {showUserPassword ? "Hide" : "Show"}
                    </button>
                  </span>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Role</span>
                  <select
                    style={{ ...styles.input, appearance: "none" }}
                    value={newUserRole}
                    onChange={(event) => setNewUserRole(event.target.value as PlatformRole)}
                  >
                    {selectedHub === "Hull Eats HQ" ? (
                      <>
                        <option value="platform_admin">Platform admin</option>
                        <option value="platform_staff">Platform staff</option>
                      </>
                    ) : (
                      <>
                        <option value="business_owner">Business owner</option>
                        <option value="business_manager">Business manager</option>
                      </>
                    )}
                  </select>
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Assign to</span>
                  <select
                    style={{ ...styles.input, appearance: "none" }}
                    value={selectedHub}
                    onChange={(event) => setSelectedHub(event.target.value)}
                  >
                    <option value="Hull Eats HQ">Hull Eats HQ</option>
                    {hubs.map((hub) => (
                      <option key={hub.id} value={hub.businessName}>
                        {hub.businessName}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <button type="button" style={{ ...styles.buttonPrimary, marginTop: 18 }} onClick={handleCreateUser}>
                Create user
              </button>
            </section>
          </section>

          <section className="ops-grid">
            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Marketplace hubs"
                title="Hub overview"
                copy="Open any hub to see order volume, sales breakdown, active orders, and operational notes."
              />

              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {hubs.map((hub) => (
                  <div
                    key={hub.id}
                    style={{
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 16,
                      color: "#f7fbff",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div>
                        <Link href={`/hubs/${hub.slug}`} style={{ textDecoration: "none", color: "#f7fbff" }}>
                          <strong style={{ fontSize: 18 }}>{hub.businessName}</strong>
                        </Link>
                        <p style={{ margin: "6px 0 0", color: "#9fb2c9" }}>{hub.type} / {hub.orderVolumeWeek} orders this week</p>
                      </div>
                      <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                        <StatusPill value={hub.status} />
                        <button
                          type="button"
                          style={{ ...styles.buttonGlass, minHeight: 38, padding: "0 12px", fontSize: 13 }}
                          onClick={() => handleDeleteHub(hub.id, hub.businessName)}
                        >
                          Delete hub
                        </button>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                        gap: 10,
                        marginTop: 14,
                      }}
                    >
                      <div>
                        <div style={{ color: "#9fb2c9", fontSize: 13 }}>Today</div>
                        <strong>{hub.orderVolumeToday}</strong>
                      </div>
                      <div>
                        <div style={{ color: "#9fb2c9", fontSize: 13 }}>Sales week</div>
                        <strong>{hub.grossSalesWeek}</strong>
                      </div>
                      <div>
                        <div style={{ color: "#9fb2c9", fontSize: 13 }}>AOV</div>
                        <strong>{hub.averageOrderValue}</strong>
                      </div>
                      <div>
                        <div style={{ color: "#9fb2c9", fontSize: 13 }}>Active orders</div>
                        <strong>{hub.activeOrders.length}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ display: "grid", gap: 18 }}>
              <section style={styles.sectionCard}>
                <SectionHeading
                  eyebrow="Messaging"
                  title="Notifications"
                  copy="Broadcast to all hubs, all couriers, or select one specific hub or courier."
                />

                <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 800, color: "#dce9ff" }}>Audience</span>
                    <select
                      style={{ ...styles.input, appearance: "none" }}
                      value={messageAudience}
                      onChange={(event) => setMessageAudience(event.target.value)}
                    >
                      {audienceOptions.map((option) => (
                        <option key={option}>{option}</option>
                      ))}
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 800, color: "#dce9ff" }}>Notification type</span>
                    <select
                      style={{ ...styles.input, appearance: "none" }}
                      value={messageChannel}
                      onChange={(event) => setMessageChannel(event.target.value)}
                    >
                      <option>Operational notice</option>
                      <option>Order volume alert</option>
                      <option>Hub message</option>
                      <option>Courier dispatch update</option>
                    </select>
                  </label>
                  <label style={{ display: "grid", gap: 8 }}>
                    <span style={{ fontWeight: 800, color: "#dce9ff" }}>Message body</span>
                    <textarea style={styles.textarea} value={messageBody} onChange={(event) => setMessageBody(event.target.value)} />
                  </label>
                </div>

                <button type="button" style={{ ...styles.buttonPrimary, marginTop: 18 }} onClick={handleSendMessage}>
                  Send notification
                </button>

                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  {notifications.slice(0, 3).map((notice) => (
                    <article
                      key={notice.id}
                      style={{
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        padding: 14,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <strong>{notice.channel}</strong>
                        <span style={{ color: "#9fb2c9", fontSize: 13 }}>{notice.sentAt}</span>
                      </div>
                      <div style={{ marginTop: 8, color: "#dce9ff", fontSize: 14 }}>{notice.audience}</div>
                      <p style={{ margin: "8px 0 0", color: "#9fb2c9", lineHeight: 1.6 }}>{notice.body}</p>
                    </article>
                  ))}
                </div>
              </section>

              <section style={styles.sectionCard}>
                <SectionHeading
                  eyebrow="Provisioned access"
                  title="Users"
                  copy="Quick view of everyone currently provisioned for platform or hub sign-in."
                />

                <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                  {users.map((user) => (
                    <article
                      key={user.id}
                      style={{
                        borderRadius: 20,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        padding: 16,
                      }}
                    >
                      <strong style={{ display: "block", fontSize: 17 }}>{user.fullName}</strong>
                      <div style={{ marginTop: 8, display: "grid", gap: 6, color: "#9fb2c9", fontSize: 14 }}>
                        <span>{user.email}</span>
                        <span>{user.role.replaceAll("_", " ")}</span>
                        <span>{user.hub}</span>
                        <span>{user.loginType === "platform" ? "Platform sign-in" : "Hub sign-in"}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            </section>
          </section>

          <section className="courier-grid">
            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Dispatch"
                title="Courier management"
                copy="Add couriers, control their live status, and keep the roster ready for manual dispatch."
              />

              <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Courier name</span>
                  <input style={styles.input} value={courierName} onChange={(event) => setCourierName(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Phone</span>
                  <input style={styles.input} value={courierPhone} onChange={(event) => setCourierPhone(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Zone</span>
                  <input style={styles.input} value={courierZone} onChange={(event) => setCourierZone(event.target.value)} />
                </label>
                <label style={{ display: "grid", gap: 8 }}>
                  <span style={{ fontWeight: 800, color: "#dce9ff" }}>Status</span>
                  <select
                    style={{ ...styles.input, appearance: "none" }}
                    value={courierStatus}
                    onChange={(event) => setCourierStatus(event.target.value as CourierStatus)}
                  >
                    <option value="active">Active</option>
                    <option value="break">Break</option>
                    <option value="offline">Offline</option>
                  </select>
                </label>
              </div>

              <button type="button" style={{ ...styles.buttonPrimary, marginTop: 18 }} onClick={handleCreateCourier}>
                Add courier
              </button>
            </section>
            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Courier stats"
                title="Dispatch snapshot"
                copy="Operations can see courier quality, availability, and delivery volume at a glance."
              />

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
                  gap: 12,
                  marginTop: 16,
                }}
              >
                {courierMetrics.map((metric) => (
                  <article
                    key={metric.label}
                    style={{
                      borderRadius: 18,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 14,
                    }}
                  >
                    <div style={{ color: "#9fb2c9", fontSize: 13 }}>{metric.label}</div>
                    <strong style={{ display: "block", marginTop: 8, fontSize: 24 }}>{metric.value}</strong>
                  </article>
                ))}
              </div>
            </section>

            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Roster"
                title="Courier list"
                copy="Every courier card keeps name, rating, status, assigned order, and zone visible."
              />

              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {couriers.map((courier: CourierRecord) => (
                  <article
                    key={courier.id}
                    style={{
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ fontSize: 18 }}>{courier.fullName}</strong>
                        <p style={{ margin: "6px 0 0", color: "#9fb2c9" }}>{courier.phone}</p>
                      </div>
                      <StatusPill value={courier.status} />
                    </div>

                    <div style={{ display: "grid", gap: 6, marginTop: 14, color: "#dce9ff", fontSize: 14 }}>
                      <div>Rating: {courier.rating.toFixed(1)}</div>
                      <div>Completed deliveries: {courier.completedDeliveries}</div>
                      <div>Zone: {courier.zone}</div>
                      <div>Active order: {courier.activeOrderId ?? "None"}</div>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        </section>
      </div>
    </main>
  );
}
