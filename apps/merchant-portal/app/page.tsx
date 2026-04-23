import { AppShell, KeyValueRow, SectionCard, StatusBadge } from "@hull-eats/ui";

const inbox = [
  { id: "HE-1001", status: "pending", prepTime: "Awaiting merchant" },
  { id: "HE-1002", status: "accepted", prepTime: "10 mins" },
];

export default function MerchantPortalPage() {
  return (
    <AppShell title="Merchant Portal" eyebrow="Store order console">
      <SectionCard title="Order inbox">
        {inbox.map((order) => (
          <div key={order.id} style={{ padding: "14px 0", borderBottom: "1px solid #ddd3c5" }}>
            <KeyValueRow label="Order" value={order.id} />
            <KeyValueRow label="Status" value={<StatusBadge status={order.status} />} />
            <KeyValueRow label="Prep time" value={order.prepTime} />
          </div>
        ))}
      </SectionCard>
      <SectionCard title="Printer abstraction">
        <p style={{ marginTop: 0, color: "#6a645d" }}>
          Merchant printing is routed through the shared printer package so mock, ESC/POS, and future cloud bridges all use the same application flow.
        </p>
      </SectionCard>
    </AppShell>
  );
}
