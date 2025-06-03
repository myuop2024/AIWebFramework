import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Calendar,
  FileText,
  Clock,
  MapPin,
  Shield,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  BarChart,
} from "lucide-react";
import { format } from "date-fns";

interface UserDetail {
  id: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  observerId?: string;
  isActive?: boolean;
  verificationStatus?: string;
  createdAt?: string;
  updatedAt?: string;
  notes?: string;
  lastLoginAt?: string;
}

interface UserProfile {
  userId: number;
  phone?: string;
  address?: string;
  city?: string;
  region?: string;
  emergencyContact?: string;
  birthDate?: string;
  gender?: string;
  preferredLanguage?: string;
  profileImageUrl?: string;
}

interface Document {
  id: number;
  userId: number;
  type: string;
  filename: string;
  fileUrl: string;
  uploadedAt: string;
  verified?: boolean;
}

interface Assignment {
  id: number;
  userId: number;
  stationId: number;
  startDate: string;
  endDate: string;
  status?: string;
  stationName?: string;
  stationCode?: string;
}

interface UserDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number | null;
}

export function UserDetailModal({ isOpen, onClose, userId }: UserDetailModalProps) {
  const [activeTab, setActiveTab] = useState("profile");
  
  // Fetch user details
  const { data: user, isLoading: userLoading } = useQuery<UserDetail | undefined>({
    queryKey: userId ? [`/api/admin/users/${userId}`] : null,
    enabled: !!userId && isOpen,
  });
  
  // Fetch user profile
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile | undefined>({
    queryKey: userId ? [`/api/admin/users/${userId}/profile`] : null,
    enabled: !!userId && isOpen,
  });
  
  // Fetch user documents
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[] | undefined>({
    queryKey: userId ? [`/api/admin/users/${userId}/documents`] : null,
    enabled: !!userId && isOpen,
  });
  
  // Fetch user assignments
  const { data: assignments = [], isLoading: assignmentsLoading } = useQuery<Assignment[] | undefined>({
    queryKey: userId ? [`/api/admin/users/${userId}/assignments`] : null,
    enabled: !!userId && isOpen,
  });
  
  // Format name
  const formatName = (user?: UserDetail) => {
    if (!user) return "Loading...";
    const parts = [user.firstName, user.lastName].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : user.username;
  };
  
  // Format date
  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Format date with time
  const formatDateTime = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    try {
      return format(new Date(dateStr), "MMM d, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Get status badge
  const getStatusBadge = (user?: UserDetail) => {
    if (!user) return null;
    
    if (user.verificationStatus === "verified") {
      return (
        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
          <CheckCircle className="h-3 w-3 mr-1" />
          Verified
        </Badge>
      );
    }
    
    if (user.verificationStatus === "rejected") {
      return (
        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
          <XCircle className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    }
    
    if (user.verificationStatus === "pending") {
      return (
        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
          <Clock className="h-3 w-3 mr-1" />
          Pending Verification
        </Badge>
      );
    }
    
    if (user.isActive === false) {
      return (
        <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
          <AlertTriangle className="h-3 w-3 mr-1" />
          Inactive
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <User className="h-3 w-3 mr-1" />
        Active
      </Badge>
    );
  };
  
  // Get role badge
  const getRoleBadge = (role?: string) => {
    if (!role) return null;
    
    if (role === "admin") {
      return (
        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
          <Shield className="h-3 w-3 mr-1" />
          Administrator
        </Badge>
      );
    }
    
    if (role === "supervisor") {
      return (
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200">
          <BarChart className="h-3 w-3 mr-1" />
          Supervisor
        </Badge>
      );
    }
    
    return (
      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
        <MapPin className="h-3 w-3 mr-1" />
        Observer
      </Badge>
    );
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            User Details
            {user?.observerId && (
              <Badge variant="outline" className="ml-2 font-mono">
                {user.observerId}
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            Detailed information about {formatName(user)}
          </DialogDescription>
        </DialogHeader>
        
        {userLoading ? (
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="h-8 w-8 text-gray-400 animate-spin" />
            <span className="ml-2 text-gray-500">Loading user information...</span>
          </div>
        ) : !user ? (
          <div className="text-center p-6 text-gray-500">
            <AlertTriangle className="h-12 w-12 mx-auto text-amber-500 mb-4" />
            <h3 className="text-lg font-medium">User not found</h3>
            <p>The requested user information could not be loaded.</p>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              {/* User summary */}
              <div className="w-full md:w-1/3">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center text-center">
                      <div className="h-24 w-24 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                        <User className="h-12 w-12 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-medium">{formatName(user)}</h3>
                      <p className="text-sm text-gray-500 mb-2">{user.email}</p>
                      <div className="flex flex-wrap justify-center gap-2 mt-2">
                        {getStatusBadge(user)}
                        {getRoleBadge(user.role)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              {/* Account details */}
              <div className="w-full md:w-2/3">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">Account Information</h3>
                    <div className="grid grid-cols-2 gap-y-4">
                      <div>
                        <div className="text-sm text-gray-500">Username</div>
                        <div className="font-medium">{user.username}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">User ID</div>
                        <div className="font-medium">{user.id}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Account Created</div>
                        <div className="font-medium">{formatDate(user.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Last Updated</div>
                        <div className="font-medium">{formatDate(user.updatedAt)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Last Login</div>
                        <div className="font-medium">
                          {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Never logged in"}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Verification Status</div>
                        <div className="font-medium">
                          {getStatusBadge(user)}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full mb-4">
                <TabsTrigger value="profile" className="flex-1">
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </TabsTrigger>
                <TabsTrigger value="documents" className="flex-1">
                  <FileText className="h-4 w-4 mr-2" />
                  Documents ({documents?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="assignments" className="flex-1">
                  <MapPin className="h-4 w-4 mr-2" />
                  Assignments ({assignments?.length || 0})
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="profile">
                {profileLoading ? (
                  <div className="flex items-center justify-center p-6">
                    <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                    <span className="ml-2 text-gray-500">Loading profile information...</span>
                  </div>
                ) : (
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="text-lg font-medium mb-4">Profile Details</h3>
                      
                      {/* Contact Information */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Contact Information</h4>
                        <div className="grid grid-cols-2 gap-y-4">
                          <div>
                            <div className="text-sm text-gray-500">Email</div>
                            <div className="font-medium flex items-center">
                              <Mail className="h-4 w-4 mr-1 text-gray-400" />
                              {user.email}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Phone</div>
                            <div className="font-medium">
                              {profile?.phone || "Not provided"}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm text-gray-500">Address</div>
                            <div className="font-medium">
                              {profile?.address ? (
                                <div className="flex items-start">
                                  <MapPin className="h-4 w-4 mr-1 text-gray-400 mt-0.5" />
                                  <div>
                                    <div>{profile.address}</div>
                                    {(profile.city || profile.region) && (
                                      <div className="text-gray-500">
                                        {[profile.city, profile.region].filter(Boolean).join(", ")}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                "No address on record"
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      {/* Personal Information */}
                      <div className="mb-6">
                        <h4 className="text-sm font-medium text-gray-500 mb-3">Personal Information</h4>
                        <div className="grid grid-cols-2 gap-y-4">
                          <div>
                            <div className="text-sm text-gray-500">Birth Date</div>
                            <div className="font-medium flex items-center">
                              <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                              {profile?.birthDate ? formatDate(profile.birthDate) : "Not provided"}
                            </div>
                          </div>
                          <div>
                            <div className="text-sm text-gray-500">Gender</div>
                            <div className="font-medium">
                              {profile?.gender || "Not specified"}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-sm text-gray-500">Emergency Contact</div>
                            <div className="font-medium">
                              {profile?.emergencyContact || "Not provided"}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <Separator className="my-4" />
                      
                      {/* Notes */}
                      {user.notes && (
                        <div>
                          <h4 className="text-sm font-medium text-gray-500 mb-3">Notes</h4>
                          <div className="p-3 bg-gray-50 rounded-md text-gray-700">
                            {user.notes}
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
              
              <TabsContent value="documents">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">User Documents</h3>
                    
                    {documentsLoading ? (
                      <div className="flex items-center justify-center p-6">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                        <span className="ml-2 text-gray-500">Loading documents...</span>
                      </div>
                    ) : (documents && documents.length === 0) ? (
                      <div className="text-center p-6 text-gray-500 bg-gray-50 rounded-md">
                        <FileText className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <h4 className="font-medium">No Documents</h4>
                        <p>This user has not uploaded any documents yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {documents?.map((doc: Document) => (
                          <div key={doc.id} className="border rounded-md p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium">{doc.type}</div>
                                <div className="text-sm text-gray-500">
                                  Uploaded on {formatDate(doc.uploadedAt)}
                                </div>
                              </div>
                              <Badge
                                variant="outline"
                                className={doc.verified 
                                  ? "bg-green-50 text-green-700 border-green-200" 
                                  : "bg-yellow-50 text-yellow-700 border-yellow-200"}
                              >
                                {doc.verified ? "Verified" : "Pending Verification"}
                              </Badge>
                            </div>
                            <div className="mt-3 flex justify-end">
                              <Button size="sm" variant="outline" asChild>
                                <a href={doc.fileUrl} target="_blank" rel="noreferrer">
                                  View Document
                                </a>
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="assignments">
                <Card>
                  <CardContent className="pt-6">
                    <h3 className="text-lg font-medium mb-4">Observer Assignments</h3>
                    
                    {assignmentsLoading ? (
                      <div className="flex items-center justify-center p-6">
                        <RefreshCw className="h-6 w-6 text-gray-400 animate-spin" />
                        <span className="ml-2 text-gray-500">Loading assignments...</span>
                      </div>
                    ) : (assignments && assignments.length === 0) ? (
                      <div className="text-center p-6 text-gray-500 bg-gray-50 rounded-md">
                        <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                        <h4 className="font-medium">No Assignments</h4>
                        <p>This user has not been assigned to any polling stations yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {assignments?.map((assignment: Assignment) => (
                          <div key={assignment.id} className="border rounded-md p-4">
                            <div className="flex items-start justify-between">
                              <div>
                                <div className="font-medium">{assignment.stationName || "Unknown Station"}</div>
                                {assignment.stationCode && (
                                  <div className="text-xs text-gray-500 font-mono">
                                    {assignment.stationCode}
                                  </div>
                                )}
                              </div>
                              <Badge
                                variant="outline"
                                className={
                                  assignment.status === "completed" 
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : assignment.status === "active"
                                    ? "bg-blue-50 text-blue-700 border-blue-200"
                                    : "bg-gray-50 text-gray-700 border-gray-200"
                                }
                              >
                                {assignment.status || "Scheduled"}
                              </Badge>
                            </div>
                            <div className="mt-2 flex items-center text-sm text-gray-500">
                              <Clock className="h-4 w-4 mr-1" />
                              {formatDate(assignment.startDate)}
                              {assignment.startDate !== assignment.endDate && (
                                <> to {formatDate(assignment.endDate)}</>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
        
        <DialogFooter>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}