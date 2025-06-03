import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import NewsList from "@/components/news/news-list";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function NewsPage() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  return (
    <AuthGuard>
      <div className="container mx-auto py-6">
        <NewsList />
      </div>
    </AuthGuard>
  );
}
