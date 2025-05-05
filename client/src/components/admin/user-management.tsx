import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { Search, Shield, UserRound, CheckCircle, XCircle, Clock, Mail, Phone, Edit, Eye } from "lucide-react";
import { ThreeBarChart } from "../three/ThreeBarChart";

interface UserProfile {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  role: string;
  observerId: string;
  phoneNumber: string | null;
  verificationStatus: string;
  profilePhoto?: string;
  trainingStatus: string;
  createdAt: string;
}

export function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [userDetailsOpen, setUserDetailsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const { toast } = useToast();

  // Fetch all users
  const { data: users, isLoading: isUsersLoading } = useQuery({
    queryKey: ['/api/admin/users'],
  });

  // Approve verification mutation
  const approveVerificationMutation = useMutation({
    mutationFn: async (userId: number) => {
      return fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verificationStatus: 'verified' }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Verification approved",
        description: "The user's verification has been approved.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error approving verification",
        description: "There was an error approving the user's verification.",
        variant: "destructive",
      });
    },
  });

  // Reject verification mutation
  const rejectVerificationMutation = useMutation({
    mutationFn: async (userId: number) => {
      return fetch(`/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ verificationStatus: 'rejected' }),
      }).then(res => res.json());
    },
    onSuccess: () => {
      toast({
        title: "Verification rejected",
        description: "The user's verification has been rejected.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
    },
    onError: () => {
      toast({
        title: "Error rejecting verification",
        description: "There was an error rejecting the user's verification.",
        variant: "destructive",
      });
    },
  });

  // Filter users based on search query and active tab
  const filteredUsers = users ? users.filter((user: UserProfile) => {
    const matchesSearch = searchQuery === "" ||
      user.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.observerId.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (activeTab === "all") return matchesSearch;
    if (activeTab === "verified") return matchesSearch && user.verificationStatus === "verified";
    if (activeTab === "pending") return matchesSearch && user.verificationStatus === "pending";
    if (activeTab === "rejected") return matchesSearch && user.verificationStatus === "rejected";
    if (activeTab === "admin") return matchesSearch && user.role === "admin";
    
    return matchesSearch;
  }) : [];

  // User role counts for the 3D chart
  const userRoleCounts = users ? Array.from(
    users.reduce((acc: Map<string, number>, user: UserProfile) => {
      const role = user.role || 'Unknown';
      acc.set(role, (acc.get(role) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([role, count]) => ({
    label: role.charAt(0).toUpperCase() + role.slice(1),
    value: count,
    color: role === 'admin' ? '#8B5CF6' : role === 'supervisor' ? '#3B82F6' : '#10B981'
  })) : [];

  // Verification status counts for the 3D chart
  const verificationStatusCounts = users ? Array.from(
    users.reduce((acc: Map<string, number>, user: UserProfile) => {
      const status = user.verificationStatus || 'Unknown';
      acc.set(status, (acc.get(status) || 0) + 1);
      return acc;
    }, new Map<string, number>())
  ).map(([status, count]) => ({
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: count,
    color: status === 'verified' ? '#10B981' : status === 'pending' ? '#F59E0B' : '#EF4444'
  })) : [];

  // View user details
  const handleViewUserDetails = (user: UserProfile) => {
    setSelectedUser(user);
    setUserDetailsOpen(true);
  };

  // Approve user verification
  const handleApproveVerification = (userId: number) => {
    approveVerificationMutation.mutate(userId);
  };

  // Reject user verification
  const handleRejectVerification = (userId: number) => {
    rejectVerificationMutation.mutate(userId);
  };

  // Get verification status badge
  const getVerificationBadge = (status: string) => {
    switch (status) {
      case "verified":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Verified</Badge>;
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Pending</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700">Rejected</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Unknown</Badge>;
    }
  };

  // Get training status badge
  const getTrainingBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Completed</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">In Progress</Badge>;
      case "not_started":
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Not Started</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">Unknown</Badge>;
    }
  };

  // Get role badge
  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700">Admin</Badge>;
      case "supervisor":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">Supervisor</Badge>;
      case "observer":
        return <Badge variant="outline" className="bg-green-50 text-green-700">Observer</Badge>;
      default:
        return <Badge variant="outline" className="bg-gray-50 text-gray-700">{role}</Badge>;
    }
  };

  if (isUsersLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>View and manage all registered users</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>View and manage all registered users</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search and filter controls */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search users..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex-shrink-0">
            <Tabs defaultValue={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="verified">Verified</TabsTrigger>
                <TabsTrigger value="pending">Pending</TabsTrigger>
                <TabsTrigger value="admin">Admin</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        
        {/* 3D Stats visualization */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="col-span-1">
            <ThreeBarChart 
              data={userRoleCounts} 
              height={250}
              width={400}
              title="Users by Role"
            />
          </div>
          <div className="col-span-1">
            <ThreeBarChart 
              data={verificationStatusCounts} 
              height={250}
              width={400}
              title="Users by Verification Status"
            />
          </div>
        </div>
        
        {/* Users table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Observer ID</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Verification</TableHead>
                <TableHead>Training</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="h-24 text-center">
                    No users found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user: UserProfile) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.profilePhoto} alt={`${user.firstName} ${user.lastName}`} />
                          <AvatarFallback>{user.firstName.charAt(0)}{user.lastName.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-sm text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.observerId}</TableCell>
                    <TableCell>{getRoleBadge(user.role)}</TableCell>
                    <TableCell>{getVerificationBadge(user.verificationStatus)}</TableCell>
                    <TableCell>{getTrainingBadge(user.trainingStatus)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleViewUserDetails(user)}>
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">View</span>
                        </Button>
                        
                        {user.verificationStatus === "pending" && (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-green-600 hover:text-green-700"
                              onClick={() => handleApproveVerification(user.id)}
                            >
                              <CheckCircle className="h-4 w-4" />
                              <span className="sr-only">Approve</span>
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleRejectVerification(user.id)}
                            >
                              <XCircle className="h-4 w-4" />
                              <span className="sr-only">Reject</span>
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        
        {/* User details dialog */}
        <Dialog open={userDetailsOpen} onOpenChange={setUserDetailsOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>
                Detailed information about the selected user.
              </DialogDescription>
            </DialogHeader>
            
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex flex-col items-center">
                  <Avatar className="h-20 w-20 mb-2">
                    <AvatarImage src={selectedUser.profilePhoto} alt={`${selectedUser.firstName} ${selectedUser.lastName}`} />
                    <AvatarFallback className="text-lg">{selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-medium">{selectedUser.firstName} {selectedUser.lastName}</h3>
                  <div className="flex items-center text-gray-500 text-sm">
                    <UserRound className="h-3.5 w-3.5 mr-1" />
                    <span>{selectedUser.username}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Observer ID</div>
                    <div className="flex items-center">
                      <Shield className="h-4 w-4 mr-1.5 text-primary" />
                      <span>{selectedUser.observerId}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Role</div>
                    <div>{getRoleBadge(selectedUser.role)}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Email</div>
                    <div className="flex items-center">
                      <Mail className="h-4 w-4 mr-1.5 text-primary" />
                      <span>{selectedUser.email}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Phone</div>
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-1.5 text-primary" />
                      <span>{selectedUser.phoneNumber || "Not provided"}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Verification</div>
                    <div>{getVerificationBadge(selectedUser.verificationStatus)}</div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-sm font-medium text-gray-500">Training</div>
                    <div>{getTrainingBadge(selectedUser.trainingStatus)}</div>
                  </div>
                  
                  <div className="space-y-1 col-span-2">
                    <div className="text-sm font-medium text-gray-500">Registered On</div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1.5 text-primary" />
                      <span>{new Date(selectedUser.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-between pt-4">
                  <Button variant="outline" onClick={() => setUserDetailsOpen(false)}>Close</Button>
                  
                  {selectedUser.verificationStatus === "pending" && (
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        className="text-green-600 hover:text-green-700"
                        onClick={() => {
                          handleApproveVerification(selectedUser.id);
                          setUserDetailsOpen(false);
                        }}
                      >
                        <CheckCircle className="h-4 w-4 mr-1.5" />
                        Approve
                      </Button>
                      <Button 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700"
                        onClick={() => {
                          handleRejectVerification(selectedUser.id);
                          setUserDetailsOpen(false);
                        }}
                      >
                        <XCircle className="h-4 w-4 mr-1.5" />
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}