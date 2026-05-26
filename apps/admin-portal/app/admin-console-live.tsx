"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { ContactMessageRecord } from "@hull-eats/types";

import {
  adminSessionStorageKey,
  createAdminHub,
  createAdminHubCourier,
  createAdminHubUser,
  deleteAdminCourier,
  deleteAdminHub,
  fetchAdminContactMessages,
  fetchAdminCouriers,
  fetchAdminCustomers,
  fetchAdminHubs,
  fetchAdminOrders,
  fetchAdminUsers,
  loginToAdmin,
  publishAdminHub,
  removeAdminHubCourierAssignment,
  updateAdminHubLifecycle,
  updateAdminContactMessageStatus,
  updateAdminCourier,
  updateAdminCustomer,
  type AdminCourierSummary,
  type AdminCustomerSummary,
  type AdminHubOrderSummary,
  type AdminHubSummary,
  type AdminHubUserSummary,
} from "./admin-api";

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at top left, rgba(7, 155, 200, 0.18), transparent 24%), radial-gradient(circle at top right, rgba(35, 205, 255, 0.12), transparent 26%), linear-gradient(180deg, #020814 0%, #041120 40%, #091a31 100%)",
    color: "#f7fbff",
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
    minHeight: 48,
    borderRadius: 16,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#f7fbff",
    padding: "0 14px",
    outline: "none",
  } as const,
  textarea: {
    width: "100%",
    minHeight: 120,
    borderRadius: 16,
    border: "1px solid rgba(255, 255, 255, 0.1)",
    background: "rgba(255, 255, 255, 0.08)",
    color: "#f7fbff",
    padding: "14px",
    outline: "none",
    resize: "vertical",
  } as const,
  buttonPrimary: {
    minHeight: 46,
    padding: "0 16px",
    borderRadius: 16,
    border: "1px solid rgba(126, 224, 255, 0.2)",
    color: "#fff",
    fontWeight: 900,
    background: "linear-gradient(180deg, #23cdff, #079bc8)",
    boxShadow: "0 18px 34px rgba(7, 155, 200, 0.28)",
    cursor: "pointer",
  } as const,
  buttonGlass: {
    minHeight: 44,
    padding: "0 14px",
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
  delivered: { bg: "rgba(111, 240, 191, 0.12)", fg: "#6ff0bf" },
  resolved: { bg: "rgba(111, 240, 191, 0.12)", fg: "#6ff0bf" },
  setup: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  break: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  pending: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  assigned: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  preparing: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  in_progress: { bg: "rgba(255, 209, 124, 0.12)", fg: "#ffd17c" },
  paused: { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" },
  offline: { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" },
  rejected: { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" },
  cancelled: { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" },
  disabled: { bg: "rgba(255, 159, 159, 0.12)", fg: "#ff9f9f" },
  new: { bg: "rgba(154, 232, 255, 0.14)", fg: "#9ae8ff" },
};

const activeOrderStatuses = new Set(["pending", "accepted", "preparing", "ready_for_dispatch", "assigned", "courier_accepted", "picked_up"]);

type PlatformUserRecord = {
  id: string;
  fullName: string;
  email: string;
  role: "business_owner" | "business_manager" | "business_staff" | "business_viewer";
  hub: string;
};

function StatusPill({ value }: { value: string }) {
  const colors = statusColors[value] ?? { bg: "rgba(255,255,255,0.08)", fg: "#f7fbff" };
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        minHeight: 32,
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

function SectionHeading({ eyebrow, title, copy }: { eyebrow?: string; title: string; copy: string }) {
  return (
    <div>
      {eyebrow ? (
        <p
          style={{
            margin: 0,
            color: "#9ae8ff",
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

function EmptyState({ title, copy }: { title: string; copy: string }) {
  return (
    <article
      style={{
        borderRadius: 20,
        border: "1px dashed rgba(255,255,255,0.14)",
        background: "rgba(255,255,255,0.03)",
        padding: 16,
      }}
    >
      <strong style={{ display: "block", fontSize: 16 }}>{title}</strong>
      <p style={{ margin: "8px 0 0", color: "#9fb2c9", lineHeight: 1.6 }}>{copy}</p>
    </article>
  );
}

function roleLabel(role: AdminHubUserSummary["role"]) {
  return role.replaceAll("_", " ");
}

function describeHubSubtitle(hub: AdminHubSummary) {
  const typeLabel = hub.type ? hub.type : "store setup pending";
  const loginLabel = hub.hubUsername ? `owner login ${hub.hubUsername}` : "owner login not set";
  const leadTimeLabel = hub.deliveryLeadTime ?? "delivery lead time not set";
  return `${typeLabel} / ${loginLabel} / ${leadTimeLabel}`;
}

function mapApiUserToRecord(user: AdminHubUserSummary): PlatformUserRecord {
  return {
    id: user.id,
    fullName: user.fullName,
    email: user.email,
    role:
      user.role === "owner"
        ? "business_owner"
        : user.role === "manager"
          ? "business_manager"
          : user.role === "staff"
            ? "business_staff"
            : "business_viewer",
    hub: user.hubBusinessName,
  };
}

export function AdminConsoleLive() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [hubs, setHubs] = useState<AdminHubSummary[]>([]);
  const [users, setUsers] = useState<AdminHubUserSummary[]>([]);
  const [customers, setCustomers] = useState<AdminCustomerSummary[]>([]);
  const [couriers, setCouriers] = useState<AdminCourierSummary[]>([]);
  const [orders, setOrders] = useState<AdminHubOrderSummary[]>([]);
  const [contactMessages, setContactMessages] = useState<ContactMessageRecord[]>([]);
  const [loadState, setLoadState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [dataError, setDataError] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [hubPassword, setHubPassword] = useState("");
  const [businessPhone, setBusinessPhone] = useState("");
  const [businessAddressLine1, setBusinessAddressLine1] = useState("");
  const [businessCity, setBusinessCity] = useState("Hull");
  const [businessPostcode, setBusinessPostcode] = useState("");
  const [businessCuisineLabel, setBusinessCuisineLabel] = useState("");
  const [businessType, setBusinessType] = useState<"restaurant" | "takeaway" | "shop">("takeaway");
  const [hubNotice, setHubNotice] = useState("");

  const [selectedHubId, setSelectedHubId] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserUsername, setNewUserUsername] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");
  const [newUserRole, setNewUserRole] = useState<AdminHubUserSummary["role"]>("manager");
  const [userNotice, setUserNotice] = useState("");

  const [expandedCourierHubId, setExpandedCourierHubId] = useState<string | null>(null);
  const [courierName, setCourierName] = useState("");
  const [courierEmail, setCourierEmail] = useState("");
  const [courierPhone, setCourierPhone] = useState("");
  const [courierUsername, setCourierUsername] = useState("");
  const [courierPassword, setCourierPassword] = useState("");
  const [courierVehicleType, setCourierVehicleType] = useState("car");
  const [courierVehicleRegistration, setCourierVehicleRegistration] = useState("");
  const [courierNotice, setCourierNotice] = useState("");

  const [customerFilter, setCustomerFilter] = useState<"all" | "plus" | "review" | "suspended">("all");
  const [customerNotice, setCustomerNotice] = useState("");
  const [inboxFilter, setInboxFilter] = useState<"all" | "new" | "in_progress" | "resolved">("all");
  const [inboxNotice, setInboxNotice] = useState("");

  const platformUsers = useMemo(() => users.map(mapApiUserToRecord), [users]);

  const refreshAdminData = useCallback(
    async (token = authToken, options: { silent?: boolean } = {}) => {
      if (!token) {
        return;
      }

      if (!options.silent) {
        setLoadState("loading");
      }

      try {
        const [nextHubs, nextUsers, nextCouriers, nextCustomers, nextOrders, nextMessages] = await Promise.all([
          fetchAdminHubs(token),
          fetchAdminUsers(token),
          fetchAdminCouriers(token),
          fetchAdminCustomers(token),
          fetchAdminOrders(token),
          fetchAdminContactMessages(token),
        ]);

        setHubs(nextHubs);
        setUsers(nextUsers);
        setCouriers(nextCouriers);
        setCustomers(nextCustomers);
        setOrders(nextOrders);
        setContactMessages(nextMessages);
        setDataError("");
        setLoadState("ready");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Admin data failed to load.";
        setDataError(message);
        setLoadState("error");
        setHubs([]);
        setUsers([]);
        setCouriers([]);
        setCustomers([]);
        setOrders([]);
        setContactMessages([]);
      }
    },
    [authToken],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const stored = window.sessionStorage.getItem(adminSessionStorageKey);
    if (!stored) {
      return;
    }

    setAuthToken(stored);
    setIsLoggedIn(true);
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !authToken) {
      return;
    }

    void refreshAdminData(authToken);
  }, [authToken, isLoggedIn, refreshAdminData]);

  useEffect(() => {
    if (!selectedHubId && hubs[0]?.id) {
      setSelectedHubId(hubs[0].id);
    }
  }, [hubs, selectedHubId]);

  const metrics = useMemo(
    () => [
      { label: "Live hubs", value: String(hubs.filter((hub) => hub.status === "live").length) },
      { label: "Setup hubs", value: String(hubs.filter((hub) => hub.status === "setup").length) },
      { label: "Hub users", value: String(users.length) },
      { label: "Customers", value: String(customers.length) },
      { label: "Active couriers", value: String(couriers.filter((courier) => courier.status === "active").length) },
      { label: "Open orders", value: String(orders.filter((order) => activeOrderStatuses.has(order.status)).length) },
      { label: "New inbox", value: String(contactMessages.filter((message) => message.status === "new").length) },
    ],
    [contactMessages, couriers, customers, hubs, orders, users],
  );

  const filteredCustomers = useMemo(() => {
    if (customerFilter === "plus") {
      return customers.filter((customer) => customer.hullEatsPlusActive);
    }
    if (customerFilter === "review") {
      return customers.filter((customer) => customer.manualReviewRequired);
    }
    if (customerFilter === "suspended") {
      return customers.filter((customer) => customer.accountStatus !== "active");
    }
    return customers;
  }, [customerFilter, customers]);

  const filteredMessages = useMemo(() => {
    if (inboxFilter === "all") {
      return contactMessages;
    }
    return contactMessages.filter((message) => message.status === inboxFilter);
  }, [contactMessages, inboxFilter]);

  const unassignedCouriers = useMemo(() => couriers.filter((courier) => courier.assignedStores.length === 0), [couriers]);

  const handleLogin = async () => {
    try {
      const response = await loginToAdmin(loginEmail.trim(), loginPassword);
      setAuthToken(response.token);
      setIsLoggedIn(true);
      setLoginError("");
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(adminSessionStorageKey, response.token);
      }
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "Admin sign-in failed.");
    }
  };

  const handleSignOut = () => {
    setIsLoggedIn(false);
    setAuthToken("");
    setLoginPassword("");
    setDataError("");
    setLoadState("idle");
    setHubs([]);
    setUsers([]);
    setCouriers([]);
    setCustomers([]);
    setOrders([]);
    setContactMessages([]);
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(adminSessionStorageKey);
    }
  };

  const handleCreateHub = async () => {
    if (!authToken || !businessName.trim() || !ownerEmail.trim() || !hubPassword.trim()) {
      return;
    }

    try {
      const created = await createAdminHub(authToken, {
        businessName: businessName.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        hubPassword,
        businessPhone: businessPhone.trim(),
        addressLine1: businessAddressLine1.trim(),
        city: businessCity.trim(),
        postcode: businessPostcode.trim().toUpperCase(),
        cuisineLabel: businessCuisineLabel.trim(),
        storeType: businessType,
      });
      await refreshAdminData(authToken, { silent: true });
      setSelectedHubId(created.hub.id);
      setBusinessName("");
      setOwnerEmail("");
      setHubPassword("");
      setBusinessPhone("");
      setBusinessAddressLine1("");
      setBusinessCity("Hull");
      setBusinessPostcode("");
      setBusinessCuisineLabel("");
      setBusinessType("takeaway");
      setHubNotice(
        `${created.hub.businessName} created in setup. Owner login: ${created.ownerUser.email}. Temporary password: ${created.temporaryPassword}`,
      );
    } catch (error) {
      setHubNotice(error instanceof Error ? error.message : "Hub creation failed.");
    }
  };

  const handleDeleteHub = async (hubId: string, businessNameToDelete: string) => {
    if (!authToken || !window.confirm(`Delete ${businessNameToDelete}?`)) {
      return;
    }
    try {
      await deleteAdminHub(authToken, hubId);
      await refreshAdminData(authToken, { silent: true });
      setHubNotice(`Hub deleted: ${businessNameToDelete}`);
    } catch (error) {
      setHubNotice(error instanceof Error ? error.message : "Hub deletion failed.");
    }
  };

  const handlePublishHub = async (hubId: string, businessNameToPublish: string) => {
    if (!authToken) {
      return;
    }
    try {
      await publishAdminHub(authToken, hubId);
      await refreshAdminData(authToken, { silent: true });
      setHubNotice(`${businessNameToPublish} is now live on Hull Eats.`);
    } catch (error) {
      setHubNotice(error instanceof Error ? error.message : "Hub publish failed.");
    }
  };

  const handleToggleHubListing = async (hub: AdminHubSummary, listedOnMarketplace: boolean) => {
    if (!authToken) {
      return;
    }
    try {
      await updateAdminHubLifecycle(authToken, hub.id, { listedOnMarketplace });
      await refreshAdminData(authToken, { silent: true });
      setHubNotice(
        listedOnMarketplace
          ? `${hub.businessName} is now listed on Hull Eats.`
          : `${hub.businessName} has been hidden from Hull Eats.`,
      );
    } catch (error) {
      setHubNotice(error instanceof Error ? error.message : "Hub listing update failed.");
    }
  };

  const handleToggleHubService = async (hub: AdminHubSummary, acceptingOrders: boolean) => {
    if (!authToken) {
      return;
    }
    try {
      await updateAdminHubLifecycle(authToken, hub.id, { acceptingOrders });
      await refreshAdminData(authToken, { silent: true });
      setHubNotice(
        acceptingOrders
          ? `${hub.businessName} is now accepting orders again.`
          : `${hub.businessName} service has been paused.`,
      );
    } catch (error) {
      setHubNotice(error instanceof Error ? error.message : "Hub service update failed.");
    }
  };

  const handleCreateUser = async () => {
    if (!authToken || !selectedHubId || !newUserName.trim() || !newUserEmail.trim() || !newUserPassword.trim()) {
      return;
    }

    try {
      const username =
        newUserUsername.trim() || newUserEmail.trim().split("@")[0] || newUserName.trim().toLowerCase().replace(/\s+/g, "-");
      await createAdminHubUser(authToken, selectedHubId, {
        fullName: newUserName.trim(),
        email: newUserEmail.trim().toLowerCase(),
        username: username.toLowerCase(),
        password: newUserPassword,
        role: newUserRole,
      });
      await refreshAdminData(authToken, { silent: true });
      setNewUserName("");
      setNewUserEmail("");
      setNewUserUsername("");
      setNewUserPassword("");
      setNewUserRole("manager");
      setUserNotice("Business user created.");
    } catch (error) {
      setUserNotice(error instanceof Error ? error.message : "Business user creation failed.");
    }
  };

  const handleCreateHubCourier = async (hub: AdminHubSummary) => {
    if (!authToken || !courierName.trim() || !courierEmail.trim() || !courierUsername.trim() || !courierPassword.trim()) {
      setCourierNotice("Fill in name, email, username, and password before adding a courier.");
      return;
    }

    try {
      const created = await createAdminHubCourier(authToken, hub.id, {
        fullName: courierName.trim(),
        email: courierEmail.trim().toLowerCase(),
        phone: courierPhone.trim(),
        username: courierUsername.trim().toLowerCase(),
        password: courierPassword,
        vehicleType: courierVehicleType.trim() || "car",
        vehicleRegistration: courierVehicleRegistration.trim(),
      });
      await refreshAdminData(authToken, { silent: true });
      setCourierName("");
      setCourierEmail("");
      setCourierPhone("");
      setCourierUsername("");
      setCourierPassword("");
      setCourierVehicleType("car");
      setCourierVehicleRegistration("");
      setExpandedCourierHubId(null);
      setCourierNotice(
        created.temporaryPassword
          ? `${created.fullName} assigned to ${hub.businessName}. Temporary password: ${created.temporaryPassword}`
          : created.message ?? `${created.fullName} linked to ${hub.businessName}.`,
      );
    } catch (error) {
      setCourierNotice(error instanceof Error ? error.message : "Courier creation failed.");
    }
  };

  const handleRemoveHubCourier = async (hubId: string, courier: AdminCourierSummary) => {
    if (!authToken) {
      return;
    }
    try {
      await removeAdminHubCourierAssignment(authToken, hubId, courier.courierProfileId);
      await refreshAdminData(authToken, { silent: true });
      setCourierNotice(`${courier.fullName} removed from this hub.`);
    } catch (error) {
      setCourierNotice(error instanceof Error ? error.message : "Courier unassign failed.");
    }
  };

  const handleUpdateCourierStatus = async (courier: AdminCourierSummary, status: AdminCourierSummary["status"]) => {
    if (!authToken) {
      return;
    }
    try {
      await updateAdminCourier(authToken, courier.courierProfileId, { status });
      await refreshAdminData(authToken, { silent: true });
      setCourierNotice(`${courier.fullName} updated to ${status}.`);
    } catch (error) {
      setCourierNotice(error instanceof Error ? error.message : "Courier update failed.");
    }
  };

  const handleDeleteCourier = async (courier: AdminCourierSummary) => {
    if (!authToken || !window.confirm(`Remove ${courier.fullName}'s courier account?`)) {
      return;
    }
    try {
      await deleteAdminCourier(authToken, courier.courierProfileId);
      await refreshAdminData(authToken, { silent: true });
      setCourierNotice(`Courier account removed for ${courier.fullName}.`);
    } catch (error) {
      setCourierNotice(error instanceof Error ? error.message : "Courier removal failed.");
    }
  };

  const handleUpdateCustomer = async (customer: AdminCustomerSummary, input: Record<string, unknown>) => {
    if (!authToken) {
      return;
    }
    try {
      await updateAdminCustomer(authToken, customer.id, input);
      await refreshAdminData(authToken, { silent: true });
      setCustomerNotice(`${customer.fullName} updated.`);
    } catch (error) {
      setCustomerNotice(error instanceof Error ? error.message : "Customer update failed.");
    }
  };

  const handleUpdateMessageStatus = async (message: ContactMessageRecord, status: "new" | "in_progress" | "resolved") => {
    if (!authToken) {
      return;
    }
    try {
      await updateAdminContactMessageStatus(authToken, message.id, status);
      await refreshAdminData(authToken, { silent: true });
      setInboxNotice(`Inbox status updated for ${message.senderName}.`);
    } catch (error) {
      setInboxNotice(error instanceof Error ? error.message : "Inbox update failed.");
    }
  };

  if (!isLoggedIn) {
    return (
      <main className="he-admin-page" style={styles.page}>
        <div className="he-admin-shell">
          <section style={{ minHeight: "calc(100vh - 84px)", display: "grid", alignItems: "center" }}>
            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.1fr) minmax(320px, 0.9fr)", gap: 24 }}>
              <section style={{ ...styles.card, padding: 30 }}>
                <div style={{ display: "grid", gap: 18 }}>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 8,
                        minHeight: 38,
                        padding: "0 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#dce9ff",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Admin portal protected
                    </span>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        minHeight: 38,
                        padding: "0 14px",
                        borderRadius: 999,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.05)",
                        color: "#dce9ff",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      Live hub data only
                    </span>
                  </div>
                  <div>
                    <p style={{ margin: 0, color: "#9ae8ff", fontSize: 13, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase" }}>
                      Admin portal
                    </p>
                    <h1 style={{ margin: "12px 0 0", fontSize: 54, lineHeight: 0.92, fontFamily: "Georgia, serif" }}>
                      Hull Eats admin
                    </h1>
                    <p style={{ margin: "18px 0 0", color: "#c7d8ed", lineHeight: 1.8, maxWidth: 560 }}>
                      Real hub operations surface for provisioning, courier assignment, live order oversight, customer review,
                      and support inbox triage.
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
                    {metrics.slice(0, 4).map((metric) => (
                      <article
                        key={metric.label}
                        style={{
                          borderRadius: 20,
                          border: "1px solid rgba(255,255,255,0.1)",
                          background: "rgba(255,255,255,0.05)",
                          padding: 16,
                        }}
                      >
                        <div style={{ color: "#9fb2c9", fontSize: 12, fontWeight: 700 }}>{metric.label}</div>
                        <strong style={{ display: "block", marginTop: 10, fontSize: 28 }}>{metric.value}</strong>
                      </article>
                    ))}
                  </div>
                </div>
              </section>

              <section style={{ ...styles.card, padding: 28 }}>
                <div>
                  <p style={{ margin: 0, color: "#9ae8ff", fontSize: 12, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase" }}>
                    Admin sign-in
                  </p>
                  <h2 style={{ margin: "10px 0 0", fontSize: 34, lineHeight: 1.02, fontFamily: "Georgia, serif" }}>Access Hull Eats HQ</h2>
                  <p style={{ margin: "12px 0 0", color: "#9fb2c9", lineHeight: 1.7 }}>
                    Sign in to view live hubs, orders, couriers, customers, and inbound support messages.
                  </p>
                  <div style={{ display: "grid", gap: 14, marginTop: 22 }}>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={{ fontWeight: 800, color: "#dce9ff" }}>Email</span>
                      <input style={styles.input} value={loginEmail} onChange={(event) => setLoginEmail(event.target.value)} />
                    </label>
                    <label style={{ display: "grid", gap: 8 }}>
                      <span style={{ fontWeight: 800, color: "#dce9ff" }}>Password</span>
                      <input
                        style={styles.input}
                        type="password"
                        value={loginPassword}
                        onChange={(event) => setLoginPassword(event.target.value)}
                      />
                    </label>
                  </div>
                  <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
                    <button type="button" style={{ ...styles.buttonPrimary, width: "100%" }} onClick={handleLogin}>
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
    <main className="he-admin-page" style={styles.page}>
      <div className="he-admin-shell">
        <style jsx>{`
          .hero-grid,
          .split-grid,
          .hub-grid,
          .hub-meta-grid {
            display: grid;
            gap: 18px;
          }

          .hero-grid {
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          }

          .split-grid {
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          }

          .hub-grid {
            grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
          }

          .hub-meta-grid {
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          }
        `}</style>

        <header className="he-admin-header">
          <div>
            <p className="he-admin-eyebrow">Hull Eats HQ</p>
            <h1 style={{ margin: "8px 0 0", fontSize: 46, lineHeight: 0.95, fontFamily: "Georgia, serif" }}>Admin operations console</h1>
            <p style={{ margin: "14px 0 0", color: "#9fb2c9", lineHeight: 1.7, maxWidth: 760 }}>
              Real operational view for live hubs, grouped couriers, per-hub orders, customers, and inbound support inbox.
            </p>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button type="button" style={styles.buttonGlass} onClick={() => void refreshAdminData()}>
              Refresh
            </button>
            <button type="button" style={styles.buttonGlass} onClick={handleSignOut}>
              Sign out
            </button>
          </div>
        </header>

        {dataError ? (
          <section style={{ ...styles.sectionCard, borderColor: "rgba(255,95,95,0.26)" }}>
            <strong style={{ display: "block", fontSize: 18 }}>Live admin data failed to load</strong>
            <p style={{ margin: "10px 0 0", color: "#ffd7d7", lineHeight: 1.7 }}>{dataError}</p>
            <button type="button" style={{ ...styles.buttonPrimary, marginTop: 16 }} onClick={() => void refreshAdminData()}>
              Retry loading
            </button>
          </section>
        ) : null}

        {loadState === "loading" ? (
          <section style={styles.sectionCard}>
            <strong style={{ display: "block", fontSize: 18 }}>Loading live admin data...</strong>
            <p style={{ margin: "10px 0 0", color: "#9fb2c9", lineHeight: 1.7 }}>
              Fetching hubs, users, couriers, customers, orders, and support messages from the API.
            </p>
          </section>
        ) : null}

        <section className="hero-grid" style={{ marginTop: 18 }}>
          {metrics.map((metric) => (
            <article key={metric.label} style={{ ...styles.sectionCard, padding: 18 }}>
              <p style={{ margin: 0, color: "#9fb2c9", fontSize: 13, fontWeight: 700 }}>{metric.label}</p>
              <strong style={{ display: "block", marginTop: 10, fontSize: 28 }}>{metric.value}</strong>
            </article>
          ))}
        </section>

        <section className="split-grid" style={{ marginTop: 18 }}>
          <section style={styles.sectionCard}>
            <SectionHeading
              eyebrow="Provisioning"
              title="Create new hub"
              copy="A hub is a live business workspace. Create it here, then the business owner finishes setup inside the merchant portal."
            />
            <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Business name</span>
                <input style={styles.input} value={businessName} onChange={(event) => setBusinessName(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Login email</span>
                <input style={styles.input} type="email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Temporary password</span>
                <input style={styles.input} type="password" value={hubPassword} onChange={(event) => setHubPassword(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Business phone (optional)</span>
                <input style={styles.input} value={businessPhone} onChange={(event) => setBusinessPhone(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Address line 1 (optional)</span>
                <input
                  style={styles.input}
                  value={businessAddressLine1}
                  onChange={(event) => setBusinessAddressLine1(event.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>City</span>
                <input style={styles.input} value={businessCity} onChange={(event) => setBusinessCity(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Postcode (optional)</span>
                <input
                  style={styles.input}
                  value={businessPostcode}
                  onChange={(event) => setBusinessPostcode(event.target.value.toUpperCase())}
                />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Cuisine label (optional)</span>
                <input
                  style={styles.input}
                  value={businessCuisineLabel}
                  onChange={(event) => setBusinessCuisineLabel(event.target.value)}
                />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Business type</span>
                <select
                  style={{ ...styles.input, appearance: "none" }}
                  value={businessType}
                  onChange={(event) => setBusinessType(event.target.value as "restaurant" | "takeaway" | "shop")}
                >
                  <option value="takeaway">Takeaway</option>
                  <option value="restaurant">Restaurant</option>
                  <option value="shop">Shop</option>
                </select>
              </label>
            </div>
            <button type="button" style={{ ...styles.buttonPrimary, marginTop: 18 }} onClick={handleCreateHub}>
              Create hub
            </button>
            {hubNotice ? <p style={{ margin: "12px 0 0", color: "#dce9ff", lineHeight: 1.7 }}>{hubNotice}</p> : null}
          </section>

          <section style={styles.sectionCard}>
            <SectionHeading
              eyebrow="Access"
              title="Create hub user"
              copy="Business logins are created against a real hub. Owners, managers, staff, and viewers all stay scoped to that business."
            />
            <div style={{ display: "grid", gap: 14, marginTop: 16 }}>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Hub</span>
                <select style={{ ...styles.input, appearance: "none" }} value={selectedHubId} onChange={(event) => setSelectedHubId(event.target.value)}>
                  <option value="">Select a hub</option>
                  {hubs.map((hub) => (
                    <option key={hub.id} value={hub.id}>
                      {hub.businessName}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Full name</span>
                <input style={styles.input} value={newUserName} onChange={(event) => setNewUserName(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Email</span>
                <input style={styles.input} value={newUserEmail} onChange={(event) => setNewUserEmail(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Username</span>
                <input style={styles.input} value={newUserUsername} onChange={(event) => setNewUserUsername(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Temporary password</span>
                <input style={styles.input} type="password" value={newUserPassword} onChange={(event) => setNewUserPassword(event.target.value)} />
              </label>
              <label style={{ display: "grid", gap: 8 }}>
                <span style={{ fontWeight: 800, color: "#dce9ff" }}>Role</span>
                <select style={{ ...styles.input, appearance: "none" }} value={newUserRole} onChange={(event) => setNewUserRole(event.target.value as AdminHubUserSummary["role"])}>
                  <option value="owner">Owner</option>
                  <option value="manager">Manager</option>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </select>
              </label>
            </div>
            <button type="button" style={{ ...styles.buttonPrimary, marginTop: 18 }} onClick={handleCreateUser}>
              Create user
            </button>
            {userNotice ? <p style={{ margin: "12px 0 0", color: "#dce9ff", lineHeight: 1.7 }}>{userNotice}</p> : null}
          </section>
        </section>

        <section style={{ ...styles.sectionCard, marginTop: 18 }}>
          <SectionHeading
            eyebrow="Hub containers"
            title="Live hubs grouped by operations"
            copy="Each hub card brings together its real status, assigned couriers, recent orders, and support volume."
          />

          {hubs.length === 0 ? (
            <div style={{ marginTop: 16 }}>
              <EmptyState title="No hubs available yet" copy="Create a hub above or check the admin API/database connection." />
            </div>
          ) : (
            <div className="hub-grid" style={{ marginTop: 16 }}>
              {hubs.map((hub) => {
                const hubUsers = users.filter((user) => user.hubId === hub.id);
                const hubOrders = orders.filter((order) => order.hubId === hub.id);
                const hubCouriers = couriers.filter((courier) => courier.assignedStores.some((store) => store.hubId === hub.id));
                const hubMessages = contactMessages.filter((message) => message.hubId === hub.id);

                return (
                  <article key={hub.id} style={{ ...styles.sectionCard, display: "grid", gap: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                      <div>
                        <Link href={`/hubs/${hub.slug}`} style={{ color: "#f7fbff", textDecoration: "none" }}>
                          <strong style={{ fontSize: 24 }}>{hub.businessName}</strong>
                        </Link>
                        <p style={{ margin: "8px 0 0", color: "#9fb2c9", lineHeight: 1.6 }}>
                          {describeHubSubtitle(hub)}
                        </p>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                        <StatusPill value={hub.status} />
                        {!hub.listedOnMarketplace ? (
                          <button
                            type="button"
                            disabled={!hub.hasStore}
                            style={{ ...styles.buttonPrimary, ...(hub.hasStore ? null : { opacity: 0.55, cursor: "not-allowed" }) }}
                            onClick={() => void handlePublishHub(hub.id, hub.businessName)}
                          >
                            {hub.hasStore ? "Make live" : "Setup needed"}
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={!hub.hasStore}
                          style={{ ...styles.buttonGlass, ...(hub.hasStore ? null : { opacity: 0.55, cursor: "not-allowed" }) }}
                          onClick={() => setExpandedCourierHubId((current) => (current === hub.id ? null : hub.id))}
                        >
                          {hub.hasStore ? (expandedCourierHubId === hub.id ? "Hide add courier" : "Show more") : "Store setup needed"}
                        </button>
                        {hub.hasStore ? (
                          <button
                            type="button"
                            style={styles.buttonGlass}
                            onClick={() => void handleToggleHubListing(hub, !hub.listedOnMarketplace)}
                          >
                            {hub.listedOnMarketplace ? "Hide from Hull Eats" : "List on Hull Eats"}
                          </button>
                        ) : null}
                        {hub.hasStore ? (
                          <button
                            type="button"
                            style={styles.buttonGlass}
                            onClick={() => void handleToggleHubService(hub, !hub.acceptingOrders)}
                          >
                            {hub.acceptingOrders ? "Stop service" : "Start service"}
                          </button>
                        ) : null}
                        <button type="button" style={{ ...styles.buttonGlass, color: "#ffb7b7" }} onClick={() => void handleDeleteHub(hub.id, hub.businessName)}>
                          Delete hub
                        </button>
                      </div>
                    </div>

                    <div className="hub-meta-grid">
                      {[
                        { label: "Today", value: String(hub.orderVolumeToday) },
                        { label: "Week orders", value: String(hub.orderVolumeWeek) },
                        { label: "Week sales", value: hub.grossSalesWeek },
                        { label: "AOV", value: hub.averageOrderValue },
                          { label: "Listed", value: hub.listedOnMarketplace ? "Yes" : "No" },
                          { label: "Service", value: hub.acceptingOrders ? "On" : "Off" },
                        { label: "Hub users", value: String(hubUsers.length) },
                        { label: "Inbox", value: String(hubMessages.length) },
                      ].map((metric) => (
                        <div
                          key={metric.label}
                          style={{
                            borderRadius: 18,
                            border: "1px solid rgba(255,255,255,0.1)",
                            background: "rgba(255,255,255,0.04)",
                            padding: 14,
                          }}
                        >
                          <div style={{ color: "#9fb2c9", fontSize: 12, fontWeight: 700 }}>{metric.label}</div>
                          <strong style={{ display: "block", marginTop: 8, fontSize: 22 }}>{metric.value}</strong>
                        </div>
                      ))}
                    </div>

                    {hub.notes.length > 0 ? (
                      <div style={{ display: "grid", gap: 8 }}>
                        {hub.notes.map((note: string) => (
                          <div
                            key={note}
                            style={{
                              borderRadius: 16,
                              border: "1px solid rgba(255,255,255,0.08)",
                              background: "rgba(255,255,255,0.03)",
                              padding: "12px 14px",
                              color: "#9fb2c9",
                              lineHeight: 1.6,
                            }}
                          >
                            {note}
                          </div>
                        ))}
                      </div>
                    ) : null}

                    {expandedCourierHubId === hub.id ? (
                      <section
                        style={{
                          borderRadius: 20,
                          border: "1px solid rgba(154,232,255,0.18)",
                          background: "rgba(255,255,255,0.04)",
                          padding: 16,
                        }}
                      >
                        <strong style={{ display: "block", fontSize: 18 }}>Add courier to {hub.businessName}</strong>
                        <div className="split-grid" style={{ marginTop: 12 }}>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "#dce9ff" }}>Name</span>
                            <input style={styles.input} value={courierName} onChange={(event) => setCourierName(event.target.value)} />
                          </label>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "#dce9ff" }}>Email</span>
                            <input style={styles.input} value={courierEmail} onChange={(event) => setCourierEmail(event.target.value)} />
                          </label>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "#dce9ff" }}>Phone</span>
                            <input style={styles.input} value={courierPhone} onChange={(event) => setCourierPhone(event.target.value)} />
                          </label>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "#dce9ff" }}>Username</span>
                            <input style={styles.input} value={courierUsername} onChange={(event) => setCourierUsername(event.target.value)} />
                          </label>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "#dce9ff" }}>Temporary password</span>
                            <input style={styles.input} type="password" value={courierPassword} onChange={(event) => setCourierPassword(event.target.value)} />
                          </label>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "#dce9ff" }}>Vehicle type</span>
                            <input style={styles.input} value={courierVehicleType} onChange={(event) => setCourierVehicleType(event.target.value)} />
                          </label>
                          <label style={{ display: "grid", gap: 8 }}>
                            <span style={{ fontWeight: 800, color: "#dce9ff" }}>Vehicle registration</span>
                            <input
                              style={styles.input}
                              value={courierVehicleRegistration}
                              onChange={(event) => setCourierVehicleRegistration(event.target.value.toUpperCase())}
                            />
                          </label>
                        </div>
                        <button type="button" style={{ ...styles.buttonPrimary, marginTop: 16 }} onClick={() => void handleCreateHubCourier(hub)}>
                          Add courier
                        </button>
                      </section>
                    ) : null}

                    <section style={{ display: "grid", gap: 12 }}>
                      <strong style={{ fontSize: 18 }}>Assigned couriers</strong>
                      {hubCouriers.length === 0 ? (
                        <EmptyState title="No couriers assigned" copy="Use Show more to create or link a courier directly to this hub." />
                      ) : (
                        hubCouriers.map((courier) => (
                          <article
                            key={`${hub.id}-${courier.courierProfileId}`}
                            style={{
                              borderRadius: 18,
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(255,255,255,0.04)",
                              padding: 14,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div>
                                <strong>{courier.fullName}</strong>
                                <p style={{ margin: "6px 0 0", color: "#9fb2c9" }}>
                                  {courier.email} / {courier.vehicleType} / {courier.vehicleRegistration || "No reg"}
                                </p>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <StatusPill value={courier.status} />
                                <button type="button" style={styles.buttonGlass} onClick={() => void handleUpdateCourierStatus(courier, "active")}>
                                  Activate
                                </button>
                                <button type="button" style={styles.buttonGlass} onClick={() => void handleUpdateCourierStatus(courier, "offline")}>
                                  Suspend
                                </button>
                                <button type="button" style={styles.buttonGlass} onClick={() => void handleRemoveHubCourier(hub.id, courier)}>
                                  Remove from hub
                                </button>
                                <button type="button" style={{ ...styles.buttonGlass, color: "#ffb7b7" }} onClick={() => void handleDeleteCourier(courier)}>
                                  Delete account
                                </button>
                              </div>
                            </div>
                            <div style={{ marginTop: 10, color: "#9fb2c9", fontSize: 14, lineHeight: 1.6 }}>
                              Rating {courier.rating.toFixed(1)} / {courier.completedDeliveries} deliveries / weekly earnings £
                              {courier.weeklyEarnings.toFixed(2)}
                            </div>
                          </article>
                        ))
                      )}
                    </section>

                    <section style={{ display: "grid", gap: 12 }}>
                      <strong style={{ fontSize: 18 }}>Recent orders</strong>
                      {hubOrders.length === 0 ? (
                        <EmptyState title="No orders yet" copy="Recent and active orders for this hub will appear here from the live database." />
                      ) : (
                        hubOrders.slice(0, 6).map((order) => (
                          <article
                            key={order.id}
                            style={{
                              borderRadius: 18,
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(255,255,255,0.04)",
                              padding: 14,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div>
                                <strong>{order.orderNumber}</strong>
                                <p style={{ margin: "6px 0 0", color: "#9fb2c9" }}>
                                  {order.customerName} / {order.totalAmount.toFixed(2)} {order.currency}
                                </p>
                              </div>
                              <StatusPill value={order.status} />
                            </div>
                            <div style={{ marginTop: 10, color: "#9fb2c9", fontSize: 14, lineHeight: 1.6 }}>
                              {new Date(order.placedAt).toLocaleString("en-GB")} / {order.fulfillmentType} / {order.courierName ?? "No courier yet"}
                            </div>
                          </article>
                        ))
                      )}
                    </section>

                    <section style={{ display: "grid", gap: 12 }}>
                      <strong style={{ fontSize: 18 }}>Hub users</strong>
                      {hubUsers.length === 0 ? (
                        <EmptyState title="No active hub users" copy="Create business access above if this hub still needs owner or staff logins." />
                      ) : (
                        hubUsers.map((user) => (
                          <article
                            key={user.id}
                            style={{
                              borderRadius: 18,
                              border: "1px solid rgba(255,255,255,0.1)",
                              background: "rgba(255,255,255,0.04)",
                              padding: 14,
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                              <div>
                                <strong>{user.fullName}</strong>
                                <p style={{ margin: "6px 0 0", color: "#9fb2c9" }}>
                                  {user.email} / {user.username}
                                </p>
                              </div>
                              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                                <StatusPill value={user.status} />
                                <StatusPill value={roleLabel(user.role)} />
                              </div>
                            </div>
                          </article>
                        ))
                      )}
                    </section>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="split-grid" style={{ marginTop: 18 }}>
          <section style={styles.sectionCard}>
            <SectionHeading
              eyebrow="Support inbox"
              title="Contact messages"
              copy="Messages from merchant hubs and customer surfaces land here with live status tracking."
            />
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
              {[
                ["all", "All"],
                ["new", "New"],
                ["in_progress", "In progress"],
                ["resolved", "Resolved"],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  style={inboxFilter === value ? styles.buttonPrimary : styles.buttonGlass}
                  onClick={() => setInboxFilter(value as typeof inboxFilter)}
                >
                  {label}
                </button>
              ))}
            </div>
            {inboxNotice ? <p style={{ margin: "12px 0 0", color: "#dce9ff", lineHeight: 1.7 }}>{inboxNotice}</p> : null}
            <div style={{ display: "grid", gap: 12, marginTop: 16, maxHeight: 720, overflow: "auto", paddingRight: 4 }}>
              {filteredMessages.length === 0 ? (
                <EmptyState title="No messages in this inbox view" copy="New merchant and customer enquiries will appear here once submitted." />
              ) : (
                filteredMessages.map((message) => (
                  <article
                    key={message.id}
                    style={{
                      borderRadius: 20,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      padding: 16,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <div>
                        <strong style={{ display: "block", fontSize: 17 }}>{message.subject}</strong>
                        <div style={{ marginTop: 8, display: "grid", gap: 4, color: "#9fb2c9", fontSize: 14 }}>
                          <span>
                            {message.senderName} / {message.senderEmail}
                          </span>
                          <span>
                            {message.origin.replaceAll("_", " ")}
                            {message.hubName ? ` / ${message.hubName}` : ""}
                            {message.orderNumber ? ` / order ${message.orderNumber}` : ""}
                          </span>
                          <span>{new Date(message.createdAt).toLocaleString("en-GB")}</span>
                        </div>
                      </div>
                      <StatusPill value={message.status} />
                    </div>
                    <p style={{ margin: "12px 0 0", color: "#dce9ff", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{message.message}</p>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                      <button type="button" style={styles.buttonGlass} onClick={() => void handleUpdateMessageStatus(message, "new")}>
                        Mark new
                      </button>
                      <button type="button" style={styles.buttonGlass} onClick={() => void handleUpdateMessageStatus(message, "in_progress")}>
                        In progress
                      </button>
                      <button type="button" style={styles.buttonPrimary} onClick={() => void handleUpdateMessageStatus(message, "resolved")}>
                        Resolve
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>

          <section style={{ display: "grid", gap: 18 }}>
            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Customers"
                title="Customer accounts"
                copy="Review real customer profiles, subscriptions, and moderation flags from the live API."
              />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                {[
                  ["all", "All customers"],
                  ["plus", "Hull Eats+"],
                  ["review", "Needs review"],
                  ["suspended", "Suspended / banned"],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    style={customerFilter === value ? styles.buttonPrimary : styles.buttonGlass}
                    onClick={() => setCustomerFilter(value as typeof customerFilter)}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {customerNotice ? <p style={{ margin: "12px 0 0", color: "#dce9ff", lineHeight: 1.7 }}>{customerNotice}</p> : null}
              <div style={{ display: "grid", gap: 12, marginTop: 16, maxHeight: 420, overflow: "auto", paddingRight: 4 }}>
                {filteredCustomers.length === 0 ? (
                  <EmptyState title="No customers in this filter" copy="Customer profiles from the live API will appear here." />
                ) : (
                  filteredCustomers.map((customer) => (
                    <article
                      key={customer.id}
                      style={{
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        padding: 14,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>{customer.fullName}</strong>
                          <div style={{ marginTop: 8, display: "grid", gap: 4, color: "#9fb2c9", fontSize: 14 }}>
                            <span>{customer.email}</span>
                            <span>{customer.phone || "No phone saved"}</span>
                            <span>{customer.defaultAddress || "No default address saved"}</span>
                          </div>
                        </div>
                        <div style={{ display: "grid", gap: 8, justifyItems: "end" }}>
                          <StatusPill value={customer.accountStatus} />
                          <span style={{ color: customer.hullEatsPlusActive ? "#64f0b4" : "#9fb2c9", fontSize: 13, fontWeight: 900 }}>
                            {customer.hullEatsPlusActive ? "Hull Eats+ active" : `Subscription: ${customer.subscriptionStatus}`}
                          </span>
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
                        <button
                          type="button"
                          style={styles.buttonPrimary}
                          onClick={() =>
                            void handleUpdateCustomer(customer, {
                              hullEatsPlusActive: true,
                              subscriptionStatus: "active",
                              overrideReason: "Manual Hull Eats+ access from admin",
                            })
                          }
                        >
                          Enable Hull Eats+
                        </button>
                        <button
                          type="button"
                          style={styles.buttonGlass}
                          onClick={() =>
                            void handleUpdateCustomer(customer, {
                              hullEatsPlusActive: false,
                              subscriptionStatus: "unpaid",
                              overrideReason: "Subscription unpaid or manually suspended",
                            })
                          }
                        >
                          Suspend +
                        </button>
                        <button
                          type="button"
                          style={styles.buttonGlass}
                          onClick={() => void handleUpdateCustomer(customer, { accountStatus: "suspended", manualReviewRequired: true })}
                        >
                          Suspend account
                        </button>
                        <button
                          type="button"
                          style={styles.buttonGlass}
                          onClick={() => void handleUpdateCustomer(customer, { accountStatus: "active", manualReviewRequired: false })}
                        >
                          Restore
                        </button>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section style={styles.sectionCard}>
              <SectionHeading
                eyebrow="Unassigned couriers"
                title="Courier accounts without a hub"
                copy="If a courier loses all assignments they remain visible here until re-linked or removed."
              />
              <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
                {unassignedCouriers.length === 0 ? (
                  <EmptyState title="No unassigned couriers" copy="All courier accounts are currently linked to at least one hub." />
                ) : (
                  unassignedCouriers.map((courier) => (
                    <article
                      key={courier.courierProfileId}
                      style={{
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        padding: 14,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                        <div>
                          <strong>{courier.fullName}</strong>
                          <p style={{ margin: "6px 0 0", color: "#9fb2c9" }}>
                            {courier.email} / {courier.vehicleType}
                          </p>
                        </div>
                        <StatusPill value={courier.status} />
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>

            <section style={styles.sectionCard}>
              <SectionHeading eyebrow="Provisioned access" title="Hub users" copy="Quick view of current business users from the live API." />
              <div style={{ display: "grid", gap: 12, marginTop: 16, maxHeight: 320, overflow: "auto", paddingRight: 4 }}>
                {platformUsers.length === 0 ? (
                  <EmptyState title="No hub users found" copy="Users created for merchant hubs will appear here." />
                ) : (
                  platformUsers.map((user) => (
                    <article
                      key={user.id}
                      style={{
                        borderRadius: 18,
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "rgba(255,255,255,0.04)",
                        padding: 14,
                      }}
                    >
                      <strong>{user.fullName}</strong>
                      <div style={{ marginTop: 8, display: "grid", gap: 4, color: "#9fb2c9", fontSize: 14 }}>
                        <span>{user.email}</span>
                        <span>{user.role.replaceAll("_", " ")}</span>
                        <span>{user.hub}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </section>
          </section>
        </section>

        {courierNotice ? (
          <section style={{ ...styles.sectionCard, marginTop: 18 }}>
            <p style={{ margin: 0, color: "#dce9ff", lineHeight: 1.7 }}>{courierNotice}</p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
