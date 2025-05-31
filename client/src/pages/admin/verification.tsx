// client/src/pages/admin/verification.tsx
import AdminLayout from "@/components/layout/admin-layout";
import { VerificationQueue } from "@/components/admin/verification-queue"; // Adjust import if VerificationQueue is a default export

export default function UserVerificationPage() {
  return (
    <AdminLayout title="User Verification">
      <VerificationQueue />
    </AdminLayout>
  );
}
