"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { AppSwitcher } from "../../app-switcher";
import { updateSignedInPassword } from "../../../src/lib/customer-account";
import { getBrowserSupabaseClient } from "../../../src/lib/supabase-browser";

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const supabase = getBrowserSupabaseClient();

    const syncSession = (session: { user: { id: string } } | null) => {
      setReady(Boolean(session));
      if (!session) {
        setNotice("Open the reset link from your email, or sign in first if you are already logged in.");
      } else {
        setNotice("");
      }
    };

    void supabase.auth.getSession().then(({ data }) => syncSession(data.session));

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        syncSession(session);
      }
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setNotice("");

    if (password.length < 8) {
      setNotice("Choose a password with at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setNotice("Passwords must match.");
      return;
    }

    try {
      const supabase = getBrowserSupabaseClient();
      await updateSignedInPassword(supabase, password);
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not update password.");
    }
  };

  return (
    <main className="shell">
      <header className="topbar">
        <AppSwitcher />
        <div className="topbar-actions">
          <Link href="/account" className="primary-button service-back-button">
            My account
          </Link>
        </div>
      </header>

      <section className="register-grid register-grid-simple">
        <section className="feature-panel feature-panel-contrast register-intro">
          <div className="hero-badge register-badge">Account security</div>
          <h1 className="register-title">Set a new password</h1>
          <p className="register-copy">
            Use the link from your email if you forgot your password. Once saved, the same password works on every device
            and in the Hull Eats app.
          </p>
        </section>

        <section className="feature-panel register-form-panel">
          {success ? (
            <div className="register-form">
              <p className="form-message form-message-success">Password updated. You can sign in on any device with your new password.</p>
              <Link href="/account" className="primary-button" style={{ width: "100%", display: "inline-block", textAlign: "center" }}>
                Go to My account
              </Link>
            </div>
          ) : (
            <form className="register-form" onSubmit={handleSubmit}>
              <label className="form-field form-field-password">
                <span>New password</span>
                <div className="form-password-wrap">
                  <input
                    className="form-input"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    minLength={8}
                    autoComplete="new-password"
                    required
                    disabled={!ready}
                  />
                  <button type="button" className="form-password-toggle" onClick={() => setShowPassword((v) => !v)}>
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </label>
              <label className="form-field">
                <span>Confirm password</span>
                <input
                  className="form-input"
                  type={showPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  minLength={8}
                  autoComplete="new-password"
                  required
                  disabled={!ready}
                />
              </label>
              {notice ? <p className="form-message form-message-error">{notice}</p> : null}
              <button type="submit" className="primary-button" style={{ width: "100%" }} disabled={!ready}>
                Save new password
              </button>
            </form>
          )}
        </section>
      </section>
    </main>
  );
}
