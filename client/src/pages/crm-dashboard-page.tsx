import React from 'react';
import MainLayout from '@/components/layout/main-layout'; // Assuming MainLayout or similar exists

const CrmDashboardPage: React.FC = () => {
  return (
    <MainLayout title="CRM Dashboard">
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold">CRM Dashboard</h1>
        <p className="text-muted-foreground mb-6">
          Welcome to the Customer Relationship Management section. Manage and view user details below.
        </p>
        <UserListView />
      </div>
    </MainLayout>
  );
};

export default CrmDashboardPage;

// Import UserListView component
import UserListView from '@/components/crm/user-list-view';
