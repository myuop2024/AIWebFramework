import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { Plus, Edit, Trash2, Users, Shield } from 'lucide-react';

// API helpers
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
});

export default function AdminRolesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  // Fetch roles
  const { data: roles, isLoading: loadingRoles, error: errorRoles } = useQuery({
    queryKey: ['roles'],
    queryFn: () => fetcher('/admin/roles'),
  });
  // Fetch permissions
  const { data: permissionsData, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => fetcher('/permissions'),
  });
  const permissions = permissionsData?.permissions || [];
  // Fetch users
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetcher('/api/admin/users'),
  });

  // Mutations
  const createRole = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/admin/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast({ title: 'Role created' });
    },
    onError: () => toast({ title: 'Failed to create role', variant: 'destructive' })
  });
  const updateRole = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/admin/roles/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast({ title: 'Role updated' });
    },
    onError: () => toast({ title: 'Failed to update role', variant: 'destructive' })
  });
  const deleteRole = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/admin/roles/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete role');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['roles']);
      toast({ title: 'Role deleted' });
    },
    onError: () => toast({ title: 'Failed to delete role', variant: 'destructive' })
  });
  // Assign user to role
  const assignUserRole = useMutation({
    mutationFn: async ({ userId, role }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error('Failed to assign user role');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['users']);
      toast({ title: 'User role updated' });
    },
    onError: () => toast({ title: 'Failed to update user role', variant: 'destructive' })
  });

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    permissions: [],
    users: [],
  });
  const [deletingRole, setDeletingRole] = useState(null);

  // Handlers
  const openAddModal = () => {
    setEditRole(null);
    setForm({ name: '', description: '', permissions: [], users: [] });
    setModalOpen(true);
  };
  const openEditModal = (role) => {
    setEditRole(role);
    setForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions || [],
      users: users?.filter(u => u.role === role.name).map(u => u.id) || [],
    });
    setModalOpen(true);
  };
  const handleFormChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };
  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Role name is required', variant: 'destructive' });
      return;
    }
    if (editRole) {
      updateRole.mutate({ id: editRole.id, name: form.name, description: form.description, permissions: form.permissions });
      // Assign users to role
      const usersToAssign = form.users || [];
      users?.forEach(u => {
        if (usersToAssign.includes(u.id) && u.role !== form.name) {
          assignUserRole.mutate({ userId: u.id, role: form.name });
        }
        if (!usersToAssign.includes(u.id) && u.role === form.name) {
          assignUserRole.mutate({ userId: u.id, role: 'observer' }); // fallback role
        }
      });
    } else {
      createRole.mutate({ name: form.name, description: form.description, permissions: form.permissions });
    }
    setModalOpen(false);
  };
  const handleDelete = (role) => {
    setDeletingRole(role);
  };
  const confirmDelete = () => {
    deleteRole.mutate(deletingRole.id);
    setDeletingRole(null);
  };

  // Loading/Error states
  if (loadingRoles || loadingPerms || loadingUsers) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }
  if (errorRoles) {
    return <div className="p-8 text-center text-red-600">Failed to load roles.</div>;
  }

  return (
    <Card className="max-w-5xl mx-auto mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Roles Management</CardTitle>
        </div>
        <Button onClick={openAddModal} icon={<Plus className="h-4 w-4" />}>Add Role</Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>Users</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">No roles found.</TableCell>
              </TableRow>
            ) : (
              roles.map((role) => (
                <TableRow key={role.id}>
                  <TableCell className="font-semibold flex items-center gap-2">
                    <Shield className="h-4 w-4 text-blue-600" /> {role.name}
                  </TableCell>
                  <TableCell>{role.description}</TableCell>
                  <TableCell>
                    {(role.permissions || []).map((p) => (
                      <Badge key={p} className="mr-1 mb-1">{p}</Badge>
                    ))}
                  </TableCell>
                  <TableCell>
                    {users?.filter(u => u.role === role.name).length === 0 ? (
                      <span className="text-xs text-muted-foreground">None</span>
                    ) : (
                      users?.filter(u => u.role === role.name).map((user) => (
                        <Badge key={user.id} className="mr-1 mb-1" variant="secondary">
                          <Users className="h-3 w-3 mr-1 inline" /> {user.firstName || user.username}
                        </Badge>
                      ))
                    )}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(role)}><Edit className="h-4 w-4" /></Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(role)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add/Edit Role Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editRole ? 'Edit Role' : 'Add Role'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              label="Role Name"
              placeholder="Enter role name"
              value={form.name}
              onChange={e => handleFormChange('name', e.target.value)}
            />
            <Input
              label="Description"
              placeholder="Enter description"
              value={form.description}
              onChange={e => handleFormChange('description', e.target.value)}
            />
            <div>
              <label className="block text-sm font-medium mb-1">Permissions</label>
              <Select
                multiple
                value={form.permissions}
                onValueChange={vals => handleFormChange('permissions', vals)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select permissions" />
                </SelectTrigger>
                <SelectContent>
                  {permissions.map((perm) => (
                    <SelectItem key={perm} value={perm}>{perm}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Users</label>
              <Select
                multiple
                value={form.users}
                onValueChange={vals => handleFormChange('users', vals)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Assign users to this role" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>{user.firstName || user.username}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button onClick={handleSave}>{editRole ? 'Save Changes' : 'Add Role'}</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingRole} onOpenChange={v => !v && setDeletingRole(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Role</DialogTitle>
          </DialogHeader>
          <p>Are you sure you want to delete the role <b>{deletingRole?.name}</b>?</p>
          <DialogFooter className="mt-4">
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}