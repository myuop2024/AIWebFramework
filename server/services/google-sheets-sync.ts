import { google, Auth, sheets_v4 } from 'googleapis';
import { storage } from '../storage'; // Assuming IStorage is exported from here
import { SystemSetting, InsertUser, InsertUserProfile } from '@shared/schema'; // Added InsertUser, InsertUserProfile
import logger from '../utils/logger';

// Define keys for system settings
const GOOGLE_CLIENT_ID_KEY = 'google_sheets_client_id';
const GOOGLE_CLIENT_SECRET_KEY = 'google_sheets_client_secret';
const GOOGLE_REFRESH_TOKEN_KEY = 'google_sheets_refresh_token';

// New keys for sync configuration
const GOOGLE_SHEETS_SHEET_ID_KEY = "google_sheets_sheet_id";
const GOOGLE_SHEETS_TAB_NAME_KEY = "google_sheets_sheet_tab_name";
const GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY = "google_sheets_header_row_index"; // e.g., 1 for the first row
const GOOGLE_SHEETS_COLUMN_MAPPING_KEY = "google_sheets_column_mapping"; // JSON string
const GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY = "google_sheets_unique_id_column"; // Header name of the column in the sheet
const GOOGLE_SHEETS_LAST_SYNCED_ROW_KEY = "google_sheets_last_synced_row"; // For incremental syncs

// The Redirect URI should be configured in your Google Cloud Console project
// and match the one used in your routes.
// Example: 'http://localhost:3000/api/google-sync/oauth-callback' or your production URL
const REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/google-sync/oauth-callback'; // Fallback for local dev

class GoogleSheetsSyncService {
  private oauth2Client: Auth.OAuth2Client | null = null;

  constructor() {
    // Initialize OAuth2Client in an async method or ensure settings are loaded before use
    this.initializeClient();
  }

  private async initializeClient() {
    try {
      const clientId = await this.getSetting(GOOGLE_CLIENT_ID_KEY);
      const clientSecret = await this.getSetting(GOOGLE_CLIENT_SECRET_KEY);

      if (clientId && clientSecret) {
        this.oauth2Client = new google.auth.OAuth2(
          clientId,
          clientSecret,
          REDIRECT_URI
        );
        logger.info('Google OAuth2Client initialized with Client ID and Secret.');

        // Set refresh token if available, for background tasks or server restart
        const refreshToken = await this.getSetting(GOOGLE_REFRESH_TOKEN_KEY);
        if (refreshToken && this.oauth2Client) {
            this.oauth2Client.setCredentials({ refresh_token: refreshToken });
            logger.info('Google OAuth2Client refresh token set.');
        }

      } else {
        logger.warn('Google Client ID or Client Secret not found in system settings. OAuth2Client not fully initialized.');
      }
    } catch (error) {
      logger.error('Error initializing Google OAuth2Client:', error);
    }
  }

  private async getSetting(key: string): Promise<string | undefined> {
    const setting = await storage.getSystemSetting(key);
    if (setting && setting.settingValue && typeof setting.settingValue === 'string') {
      return setting.settingValue;
    }
    // Check if settingValue is an object with a 'value' property (common for JSONB)
    if (setting && setting.settingValue && typeof setting.settingValue === 'object' && 'value' in setting.settingValue) {
        return (setting.settingValue as any).value as string;
    }
    logger.warn(`System setting for ${key} not found or invalid format.`);
    return undefined;
  }

