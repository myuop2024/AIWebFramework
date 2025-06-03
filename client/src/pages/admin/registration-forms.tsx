import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Spinner } from '@/components/ui/spinner';
import { FormField } from '@/components/registration/dynamic-form';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertCircle, PlusCircle, Edit, Save, Trash2, Eye } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import AdminLayout from '@/components/layout/admin-layout';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface RegistrationForm {
  id: number;
  name: string;
  description: string;
  isActive: boolean;
  fields: FormField[];
  createdAt: string;
  updatedAt: string;
  version: number;
}

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'password', label: 'Password' },
  { value: 'tel', label: 'Telephone' },
  { value: 'number', label: 'Number' },
  { value: 'select', label: 'Select Dropdown' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'textarea', label: 'Text Area' }
];

const RegistrationFormsAdmin = () => {
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<RegistrationForm | null>(null);
  const [editingField, setEditingField] = useState<FormField | null>(null);
  const [showFieldEditor, setShowFieldEditor] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Fetch all registration forms
  const { data: registrationForms, isLoading: isLoadingForms } = useQuery<RegistrationForm[]>({
    queryKey: ['/api/registration-forms'],
    staleTime: 60000,
  });

  // Create mutation for activating a form
  const activateFormMutation = useMutation({
    mutationFn: async (formId: number) => {
      return apiRequest('POST', `/api/registration-forms/${formId}/activate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registration-forms'] });
      setSuccess('Registration form has been activated successfully');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to activate form');
      setTimeout(() => setError(null), 3000);
    }
  });

  // Update form mutation
  const updateFormMutation = useMutation({
    mutationFn: async (form: Partial<RegistrationForm> & { id: number }) => {
      return apiRequest('PATCH', `/api/registration-forms/${form.id}`, form);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/registration-forms'] });
      setSuccess('Registration form has been updated successfully');
      setTimeout(() => setSuccess(null), 3000);
    },
    onError: (err: any) => {
      setError(err?.message || 'Failed to update form');
      setTimeout(() => setError(null), 3000);
    }
  });

  // Create a new unique ID for fields
  const generateId = () => {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  };

  // Handle adding a new field
  const handleAddField = () => {
    if (!selectedForm) return;
    
    const newField: FormField = {
      id: generateId(),
      name: `field_${generateId().substring(0, 8)}`,
      type: 'text',
      label: 'New Field',
      order: selectedForm.fields.length + 1,
      required: false,
      isAdminOnly: false,
      isUserEditable: true,
    };
    
    setEditingField(newField);
    setShowFieldEditor(true);
  };

  // Handle editing an existing field
  const handleEditField = (field: FormField) => {
    setEditingField({ ...field });
    setShowFieldEditor(true);
  };

  // Handle saving field changes
  const handleSaveField = () => {
    if (!selectedForm || !editingField) return;
    
    let updatedFields = [...selectedForm.fields];
    
    // Check if field exists, update it or add it
    const existingFieldIndex = updatedFields.findIndex(f => f.id === editingField.id);
    if (existingFieldIndex >= 0) {
      updatedFields[existingFieldIndex] = editingField;
    } else {
      updatedFields.push(editingField);
    }
    
    // Update the form with new fields
    updateFormMutation.mutate({
      id: selectedForm.id,
      fields: updatedFields,
    });
    
    setShowFieldEditor(false);
    setEditingField(null);
    
    // Update selected form locally for immediate UI update
    setSelectedForm({
      ...selectedForm,
      fields: updatedFields,
    });
  };

  // Handle removing a field
  const handleRemoveField = (fieldId: string) => {
    if (!selectedForm) return;
    
    const updatedFields = selectedForm.fields.filter(f => f.id !== fieldId);
    
    // Update the form with new fields
    updateFormMutation.mutate({
      id: selectedForm.id,
      fields: updatedFields,
    });
    
    // Update selected form locally for immediate UI update
    setSelectedForm({
      ...selectedForm,
      fields: updatedFields,
    });
  };

  // Handle activating a form
  const handleActivateForm = (formId: number) => {
    activateFormMutation.mutate(formId);
  };

  // Handle changing field order (move up/down)
  const handleChangeFieldOrder = (fieldId: string, direction: 'up' | 'down') => {
    if (!selectedForm) return;
    
    const updatedFields = [...selectedForm.fields];
    const currentIndex = updatedFields.findIndex(f => f.id === fieldId);
    
    if (currentIndex < 0) return;
    
    if (direction === 'up' && currentIndex > 0) {
      // Swap with previous element
      [updatedFields[currentIndex], updatedFields[currentIndex - 1]] = 
      [updatedFields[currentIndex - 1], updatedFields[currentIndex]];
    } else if (direction === 'down' && currentIndex < updatedFields.length - 1) {
      // Swap with next element
      [updatedFields[currentIndex], updatedFields[currentIndex + 1]] = 
      [updatedFields[currentIndex + 1], updatedFields[currentIndex]];
    } else {
      return; // No change needed
    }
    
    // Update order properties
    updatedFields.forEach((field, index) => {
      field.order = index + 1;
    });
    
    // Update the form with new fields
    updateFormMutation.mutate({
      id: selectedForm.id,
      fields: updatedFields,
    });
    
    // Update selected form locally for immediate UI update
    setSelectedForm({
      ...selectedForm,
      fields: updatedFields,
    });
  };

  // Render field editor form
  const renderFieldEditor = () => {
    if (!editingField) return null;
    
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
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
                {fieldTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="field-name">Field Name (ID)</Label>
            <Input 
              id="field-name"
              value={editingField.name} 
              onChange={(e) => setEditingField({...editingField, name: e.target.value})}
              placeholder="field_name (no spaces)"
            />
          </div>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-label">Field Label</Label>
          <Input 
            id="field-label"
            value={editingField.label} 
            onChange={(e) => setEditingField({...editingField, label: e.target.value})}
            placeholder="Label displayed to user"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-placeholder">Placeholder Text</Label>
          <Input 
            id="field-placeholder"
            value={editingField.placeholder || ''} 
            onChange={(e) => setEditingField({...editingField, placeholder: e.target.value})}
            placeholder="Placeholder text"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="field-help">Help Text</Label>
          <Textarea 
            id="field-help"
            value={editingField.helpText || ''} 
            onChange={(e) => setEditingField({...editingField, helpText: e.target.value})}
            placeholder="Additional guidance for users"
          />
        </div>
        
        {editingField.type === 'select' && (
          <div className="space-y-2">
            <Label>Options (one per line in format: label=value)</Label>
            <Textarea 
              value={editingField.options?.map(o => `${o.label}=${o.value}`).join('\n') || ''}
              onChange={(e) => {
                const optionsText = e.target.value;
                const options = optionsText.split('\n')
                  .map(line => {
                    const [label, value] = line.split('=');
                    return { label: label?.trim() || '', value: value?.trim() || label?.trim() || '' };
                  })
                  .filter(o => o.label); // Filter out empty options
                
                setEditingField({...editingField, options });
              }}
              placeholder="Option1=value1&#10;Option2=value2"
              className="min-h-[120px]"
            />
          </div>
        )}
        
        {(editingField.type === 'text' || editingField.type === 'email' || editingField.type === 'tel' || editingField.type === 'password') && (
          <div className="space-y-2">
            <Label htmlFor="field-validation">Validation Pattern (RegEx)</Label>
            <Input 
              id="field-validation"
              value={editingField.validation?.pattern || ''} 
              onChange={(e) => setEditingField({
                ...editingField, 
                validation: { 
                  ...editingField.validation || {}, 
                  pattern: e.target.value 
                }
              })}
              placeholder="Regular expression pattern"
            />
            
            <Label htmlFor="field-validation-message">Validation Error Message</Label>
            <Input 
              id="field-validation-message"
              value={editingField.validation?.customMessage || ''} 
              onChange={(e) => setEditingField({
                ...editingField, 
                validation: { 
                  ...editingField.validation || {}, 
                  customMessage: e.target.value 
                }
              })}
              placeholder="Message to show when validation fails"
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
              <SelectItem value="state">Parish</SelectItem>
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

  if (isLoadingForms) {
    return (
      <AdminLayout title="Registration Forms">
        <div className="flex justify-center items-center min-h-[calc(100vh-200px)]">
          <Spinner className="w-12 h-12" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Registration Forms">
      <div className="container mx-auto py-6">
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert className="mb-4 bg-green-50 border-green-500">
            <AlertCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-600">Success</AlertTitle>
            <AlertDescription className="text-green-600">{success}</AlertDescription>
          </Alert>
        )}
        
        <Tabs defaultValue="forms" className="space-y-4">
          <TabsList>
            <TabsTrigger value="forms">Forms</TabsTrigger>
            {selectedForm && <TabsTrigger value="fields">Fields</TabsTrigger>}
          </TabsList>
          
          <TabsContent value="forms" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Registration Forms</CardTitle>
                <CardDescription>Manage registration forms for observers</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableCaption>List of registration forms</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Fields</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {registrationForms && Array.isArray(registrationForms) && registrationForms.map((form: RegistrationForm) => (
                      <TableRow key={form.id}>
                        <TableCell className="font-medium">{form.name}</TableCell>
                        <TableCell>{form.description}</TableCell>
                        <TableCell>{form.fields.length}</TableCell>
                        <TableCell>{form.version}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div className={`h-2.5 w-2.5 rounded-full mr-2 ${form.isActive ? 'bg-green-500' : 'bg-gray-400'}`}></div>
                            {form.isActive ? 'Active' : 'Inactive'}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setSelectedForm(form)}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            
                            {!form.isActive && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleActivateForm(form.id)}
                                disabled={activateFormMutation.isPending}
                              >
                                {activateFormMutation.isPending ? (
                                  <Spinner className="h-4 w-4 mr-1" />
                                ) : (
                                  <Eye className="h-4 w-4 mr-1" />
                                )}
                                Activate
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
          </TabsContent>
          
          {selectedForm && (
            <TabsContent value="fields" className="space-y-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{selectedForm.name}</CardTitle>
                    <CardDescription>{selectedForm.description}</CardDescription>
                  </div>
                  <Button onClick={handleAddField}>
                    <PlusCircle className="h-4 w-4 mr-2" />
                    Add Field
                  </Button>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableCaption>Form Fields</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Order</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Label</TableHead>
                        <TableHead>Required</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedForm.fields.sort((a, b) => a.order - b.order).map((field) => (
                        <TableRow key={field.id}>
                          <TableCell className="w-24 text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={field.order === 1}
                                onClick={() => handleChangeFieldOrder(field.id, 'up')}
                                className="h-6 w-6 p-0"
                              >
                                ↑
                              </Button>
                              <span>{field.order}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={field.order === selectedForm.fields.length}
                                onClick={() => handleChangeFieldOrder(field.id, 'down')}
                                className="h-6 w-6 p-0"
                              >
                                ↓
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>{field.name}</TableCell>
                          <TableCell>{field.type}</TableCell>
                          <TableCell>{field.label}</TableCell>
                          <TableCell>{field.required ? 'Yes' : 'No'}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditField(field)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveField(field.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
              
              <Dialog 
                open={showFieldEditor} 
                onOpenChange={(open) => {
                  setShowFieldEditor(open);
                  if (!open) setEditingField(null);
                }}
              >
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>
                      {editingField?.id.startsWith('new') ? 'Add Field' : 'Edit Field'}
                    </DialogTitle>
                    <DialogDescription>
                      Configure the field properties
                    </DialogDescription>
                  </DialogHeader>
                  
                  {renderFieldEditor()}
                  
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setShowFieldEditor(false);
                        setEditingField(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onClick={handleSaveField}>
                      <Save className="h-4 w-4 mr-2" />
                      Save Field
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default RegistrationFormsAdmin;