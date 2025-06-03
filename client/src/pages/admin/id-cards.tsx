import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { apiRequest } from "@/lib/queryClient";
import AdminLayout from "@/components/layout/admin-layout";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ColorPicker } from "@/components/ui/color-picker";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Eye, PencilLine, Trash2, FileImage, QrCode, CheckCircle } from "lucide-react";

// Define typescript types for ID card templates
type IdCardTemplate = {
  id: number;
  name: string;
  description: string;
  templateData: {
    background?: string;
    logo?: string;
    elements: Array<{
      type: string;
      x: number;
      y: number;
      width?: number;
      height?: number;
      value?: string;
      fieldName?: string;
      style?: Record<string, string | number>;
    }>;
    dimensions: {
      width: number;
      height: number;
    };
  };
  securityFeatures: {
    watermark?: string;
    hologram?: string;
    qrEncryption?: boolean;
    otherFeatures?: string[];
  };
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

// Define the structure for the API payload
interface ApiPayloadData {
  name: string;
  description: string;
  templateData: IdCardTemplate['templateData'];
  securityFeatures: IdCardTemplate['securityFeatures'];
  isActive?: boolean; // Optional: if you manage active status during create/update
}

// For backward compatibility and UI
type TemplateUI = {
  backgroundColor: string;
  headerColor: string;
  textColor: string;
  accentColor: string;
  logo?: string;
  showQrCode: boolean;
  showWatermark: boolean;
  showPhoto: boolean;
  customText?: string;
  footerText?: string;
};

// Define zod schema for the form
const templateFormSchema = z.object({
  name: z.string().min(3, { message: "Name must be at least 3 characters" }),
  description: z.string().min(5, { message: "Description must be at least 5 characters" }),
  template: z.object({
    backgroundColor: z.string().default("#FFFFFF"),
    headerColor: z.string().default("#4F46E5"),
    textColor: z.string().default("#000000"),
    accentColor: z.string().default("#9333EA"),
    logo: z.string().optional(),
    showQrCode: z.boolean().default(true),
    showWatermark: z.boolean().default(true),
    showPhoto: z.boolean().default(true),
    customText: z.string().optional(),
    footerText: z.string().optional(),
  }),
});

type TemplateFormValues = z.infer<typeof templateFormSchema>;

// Default template values
const defaultTemplate: TemplateFormValues = {
  name: "",
  description: "",
  template: {
    backgroundColor: "#FFFFFF",
    headerColor: "#4F46E5",
    textColor: "#000000",
    accentColor: "#FFBD00", // Jamaican flag gold color
    logo: "/assets/caffe-logo.png", // CAFFE logo from assets
    showQrCode: true,
    showWatermark: true,
    showPhoto: true,
    customText: "GENERAL ELECTION DECEMBER 2025",
    footerText: "Citizens Action for Free and Fair Elections"
  }
};

// Template form component
interface TemplateFormProps {
  template?: TemplateFormValues;
  onSave: (data: TemplateFormValues) => void;
  onPreview: (data: TemplateFormValues) => void;
}

function TemplateForm({ template = defaultTemplate, onSave, onPreview }: TemplateFormProps) {
  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: template,
  });

  const onSubmit = (data: TemplateFormValues) => {
    onSave(data);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Template Name</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Standard Observer ID Card" {...field} />
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
                      placeholder="Describe the purpose of this template" 
                      className="resize-none min-h-[80px]" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="template.backgroundColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Background Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="template.headerColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Header Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="template.textColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Text Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="template.accentColor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Accent Color</FormLabel>
                    <FormControl>
                      <ColorPicker value={field.value} onChange={field.onChange} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          <div className="space-y-6">
            <FormField
              control={form.control}
              name="template.logo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Logo URL (optional)</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <Input placeholder="URL to the logo image" {...field} value={field.value || ''} />
                      <Button type="button" variant="outline" size="icon">
                        <FileImage className="h-4 w-4" />
                      </Button>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Use a publicly accessible URL for the logo
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <FormField
                control={form.control}
                name="template.showQrCode"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>QR Code</FormLabel>
                      <FormDescription>
                        Display a QR code for verification
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
                name="template.showWatermark"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Watermark</FormLabel>
                      <FormDescription>
                        Add a security watermark to the card
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
                name="template.showPhoto"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Observer Photo</FormLabel>
                      <FormDescription>
                        Display the observer's profile photo
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

            <FormField
              control={form.control}
              name="template.customText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Custom Text (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Any additional text to display on the card" 
                      className="resize-none min-h-[80px]" 
                      {...field} 
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="template.footerText"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Footer Text (optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Valid until December 2025" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button 
            type="button" 
            variant="outline"
            onClick={() => onPreview(form.getValues())}
          >
            Preview
          </Button>
          <Button type="submit">Save Template</Button>
        </div>
      </form>
    </Form>
  );
}

