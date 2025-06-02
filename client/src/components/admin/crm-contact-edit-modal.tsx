import React, { useState } from 'react';

interface CRMContactEditModalProps {
  contact: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: any) => void;
}

const CRMContactEditModal: React.FC<CRMContactEditModalProps> = ({ contact, isOpen, onClose, onSave }) => {
  const [form, setForm] = useState(contact);

  React.useEffect(() => {
    setForm(contact);
  }, [contact]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white rounded shadow-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Edit Contact</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              className="border p-2 rounded w-full mb-2"
              name="name"
              placeholder="Name"
              value={form.name || ''}
              onChange={handleChange}
              required
            />
            <input
              className="border p-2 rounded w-full mb-2"
              name="email"
              placeholder="Email"
              value={form.email || ''}
              onChange={handleChange}
              type="email"
            />
            <input
              className="border p-2 rounded w-full mb-2"
              name="phone"
              placeholder="Phone"
              value={form.phone || ''}
              onChange={handleChange}
            />
            <input
              className="border p-2 rounded w-full"
              name="address"
              placeholder="Address"
              value={form.address || ''}
              onChange={handleChange}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Cancel</button>
            <button type="submit" className="px-4 py-2 rounded bg-primary text-white">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CRMContactEditModal; 