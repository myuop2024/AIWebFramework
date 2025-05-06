import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Check, X, AlertTriangle, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingPhotoApproval {
  id: number;
  userId: number;
  username: string;
  fullName: string;
  photoUrl: string;
  submittedAt: string;
}

export function PendingPhotoApprovals() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPhoto, setSelectedPhoto] = useState<PendingPhotoApproval | null>(null);
  const [isApproveDialogOpen, setIsApproveDialogOpen] = useState(false);
  const [isRejectDialogOpen, setIsRejectDialogOpen] = useState(false);

  // Fetch pending photo approvals
  const { 
    data: pendingApprovals = [], 
    isLoading, 
    isError 
  } = useQuery<PendingPhotoApproval[]>({
    queryKey: ['/api/admin/pending-photo-approvals'],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Mutation for approving a photo
  const approveMutation = useMutation({
    mutationFn: (photoId: number) => {
      return apiRequest('POST', `/api/admin/pending-photo-approvals/${photoId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-photo-approvals'] });
      toast({
        title: "Photo approved",
        description: "The profile photo has been approved and updated.",
      });
      setSelectedPhoto(null);
    },
    onError: (error) => {
      toast({
        title: "Error approving photo",
        description: "There was an error approving the profile photo. Please try again.",
        variant: "destructive",
      });
      console.error("Error approving photo:", error);
    },
  });

  // Mutation for rejecting a photo
  const rejectMutation = useMutation({
    mutationFn: (photoId: number) => {
      return apiRequest('POST', `/api/admin/pending-photo-approvals/${photoId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/pending-photo-approvals'] });
      toast({
        title: "Photo rejected",
        description: "The profile photo has been rejected.",
      });
      setSelectedPhoto(null);
    },
    onError: (error) => {
      toast({
        title: "Error rejecting photo",
        description: "There was an error rejecting the profile photo. Please try again.",
        variant: "destructive",
      });
      console.error("Error rejecting photo:", error);
    },
  });

  const handleApprove = () => {
    if (selectedPhoto) {
      approveMutation.mutate(selectedPhoto.id);
      setIsApproveDialogOpen(false);
    }
  };

  const handleReject = () => {
    if (selectedPhoto) {
      rejectMutation.mutate(selectedPhoto.id);
      setIsRejectDialogOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2">Loading pending approvals...</span>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-50 p-4 rounded-md">
        <div className="flex">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Error loading pending approvals</h3>
            <p className="text-sm text-red-700 mt-1">
              Failed to load pending photo approvals. Please try refreshing the page.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Pending Profile Photo Approvals</CardTitle>
        <CardDescription>
          Review and approve or reject profile photo changes that require administrator approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingApprovals.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>No pending photo approvals</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>User</TableHead>
                <TableHead>Photo</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingApprovals.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{item.fullName}</span>
                      <span className="text-sm text-muted-foreground">@{item.username}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={item.photoUrl} alt={item.fullName} />
                      <AvatarFallback>{item.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span>{new Date(item.submittedAt).toLocaleDateString()}</span>
                      <span className="text-sm text-muted-foreground">
                        {new Date(item.submittedAt).toLocaleTimeString()}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center text-green-600 hover:text-green-700 hover:bg-green-50"
                        onClick={() => {
                          setSelectedPhoto(item);
                          setIsApproveDialogOpen(true);
                        }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex items-center text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => {
                          setSelectedPhoto(item);
                          setIsRejectDialogOpen(true);
                        }}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                      >
                        <X className="h-4 w-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      
      {/* Approve dialog */}
      <AlertDialog open={isApproveDialogOpen} onOpenChange={setIsApproveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Profile Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to approve this profile photo? This will update the user's profile with the new photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedPhoto && (
            <div className="flex justify-center my-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={selectedPhoto.photoUrl} alt={selectedPhoto.fullName} />
                <AvatarFallback>{selectedPhoto.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleApprove}>
              {approveMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Approving...
                </>
              ) : (
                'Approve'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reject dialog */}
      <AlertDialog open={isRejectDialogOpen} onOpenChange={setIsRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reject Profile Photo</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to reject this profile photo? The user will be notified that they need to submit a new photo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {selectedPhoto && (
            <div className="flex justify-center my-4">
              <Avatar className="h-24 w-24">
                <AvatarImage src={selectedPhoto.photoUrl} alt={selectedPhoto.fullName} />
                <AvatarFallback>{selectedPhoto.fullName.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleReject} 
              className="bg-red-600 hover:bg-red-700"
            >
              {rejectMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Rejecting...
                </>
              ) : (
                'Reject'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}