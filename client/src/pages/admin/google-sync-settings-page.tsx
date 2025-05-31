import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import MainLayout from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, ExternalLink, PlayCircle, AlertCircle } from 'lucide-react';
import { SystemSetting } from '@shared/schema';

// Define keys for system settings consistently with the backend service
const GOOGLE_SHEETS_CLIENT_ID_KEY = 'google_sheets_client_id';
const GOOGLE_SHEETS_CLIENT_SECRET_KEY = 'google_sheets_client_secret';
const GOOGLE_SHEETS_REFRESH_TOKEN_KEY = 'google_sheets_refresh_token';

const GOOGLE_SHEETS_SHEET_ID_KEY = "google_sheets_sheet_id";
const GOOGLE_SHEETS_TAB_NAME_KEY = "google_sheets_sheet_tab_name";
const GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY = "google_sheets_header_row_index";
const GOOGLE_SHEETS_COLUMN_MAPPING_KEY = "google_sheets_column_mapping";
const GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY = "google_sheets_unique_id_column";

interface SyncSettingsFormData {
  [GOOGLE_SHEETS_SHEET_ID_KEY]: string;
  [GOOGLE_SHEETS_TAB_NAME_KEY]: string;
  [GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY]: number;
  [GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY]: string;
  [GOOGLE_SHEETS_COLUMN_MAPPING_KEY]: string; // JSON string
}

const GoogleSyncSettingsPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResultMessage, setSyncResultMessage] = useState<string | null>(null);

  const settingKeysToFetch: (keyof SyncSettingsFormData | typeof GOOGLE_SHEETS_REFRESH_TOKEN_KEY)[] = [
    GOOGLE_SHEETS_SHEET_ID_KEY,
    GOOGLE_SHEETS_TAB_NAME_KEY,
    GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY,
    GOOGLE_SHEETS_COLUMN_MAPPING_KEY,
    GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY,
    GOOGLE_SHEETS_REFRESH_TOKEN_KEY
  ];

  const { data: settingsData, isLoading: isLoadingSettings, refetch: refetchSettings } = useQuery<SystemSetting[], Error>(
    ['googleSyncSettingsAll'],
    async () => {
      const responses = await Promise.all(
        settingKeysToFetch.map(key =>
          apiRequest('GET', `/api/system-settings/${key}`)
            .then(res => res.json().catch(() => null)) // Gracefully handle non-existent settings
            .catch(() => null) // Catch fetch errors for individual settings
        )
      );
      return responses.filter(setting => setting !== null) as SystemSetting[];
    },
    {
      onSuccess: (data) => {
        const transformedData: Partial<SyncSettingsFormData> = {};
        data.forEach(setting => {
          const key = setting.settingKey as keyof SyncSettingsFormData;
          if (settingKeysToFetch.includes(key)) {
            const value = (setting.settingValue && typeof setting.settingValue === 'object' && 'value' in setting.settingValue)
                          ? (setting.settingValue as any).value
                          : setting.settingValue;

            if (key === GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY) {
              transformedData[key] = Number(value) || 1;
            } else if (key === GOOGLE_SHEETS_COLUMN_MAPPING_KEY) {
              transformedData[key] = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            } else if (value !== null && value !== undefined) {
               transformedData[key] = String(value);
            }
          }
        });
        reset(transformedData as SyncSettingsFormData);
      }
    }
  );

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<SyncSettingsFormData>();

  const getSettingObject = (key: string): SystemSetting | undefined => {
    return settingsData?.find(s => s.settingKey === key);
  };

  const isAuthorized = !!getSettingObject(GOOGLE_SHEETS_REFRESH_TOKEN_KEY)?.settingValue;

  const updateSettingsMutation = useMutation(
    async (formData: SyncSettingsFormData) => {
      const promises = Object.entries(formData).map(([key, value]) => {
        let valueToSave: any = value;
        if (key === GOOGLE_SHEETS_COLUMN_MAPPING_KEY) {
          try {
            valueToSave = JSON.parse(value as string); // Store as JSON object if it's the mapping
          } catch (e) {
            toast({ variant: 'destructive', title: 'Error', description: 'Column Mapping is not valid JSON.' });
            throw new Error('Column Mapping is not valid JSON.');
          }
        }
        // The backend expects settingValue to be a JSONB, so simple strings might need to be {value: "string"}
        // For now, sending direct value for strings/numbers, and object for JSON.
        // This might need adjustment based on how /api/system-settings/:key PUT expects the body.
        // Assuming it expects { value: ..., settingKey: ..., description: ... } or just the value.
        // Let's assume a body like { value: ... } is sufficient for PUT /api/system-settings/:key
        return apiRequest('PUT', `/api/system-settings/${key}`, { value: valueToSave });
      });
      await Promise.all(promises);
    },
    {
      onSuccess: () => {
        toast({ title: 'Success', description: 'Google Sync settings updated successfully.' });
        queryClient.invalidateQueries(['googleSyncSettingsAll']);
      },
      onError: (error: Error) => {
        toast({ variant: 'destructive', title: 'Error updating settings', description: error.message });
      },
    }
  );

  const onSubmitSyncSettings = (data: SyncSettingsFormData) => {
    updateSettingsMutation.mutate(data);
  };

  return (
    <MainLayout title="Google Sheets Sync Settings">
      <div className="container mx-auto py-6 space-y-6">
        <h1 className="text-3xl font-bold">Google Sheets Synchronization</h1>

        <Card>
          <CardHeader>
            <CardTitle>OAuth Authorization</CardTitle>
            <CardDescription>
              Authorize the application to access your Google Sheets. You will be redirected to Google.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isAuthorized ? (
              <div className="flex items-center space-x-2 text-green-600">
                <AlertCircle className="h-5 w-5" />
                <p>Application is authorized. To re-authorize or change account, click below.</p>
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-yellow-600">
                <AlertCircle className="h-5 w-5" />
                <p>Application is not authorized. Please authorize to enable sync.</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={async () => {
                setIsAuthorizing(true);
                try {
                  const response = await apiRequest('GET', '/api/google-sync/auth-url');
                  const data = await response.json();
                  if (data.authUrl) {
                    window.location.href = data.authUrl;
                  } else {
                    toast({ variant: 'destructive', title: 'Error', description: 'Could not retrieve authorization URL.' });
                  }
                } catch (error) {
                  toast({ variant: 'destructive', title: 'Error', description: `Failed to start authorization: ${error.message}` });
                } finally {
                  setIsAuthorizing(false);
                }
              }}
              disabled={isAuthorizing}
            >
              {isAuthorizing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ExternalLink className="mr-2 h-4 w-4" />}
              {isAuthorized ? 'Re-authorize / Change Account' : 'Authorize with Google'}
            </Button>
          </CardFooter>
        </Card>

        <form onSubmit={handleSubmit(onSubmitSyncSettings)}>
          <Card>
            <CardHeader>
              <CardTitle>Sync Configuration</CardTitle>
              <CardDescription>
                Configure the details of the Google Sheet to synchronize users from.
                The "Unique ID Column Header" specified here must exactly match a header in your sheet and will be used to identify users (e.g., 'Email' or 'Employee ID').
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor={GOOGLE_SHEETS_SHEET_ID_KEY}>Google Sheet ID</Label>
                <Input id={GOOGLE_SHEETS_SHEET_ID_KEY} {...register(GOOGLE_SHEETS_SHEET_ID_KEY, { required: 'Sheet ID is required' })} />
                {errors[GOOGLE_SHEETS_SHEET_ID_KEY] && <p className="text-sm text-red-500 mt-1">{errors[GOOGLE_SHEETS_SHEET_ID_KEY]?.message}</p>}
              </div>
              <div>
                <Label htmlFor={GOOGLE_SHEETS_TAB_NAME_KEY}>Sheet Tab Name</Label>
                <Input id={GOOGLE_SHEETS_TAB_NAME_KEY} {...register(GOOGLE_SHEETS_TAB_NAME_KEY, { required: 'Tab Name is required' })} />
                {errors[GOOGLE_SHEETS_TAB_NAME_KEY] && <p className="text-sm text-red-500 mt-1">{errors[GOOGLE_SHEETS_TAB_NAME_KEY]?.message}</p>}
              </div>
              <div>
                <Label htmlFor={GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY}>Header Row Index (e.g., 1 for the first row)</Label>
                <Input id={GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY} type="number" {...register(GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY, { required: 'Header row index is required', valueAsNumber: true, min: { value: 1, message: 'Must be at least 1' } })} />
                {errors[GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY] && <p className="text-sm text-red-500 mt-1">{errors[GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY]?.message}</p>}
              </div>
              <div>
                <Label htmlFor={GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY}>Unique ID Column Header in Sheet</Label>
                <Input id={GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY} {...register(GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY, { required: 'Unique ID column header is required' })} />
                {errors[GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY] && <p className="text-sm text-red-500 mt-1">{errors[GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY]?.message}</p>}
              </div>
              <div>
                <Label htmlFor={GOOGLE_SHEETS_COLUMN_MAPPING_KEY}>Column Mapping (JSON)</Label>
                <Textarea
                  id={GOOGLE_SHEETS_COLUMN_MAPPING_KEY}
                  {...register(GOOGLE_SHEETS_COLUMN_MAPPING_KEY, {
                    required: 'Column mapping is required',
                    validate: (value) => {
                      try {
                        JSON.parse(value);
                        return true;
                      } catch (e) {
                        return 'Must be valid JSON';
                      }
                    },
                  })}
                  rows={10}
                  placeholder={`{\n  "Sheet Header For Email": "email",\n  "Sheet Header For First Name": "firstName",\n  "Sheet Header For Role": "role",\n  "Address Line 1": "address"\n}`}
                />
                {errors[GOOGLE_SHEETS_COLUMN_MAPPING_KEY] && <p className="text-sm text-red-500 mt-1">{errors[GOOGLE_SHEETS_COLUMN_MAPPING_KEY]?.message}</p>}
                <p className="text-xs text-muted-foreground mt-1">
                  Define how sheet column headers map to application user fields.
                  Known direct user fields: `firstName`, `lastName`, `email`, `phoneNumber`, `role`, `username`, `observerId`, `password`, `verificationStatus`, `trainingStatus`.
                  Other fields will be assumed to belong to the user's profile (e.g., `address`, `city`, `trn`).
                </p>
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={updateSettingsMutation.isLoading || isLoadingSettings}>
                {updateSettingsMutation.isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Sync Configuration
              </Button>
            </CardFooter>
          </Card>
        </form>

        <Card>
          <CardHeader>
            <CardTitle>Manual Synchronization</CardTitle>
            <CardDescription>
              Trigger the synchronization process with Google Sheets manually. Ensure OAuth is authorized and settings are saved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={async () => {
                setIsSyncing(true);
                setSyncResultMessage(null);
                try {
                  const response = await apiRequest('POST', '/api/google-sync/trigger-sync');
                  const data = await response.json();
                  if (response.ok) {
                    setSyncResultMessage(data.summary || 'Sync triggered successfully. Check server logs for details.');
                    toast({ title: 'Sync Triggered', description: data.summary || 'Process initiated.' });
                  } else {
                    throw new Error(data.details || data.error || 'Failed to trigger sync.');
                  }
                } catch (error) {
                  const errorMessage = error instanceof Error ? error.message : String(error);
                  setSyncResultMessage(`Error: ${errorMessage}`);
                  toast({ variant: 'destructive', title: 'Sync Error', description: errorMessage });
                } finally {
                  setIsSyncing(false);
                }
              }}
              disabled={isSyncing || !isAuthorized}
            >
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlayCircle className="mr-2 h-4 w-4" />}
              Trigger Sync Now
            </Button>
            {!isAuthorized && <p className="text-sm text-yellow-600 mt-2">Please authorize with Google first to enable sync.</p>}
          </CardContent>
          {syncResultMessage && (
            <CardFooter>
              <div className={`mt-4 text-sm ${syncResultMessage.startsWith("Error:") ? "text-red-500" : "text-green-600"}`}>
                <p className="font-semibold">Sync Result:</p>
                <pre className="whitespace-pre-wrap">{syncResultMessage}</pre>
              </div>
            </CardFooter>
          )}
        </Card>

      </div>
    </MainLayout>
  );
};

export default GoogleSyncSettingsPage;
