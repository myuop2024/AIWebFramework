// client/src/pages/admin/event-management-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { EventManagementPanel } from "@/components/admin/event-management-panel";

export default function EventManagementPage() {
  return (
    <AdminLayout title="Event Management">
      <EventManagementPanel />
    </AdminLayout>
  );
}
