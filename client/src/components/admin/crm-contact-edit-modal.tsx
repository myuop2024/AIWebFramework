import React, { useState } from 'react';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

interface CRMContactEditModalProps {
  contact: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: any) => void;
  loading?: boolean;
  isAdmin: boolean;
}

const CRMContactEditModal: React.FC<CRMContactEditModalProps> = ({ contact, isOpen, onClose, onSave, loading, isAdmin }) => {
  const [form, setForm] = useState(contact);

  React.useEffect(() => {
    setForm(contact);
  }, [contact]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Contact">
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
            readOnly={!isAdmin}
            disabled={!isAdmin}
          />
          <input
            className="border p-2 rounded w-full mb-2"
            name="phone"
            placeholder="Phone"
            value={form.phone || ''}
            onChange={handleChange}
            readOnly={!isAdmin}
            disabled={!isAdmin}
          />
          <input
            className="border p-2 rounded w-full"
            name="address"
            placeholder="Address"
            value={form.address || ''}
            onChange={handleChange}
            readOnly={!isAdmin}
            disabled={!isAdmin}
          />
        </div>
        <div className="flex justify-end gap-2">
          <button type="button" className="px-4 py-2 rounded bg-gray-200" onClick={onClose}>Cancel</button>
          <button type="submit" className="px-4 py-2 rounded bg-primary text-white flex items-center gap-2" disabled={loading}>
            {loading ? <Spinner /> : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CRMContactEditModal; 