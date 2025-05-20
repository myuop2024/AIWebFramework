import { useState, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { v4 as uuidv4 } from 'uuid';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Switch } from '@/components/ui/switch';
import { 
  GripVertical, 
  Plus, 
  Trash, 
  Copy, 
  RotateCcw,  
  Settings,
  Check,
  Calendar,
  Clock,
  Upload,
  Image,
  Edit,
  MapPin,
  CircleDot,
  ChevronsUpDown,
} from 'lucide-react';
import { 
  formTemplateExtendedSchema,
  type FormTemplate,
  type FormTemplateExtended,
  type FormField as SchemaFormField,
  type FormSection as SchemaFormSection
} from '@shared/schema';

// Available field types with icons
const FIELD_TYPES = [
  { value: 'text', label: 'Text', icon: 'Text' },
  { value: 'textarea', label: 'Textarea', icon: 'TextArea' },
  { value: 'number', label: 'Number', icon: 'Number' },
  { value: 'email', label: 'Email', icon: 'Email' },
  { value: 'tel', label: 'Phone', icon: 'Phone' },
  { value: 'date', label: 'Date', icon: Calendar },
  { value: 'time', label: 'Time', icon: Clock },
  { value: 'checkbox', label: 'Checkbox', icon: Check },
  { value: 'radio', label: 'Radio', icon: CircleDot },
  { value: 'select', label: 'Dropdown', icon: ChevronsUpDown },
  { value: 'file', label: 'File Upload', icon: Upload },
  { value: 'image', label: 'Image', icon: Image },
  { value: 'signature', label: 'Signature', icon: Edit },
  { value: 'location', label: 'Location', icon: MapPin },
];

// Form categories
const FORM_CATEGORIES = [
  { value: 'polling', label: 'Polling Station' },
  { value: 'incident', label: 'Incident Report' },
  { value: 'observation', label: 'General Observation' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'evaluation', label: 'Evaluation' },
];

interface FormTemplateEditorProps {
  initialData?: FormTemplate;
  onSubmit: (data: FormTemplateExtended) => void;
}

