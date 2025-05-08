import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest, queryClient } from '@/lib/queryClient';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
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
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Loader2, UserCheck, UserPlus, ShieldAlert, Filter } from 'lucide-react';

// User permission interface
interface Permission {
  id: number;
  name: string;
  description: string;
}

// User with role interface
interface UserWithPermissions {
  id: number;
  username: string;
  email: string;
  role: string;
  permissions: string[];
}

export default function PermissionManagementPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [newRole, setNewRole] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch all available permissions
  const { data: permissions, isLoading: permissionsLoading } = useQuery<Permission[]>({
    queryKey: ['/api/permissions'],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching permissions',
        description: error.message
      });
    }
  });

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery<UserWithPermissions[]>({
    queryKey: ['/api/users'],
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error fetching users',
        description: error.message
      });
    }
  });

  // Update user role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: number; role: string }) => {
      const res = await apiRequest('POST', `/api/users/${userId}/role`, { role });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Role updated',
        description: 'User role has been updated successfully'
      });
      // Refetch users to get updated roles
      queryClient.invalidateQueries({ queryKey: ['/api/users'] });
      setDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error updating role',
        description: error.message
      });
    }
  });

  // Function to handle role change
  const handleRoleChange = (userId: number) => {
    if (newRole && userId) {
      updateRoleMutation.mutate({ userId, role: newRole });
    }
  };

  // Filter users based on search term and role filter
  const filteredUsers = users?.filter(user => {
    const matchesSearch = 
      user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  // Open dialog to change a user's role
  const openRoleDialog = (userId: number, currentRole: string) => {
    setSelectedUserId(userId);
    setNewRole(currentRole);
    setDialogOpen(true);
  };

  // Function to get color based on role for badges
  const getRoleBadgeColor = (role: string): string => {
    switch (role) {
      case 'director':
        return 'bg-red-500';
      case 'admin':
        return 'bg-purple-500';
      case 'supervisor':
        return 'bg-blue-500';
      case 'roving_observer':
        return 'bg-green-500';
      case 'observer':
      default:
        return 'bg-gray-500';
    }
  };

  if (permissionsLoading || usersLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Permission Management</h1>
        <Button disabled={user?.role !== 'director'}>
          <UserPlus className="mr-2 h-4 w-4" />
          Add New User
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>User Permissions</CardTitle>
          <CardDescription>
            Manage user roles and permissions. Only Directors can change roles.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Input
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <Select
                value={roleFilter}
                onValueChange={setRoleFilter}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="observer">Observer</SelectItem>
                  <SelectItem value="roving_observer">Roving Observer</SelectItem>
                  <SelectItem value="supervisor">Supervisor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="director">Director</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Username</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Permissions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers && filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge className={`${getRoleBadgeColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {user.permissions?.slice(0, 3).map((permission, index) => (
                            <Badge key={index} variant="outline" className="mr-1">
                              {permission.replace(/_/g, ' ')}
                            </Badge>
                          ))}
                          {user.permissions?.length > 3 && (
                            <Badge variant="outline">+{user.permissions.length - 3} more</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => openRoleDialog(user.id, user.role)}
                          disabled={user?.role !== 'director'}
                        >
                          <UserCheck className="mr-2 h-4 w-4" />
                          Change Role
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-6">
                      {searchTerm || roleFilter !== 'all' ? (
                        <p>No users match your filters</p>
                      ) : (
                        <p>No users found in the system</p>
                      )}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline">Export Permissions</Button>
          {user?.role === 'director' && (
            <Button variant="destructive">
              <ShieldAlert className="mr-2 h-4 w-4" />
              Reset All Permissions
            </Button>
          )}
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change User Role</DialogTitle>
            <DialogDescription>
              This will update the user's role and permissions. This action can only be performed by Directors.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select
              value={newRole}
              onValueChange={setNewRole}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="observer">Observer</SelectItem>
                <SelectItem value="roving_observer">Roving Observer</SelectItem>
                <SelectItem value="supervisor">Supervisor</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="director">Director</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => selectedUserId && handleRoleChange(selectedUserId)}
              disabled={updateRoleMutation.isPending}
            >
              {updateRoleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}