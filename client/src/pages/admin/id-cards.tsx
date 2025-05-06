import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import AdminLayout from '@/components/layouts/admin-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Eye, Download, Trash, Save, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { IdCardTemplate } from '@/../../shared/schema';

// Define a simplified form schema for the template
const templateFormSchema = z.object({
  name: z.string().min(1, { message: "Template name is required" }),
  description: z.string().optional(),
  isActive: z.boolean().default(false),
  templateData: z.object({
    background: z.string().optional(),
    logo: z.string().optional(),
    elements: z.array(z.object({
      type: z.enum(["text", "image", "qrcode", "barcode"]),
      x: z.coerce.number(),
      y: z.coerce.number(),
      width: z.coerce.number().optional(),
      height: z.coerce.number().optional(),
      value: z.string().optional(),
      fieldName: z.string().optional(),
      style: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
    })).default([]),
    dimensions: z.object({
      width: z.coerce.number(),
      height: z.coerce.number(),
    }),
  }),
  securityFeatures: z.object({
    watermark: z.string().optional(),
    hologram: z.string().optional(),
    qrEncryption: z.boolean().optional(),
    otherFeatures: z.array(z.string()).optional(),
  }).optional().default({}),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

// Default template values
const defaultTemplate: TemplateFormValues = {
  name: "New Template",
  description: "A customizable ID card template",
  isActive: false,
  templateData: {
    background: "",
    logo: "",
    dimensions: {
      width: 1024,
      height: 650
    },
    elements: [
      {
        type: "text",
        x: 512,
        y: 50,
        value: "OBSERVER ID CARD",
        style: {
          font: "bold 48px Arial",
          textAlign: "center",
          fillStyle: "#6b2c91"
        }
      },
      {
        type: "text",
        x: 600,
        y: 170,
        fieldName: "observerId",
        style: {
          font: "bold 24px Arial",
          textAlign: "left",
          fillStyle: "#000000"
        }
      },
      {
        type: "text",
        x: 600,
        y: 280,
        value: "December 31, 2025",
        style: {
          font: "24px Arial",
          textAlign: "left",
          fillStyle: "#000000"
        }
      },
      {
        type: "image",
        x: 230,
        y: 200,
        width: 180,
        height: 180,
        fieldName: "profilePhotoUrl"
      }
    ]
  },
  securityFeatures: {
    watermark: "CAFFE",
    qrEncryption: true,
    otherFeatures: ["holographic overlay"]
  }
};

// Component to add a new element to the template
const ElementEditor = ({ 
  element, 
  index, 
  onUpdate, 
  onRemove 
}: { 
  element: any; 
  index: number; 
  onUpdate: (index: number, data: any) => void; 
  onRemove: (index: number) => void;
}) => {
  return (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-center">
          <CardTitle className="text-sm font-medium">Element {index + 1}: {element.type}</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onRemove(index)}>
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-2">
            <Label htmlFor={`type-${index}`}>Type</Label>
            <Select
              value={element.type}
              onValueChange={(value) => onUpdate(index, { ...element, type: value })}
            >
              <SelectTrigger id={`type-${index}`}>
                <SelectValue placeholder="Select element type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="text">Text</SelectItem>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="qrcode">QR Code</SelectItem>
                <SelectItem value="barcode">Barcode</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`field-${index}`}>Data Field</Label>
            <Select
              value={element.fieldName || ""}
              onValueChange={(value) => onUpdate(index, { ...element, fieldName: value || undefined, value: value ? undefined : element.value })}
            >
              <SelectTrigger id={`field-${index}`}>
                <SelectValue placeholder="Select field or use static value" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Static Value</SelectItem>
                <SelectItem value="observerId">Observer ID</SelectItem>
                <SelectItem value="fullName">Full Name</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phoneNumber">Phone Number</SelectItem>
                <SelectItem value="role">Role</SelectItem>
                <SelectItem value="profilePhotoUrl">Photo URL</SelectItem>
                <SelectItem value="qrData">QR Data (for QR codes)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="space-y-2">
            <Label htmlFor={`x-${index}`}>X Position</Label>
            <Input
              id={`x-${index}`}
              type="number"
              value={element.x}
              onChange={(e) => onUpdate(index, { ...element, x: Number(e.target.value) })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`y-${index}`}>Y Position</Label>
            <Input
              id={`y-${index}`}
              type="number"
              value={element.y}
              onChange={(e) => onUpdate(index, { ...element, y: Number(e.target.value) })}
            />
          </div>
          {(element.type === "image" || element.type === "qrcode" || element.type === "barcode") && (
            <>
              <div className="space-y-2">
                <Label htmlFor={`width-${index}`}>Width</Label>
                <Input
                  id={`width-${index}`}
                  type="number"
                  value={element.width || ""}
                  onChange={(e) => onUpdate(index, { ...element, width: Number(e.target.value) || undefined })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor={`height-${index}`}>Height</Label>
                <Input
                  id={`height-${index}`}
                  type="number"
                  value={element.height || ""}
                  onChange={(e) => onUpdate(index, { ...element, height: Number(e.target.value) || undefined })}
                />
              </div>
            </>
          )}
        </div>

        {element.fieldName === "" && element.type === "text" && (
          <div className="space-y-2">
            <Label htmlFor={`value-${index}`}>Text Value</Label>
            <Input
              id={`value-${index}`}
              type="text"
              value={element.value || ""}
              onChange={(e) => onUpdate(index, { ...element, value: e.target.value })}
            />
          </div>
        )}

        {element.type === "text" && (
          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-2">
              <Label htmlFor={`font-${index}`}>Font</Label>
              <Input
                id={`font-${index}`}
                type="text"
                value={(element.style?.font as string) || "16px Arial"}
                onChange={(e) => onUpdate(index, { 
                  ...element, 
                  style: { ...element.style, font: e.target.value } 
                })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`align-${index}`}>Text Align</Label>
              <Select
                value={(element.style?.textAlign as string) || "left"}
                onValueChange={(value) => onUpdate(index, { 
                  ...element, 
                  style: { ...element.style, textAlign: value } 
                })}
              >
                <SelectTrigger id={`align-${index}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="left">Left</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                  <SelectItem value="right">Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor={`color-${index}`}>Color</Label>
              <div className="flex">
                <Input
                  id={`color-${index}`}
                  type="color"
                  className="w-12 p-1 h-10"
                  value={(element.style?.fillStyle as string) || "#000000"}
                  onChange={(e) => onUpdate(index, { 
                    ...element, 
                    style: { ...element.style, fillStyle: e.target.value } 
                  })}
                />
                <Input
                  type="text"
                  className="w-full ml-2"
                  value={(element.style?.fillStyle as string) || "#000000"}
                  onChange={(e) => onUpdate(index, { 
                    ...element, 
                    style: { ...element.style, fillStyle: e.target.value } 
                  })}
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Template Editor Component
const TemplateEditor = ({ template, onSave, onPreview, onCancel }: { 
  template: TemplateFormValues; 
  onSave: (data: TemplateFormValues) => void;
  onPreview: (data: TemplateFormValues) => void;
  onCancel: () => void;
}) => {
  const [currentTemplate, setCurrentTemplate] = useState<TemplateFormValues>(template);
  
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: template,
  });

  const handleElementUpdate = (index: number, data: any) => {
    const newElements = [...currentTemplate.templateData.elements];
    newElements[index] = data;
    setCurrentTemplate({
      ...currentTemplate,
      templateData: {
        ...currentTemplate.templateData,
        elements: newElements
      }
    });
    form.setValue('templateData.elements', newElements);
  };

  const handleAddElement = (type: string) => {
    const newElement = {
      type: type as "text" | "image" | "qrcode" | "barcode",
      x: 300,
      y: 300,
      ...(type === "text" ? { 
        value: "Text element", 
        style: { 
          font: "16px Arial", 
          textAlign: "left", 
          fillStyle: "#000000" 
        } 
      } : {}),
      ...(type === "image" ? { width: 100, height: 100 } : {}),
      ...(type === "qrcode" ? { width: 150, height: 150, fieldName: "qrData" } : {}),
      ...(type === "barcode" ? { width: 200, height: 50, fieldName: "observerId" } : {})
    };
    
    const newElements = [...currentTemplate.templateData.elements, newElement];
    setCurrentTemplate({
      ...currentTemplate,
      templateData: {
        ...currentTemplate.templateData,
        elements: newElements
      }
    });
    form.setValue('templateData.elements', newElements);
  };

  const handleRemoveElement = (index: number) => {
    const newElements = [...currentTemplate.templateData.elements];
    newElements.splice(index, 1);
    setCurrentTemplate({
      ...currentTemplate,
      templateData: {
        ...currentTemplate.templateData,
        elements: newElements
      }
    });
    form.setValue('templateData.elements', newElements);
  };

  const onSubmit = (data: TemplateFormValues) => {
    onSave(data);
  };

  const handlePreview = () => {
    const values = form.getValues();
    onPreview(values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="elements">Elements</TabsTrigger>
            <TabsTrigger value="security">Security Features</TabsTrigger>
          </TabsList>
          
          <TabsContent value="general" className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Textarea {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Set as Active Template</FormLabel>
                    <FormDescription>
                      This template will be used for all ID cards
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
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="templateData.dimensions.width"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Width (px)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="templateData.dimensions.height"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Height (px)</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="templateData.background"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Background Image URL (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>
                    Leave empty for a default gradient background
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="templateData.logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (optional)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
          
          <TabsContent value="elements" className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Template Elements</h3>
              <div className="flex space-x-2">
                <Select onValueChange={handleAddElement}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Add element" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text">Add Text</SelectItem>
                    <SelectItem value="image">Add Image</SelectItem>
                    <SelectItem value="qrcode">Add QR Code</SelectItem>
                    <SelectItem value="barcode">Add Barcode</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="space-y-4">
              {currentTemplate.templateData.elements.map((element, index) => (
                <ElementEditor
                  key={index}
                  element={element}
                  index={index}
                  onUpdate={handleElementUpdate}
                  onRemove={handleRemoveElement}
                />
              ))}
              
              {currentTemplate.templateData.elements.length === 0 && (
                <div className="text-center p-6 border border-dashed rounded-lg">
                  <p className="text-muted-foreground">No elements added yet. Add elements to design your card.</p>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="security" className="space-y-4">
            <FormField
              control={form.control}
              name="securityFeatures.watermark"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Watermark Text</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>
                    Text to display as a watermark on the ID card
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="securityFeatures.qrEncryption"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                  <div className="space-y-0.5">
                    <FormLabel>Enable QR Code Encryption</FormLabel>
                    <FormDescription>
                      Encrypt data stored in QR codes for enhanced security
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value || false}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="securityFeatures.hologram"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hologram Text (for printing)</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} />
                  </FormControl>
                  <FormDescription>
                    Text to display as a hologram on printed cards
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </TabsContent>
        </Tabs>
        
        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onCancel}
          >
            Cancel
          </Button>
          <Button 
            type="button"
            variant="secondary"
            onClick={handlePreview}
          >
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            Save Template
          </Button>
        </div>
      </form>
    </Form>
  );
};

// Main ID Card Management Component
function IdCardManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<TemplateFormValues | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  // Fetch templates
  const { data: templates, isLoading } = useQuery({
    queryKey: ['/api/id-cards/templates'],
    queryFn: () => apiRequest<IdCardTemplate[]>('/api/id-cards/templates'),
  });
  
  // Create template mutation
  const createMutation = useMutation({
    mutationFn: (data: TemplateFormValues) => 
      apiRequest('/api/id-cards/templates', { method: 'POST', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/id-cards/templates'] });
      toast({
        title: "Template Created",
        description: "ID card template has been created successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Update template mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: TemplateFormValues }) => 
      apiRequest(`/api/id-cards/templates/${id}`, { method: 'PUT', data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/id-cards/templates'] });
      toast({
        title: "Template Updated",
        description: "ID card template has been updated successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Delete template mutation
  const deleteMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/id-cards/templates/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/id-cards/templates'] });
      toast({
        title: "Template Deleted",
        description: "ID card template has been deleted successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete template. Please try again.",
        variant: "destructive",
      });
    }
  });
  
  // Preview template
  const previewTemplate = async (data: TemplateFormValues) => {
    try {
      // If we're editing an existing template, use its ID
      const templateId = currentTemplate && 'id' in currentTemplate ? (currentTemplate as any).id : null;
      
      // Display a loading toast
      const loadingToast = toast({
        title: "Generating preview...",
        description: "Please wait while we generate your preview.",
      });
      
      // Make a POST request to the preview endpoint
      const response = await fetch('/api/id-cards/preview-template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate preview');
      }
      
      // Convert the response to a blob and create a URL
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      setPreviewUrl(url);
      setShowPreview(true);
      
      // Dismiss the loading toast
      toast.dismiss(loadingToast);
    } catch (error) {
      toast({
        title: "Preview Failed",
        description: "Failed to generate preview. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  // Generate ID card for download
  const generateIdCard = async (userId: number) => {
    try {
      const response = await fetch(`/api/id-cards/generate/${userId}`);
      if (!response.ok) {
        throw new Error('Failed to generate ID card');
      }
      
      // Create a blob from the PDF response
      const blob = await response.blob();
      
      // Create a download link and click it
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `observer-id-${userId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
      
      toast({
        title: "ID Card Generated",
        description: "ID card has been generated and downloaded successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate ID card. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleCreateNew = () => {
    setCurrentTemplate(defaultTemplate);
    setIsEditing(true);
  };
  
  const handleEdit = (template: IdCardTemplate) => {
    setCurrentTemplate(template as unknown as TemplateFormValues);
    setIsEditing(true);
  };
  
  const handleSave = (data: TemplateFormValues) => {
    if (currentTemplate && 'id' in currentTemplate) {
      updateMutation.mutate({ id: (currentTemplate as any).id, data });
    } else {
      createMutation.mutate(data);
    }
  };
  
  const handlePreview = (data: TemplateFormValues) => {
    previewTemplate(data);
  };
  
  const handleDelete = (id: number) => {
    if (confirm('Are you sure you want to delete this template?')) {
      deleteMutation.mutate(id);
    }
  };
  
  const handleCloseEditor = () => {
    setIsEditing(false);
    setCurrentTemplate(null);
  };

  const handleGenerateOwnCard = () => {
    // Generate ID card for the current user
    generateIdCard(0); // The backend will use the session user ID
  };
  
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">ID Card Management</h1>
            <p className="text-muted-foreground mt-1">Create and manage ID card templates for observers</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleGenerateOwnCard}>
              <Download className="mr-2 h-4 w-4" />
              Download My ID Card
            </Button>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Loading templates...</span>
          </div>
        ) : isEditing ? (
          <Card>
            <CardHeader>
              <CardTitle>
                {currentTemplate && 'id' in currentTemplate ? 'Edit Template' : 'Create New Template'}
              </CardTitle>
              <CardDescription>
                Design your ID card template by adding and positioning elements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateEditor
                template={currentTemplate!}
                onSave={handleSave}
                onPreview={handlePreview}
                onCancel={handleCloseEditor}
              />
            </CardContent>
          </Card>
        ) : (
          <>
            {templates && templates.length > 0 ? (
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>ID Card Templates</CardTitle>
                    <CardDescription>
                      Manage your ID card templates and set the active template
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
                        {templates.map((template) => (
                          <TableRow key={template.id}>
                            <TableCell className="font-medium">{template.name}</TableCell>
                            <TableCell>{template.description || 'No description'}</TableCell>
                            <TableCell>
                              {template.isActive ? (
                                <div className="flex items-center">
                                  <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                                  <span className="text-sm">Active</span>
                                </div>
                              ) : (
                                <span className="text-sm text-muted-foreground">Inactive</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handlePreview(template as unknown as TemplateFormValues)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={() => handleEdit(template)}
                                >
                                  Edit
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="sm"
                                  onClick={() => handleDelete(template.id)}
                                  disabled={template.isActive}
                                >
                                  <Trash className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="flex flex-col items-center justify-center p-12">
                  <div className="rounded-full bg-muted p-3 mb-4">
                    <Plus className="h-8 w-8" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">No Templates Found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    You haven't created any ID card templates yet. Create your first template to get started.
                  </p>
                  <Button onClick={handleCreateNew}>Create Template</Button>
                </CardContent>
              </Card>
            )}
          </>
        )}
        
        {/* Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="max-w-screen-md">
            <DialogHeader>
              <DialogTitle>Template Preview</DialogTitle>
              <DialogDescription>
                This is a preview of how the ID card will look
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center p-4 bg-gray-100 rounded-md">
              {previewUrl && (
                <iframe 
                  src={previewUrl} 
                  className="w-full h-[600px] border-0 rounded"
                  title="ID Card Preview"
                />
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}

export default IdCardManagement;