import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import VerificationQueue from "@/components/admin/verification-queue";
import AdminLayout from "@/components/layouts/admin-layout";

export default function VerificationPage() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  
  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      navigate("/login");
    }
  }, [user, loading, navigate]);
  
  // Show loading state while checking authentication
  if (loading || !user) {
    return <div className="container p-8 flex justify-center items-center min-h-screen">
      <div className="flex flex-col items-center gap-2">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>;
  }
  
  return (
    <AdminLayout>
      <div className="container py-8">
        <VerificationQueue />
      </div>
    </AdminLayout>
  );
}