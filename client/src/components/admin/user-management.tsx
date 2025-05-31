import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  RefreshCw, Users, Search, Plus, Edit, UserCheck, UserX, 
  Filter, Shield, Eye, AlertTriangle, CheckCircle2
} from "lucide-react";
import { UserForm } from "./user-form";
import { UserDetailModal } from "./user-detail-modal";
import { type User } from '@shared/schema';

export function UserManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Fetch all users
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  // Filter users based on search query and filters
  const filteredUsers = users.filter(user => {
    const searchTerm = searchQuery.toLowerCase();
    const matchesSearch = (
      (user.firstName && user.firstName.toLowerCase().includes(searchTerm)) ||
      (user.lastName && user.lastName.toLowerCase().includes(searchTerm)) ||
      (user.username && user.username.toLowerCase().includes(searchTerm)) ||
      (user.email && user.email.toLowerCase().includes(searchTerm)) ||
      (user.observerId && user.observerId.toLowerCase().includes(searchTerm))
    );

    // Role filter
    let matchesRole = true;
    if (roleFilter !== "all") {
      matchesRole = user.role === roleFilter;
    }

    // Status filter
    let matchesStatus = true;
    if (statusFilter !== "all") {
      if (statusFilter === "active") {
        matchesStatus = user.verificationStatus === "verified" || user.isActive === true;
      } else if (statusFilter === "pending") {
        matchesStatus = user.verificationStatus === "pending";
      } else if (statusFilter === "rejected") {
        matchesStatus = user.verificationStatus === "rejected";
      } else if (statusFilter === "inactive") {
        matchesStatus = user.verificationStatus !== "verified" && user.isActive !== true;
      }
    }

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Toggle user active status
  const toggleUserStatus = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(
        'PATCH',
        `/api/admin/users/${userId}/toggle-status`,
        {}
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "User Status Updated",
        description: "The user's status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error toggling user status:', error);
      toast({
        title: "Failed to update status",
        description: "There was an error updating the user status.",
        variant: "destructive",
      });
    }
  });

  // Update verification status
  const updateVerification = useMutation({
    mutationFn: async ({ userId, status }: { userId: number, status: string }) => {
      return apiRequest(
        'POST',
        `/api/admin/users/${userId}/verify`, 
        { verificationStatus: status }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "User status updated",
        description: "The verification status has been updated successfully.",
      });
    },
    onError: (error) => {
      console.error('Error updating user status:', error);
      toast({
        title: "Failed to update status",
        description: "There was an error updating the verification status.",
        variant: "destructive",
      });
    }
  });

  // Create a new user
  const createUser = useMutation({
    mutationFn: async (userData: Omit<User, 'id' | 'createdAt'>) => {
      return apiRequest(
        'POST',
        '/api/admin/users',
        userData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "User Created",
        description: "The user has been created successfully.",
      });
      setFormOpen(false);
    },
    onError: (error) => {
      console.error('Error creating user:', error);
      toast({
        title: "Failed to create user",
        description: "There was an error creating the user. The username or email may already be in use.",
        variant: "destructive",
      });
    }
  });

  // Update an existing user
  const updateUser = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<User> }) => {
      return apiRequest(
        'PATCH',
        `/api/admin/users/${id}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "User Updated",
        description: "The user has been updated successfully.",
      });
      setFormOpen(false);
    },
    onError: (error) => {
      console.error('Error updating user:', error);
      toast({
        title: "Failed to update user",
        description: "There was an error updating the user.",
        variant: "destructive",
      });
    }
  });

  // Handle toggling user status
  const handleToggleStatus = (userId: number) => {
    toggleUserStatus.mutate(userId);
  };

  // Handle verification actions
  const handleVerify = (userId: number) => {
    updateVerification.mutate({ userId, status: "verified" });
  };

  // Handle form submission
  const handleFormSubmit = (data: User) => {
    if (selectedUser) {
      // Update existing user
      updateUser.mutate({ id: selectedUser.id, data });
    } else {
      // Create new user
      createUser.mutate(data);
    }
  };

  // Handle edit user
  const handleEditUser = (id: number) => {
    const user = users.find(u => u.id === id);
    if (user) {
      setSelectedUser(user);
      setFormOpen(true);
    }
  };

  // Handle view user details
  const handleViewDetails = (id: number) => {
    setSelectedUser(users.find(u => u.id === id) || null);
    setDetailModalOpen(true);
  };

  // Handle add new user
  const handleAddUser = () => {
    setSelectedUser(null);
    setFormOpen(true);
  };

  // Get status badge for a user
  const getStatusBadge = (user: User) => {
    if (user.verificationStatus === "verified" || user.isActive) {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
        </Badge>
      );
    } else if (user.verificationStatus === "pending") {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
          <AlertTriangle className="h-3 w-3 mr-1" /> Pending
        </Badge>
      );
    } else if (user.verificationStatus === "rejected") {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <UserX className="h-3 w-3 mr-1" /> Rejected
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <UserX className="h-3 w-3 mr-1" /> Inactive
        </Badge>
      );
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>User Management</CardTitle>
            <CardDescription>
              Manage observers and administrators
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                type="text"
                placeholder="Search users..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button onClick={handleAddUser}>
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </div>

          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-1/2">
              <Select 
                value={roleFilter} 
                onValueChange={setRoleFilter}
              >
                <SelectTrigger>
                  <Shield className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                  <SelectItem value="observer">Observer</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="w-full md:w-1/2">
              <Select 
                value={statusFilter} 
                onValueChange={setStatusFilter}
              >
                <SelectTrigger>
                  <Filter className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-10">
              <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
              <p className="text-gray-500">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-8">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
                <Users className="h-6 w-6 text-gray-500" />
              </div>
              <h3 className="text-lg font-medium mb-1">No users found</h3>
              <p className="text-gray-500">
                {searchQuery || roleFilter !== "all" || statusFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "No users have been created yet"}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Observer ID</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">
                        {user.firstName} {user.lastName}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {user.observerId || "-"}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(user)}
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEditUser(user.id)}
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(user.id)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                          
                          {user.verificationStatus === "pending" ? (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="border-green-600 text-green-600 hover:bg-green-50"
                              onClick={() => handleVerify(user.id)}
                            >
                              <UserCheck className="h-4 w-4" />
                              <span className="sr-only">Verify</span>
                            </Button>
                          ) : (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className={user.verificationStatus === "verified" || user.isActive ? 
                                "border-red-600 text-red-600 hover:bg-red-50" : 
                                "border-green-600 text-green-600 hover:bg-green-50"}
                              onClick={() => handleToggleStatus(user.id)}
                            >
                              {user.verificationStatus === "verified" || user.isActive ? 
                                <UserX className="h-4 w-4" /> : 
                                <UserCheck className="h-4 w-4" />}
                              <span className="sr-only">
                                {user.verificationStatus === "verified" || user.isActive ? "Disable" : "Enable"}
                              </span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        {/* Send General Notification Card */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Send General Notification</CardTitle>
            <CardDescription>Send alerts and messages to observers or other user groups.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="gen-notification-title">Notification Title</Label>
              <Input id="gen-notification-title" placeholder="Enter notification title" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gen-notification-message">Message</Label>
              <Input id="gen-notification-message" placeholder="Enter message" />
            </div>
            <div className="flex items-center space-x-2">
              <Switch id="gen-urgent" />
              <Label htmlFor="gen-urgent">Mark as urgent</Label>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => {
              // Logic to get title and message from new inputs in this component
              // For now, just a toast:
              toast({
                  title: "Notification Sent",
                  description: "Your notification has been sent to users.",
              });
            }}>Send Notification</Button>
          </CardFooter>
        </Card>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
        </div>
        {filteredUsers.length > 10 && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <span className="text-sm">Page 1 of 1</span>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        )}
      </CardFooter>

      {/* User Form Modal */}
      <UserForm
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleFormSubmit}
        user={selectedUser || undefined}
        title={selectedUser ? "Edit User" : "Add New User"}
      />

      {/* User Details Modal */}
      <UserDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        userId={selectedUser?.id || null}
      />
    </Card>
  );
}