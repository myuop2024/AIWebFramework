import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Check, AlertCircle } from "lucide-react";

// Define a schema for user form
const userSchema = z.object({
  username: z.string()
    .min(3, { message: "Username must be at least 3 characters" })
    .regex(/^[a-zA-Z0-9_-]+$/, { message: "Username can only contain letters, numbers, underscores and hyphens" }),
  email: z.string()
    .email({ message: "Please enter a valid email address" }),
  password: z.string()
    .min(6, { message: "Password must be at least 6 characters" })
    .optional()
    .or(z.literal('')),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  role: z.string(),
  observerId: z.string().optional(),
  notes: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Schema for editing a user (password optional)
const editUserSchema = userSchema.extend({
  password: z.string().optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

interface User {
  id?: number;
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  observerId?: string;
  notes?: string;
  isActive?: boolean;
  verificationStatus?: string;
}

interface UserFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
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
  const [error, setError] = useState<string | null>(null);
  
  // Determine if we're editing (user provided) or creating (no user)
  const isEditing = !!user;
  
  // Use the appropriate schema
  const formSchema = isEditing ? editUserSchema : userSchema;
  
  // Initialize form with default values
  const form = useForm<UserFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      username: user?.username || "",
      email: user?.email || "",
      password: "", // Always start with empty password field
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      role: user?.role || "observer",
      observerId: user?.observerId || "",
      notes: user?.notes || "",
      isActive: user?.isActive !== undefined ? user.isActive : true,
    },
  });
  
  // Update form when user prop changes
  useEffect(() => {
    if (user) {
      form.reset({
        username: user.username || "",
        email: user.email || "",
        password: "", // Always reset password field
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        role: user.role || "observer",
        observerId: user.observerId || "",
        notes: user.notes || "",
        isActive: user.isActive !== undefined ? user.isActive : true,
      });
    }
  }, [user, form]);
  
  // Reset form on close
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setError(null);
    }
  }, [isOpen, form]);
  
  const handleSubmit = (values: UserFormValues) => {
    setError(null);
    
    // For editing, if password is empty, remove it from the submission
    if (isEditing && (!values.password || values.password.trim() === '')) {
      const { password, ...dataWithoutPassword } = values;
      onSubmit(dataWithoutPassword);
    } else {
      onSubmit(values);
    }
  };
  
  const handleCancel = () => {
    form.reset();
    onClose();
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Edit user details below." : "Enter details to create a new user."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-start">
                <AlertCircle className="h-5 w-5 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Username*</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="username" 
                        {...field} 
                        disabled={isEditing} // Cannot edit username once created
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>
                        Username cannot be changed
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email*</FormLabel>
                    <FormControl>
                      <Input 
                        type="email" 
                        placeholder="user@example.com" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>First Name</FormLabel>
                    <FormControl>
                      <Input placeholder="First name" {...field} />
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
                      <Input placeholder="Last name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEditing ? "New Password" : "Password*"}</FormLabel>
                    <FormControl>
                      <Input 
                        type="password" 
                        placeholder={isEditing ? "Leave blank to keep current" : "Password"} 
                        {...field}
                      />
                    </FormControl>
                    {isEditing && (
                      <FormDescription>
                        Leave blank to keep current password
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role*</FormLabel>
                    <Select 
                      value={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Administrator</SelectItem>
                        <SelectItem value="supervisor">Supervisor</SelectItem>
                        <SelectItem value="observer">Observer</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="observerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observer ID</FormLabel>
                    <FormControl>
                      <Input placeholder="OBS123" {...field} />
                    </FormControl>
                    <FormDescription>
                      Unique identifier used in the field
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add additional information about this user" 
                          className="resize-none" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="col-span-2">
                <FormField
                  control={form.control}
                  name="isActive"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Account</FormLabel>
                        <FormDescription>
                          Inactive accounts cannot log in to the system
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
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={handleCancel}>
                Cancel
              </Button>
              <Button type="submit">
                <Check className="h-4 w-4 mr-2" />
                {isEditing ? "Update User" : "Create User"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}