export function FormTemplateEditor({ initialData, onSubmit }: FormTemplateEditorProps) {
  // Transform initialData to FormTemplateExtended format if available
  const defaultValues: FormTemplateExtended = initialData 
    ? {
        name: initialData.name,
        description: initialData.description || '',
        category: initialData.category,
        sections: getInitialSections(),
        isEncrypted: false,
      }
    : {
        name: '',
        description: '',
        category: 'polling',
        sections: [
          {
            id: uuidv4(),
            title: 'General Information',
            description: 'Basic information about the observation',
            order: 0,
            fields: [
              {
                id: uuidv4(),
                type: 'text',
                label: 'Observer Name',
                name: 'observerName',
                required: true,
                placeholder: 'Enter your full name',
                order: 0
              }
            ]
          }
        ],
        isEncrypted: false,
      };
  
  function getInitialSections(): SchemaFormSection[] {
    if (!initialData || !initialData.fields || typeof initialData.fields !== 'object') {
      return [];
    }
    try {
      // Try to parse the sections from the fields JSON
      const fieldsData = initialData.fields as { sections: SchemaFormSection[] };
      if (fieldsData.sections && Array.isArray(fieldsData.sections)) {
        return fieldsData.sections.map((section: SchemaFormSection) => ({
          id: section.id || uuidv4(),
          title: section.title,
          description: section.description || '',
          order: section.order || 0,
          fields: Array.isArray(section.fields) 
            ? section.fields.map((field: SchemaFormField) => ({
                ...field,
                id: field.id || uuidv4()
              }))
            : []
        }));
      }
    } catch (error) {
      console.error('Error parsing form template fields:', error);
    }
    return [];
  }
  
  const form = useForm<FormTemplateExtended>({
    resolver: zodResolver(formTemplateExtendedSchema),
    defaultValues,
  });
  
  // Field arrays for sections and nested fields
  const { fields: sections, append: appendSection, remove: removeSection, move: moveSection } = 
    useFieldArray({
      control: form.control,
      name: 'sections',
    });
  
  // Add a new section
  const handleAddSection = () => {
    appendSection({
      id: uuidv4(),
      title: `Section ${sections.length + 1}`,
      description: '',
      order: sections.length,
      fields: []
    });
  };
  
  // Add a field to a section
  const handleAddField = (sectionIndex: number, fieldType: string) => {
    const fields = form.getValues(`sections.${sectionIndex}.fields`) || [];
    
    const newField: SchemaFormField = {
      id: uuidv4(),
      type: fieldType as any,
      label: `New ${fieldType} field`,
      name: `field_${uuidv4().split('-')[0]}`,
      required: false,
      placeholder: '',
      order: fields.length,
    };
    
    // Add options for select, radio, or checkbox fields
    if (fieldType === 'select' || fieldType === 'radio' || fieldType === 'checkbox') {
      newField.options = [
        { label: 'Option 1', value: 'option1' },
        { label: 'Option 2', value: 'option2' }
      ];
    }
    
    form.setValue(`sections.${sectionIndex}.fields`, [...fields, newField]);
  };
  
  // Remove a field
  const handleRemoveField = (sectionIndex: number, fieldIndex: number) => {
    const fields = form.getValues(`sections.${sectionIndex}.fields`);
    const updatedFields = [...fields];
    updatedFields.splice(fieldIndex, 1);
    form.setValue(`sections.${sectionIndex}.fields`, updatedFields);
  };
  
  // Duplicate a field
  const handleDuplicateField = (sectionIndex: number, fieldIndex: number) => {
    const fields = form.getValues(`sections.${sectionIndex}.fields`);
    const fieldToDuplicate = fields[fieldIndex];
    
    const duplicatedField: SchemaFormField = {
      ...fieldToDuplicate,
      id: uuidv4(),
      label: `${fieldToDuplicate.label} (Copy)`,
      name: `${fieldToDuplicate.name}_copy`
    };
    
    const updatedFields = [...fields];
    updatedFields.splice(fieldIndex + 1, 0, duplicatedField);
    form.setValue(`sections.${sectionIndex}.fields`, updatedFields);
  };
  
  // Handle form submission
  const handleFormSubmit = (data: FormTemplateExtended) => {
    // Update order values before submitting
    const updatedSections = data.sections.map((section, index) => ({
      ...section,
      order: index,
      fields: section.fields.map((field, fieldIndex) => ({
        ...field,
        order: fieldIndex
      }))
    }));
    
    onSubmit({
      ...data,
      sections: updatedSections
    });
  };
  
  // Move field up or down
  const moveField = (sectionIndex: number, fieldIndex: number, direction: 'up' | 'down') => {
    const fields = form.getValues(`sections.${sectionIndex}.fields`);
    const newIndex = direction === 'up' ? fieldIndex - 1 : fieldIndex + 1;
    
    if (newIndex < 0 || newIndex >= fields.length) return;
    
    const updatedFields = [...fields];
    const [movedField] = updatedFields.splice(fieldIndex, 1);
    updatedFields.splice(newIndex, 0, movedField);
    
    form.setValue(`sections.${sectionIndex}.fields`, updatedFields);
  };
  
  return (
    <div className="space-y-4">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <div className="grid gap-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter template name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select 
                      defaultValue={field.value} 
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {FORM_CATEGORIES.map((category) => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Enter a description for this template"
                      rows={3}
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="isEncrypted"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                  <div className="space-y-0.5">
                    <FormLabel>Encrypt Form Data</FormLabel>
                    <FormDescription>
                      Enable encryption for sensitive form submissions
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
          
          <div className="my-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-medium">Form Sections</h2>
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleAddSection}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Section
              </Button>
            </div>
            
            <div className="space-y-4">
              {sections.map((section, sectionIndex) => (
                <Card key={section.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-5 w-5 text-muted-foreground" />
                        <div>
                          <FormField
                            control={form.control}
                            name={`sections.${sectionIndex}.title`}
                            render={({ field }) => (
                              <Input
                                {...field}
                                placeholder="Section Title"
                                className="text-lg font-semibold border-none p-0 h-auto bg-transparent"
                              />
                            )}
                          />
                        </div>
                      </div>
                      
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Trash className="h-4 w-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Section</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this section? This will remove all fields within this section and cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction 
                              className="bg-red-500 hover:bg-red-600"
                              onClick={() => removeSection(sectionIndex)}
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                    
                    <FormField
                      control={form.control}
                      name={`sections.${sectionIndex}.description`}
                      render={({ field }) => (
                        <Textarea
                          {...field}
                          placeholder="Section Description (optional)"
                          className="text-sm text-muted-foreground resize-none border-none p-0 bg-transparent"
                          rows={2}
                        />
                      )}
                    />
                  </CardHeader>
                  
                  <CardContent>
                    <div className="space-y-3">
                      {form.watch(`sections.${sectionIndex}.fields`)?.map(
                        (field, fieldIndex) => (
                          <div
                            key={field.id}
                            className="border rounded-md p-3 bg-white"
                          >
                            <div className="flex items-start gap-2">
                              <div className="mt-1.5">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                              </div>
                              
                              <div className="flex-1 grid gap-2">
                                <div className="flex justify-between">
                                  <FormField
                                    control={form.control}
                                    name={`sections.${sectionIndex}.fields.${fieldIndex}.label`}
                                    render={({ field }) => (
                                      <Input
                                        {...field}
                                        placeholder="Field Label"
                                        className="border-none p-0 text-base font-medium bg-transparent"
                                      />
                                    )}
                                  />
                                  
                                  <div className="flex gap-1 -mt-1">
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDuplicateField(sectionIndex, fieldIndex)}
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                    </Button>
                                    
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleRemoveField(sectionIndex, fieldIndex)}
                                    >
                                      <Trash className="h-3.5 w-3.5 text-red-500" />
                                    </Button>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`sections.${sectionIndex}.fields.${fieldIndex}.name`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Field Name</FormLabel>
                                        <FormControl>
                                          <Input {...field} size={1} className="h-7 text-xs" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name={`sections.${sectionIndex}.fields.${fieldIndex}.type`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Field Type</FormLabel>
                                        <Select 
                                          value={field.value} 
                                          onValueChange={field.onChange}
                                        >
                                          <FormControl>
                                            <SelectTrigger className="h-7 text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
                                            {FIELD_TYPES.map((type) => (
                                              <SelectItem key={type.value} value={type.value} className="text-xs">
                                                {type.label}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                <div className="grid grid-cols-2 gap-2">
                                  <FormField
                                    control={form.control}
                                    name={`sections.${sectionIndex}.fields.${fieldIndex}.placeholder`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-xs">Placeholder</FormLabel>
                                        <FormControl>
                                          <Input {...field} size={1} className="h-7 text-xs" />
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                  
                                  <FormField
                                    control={form.control}
                                    name={`sections.${sectionIndex}.fields.${fieldIndex}.required`}
                                    render={({ field }) => (
                                      <FormItem className="flex flex-row items-end space-x-3 space-y-0">
                                        <FormControl>
                                          <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                          />
                                        </FormControl>
                                        <FormLabel className="text-xs">Required Field</FormLabel>
                                      </FormItem>
                                    )}
                                  />
                                </div>
                                
                                {/* Render options if field type is select, radio, or checkbox */}
                                {(form.watch(`sections.${sectionIndex}.fields.${fieldIndex}.type`) === 'select' ||
                                  form.watch(`sections.${sectionIndex}.fields.${fieldIndex}.type`) === 'radio' ||
                                  form.watch(`sections.${sectionIndex}.fields.${fieldIndex}.type`) === 'checkbox') && (
                                  <Accordion type="single" collapsible className="mt-1">
                                    <AccordionItem value="options">
                                      <AccordionTrigger className="text-xs py-1">
                                        Options
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <Controller
                                          control={form.control}
                                          name={`sections.${sectionIndex}.fields.${fieldIndex}.options`}
                                          render={({ field: optionsField }) => (
                                            <div className="space-y-2">
                                              {optionsField.value?.map((option, optionIndex) => (
                                                <div key={optionIndex} className="flex gap-2">
                                                  <Input 
                                                    value={option.label}
                                                    onChange={(e) => {
                                                      const newOptions = [...optionsField.value];
                                                      newOptions[optionIndex].label = e.target.value;
                                                      newOptions[optionIndex].value = e.target.value.toLowerCase().replace(/\s+/g, '_');
                                                      optionsField.onChange(newOptions);
                                                    }}
                                                    className="h-7 text-xs flex-1"
                                                    placeholder="Option label"
                                                  />
                                                  
                                                  <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                      const newOptions = [...optionsField.value];
                                                      newOptions.splice(optionIndex, 1);
                                                      optionsField.onChange(newOptions);
                                                    }}
                                                  >
                                                    <Trash className="h-3.5 w-3.5 text-red-500" />
                                                  </Button>
                                                </div>
                                              ))}
                                              
                                              <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                className="w-full text-xs"
                                                onClick={() => {
                                                  const newOptions = [...(optionsField.value || [])];
                                                  newOptions.push({ 
                                                    label: `Option ${newOptions.length + 1}`, 
                                                    value: `option_${newOptions.length + 1}` 
                                                  });
                                                  optionsField.onChange(newOptions);
                                                }}
                                              >
                                                <Plus className="h-3 w-3 mr-1" />
                                                Add Option
                                              </Button>
                                            </div>
                                          )}
                                        />
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      )}
                      
                      {form.watch(`sections.${sectionIndex}.fields`)?.length === 0 && (
                        <div className="text-center p-4 border border-dashed rounded-md">
                          <p className="text-sm text-muted-foreground">
                            No fields added yet
                          </p>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-4">
                      <Select 
                        onValueChange={(value) => handleAddField(sectionIndex, value)}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="+ Add field" />
                        </SelectTrigger>
                        <SelectContent>
                          {FIELD_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {sections.length === 0 && (
              <div className="text-center p-8 border border-dashed rounded-md">
                <p className="text-muted-foreground mb-2">No sections added yet</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleAddSection}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Section
                </Button>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button type="submit" className="min-w-24">
              {initialData ? 'Update Template' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}