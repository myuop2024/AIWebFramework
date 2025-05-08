import { useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserCheck, Users, AlertOctagon } from "lucide-react";

export default function TeamManagementPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("team-members");

  // This entire page is protected by the RoleGuard component
  return (
    <RoleGuard allowedRoles={["supervisor", "admin", "director"]}>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
            <p className="text-muted-foreground">
              Manage your team of observers and their assignments
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="team-members">Team Members</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
          </TabsList>

          <TabsContent value="team-members" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Your Team
                </CardTitle>
                <CardDescription>
                  Manage observers assigned to your supervision
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <div className="p-4">
                    <div className="text-center p-6">
                      <Users className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No team members</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Get started by adding observers to your team.
                      </p>
                      <div className="mt-6">
                        <Button>
                          <UserCheck className="mr-2 h-4 w-4" />
                          Add Observer
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Pending Reports Review</CardTitle>
                <CardDescription>
                  Reports from your team members that need approval
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <p className="text-gray-500">No pending reports</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertOctagon className="mr-2 h-5 w-5" />
                  Issues Requiring Attention
                </CardTitle>
                <CardDescription>
                  Critical issues reported by your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center p-6">
                  <p className="text-gray-500">No critical issues reported</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </RoleGuard>
  );
}