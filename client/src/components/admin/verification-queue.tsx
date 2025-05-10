import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { CheckCircle2, XCircle, AlertTriangle, RefreshCw, UserCheck, UserX, Eye } from "lucide-react";

// Types
interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  observerId: string;
  role: string;
  verificationStatus?: string;
  isActive?: boolean;
  profilePicture?: string;
  phoneNumber?: string;
  createdAt: string | Date;
}

export function VerificationQueue() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch all users
  const { data: users = [], isLoading, refetch } = useQuery<User[]>({
    queryKey: ['/api/admin/users']
  });

  // Filter to get only pending users
  const pendingUsers = users.filter(user => 
    user.verificationStatus === 'pending' || 
    (!user.isActive && !user.verificationStatus)
  );

  // Update user verification status
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

  // Handle verification actions
  const handleApproveUser = (userId: number) => {
    updateVerification.mutate({ userId, status: "verified" });
  };

  const handleRejectUser = (userId: number) => {
    updateVerification.mutate({ userId, status: "rejected" });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Pending Verifications</CardTitle>
            <CardDescription>
              Approve or reject users waiting for account verification
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
            <p className="text-gray-500">Loading verification queue...</p>
          </div>
        ) : pendingUsers.length === 0 ? (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 mb-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-medium mb-1">All caught up!</h3>
            <p className="text-gray-500">There are no pending verification requests.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Observer ID</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">
                      {user.firstName} {user.lastName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{user.observerId}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-amber-600 border-amber-600">
                        <AlertTriangle className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-green-600 text-green-600 hover:bg-green-50"
                          onClick={() => handleApproveUser(user.id)}
                        >
                          <UserCheck className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-red-600 text-red-600 hover:bg-red-50"
                          onClick={() => handleRejectUser(user.id)}
                        >
                          <UserX className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
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
      </CardFooter>
    </Card>
  );
}