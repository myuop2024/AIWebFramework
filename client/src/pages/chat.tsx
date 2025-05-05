import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import MainLayout from "@/components/layout/main-layout";
import ChatInterface from "@/components/chat/chat-interface";

export default function Chat() {
  const { user, loading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !loading) {
      navigate("/login");
    }
  }, [user, loading, navigate]);

  return (
    <MainLayout>
      <ChatInterface />
    </MainLayout>
  );
}
