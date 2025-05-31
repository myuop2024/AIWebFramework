import { Router } from 'express';
import { googleSheetsSyncService } from '../services/google-sheets-sync';
import { ensureAuthenticated, hasPermission } from '../middleware/auth'; // Assuming admin permission check
import logger from '../utils/logger';

const router = Router();

// Route to generate Google Auth URL
// This should be accessible only by an admin
router.get(
  '/auth-url',
  ensureAuthenticated,
  hasPermission('admin_manage_system_settings'), // Or a more specific permission
  async (req, res) => {
    try {
      const authUrl = await googleSheetsSyncService.generateAuthUrl();
      // Send the URL to the client, which will then redirect the user (admin)
      res.json({ authUrl });
    } catch (error) {
      logger.error('Failed to generate Google Auth URL:', error);
      res.status(500).json({ error: 'Failed to generate Google Auth URL', details: error.message });
    }
  }
);

// Route to handle OAuth callback from Google
router.get('/oauth-callback', async (req, res) => {
  const code = req.query.code as string;

  if (!code) {
    logger.error('Google OAuth callback called without a code.');
    return res.status(400).send('Authorization code is missing.');
  }

  try {
    await googleSheetsSyncService.handleOAuthCallback(code);
    // Successfully authenticated and tokens (especially refresh token) should be stored.
    // Redirect user to a relevant page in the admin panel, e.g., settings or a success message page.
    logger.info('Google OAuth callback handled successfully.');
    // TODO: Create a dedicated success/status page in the admin UI
    res.send(`
      <html>
        <body>
          <h1>Google Authentication Successful!</h1>
          <p>The application has been authorized. You can now close this window or be redirected shortly.</p>
          <script>
            // Optional: Redirect back to admin settings page
            // setTimeout(() => { window.location.href = '/admin/settings?tab=integrations'; }, 3000);
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    logger.error('Error during Google OAuth callback:', error);
    // TODO: Create a dedicated error page in the admin UI
    res.status(500).send(`
      <html>
        <body>
          <h1>Google Authentication Failed</h1>
          <p>There was an error authorizing the application: ${error.message}</p>
          <p>Please try again or contact support.</p>
        </body>
      </html>
    `);
  }
});

// Example of a protected route that uses the Sheets API (for testing)
router.get(
  '/test-sheets',
  ensureAuthenticated,
  hasPermission('admin_manage_system_settings'), // Or appropriate permission
  async (req, res) => {
    const spreadsheetId = req.query.spreadsheetId as string;
    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Please provide a spreadsheetId query parameter.' });
    }
    try {
      logger.info(`Testing Google Sheets API with spreadsheet ID: ${spreadsheetId}`);
      const sheetTitles = await googleSheetsSyncService.listSpreadsheetIds(spreadsheetId);
      res.json({ message: 'Successfully fetched sheet titles.', sheetTitles });
    } catch (error) {
      logger.error('Failed to test Google Sheets API:', error);
      res.status(500).json({ error: 'Failed to access Google Sheets API', details: error.message });
    }
  }
);

// Route to manually trigger the sync cycle
router.post(
  '/trigger-sync',
  ensureAuthenticated,
  hasPermission('crm_manage_google_sync_settings'), // A new, specific permission
  async (req, res) => {
    try {
      logger.info('Manual Google Sheets sync trigger received.');
      const summary = await googleSheetsSyncService.runSyncCycle();
      res.json({ message: 'Google Sheets sync cycle executed.', summary });
    } catch (error) {
      logger.error('Failed to run manual Google Sheets sync cycle:', error);
      res.status(500).json({ error: 'Failed to run sync cycle', details: error.message });
    }
  }
);

export default router;
