// client/src/pages/admin/role-management-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { RoleManagementPanel } from "@/components/admin/role-management-panel";

export default function RoleManagementPage() {
  return (
    <AdminLayout title="Role Management">
      <RoleManagementPanel />
    </AdminLayout>
  );
}
