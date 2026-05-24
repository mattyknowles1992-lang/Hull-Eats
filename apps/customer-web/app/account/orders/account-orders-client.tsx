"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { fetchCustomerAccount, splitOrders } from "../../../src/lib/customer-account";
import { getBrowserSupabaseClient } from "../../../src/lib/supabase-browser";

const formatMoney = (value: number | string, currency = "GBP") =>
  new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
  }).format(Number(value));

export function AccountOrdersClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [signedOut, setSignedOut] = useState(false);
  const [currentOrders, setCurrentOrders] = useState<ReturnType<typeof splitOrders>["current"]>([]);
  const [previousOrders, setPreviousOrders] = useState<ReturnType<typeof splitOrders>["previous"]>([]);

  const loadOrders = useCallback(async () => {
    const supabase = getBrowserSupabaseClient();
    const { data: sessionData } = await supabase.auth.getSession();

    if (!sessionData.session?.user.id) {
      setSignedOut(true);
      setCurrentOrders([]);
      setPreviousOrders([]);
      setIsLoading(false);
      return;
    }

    const snapshot = await fetchCustomerAccount(supabase);
    if (!snapshot) {
      setSignedOut(true);
      setIsLoading(false);
      return;
    }

    const split = splitOrders(snapshot.orders);
    setCurrentOrders(split.current);
    setPreviousOrders(split.previous);
    setSignedOut(false);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadOrders().catch(() => setIsLoading(false));
  }, [loadOrders]);

  const renderOrderCard = (order: (typeof previousOrders)[number]) => (
    <article className="checkout-summary" key={order.id}>
      <div className="glance-row">
        <span className="muted-copy">{new Date(order.placed_at).toLocaleString("en-GB")}</span>
        <strong>{formatMoney(order.total_amount, order.currency)}</strong>
      </div>
      <div className="glance-row">
        <span>{order.order_number}</span>
        <strong>{order.status.replaceAll("_", " ")}</strong>
      </div>
      <Link href={`/track/${order.order_number}`} className="secondary-button account-order-track-link">
        Track or view order
      </Link>
    </article>
  );

  if (isLoading) {
    return <p className="form-helper">Loading orders...</p>;
  }

  if (signedOut) {
    return (
      <div className="register-form">
        <p className="form-helper">Sign in to see your order history.</p>
        <Link href="/account" className="primary-button" style={{ width: "100%", display: "inline-block", textAlign: "center", textDecoration: "none" }}>
          Go to My account
        </Link>
      </div>
    );
  }

  return (
    <div className="register-form">
      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Current orders</h3>
        </div>
        {currentOrders.length > 0 ? currentOrders.map(renderOrderCard) : <p className="form-helper">No active orders.</p>}
      </div>

      <div className="register-form-block">
        <div className="register-form-heading">
          <h3>Previous orders</h3>
        </div>
        {previousOrders.length > 0 ? previousOrders.map(renderOrderCard) : <p className="form-helper">No previous orders yet.</p>}
      </div>

      <Link href="/account" className="ghost-link">
        Back to My account
      </Link>
    </div>
  );
}
