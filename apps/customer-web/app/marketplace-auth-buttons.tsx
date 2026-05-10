"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { getBrowserSupabaseClient } from "../src/lib/supabase-browser";

export function MarketplaceAuthButtons() {
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    void supabase.auth.getSession().then(({ data }) => {
      setHasSession(Boolean(data.session));
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setHasSession(Boolean(session));
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  if (hasSession === null) {
    return (
      <div className="topbar-auth-actions topbar-auth-loading" aria-busy="true" aria-label="Loading sign-in status">
        <span className="topbar-auth-skeleton-pill" />
      </div>
    );
  }

  if (hasSession) {
    return (
      <div className="topbar-auth-actions">
        <Link href="/account" className="glass-button membership-nav-button">
          <span>Your account</span>
          <strong>Account</strong>
        </Link>
      </div>
    );
  }

  return (
    <div className="topbar-auth-actions">
      <Link href="/account" className="glass-button membership-nav-button">
        <span>Customer</span>
        <strong>Sign in / Sign up</strong>
      </Link>
    </div>
  );
}
