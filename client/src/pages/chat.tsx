import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import PageHeader from '@/components/layout/page-header';
import { CommunicationCenter } from '@/components/communication/communication-center-fixed';
import { Loader2 } from 'lucide-react';

export default function Chat() {
  const { user, isLoading } = useAuth();
  const [, navigate] = useLocation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!user && !isLoading) {
      navigate("/login");
    }
  }, [user, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p>Please log in to access the communications center.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Communications Center"
        description="Chat with other observers and staff members in real-time"
      />
      <div className="h-[calc(100vh-12rem)] md:h-[calc(100vh-14rem)]">
        <CommunicationCenter userId={user.id} hideHeader={true} />
      </div>
    </>
  );
}
