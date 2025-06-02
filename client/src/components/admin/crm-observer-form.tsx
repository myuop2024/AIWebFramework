import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Spinner } from '../ui/spinner';

const fetchContacts = async () => {
  const res = await fetch('/crm/contacts');
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
};

const CRMObserverForm: React.FC = () => {
  const [form, setForm] = useState({ crmContactId: '', parish: '', role: '', status: '' });
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: contacts, isLoading: loadingContacts } = useQuery({
    queryKey: ['crm-contacts'],
    queryFn: fetchContacts,
  });

  const mutation = useMutation({
    mutationFn: async (newObserver: typeof form) => {
      const res = await fetch('/crm/observers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newObserver,
          crmContactId: Number(newObserver.crmContactId),
        }),
      });
      if (!res.ok) throw new Error('Failed to add observer');
      return res.json();
    },
    onSuccess: () => {
      setForm({ crmContactId: '', parish: '', role: '', status: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['crm-observers'] });
      toast.success('Observer added!');
    },
    onError: (err: any) => {
      setError(err.message || 'Error adding observer');
      toast.error('Failed to add observer');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.crmContactId) {
      setError('Contact is required');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 bg-white rounded shadow p-4 mt-8">
      <h2 className="text-lg font-semibold mb-2">Add New Observer</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <select
          className="border p-2 rounded"
          name="crmContactId"
          value={form.crmContactId}
          onChange={handleChange}
          required
        >
          <option value="">Select Contact*</option>
          {loadingContacts ? (
            <option>Loading...</option>
          ) : (
            contacts && contacts.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} ({c.email || c.phone})</option>
            ))
          )}
        </select>
        <input
          className="border p-2 rounded"
          name="parish"
          placeholder="Parish"
          value={form.parish}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          name="role"
          placeholder="Role"
          value={form.role}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          name="status"
          placeholder="Status"
          value={form.status}
          onChange={handleChange}
        />
      </div>
      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark flex items-center gap-2"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? <Spinner /> : 'Add Observer'}
      </button>
    </form>
  );
};

export default CRMObserverForm; 