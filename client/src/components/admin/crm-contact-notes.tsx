import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

interface CRMContactNotesProps {
  contactId: number;
  isAdmin: boolean;
}

const fetchNotes = async (contactId: number) => {
  const res = await fetch(`/crm/contacts/${contactId}/notes`);
  if (!res.ok) throw new Error('Failed to fetch notes');
  return res.json();
};

const addNote = async ({ contactId, content }: { contactId: number; content: string }) => {
  const res = await fetch(`/crm/contacts/${contactId}/notes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
  if (!res.ok) throw new Error('Failed to add note');
  return res.json();
};

const CRMContactNotes: React.FC<CRMContactNotesProps> = ({ contactId, isAdmin }) => {
  const queryClient = useQueryClient();
  const { data: notes, isLoading } = useQuery({
    queryKey: ['crm-contact-notes', contactId],
    queryFn: () => fetchNotes(contactId),
  });
  const [note, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: (data: { contactId: number; content: string }) => addNote(data),
    onSuccess: () => {
      setNote('');
      queryClient.invalidateQueries({ queryKey: ['crm-contact-notes', contactId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (note.trim()) {
      mutation.mutate({ contactId, content: note });
    }
  };

  if (!isAdmin) {
    return (
      <div className="bg-gray-50 rounded p-4 mt-4">
        <h3 className="font-semibold mb-2">Notes & Interactions</h3>
        <div className="text-gray-400 italic">Notes are restricted to administrators.</div>
      </div>
    );
  }
  return (
    <div className="bg-gray-50 rounded p-4 mt-4">
      <h3 className="font-semibold mb-2">Notes & Interactions</h3>
      {isLoading ? (
        <div>Loading notes...</div>
      ) : (
        <ul className="mb-2">
          {notes && notes.length > 0 ? (
            notes.map((n: any) => (
              <li key={n.id} className="mb-1 text-sm text-gray-700 border-b pb-1">
                <span className="font-medium">{n.content}</span>
                <span className="text-xs text-gray-400 ml-2">{new Date(n.createdAt).toLocaleString()}</span>
              </li>
            ))
          ) : (
            <li className="text-gray-400 text-sm">No notes yet.</li>
          )}
        </ul>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2 mt-2">
        <input
          className="border p-2 rounded flex-1"
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Add a note..."
        />
        <button
          type="submit"
          className="bg-primary text-white px-3 py-2 rounded"
          disabled={mutation.isLoading || !note.trim()}
        >
          {mutation.isLoading ? 'Adding...' : 'Add'}
        </button>
      </form>
    </div>
  );
};

export default CRMContactNotes; 