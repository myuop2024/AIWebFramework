import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CommunicationCenter } from '@/components/communication/communication-center';
import { PageHeader } from '@/components/ui/page-header';
import MainLayout from '@/components/layout/main-layout';
import { AuthGuard } from '@/components/auth/auth-guard';
import { Separator } from '@/components/ui/separator';

export default function CommunicationsPage() {
  // Get the current user
  const { data: currentUser, isLoading } = useQuery({ 
    queryKey: ['/api/user'],
  });
  
  if (isLoading) {
    return (
      <MainLayout>
        <div className="p-8">
          <PageHeader
            heading="Communications"
            subheading="Chat, video, and voice communications center"
          />
          <Separator className="my-6" />
          <div className="h-[70vh] flex items-center justify-center">
            <p className="text-muted-foreground">Loading communications center...</p>
          </div>
        </div>
      </MainLayout>
    );
  }
  
  if (!currentUser) {
    return (
      <MainLayout>
        <AuthGuard>
          <div className="p-8">
            <PageHeader
              heading="Communications"
              subheading="Chat, video, and voice communications center"
            />
            <Separator className="my-6" />
            <div className="h-[70vh] flex items-center justify-center">
              <p className="text-muted-foreground">Please log in to access the communications center</p>
            </div>
          </div>
        </AuthGuard>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="p-8">
        <PageHeader
          heading="Communications"
          subheading="Chat, video, and voice communications center"
        />
        <Separator className="my-6" />
        <div className="h-[70vh]">
          <CommunicationCenter userId={currentUser.id} />
        </div>
      </div>
    </MainLayout>
  );
}