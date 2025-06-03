
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoleManagement } from '@/components/admin/role-management';
import AdminGroupsPage from './groups';
import AdminGroupPermissionsPage from './group-permissions';
import { Shield, Users, Settings, Key } from 'lucide-react';

export default function AdminRoleGroupManagementPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Role & Group Management</h1>
          <p className="text-muted-foreground mt-2">
            Manage user roles, groups, and permissions across the system
          </p>
        </div>
      </div>

      <Tabs defaultValue="roles" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Roles
          </TabsTrigger>
          <TabsTrigger value="groups" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Groups
          </TabsTrigger>
          <TabsTrigger value="group-permissions" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            Group Permissions
          </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Overview
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Role Management</CardTitle>
              <CardDescription>
                Create and manage user roles with specific permissions
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RoleManagement />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="groups" className="space-y-6">
          <AdminGroupsPage />
        </TabsContent>

        <TabsContent value="group-permissions" className="space-y-6">
          <AdminGroupPermissionsPage />
        </TabsContent>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">System Roles</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">5</div>
                <p className="text-xs text-muted-foreground">
                  Active role configurations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">User Groups</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3</div>
                <p className="text-xs text-muted-foreground">
                  Organized user groups
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Permissions</CardTitle>
                <Key className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">45</div>
                <p className="text-xs text-muted-foreground">
                  Total system permissions
                </p>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common role and group management tasks
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Role Hierarchy</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Director</span>
                        <span className="text-red-600 font-medium">Highest</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Admin</span>
                        <span className="text-orange-600 font-medium">High</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Supervisor</span>
                        <span className="text-blue-600 font-medium">Medium</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Roving Observer</span>
                        <span className="text-green-600 font-medium">Standard</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Observer</span>
                        <span className="text-gray-600 font-medium">Basic</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-4 border rounded-lg">
                    <h4 className="font-medium mb-2">Permission Categories</h4>
                    <div className="space-y-2 text-sm">
                      <div>• User Management (10 permissions)</div>
                      <div>• Role Management (4 permissions)</div>
                      <div>• System & Configuration (7 permissions)</div>
                      <div>• Supervisor Tasks (8 permissions)</div>
                      <div>• Analytics (16 permissions)</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
