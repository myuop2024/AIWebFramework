import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const CRMContactForm: React.FC = () => {
  const [form, setForm] = useState({ name: '', email: '', phone: '', address: '' });
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: async (newContact: typeof form) => {
      const res = await fetch('/crm/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newContact),
      });
      if (!res.ok) throw new Error('Failed to add contact');
      return res.json();
    },
    onSuccess: () => {
      setForm({ name: '', email: '', phone: '', address: '' });
      setError(null);
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
    },
    onError: (err: any) => {
      setError(err.message || 'Error adding contact');
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) {
      setError('Name is required');
      return;
    }
    mutation.mutate(form);
  };

  return (
    <form onSubmit={handleSubmit} className="mb-6 bg-white rounded shadow p-4">
      <h2 className="text-lg font-semibold mb-2">Add New Contact</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <input
          className="border p-2 rounded"
          name="name"
          placeholder="Name*"
          value={form.name}
          onChange={handleChange}
          required
        />
        <input
          className="border p-2 rounded"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          type="email"
        />
        <input
          className="border p-2 rounded"
          name="phone"
          placeholder="Phone"
          value={form.phone}
          onChange={handleChange}
        />
        <input
          className="border p-2 rounded"
          name="address"
          placeholder="Address"
          value={form.address}
          onChange={handleChange}
        />
      </div>
      <button
        type="submit"
        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-dark"
        disabled={mutation.isLoading}
      >
        {mutation.isLoading ? 'Adding...' : 'Add Contact'}
      </button>
    </form>
  );
};

export default CRMContactForm; 