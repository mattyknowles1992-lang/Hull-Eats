import { AppShell, KeyValueRow, SectionCard, StatusBadge } from "@hull-eats/ui";

export default function AdminPortalPage() {
  return (
    <AppShell title="Admin Portal" eyebrow="Back-office control plane">
      <SectionCard title="Operational controls">
        <KeyValueRow label="Merchants" value="Create + manage merchants and stores" />
        <KeyValueRow label="Menus" value="Create categories, items, availability" />
        <KeyValueRow label="Zones" value="Delivery fee and serviceability configuration" />
        <KeyValueRow label="Drivers" value="Provision and manually assign active drivers" />
      </SectionCard>
      <SectionCard title="Dispatch overview">
        <KeyValueRow label="Manual assignment" value={<StatusBadge status="assigned" />} />
        <KeyValueRow label="Realtime ops" value="Order and delivery websocket events" />
        <KeyValueRow label="Future integrations" value="Reserved behind provider interfaces" />
      </SectionCard>
    </AppShell>
  );
}
