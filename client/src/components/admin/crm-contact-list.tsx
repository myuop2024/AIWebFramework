import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CRMContactEditModal from './crm-contact-edit-modal';
import CRMContactNotes from './crm-contact-notes';

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

const CRMContactList: React.FC = () => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['crm-contacts'],
    queryFn: fetchContacts,
  });

  const [editContact, setEditContact] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showNotesId, setShowNotesId] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['crm-contacts'] }),
  });

  const updateMutation = useMutation({
    mutationFn: updateContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-contacts'] });
      setModalOpen(false);
      setEditContact(null);
    },
  });

  const handleEdit = (contact: any) => {
    setEditContact(contact);
    setModalOpen(true);
  };

  const handleSave = (updated: any) => {
    updateMutation.mutate(updated);
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
      <table className="min-w-full text-sm">
        <thead>
          <tr>
            <th className="text-left p-2">Name</th>
            <th className="text-left p-2">Email</th>
            <th className="text-left p-2">Phone</th>
            <th className="text-left p-2">Address</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredData && filteredData.length > 0 ? (
            filteredData.map((contact: any) => (
              <React.Fragment key={contact.id}>
                <tr className="border-t">
                  <td className="p-2">{contact.name}</td>
                  <td className="p-2">{contact.email}</td>
                  <td className="p-2">{contact.phone}</td>
                  <td className="p-2">{contact.address}</td>
                  <td className="p-2 flex gap-2">
                    <button className="text-blue-600 hover:underline" onClick={() => handleEdit(contact)}>Edit</button>
                    <button className="text-red-600 hover:underline" onClick={() => deleteMutation.mutate(contact.id)} disabled={deleteMutation.isLoading}>
                      {deleteMutation.isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                    <button className="text-green-600 hover:underline" onClick={() => setShowNotesId(showNotesId === contact.id ? null : contact.id)}>
                      {showNotesId === contact.id ? 'Hide Notes' : 'Show Notes'}
                    </button>
                  </td>
                </tr>
                {showNotesId === contact.id && (
                  <tr>
                    <td colSpan={5}>
                      <CRMContactNotes contactId={contact.id} />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))
          ) : (
            <tr><td colSpan={5} className="p-2 text-gray-500">No contacts found.</td></tr>
          )}
        </tbody>
      </table>
      {modalOpen && editContact && (
        <CRMContactEditModal
          contact={editContact}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default CRMContactList; 