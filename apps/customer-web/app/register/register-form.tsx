"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { getBrowserSupabaseClient } from "../../src/lib/supabase-browser";

type DeliveryPlan = "pay_as_you_go" | "hull_eats_plus";

type FormState = {
  fullName: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  addressLabel: string;
  promoCode: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  postcode: string;
  deliveryNotes: string;
  deliveryPlan: DeliveryPlan;
  marketingOptIn: boolean;
  termsAccepted: boolean;
};

const initialState: FormState = {
  fullName: "",
  phone: "",
  email: "",
  password: "",
  confirmPassword: "",
  addressLabel: "Home",
  promoCode: "",
  addressLine1: "",
  addressLine2: "",
  city: "Hull",
  postcode: "",
  deliveryNotes: "",
  deliveryPlan: "pay_as_you_go",
  marketingOptIn: false,
  termsAccepted: false,
};

export function RegisterForm() {
  const [formState, setFormState] = useState<FormState>(initialState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const updateField = <K extends keyof FormState>(field: K, value: FormState[K]) => {
    setFormState((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (formState.password !== formState.confirmPassword) {
        throw new Error("Passwords must match before we create the account.");
      }

      if (!formState.termsAccepted) {
        throw new Error("Please accept the Hull Eats customer terms before creating an account.");
      }

      const acceptedAt = new Date().toISOString();
      const supabase = getBrowserSupabaseClient();
      const { error } = await supabase.auth.signUp({
        email: formState.email.trim(),
        password: formState.password,
        options: {
          emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/register` : undefined,
          data: {
            full_name: formState.fullName.trim(),
            phone: formState.phone.trim(),
            marketing_opt_in: formState.marketingOptIn,
            preferred_delivery_plan: formState.deliveryPlan,
            signup_promo_code: formState.promoCode.trim() || null,
            address_label: formState.addressLabel.trim() || "Home",
            address_type: "home",
            address_line_1: formState.addressLine1.trim(),
            address_line_2: formState.addressLine2.trim() || null,
            city: formState.city.trim(),
            postcode: formState.postcode.trim(),
            delivery_notes: formState.deliveryNotes.trim() || null,
            terms_accepted_at: acceptedAt,
            privacy_accepted_at: acceptedAt,
          },
        },
      });

      if (error) {
        throw error;
      }

      setSuccessMessage(
        formState.deliveryPlan === "hull_eats_plus"
          ? "Account created. Check your email to verify it before activating Hull Eats+."
          : "Account created. Check your email to verify your address and finish setup.",
      );
      setFormState(initialState);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong while creating your account.";
      setErrorMessage(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="register-form" onSubmit={handleSubmit}>
      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Your details</h3>
          <p>Use the details you want to order with.</p>
        </div>

      <div className="form-grid">
        <label className="form-field">
          <span>Full name</span>
          <input
            className="form-input"
            type="text"
            placeholder="Jamie Taylor"
            value={formState.fullName}
            onChange={(event) => updateField("fullName", event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Mobile number</span>
          <input
            className="form-input"
            type="tel"
            placeholder="07400 123456"
            value={formState.phone}
            onChange={(event) => updateField("phone", event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Email address</span>
          <input
            className="form-input"
            type="email"
            placeholder="jamie@example.com"
            value={formState.email}
            onChange={(event) => updateField("email", event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Password</span>
          <input
            className="form-input"
            type="password"
            placeholder="At least 10 characters"
            value={formState.password}
            onChange={(event) => updateField("password", event.target.value)}
            minLength={10}
            required
          />
        </label>

        <label className="form-field">
          <span>Confirm password</span>
          <input
            className="form-input"
            type="password"
            placeholder="Repeat password"
            value={formState.confirmPassword}
            onChange={(event) => updateField("confirmPassword", event.target.value)}
            minLength={10}
            required
          />
        </label>
      </div>
      </div>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Delivery address</h3>
          <p>This becomes your saved address for ordering.</p>
        </div>

      <div className="form-grid">
        <label className="form-field">
          <span>Address label</span>
          <input
            className="form-input"
            type="text"
            placeholder="Home"
            value={formState.addressLabel}
            onChange={(event) => updateField("addressLabel", event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Promo code</span>
          <input
            className="form-input"
            type="text"
            placeholder="Optional"
            value={formState.promoCode}
            onChange={(event) => updateField("promoCode", event.target.value)}
          />
        </label>

        <label className="form-field form-field-full">
          <span>Address line 1</span>
          <input
            className="form-input"
            type="text"
            placeholder="14 Marina Walk"
            value={formState.addressLine1}
            onChange={(event) => updateField("addressLine1", event.target.value)}
            required
          />
        </label>

        <label className="form-field form-field-full">
          <span>Address line 2</span>
          <input
            className="form-input"
            type="text"
            placeholder="Apartment, building, or extra info"
            value={formState.addressLine2}
            onChange={(event) => updateField("addressLine2", event.target.value)}
          />
        </label>

        <label className="form-field">
          <span>City</span>
          <input
            className="form-input"
            type="text"
            placeholder="Hull"
            value={formState.city}
            onChange={(event) => updateField("city", event.target.value)}
            required
          />
        </label>

        <label className="form-field">
          <span>Postcode</span>
          <input
            className="form-input"
            type="text"
            placeholder="HU1 2AB"
            value={formState.postcode}
            onChange={(event) => updateField("postcode", event.target.value)}
            required
          />
        </label>

        <label className="form-field form-field-full">
          <span>Delivery notes</span>
          <textarea
            className="form-input form-textarea"
            placeholder="Gate code, floor, or driver note"
            value={formState.deliveryNotes}
            onChange={(event) => updateField("deliveryNotes", event.target.value)}
          />
        </label>
      </div>
      </div>

      <div className="section-heading compact register-subheading">
        <div>
          <h2>Choose delivery plan</h2>
          <p>Pick the option you want to start with. You can change this later.</p>
        </div>
      </div>

      <div className="plan-grid">
        <label className="plan-card">
          <input
            type="radio"
            name="deliveryPlan"
            checked={formState.deliveryPlan === "pay_as_you_go"}
            onChange={() => updateField("deliveryPlan", "pay_as_you_go")}
          />
          <div className="plan-card-copy">
            <div className="plan-card-top">
              <strong>Pay as you go</strong>
              <span>Standard delivery fees apply</span>
            </div>
            <p>Create an account, order whenever you want, and pay the delivery fee per order.</p>
          </div>
        </label>

        <label className="plan-card is-featured">
          <input
            type="radio"
            name="deliveryPlan"
            checked={formState.deliveryPlan === "hull_eats_plus"}
            onChange={() => updateField("deliveryPlan", "hull_eats_plus")}
          />
          <div className="plan-card-copy">
            <div className="plan-card-top">
              <strong>Hull Eats+</strong>
              <span>£9.99 / month</span>
            </div>
            <p>Unlimited free delivery on eligible orders after your email address is verified.</p>
          </div>
        </label>
      </div>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={formState.marketingOptIn}
          onChange={(event) => updateField("marketingOptIn", event.target.checked)}
        />
        <span>Send me offers, launch updates, and local business promotions.</span>
      </label>

      <label className="toggle-row">
        <input
          type="checkbox"
          checked={formState.termsAccepted}
          onChange={(event) => updateField("termsAccepted", event.target.checked)}
          required
        />
        <span>I agree to Hull Eats storing my account and address details securely for ordering, support, subscriptions, and marketplace safety.</span>
      </label>

      <p className="form-helper">
        Your password is handled securely by Supabase Auth. Hull Eats stores your profile and saved addresses so checkout,
        support, subscriptions, and marketplace safety work properly. Card details stay with Stripe.
      </p>

      {errorMessage ? <p className="form-message form-message-error">{errorMessage}</p> : null}
      {successMessage ? <p className="form-message form-message-success">{successMessage}</p> : null}

      <button type="submit" className="primary-button" style={{ width: "100%" }} disabled={isSubmitting}>
        {isSubmitting ? "Creating account..." : "Create account and continue"}
      </button>
    </form>
  );
}
