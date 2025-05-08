import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/main-layout';
import { FormTemplateEditor } from '@/components/forms/form-template-editor';
import { FormBuilder } from '@/components/forms/form-builder';
import { 
  PageHeader, 
  PageHeaderDescription, 
  PageHeaderHeading 
} from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { FormField as FormFieldComponent } from '@/components/registration/dynamic-form';

import { 
  ClipboardEdit, 
  Eye, 
  MoreVertical, 
  Plus, 
  RefreshCw, 
  Trash,
  CheckCircle2, 
  XCircle,
  Filter,
  Edit,
  PlusCircle,
  Save,
  Trash2,
  AlertCircle,
  UserPlus
} from 'lucide-react';
import { 
  type FormTemplate,
  type FormTemplateExtended,
  type RegistrationForm,
  type FormField
} from '@shared/schema';

export default function FormTemplatesPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  
  // Registration Form States
  const [selectedForm, setSelectedForm] = useState<RegistrationForm | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
      navigate("/dashboard");
    }
  }, [user, isLoading, navigate, toast]);

  // Query to get all form templates
  const { data: templates = [], isLoading: isTemplatesLoading, refetch } = useQuery<FormTemplate[]>({
    queryKey: ['/api/form-templates'],
    enabled: !!user && user.role === 'admin'
  });
  
  // Query to get all registration forms
  const { 
    data: registrationForms = [], 
    isLoading: isLoadingForms 
  } = useQuery<RegistrationForm[]>({
    queryKey: ['/api/registration-forms'],
    enabled: !!user && user.role === 'admin'
  });

  // Create a new template
  const createTemplateMutation = useMutation({
    mutationFn: async (templateData: FormTemplateExtended) => {
      const res = await apiRequest('POST', '/api/form-templates', {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        fields: { sections: templateData.sections },
        isActive: true,
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Created",
        description: "Form template created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      setIsCreating(false);
    },
    onError: (error) => {
      toast({
        title: "Failed to Create Template",
        description: `Error: ${error.toString()}`,
        variant: "destructive"
      });
    }
  });

  // Update an existing template
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormTemplateExtended }) => {
      const res = await apiRequest('PATCH', `/api/form-templates/${id}`, {
        name: data.name,
        description: data.description,
        category: data.category,
        fields: { sections: data.sections },
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Updated",
        description: "Form template updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      setIsEditing(false);
      setActiveTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Template",
        description: `Error: ${error.toString()}`,
        variant: "destructive"
      });
    }
  });

  // Toggle template active status
  const toggleStatusMutation = useMutation({
    mutationFn: async (template: FormTemplate) => {
      const res = await apiRequest('PATCH', `/api/form-templates/${template.id}/status`, {
        isActive: !template.isActive
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Status Updated",
        description: "Template status updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Update Status",
        description: `Error: ${error.toString()}`,
        variant: "destructive"
      });
    }
  });

  // Delete a template
  const deleteTemplateMutation = useMutation({
    mutationFn: async (template: FormTemplate) => {
      const res = await apiRequest('DELETE', `/api/form-templates/${template.id}`, {});
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Template Deleted",
        description: "Form template deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
    },
    onError: (error) => {
      toast({
        title: "Failed to Delete Template",
        description: `Error: ${error.toString()}`,
        variant: "destructive"
      });
    }
  });
  
  // Registration Form Mutations
  const updateFormMutation = useMutation({
    mutationFn: async ({ id, formData }: { id: number; formData: any }) => {
      const res = await apiRequest('PATCH', `/api/registration-forms/${id}`, formData);
      return await res.json();
    },
    onSuccess: () => {
      setSuccess("Registration form updated successfully");
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['/api/registration-forms'] });
    },
    onError: (error) => {
      setError(`Failed to update form: ${error.toString()}`);
      setTimeout(() => setError(''), 3000);
    }
  });
  
  const activateFormMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest('POST', `/api/registration-forms/${id}/activate`, {});
      return await res.json();
    },
    onSuccess: () => {
      setSuccess("Registration form activated successfully");
      setTimeout(() => setSuccess(''), 3000);
      queryClient.invalidateQueries({ queryKey: ['/api/registration-forms'] });
    },
    onError: (error) => {
      setError(`Failed to activate form: ${error.toString()}`);
      setTimeout(() => setError(''), 3000);
    }
  });

  // Event handlers
  const handleCreateTemplate = (templateData: FormTemplateExtended) => {
    createTemplateMutation.mutate(templateData);
  };

  const handleUpdateTemplate = (templateData: FormTemplateExtended) => {
    if (!activeTemplate) return;
    updateTemplateMutation.mutate({ id: activeTemplate.id, data: templateData });
  };

  const handleToggleStatus = (template: FormTemplate) => {
    toggleStatusMutation.mutate(template);
  };

  const handleDeleteTemplate = (template: FormTemplate) => {
    deleteTemplateMutation.mutate(template);
  };

  const handleEditTemplate = (template: FormTemplate) => {
    setActiveTemplate(template);
    setIsEditing(true);
  };

  const handlePreviewTemplate = (template: FormTemplate) => {
    setActiveTemplate(template);
    setIsPreviewing(true);
  };
  
  // Registration Form Handlers
  const handleActivateForm = (id: number) => {
    activateFormMutation.mutate(id);
  };
  
  const handleAddField = () => {
    if (!selectedForm || !selectedForm.fields) return;
    
    setEditingField({
      id: `new-${Date.now()}`,
      name: '',
      type: 'text',
      label: '',
      placeholder: '',
      order: selectedForm.fields.length + 1,
      required: false,
      isAdminOnly: false,
      isUserEditable: true
    } as FormField);
    setShowFieldEditor(true);
  };
  
  const handleEditField = (field: FormField) => {
    setEditingField({...field});
    setShowFieldEditor(true);
  };
  
  const handleRemoveField = (fieldId: string | number) => {
    if (!selectedForm || !selectedForm.fields) return;
    
    const updatedFields = selectedForm.fields.filter(f => f.id !== fieldId);
    
    // Reorder remaining fields
    const reorderedFields = updatedFields.map((field, index) => ({
      ...field,
      order: index + 1
    }));
    
    updateFormMutation.mutate({
      id: selectedForm.id,
      formData: {
        fields: reorderedFields
      }
    });
    
    setSelectedForm({
      ...selectedForm,
      fields: reorderedFields
    });
  };
  
  const handleChangeFieldOrder = (fieldId: string | number, direction: 'up' | 'down') => {
    if (!selectedForm || !selectedForm.fields) return;
    
    const fields = [...selectedForm.fields];
    const index = fields.findIndex(f => f.id === fieldId);
    
    if (index === -1) return;
    
    if (direction === 'up' && index > 0) {
      // Swap with previous field
      const temp = fields[index];
      fields[index] = {...fields[index - 1], order: temp.order};
      fields[index - 1] = {...temp, order: fields[index].order};
    } else if (direction === 'down' && index < fields.length - 1) {
      // Swap with next field
      const temp = fields[index];
      fields[index] = {...fields[index + 1], order: temp.order};
      fields[index + 1] = {...temp, order: fields[index].order};
    }
    
    updateFormMutation.mutate({
      id: selectedForm.id,
      formData: {
        fields
      }
    });
    
    setSelectedForm({
      ...selectedForm,
      fields
    });
  };
  
  const handleSaveField = () => {
    if (!selectedForm || !editingField || !selectedForm.fields) return;
    
    const fields = [...selectedForm.fields];
    const isNew = typeof editingField.id === 'string' && editingField.id.startsWith('new');
    
    if (isNew) {
      // Add new field with a proper id
      const newField = {
        ...editingField,
        id: (editingField.id as string).replace('new-', '')
      };
      fields.push(newField as FormField);
    } else {
      // Update existing field
      const index = fields.findIndex(f => f.id === editingField.id);
      if (index !== -1) {
        fields[index] = editingField;
      }
    }
    
    updateFormMutation.mutate({
      id: selectedForm.id,
      formData: {
        fields
      }
    });
    
    setSelectedForm({
      ...selectedForm,
      fields
    });
    
    setShowFieldEditor(false);
    setEditingField(null);
  };

  // Filter templates by category
  const filteredTemplates = categoryFilter 
    ? templates.filter((template: FormTemplate) => template.category === categoryFilter)
    : templates;

  // Get unique categories from existing templates
  const templateCategories = Array.from(
    new Set(templates.map((template: FormTemplate) => template.category))
  );
  
  // Make sure we include all standard categories even if no templates exist for them yet
  const standardCategories = ['polling', 'incident', 'observation', 'checklist', 'evaluation'];
  const categories = Array.from(new Set([...templateCategories, ...standardCategories]));

  const renderFieldEditor = () => {
    if (!editingField) return null;
    
    return (
      <div className="space-y-4 py-4">
        <div className="space-y-2">
          <Label htmlFor="field-name">Field Name</Label>
          <Input
            id="field-name"
            value={editingField.name}
            onChange={(e) => setEditingField({...editingField, name: e.target.value})}
            placeholder="e.g. firstName, address, phoneNumber"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-label">Field Label</Label>
          <Input
            id="field-label"
            value={editingField.label}
            onChange={(e) => setEditingField({...editingField, label: e.target.value})}
            placeholder="e.g. First Name, Home Address, Phone Number"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-placeholder">Placeholder</Label>
          <Input
            id="field-placeholder"
            value={editingField.placeholder || ''}
            onChange={(e) => setEditingField({...editingField, placeholder: e.target.value})}
            placeholder="e.g. Enter your first name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-type">Field Type</Label>
          <Select
            value={editingField.type}
            onValueChange={(value) => setEditingField({...editingField, type: value})}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select field type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="text">Text</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="password">Password</SelectItem>
              <SelectItem value="number">Number</SelectItem>
              <SelectItem value="tel">Telephone</SelectItem>
              <SelectItem value="date">Date</SelectItem>
              <SelectItem value="select">Dropdown</SelectItem>
              <SelectItem value="textarea">Text Area</SelectItem>
              <SelectItem value="checkbox">Checkbox</SelectItem>
              <SelectItem value="radio">Radio Buttons</SelectItem>
              <SelectItem value="file">File Upload</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {(editingField.type === 'select' || editingField.type === 'radio') && (
          <div className="space-y-2">
            <Label htmlFor="field-options">Options (comma separated)</Label>
            <Textarea
              id="field-options"
              value={editingField.options?.join(', ') || ''}
              onChange={(e) => setEditingField({
                ...editingField, 
                options: e.target.value.split(',').map(opt => opt.trim()).filter(Boolean)
              })}
              placeholder="e.g. Option 1, Option 2, Option 3"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="field-mapping">Map to User Field</Label>
          <Select
            value={editingField.mapToUserField || 'none'}
            onValueChange={(value) => {
              if (value === "none") {
                const { mapToUserField, ...rest } = editingField;
                setEditingField(rest);
              } else {
                setEditingField({...editingField, mapToUserField: value});
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Map to user field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="firstName">First Name</SelectItem>
              <SelectItem value="lastName">Last Name</SelectItem>
              <SelectItem value="email">Email</SelectItem>
              <SelectItem value="phoneNumber">Phone Number</SelectItem>
              <SelectItem value="username">Username</SelectItem>
              <SelectItem value="password">Password</SelectItem>
              <SelectItem value="role">Role</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-profile-mapping">Map to Profile Field</Label>
          <Select
            value={editingField.mapToProfileField || 'none'}
            onValueChange={(value) => {
              if (value === "none") {
                const { mapToProfileField, ...rest } = editingField;
                setEditingField(rest);
              } else {
                setEditingField({...editingField, mapToProfileField: value});
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Map to profile field" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="address">Address</SelectItem>
              <SelectItem value="city">City</SelectItem>
              <SelectItem value="state">State/Parish</SelectItem>
              <SelectItem value="zipCode">Zip/Postal Code</SelectItem>
              <SelectItem value="country">Country</SelectItem>
              <SelectItem value="idType">ID Type</SelectItem>
              <SelectItem value="idNumber">ID Number</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center space-x-2 mt-6">
          <Checkbox 
            id="field-required"
            checked={editingField.required || false} 
            onCheckedChange={(checked) => setEditingField({...editingField, required: checked === true})}
          />
          <Label htmlFor="field-required">Required Field</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="field-admin-only"
            checked={editingField.isAdminOnly || false} 
            onCheckedChange={(checked) => setEditingField({...editingField, isAdminOnly: checked === true})}
          />
          <Label htmlFor="field-admin-only">Admin-Only Field</Label>
        </div>
        
        <div className="flex items-center space-x-2">
          <Checkbox 
            id="field-editable"
            checked={editingField.isUserEditable !== false} 
            onCheckedChange={(checked) => setEditingField({...editingField, isUserEditable: checked === true})}
          />
          <Label htmlFor="field-editable">User Can Edit</Label>
        </div>
      </div>
    );
  };

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
        <Tabs defaultValue="templates" className="space-y-6">
          <TabsList className="grid w-full sm:w-auto grid-cols-2">
            <TabsTrigger value="templates">Form Templates</TabsTrigger>
            <TabsTrigger value="registration">Registration Forms</TabsTrigger>
          </TabsList>
          
          <TabsContent value="templates" className="space-y-6">
            <PageHeader className="pb-8">
              <div className="flex items-center justify-between">
                <div>
                  <PageHeaderHeading>Form Templates</PageHeaderHeading>
                  <PageHeaderDescription>
                    Create and manage form templates for various types of reports and observations
                  </PageHeaderDescription>
                </div>
                <Button onClick={() => setIsCreating(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Template
                </Button>
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                <Button
                  variant={categoryFilter === null ? "secondary" : "outline"}
                  size="sm"
                  onClick={() => setCategoryFilter(null)}
                >
                  All
                </Button>
                {categories.map((category) => (
                  <Button
                    key={category}
                    variant={categoryFilter === category ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter(category)}
                  >
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Button>
                ))}
              </div>
            </PageHeader>

        {isTemplatesLoading ? (
          <div className="flex justify-center items-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTemplates.map((template: FormTemplate) => (
              <Card key={template.id} className="overflow-hidden">
                <CardHeader className="pb-3 flex flex-row justify-between items-start">
                  <div>
                    <CardTitle className="text-lg font-semibold">{template.name}</CardTitle>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="capitalize">
                        {template.category}
                      </Badge>
                      {template.isActive ? (
                        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-gray-100 text-gray-800 hover:bg-gray-200">
                          <XCircle className="h-3 w-3 mr-1" /> Inactive
                        </Badge>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handlePreviewTemplate(template)}>
                        <Eye className="h-4 w-4 mr-2" />
                        Preview
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <ClipboardEdit className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleStatus(template)}>
                        {template.isActive ? (
                          <>
                            <XCircle className="h-4 w-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Form Template</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete the "{template.name}" template? 
                              This action cannot be undone and may affect existing reports.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDeleteTemplate(template)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500 line-clamp-2">
                    {template.description || "No description provided"}
                  </p>
                  <div className="flex justify-between mt-4">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handlePreviewTemplate(template)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      Preview
                    </Button>
                    <Button 
                      variant="default" 
                      size="sm"
                      onClick={() => handleEditTemplate(template)}
                    >
                      <ClipboardEdit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {filteredTemplates.length === 0 && (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <div className="rounded-full bg-gray-100 p-3 mb-3">
                  <ClipboardEdit className="h-6 w-6 text-gray-400" />
                </div>
                <h3 className="text-lg font-medium">No templates found</h3>
                <p className="text-sm text-gray-500 max-w-md mt-1">
                  {categoryFilter 
                    ? `No templates found in the ${categoryFilter} category. Try another category or create a new template.`
                    : "No form templates found. Click the 'New Template' button to create your first template."}
                </p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsCreating(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </div>
            )}
          </div>
        )}
        </TabsContent>
        
        <TabsContent value="registration" className="space-y-6">
          <PageHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <PageHeaderHeading>Registration Forms</PageHeaderHeading>
                <PageHeaderDescription>
                  Configure and manage dynamic registration forms with custom fields
                </PageHeaderDescription>
              </div>
            </div>
          </PageHeader>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center mb-4">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex items-center mb-4">
              <CheckCircle2 className="h-5 w-5 mr-2" />
              {success}
            </div>
          )}
          
          {isLoadingForms ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle>Available Registration Forms</CardTitle>
                  <CardDescription>
                    Select a form to customize its fields. Set a form as active to use it for new registrations.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {registrationForms.map((form) => (
                        <TableRow key={form.id} className={selectedForm?.id === form.id ? 'bg-muted/50' : ''}>
                          <TableCell className="font-medium">{form.name}</TableCell>
                          <TableCell className="max-w-md">{form.description}</TableCell>
                          <TableCell>
                            {form.isActive ? (
                              <Badge className="bg-green-100 text-green-800">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Active
                              </Badge>
                            ) : (
                              <Badge variant="outline">Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedForm(form)}
                              >
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Fields
                              </Button>
                              
                              {!form.isActive && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleActivateForm(form.id)}
                                >
                                  <CheckCircle2 className="h-4 w-4 mr-1" />
                                  Set Active
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              {selectedForm && (
                <Card>
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>{selectedForm.name}</CardTitle>
                        <CardDescription>{selectedForm.description}</CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleAddField()}>
                        <PlusCircle className="h-4 w-4 mr-1" />
                        Add Field
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[80px]">Order</TableHead>
                          <TableHead>Field</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Required</TableHead>
                          <TableHead>Mapping</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedForm.fields && selectedForm.fields.sort((a, b) => a.order - b.order).map((field) => (
                          <TableRow key={field.id}>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => handleChangeFieldOrder(field.id, 'up')}
                                  disabled={field.order === 1}
                                >
                                  <span className="sr-only">Move up</span>
                                  ↑
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="h-8 w-8" 
                                  onClick={() => handleChangeFieldOrder(field.id, 'down')}
                                  disabled={field.order === selectedForm.fields.length}
                                >
                                  <span className="sr-only">Move down</span>
                                  ↓
                                </Button>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="font-medium">{field.label}</div>
                              <div className="text-sm text-muted-foreground">{field.name}</div>
                            </TableCell>
                            <TableCell className="capitalize">{field.type}</TableCell>
                            <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                            <TableCell>
                              {field.mapToUserField ? (
                                <Badge variant="secondary" className="mr-1">User: {field.mapToUserField}</Badge>
                              ) : null}
                              {field.mapToProfileField ? (
                                <Badge variant="outline">Profile: {field.mapToProfileField}</Badge>
                              ) : null}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditField(field)}
                                >
                                  <Edit className="h-4 w-4" />
                                  <span className="sr-only">Edit</span>
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-destructive hover:text-destructive/90"
                                  onClick={() => handleRemoveField(field.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                  <span className="sr-only">Delete</span>
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                        
                        {!selectedForm.fields || selectedForm.fields.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                              No fields configured for this form. Click "Add Field" to create the first field.
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
        </Tabs>

        {/* Create Template Dialog */}
        <Dialog open={isCreating} onOpenChange={setIsCreating}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Form Template</DialogTitle>
              <DialogDescription>
                Design a new form template for observers to submit reports
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-1">
              <div className="py-4">
                <FormTemplateEditor onSubmit={handleCreateTemplate} />
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Edit Template Dialog */}
        <Dialog open={isEditing} onOpenChange={setIsEditing}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Form Template</DialogTitle>
              <DialogDescription>
                Modify the form template structure and fields
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="flex-1 px-1">
              <div className="py-4">
                {activeTemplate && (
                  <FormTemplateEditor 
                    initialData={activeTemplate} 
                    onSubmit={handleUpdateTemplate} 
                  />
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* Preview Template Dialog */}
        <Dialog open={isPreviewing} onOpenChange={setIsPreviewing}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle>Preview Form Template</DialogTitle>
              <DialogDescription>
                This is how the form will appear to observers
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="preview" className="flex-1 flex flex-col">
              <TabsList className="self-center mb-4">
                <TabsTrigger value="preview">Form Preview</TabsTrigger>
                <TabsTrigger value="data">Template Data</TabsTrigger>
              </TabsList>

              <TabsContent value="preview" className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <div className="py-4">
                    {activeTemplate && (
                      <FormBuilder 
                        template={activeTemplate} 
                        readOnly={true}
                      />
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="data" className="flex-1 overflow-hidden flex flex-col">
                <ScrollArea className="flex-1">
                  <pre className="p-4 bg-gray-50 rounded-md text-sm overflow-auto">
                    {activeTemplate ? JSON.stringify(activeTemplate, null, 2) : 'No template selected'}
                  </pre>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
        
        {/* Field Editor Dialog */}
        <Dialog open={showFieldEditor} onOpenChange={setShowFieldEditor}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingField?.id?.startsWith('new') ? 'Add New Field' : 'Edit Field'}
              </DialogTitle>
              <DialogDescription>
                Configure the properties for this registration form field
              </DialogDescription>
            </DialogHeader>
            
            <ScrollArea className="max-h-[60vh]">
              {renderFieldEditor()}
            </ScrollArea>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowFieldEditor(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveField}>
                <Save className="h-4 w-4 mr-2" />
                Save Field
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}