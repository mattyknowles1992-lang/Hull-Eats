"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const defaultApiBaseUrl = process.env.NODE_ENV === "production" ? "https://hull-eats-api.onrender.com" : "http://localhost:4000";
const apiBaseUrl = (process.env.NEXT_PUBLIC_API_URL ?? defaultApiBaseUrl).replace(/\/$/, "");

export function ContactForm() {
  const searchParams = useSearchParams();
  const initialOrigin = useMemo(
    () => (searchParams.get("origin") === "customer_app_via_web" ? "customer_app_via_web" : "customer_web"),
    [searchParams],
  );

  const [senderName, setSenderName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [senderPhone, setSenderPhone] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");

  const handleSubmit = async () => {
    if (!senderName.trim() || !senderEmail.trim() || !subject.trim() || !message.trim()) {
      setNotice("Add your name, email, subject, and message before sending.");
      return;
    }

    setSubmitting(true);
    setNotice("");

    try {
      const response = await fetch(`${apiBaseUrl}/v1/public/contact-messages`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        body: JSON.stringify({
          origin: initialOrigin,
          senderName: senderName.trim(),
          senderEmail: senderEmail.trim().toLowerCase(),
          senderPhone: senderPhone.trim(),
          subject: subject.trim(),
          message: message.trim(),
          orderNumber: orderNumber.trim(),
          sourcePath: typeof window !== "undefined" ? window.location.pathname + window.location.search : "/contact",
        }),
      });

      if (!response.ok) {
        throw new Error(`Contact request failed with status ${response.status}`);
      }

      setMessage("");
      setOrderNumber("");
      setSubject("");
      setNotice("Your message has been sent to the Hull Eats admin inbox.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Contact request failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="contact-submit-card">
      <div className="contact-submit-card__header">
        <h2>Send a support message</h2>
        <p>
          Your message goes straight into the Hull Eats admin inbox for triage. Include an order number if the issue is
          about a delivery or payment.
        </p>
      </div>

      <div className="contact-submit-grid">
        <label className="form-field">
          <span>Your name</span>
          <input value={senderName} onChange={(event) => setSenderName(event.target.value)} placeholder="Jane Smith" />
        </label>
        <label className="form-field">
          <span>Email</span>
          <input type="email" value={senderEmail} onChange={(event) => setSenderEmail(event.target.value)} placeholder="jane@example.com" />
        </label>
        <label className="form-field">
          <span>Phone</span>
          <input value={senderPhone} onChange={(event) => setSenderPhone(event.target.value)} placeholder="Optional" />
        </label>
        <label className="form-field">
          <span>Order number</span>
          <input value={orderNumber} onChange={(event) => setOrderNumber(event.target.value)} placeholder="HE-123456-12" />
        </label>
      </div>

      <label className="form-field">
        <span>Subject</span>
        <input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="What do you need help with?" />
      </label>

      <label className="form-field">
        <span>Message</span>
        <textarea
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Tell us what happened and what you need from us."
          rows={7}
        />
      </label>

      <div className="contact-submit-card__footer">
        <button type="button" className="primary-button" disabled={submitting} onClick={handleSubmit}>
          {submitting ? "Sending..." : "Send message"}
        </button>
        <p className="form-helper">
          {initialOrigin === "customer_app_via_web"
            ? "Sent from the shared web form opened by the customer app."
            : "Sent from the customer web support form."}
        </p>
      </div>

      {notice ? <p className="contact-submit-card__notice">{notice}</p> : null}
    </section>
  );
}
