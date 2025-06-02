import React, { useState } from 'react';
import Modal from '../ui/Modal';
import { Spinner } from '../ui/spinner';

interface CRMObserverEditModalProps {
  observer: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: any) => void;
  loading?: boolean;
  isAdmin: boolean;
}

const CRMObserverEditModal: React.FC<CRMObserverEditModalProps> = ({ observer, isOpen, onClose, onSave, loading, isAdmin }) => {
  const [form, setForm] = useState(observer);

  React.useEffect(() => {
    setForm(observer);
  }, [observer]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(form);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Observer">
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <input
            className="border p-2 rounded w-full mb-2"
            name="parish"
            placeholder="Parish"
            value={form.parish || ''}
            onChange={handleChange}
            readOnly={!isAdmin}
            disabled={!isAdmin}
          />
          <input
            className="border p-2 rounded w-full mb-2"
            name="role"
            placeholder="Role"
            value={form.role || ''}
            onChange={handleChange}
            readOnly={!isAdmin}
            disabled={!isAdmin}
          />
          <input
            className="border p-2 rounded w-full"
            name="status"
            placeholder="Status"
            value={form.status || ''}
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

export default CRMObserverEditModal; 