import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";

import ReportForm from "@/components/polling/report-form";

export default function NewReport() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  // Prefetch necessary data
  useEffect(() => {
    // This is handled by the ReportForm component
  }, []);

  return (
    <MainLayout>
      <ReportForm />
    </MainLayout>
  );
}
