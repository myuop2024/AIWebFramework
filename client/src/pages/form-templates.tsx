import { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/lib/auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import MainLayout from '@/components/layout/main-layout';
import { FormTemplateEditor } from '@/components/forms/form-template-editor';
import { FormBuilder } from '@/components/forms/form-builder';
import { 
  PageHeader, 
  PageHeaderDescription, 
  PageHeaderHeading 
} from '@/components/ui/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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

import { 
  ClipboardEdit, 
  Eye, 
  MoreVertical, 
  Plus, 
  RefreshCw, 
  Trash,
  CheckCircle2, 
  XCircle,
  Filter
} from 'lucide-react';
import { 
  type FormTemplate,
  type FormTemplateExtended
} from '@shared/schema';

export default function FormTemplatesPage() {
  const [, navigate] = useLocation();
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isCreating, setIsCreating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<FormTemplate | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Redirect to login if not authenticated or not admin
  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to access this page.",
        variant: "destructive"
      });
      navigate("/dashboard");
    }
  }, [user, loading, navigate, toast]);

  // Query to get all form templates
  const { data: templates = [], isLoading, refetch } = useQuery({
    queryKey: ['/api/form-templates'],
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

  // Filter templates by category
  const filteredTemplates = categoryFilter 
    ? templates.filter((template: FormTemplate) => template.category === categoryFilter)
    : templates;

  // Get unique categories
  const categories = Array.from(
    new Set(templates.map((template: FormTemplate) => template.category))
  );

  return (
    <MainLayout>
      <div className="container mx-auto py-6">
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

        {isLoading ? (
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
      </div>
    </MainLayout>
  );
}