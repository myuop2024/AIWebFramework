// client/src/pages/admin/report-analytics-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { ReportAnalyticsPanel } from "@/components/admin/report-analytics-panel";

export default function ReportAnalyticsPage() {
  return (
    <AdminLayout title="Report Analytics">
      <ReportAnalyticsPanel />
    </AdminLayout>
  );
}
