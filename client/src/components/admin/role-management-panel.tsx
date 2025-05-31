// client/src/components/admin/role-management-panel.tsx
import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

const RoleCard: React.FC<{ title: string, description: string }> = ({ title, description }) => (
  <Card className="mb-4">
    <CardHeader>
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      <div className="flex gap-2">
        <Button variant="outline" size="sm">Edit Permissions</Button>
        <Button variant="outline" size="sm">Rename</Button>
      </div>
    </CardContent>
  </Card>
);

export function RoleManagementPanel() { // Named export
  // TODO: Fetch roles from API and map them instead of hardcoding
  const roles = [
    { title: 'Administrator', description: 'Full access to all system functions and settings' },
    { title: 'Observer', description: 'Can submit reports and view assigned polling stations' },
    { title: 'Supervisor', description: 'Can review reports and manage observers' },
    { title: 'Analyst', description: 'View-only access to reports and analytics' },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">User Roles Management</h2>
        <Button>Add New Role</Button>
      </div>
      <div className="space-y-4">
        {roles.map(role => (
          <RoleCard key={role.title} title={role.title} description={role.description} />
        ))}
      </div>
      {/* Add any other UI elements like pagination or filters if needed in future */}
    </div>
  );
}
