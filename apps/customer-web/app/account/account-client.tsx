"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { SensoryDelightsToggle } from "../../src/components/sensory-delights-toggle";
import {
  addCustomerAddress,
  fetchCustomerAccount,
  requestPasswordResetEmail,
  setDefaultCustomerAddress,
  splitOrders,
  updateCustomerProfileDetails,
  updateSignedInPassword,
  type CustomerAccountSnapshot,
  type CustomerAddressRow,
  type CustomerProfileRow,
  type NewAddressInput,
} from "../../src/lib/customer-account";
import { getBrowserSupabaseClient } from "../../src/lib/supabase-browser";

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
  const [orders, setOrders] = useState<CustomerAccountSnapshot["orders"]>([]);
  const [notice, setNotice] = useState("");
  const [noticeIsError, setNoticeIsError] = useState(false);
  const [sessionWithoutProfile, setSessionWithoutProfile] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [forgotEmail, setForgotEmail] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [addressForm, setAddressForm] = useState<NewAddressInput>({
    label: "Home",
    fullName: "",
    phone: "",
    addressLine1: "",
    addressLine2: "",
    city: "Hull",
    postcode: "",
    deliveryNotes: "",
    makeDefault: false,
  });

  const showNotice = (message: string, isError = false) => {
    setNotice(message);
    setNoticeIsError(isError);
  };

  const applySnapshot = (snapshot: CustomerAccountSnapshot | null) => {
    if (!snapshot) {
      setProfile(null);
      setAddresses([]);
      setOrders([]);
      return;
    }
    setProfile(snapshot.profile);
    setAddresses(snapshot.addresses);
    setOrders(snapshot.orders);
    setEditName(snapshot.profile.full_name ?? "");
    setEditPhone(snapshot.profile.phone ?? "");
    setAddressForm((current) => ({
      ...current,
      fullName: snapshot.profile.full_name ?? current.fullName,
      phone: snapshot.profile.phone ?? current.phone,
    }));
  };

  const loadAccount = useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      applySnapshot(null);
      setSessionWithoutProfile(false);
      setIsLoading(false);
      return;
    }

    const snapshot = await fetchCustomerAccount(supabase);
    if (!snapshot) {
      applySnapshot(null);
      setSessionWithoutProfile(true);
      showNotice(
        "Your sign-in worked, but your Hull Eats profile is still syncing. Wait a few seconds and refresh — or sign out and try again.",
        true,
      );
      setIsLoading(false);
      return;
    }

    setSessionWithoutProfile(false);
    applySnapshot(snapshot);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadAccount().catch((error) => {
      showNotice(error instanceof Error ? error.message : "Unable to load account.", true);
      setIsLoading(false);
    });

    const supabase = getBrowserSupabaseClient();
    const { data: listener } = supabase.auth.onAuthStateChange(() => {
      void loadAccount();
    });

    return () => listener.subscription.unsubscribe();
  }, [loadAccount]);

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
      showNotice("Signed in. Your orders and saved addresses are ready on this device.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Sign in failed. Check your email and password.", true);
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const targetEmail = (forgotEmail || email).trim();
    if (!targetEmail) {
      showNotice("Enter your email address first.", true);
      return;
    }

    try {
      const supabase = getBrowserSupabaseClient();
      const redirectTo =
        typeof window !== "undefined" ? `${window.location.origin}/account/update-password` : undefined;
      await requestPasswordResetEmail(supabase, targetEmail, redirectTo ?? "");
      showNotice("If that email is registered, we sent a reset link. Check your inbox and spam folder.");
      setShowForgotPassword(false);
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not send reset email.", true);
    }
  };

  const handleLogout = async () => {
    const supabase = getBrowserSupabaseClient();
    await supabase.auth.signOut();
    applySnapshot(null);
    setSessionWithoutProfile(false);
    setNotice("");
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await updateCustomerProfileDetails(supabase, profile.id, {
        fullName: editName,
        phone: editPhone,
      });
      await loadAccount();
      showNotice("Profile updated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not update profile.", true);
    }
  };

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword.length < 8) {
      showNotice("New password must be at least 8 characters.", true);
      return;
    }
    if (newPassword !== confirmNewPassword) {
      showNotice("New passwords must match.", true);
      return;
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await updateSignedInPassword(supabase, newPassword);
      setNewPassword("");
      setConfirmNewPassword("");
      showNotice("Password updated. Use it next time you sign in on any device.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not change password.", true);
    }
  };

  const handleAddAddress = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!profile) {
      return;
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await addCustomerAddress(supabase, profile.id, addressForm);
      await loadAccount();
      showNotice("Address saved.");
      setAddressForm((current) => ({
        ...current,
        addressLine1: "",
        addressLine2: "",
        postcode: "",
        deliveryNotes: "",
        makeDefault: false,
      }));
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not save address.", true);
    }
  };

  const handleSetDefaultAddress = async (addressId: string) => {
    if (!profile) {
      return;
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await setDefaultCustomerAddress(supabase, profile.id, addressId);
      await loadAccount();
      showNotice("Default address updated.");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "Could not update default address.", true);
    }
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
              <p>One Hull Eats account works on the website and the mobile app. Sign in on any device — your orders and addresses stay in sync.</p>
            </div>
            <label className="form-field">
              <span>Email address</span>
              <input className="form-input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <label className="form-field form-field-password">
              <span>Password</span>
              <div className="form-password-wrap">
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
                <button type="button" className="form-password-toggle" onClick={() => setShowPassword((v) => !v)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </label>
          </div>
          {notice ? (
            <p className={noticeIsError ? "form-message form-message-error" : "form-message form-message-success"}>{notice}</p>
          ) : null}
          <button type="submit" className="primary-button" style={{ width: "100%" }}>
            Sign in
          </button>
        </form>

        <div className="register-form-block" style={{ marginTop: 16 }}>
          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword}>
              <p className="form-helper">We will email a secure link to set a new password. No email verification step — just reset and sign in.</p>
              <label className="form-field">
                <span>Email for reset link</span>
                <input
                  className="form-input"
                  type="email"
                  value={forgotEmail || email}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  required
                />
              </label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="submit" className="secondary-button">
                  Send reset link
                </button>
                <button type="button" className="ghost-link" style={{ border: "none", background: "transparent" }} onClick={() => setShowForgotPassword(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="secondary-button" style={{ width: "100%" }} onClick={() => setShowForgotPassword(true)}>
              Forgot password?
            </button>
          )}
        </div>

        <p className="form-helper" style={{ marginTop: 16 }}>
          <Link href="/legal/terms-hull-eats" className="ghost-link">
            Terms
          </Link>
          {" · "}
          <Link href="/legal/privacy" className="ghost-link">
            Privacy
          </Link>
        </p>

        {sessionWithoutProfile ? (
          <div className="register-form-block" style={{ marginTop: 20 }}>
            <button type="button" className="secondary-button" style={{ width: "100%" }} onClick={() => void handleLogout()}>
              Sign out and try another email
            </button>
          </div>
        ) : null}

        <div className="register-form-block" style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="register-form-heading">
            <h3>New to Hull Eats?</h3>
            <p>Create an account with your details and delivery address. You can order straight away — no email verification step.</p>
          </div>
          <Link href="/register" className="primary-button" style={{ width: "100%", display: "inline-block", textAlign: "center", textDecoration: "none" }}>
            Create account
          </Link>
        </div>
      </div>
    );
  }

  const { current: currentOrders, previous: previousOrders } = splitOrders(orders);

  const renderOrderCard = (order: (typeof orders)[number]) => (
    <article className="checkout-summary" key={order.id}>
      <div className="glance-row">
        <span className="muted-copy">{new Date(order.placed_at).toLocaleString("en-GB")}</span>
        <strong>{formatMoney(order.total_amount, order.currency)}</strong>
      </div>
      <div className="glance-row">
        <span>{order.order_number}</span>
        <strong>{order.status.replaceAll("_", " ")}</strong>
      </div>
      <Link href={`/track/${order.order_number}`} className="secondary-button" style={{ width: "100%", marginTop: 12, display: "inline-flex" }}>
        Track or view order
      </Link>
    </article>
  );

  return (
    <div className="register-form">
      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>{profile.full_name ?? "Your account"}</h3>
          <p>{profile.email}</p>
        </div>
        <div className="checkout-summary">
          <div className="glance-row">
            <span className="muted-copy">Status</span>
            <strong>{profile.account_status}</strong>
          </div>
        </div>
      </div>

      <form className="register-form-block" onSubmit={handleSaveProfile}>
        <div className="register-form-heading">
          <h3>Your details</h3>
          <p>Updates apply on every device after you save.</p>
        </div>
        <label className="form-field">
          <span>Full name</span>
          <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} required />
        </label>
        <label className="form-field">
          <span>Mobile</span>
          <input className="form-input" type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} required />
        </label>
        <button type="submit" className="secondary-button">
          Save details
        </button>
      </form>

      <form className="register-form-block" onSubmit={handleChangePassword}>
        <div className="register-form-heading">
          <h3>Change password</h3>
        </div>
        <label className="form-field">
          <span>New password</span>
          <input className="form-input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} minLength={8} autoComplete="new-password" />
        </label>
        <label className="form-field">
          <span>Confirm new password</span>
          <input
            className="form-input"
            type="password"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            minLength={8}
            autoComplete="new-password"
          />
        </label>
        <button type="submit" className="secondary-button">
          Update password
        </button>
      </form>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Current orders</h3>
        </div>
        {currentOrders.length > 0 ? currentOrders.map(renderOrderCard) : <p className="form-helper">No active orders.</p>}
      </div>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Previous orders</h3>
          <p>Reorder from any past order by opening the store menu again.</p>
        </div>
        {previousOrders.length > 0 ? previousOrders.map(renderOrderCard) : <p className="form-helper">No previous orders yet.</p>}
      </div>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Saved addresses</h3>
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
            {!address.is_default ? (
              <button type="button" className="secondary-button" style={{ marginTop: 8 }} onClick={() => void handleSetDefaultAddress(address.id)}>
                Make default
              </button>
            ) : null}
          </article>
        ))}
      </div>

      <form className="register-form-block" onSubmit={handleAddAddress}>
        <div className="register-form-heading">
          <h3>Add another address</h3>
        </div>
        <label className="form-field">
          <span>Label</span>
          <input className="form-input" value={addressForm.label} onChange={(e) => setAddressForm({ ...addressForm, label: e.target.value })} />
        </label>
        <label className="form-field">
          <span>Address line 1</span>
          <input
            className="form-input"
            value={addressForm.addressLine1}
            onChange={(e) => setAddressForm({ ...addressForm, addressLine1: e.target.value })}
            required
          />
        </label>
        <label className="form-field">
          <span>Postcode</span>
          <input
            className="form-input"
            value={addressForm.postcode}
            onChange={(e) => setAddressForm({ ...addressForm, postcode: e.target.value })}
            required
          />
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={addressForm.makeDefault}
            onChange={(e) => setAddressForm({ ...addressForm, makeDefault: e.target.checked })}
          />
          <span>Set as default delivery address</span>
        </label>
        <button type="submit" className="secondary-button">
          Add address
        </button>
      </form>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Rewards &amp; offers</h3>
          <p>Loyalty points and personal discount codes are coming soon. Store offers already apply automatically at checkout when a takeaway runs a deal.</p>
        </div>
      </div>

      <div className="register-form-block">
        <SensoryDelightsToggle />
      </div>

      <div className="register-form-block">
        <p className="form-helper">
          <Link href="/legal/privacy" className="ghost-link">
            Privacy
          </Link>
          {" · "}
          <Link href="/legal/close-account" className="ghost-link">
            Close account
          </Link>
        </p>
      </div>

      {notice ? <p className={noticeIsError ? "form-message form-message-error" : "form-message form-message-success"}>{notice}</p> : null}
      <button type="button" className="secondary-button" onClick={() => void handleLogout()}>
        Sign out
      </button>
    </div>
  );
}
