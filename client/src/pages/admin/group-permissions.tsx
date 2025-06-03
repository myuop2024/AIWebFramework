import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from '@/components/ui/use-toast';
import { Edit, Shield, Users, Check, X } from 'lucide-react';

// API helpers
const fetcher = (url: string) => fetch(url).then(res => {
  if (!res.ok) throw new Error(res.statusText);
  return res.json();
});

// Groups with permissions - real API integration

export default function AdminGroupPermissionsPage() {
  const queryClient = useQueryClient();
  
  // Fetch permissions (real API)
  const { data: permissionsData, isLoading: loadingPerms } = useQuery({
    queryKey: ['permissions'],
    queryFn: () => fetcher('/permissions'),
  });
  const permissions = permissionsData?.permissions || [];

  // Real groups with permissions query
  const { data: groups, isLoading: loadingGroups } = useQuery({
    queryKey: ['groups-permissions'],
    queryFn: () => fetcher('/admin/groups'),
    select: (data) => data.map(group => ({
      ...group,
      memberCount: group.members?.length || 0
    }))
  });

  // Mutations with real API calls
  const updateGroupPermissions = useMutation({
    mutationFn: async ({ groupId, permissions }) => {
      const res = await fetch(`/admin/groups/${groupId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions }),
      });
      if (!res.ok) throw new Error('Failed to update group permissions');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['groups-permissions']);
      toast({ title: 'Group permissions updated' });
    },
    onError: () => toast({ title: 'Failed to update group permissions', variant: 'destructive' })
  });

  // UI state
  const [editingGroup, setEditingGroup] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  // Handlers
  const openEditModal = (group) => {
    setEditingGroup(group);
    setSelectedPermissions(group.permissions || []);
    setModalOpen(true);
  };

  const togglePermission = (permission) => {
    setSelectedPermissions(prev => 
      prev.includes(permission) 
        ? prev.filter(p => p !== permission)
        : [...prev, permission]
    );
  };

  const handleSave = () => {
    if (!editingGroup) return;
    
    updateGroupPermissions.mutate({
      groupId: editingGroup.id,
      permissions: selectedPermissions
    });
    setModalOpen(false);
  };

  // Helper functions
  const getPermissionColor = (permission) => {
    if (permission.includes('Admin') || permission.includes('Delete')) return 'destructive';
    if (permission.includes('Edit') || permission.includes('Manage')) return 'default';
    if (permission.includes('View') || permission.includes('Access')) return 'secondary';
    return 'outline';
  };

  const getGroupPermissionStats = (group) => {
    const total = permissions.length;
    const assigned = group.permissions?.length || 0;
    const percentage = total > 0 ? Math.round((assigned / total) * 100) : 0;
    return { total, assigned, percentage };
  };

  // Loading states
  if (loadingGroups || loadingPerms) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  return (
    <Card className="max-w-6xl mx-auto mt-8">
      <CardHeader>
        <div>
          <CardTitle>Group Permissions Management</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Manage permissions for user groups to control access levels
          </p>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Group</TableHead>
              <TableHead>Members</TableHead>
              <TableHead>Permissions Coverage</TableHead>
              <TableHead>Assigned Permissions</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(!groups || groups.length === 0) ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  No groups found. Create groups first to manage their permissions.
                </TableCell>
              </TableRow>
            ) : (
              groups.map((group) => {
                const stats = getGroupPermissionStats(group);
                return (
                  <TableRow key={group.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-blue-600" />
                        <div>
                          <div className="font-semibold">{group.name}</div>
                          <div className="text-xs text-muted-foreground">{group.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {group.memberCount} members
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full" 
                            style={{ width: `${stats.percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {stats.assigned}/{stats.total} ({stats.percentage}%)
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {group.permissions?.slice(0, 3).map((permission) => (
                          <Badge key={permission} variant={getPermissionColor(permission)} className="text-xs">
                            {permission}
                          </Badge>
                        ))}
                        {group.permissions?.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{group.permissions.length - 3} more
                          </Badge>
                        )}
                        {(!group.permissions || group.permissions.length === 0) && (
                          <span className="text-xs text-muted-foreground">No permissions assigned</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => openEditModal(group)}>
                        <Edit className="h-4 w-4 mr-2" />
                        Edit Permissions
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        {/* Permissions Overview */}
        {groups && groups.length > 0 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Permissions Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {permissions.slice(0, 6).map((permission) => (
                <Card key={permission} className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-sm">{permission}</span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {groups.filter(g => g.permissions?.includes(permission)).map((group) => (
                      <Badge key={group.id} variant="outline" className="text-xs mr-1">
                        {group.name}
                      </Badge>
                    ))}
                    {groups.filter(g => g.permissions?.includes(permission)).length === 0 && (
                      <span className="text-xs text-muted-foreground">Not assigned to any group</span>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      {/* Edit Permissions Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Edit Permissions for {editingGroup?.name}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Select the permissions this group should have access to
            </p>
          </DialogHeader>
          
          <div className="max-h-96 overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {permissions.map((permission) => (
                <div key={permission} className="flex items-start space-x-3 p-2 rounded hover:bg-gray-50">
                  <Checkbox
                    id={permission}
                    checked={selectedPermissions.includes(permission)}
                    onCheckedChange={() => togglePermission(permission)}
                  />
                  <div className="flex-1">
                    <label htmlFor={permission} className="text-sm font-medium cursor-pointer">
                      {permission}
                    </label>
                    <div className="flex items-center gap-1 mt-1">
                      {selectedPermissions.includes(permission) ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <X className="h-3 w-3 text-gray-400" />
                      )}
                      <span className="text-xs text-muted-foreground">
                        {selectedPermissions.includes(permission) ? 'Granted' : 'Not granted'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
              <span>Selected: {selectedPermissions.length} of {permissions.length} permissions</span>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPermissions([])}
                >
                  Clear All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedPermissions([...permissions])}
                >
                  Select All
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button 
              onClick={handleSave}
              disabled={updateGroupPermissions.isPending}
            >
              {updateGroupPermissions.isPending ? 'Saving...' : 'Save Permissions'}
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