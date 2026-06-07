"use client";

import { useState } from "react";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");
const partnerInboxEmail = "partner-no-email@hulleats.co.uk";

type PreferredContactMethod = "email" | "phone" | "text";

export function PartnerForm() {
  const [preferredContactMethod, setPreferredContactMethod] = useState<PreferredContactMethod>("email");
  const [businessPostcode, setBusinessPostcode] = useState("");
  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const handleSubmit = async () => {
    const postcode = businessPostcode.trim().toUpperCase();
    if (!postcode) {
      setNotice("Add your business postcode so we can check Hull coverage.");
      return;
    }

    const email = senderEmail.trim().toLowerCase();
    const phone = senderPhone.trim();
    const name = senderName.trim();

    if (preferredContactMethod === "email" && !email) {
      setNotice("Add an email address if email is your preferred contact method.");
      return;
    }

    if ((preferredContactMethod === "phone" || preferredContactMethod === "text") && !phone) {
      setNotice("Add a phone number if phone or text is your preferred contact method.");
      return;
    }

    const preferredLabel =
      preferredContactMethod === "email" ? "Email" : preferredContactMethod === "phone" ? "Phone call" : "Text message";

    const composedMessage = [
      `Preferred contact method: ${preferredLabel}`,
      `Business postcode: ${postcode}`,
      name ? `Contact name: ${name}` : null,
      email ? `Email: ${email}` : null,
      phone ? `Phone: ${phone}` : null,
      "",
      message.trim() || "(No additional message provided)",
    ]
      .filter((line) => line !== null)
      .join("\n");

    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch(`${apiBaseUrl}/v1/public/contact-messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          origin: "customer_web",
          senderName: name || "Partner enquiry",
          senderEmail: email || partnerInboxEmail,
          senderPhone: phone,
          subject: `Partner enquiry — ${postcode}`,
          message: composedMessage,
          sourcePath: "/partner",
        }),
      });

      if (!response.ok) {
        throw new Error(`Partner enquiry failed with status ${response.status}`);
      }

      setBusinessPostcode("");
      setSenderName("");
      setSenderEmail("");
      setSenderPhone("");
      setMessage("");
      setNotice("Thanks — we have your enquiry. Our team will be in touch using your preferred contact method.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Partner enquiry failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="marketing-partner-form" aria-labelledby="partner-form-title">
      <div className="marketing-partner-form__header">
        <h2 id="partner-form-title">Partner enquiry form</h2>
        <p>Tell us about your Hull business. Fields marked optional can be left blank if you prefer.</p>
      </div>

      <fieldset className="marketing-partner-form__fieldset">
        <legend>How should we contact you?</legend>
        <div className="marketing-partner-form__choices">
          <label className="marketing-partner-form__choice">
            <input
              type="radio"
              name="preferredContactMethod"
              value="email"
              checked={preferredContactMethod === "email"}
              onChange={() => setPreferredContactMethod("email")}
            />
            <span>Email</span>
          </label>
          <label className="marketing-partner-form__choice">
            <input
              type="radio"
              name="preferredContactMethod"
              value="phone"
              checked={preferredContactMethod === "phone"}
              onChange={() => setPreferredContactMethod("phone")}
            />
            <span>Phone call</span>
          </label>
          <label className="marketing-partner-form__choice">
            <input
              type="radio"
              name="preferredContactMethod"
              value="text"
              checked={preferredContactMethod === "text"}
              onChange={() => setPreferredContactMethod("text")}
            />
            <span>Text message</span>
          </label>
        </div>
      </fieldset>

      <div className="marketing-partner-form__grid">
        <label className="marketing-partner-form__field">
          <span>Business postcode</span>
          <input
            value={businessPostcode}
            onChange={(event) => setBusinessPostcode(event.target.value)}
            placeholder="e.g. HU1 2AB"
            autoComplete="postal-code"
            required
          />
        </label>
        <label className="marketing-partner-form__field">
          <span>Your name (optional)</span>
          <input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Who should we ask for?" />
        </label>
        <label className="marketing-partner-form__field">
          <span>Email (optional)</span>
          <input
            type="email"
            value={senderEmail}
            onChange={(event) => setSenderEmail(event.target.value)}
            placeholder="you@business.co.uk"
            autoComplete="email"
          />
        </label>
        <label className="marketing-partner-form__field">
          <span>Phone number (optional)</span>
          <input
            type="tel"
            value={senderPhone}
            onChange={(event) => setSenderPhone(event.target.value)}
            placeholder="07…"
            autoComplete="tel"
          />
        </label>
      </div>

      <label className="marketing-partner-form__field">
        <span>Your message (optional)</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us about your business, menu, or how you would like to use Hull Eats."
          rows={6}
        />
      </label>

      <div className="marketing-partner-form__footer">
        <button type="button" className="primary-button" disabled={submitting} onClick={() => void handleSubmit()}>
          {submitting ? "Sending..." : "Send partner enquiry"}
        </button>
        <p className="form-helper">We only onboard businesses in Hull. If your postcode is outside our area, we will still let you know.</p>
      </div>

      {notice ? <p className="marketing-partner-form__notice">{notice}</p> : null}
    </section>
  );
}
