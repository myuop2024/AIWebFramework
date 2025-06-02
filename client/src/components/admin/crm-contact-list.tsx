import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CRMContactEditModal from './crm-contact-edit-modal';
import CRMContactNotes from './crm-contact-notes';
import toast from 'react-hot-toast';
import ConfirmDialog from '../ui/ConfirmDialog';
import Spinner from '../ui/Spinner';

const fetchContacts = async () => {
  const res = await fetch('/crm/contacts');
  if (!res.ok) throw new Error('Failed to fetch contacts');
  return res.json();
};

const deleteContact = async (id: number) => {
  const res = await fetch(`/crm/contacts/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete contact');
};

const updateContact = async (contact: any) => {
  const res = await fetch(`/crm/contacts/${contact.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(contact),
  });
  if (!res.ok) throw new Error('Failed to update contact');
  return res.json();
};

interface CRMContactListProps {
  isAdmin: boolean;
}
const CRMContactList: React.FC<CRMContactListProps> = ({ isAdmin }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['crm-contacts'],
    queryFn: fetchContacts,
  });

  const [editContact, setEditContact] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showNotesId, setShowNotesId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      toast.success('Contact deleted!');
    },
    onError: () => toast.error('Failed to delete contact'),
  });

  const updateMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      setModalOpen(false);
      setEditContact(null);
      toast.success('Contact updated!');
    },
    onError: () => toast.error('Failed to update contact'),
  });

  const handleEdit = (contact: any) => {
    setEditContact(contact);
    setModalOpen(true);
  };

  const handleSave = (updated: any) => {
    updateMutation.mutate(updated);
  };

  const handleSelect = (id: number) => {
    setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };
  const handleSelectAll = () => {
    if (filteredData.length === selected.length) {
      setSelected([]);
    } else {
      setSelected(filteredData.map((c: any) => c.id));
    }
  };
  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
    setDeletingId(id);
  };
  const confirmDelete = () => {
    if (confirmDeleteId !== null) {
      deleteMutation.mutate(confirmDeleteId, {
        onSettled: () => setDeletingId(null)
      });
      setConfirmDeleteId(null);
    }
  };
  const handleBulkDelete = () => {
    setConfirmBulkDelete(true);
  };
  const confirmBulkDeleteAction = () => {
    selected.forEach(id => deleteMutation.mutate(id));
    setSelected([]);
    setConfirmBulkDelete(false);
  };

  const filteredData = data && data.length > 0
    ? data.filter((contact: any) => {
        const q = search.toLowerCase();
        return (
          contact.name?.toLowerCase().includes(q) ||
          contact.email?.toLowerCase().includes(q) ||
          contact.phone?.toLowerCase().includes(q)
        );
      })
    : [];

  if (isLoading) return <div>Loading contacts...</div>;
  if (error) return <div className="text-red-500">Error loading contacts.</div>;

  return (
    <div className="bg-white rounded shadow p-4">
      <h2 className="text-xl font-semibold mb-4">Contacts</h2>
      <input
        className="border p-2 rounded mb-4 w-full"
        placeholder="Search contacts by name, email, or phone..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <div className="mb-2 flex items-center gap-2">
        <input type="checkbox" checked={filteredData.length > 0 && selected.length === filteredData.length} onChange={handleSelectAll} />
        <span className="text-sm">Select All</span>
        <button
          className="ml-4 bg-red-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
          onClick={handleBulkDelete}
          disabled={selected.length === 0}
        >
          Delete Selected
        </button>
      </div>
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="p-2"><input type="checkbox" checked={filteredData.length > 0 && selected.length === filteredData.length} onChange={handleSelectAll} /></th>
            <th className="text-left p-2">Name</th>
            {isAdmin && <th className="text-left p-2">Email</th>}
            {isAdmin && <th className="text-left p-2">Phone</th>}
            {isAdmin && <th className="text-left p-2">Address</th>}
            {!isAdmin && <th className="text-left p-2">Email</th>}
            {!isAdmin && <th className="text-left p-2">Phone</th>}
            {!isAdmin && <th className="text-left p-2">Address</th>}
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredData && filteredData.length > 0 ? (
            filteredData.map((contact: any) => (
              <React.Fragment key={contact.id}>
                <tr className="border-t">
                  <td className="p-2"><input type="checkbox" checked={selected.includes(contact.id)} onChange={() => handleSelect(contact.id)} /></td>
                  <td className="p-2">{contact.name}</td>
                  {isAdmin ? (
                    <>
                      <td className="p-2">{contact.email}</td>
                      <td className="p-2">{contact.phone}</td>
                      <td className="p-2">{contact.address}</td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 text-gray-400 italic">Restricted</td>
                      <td className="p-2 text-gray-400 italic">Restricted</td>
                      <td className="p-2 text-gray-400 italic">Restricted</td>
                    </>
                  )}
                  <td className="p-2 flex gap-2">
                    <button className="text-blue-600 hover:underline" onClick={() => handleEdit(contact)}>Edit</button>
                    <button className="text-red-600 hover:underline flex items-center gap-1" onClick={() => handleDelete(contact.id)} disabled={deleteMutation.isLoading && deletingId === contact.id}>
                      {deleteMutation.isLoading && deletingId === contact.id ? <Spinner className="w-4 h-4" /> : 'Delete'}
                    </button>
                    <button className="text-green-600 hover:underline" onClick={() => setShowNotesId(showNotesId === contact.id ? null : contact.id)}>
                      {showNotesId === contact.id ? 'Hide Notes' : 'Show Notes'}
                    </button>
                  </td>
                </tr>
                {showNotesId === contact.id && (
                  <tr>
                    <td colSpan={6}>
                      <CRMContactNotes contactId={contact.id} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          ) : (
            <tr><td colSpan={6} className="p-2 text-gray-500">No contacts found.</td></tr>
          )}
        </tbody>
      </table>
      {modalOpen && editContact && (
        <CRMContactEditModal
          contact={editContact}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          loading={updateMutation.isLoading}
        />
      )}
      <ConfirmDialog
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={confirmDelete}
        message="Are you sure you want to delete this contact?"
      />
      <ConfirmDialog
        isOpen={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        onConfirm={confirmBulkDeleteAction}
        message="Are you sure you want to delete all selected contacts?"
      />
    </div>
  );
};

export default CRMContactList; 