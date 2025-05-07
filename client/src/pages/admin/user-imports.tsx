import React from "react";
import AdminLayout from "@/components/layout/admin-layout";
import { UserImport } from "@/components/admin/user-import";
import { UsersIcon } from "lucide-react";

export default function UserImportsPage() {
  return (
    <AdminLayout title="User Imports">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center">
          <UsersIcon className="mr-2 h-8 w-8" />
          User Imports
        </h1>
        <p className="text-muted-foreground">
          Import multiple users at once via CSV files
        </p>
      </div>

      <UserImport />
    </AdminLayout>
  );
}