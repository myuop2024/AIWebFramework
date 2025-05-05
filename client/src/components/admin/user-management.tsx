import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  CheckCircle2, XCircle, UserCheck, UserX, Search, AlertTriangle, Filter, RefreshCw
} from "lucide-react";

// Types
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  observerId: string;
  role: string;
  verificationStatus: string;
  trainingStatus: string;
  phoneNumber?: string;
  createdAt: string;
}

export function UserManagement() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  // Update user verification status
  const updateVerification = useMutation({
    mutationFn: async ({ userId, status }: { userId: number, status: string }) => {
      return apiRequest(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        data: { verificationStatus: status }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      toast({
        title: "User status updated",
        description: "The verification status has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Failed to update status",
        description: "There was an error updating the verification status.",
        variant: "destructive",
      });
    }
  });

  // Filter and search functionality
  const filteredUsers = users.filter(user => {
    // Search term filter
    const searchMatch = searchTerm === "" || 
      user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.observerId.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Role filter
    const roleMatch = filterRole === "all" || user.role === filterRole;
    
    // Status filter
    const statusMatch = filterStatus === "all" || user.verificationStatus === filterStatus;
    
    // Tab filter
    const tabMatch = 
      activeTab === "all" || 
      (activeTab === "pending" && user.verificationStatus === "pending") ||
      (activeTab === "verified" && user.verificationStatus === "verified") ||
      (activeTab === "rejected" && user.verificationStatus === "rejected");
    
    return searchMatch && roleMatch && statusMatch && tabMatch;
  });

  // Handle verification status change
  const handleVerifyUser = (userId: number, status: string) => {
    updateVerification.mutate({ userId, status });
  };

  // Get verification status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Verified</Badge>;
      case "rejected":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      case "pending":
        return <Badge variant="outline" className="text-amber-600 border-amber-600"><AlertTriangle className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Get training status badge
  const getTrainingBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Completed</Badge>;
      case "in_progress":
        return <Badge className="bg-blue-600">In Progress</Badge>;
      case "not_started":
        return <Badge variant="outline">Not Started</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            View and manage all users in the election observer system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row justify-between gap-4 mb-6">
            <div className="relative flex-grow max-w-md">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Search users..."
                className="pl-8 w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-[140px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="supervisor">Supervisors</SelectItem>
                  <SelectItem value="observer">Observers</SelectItem>
                </SelectContent>
              </Select>
              
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending Verification</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
          
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All Users</TabsTrigger>
              <TabsTrigger value="pending">Pending Verification</TabsTrigger>
              <TabsTrigger value="verified">Verified</TabsTrigger>
              <TabsTrigger value="rejected">Rejected</TabsTrigger>
            </TabsList>
            
            <TabsContent value={activeTab}>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Observer ID</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Verification</TableHead>
                      <TableHead>Training</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <div className="flex flex-col items-center justify-center">
                            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
                            <p className="text-gray-500">Loading users...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredUsers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-10">
                          <p className="text-gray-500">No users found matching your criteria.</p>
                          {searchTerm && <p className="text-gray-400 text-sm mt-1">Try a different search term.</p>}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">
                            {user.firstName} {user.lastName}
                          </TableCell>
                          <TableCell className="font-mono text-xs">{user.observerId}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">{user.role}</Badge>
                          </TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell>{getStatusBadge(user.verificationStatus)}</TableCell>
                          <TableCell>{getTrainingBadge(user.trainingStatus)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              {user.verificationStatus !== "verified" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleVerifyUser(user.id, "verified")}
                                >
                                  <UserCheck className="h-4 w-4 mr-1 text-green-600" />
                                  Verify
                                </Button>
                              )}
                              
                              {user.verificationStatus !== "rejected" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleVerifyUser(user.id, "rejected")}
                                >
                                  <UserX className="h-4 w-4 mr-1 text-red-600" />
                                  Reject
                                </Button>
                              )}
                              
                              {user.verificationStatus !== "pending" && (
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleVerifyUser(user.id, "pending")}
                                >
                                  Reset
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            Showing {filteredUsers.length} of {users.length} users
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}