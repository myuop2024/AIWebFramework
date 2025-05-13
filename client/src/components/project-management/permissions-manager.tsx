import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Shield, 
  User, 
  Users, 
  PlusCircle, 
  X,
  Check,
  AlertCircle,
  Search,
  RefreshCw,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Define permission levels for RBAC
const PERMISSION_LEVELS = {
  VIEWER: 'viewer',
  CONTRIBUTOR: 'contributor',
  MANAGER: 'manager',
  OWNER: 'owner',
};

// Define what each role can do
const ROLE_CAPABILITIES = {
  [PERMISSION_LEVELS.VIEWER]: {
    description: 'Can view project details, tasks, and timelines',
    canView: true,
    canEdit: false,
    canCreate: false,
    canDelete: false,
    canManageMembers: false,
  },
  [PERMISSION_LEVELS.CONTRIBUTOR]: {
    description: 'Can create and edit tasks, update status',
    canView: true,
    canEdit: true,
    canCreate: true,
    canDelete: false,
    canManageMembers: false,
  },
  [PERMISSION_LEVELS.MANAGER]: {
    description: 'Can manage the project, tasks, and team members',
    canView: true,
    canEdit: true,
    canCreate: true,
    canDelete: true,
    canManageMembers: true,
  },
  [PERMISSION_LEVELS.OWNER]: {
    description: 'Full control over the project',
    canView: true,
    canEdit: true,
    canCreate: true,
    canDelete: true,
    canManageMembers: true,
    canTransferOwnership: true,
  },
};

interface ProjectMember {
  id: number;
  userId: number;
  projectId: number;
  role: string;
  user?: {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    profileImageUrl?: string;
  };
}

interface UserForSelection {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl?: string;
}

