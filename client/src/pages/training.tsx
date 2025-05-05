import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import MainLayout from "@/components/layout/main-layout";
import { TrainingModule } from "@/components/training/training-module";
import { Skeleton } from "@/components/ui/skeleton";

export default function Training() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <MainLayout>
        <div className="animate-pulse space-y-6">
          <Skeleton className="h-40 w-full rounded-md" />
          <Skeleton className="h-80 w-full rounded-md" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <TrainingModule userId={user?.id} isAdmin={user?.role === 'admin'} />
    </MainLayout>
  );
}