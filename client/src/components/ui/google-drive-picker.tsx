import { useState } from 'react';
import { Button } from './button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

// TODO: Replace with your actual Google API client ID
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY'; // Needed for Picker API
const GOOGLE_PICKER_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

interface GoogleDrivePickerProps {
  onPick: (csvContent: string, fileName?: string) => void;
  disabled?: boolean;
  clientId: string;
  apiKey: string;
}

export function GoogleDrivePicker({ onPick, disabled, clientId, apiKey }: GoogleDrivePickerProps) {
  const [loading, setLoading] = useState(false);
  const [pickedFile, setPickedFile] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Load Google APIs if not already loaded
  const loadPicker = async () => {
    setError(null);
    setLoading(true);
    try {
      // @ts-ignore
      if (!window.gapi) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://apis.google.com/js/api.js';
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      }
      // @ts-ignore
      await new Promise((resolve) => window.gapi.load('client:auth2', resolve));
      // @ts-ignore
      await window.gapi.client.init({
        apiKey: apiKey,
        clientId: clientId,
        scope: GOOGLE_PICKER_SCOPE,
        discoveryDocs: [
          'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest',
        ],
      });
      // @ts-ignore
      const authInstance = window.gapi.auth2.getAuthInstance();
      // @ts-ignore
      const user = await authInstance.signIn();
      const token = user.getAuthResponse().access_token;
      // Load Picker
      await new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = 'https://apis.google.com/js/api.js';
        script.onload = resolve;
        script.onerror = reject;
        document.body.appendChild(script);
      });
      // @ts-ignore
      window.gapi.load('picker', { callback: () => openPicker(token) });
    } catch (e) {
      setError('Failed to load Google Picker.');
      setLoading(false);
    }
  };

  // Open the Google Picker dialog
  const openPicker = (token: string) => {
    // @ts-ignore
    const picker = new window.google.picker.PickerBuilder()
      .addView(window.google.picker.ViewId.SPREADSHEETS)
      .setOAuthToken(token)
      .setDeveloperKey(apiKey)
      .setCallback(pickerCallback)
      .build();
    picker.setVisible(true);
  };

  // Handle the file picked
  const pickerCallback = async (data: any) => {
    if (data.action === 'picked' && data.docs && data.docs.length > 0) {
      setLoading(true);
      setError(null);
      try {
        const fileId = data.docs[0].id;
        const fileName = data.docs[0].name;
        // Fetch as CSV using Drive API
        const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=text/csv&alt=media`;
        // @ts-ignore
        const token = window.gapi.auth2.getAuthInstance().currentUser.get().getAuthResponse().access_token;
        const response = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Failed to fetch sheet as CSV');
        const csv = await response.text();
        setPickedFile(fileName);
        onPick(csv, fileName);
      } catch (e) {
        setError('Failed to fetch sheet as CSV. Make sure you selected a Google Sheet.');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const reset = () => {
    setPickedFile(null);
    setError(null);
  };

  return (
    <div>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          onClick={loadPicker}
          disabled={disabled || loading || !!pickedFile}
          aria-label="Pick a Google Sheet from Drive"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Pick from Google Drive'}
        </Button>
        {pickedFile && (
          <>
            <span className="flex items-center text-green-700 text-sm" aria-live="polite">
              <CheckCircle2 className="h-4 w-4 mr-1" /> {pickedFile}
            </span>
            <Button type="button" variant="outline" size="sm" onClick={reset} aria-label="Pick another file">
              Pick another
            </Button>
          </>
        )}
      </div>
      {error && (
        <div className="flex items-center text-xs text-red-600 mt-1" role="alert">
          <AlertCircle className="h-3 w-3 mr-1" /> {error}
        </div>
      )}
      <div className="text-xs text-muted-foreground mt-1">
        <strong>How to use:</strong><br />
        1. Sign in and pick a Google Sheet.<br />
        2. Only the first sheet/tab will be imported as CSV.<br />
        3. <b>Tip:</b> If you see errors, make sure the file is a Google Sheet and you have access.<br />
        4. After picking, you can process the data with AI below.
      </div>
      {/*
        Instructions:
        1. Replace GOOGLE_CLIENT_ID and GOOGLE_API_KEY with your credentials from Google Cloud Console.
        2. Enable the Google Picker API and Drive API for your project.
        3. The user must have access to the sheet and be signed in.
      */}
    </div>
  );
} 