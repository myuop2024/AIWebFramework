// client/src/pages/admin/training-management-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { TrainingManagementPanel } from "@/components/admin/training-management-panel";

export default function TrainingManagementPage() {
  return (
    <AdminLayout title="Training Management">
      <TrainingManagementPanel />
    </AdminLayout>
  );
}
