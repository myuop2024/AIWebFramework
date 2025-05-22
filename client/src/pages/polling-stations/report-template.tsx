import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { FormTemplateEditor } from '@/components/forms/form-template-editor';
import { Spinner } from '@/components/ui/spinner';
import { apiRequest } from '@/lib/queryClient';
import type { FormTemplate, FormTemplateExtended } from '@shared/schema';

export default function PollingStationReportTemplatePage() {
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [template, setTemplate] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isLoading && (!user || user.role !== 'admin')) {
      toast({
        title: 'Access Denied',
        description: "You don't have permission to access this page.",
        variant: 'destructive',
      });
      navigate('/dashboard');
      return;
    }
    setLoading(true);
    apiRequest('GET', '/api/form-templates?category=polling')
      .then(res => res.json())
      .then((data) => {
        setTemplate(data?.[0] || null);
      })
      .finally(() => setLoading(false));
  }, [user, isLoading, toast, navigate]);

  const handleSave = async (data: FormTemplateExtended) => {
    setSaving(true);
    try {
      let res;
      if (template) {
        res = await apiRequest('PATCH', `/api/form-templates/${template.id}`, {
          name: data.name,
          description: data.description,
          category: 'polling',
          fields: { sections: data.sections },
        });
      } else {
        res = await apiRequest('POST', '/api/form-templates', {
          name: data.name,
          description: data.description,
          category: 'polling',
          fields: { sections: data.sections },
          isActive: true,
        });
      }
      if (res.ok) {
        toast({ title: 'Template Saved', description: 'Polling station report template updated.' });
        const updated = await res.json();
        setTemplate(updated);
      } else {
        const err = await res.json();
        toast({ title: 'Error', description: err.message || 'Failed to save template', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to save template', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  if (loading || isLoading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;
  if (!user || user.role !== 'admin') return null;

  return (
    <div className="container mx-auto py-8 max-w-3xl">
      <h1 className="text-2xl font-bold mb-2">Polling Station Report Template</h1>
      <p className="mb-6 text-gray-600">Edit the dynamic report form template used by observers for polling station reports.</p>
      <FormTemplateEditor initialData={template || undefined} onSubmit={handleSave} />
    </div>
  );
} 