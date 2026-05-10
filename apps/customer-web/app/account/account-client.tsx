"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient } from "../../src/lib/supabase-browser";

type CustomerProfileRow = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  account_status: string;
  preferred_delivery_plan: string;
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

type SubscriptionRow = {
  status: string;
  free_delivery_active: boolean;
  admin_override: boolean;
};

export function AccountClient() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [profile, setProfile] = useState<CustomerProfileRow | null>(null);
  const [addresses, setAddresses] = useState<CustomerAddressRow[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(null);
  const [notice, setNotice] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadAccount = async () => {
    const supabase = getBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;

    if (!userId) {
      setProfile(null);
      setAddresses([]);
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    const { data: profileData, error: profileError } = await supabase
      .from("customer_profiles")
      .select("id,email,full_name,phone,account_status,preferred_delivery_plan")
      .eq("supabase_auth_user_id", userId)
      .single();

    if (profileError || !profileData) {
      throw profileError ?? new Error("Customer profile not found.");
    }

    const customerProfile = profileData as unknown as CustomerProfileRow;

    const { data: addressData } = await supabase
      .from("customer_addresses")
      .select("id,label,address_line_1,address_line_2,city,postcode,delivery_notes,is_default")
      .eq("customer_profile_id", customerProfile.id)
      .order("is_default", { ascending: false });

    const { data: subscriptionData } = await supabase
      .from("subscriptions")
      .select("status,free_delivery_active,admin_override")
      .eq("customer_profile_id", customerProfile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    setProfile(customerProfile);
    setAddresses((addressData ?? []) as CustomerAddressRow[]);
    setSubscription((subscriptionData as SubscriptionRow | null) ?? null);
    setIsLoading(false);
  };

  useEffect(() => {
    void loadAccount().catch((error) => {
      setNotice(error instanceof Error ? error.message : "Unable to load account.");
      setIsLoading(false);
    });
  }, []);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");
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
    setSubscription(null);
  };

  if (isLoading) {
    return <p className="form-helper">Loading account...</p>;
  }

  if (!profile) {
    return (
      <form className="register-form" onSubmit={handleLogin}>
        <div className="register-form-block">
          <div className="register-form-heading">
            <h3>Sign in</h3>
            <p>Use the same login for Hull Eats, Hull Services, Hull Marketplace, and the customer app.</p>
          </div>
          <label className="form-field">
            <span>Email address</span>
            <input className="form-input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label className="form-field">
            <span>Password</span>
            <input className="form-input" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </label>
        </div>
        {notice ? <p className="form-message form-message-error">{notice}</p> : null}
        <button type="submit" className="primary-button" style={{ width: "100%" }}>
          Sign in
        </button>
      </form>
    );
  }

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
            <span className="muted-copy">Hull Eats+</span>
            <strong>{subscription?.free_delivery_active ? "Active" : subscription?.status ?? "Not active"}</strong>
          </div>
          <div className="glance-row">
            <span className="muted-copy">Phone</span>
            <strong>{profile.phone ?? "Not saved"}</strong>
          </div>
        </div>
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
