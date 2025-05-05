import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layouts/main-layout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  FormBuilder 
} from '@/components/forms/form-builder';
import { FormTemplateEditor } from '@/components/forms/form-template-editor';
import {
  ArrowPathIcon,
  PencilIcon, 
  PlusIcon, 
  TrashIcon, 
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon
} from 'lucide-react';
import type { FormTemplate, FormTemplateExtended } from '@shared/schema';

export default function FormTemplatesPage() {
  const [selectedTab, setSelectedTab] = useState<string>('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<FormTemplate | null>(null);
  
  const { toast } = useToast();
  
  // Fetch all templates
  const { data: templates, isLoading } = useQuery<FormTemplate[]>({
    queryKey: ['/api/form-templates'],
  });
  
  // Create template mutation
  const createTemplate = useMutation({
    mutationFn: async (templateData: FormTemplateExtended) => {
      return await apiRequest<FormTemplate>('/api/form-templates', {
        method: 'POST',
        data: templateData
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      toast({
        title: 'Template created successfully',
        variant: 'default',
      });
      setIsCreateDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to create template',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  });
  
  // Update template mutation
  const updateTemplate = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: FormTemplateExtended }) => {
      return await apiRequest<FormTemplate>(`/api/form-templates/${id}`, {
        method: 'PUT',
        data
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      toast({
        title: 'Template updated successfully',
        variant: 'default',
      });
      setIsEditDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update template',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  });
  
  // Toggle template status mutation
  const toggleTemplateStatus = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      return await apiRequest<FormTemplate>(`/api/form-templates/${id}/status`, {
        method: 'PATCH',
        data: { isActive }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      toast({
        title: 'Template status updated',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to update template status',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  });
  
  // Delete template mutation
  const deleteTemplate = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest<void>(`/api/form-templates/${id}`, {
        method: 'DELETE'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/form-templates'] });
      toast({
        title: 'Template deleted successfully',
        variant: 'default',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Failed to delete template',
        description: error.message || 'An error occurred',
        variant: 'destructive',
      });
    }
  });
  
  // Filter templates based on tab
  const filteredTemplates = templates?.filter(template => {
    if (selectedTab === 'all') return true;
    if (selectedTab === 'active') return template.isActive;
    if (selectedTab === 'inactive') return !template.isActive;
    if (selectedTab === 'polling') return template.category === 'polling';
    if (selectedTab === 'incident') return template.category === 'incident';
    if (selectedTab === 'observation') return template.category === 'observation';
    return true;
  });
  
  const handleCreateTemplate = (templateData: FormTemplateExtended) => {
    createTemplate.mutate(templateData);
  };
  
  const handleUpdateTemplate = (templateData: FormTemplateExtended) => {
    if (selectedTemplate) {
      updateTemplate.mutate({ id: selectedTemplate.id, data: templateData });
    }
  };
  
  const handleToggleStatus = (template: FormTemplate) => {
    toggleTemplateStatus.mutate({ 
      id: template.id, 
      isActive: !template.isActive 
    });
  };
  
  const handleDeleteTemplate = (template: FormTemplate) => {
    if (confirm(`Are you sure you want to delete "${template.name}"? This action cannot be undone.`)) {
      deleteTemplate.mutate(template.id);
    }
  };
  
  const handleEditTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };
  
  const handlePreviewTemplate = (template: FormTemplate) => {
    setSelectedTemplate(template);
    setIsPreviewDialogOpen(true);
  };
  
  return (
    <AuthGuard>
      <MainLayout>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Form Templates</h1>
              <p className="text-muted-foreground">
                Create and manage customizable form templates for observers
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusIcon className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
          
          <Tabs defaultValue="all" value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="active">Active</TabsTrigger>
              <TabsTrigger value="inactive">Inactive</TabsTrigger>
              <TabsTrigger value="polling">Polling</TabsTrigger>
              <TabsTrigger value="incident">Incident</TabsTrigger>
              <TabsTrigger value="observation">Observation</TabsTrigger>
            </TabsList>
            
            {isLoading ? (
              <div className="flex justify-center py-8">
                <ArrowPathIcon className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredTemplates?.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">No templates found</p>
                <Button 
                  variant="outline" 
                  className="mt-4"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Template
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTemplates?.map((template) => (
                  <Card key={template.id} className="overflow-hidden">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-xl">{template.name}</CardTitle>
                        <Badge variant={template.isActive ? "default" : "secondary"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <CardDescription className="flex justify-between items-center">
                        <span className="capitalize">{template.category}</span>
                        <span className="text-xs text-muted-foreground">
                          Created {new Date(template.createdAt).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-2">
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {template.description || "No description provided"}
                      </p>
                      
                      {/* Show fields count and section count */}
                      <div className="flex gap-2 mt-2">
                        {template.fields && typeof template.fields === 'object' && 'sections' in template.fields ? (
                          <>
                            <Badge variant="outline">
                              {(template.fields as any).sections.length} section(s)
                            </Badge>
                            <Badge variant="outline">
                              {(template.fields as any).sections.reduce(
                                (count: number, section: any) => count + section.fields.length, 0
                              )} field(s)
                            </Badge>
                          </>
                        ) : (
                          <Badge variant="outline">No fields defined</Badge>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between pt-2">
                      <Button variant="ghost" size="sm" onClick={() => handlePreviewTemplate(template)}>
                        <EyeIcon className="h-4 w-4 mr-1" />
                        Preview
                      </Button>
                      
                      <div className="flex gap-1">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleToggleStatus(template)}
                        >
                          {template.isActive ? (
                            <XCircleIcon className="h-4 w-4 mr-1 text-red-500" />
                          ) : (
                            <CheckCircleIcon className="h-4 w-4 mr-1 text-green-500" />
                          )}
                          {template.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <PencilIcon className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDeleteTemplate(template)}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </Tabs>
        </div>
        
        {/* Create Template Dialog */}
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Create Form Template</DialogTitle>
              <DialogDescription>
                Design a new form template with custom fields and sections
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-grow overflow-auto pr-2">
              <FormTemplateEditor onSubmit={handleCreateTemplate} />
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Edit Template Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Edit Form Template</DialogTitle>
              <DialogDescription>
                Modify the template structure, fields, and properties
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-grow overflow-auto pr-2">
              {selectedTemplate && (
                <FormTemplateEditor 
                  initialData={selectedTemplate}
                  onSubmit={handleUpdateTemplate} 
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Preview Template Dialog */}
        <Dialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Preview Form Template</DialogTitle>
              <DialogDescription>
                This is how the form will appear to observers
              </DialogDescription>
            </DialogHeader>
            
            <div className="flex-grow overflow-auto pr-2">
              {selectedTemplate && (
                <FormBuilder template={selectedTemplate} readOnly />
              )}
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsPreviewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </MainLayout>
    </AuthGuard>
  );
}