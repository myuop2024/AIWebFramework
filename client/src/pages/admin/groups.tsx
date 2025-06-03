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
import { Plus, Edit, Trash2, Users } from 'lucide-react';

// API helpers
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
});

// Groups with real API integration

export default function AdminGroupsPage() {
  const queryClient = useQueryClient();
  
  // Fetch users (real API)
  const { data: users, isLoading: loadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: () => fetcher('/api/admin/users'),
  });

  // Real groups query
  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['groups'],
    queryFn: () => fetcher('/admin/groups'),
  });

  // Mutations with real API calls
  const createGroup = useMutation({
    mutationFn: async (data) => {
      const res = await fetch('/admin/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create group');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      toast({ title: 'Group created' });
    },
    onError: () => toast({ title: 'Failed to create group', variant: 'destructive' })
  });
  
  const updateGroup = useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await fetch(`/admin/groups/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update group');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      toast({ title: 'Group updated' });
    },
    onError: () => toast({ title: 'Failed to update group', variant: 'destructive' })
  });
  
  const deleteGroup = useMutation({
    mutationFn: async (id) => {
      const res = await fetch(`/admin/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete group');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      toast({ title: 'Group deleted' });
    },
    onError: () => toast({ title: 'Failed to delete group', variant: 'destructive' })
  });

  // UI state
  const [modalOpen, setModalOpen] = useState(false);
  const [editGroup, setEditGroup] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    members: [],
  });
  const [deletingGroup, setDeletingGroup] = useState(null);

  // Handlers
  const openAddModal = () => {
    setEditGroup(null);
    setForm({ name: '', description: '', members: [] });
    setModalOpen(true);
  };
  
  const openEditModal = (group) => {
    setEditGroup(group);
    setForm({
      name: group.name,
      description: group.description,
      members: group.members || [],
    });
    setModalOpen(true);
  };
  
  const handleFormChange = (field, value) => {
    setForm((f) => ({ ...f, [field]: value }));
  };
  
  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Group name is required', variant: 'destructive' });
      return;
    }
    
    if (editGroup) {
      updateGroup.mutate({ 
        id: editGroup.id, 
        name: form.name, 
        description: form.description, 
        members: form.members 
      });
    } else {
      createGroup.mutate({ 
        name: form.name, 
        description: form.description, 
        members: form.members 
      });
    }
    setModalOpen(false);
  };
  
  const handleDelete = (group) => {
    setDeletingGroup(group);
  };
  
  const confirmDelete = () => {
    deleteGroup.mutate(deletingGroup.id);
    setDeletingGroup(null);
  };

  // Loading/Error states
  if (loadingGroups || loadingUsers) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <Card className="max-w-5xl mx-auto mt-8">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Groups Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Organize users into groups for easier management</p>
        </div>
        <Button onClick={openAddModal}>
          <Plus className="h-4 w-4 mr-2" />
          Add Group
        </Button>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Created</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!groups || groups.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No groups found. Create your first group to get started.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => (
                <TableRow key={group.id}>
                  <TableCell className="font-semibold flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" /> 
                    {group.name}
                  </TableCell>
                  <TableCell>{group.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">
                        {group.members?.length || 0} members
                      </Badge>
                      <div className="flex flex-wrap gap-1">
                        {users?.filter(u => group.members?.includes(u.id)).slice(0, 3).map((user) => (
                          <Badge key={user.id} variant="outline" className="text-xs">
                            {user.firstName || user.username}
                          </Badge>
                        ))}
                        {group.members?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.members.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(group.createdAt).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => openEditModal(group)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDelete(group)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      {/* Add/Edit Group Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editGroup ? 'Edit Group' : 'Create New Group'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <Input
                placeholder="Enter group name"
                value={form.name}
                onChange={e => handleFormChange('name', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Description</label>
              <Input
                placeholder="Enter group description"
                value={form.description}
                onChange={e => handleFormChange('description', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Members</label>
              <Select
                value={form.members}
                onValueChange={vals => handleFormChange('members', vals)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select group members" />
                </SelectTrigger>
                <SelectContent>
                  {users?.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.firstName || user.username}</span>
                        <Badge variant="outline" className="text-xs">
                          {user.role}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Select users to include in this group
              </p>
            </div>
          </div>
          <DialogFooter className="mt-6">
            <Button 
              onClick={handleSave}
              disabled={createGroup.isPending || updateGroup.isPending}
            >
              {createGroup.isPending || updateGroup.isPending ? 'Saving...' : (editGroup ? 'Save Changes' : 'Create Group')}
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingGroup} onOpenChange={v => !v && setDeletingGroup(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Group</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Are you sure you want to delete the group <b>{deletingGroup?.name}</b>?</p>
            <p className="text-sm text-muted-foreground mt-2">
              This action cannot be undone. Group members will not be deleted, but the group organization will be lost.
            </p>
          </div>
          <DialogFooter>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteGroup.isPending}
            >
              {deleteGroup.isPending ? 'Deleting...' : 'Delete Group'}
            </Button>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
} 