import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

export default function PollingStationReportForm({ stationId, onSuccess }: { stationId: number, onSuccess?: () => void }) {
  const { toast } = useToast();
  const [template, setTemplate] = useState<any>(null);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch('/api/polling-stations/report-template')
      .then(res => res.json())
      .then(setTemplate)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading report form...</div>;
  if (!template) return <div>No report template configured.</div>;

  const handleChange = (fieldId: string, value: any) => {
    setForm((f: any) => ({ ...f, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch(`/api/polling-stations/${stationId}/report`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    setSubmitting(false);
    if (res.ok) {
      toast({ title: 'Report submitted', description: 'Your report was submitted successfully.' });
      setForm({});
      if (onSuccess) onSuccess();
    } else {
      const err = await res.json();
      toast({ title: 'Error', description: err.message || 'Failed to submit report', variant: 'destructive' });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {template.fields?.sections?.map((section: any) => (
        <div key={section.id} className="mb-4">
          <h3 className="font-medium mb-2">{section.title}</h3>
          {section.fields?.map((field: any) => (
            <div key={field.id} className="mb-2">
              <label className="block font-medium mb-1">{field.label}{field.required && ' *'}</label>
              {field.type === 'textarea' ? (
                <Textarea
                  value={form[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)}
                  required={field.required}
                />
              ) : (
                <Input
                  type={field.type === 'number' ? 'number' : 'text'}
                  value={form[field.id] || ''}
                  onChange={e => handleChange(field.id, e.target.value)}
                  required={field.required}
                />
              )}
            </div>
          ))}
        </div>
      ))}
      <Button type="submit" disabled={submitting}>{submitting ? 'Submitting...' : 'Submit Report'}</Button>
    </form>
  );
} 