// Component to manage permissions for a project
export default function PermissionsManager({ projectId }: { projectId: number }) {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState(PERMISSION_LEVELS.CONTRIBUTOR);
  const [addingMember, setAddingMember] = useState(false);

  // Load project members
  const {
    data: members,
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useQuery<ProjectMember[]>({
    queryKey: ['/api/project-management/members', projectId],
    enabled: !!projectId,
  });

  // Load users for adding to project
  const { data: users, isLoading: isLoadingUsers } = useQuery<UserForSelection[]>({
    queryKey: ['/api/users/search', searchTerm],
    enabled: addingMember && searchTerm.length > 2,
  });

  // Add member mutation
  const addMemberMutation = useMutation({
    mutationFn: async (data: { userId: number; role: string }) => {
      const response = await fetch(`/api/project-management/projects/${projectId}/members`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to add member');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Member added',
        description: 'The user has been added to the project.',
      });
      setAddingMember(false);
      setSelectedUserId(null);
      setSearchTerm('');
      queryClient.invalidateQueries({ queryKey: ['/api/project-management/members', projectId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to add member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update member role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: number; role: string }) => {
      const response = await fetch(`/api/project-management/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update member role');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Role updated',
        description: 'The member role has been updated successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/project-management/members', projectId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to update role',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await fetch(`/api/project-management/members/${memberId}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error('Failed to remove member');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Member removed',
        description: 'The member has been removed from the project.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/project-management/members', projectId] });
    },
    onError: (error) => {
      toast({
        title: 'Failed to remove member',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleAddMember = () => {
    if (!selectedUserId) {
      toast({
        title: 'Select a user',
        description: 'Please select a user to add to the project.',
        variant: 'destructive',
      });
      return;
    }

    addMemberMutation.mutate({
      userId: selectedUserId,
      role: selectedRole,
    });
  };

  const handleRoleChange = (memberId: number, role: string) => {
    updateRoleMutation.mutate({ memberId, role });
  };

  const handleRemoveMember = (memberId: number) => {
    if (confirm('Are you sure you want to remove this member from the project?')) {
      removeMemberMutation.mutate(memberId);
    }
  };

  const filteredUsers = users?.filter(user => 
    !members?.some(member => member.userId === user.id)
  );

  if (membersError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load project members. Please try again.
          <Button variant="outline" size="sm" className="mt-2" onClick={() => refetchMembers()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-lg font-medium">
              <Shield className="h-5 w-5 inline-block mr-2 text-primary" />
              Project Access Control
            </CardTitle>
            <CardDescription>
              Manage who has access to this project and their permission level
            </CardDescription>
          </div>
          <Button 
            onClick={() => setAddingMember(!addingMember)}
            variant={addingMember ? "secondary" : "default"}
          >
            {addingMember ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </>
            ) : (
              <>
                <PlusCircle className="h-4 w-4 mr-2" />
                Add Member
              </>
            )}
          </Button>
        </CardHeader>
        <CardContent>
          {addingMember && (
            <div className="bg-muted/50 p-4 rounded-lg mb-6 border">
              <h3 className="text-sm font-medium mb-2">Add new project member</h3>
              <div className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search users by name or email..."
                        className="pl-9"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                  <div>
                    <Select 
                      value={selectedRole} 
                      onValueChange={setSelectedRole}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={PERMISSION_LEVELS.VIEWER}>Viewer</SelectItem>
                        <SelectItem value={PERMISSION_LEVELS.CONTRIBUTOR}>Contributor</SelectItem>
                        <SelectItem value={PERMISSION_LEVELS.MANAGER}>Manager</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {searchTerm.length > 2 && (
                  <div className="border rounded-md overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[50px]"></TableHead>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="w-[100px]">Select</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {isLoadingUsers ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              <RefreshCw className="h-5 w-5 animate-spin inline-block mr-2" />
                              Searching users...
                            </TableCell>
                          </TableRow>
                        ) : filteredUsers && filteredUsers.length > 0 ? (
                          filteredUsers.map(user => (
                            <TableRow key={user.id}>
                              <TableCell>
                                <Avatar className="h-8 w-8">
                                  <AvatarImage src={user.profileImageUrl} alt={`${user.firstName} ${user.lastName}`} />
                                  <AvatarFallback>
                                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                                  </AvatarFallback>
                                </Avatar>
                              </TableCell>
                              <TableCell>
                                {user.firstName} {user.lastName}
                                <div className="text-xs text-muted-foreground">@{user.username}</div>
                              </TableCell>
                              <TableCell>{user.email}</TableCell>
                              <TableCell>
                                <Checkbox 
                                  checked={selectedUserId === user.id}
                                  onCheckedChange={() => setSelectedUserId(user.id)}
                                />
                              </TableCell>
                            </TableRow>
                          ))
                        ) : (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center py-4">
                              No users found or all users are already members
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </div>
                )}
                
                <div className="flex justify-end">
                  <Button 
                    onClick={handleAddMember} 
                    disabled={!selectedUserId || addMemberMutation.isPending}
                  >
                    {addMemberMutation.isPending && (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    )}
                    Add to Project
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium mb-3 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              Current Team Members ({members?.length || 0})
            </h3>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Member</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingMembers ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <RefreshCw className="h-5 w-5 animate-spin inline-block mr-2" />
                        Loading members...
                      </TableCell>
                    </TableRow>
                  ) : members && members.length > 0 ? (
                    members.map(member => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                              <AvatarImage 
                                src={member.user?.profileImageUrl} 
                                alt={`${member.user?.firstName} ${member.user?.lastName}`} 
                              />
                              <AvatarFallback>
                                {member.user?.firstName?.charAt(0)}{member.user?.lastName?.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {member.user?.firstName} {member.user?.lastName}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {member.user?.email}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {member.role === PERMISSION_LEVELS.OWNER ? (
                            <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100">
                              Owner
                            </Badge>
                          ) : (
                            <Select 
                              defaultValue={member.role} 
                              onValueChange={(value) => handleRoleChange(member.id, value)}
                              disabled={updateRoleMutation.isPending}
                            >
                              <SelectTrigger className="w-[130px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value={PERMISSION_LEVELS.VIEWER}>Viewer</SelectItem>
                                <SelectItem value={PERMISSION_LEVELS.CONTRIBUTOR}>Contributor</SelectItem>
                                <SelectItem value={PERMISSION_LEVELS.MANAGER}>Manager</SelectItem>
                              </SelectContent>
                            </Select>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs">
                            {ROLE_CAPABILITIES[member.role as keyof typeof ROLE_CAPABILITIES]?.description}
                          </div>
                          <div className="flex mt-1 gap-1.5">
                            {ROLE_CAPABILITIES[member.role as keyof typeof ROLE_CAPABILITIES]?.canView && (
                              <Badge variant="outline" className="text-[10px] h-4">View</Badge>
                            )}
                            {ROLE_CAPABILITIES[member.role as keyof typeof ROLE_CAPABILITIES]?.canEdit && (
                              <Badge variant="outline" className="text-[10px] h-4">Edit</Badge>
                            )}
                            {ROLE_CAPABILITIES[member.role as keyof typeof ROLE_CAPABILITIES]?.canCreate && (
                              <Badge variant="outline" className="text-[10px] h-4">Create</Badge>
                            )}
                            {ROLE_CAPABILITIES[member.role as keyof typeof ROLE_CAPABILITIES]?.canDelete && (
                              <Badge variant="outline" className="text-[10px] h-4">Delete</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {member.role !== PERMISSION_LEVELS.OWNER && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRemoveMember(member.id)}
                              disabled={removeMemberMutation.isPending}
                            >
                              <X className="h-4 w-4" />
                              <span className="sr-only">Remove</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        No members found. Add members to collaborate on this project.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="text-lg font-medium">Permission Guide</CardTitle>
          <CardDescription>
            Understand the different permission levels available for project members
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Role</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Capabilities</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(ROLE_CAPABILITIES).map(([role, capabilities]) => (
                <TableRow key={role}>
                  <TableCell className="font-medium capitalize">{role}</TableCell>
                  <TableCell>{capabilities.description}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {capabilities.canView && (
                        <Badge variant="secondary" className="capitalize">View</Badge>
                      )}
                      {capabilities.canEdit && (
                        <Badge variant="secondary" className="capitalize">Edit</Badge>
                      )}
                      {capabilities.canCreate && (
                        <Badge variant="secondary" className="capitalize">Create</Badge>
                      )}
                      {capabilities.canDelete && (
                        <Badge variant="secondary" className="capitalize">Delete</Badge>
                      )}
                      {capabilities.canManageMembers && (
                        <Badge variant="secondary" className="capitalize">Manage Members</Badge>
                      )}
                      {capabilities.canTransferOwnership && (
                        <Badge variant="secondary" className="capitalize">Transfer Ownership</Badge>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}