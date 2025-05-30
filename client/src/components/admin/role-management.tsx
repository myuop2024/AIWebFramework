import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Plus, Pencil, Save } from "lucide-react";

// Types
interface Role {
  id: number;
  name: string;
  description?: string;
  permissions?: string[];
  isSystem?: boolean;
}

// Form schema
const roleSchema = z.object({
  name: z.string().min(2, { message: "Role name must be at least 2 characters" }),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

export function RoleManagement() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);

  // Fetch roles
  const { data: roles = [], isLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles']
  });

  // Add new role mutation
  const addRole = useMutation({
    mutationFn: async (roleData: { name: string, description?: string, permissions?: string[] }) => {
      return apiRequest(
        'POST',
        '/api/admin/roles',
        roleData
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      toast({
        title: "Role Created",
        description: "The role has been created successfully.",
      });
      setIsAddOpen(false);
    },
    onError: (error) => {
      console.error('Error creating role:', error);
      toast({
        title: "Failed to create role",
        description: "There was an error creating the role.",
        variant: "destructive",
      });
    }
  });

  // Update role mutation
  const updateRole = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Role> }) => {
      return apiRequest(
        'PATCH',
        `/api/admin/roles/${id}`,
        data
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      toast({
        title: "Role Updated",
        description: "The role has been updated successfully.",
      });
      setIsEditOpen(false);
      setIsRenameOpen(false);
      setIsPermissionsOpen(false);
    },
    onError: (error) => {
      console.error('Error updating role:', error);
      toast({
        title: "Failed to update role",
        description: "There was an error updating the role.",
        variant: "destructive",
      });
    }
  });

  // Form setup for add/edit role
  const form = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: selectedRole?.name || "",
      description: selectedRole?.description || "",
      permissions: selectedRole?.permissions || [],
    },
  });

  // Handle form submission
  const onSubmit = (data: RoleFormValues) => {
    if (selectedRole) {
      updateRole.mutate({ id: selectedRole.id, data });
    } else {
      addRole.mutate(data);
    }
  };

  // Handle edit permissions button
  const handleEditPermissions = (role: Role) => {
    setSelectedRole(role);
    setIsPermissionsOpen(true);
  };

  // Handle rename button
  const handleRename = (role: Role) => {
    setSelectedRole(role);
    form.reset({
      name: role.name,
      description: role.description,
      permissions: role.permissions,
    });
    setIsRenameOpen(true);
  };

  // Handle add new role
  const handleAddRole = () => {
    setSelectedRole(null);
    form.reset({
      name: "",
      description: "",
      permissions: [],
    });
    setIsAddOpen(true);
  };

  // Permissions list - matches the permissions set in the database
  const groupedPermissions = [
    {
      category: "User Management",
      permissions: [
        { id: "users:view", label: "View Users" },
        { id: "users:create", label: "Create Users" },
        { id: "users:edit", label: "Edit Users" },
        { id: "users:delete", label: "Delete Users" },
        { id: "users:assign-role", label: "Assign Roles to Users" },
        { id: "users:view-documents", label: "View User Documents" },
        { id: "users:verify", label: "Verify Users" },
        { id: "users:edit-status", label: "Edit User Status" },
        { id: "users:view-permissions", label: "View User Permissions" },
        { id: "users:search", label: "Search Users" },
        { id: "users:view-stats", label: "View User Statistics" },

      ],
    },
    {
      category: "Role Management",
      permissions: [
        { id: "roles:view", label: "View Roles" },
        { id: "roles:create", label: "Create Roles" },
        { id: "roles:edit", label: "Edit Roles" },
        { id: "roles:delete", label: "Delete Roles" },
      ],
    },
    {
      category: "System & Configuration",
      permissions: [
        { id: "system:view-stats", label: "View System Statistics" },
        { id: "system:view-info", label: "View System Information" },
        { id: "system:edit-settings", label: "Edit System Settings" },
        { id: "permissions:view-all-available", label: "View All Available Permissions"},
        { id: "system:test-didit-connection", label: "Test Didit Connection" },
        { id: "system:view-didit-settings", label: "View Didit Settings" },
        { id: "system:edit-didit-settings", label: "Edit Didit Settings" },
      ],
    },
    {
      category: "Supervisor Tasks",
      permissions: [
        { id: "supervisor-tasks:view-team", label: "View Supervisor Team" },
        { id: "supervisor-tasks:view-pending-reports", label: "View Pending Reports (Supervisor)" },
        { id: "supervisor-tasks:view-assignments", label: "View Assignments (Supervisor)" },
        { id: "supervisor-tasks:create-assignment", label: "Create Assignment (Supervisor)" },
        { id: "supervisor-tasks:cancel-assignment", label: "Cancel Assignment (Supervisor)" },
        { id: "supervisor-tasks:approve-report", label: "Approve Report (Supervisor)" },
        { id: "supervisor-tasks:reject-report", label: "Reject Report (Supervisor)" },
        { id: "supervisor-tasks:request-report-update", label: "Request Report Update (Supervisor)" },
      ],
    },
    {
      category: "Analytics",
      permissions: [
        { id: "analytics:view-summary", label: "View Analytics Summary" },
        { id: "analytics:view-users", label: "View User Analytics" },
        { id: "analytics:view-report-types", label: "View Report Type Analytics" },
        { id: "analytics:view-report-status", label: "View Report Status Analytics" },
        { id: "analytics:view-station-issues", label: "View Station Issue Analytics" },
        { id: "analytics:view-daily-activity", label: "View Daily Activity Analytics" },
        { id: "analytics:view-incident-predictions", label: "View Incident Predictions" },
        { id: "analytics:view-news", label: "View News Analytics" },
        { id: "analytics:view-dashboard", label: "View AI Analytics Dashboard" },
        { id: "analytics:predict-issues", label: "Predict Issues (Analytics)" },
        { id: "analytics:generate-report", label: "Generate Report (Analytics)" },
      ],
    }
  ];

  return (
    <>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>User Roles Management</CardTitle>
          <CardDescription>
            Configure roles and permissions for system users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {isLoading ? (
              <div className="text-center py-10">
                <div className="animate-spin w-10 h-10 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-gray-500">Loading roles...</p>
              </div>
            ) : (
              <>
                {roles.map((role) => (
                  <div key={role.id} className="p-3 bg-gray-50 rounded border">
                    <h4 className="font-medium mb-2">{role.name}</h4>
                    <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="px-2 py-1 bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200"
                        onClick={() => handleEditPermissions(role)}
                      >
                        Edit Permissions
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="px-2 py-1 bg-gray-100 text-gray-800 border-gray-200 hover:bg-gray-200"
                        onClick={() => handleRename(role)}
                        disabled={role.isSystem}
                      >
                        Rename
                      </Button>
                    </div>
                  </div>
                ))}
                <Button 
                  className="w-full mt-4" 
                  onClick={handleAddRole}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add New Role
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Role Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Role</DialogTitle>
            <DialogDescription>
              Create a new role with specific permissions
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the role's purpose and responsibilities" 
                        className="min-h-[80px]"
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsAddOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Create Role
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Rename Role Dialog */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Role</DialogTitle>
            <DialogDescription>
              Update the name and description for this role
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter role name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe the role's purpose" 
                        className="min-h-[80px]"
                        {...field} 
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button variant="outline" type="button" onClick={() => setIsRenameOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Edit Permissions Dialog */}
      <Dialog open={isPermissionsOpen} onOpenChange={setIsPermissionsOpen}>
        <DialogContent className="max-w-md md:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Permissions for {selectedRole?.name}</DialogTitle>
            <DialogDescription>
              Configure which actions users with this role can perform
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 max-h-[60vh] overflow-y-auto"> {/* Added max-h and overflow for scroll */}
            {groupedPermissions.map((group) => (
              <div key={group.category} className="mb-6">
                <h4 className="text-lg font-semibold mb-3 text-primary">{group.category}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                  {group.permissions.map((permission) => (
                    <div key={permission.id} className="flex items-center space-x-3 p-2 rounded-md hover:bg-gray-50 transition-colors">
                      <Switch
                        id={`permission-${permission.id}`}
                        checked={selectedRole?.permissions?.includes(permission.id) || false}
                        onCheckedChange={(checked) => {
                          if (!selectedRole) return;

                          const currentPermissions = selectedRole.permissions || [];
                          const newPermissions = checked
                            ? [...currentPermissions, permission.id]
                            : currentPermissions.filter(p => p !== permission.id);

                          setSelectedRole({
                            ...selectedRole,
                            permissions: newPermissions.filter((p, index, self) => self.indexOf(p) === index) // Ensure uniqueness
                          });
                        }}
                        className="data-[state=checked]:bg-primary"
                      />
                      <label
                        htmlFor={`permission-${permission.id}`}
                        className="text-sm font-medium cursor-pointer flex-1 leading-snug"
                      >
                        {permission.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPermissionsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (selectedRole) {
                  updateRole.mutate({ 
                    id: selectedRole.id, 
                    data: { permissions: selectedRole.permissions } 
                  });
                }
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Save Permissions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}