  public async generateAuthUrl(): Promise<string> {
    if (!this.oauth2Client) {
      await this.initializeClient(); // Attempt re-initialization
      if(!this.oauth2Client) throw new Error('OAuth2Client not initialized. Check Google credentials in settings.');
    }

    const authUrl = this.oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request a refresh token
      scope: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
      prompt: 'consent', // Ensure refresh token is granted on re-auth if needed
    });
    logger.info('Generated Google Auth URL.');
    return authUrl;
  }

  public async handleOAuthCallback(code: string): Promise<void> {
    if (!this.oauth2Client) {
      await this.initializeClient();
      if(!this.oauth2Client) throw new Error('OAuth2Client not initialized. Check Google credentials in settings.');
    }

    try {
      const { tokens } = await this.oauth2Client.getToken(code);
      logger.info('Received tokens from Google.');

      if (tokens.refresh_token) {
        logger.info('Received new refresh token. Saving to system settings.');
        // Store the refresh token securely. System settings might need to be encrypted.
        // For simplicity, storing as plain JSON value here.
        await storage.updateSystemSetting(GOOGLE_REFRESH_TOKEN_KEY, { value: tokens.refresh_token } as any, 'system');

      } else {
        logger.info('No new refresh token received. Existing one will be used if present.');
      }

      // Set credentials for the current session/client instance
      this.oauth2Client.setCredentials(tokens);
      logger.info('Google OAuth tokens set on client.');

    } catch (error) {
      logger.error('Error handling OAuth callback:', error);
      throw new Error(`Failed to exchange authorization code for tokens: ${error.message}`);
    }
  }

  public async getAuthenticatedClient(): Promise<{ sheetsApi: sheets_v4.Sheets, authClient: Auth.OAuth2Client }> {
    if (!this.oauth2Client) {
      await this.initializeClient();
    }

    const refreshToken = await this.getSetting(GOOGLE_REFRESH_TOKEN_KEY);
    if (!this.oauth2Client || !refreshToken) {
        // Attempt to re-initialize if still not ready or refresh token is missing
        await this.initializeClient();
        const updatedRefreshToken = await this.getSetting(GOOGLE_REFRESH_TOKEN_KEY); // Re-fetch after init

        if (!this.oauth2Client) {
            throw new Error('OAuth2Client is not initialized. Check Google Client ID/Secret in settings.');
        }
        if (!updatedRefreshToken) {
            logger.error('Google Sheets refresh token is missing. Please re-authorize.');
            throw new Error('Google Sheets refresh token is missing. Please (re)authorize the application via the admin settings or /api/google-sync/auth-url.');
        }
        // If client was initialized but refresh token was fetched now
        this.oauth2Client.setCredentials({ refresh_token: updatedRefreshToken });
    }


    // The googleapis library automatically handles refreshing the access token using the refresh token.
    // However, you might want to explicitly refresh and save the new access token if you were storing it,
    // but typically you don't need to store the access token itself long-term if you have a refresh token.

    // Example of explicitly refreshing (optional, library does this on demand)
    // if (this.oauth2Client.isTokenExpiring()) {
    //   try {
    //     const { credentials } = await this.oauth2Client.refreshAccessToken();
    //     this.oauth2Client.setCredentials(credentials);
    //     logger.info('Access token refreshed.');
    //     // If you were storing access tokens (e.g., for short-lived distributed use, not typical for server-side):
    //     // await storage.updateSystemSetting('google_sheets_access_token', { value: credentials.access_token }, 'system');
    //     // if (credentials.expiry_date) {
    //     //   await storage.updateSystemSetting('google_sheets_access_token_expiry', { value: credentials.expiry_date }, 'system');
    //     // }
    //   } catch (error) {
    //     logger.error('Failed to refresh access token:', error);
    //     throw new Error('Failed to refresh access token. Please re-authorize.');
    //   }
    // }

    const sheetsApi = google.sheets({ version: 'v4', auth: this.oauth2Client });
    logger.info('Authenticated Google Sheets API client created.');
    return { sheetsApi, authClient: this.oauth2Client };
  }

  // Example method to test the API (optional)
  public async listSpreadsheetIds(spreadsheetId: string): Promise<string[]> {
    const { sheetsApi } = await this.getAuthenticatedClient();
    const response = await sheetsApi.spreadsheets.get({
        spreadsheetId: spreadsheetId,
        fields: 'sheets.properties.title', // Requesting only sheet titles
    });
    const sheetTitles = response.data.sheets?.map(sheet => sheet.properties?.title || 'Untitled Sheet') || [];
    logger.info(`Fetched sheet titles for spreadsheet ${spreadsheetId}: ${sheetTitles.join(', ')}`);
    return sheetTitles;
  }

  // --- Sync Logic ---

  private async getSyncConfig() {
    const sheetId = await this.getSetting(GOOGLE_SHEETS_SHEET_ID_KEY);
    const tabName = await this.getSetting(GOOGLE_SHEETS_TAB_NAME_KEY);
    const headerRowIndexStr = await this.getSetting(GOOGLE_SHEETS_HEADER_ROW_INDEX_KEY);
    const columnMappingStr = await this.getSetting(GOOGLE_SHEETS_COLUMN_MAPPING_KEY);
    const uniqueIdColumn = await this.getSetting(GOOGLE_SHEETS_UNIQUE_ID_COLUMN_KEY);

    if (!sheetId || !tabName || !columnMappingStr || !uniqueIdColumn) {
      throw new Error('Missing critical Google Sheets sync configuration (Sheet ID, Tab Name, Column Mapping, or Unique ID Column).');
    }

    const headerRowIndex = headerRowIndexStr ? parseInt(headerRowIndexStr, 10) : 1;
    if (isNaN(headerRowIndex) || headerRowIndex < 1) {
        throw new Error('Invalid Header Row Index. Must be a number greater than 0.');
    }

    let columnMapping;
    try {
      columnMapping = JSON.parse(columnMappingStr);
    } catch (e) {
      throw new Error('Failed to parse Column Mapping JSON.');
    }

    return { sheetId, tabName, headerRowIndex, columnMapping, uniqueIdColumn };
  }

  private async fetchSheetData(sheetId: string, tabName: string, headerRowIndex: number): Promise<{ headers: string[], rows: any[][] }> {
    const { sheetsApi } = await this.getAuthenticatedClient();
    const range = `${tabName}!A${headerRowIndex}:Z`; // Fetch data from header row to column Z (adjust if more columns)

    logger.info(`Fetching data from sheet: ${sheetId}, range: ${range}`);
    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range,
    });

    const values = response.data.values;
    if (!values || values.length === 0) {
      logger.warn('No data found in the specified sheet or range.');
      return { headers: [], rows: [] };
    }

    const headers = values[0].map(header => String(header).trim());
    const rows = values.slice(1); // Data rows are after the header row

    logger.info(`Fetched ${rows.length} data rows with ${headers.length} headers.`);
    return { headers, rows };
  }

  private mapSheetRowToUserData(rowArray: any[], headers: string[], columnMapping: Record<string, string>, uniqueIdColumnHeader: string):
    { user: Partial<InsertUser>, profile: Partial<InsertUserProfile>, uniqueIdValue: string | null } {

    const mappedData: { user: Partial<InsertUser>, profile: Partial<InsertUserProfile> } = { user: {}, profile: {} };
    let uniqueIdValue: string | null = null;

    headers.forEach((header, index) => {
      const cellValue = rowArray[index] !== undefined && rowArray[index] !== null ? String(rowArray[index]).trim() : null;

      if (header === uniqueIdColumnHeader && cellValue) {
        uniqueIdValue = cellValue;
      }

      const targetField = columnMapping[header];
      if (targetField && cellValue !== null) {
        // Simple assumption: fields for 'users' table don't have a dot, profile fields do (e.g. 'profile.address')
        // This is a naive way; a more robust mapping would explicitly define target table or use prefixes.
        // For now, we'll assume some known user fields and anything else is profile.
        // Or, the mapping itself can specify table, e.g., "user.firstName", "profile.address"

        // For this implementation, we'll assume the mapping value directly corresponds to User or UserProfile fields.
        // The `UsersApiResponse` in `user-list-view.tsx` has a good structure for `CrmUser`.
        // We'll use a simplified approach here: check if the field is a known user field.
        const knownUserFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'role', 'username', 'observerId', 'password', 'verificationStatus', 'trainingStatus'];

        if (knownUserFields.includes(targetField)) {
          mappedData.user[targetField] = cellValue;
        } else {
          // Assume it's a profile field if not a known user field
          mappedData.profile[targetField] = cellValue;
        }
      }
    });

    return {
        user: mappedData.user,
        profile: mappedData.profile,
        uniqueIdValue
    };
  }

  public async runSyncCycle(): Promise<string> {
    logger.info('Starting Google Sheets sync cycle...');
    const config = await this.getSyncConfig();
    const { headers, rows } = await this.fetchSheetData(config.sheetId, config.tabName, config.headerRowIndex);

    if (rows.length === 0) {
      return 'No data rows to sync.';
    }

    let createdCount = 0;
    let updatedCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const { user: mappedUser, profile: mappedProfile, uniqueIdValue } = this.mapSheetRowToUserData(row, headers, config.columnMapping, config.uniqueIdColumn);

      if (!uniqueIdValue) {
        logger.warn(`Skipping row ${i + config.headerRowIndex + 1} due to missing unique ID value for column: ${config.uniqueIdColumn}.`);
        skippedCount++;
        continue;
      }

      // For password, if it's not in the sheet and it's a new user, createUser might handle it (e.g. null or default)
      // If 'password' field is mapped and provided, it will be used.
      // It's generally not recommended to sync passwords from sheets.

      try {
        // Assume uniqueIdValue is email for now for simplicity with existing storage methods
        // storage.getUserByUniqueIdField(config.uniqueIdColumnDatabaseField, uniqueIdValue) would be more generic
        const existingUser = await storage.getUserByEmail(uniqueIdValue);

        if (existingUser) {
          // Update existing user
          if (Object.keys(mappedUser).length > 0) {
            await storage.updateUser(existingUser.id, mappedUser as InsertUser);
          }
          if (Object.keys(mappedProfile).length > 0) {
            await storage.updateUserProfileByUserId(existingUser.id, mappedProfile as InsertUserProfile);
          }
          updatedCount++;
          logger.info(`Updated user with ${config.uniqueIdColumn}: ${uniqueIdValue}`);
        } else {
          // Create new user
          // Ensure essential fields for user creation are present or handled by createUser
          const userToCreate = { ...mappedUser };
          if (!userToCreate.email && uniqueIdValue.includes('@')) userToCreate.email = uniqueIdValue;
          if (!userToCreate.username) userToCreate.username = uniqueIdValue;
          // Add other required fields if not present, e.g. password
          if (!userToCreate.password) {
            // Handle missing password - e.g., generate temporary, or rely on createUser default
            // For now, we assume createUser can handle it or it's an optional field for initial creation via sync
            logger.warn(`Password not provided for new user: ${uniqueIdValue}. Relaying on createUser default or manual setup.`);
          }


          const newUser = await storage.createUser(userToCreate as InsertUser);
          if (newUser && Object.keys(mappedProfile).length > 0) {
            await storage.createUserProfile({ ...mappedProfile, userId: newUser.id } as InsertUserProfile);
          }
          createdCount++;
          logger.info(`Created new user with ${config.uniqueIdColumn}: ${uniqueIdValue}`);
        }
      } catch (err) {
        failedCount++;
        logger.error(`Failed to sync user with ${config.uniqueIdColumn}: ${uniqueIdValue}. Row: ${i + config.headerRowIndex + 1}`, err);
      }
    }

    const summary = `Sync cycle completed. Created: ${createdCount}, Updated: ${updatedCount}, Failed: ${failedCount}, Skipped: ${skippedCount}.`;
    logger.info(summary);

    // TODO: Update GOOGLE_SHEETS_LAST_SYNCED_ROW_KEY if doing incremental syncs
    // await storage.updateSystemSetting(GOOGLE_SHEETS_LAST_SYNCED_ROW_KEY, { value: (config.headerRowIndex + rows.length).toString() }, 'system');

    return summary;
  }
}

export const googleSheetsSyncService = new GoogleSheetsSyncService();
