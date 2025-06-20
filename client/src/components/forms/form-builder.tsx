import { useState, useEffect, useRef } from 'react';
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

// Define a type for options
export interface FieldOption {
  value: string;
  label: string;
}

// Define FormField and FormSection locally based on expected structure from template.fields
interface SchemaFormField {
  id: string;
  name: string; // Added name as it's used for schemaFields key and fieldName
  type: string;
  label: string;
  required?: boolean;
  placeholder?: string;
  helpText?: string;
  options?: FieldOption[];
  order: number; // Assuming order is present based on sort((a, b) => a.order - b.order)
}

interface SchemaFormSection {
  id: string;
  title: string;
  description?: string;
  fields: SchemaFormField[];
  order: number; // Assuming order is present
}

interface FormBuilderProps {
  template: FormTemplate;
  onSubmit?: (data: Record<string, unknown>) => void;
  readOnly?: boolean;
}

export function FormBuilder({ template, onSubmit, readOnly = false }: FormBuilderProps) {
  const [formData, setFormData] = useState<Record<string, string | number | boolean | string[] | null>>({});
  const [showSuggestions, setShowSuggestions] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  
  // Generate a dynamic schema based on the form fields
  const generateSchema = () => {
    const schemaFields: Record<string, z.ZodTypeAny> = {};
    
    // Get sections from template fields
    const sections = 
      template?.fields && 
      typeof template.fields === 'object' && 
      'sections' in template.fields ? 
        (template.fields as { sections: SchemaFormSection[] }).sections : [];
      
    // Process each field and add to schema
    sections.forEach((section: SchemaFormSection) => {
      section.fields.forEach((field: SchemaFormField) => {
        const { name, type, required, label } = field;
        
        let fieldSchema: z.ZodTypeAny = z.any(); // Start with z.any() for more flexibility before specializing
        
        // Create field schema based on type
        switch (type) {
          case 'text':
          case 'textarea':
            fieldSchema = z.string();
            if (required) {
              fieldSchema = fieldSchema.min(1, `${label} is required`);
            } else {
              fieldSchema = fieldSchema.optional();
            }
            break;
          case 'email':
            fieldSchema = z.string().email({ message: "Invalid email format" });
            if (required) {
              fieldSchema = fieldSchema.min(1, `${label} is required`);
            } else {
              fieldSchema = fieldSchema.optional();
            }
            break;
          case 'number':
            fieldSchema = z.coerce.number({ invalid_type_error: `${label} must be a number` });
            if (required) {
              // For numbers, required means it must be provided. Min value can be set if needed.
              // fieldSchema = fieldSchema; // No change needed if just required, not optional.
            } else {
              fieldSchema = fieldSchema.optional();
            }
            break;
          case 'tel':
            fieldSchema = z.string();
            if (required) {
              fieldSchema = fieldSchema.min(5, `${label} must be at least 5 characters`);
            } else {
              fieldSchema = fieldSchema.optional();
            }
            break;
          case 'date':
          case 'time': // Assuming time might also be represented as Date or string parsable to Date
            fieldSchema = z.date({ invalid_type_error: `${label} must be a valid date` });
            if (!required) {
              fieldSchema = fieldSchema.optional().nullable(); // Allow null for optional dates too
            }
            break;
          case 'checkbox':
            fieldSchema = z.boolean();
            if (required) {
              fieldSchema = fieldSchema.refine((val) => val === true, {
                message: `${label} is required`,
              });
            } else {
              fieldSchema = fieldSchema.optional();
            }
            break;
          case 'radio':
          case 'select':
            fieldSchema = z.string();
            if (required) {
              fieldSchema = fieldSchema.min(1, `${label} is required`);
            } else {
              fieldSchema = fieldSchema.optional();
            }
            break;
          default:
            fieldSchema = z.string();
            if (required) {
              fieldSchema = fieldSchema.min(1, `${label} is required`);
            } else {
              fieldSchema = fieldSchema.optional();
            }
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
  const handleSubmit = (data: Record<string, unknown>) => {
    if (onSubmit) {
      onSubmit(data);
    }
    setFormData(data as Record<string, string | number | boolean | string[] | null>); // Added type assertion
    Object.entries(data).forEach(([field, value]) => {
      if (typeof value === 'string') saveFieldHistory(field, value);
    });
  };
  
  // Get sections from template fields
  const sections = 
    template?.fields && 
    typeof template.fields === 'object' && 
    'sections' in template.fields ? 
      (template.fields as { sections: SchemaFormSection[] }).sections : [];
  
  if (!sections || sections.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No form fields defined for this template</p>
      </div>
    );
  }
  
  // Smart auto-completion logic
  function getFieldHistory(fieldName: string): string[] {
    try {
      const data = localStorage.getItem('formFieldHistory_' + fieldName);
      if (data) return JSON.parse(data);
    } catch {}
    return [];
  }
  function saveFieldHistory(fieldName: string, value: string) {
    if (!value) return;
    let history = getFieldHistory(fieldName);
    if (!history.includes(value)) {
      history = [value, ...history].slice(0, 5);
      localStorage.setItem('formFieldHistory_' + fieldName, JSON.stringify(history));
    }
  }
  
  // Render a field based on its type
  const renderField = (field: SchemaFormField, fieldName: string) => {
    const { type, label, placeholder, required, helpText, options } = field;
    
    switch (type) {
      case 'text':
        const textHistory = getFieldHistory(fieldName);
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem style={{ position: 'relative' }}>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    placeholder={placeholder} 
                    {...field} 
                    disabled={readOnly}
                    ref={el => inputRefs.current[fieldName] = el}
                    autoComplete="off"
                    onFocus={() => setShowSuggestions(fieldName)}
                    onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                  />
                </FormControl>
                {showSuggestions === fieldName && textHistory.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded shadow w-full mt-1">
                    {textHistory.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                        onMouseDown={() => {
                          form.setValue(fieldName, suggestion);
                          setShowSuggestions(null);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
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
        const numberHistory = getFieldHistory(fieldName);
        return (
          <FormField
            control={form.control}
            name={fieldName}
            render={({ field }) => (
              <FormItem style={{ position: 'relative' }}>
                <FormLabel>{label} {required && <span className="text-red-500">*</span>}</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    placeholder={placeholder} 
                    {...field} 
                    disabled={readOnly}
                    ref={el => inputRefs.current[fieldName] = el}
                    autoComplete="off"
                    onFocus={() => setShowSuggestions(fieldName)}
                    onBlur={() => setTimeout(() => setShowSuggestions(null), 200)}
                    onChange={e => field.onChange(e.target.valueAsNumber)}
                  />
                </FormControl>
                {showSuggestions === fieldName && numberHistory.length > 0 && (
                  <div className="absolute z-10 bg-white border rounded shadow w-full mt-1">
                    {numberHistory.map((suggestion, idx) => (
                      <div
                        key={idx}
                        className="px-3 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                        onMouseDown={() => {
                          form.setValue(fieldName, suggestion);
                          setShowSuggestions(null);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
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
                    {(options as FieldOption[] | undefined)?.map((option) => (
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
                    {(options as FieldOption[] | undefined)?.map((option) => (
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