// ID Card Template Preview component
interface TemplatePreviewProps {
  template: TemplateFormValues;
  isOpen: boolean;
  onClose: () => void;
}

function TemplatePreview({ template, isOpen, onClose }: TemplatePreviewProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>ID Card Preview</DialogTitle>
          <DialogDescription>
            Preview of how the ID card will appear for observers
          </DialogDescription>
        </DialogHeader>

        <div className="p-4">
          <div 
            className="w-full aspect-[85/54] rounded-lg overflow-hidden shadow-lg"
            style={{ backgroundColor: template.template.backgroundColor }}
          >
            <div 
              className="h-16 px-6 flex items-center justify-between"
              style={{ backgroundColor: template.template.headerColor }}
            >
              <div className="flex items-center gap-2">
                {template.template.logo && (
                  <img src={template.template.logo} alt="Logo" className="h-10 w-auto" />
                )}
                <h1 
                  className="text-2xl font-bold"
                  style={{ color: template.template.textColor }}
                >
                  CAFFE ID
                </h1>
              </div>
              {template.template.showWatermark && (
                <div className="opacity-20 text-xs">
                  OFFICIAL
                </div>
              )}
            </div>

            <div className="p-6 flex flex-col md:flex-row gap-4">
              {template.template.showPhoto && (
                <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2" style={{ borderColor: template.template.accentColor }}>
                  <FileImage className="h-10 w-10 text-gray-400" />
                </div>
              )}

              <div className="flex-1">
                <div style={{ color: template.template.textColor }}>
                  <p className="text-sm font-medium">Observer ID</p>
                  <p className="text-xl font-bold mb-2">CAF123456</p>

                  <p className="text-sm font-medium">Name</p>
                  <p className="text-lg mb-2">John Doe</p>

                  <p className="text-sm font-medium">Status</p>
                  <Badge style={{ backgroundColor: template.template.accentColor }}>VERIFIED</Badge>
                </div>

                {template.template.customText && (
                  <p className="mt-2 text-sm opacity-75" style={{ color: template.template.textColor }}>
                    {template.template.customText}
                  </p>
                )}
              </div>

              {template.template.showQrCode && (
                <div className="flex-none w-24 h-24 bg-white p-1 rounded-lg">
                  <QrCode className="w-full h-full text-gray-800" />
                </div>
              )}
            </div>

            {template.template.footerText && (
              <div className="p-2 text-center text-sm" style={{ color: template.template.textColor }}>
                {template.template.footerText}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Main component
export default function IdCardManagement() {
  const [selectedTemplate, setSelectedTemplate] = useState<IdCardTemplate | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<TemplateFormValues>(defaultTemplate);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch templates
  const { data: templates, isLoading } = useQuery<IdCardTemplate[]>({
    queryKey: ['/api/id-cards/templates'],
    refetchInterval: false,
  });

  // Create template mutation
  const createTemplateMutation = useMutation({
    mutationFn: (data: ApiPayloadData) =>  // Changed from TemplateFormValues
      apiRequest('/api/id-cards/templates', 'POST', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/id-cards/templates'] });
      toast({
        title: "Template Created",
        description: "The ID card template has been created successfully.",
      });
      setIsEditing(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create the template. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Update template mutation
  const updateTemplateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number, data: Partial<ApiPayloadData> }) => // Changed from TemplateFormValues
      apiRequest(`/api/id-cards/templates/${id}`, 'PUT', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/id-cards/templates'] });
      toast({
        title: "Template Updated",
        description: "The ID card template has been updated successfully.",
      });
      setIsEditing(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to update the template. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Delete template mutation
  const deleteTemplateMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/id-cards/templates/${id}`, 'DELETE'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/id-cards/templates'] });
      toast({
        title: "Template Deleted",
        description: "The ID card template has been deleted.",
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete the template. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Activate template mutation
  const activateTemplateMutation = useMutation({
    mutationFn: (id: number) => 
      apiRequest(`/api/id-cards/templates/${id}/activate`, 'POST'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/id-cards/templates'] });
      toast({
        title: "Template Activated",
        description: "The ID card template is now active.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to activate the template. Please try again.",
        variant: "destructive",
      });
      console.error(error);
    }
  });

  // Generate template preview
  const generatePreview = async (data: TemplateFormValues) => {
    setPreviewTemplate(data);
    setIsPreviewOpen(true);
  };

  // Handle template edit
  const handleEdit = (template: IdCardTemplate) => {
    // Convert the complex database template to our simplified UI template
    const uiTemplate: TemplateUI = {
      backgroundColor: "#FFFFFF",
      headerColor: "#4F46E5",
      textColor: "#000000",
      accentColor: "#FFBD00",
      logo: "/assets/caffe-logo.png",
      showQrCode: true,
      showWatermark: true,
      showPhoto: true,
      customText: "GENERAL ELECTION DECEMBER 2025",
      footerText: "Citizens Action for Free and Fair Elections"
    };

    // Try to extract values from the database template if they exist
    if (template.templateData) {
      // Background color
      if (template.templateData.background) {
        uiTemplate.backgroundColor = template.templateData.background;
      }

      // Logo
      if (template.templateData.logo) {
        uiTemplate.logo = template.templateData.logo;
      }

      // Extract colors and text from elements if available
      template.templateData.elements?.forEach(element => {
        if (element.type === 'header' && element.style?.backgroundColor) {
          uiTemplate.headerColor = element.style.backgroundColor as string;
        }

        if (element.type === 'text' && element.style?.color) {
          uiTemplate.textColor = element.style.color as string;
        }

        if (element.type === 'badge' && element.style?.backgroundColor) {
          uiTemplate.accentColor = element.style.backgroundColor as string;
        }

        if (element.type === 'customText' && element.value) {
          uiTemplate.customText = element.value;
        }

        if (element.type === 'footer' && element.value) {
          uiTemplate.footerText = element.value;
        }
      });
    }

    // Security features
    if (template.securityFeatures) {
      uiTemplate.showWatermark = !!template.securityFeatures.watermark;
      uiTemplate.showQrCode = !!template.securityFeatures.qrEncryption;
    }

    const formattedTemplate: TemplateFormValues = {
      name: template.name,
      description: template.description,
      template: uiTemplate
    };

    setSelectedTemplate(template);
    setIsEditing(true);
    setPreviewTemplate(formattedTemplate);
  };

  // Handle template save
  const handleSave = (data: TemplateFormValues) => {
    // Convert the UI template to the database template format
    const convertTemplateForDB = (templateUI: TemplateUI) => {
      // Create the database template structure
      const dbTemplate: {
        templateData: IdCardTemplate['templateData'],
        securityFeatures: IdCardTemplate['securityFeatures']
      } = {
        templateData: {
          background: templateUI.backgroundColor,
          logo: templateUI.logo,
          elements: [
            {
              type: 'header',
              x: 0,
              y: 0,
              style: {
                backgroundColor: templateUI.headerColor,
                color: templateUI.textColor,
                width: '100%',
                height: '60px'
              }
            },
            {
              type: 'text',
              x: 20,
              y: 80,
              value: 'Observer ID: CAF123456',
              style: {
                color: templateUI.textColor,
                fontSize: '16px',
                fontWeight: 'bold'
              }
            },
            {
              type: 'text',
              x: 20,
              y: 110,
              value: 'Name: {observer.name}',
              style: {
                color: templateUI.textColor,
                fontSize: '16px'
              }
            },
            {
              type: 'badge',
              x: 20,
              y: 140,
              value: 'VERIFIED',
              style: {
                backgroundColor: templateUI.accentColor,
                color: '#FFFFFF',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }
            }
          ],
          dimensions: {
            width: 425,
            height: 270
          }
        },
        securityFeatures: {
          watermark: templateUI.showWatermark ? 'CAFFE OFFICIAL' : undefined,
          qrEncryption: templateUI.showQrCode,
          otherFeatures: ['holographic seal', 'microprint']
        }
      };

      // Add optional elements
      if (templateUI.customText) {
        dbTemplate.templateData.elements.push({
          type: 'customText',
          x: 20,
          y: 180,
          value: templateUI.customText,
          style: {
            color: templateUI.textColor,
            fontSize: '14px',
            opacity: 0.8
          }
        });
      }

      if (templateUI.footerText) {
        dbTemplate.templateData.elements.push({
          type: 'footer',
          x: 0,
          y: 240,
          value: templateUI.footerText,
          style: {
            color: templateUI.textColor,
            fontSize: '12px',
            textAlign: 'center',
            width: '100%'
          }
        });
      }

      if (templateUI.showPhoto) {
        dbTemplate.templateData.elements.push({
          type: 'photo',
          x: 320,
          y: 80,
          width: 80,
          height: 80,
          style: {
            borderRadius: '50%',
            border: `2px solid ${templateUI.accentColor}`
          }
        });
      }

      if (templateUI.showQrCode) {
        dbTemplate.templateData.elements.push({
          type: 'qrCode',
          x: 320,
          y: 170,
          width: 80,
          height: 80,
          value: '{observer.id}',
          style: {
            backgroundColor: '#FFFFFF',
            padding: '4px'
          }
        });
      }

      return dbTemplate;
    };

    // Create the data to send to the API
    const apiData: ApiPayloadData = { // Explicitly type apiData
      name: data.name,
      description: data.description,
      ...(convertTemplateForDB(data.template)),
      isActive: selectedTemplate ? selectedTemplate.isActive : false // Example: preserve isActive or default
    };

    if (selectedTemplate) {
      updateTemplateMutation.mutate({ id: selectedTemplate.id, data: apiData });
    } else {
      createTemplateMutation.mutate(apiData);
    }
  };

  // Handle template preview
  const handlePreview = (data: TemplateFormValues) => {
    generatePreview(data);
  };

  // Handle template delete
  const handleDeleteClick = (id: number) => {
    setTemplateToDelete(id);
    setDeleteDialogOpen(true);
  };

  // Handle template activate
  const handleActivate = (id: number) => {
    activateTemplateMutation.mutate(id);
  };

  // Render loading state
  if (isLoading) {
    return (
      <AdminLayout title="ID Card Management">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3" />
            <Skeleton className="h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="ID Card Management">
      <Tabs defaultValue={isEditing ? "edit" : "templates"} className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger 
              value="templates" 
              onClick={() => isEditing && setIsEditing(false)}
            >
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="edit"
              onClick={() => !isEditing && setIsEditing(true)}
            >
              {selectedTemplate ? "Edit Template" : "Create Template"}
            </TabsTrigger>
          </TabsList>

          {!isEditing && (
            <Button onClick={() => {
              setSelectedTemplate(null);
              setIsEditing(true);
            }}>
              Create New Template
            </Button>
          )}
        </div>

        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>ID Card Templates</CardTitle>
              <CardDescription>
                Manage the templates used to generate observer ID cards
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templates?.length === 0 ? (
                <div className="text-center py-6">
                  <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-lg font-medium">No templates found</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Create your first ID card template to get started
                  </p>
                  <Button
                    onClick={() => {
                      setSelectedTemplate(null);
                      setIsEditing(true);
                    }}
                    className="mt-4"
                  >
                    Create Template
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableCaption>A list of all ID card templates</TableCaption>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates?.map((template: IdCardTemplate) => (
                      <TableRow key={template.id}>
                        <TableCell className="font-medium">{template.name}</TableCell>
                        <TableCell>{template.description}</TableCell>
                        <TableCell>
                          {template.isActive ? (
                            <Badge variant="success">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => {
                                // Use the same conversion function as handleEdit
                                const uiTemplate: TemplateUI = {
                                  backgroundColor: "#FFFFFF",
                                  headerColor: "#4F46E5",
                                  textColor: "#000000",
                                  accentColor: "#FFBD00",
                                  logo: "/assets/caffe-logo.png",
                                  showQrCode: true,
                                  showWatermark: true,
                                  showPhoto: true,
                                  customText: "GENERAL ELECTION DECEMBER 2025",
                                  footerText: "Citizens Action for Free and Fair Elections"
                                };

                                // Try to extract values from the database template if they exist
                                if (template.templateData) {
                                  if (template.templateData.background) {
                                    uiTemplate.backgroundColor = template.templateData.background;
                                  }

                                  if (template.templateData.logo) {
                                    uiTemplate.logo = template.templateData.logo;
                                  }

                                  template.templateData.elements?.forEach(element => {
                                    if (element.type === 'header' && element.style?.backgroundColor) {
                                      uiTemplate.headerColor = element.style.backgroundColor as string;
                                    }

                                    if (element.type === 'text' && element.style?.color) {
                                      uiTemplate.textColor = element.style.color as string;
                                    }

                                    if (element.type === 'badge' && element.style?.backgroundColor) {
                                      uiTemplate.accentColor = element.style.backgroundColor as string;
                                    }

                                    if (element.type === 'customText' && element.value) {
                                      uiTemplate.customText = element.value;
                                    }

                                    if (element.type === 'footer' && element.value) {
                                      uiTemplate.footerText = element.value;
                                    }
                                  });
                                }

                                if (template.securityFeatures) {
                                  uiTemplate.showWatermark = !!template.securityFeatures.watermark;
                                  uiTemplate.showQrCode = !!template.securityFeatures.qrEncryption;
                                }

                                setPreviewTemplate({
                                  name: template.name,
                                  description: template.description,
                                  template: uiTemplate
                                });
                                setIsPreviewOpen(true);
                              }}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEdit(template)}
                            >
                              <PencilLine className="h-4 w-4" />
                            </Button>
                            {!template.isActive && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleDeleteClick(template.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                            {!template.isActive && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => handleActivate(template.id)}
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="edit">
          <Card>
            <CardHeader>
              <CardTitle>{selectedTemplate ? "Edit Template" : "Create New Template"}</CardTitle>
              <CardDescription>
                {selectedTemplate 
                  ? "Modify the selected ID card template" 
                  : "Create a new template for generating observer ID cards"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TemplateForm 
                template={selectedTemplate ? {
                  name: selectedTemplate.name,
                  description: selectedTemplate.description,
                  template: (() => {
                    // Convert the complex database template to our simplified UI template
                    const uiTemplate: TemplateUI = {
                      backgroundColor: "#FFFFFF",
                      headerColor: "#4F46E5",
                      textColor: "#000000",
                      accentColor: "#FFBD00",
                      logo: "/assets/caffe-logo.png",
                      showQrCode: true,
                      showWatermark: true,
                      showPhoto: true,
                      customText: "GENERAL ELECTION DECEMBER 2025",
                      footerText: "Citizens Action for Free and Fair Elections"
                    };

                    // Try to extract values from the database template if they exist
                    if (selectedTemplate.templateData) {
                      if (selectedTemplate.templateData.background) {
                        uiTemplate.backgroundColor = selectedTemplate.templateData.background;
                      }

                      if (selectedTemplate.templateData.logo) {
                        uiTemplate.logo = selectedTemplate.templateData.logo;
                      }

                      selectedTemplate.templateData.elements?.forEach(element => {
                        if (element.type === 'header' && element.style?.backgroundColor) {
                          uiTemplate.headerColor = element.style.backgroundColor as string;
                        }

                        if (element.type === 'text' && element.style?.color) {
                          uiTemplate.textColor = element.style.color as string;
                        }

                        if (element.type === 'badge' && element.style?.backgroundColor) {
                          uiTemplate.accentColor = element.style.backgroundColor as string;
                        }

                        if (element.type === 'customText' && element.value) {
                          uiTemplate.customText = element.value;
                        }

                        if (element.type === 'footer' && element.value) {
                          uiTemplate.footerText = element.value;
                        }
                      });
                    }

                    if (selectedTemplate.securityFeatures) {
                      uiTemplate.showWatermark = !!selectedTemplate.securityFeatures.watermark;
                      uiTemplate.showQrCode = !!selectedTemplate.securityFeatures.qrEncryption;
                    }

                    return uiTemplate;
                  })()
                } : undefined}
                onSave={handleSave}
                onPreview={handlePreview}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <TemplatePreview 
        template={previewTemplate}
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the ID card template.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (templateToDelete !== null) {
                  deleteTemplateMutation.mutate(templateToDelete);
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}