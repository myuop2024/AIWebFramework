// client/src/pages/admin/station-analytics-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { StationAnalyticsPanel } from "@/components/admin/station-analytics-panel";

export default function StationAnalyticsPage() {
  return (
    <AdminLayout title="Station Analytics">
      <StationAnalyticsPanel />
    </AdminLayout>
  );
}
