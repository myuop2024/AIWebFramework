import React, { useState } from 'react';
import CRMContactForm from '@/components/admin/crm-contact-form';
import CRMContactList from '@/components/admin/crm-contact-list';
import CRMObserverForm from '@/components/admin/crm-observer-form';
import CRMObserverList from '@/components/admin/crm-observer-list';

const AdminCRMPage = () => {
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sheetId, setSheetId] = useState('');
  const [sheetRange, setSheetRange] = useState('Sheet1');
  const [importedRows, setImportedRows] = useState<any[]>([]);
  const [importLoading, setImportLoading] = useState(false);

  const findProfileLinks = async () => {
    setLoading(true);
    // Fetch contacts and users (adjust endpoint as needed)
    const contacts = await fetch('/crm/contacts').then(res => res.json());
    const usersRes = await fetch('/api/users?limit=1000');
    const usersData = await usersRes.json();
    const users = usersData.users || usersData; // Support both paginated and flat
    const res = await fetch('/crm/contacts/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contacts, users })
    });
    const data = await res.json();
    setSuggestions(data.suggestions || []);
    setLoading(false);
  };

  const importGoogleSheet = async (e: React.FormEvent) => {
    e.preventDefault();
    setImportLoading(true);
    setImportedRows([]);
    const res = await fetch('/crm/import-google-sheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sheetId, range: sheetRange }),
    });
    const data = await res.json();
    setImportedRows(data.rows || []);
    setImportLoading(false);
  };

  const exportCSV = (type: 'contacts' | 'observers') => {
    window.open(`/crm/${type}/export/csv`, '_blank');
  };

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold mb-4">CRM System</h1>
      <p className="mb-4">Manage contacts, observers, and interactions. (Feature-rich UI coming soon!)</p>
      <div className="flex gap-4 mb-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => exportCSV('contacts')}
        >
          Export Contacts (CSV)
        </button>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => exportCSV('observers')}
        >
          Export Observers (CSV)
        </button>
      </div>
      <CRMContactForm />
      <CRMContactList />
      <CRMObserverForm />
      <CRMObserverList />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4 mt-8"
        onClick={findProfileLinks}
        disabled={loading}
      >
        {loading ? 'Finding Profile Links...' : 'Find AI Profile Links'}
      </button>
      {suggestions.length > 0 && (
        <div className="bg-yellow-50 p-4 rounded mb-4">
          <h3 className="font-bold mb-2">AI-Suggested Profile Links</h3>
          <ul>
            {suggestions.map((s: any, i: number) => (
              <li key={i}>
                Contact #{s.contactId} → User #{s.suggestedUserId} (Score: {s.score.toFixed(2)})
              </li>
            ))}
          </ul>
        </div>
      )}
      <form onSubmit={importGoogleSheet} className="mb-4 mt-8 flex gap-2 items-end">
        <div>
          <label className="block text-sm font-medium">Google Sheet ID</label>
          <input
            className="border p-2 rounded"
            value={sheetId}
            onChange={e => setSheetId(e.target.value)}
            placeholder="e.g. 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Range</label>
          <input
            className="border p-2 rounded"
            value={sheetRange}
            onChange={e => setSheetRange(e.target.value)}
            placeholder="Sheet1"
          />
        </div>
        <button
          type="submit"
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={importLoading}
        >
          {importLoading ? 'Importing...' : 'Import Google Sheet'}
        </button>
      </form>
      {importedRows.length > 0 && (
        <div className="bg-white rounded shadow p-4 mb-4">
          <h3 className="font-bold mb-2">Imported Data</h3>
          <table className="min-w-full text-sm">
            <tbody>
              {importedRows.map((row, i) => (
                <tr key={i}>
                  {row.map((cell: string, j: number) => (
                    <td key={j} className="p-2 border">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {/* TODO: Add CRM contact list, observer management, AI-powered linking, import/export, etc. */}
    </div>
  );
};

export default AdminCRMPage; 