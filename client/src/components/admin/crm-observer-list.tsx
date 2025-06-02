import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CRMObserverEditModal from './crm-observer-edit-modal';
import { Link as LinkIcon, UserX } from 'lucide-react';
import toast from 'react-hot-toast';
import Modal from '../ui/Modal';
import Spinner from '../ui/Spinner';

const fetchObservers = async () => {
  const res = await fetch('/crm/observers');
  if (!res.ok) throw new Error('Failed to fetch observers');
  return res.json();
};

const deleteObserver = async (id: number) => {
  const res = await fetch(`/crm/observers/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete observer');
};

const updateObserver = async (observer: any) => {
  const res = await fetch(`/crm/observers/${observer.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(observer),
  });
  if (!res.ok) throw new Error('Failed to update observer');
  return res.json();
};

interface CRMObserverListProps {
  isAdmin: boolean;
}
const CRMObserverList: React.FC<CRMObserverListProps> = ({ isAdmin }) => {
  const queryClient = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ['crm-observers'],
    queryFn: fetchObservers,
  });

  const [editObserver, setEditObserver] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkObserver, setLinkObserver] = useState<any | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<any[]>([]);
  const [userLoading, setUserLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [linkingId, setLinkingId] = useState<number | null>(null);

  useEffect(() => {
    if (linkModalOpen && userSearch.length > 1) {
      setUserLoading(true);
      fetch(`/api/users?search=${encodeURIComponent(userSearch)}&limit=10`)
        .then(res => res.json())
        .then(data => setUserResults(data.users || data))
        .finally(() => setUserLoading(false));
    } else {
      setUserResults([]);
    }
  }, [userSearch, linkModalOpen]);

  const deleteMutation = useMutation({
    mutationFn: deleteObserver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-observers'] });
      toast.success('Observer deleted!');
    },
    onError: () => toast.error('Failed to delete observer'),
  });

  const updateMutation = useMutation({
    mutationFn: updateObserver,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-observers'] });
      setModalOpen(false);
      setEditObserver(null);
      toast.success('Observer updated!');
    },
    onError: () => toast.error('Failed to update observer'),
  });

  const linkMutation = useMutation({
    mutationFn: async ({ observerId, userId }: { observerId: number; userId: number }) => {
      const res = await fetch(`/crm/observers/${observerId}/link-user`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error('Failed to link observer to user');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-observers'] });
      setLinkModalOpen(false);
      toast.success('Observer linked to user!');
    },
    onError: () => toast.error('Failed to link observer to user'),
  });

  const findAiLinks = async () => {
    setAiLoading(true);
    setAiSuggestions([]);
    const observers = await fetch('/crm/observers').then(res => res.json());
    const usersRes = await fetch('/api/users?limit=1000');
    const usersData = await usersRes.json();
    const users = usersData.users || usersData;
    const res = await fetch('/crm/observers/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ observers, users })
    });
    const data = await res.json();
    setAiSuggestions(data.suggestions || []);
    setAiLoading(false);
  };

  const handleEdit = (observer: any) => {
    setEditObserver(observer);
    setModalOpen(true);
  };

  const handleSave = (updated: any) => {
    updateMutation.mutate(updated);
  };

  const handleLinkProfile = (observer: any) => {
    setLinkObserver(observer);
    setLinkModalOpen(true);
    setUserSearch('');
    setUserResults([]);
  };

  const handleSelectUser = (user: any) => {
    if (!linkObserver) return;
    setLinkingId(linkObserver.id);
    linkMutation.mutate({ observerId: linkObserver.id, userId: user.id }, {
      onSettled: () => setLinkingId(null)
    });
  };

  const handleSelect = (id: number) => {
    setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const handleSelectAll = () => {
    if (filteredData.length === selected.length) {
      setSelected([]);
    } else {
      setSelected(filteredData.map((o: any) => o.id));
    }
  };

  const handleBulkDelete = () => {
    if (window.confirm('Delete all selected observers?')) {
      selected.forEach(id => deleteMutation.mutate(id));
      setSelected([]);
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

  const filteredData = data && data.length > 0
    ? data.filter((observer: any) => {
        const q = search.toLowerCase();
        return (
          observer.CRMContact?.name?.toLowerCase().includes(q) ||
          observer.parish?.toLowerCase().includes(q) ||
          observer.role?.toLowerCase().includes(q) ||
          observer.status?.toLowerCase().includes(q)
        );
      })
    : [];

  if (isLoading) return <div>Loading observers...</div>;
  if (error) return <div className="text-red-500">Error loading observers.</div>;

  return (
    <div className="bg-white rounded shadow p-4 mt-8">
      <h2 className="text-xl font-semibold mb-4">Observers</h2>
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
        onClick={findAiLinks}
        disabled={aiLoading}
      >
        {aiLoading ? 'Finding AI Profile Links...' : 'Find AI Profile Links'}
      </button>
      {aiSuggestions.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded mb-4">
          <h3 className="font-bold mb-2">AI-Suggested Profile Links</h3>
          <ul>
            {aiSuggestions.map((s: any, i: number) => (
              <li key={i} className="mb-2 flex items-center gap-2">
                Observer #{s.observerId} → User #{s.suggestedUserId} (Score: {s.score.toFixed(2)})
                <button
                  className="bg-primary text-white px-2 py-1 rounded text-xs"
                  onClick={() => linkMutation.mutate({ observerId: s.observerId, userId: s.suggestedUserId })}
                  disabled={linkMutation.isLoading}
                >
                  {linkMutation.isLoading ? 'Linking...' : 'Link'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
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
      <input
        className="border p-2 rounded mb-4 w-full"
        placeholder="Search observers by name, parish, role, or status..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
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
            <th className="text-left p-2">Parish</th>
            <th className="text-left p-2">Role</th>
            <th className="text-left p-2">Status</th>
            <th className="text-left p-2">Profile Link</th>
            <th className="text-left p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredData && filteredData.length > 0 ? (
            filteredData.map((observer: any) => (
              <tr key={observer.id} className="border-t">
                <td className="p-2"><input type="checkbox" checked={selected.includes(observer.id)} onChange={() => handleSelect(observer.id)} /></td>
                <td className="p-2">{observer.CRMContact?.name}</td>
                {isAdmin ? (
                  <>
                    <td className="p-2">{observer.CRMContact?.email}</td>
                    <td className="p-2">{observer.CRMContact?.phone}</td>
                    <td className="p-2">{observer.CRMContact?.address}</td>
                  </>
                ) : (
                  <>
                    <td className="p-2 text-gray-400 italic">Restricted</td>
                    <td className="p-2 text-gray-400 italic">Restricted</td>
                    <td className="p-2 text-gray-400 italic">Restricted</td>
                  </>
                )}
                <td className="p-2">{observer.parish}</td>
                <td className="p-2">{observer.role}</td>
                <td className="p-2">{observer.status}</td>
                <td className="p-2">
                  {observer.userId ? (
                    <span className="inline-flex items-center text-green-700 bg-green-100 px-2 py-1 rounded text-xs">
                      <LinkIcon className="w-4 h-4 mr-1" /> Linked (User ID: {observer.userId})
                    </span>
                  ) : (
                    <span className="inline-flex items-center text-gray-500 bg-gray-100 px-2 py-1 rounded text-xs">
                      <UserX className="w-4 h-4 mr-1" /> Not linked
                    </span>
                  )}
                </td>
                <td className="p-2 flex gap-2">
                  <button className="text-blue-600 hover:underline" onClick={() => handleEdit(observer)}>Edit</button>
                  <button className="text-red-600 hover:underline flex items-center gap-1" onClick={() => handleDelete(observer.id)} disabled={deleteMutation.isLoading && deletingId === observer.id}>
                    {deleteMutation.isLoading && deletingId === observer.id ? <Spinner className="w-4 h-4" /> : 'Delete'}
                  </button>
                  <button className="text-purple-600 hover:underline" onClick={() => handleLinkProfile(observer)}>
                    Link to Profile
                  </button>
                </td>
              </tr>
            ))
          ) : (
            <tr><td colSpan={10} className="p-2 text-gray-500">No observers found.</td></tr>
          )}
        </tbody>
      </table>
      {modalOpen && editObserver && (
        <CRMObserverEditModal
          observer={editObserver}
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          loading={updateMutation.isLoading}
        />
      )}
      {linkModalOpen && linkObserver && (
        <Modal isOpen={linkModalOpen} onClose={() => setLinkModalOpen(false)} title="Link Observer to User Profile">
          <div className="mb-4">
            <input
              className="border p-2 rounded w-full"
              placeholder="Search users by name or email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
              autoFocus
            />
          </div>
          {userLoading ? (
            <div>Loading users...</div>
          ) : (
            <ul className="mb-4 max-h-40 overflow-y-auto">
              {userResults.length > 0 ? (
                userResults.map((user: any) => (
                  <li key={user.id} className="flex justify-between items-center py-1 border-b">
                    <span>{user.firstName} {user.lastName} ({user.email})</span>
                    <button
                      className="bg-primary text-white px-2 py-1 rounded text-xs ml-2 flex items-center gap-1"
                      onClick={() => handleSelectUser(user)}
                      disabled={linkMutation.isLoading && linkingId === linkObserver?.id}
                    >
                      {linkMutation.isLoading && linkingId === linkObserver?.id ? <Spinner className="w-4 h-4" /> : 'Link'}
                    </button>
                  </li>
                ))
              ) : (
                userSearch.length > 1 && <li className="text-gray-400 text-sm">No users found.</li>
              )}
            </ul>
          )}
          <div className="flex justify-end mt-4">
            <button className="px-4 py-2 rounded bg-gray-200" onClick={() => setLinkModalOpen(false)}>Close</button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default CRMObserverList; 