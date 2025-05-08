import { useState } from "react";
import { RoleGuard } from "@/components/auth/role-guard";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { 
  UserPlus, 
  ShieldCheck, 
  ShieldAlert, 
  ShieldQuestion,
  Edit2,
  Search,
  AlertCircle
} from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue, 
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";

// Mock data for demonstration purposes
const mockUsers = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "observer", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "supervisor", status: "active" },
  { id: 3, name: "Robert Johnson", email: "robert@example.com", role: "roving_observer", status: "active" },
  { id: 4, name: "Emily Davis", email: "emily@example.com", role: "admin", status: "active" },
  { id: 5, name: "Michael Wilson", email: "michael@example.com", role: "director", status: "active" },
];

export default function PermissionManagementPage() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  
  // Only director and admin can access this page
  return (
    <RoleGuard allowedRoles={["admin", "director"]}>
      <div className="container py-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">User Permissions</h1>
            <p className="text-muted-foreground">
              Manage user roles and permissions across the platform
            </p>
          </div>
          <Button>
            <UserPlus className="mr-2 h-4 w-4" />
            Add User
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <ShieldCheck className="mr-2 h-5 w-5" />
              User Role Management
            </CardTitle>
            <CardDescription>
              Assign and manage roles for all users in the system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search users..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="w-full md:w-64">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Roles</SelectItem>
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
                    <TableHead className="w-12">
                      <Checkbox />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mockUsers
                    .filter(u => 
                      (roleFilter === "" || u.role === roleFilter) && 
                      (u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                    )
                    .map((u) => (
                      <TableRow key={u.id}>
                        <TableCell>
                          <Checkbox />
                        </TableCell>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            {u.role === "director" && <ShieldAlert className="mr-2 h-4 w-4 text-red-500" />}
                            {u.role === "admin" && <ShieldCheck className="mr-2 h-4 w-4 text-blue-500" />}
                            {u.role === "supervisor" && <ShieldCheck className="mr-2 h-4 w-4 text-green-500" />}
                            {u.role === "roving_observer" && <ShieldQuestion className="mr-2 h-4 w-4 text-orange-500" />}
                            {u.role === "observer" && <ShieldQuestion className="mr-2 h-4 w-4 text-gray-500" />}
                            <span className="capitalize">{u.role.replace('_', ' ')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {u.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">
                            <Edit2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="flex items-center text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4 mr-1" />
              Changing a user's role will affect their access permissions
            </div>
            <Button variant="outline">Export Users</Button>
          </CardFooter>
        </Card>
      </div>
    </RoleGuard>
  );
}