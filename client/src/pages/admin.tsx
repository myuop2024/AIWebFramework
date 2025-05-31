// client/src/pages/admin.tsx
import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
// Removed unused imports: Button, Card, Badge, Input, Switch, Label, Dialog, AdminModal, AdminLayout, lucide-icons, useQuery, useToast

export default function Admin() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading) {
      if (!user || user.role !== 'admin') {
        // Non-admin or not logged in, redirect to login
        navigate("/login", { replace: true });
      } else {
        // User is admin, redirect to the admin dashboard
        navigate("/admin-dashboard", { replace: true });
      }
    }
  }, [user, isLoading, navigate]);

  // Display a loading indicator while checking auth status and redirecting
  // This content will be shown briefly, or if the user is not an admin before redirect to login.
  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 dark:bg-gray-900">
      <div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mb-4"></div>
      <p className="text-lg text-gray-700 dark:text-gray-300">
        {isLoading ? "Loading admin section..." : "Redirecting..."}
      </p>
    </div>
  );
}
