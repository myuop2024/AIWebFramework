// client/src/pages/admin/reports-management-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { ReportManagementPanel } from "@/components/admin/report-management-panel";

export default function ReportsManagementPage() {
  return (
    <AdminLayout title="Report Management">
      <ReportManagementPanel />
    </AdminLayout>
  );
}
