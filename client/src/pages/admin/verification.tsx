import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth";
import VerificationQueue from "@/components/admin/verification-queue";
import { PendingPhotoApprovals } from "@/components/admin/pending-photo-approvals";
import AdminLayout from "@/components/layout/admin-layout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Image } from "lucide-react";

export default function VerificationPage() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const [activeTab, setActiveTab] = useState("users");
  
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
    <AdminLayout title="Verification Management">
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Verification Management</h1>
        
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="users" className="flex items-center">
              <UserCheck className="h-4 w-4 mr-2" />
              User Verification
            </TabsTrigger>
            <TabsTrigger value="photos" className="flex items-center">
              <Image className="h-4 w-4 mr-2" />
              Photo Approvals
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="users" className="mt-6">
            <VerificationQueue />
          </TabsContent>
          
          <TabsContent value="photos" className="mt-6">
            <PendingPhotoApprovals />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}