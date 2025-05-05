import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Card, 
  CardContent, 
  CardDescription,  
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Calendar } from '@/components/ui/calendar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type FormTemplate } from '@shared/schema';

interface FormBuilderProps {
  template: FormTemplate;
  onSubmit?: (data: any) => void;
  readOnly?: boolean;
}

export function FormBuilder({ template, onSubmit, readOnly = false }: FormBuilderProps) {
  const [formData, setFormData] = useState<any>({});
  
  // Generate a dynamic schema based on the form fields
  const generateSchema = () => {
    const schemaFields: Record<string, any> = {};
    
    // Get sections from template fields
    const sections = 
      template?.fields && 
      typeof template.fields === 'object' && 
      'sections' in template.fields ? 
        (template.fields as any).sections : [];
      
    // Process each field and add to schema
    sections.forEach((section: any) => {
      section.fields.forEach((field: any) => {
        const { name, type, required } = field;
        
        let fieldSchema: any = z.any();
        
        // Create field schema based on type
        switch (type) {
          case 'text':
          case 'textarea':
            fieldSchema = z.string();
            break;
          case 'email':
            fieldSchema = z.string().email();
            break;
          case 'number':
            fieldSchema = z.coerce.number();
            break;
          case 'tel':
            fieldSchema = z.string().min(5);
            break;
          case 'date':
          case 'time':
            fieldSchema = z.date().optional();
            break;
          case 'checkbox':
            fieldSchema = z.boolean().optional();
            break;
          case 'radio':
          case 'select':
            fieldSchema = z.string();
            break;
          default:
            fieldSchema = z.any();
        }
        
        // Add required validation
        if (required) {
          if (type === 'checkbox') {
            fieldSchema = z.boolean().refine((val) => val === true, {
              message: `${field.label} is required`,
            });
          } else {
            fieldSchema = fieldSchema.min(1, `${field.label} is required`);
          }
        } else {
          // Make optional if not required
          fieldSchema = fieldSchema.optional();
        }
        
        schemaFields[name] = fieldSchema;
      });
    });
    
    return z.object(schemaFields);
  };
  
  // Create form from dynamic schema
  const dynamicSchema = generateSchema();
  const form = useForm<z.infer<typeof dynamicSchema>>({
    resolver: zodResolver(dynamicSchema),
    defaultValues: formData,
  });
  
  // Handle form submission
  const handleSubmit = (data: any) => {
    if (onSubmit) {
      onSubmit(data);
    }
    setFormData(data);
  };
  
  // Get sections from template fields
  const sections = 
    template?.fields && 
    typeof template.fields === 'object' && 
    'sections' in template.fields ? 
      (template.fields as any).sections : [];
  
  if (!sections || sections.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No form fields defined for this template</p>
      </div>
    );
  }
  
  // Render a field based on its type
  const renderField = (field: any, fieldName: string) => {
    const { type, label, placeholder, required, helpText, options } = field;
    
    switch (type) {
      case 'text':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={placeholder} 
                    {...field} 
                    disabled={readOnly}
                  />
                </FormControl>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'textarea':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder={placeholder} 
                    rows={3} 
                    {...field} 
                    disabled={readOnly}
                  />
                </FormControl>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'number':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder={placeholder} 
                    {...field} 
                    disabled={readOnly}
                    onChange={(e) => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'email':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    type="email" 
                    placeholder={placeholder} 
                    {...field} 
                    disabled={readOnly}
                  />
                </FormControl>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'tel':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    type="tel" 
                    placeholder={placeholder} 
                    {...field} 
                    disabled={readOnly}
                  />
                </FormControl>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'date':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
                        )}
                        disabled={readOnly}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>{placeholder || "Select a date"}</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={readOnly}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'checkbox':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-3">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={readOnly}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                  {helpText && <FormDescription>{helpText}</FormDescription>}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'radio':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    className="flex flex-col space-y-1"
                    disabled={readOnly}
                  >
                    {options?.map((option: any) => (
                      <FormItem key={option.value} className="flex items-center space-x-3 space-y-0">
                        <FormControl>
                          <RadioGroupItem value={option.value} />
                        </FormControl>
                        <FormLabel className="font-normal">
                          {option.label}
                        </FormLabel>
                      </FormItem>
                    ))}
                  </RadioGroup>
                </FormControl>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'select':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  disabled={readOnly}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder={placeholder || "Select an option"} />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {options?.map((option: any) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'location':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <div className="flex gap-2">
                  <FormControl>
                    <Input 
                      placeholder="Latitude" 
                      {...field} 
                      disabled={true}
                      value={field.value?.lat || ''}
                      className="font-mono"
                    />
                  </FormControl>
                  <FormControl>
                    <Input 
                      placeholder="Longitude" 
                      {...field} 
                      disabled={true}
                      value={field.value?.lng || ''}
                      className="font-mono"
                    />
                  </FormControl>
                  {!readOnly && (
                    <Button
                      type="button"
                      variant="secondary"
                      className="gap-1"
                      onClick={() => {
                        if (navigator.geolocation) {
                          navigator.geolocation.getCurrentPosition((position) => {
                            field.onChange({
                              lat: position.coords.latitude,
                              lng: position.coords.longitude
                            });
                          });
                        }
                      }}
                    >
                      <MapPin className="h-4 w-4" />
                      Get Location
                    </Button>
                  )}
                </div>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'file':
      case 'image':
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field: { value, onChange, ...fieldProps } }) => (
              <FormItem>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    type="file" 
                    accept={type === 'image' ? "image/*" : undefined}
                    disabled={readOnly}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        onChange(file);
                      }
                    }}
                    {...fieldProps}
                  />
                </FormControl>
                {helpText && <FormDescription>{helpText}</FormDescription>}
                <FormMessage />
              </FormItem>
            )}
          />
        );
      
      case 'signature':
        return (
          <FormItem>
            <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
            <div className="h-32 border rounded-md bg-gray-50 flex items-center justify-center">
              {readOnly ? (
                <p className="text-muted-foreground text-sm">[Signature Placeholder]</p>
              ) : (
                <p className="text-muted-foreground text-sm">Signature capture would be implemented here</p>
              )}
            </div>
            {helpText && <FormDescription>{helpText}</FormDescription>}
          </FormItem>
        );
      
      default:
        return (
          <FormItem>
            <FormLabel>{label}</FormLabel>
            <FormDescription>Unsupported field type: {type}</FormDescription>
          </FormItem>
        );
    }
  };
  
  // Sort sections by order
  const sortedSections = [...sections].sort((a, b) => a.order - b.order);
  
  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-8">
        {sortedSections.map((section) => (
          <Card key={section.id}>
            <CardHeader>
              <CardTitle>{section.title}</CardTitle>
              {section.description && (
                <CardDescription>{section.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {section.fields && section.fields.length > 0 ? (
                // Sort fields by order
                [...section.fields]
                  .sort((a, b) => a.order - b.order)
                  .map((field) => (
                    <div key={field.id}>
                      {renderField(field, field.name)}
                    </div>
                  ))
              ) : (
                <p className="text-muted-foreground text-sm">No fields in this section</p>
              )}
            </CardContent>
          </Card>
        ))}
        
        {!readOnly && (
          <div className="flex justify-end">
            <Button type="submit">Submit</Button>
          </div>
        )}
      </form>
    </Form>
  );
}