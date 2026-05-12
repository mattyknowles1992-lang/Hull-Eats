"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient } from "../../src/lib/supabase-browser";

type CustomerProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
};

type CustomerAddressRow = {
  id: string;
  label: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  postcode: string;
  delivery_notes: string | null;
  is_default: boolean;
};

type CustomerOrderRow = {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method: string | null;
  total_amount: number | string;
  currency: string;
  placed_at: string;
  store_id: string;
};

const completedOrderStatuses = new Set(["delivered", "cancelled", "rejected"]);

const formatMoney = (value: number | string, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(value));

export function AccountClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [profile, setProfile] = useState<CustomerProfileRow | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddressRow[]>([]);
  const [orders, setOrders] = useState<CustomerOrderRow[]>([]);
  const [notice, setNotice] = useState("");
  const [sessionWithoutProfile, setSessionWithoutProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const loadAccount = async () => {
    const supabase = getBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setProfile(null);
      setAddresses([]);
      setOrders([]);
      setSessionWithoutProfile(false);
      setIsLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("customer_profiles")
      .select("id,email,full_name,phone,account_status")
      .eq("supabase_auth_user_id", userId)
      .single();

    if (profileError || !profileData) {
      setProfile(null);
      setAddresses([]);
      setOrders([]);
      setSessionWithoutProfile(true);
      setNotice(
        "Your login works, but we could not load your Hull Eats profile from the database yet. If you just signed up, wait a moment and refresh this page.",
      );
      setIsLoading(false);
      return;
    }

    setSessionWithoutProfile(false);

    const customerProfile = profileData as unknown as CustomerProfileRow;

    const { data: addressData } = await supabase
      .from("customer_addresses")
      .select("id,label,address_line_1,address_line_2,city,postcode,delivery_notes,is_default")
      .eq("customer_profile_id", customerProfile.id)
      .order("is_default", { ascending: false });

    const { data: profileOrderData } = await supabase
      .from("orders")
      .select("id,order_number,status,payment_status,payment_method,total_amount,currency,placed_at,store_id")
      .eq("customer_profile_id", customerProfile.id)
      .order("placed_at", { ascending: false });

    const { data: emailOrderData } = await supabase
      .from("orders")
      .select("id,order_number,status,payment_status,payment_method,total_amount,currency,placed_at,store_id")
      .is("customer_profile_id", null)
      .eq("customer_email", customerProfile.email)
      .order("placed_at", { ascending: false });

    const orderMap = new Map<string, CustomerOrderRow>();
    [...((profileOrderData ?? []) as CustomerOrderRow[]), ...((emailOrderData ?? []) as CustomerOrderRow[])].forEach((order) => {
      orderMap.set(order.id, order);
    });

    setProfile(customerProfile);
    setAddresses((addressData ?? []) as CustomerAddressRow[]);
    setOrders(Array.from(orderMap.values()).sort((first, second) => Date.parse(second.placed_at) - Date.parse(first.placed_at)));
    setIsLoading(false);
  };

  useEffect(() => {
    void loadAccount().catch((error) => {
      setNotice(error instanceof Error ? error.message : "Unable to load account.");
      setSessionWithoutProfile(false);
      setIsLoading(false);
    });
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
    setSessionWithoutProfile(false);
    setIsLoading(true);

    try {
      const supabase = getBrowserSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        throw error;
      }

      await loadAccount();
      setPassword("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Sign in failed.");
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    setProfile(null);
    setAddresses([]);
    setOrders([]);
    setSessionWithoutProfile(false);
    setNotice("");
  };

  if (isLoading) {
    return <p className="form-helper">Loading account...</p>;
  }

  if (!profile) {
    return (
      <div className="register-form">
        <form onSubmit={handleLogin}>
          <div className="register-form-block">
            <div className="register-form-heading">
              <h3>Sign in</h3>
              <p>Use the same login for Hull Eats, Hull Services, Hull Marketplace, and the customer app.</p>
            </div>
            <label className="form-field">
              <span>Email address</span>
              <input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
            </label>
            <label className="form-field form-field-password">
              <span>Password</span>
              <div className="form-password-wrap">
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="form-password-toggle" onClick={() => setShowPassword((current) => !current)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          </div>
          {notice ? (
            <p className={sessionWithoutProfile ? "form-message" : "form-message form-message-error"}>{notice}</p>
          ) : null}
          <button type="submit" className="primary-button" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>

        {sessionWithoutProfile ? (
          <div className="register-form-block" style={{ marginTop: 20 }}>
            <button type="button" className="secondary-button" style={{ width: "100%" }} onClick={() => void handleLogout()}>
              Sign out and try another email
            </button>
          </div>
        ) : null}

        <div className="register-form-block" style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="register-form-heading">
            <h3>New customer?</h3>
            <p>Create an account with your details and delivery address. Your profile is stored securely and appears in Hull Eats admin for support and safety checks.</p>
          </div>
          <Link href="/register" className="primary-button" style={{ width: "100%", display: "inline-block", textAlign: "center", textDecoration: "none" }}>
            Create account
          </Link>
          <p className="form-helper" style={{ marginTop: 12 }}>
            Registration collects the customer details shown in the Hull Eats admin console: contact, address, and optional marketing consent.
          </p>
        </div>
      </div>
    );
  }

  const currentOrders = orders.filter((order) => !completedOrderStatuses.has(order.status));
  const previousOrders = orders.filter((order) => completedOrderStatuses.has(order.status));

  const renderOrderCard = (order: CustomerOrderRow) => (
    <article className="checkout-summary" key={order.id}>
      <div className="glance-row">
        <span className="muted-copy">{new Date(order.placed_at).toLocaleString("en-GB")}</span>
        <strong>{formatMoney(order.total_amount, order.currency)}</strong>
      </div>
      <div className="glance-row">
        <span>{order.order_number}</span>
        <strong>{order.status.replaceAll("_", " ")}</strong>
      </div>
      <p className="form-helper">
        Payment: {order.payment_status.replaceAll("_", " ")} / {(order.payment_method ?? "dojo_card").replaceAll("_", " ")}
      </p>
      <Link href={`/track/${order.order_number}`} className="secondary-button" style={{ width: "100%", marginTop: 12, display: "inline-flex" }}>
        Track or view order
      </Link>
    </article>
  );

  return (
    <div className="register-form">
      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>{profile.full_name ?? "Customer"}</h3>
          <p>{profile.email}</p>
        </div>
        <div className="checkout-summary">
          <div className="glance-row">
            <span className="muted-copy">Account status</span>
            <strong>{profile.account_status}</strong>
          </div>
          <div className="glance-row">
            <span className="muted-copy">Phone</span>
            <strong>{profile.phone ?? "Not saved"}</strong>
          </div>
        </div>
      </div>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Current orders</h3>
          <p>Orders stay here while they are active, so refreshing the page will not lose them.</p>
        </div>
        {currentOrders.length > 0 ? currentOrders.map(renderOrderCard) : <p className="form-helper">No current orders.</p>}
      </div>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Previous orders</h3>
          <p>Delivered, cancelled, and rejected orders are kept for your records.</p>
        </div>
        {previousOrders.length > 0 ? previousOrders.map(renderOrderCard) : <p className="form-helper">No previous orders yet.</p>}
      </div>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Saved addresses</h3>
          <p>Checkout can use these details to prefill delivery information.</p>
        </div>
        {addresses.map((address) => (
          <article className="checkout-summary" key={address.id}>
            <div className="glance-row">
              <span className="muted-copy">{address.label}</span>
              <strong>{address.is_default ? "Default" : "Saved"}</strong>
            </div>
            <p className="form-helper">
              {[address.address_line_1, address.address_line_2, address.city, address.postcode].filter(Boolean).join(", ")}
            </p>
          </article>
        ))}
      </div>

      {notice ? <p className="form-message form-message-error">{notice}</p> : null}
      <button type="button" className="secondary-button" onClick={handleLogout}>
        Sign out
      </button>
    </div>
  );
}
