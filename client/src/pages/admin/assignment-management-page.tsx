// client/src/pages/admin/assignment-management-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { AssignmentManagement } from "@/components/admin/assignment-management"; // Adjust if it's a default export

export default function AssignmentManagementPage() {
  return (
    <AdminLayout title="Station Assignments">
      <AssignmentManagement />
    </AdminLayout>
  );
}
