import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  RefreshCw, CheckCircle, X, Filter, Eye, 
  UserCheck, Clock, Users, FileText 
} from "lucide-react";
import { format } from "date-fns";

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
  profilePicture?: string;
  phoneNumber?: string;
  createdAt: string | Date;
}

interface Document {
  id: number;
  userId: number;
  type: string;
  fileUrl: string;
  status: string;
  createdAt: string | Date;
  updatedAt: string | Date;
}

export function VerificationQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch pending users
  const { data: pendingUsers = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['/api/admin/pending-verifications']
  });

  // Approve a user's verification
  const approveVerification = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(
        'POST',
        `/api/admin/users/${userId}/verify`,
        { verificationStatus: "verified" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "User Verified",
        description: "The user has been verified successfully.",
      });
    },
    onError: (error) => {
      console.error('Error verifying user:', error);
      toast({
        title: "Failed to verify user",
        description: "There was an error verifying the user.",
        variant: "destructive",
      });
    }
  });

  // Reject a user's verification
  const rejectVerification = useMutation({
    mutationFn: async (userId: number) => {
      return apiRequest(
        'POST',
        `/api/admin/users/${userId}/verify`,
        { verificationStatus: "rejected" }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-verifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/users'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/system-stats'] });
      toast({
        title: "Verification Rejected",
        description: "The user's verification has been rejected.",
      });
    },
    onError: (error) => {
      console.error('Error rejecting verification:', error);
      toast({
        title: "Failed to reject verification",
        description: "There was an error rejecting the user's verification.",
        variant: "destructive",
      });
    }
  });

  // Handle approve action
  const handleApprove = (userId: number) => {
    approveVerification.mutate(userId);
  };

  // Handle reject action
  const handleReject = (userId: number) => {
    if (window.confirm("Are you sure you want to reject this verification request?")) {
      rejectVerification.mutate(userId);
    }
  };

  // Handle view documents
  const handleViewDocuments = (userId: number) => {
    toast({
      title: "View Documents",
      description: "Document view functionality will be implemented soon.",
    });
  };

  // Format date for display
  const formatDate = (dateString: string | Date) => {
    try {
      const date = new Date(dateString);
      return format(date, "MMM d, yyyy h:mm a");
    } catch (error) {
      return "Invalid date";
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Verification Queue</CardTitle>
            <CardDescription>
              Manage pending verification requests
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-10">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin mb-3" />
            <p className="text-gray-500">Loading verification requests...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
              <CheckCircle className="h-6 w-6 text-green-500" />
            </div>
            <h3 className="text-lg font-medium mb-1">No pending verifications</h3>
            <p className="text-gray-500">
              All verification requests have been processed
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Observer</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          {user.profilePicture ? (
                            <AvatarImage src={user.profilePicture} alt={`${user.firstName} ${user.lastName}`} />
                          ) : (
                            <AvatarFallback className="bg-primary/10">
                              {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                            </AvatarFallback>
                          )}
                        </Avatar>
                        <div>
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-gray-500 font-mono">{user.observerId || '-'}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-gray-500" />
                        <span className="text-gray-500 text-sm">{formatDate(user.createdAt)}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDocuments(user.id)}
                        >
                          <FileText className="h-4 w-4" />
                          <span className="sr-only">View Documents</span>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                          onClick={() => handleApprove(user.id)}
                        >
                          <UserCheck className="h-4 w-4" />
                          <span className="sr-only">Approve</span>
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => handleReject(user.id)}
                        >
                          <X className="h-4 w-4" />
                          <span className="sr-only">Reject</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-gray-500">
          {pendingUsers.length} pending verification{pendingUsers.length !== 1 ? 's' : ''}
        </div>
        {pendingUsers.length > 10 && (
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" disabled>Previous</Button>
            <span className="text-sm">Page 1 of 1</span>
            <Button variant="outline" size="sm" disabled>Next</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}