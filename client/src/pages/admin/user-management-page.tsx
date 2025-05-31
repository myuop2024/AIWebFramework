// client/src/pages/admin/user-management-page.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { UserManagement } from "@/components/admin/user-management"; // Assuming UserManagement is a named export

export default function UserManagementPage() {
  return (
    <AdminLayout title="User Management">
      <UserManagement />
    </AdminLayout>
  );
}
