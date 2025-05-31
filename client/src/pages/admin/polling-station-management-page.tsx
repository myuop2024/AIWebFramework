// client/src/pages/admin/polling-station-management-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { PollingStationManagement } from "@/components/admin/polling-station-management"; // Adjust if it's a default export

export default function PollingStationManagementPage() {
  return (
    <AdminLayout title="Polling Station Management">
      <PollingStationManagement />
    </AdminLayout>
  );
}
