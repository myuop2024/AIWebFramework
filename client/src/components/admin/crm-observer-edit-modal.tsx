import React, { useState } from 'react';

interface CRMObserverEditModalProps {
  observer: any;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updated: any) => void;
}

const CRMObserverEditModal: React.FC<CRMObserverEditModalProps> = ({ observer, isOpen, onClose, onSave }) => {
  const [form, setForm] = useState(observer);

  React.useEffect(() => {
    setForm(observer);
  }, [observer]);

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
        <h2 className="text-lg font-semibold mb-4">Edit Observer</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              className="border p-2 rounded w-full mb-2"
              name="parish"
              placeholder="Parish"
              value={form.parish || ''}
              onChange={handleChange}
            />
            <input
              className="border p-2 rounded w-full mb-2"
              name="role"
              placeholder="Role"
              value={form.role || ''}
              onChange={handleChange}
            />
            <input
              className="border p-2 rounded w-full"
              name="status"
              placeholder="Status"
              value={form.status || ''}
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

export default CRMObserverEditModal; 