import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { type User } from '@shared/schema';

// Form validation schema
const userSchema = z.object({
  username: z.string().min(3, { message: "Username must be at least 3 characters" }),
  email: z.string().email({ message: "Please enter a valid email address" }),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string().default("observer"),
  observerId: z.string().optional(),
  isActive: z.boolean().default(true),
  verificationStatus: z.string().default("pending"),
  notes: z.string().optional(),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }).optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: User) => void;
  user?: User;
  title: string;
}

export function UserForm({
  isOpen,
  onClose,
  onSubmit,
  user,
  title,
}: UserFormProps) {
  const [activeTab, setActiveTab] = useState("basic");
  const [passwordMode, setPasswordMode] = useState(user ? "keep" : "set");

  const defaultValues: Partial<UserFormValues> = {
    username: user?.username || "",
    email: user?.email || "",
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    role: user?.role || "observer",
    observerId: user?.observerId || "",
    isActive: user?.isActive ?? true,
    verificationStatus: user?.verificationStatus || "pending",
    notes: user?.notes || "",
    password: "",
  };

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues,
    mode: "onChange",
  });

  // Form submission handler
  const handleSubmit = (values: UserFormValues) => {
    // Remove password if it's not being changed
    if (user && passwordMode === "keep") {
      delete values.password;
    }

    onSubmit(values as User);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {user
              ? "Edit the user's information below."
              : "Fill out the form below to create a new user."}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4 w-full">
                <TabsTrigger value="basic" className="flex-1">
                  Basic Info
                </TabsTrigger>
                <TabsTrigger value="account" className="flex-1">
                  Account
                </TabsTrigger>
                <TabsTrigger value="additional" className="flex-1">
                  Additional
                </TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="John" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem className="col-span-2">
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="johndoe@example.com"
                            type="email"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" {...field} />
                        </FormControl>
                        <FormDescription>
                          This will be used for login purposes.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {user ? (
                    <div className="space-y-3">
                      <div className="text-sm font-medium">Password</div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="keep-password"
                          name="password-mode"
                          value="keep"
                          checked={passwordMode === "keep"}
                          onChange={() => setPasswordMode("keep")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor="keep-password"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Keep existing password
                        </label>
                      </div>
                      
                      <div className="flex items-center space-x-2">
                        <input
                          type="radio"
                          id="change-password"
                          name="password-mode"
                          value="change"
                          checked={passwordMode === "set"}
                          onChange={() => setPasswordMode("set")}
                          className="h-4 w-4 border-gray-300 text-primary focus:ring-primary"
                        />
                        <label
                          htmlFor="change-password"
                          className="block text-sm font-medium text-gray-700"
                        >
                          Change password
                        </label>
                      </div>

                      {passwordMode === "set" && (
                        <FormField
                          control={form.control}
                          name="password"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>New Password</FormLabel>
                              <FormControl>
                                <Input
                                  type="password"
                                  placeholder="********"
                                  {...field}
                                />
                              </FormControl>
                              <FormDescription>
                                Must be at least 8 characters.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  ) : (
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="********"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Must be at least 8 characters.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="role"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Role</FormLabel>
                        <FormControl>
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admin">Administrator</SelectItem>
                              <SelectItem value="supervisor">Supervisor</SelectItem>
                              <SelectItem value="observer">Observer</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormDescription>
                          Determines user's access level and permissions.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="isActive"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between space-x-3 space-y-0 rounded-md border p-4">
                          <div className="space-y-1">
                            <FormLabel>Active Status</FormLabel>
                            <FormDescription>
                              Determines if user can log in to the system.
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="verificationStatus"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Verification Status</FormLabel>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="pending">Pending</SelectItem>
                                <SelectItem value="verified">Verified</SelectItem>
                                <SelectItem value="rejected">Rejected</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Additional Tab */}
              <TabsContent value="additional">
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="observerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Observer ID</FormLabel>
                        <FormControl>
                          <Input placeholder="OBS-12345" {...field} value={field.value || ""} />
                        </FormControl>
                        <FormDescription>
                          Unique identifier for the observer (if applicable).
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Additional information about this user..."
                            className="min-h-[120px]"
                            {...field}
                            value={field.value || ""}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {user && (
                    <Alert className="bg-blue-50 border border-blue-200">
                      <AlertCircle className="h-4 w-4 text-blue-500" />
                      <AlertTitle className="text-blue-700">Information</AlertTitle>
                      <AlertDescription className="text-blue-600">
                        Extended profile details like address, phone number, and emergency contacts 
                        can be managed through the user detail view after creation.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button variant="outline" type="button" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                {user ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}