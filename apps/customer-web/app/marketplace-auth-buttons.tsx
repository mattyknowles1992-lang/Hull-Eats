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
        <span className="topbar-auth-skeleton-pill" />
      </div>
    );
  }

  if (hasSession) {
    return (
      <div className="topbar-auth-actions topbar-auth-single">
        <Link href="/account" className="icon-button">
          Account
        </Link>
      </div>
    );
  }

  return (
    <div className="topbar-auth-actions topbar-auth-pair">
      <Link href="/account" className="glass-button">
        Sign in
      </Link>
      <Link href="/register" className="glass-button">
        Sign up
      </Link>
    </div>
  );
}
