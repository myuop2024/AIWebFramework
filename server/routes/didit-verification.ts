import { Router, Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { storage } from '../storage';
import { diditConnector } from '../services/didit-connector';
import { ensureAuthenticated, ensureAdmin } from '../middleware/auth';
import logger from '../utils/logger'; // Added logger

const router = Router();

// Route to get the current verification status
router.get('/status', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    // Get user to check if we have email - email might not be needed for checkVerificationStatus with state
    const user = await storage.getUser(userId);
    if (!user) { // user.email check removed as it's not directly used by the refactored checkVerificationStatus
      return res.status(400).json({ error: 'User not found' });
    }

    // Check verification status with Didit - this now takes a state.
    // This route's purpose might need re-evaluation in context of OAuth.
    // For now, let's assume it checks status based on a state stored in session, if any.
    // Or, it might be for checking overall verification status of the user, not a specific flow.
    // The original used user.email, the new connector.checkVerificationStatus expects a 'state'.
    // This needs clarification. For now, adapting to check general user profile status.
    const userProfile = await storage.getUserProfile(userId);
    const verificationStatus = userProfile?.verificationStatus || 'none';
    const verificationDetails = userProfile?.verificationDetails || {};

    // If you want to check a pending OAuth flow:
    // if (req.session.diditOAuthState) {
    //   const flowStatus = await diditConnector.checkVerificationStatus(req.session.diditOAuthState);
    //   return res.json({ userStatus: verificationStatus, flowStatus });
    // }
    
    return res.json({ status: verificationStatus, details: verificationDetails });
  } catch (error) {
    logger.error('Error checking verification status:', { error: error instanceof Error ? error.message : String(error), userId: req.session.userId });
    return res.status(500).json({ error: 'Failed to check verification status' });
  }
});

// Route to start the verification process (OAuth flow)
router.get('/initiate', ensureAuthenticated, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize the Didit connector if needed - connector now initializes itself on first use or explicitly.
    // await diditConnector.initializeConfig(); // Not strictly necessary here due to connector's internal handling.

    const state = crypto.randomBytes(32).toString('hex');
    req.session.diditOAuthState = state;
    req.session.diditOAuthStateTimestamp = Date.now();
    req.session.diditOAuthUserId = userId; // Store userId to link back the OAuth result

    const callbackUrl = `${req.protocol}://${req.get('host')}/api/verification/result`;

    const authorizationUrl = await diditConnector.startVerification(state, callbackUrl);

    logger.info(`Redirecting user ${userId} to Didit for OAuth verification`, { url: authorizationUrl, state });
    // Return JSON with redirectUrl for frontend to handle window.open
    return res.json({ redirectUrl: authorizationUrl });
  } catch (error) {
    logger.error('Error initiating Didit OAuth verification', { userId: req.session.userId, error: error instanceof Error ? error.message : String(error) });
    // Send JSON error response
    res.status(500).json({ error: 'Failed to start Didit verification process.', details: error instanceof Error ? error.message : String(error) });
  }
});

// Webhook endpoint for Didit to send updates
// Review if Didit OAuth flow uses webhooks for primary verification status, or if /result callback is sufficient.
// This might be for account changes, de-activations, etc., rather than initial verification.
const diditWebhookPayloadSchema = z.object({
  event_type: z.string(),
  user_id: z.string().optional(), // This might be the 'sub' from ID token or from your stored state mapping
  verification_id: z.string().optional(), // Or transaction_id
  status: z.string().optional(),
  timestamp: z.string().datetime(),
  details: z.any().optional(),
});

router.post('/webhook', express.json(), async (req: Request, res: Response) => { // Added express.json() middleware
  try {
    logger.info('Received Didit webhook', { body: req.body });

    // TODO: Implement webhook signature verification if Didit provides one and it's necessary.
    // const signature = req.headers['didit-signature'];
    // if (!diditConnector.verifyWebhookSignature(req.rawBody, signature)) { ... }

    const parsedPayload = diditWebhookPayloadSchema.safeParse(req.body);
    if (!parsedPayload.success) {
      logger.error('Invalid Didit webhook payload', { errors: parsedPayload.error.errors, body: req.body });
      return res.status(400).json({ error: 'Invalid payload', details: parsedPayload.error.errors });
    }
    const payload = parsedPayload.data;

    // The primary verification update should happen in the /result route via OAuth callback.
    // Webhooks might be used for asynchronous updates or events not directly tied to user presence,
    // e.g., account deactivation by Didit, fraud alerts, etc.
    // The logic here should be carefully considered based on Didit's actual webhook events for OAuth.

    // Example: If a webhook signals a change that needs to be reflected on the user's profile
    // irrespective of the direct OAuth callback flow (e.g. an async review completed).
    if (payload.user_id && payload.event_type === 'VERIFICATION_REVIEW_COMPLETED') {
      const diditSubjectId = payload.user_id; // Assuming 'user_id' in webhook is 'sub'
      // You would need a way to find your internal user ID from this Didit subject ID.
      // This usually involves storing the 'sub' in the user's profile when they first verify.
      const user = await storage.findUserByDiditSubjectId(diditSubjectId); // Hypothetical function

      if (user) {
        const verificationStatus = payload.status === 'VERIFIED' ? 'verified' : 'failed';
        await storage.updateUser(user.id, { verificationStatus });
        await storage.updateUserProfile(user.id, {
          verificationStatus: verificationStatus,
          verificationId: payload.verification_id || user.userProfile?.verificationId, // Use new or existing
          verifiedAt: verificationStatus === 'verified' ? new Date(payload.timestamp) : user.userProfile?.verifiedAt,
          verificationProvider: 'didit-webhook', // Indicate source
          verificationDetails: payload.details || user.userProfile?.verificationDetails,
          verificationFailureReason: payload.status !== 'VERIFIED' ? (payload.details?.failure_reason || `Webhook status: ${payload.status}`) : null,
        });
        logger.info(`User ${user.id} status updated by Didit webhook VERIFICATION_REVIEW_COMPLETED`, { newStatus: verificationStatus });
      } else {
        logger.warn('User not found for Didit subject ID from webhook', { diditSubjectId });
      }
    } else {
      logger.info('Didit webhook received for event type not processed for immediate user status update or missing user_id.', { event_type: payload.event_type });
    }

    res.status(200).send('Webhook received.');

  } catch (error) {
    // ZodError is already handled by safeParse, this is for other errors
    logger.error('Error processing Didit webhook', { error: error instanceof Error ? error.message : String(error), body: req.body });
    res.status(500).send('Error processing webhook');
  }
});

// Route for Didit to redirect back to after verification attempt (OAuth Callback)
router.get('/result', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { code, state, error: diditError, error_description: diditErrorDescription } = req.query;
    
    const sessionState = req.session.diditOAuthState;
    const sessionStateTimestamp = req.session.diditOAuthStateTimestamp;
    const oauthInitiatingUserId = req.session.diditOAuthUserId;

    // Clear state from session immediately after retrieving
    delete req.session.diditOAuthState;
    delete req.session.diditOAuthStateTimestamp;
    // delete req.session.diditOAuthUserId; // Keep for logging/context if needed, or clear

    if (!sessionState || state !== sessionState) {
      logger.error('Invalid state parameter from Didit callback', { receivedState: state, expectedState: sessionState, userId: oauthInitiatingUserId });
      return res.status(403).render('error', { message: 'Invalid state parameter. Verification session may have expired or been tampered with.' });
    }

    const STATE_TTL_MS = 15 * 60 * 1000;
    if (!sessionStateTimestamp || (Date.now() - sessionStateTimestamp > STATE_TTL_MS)) {
      logger.error('State parameter expired', { state, timestamp: sessionStateTimestamp, userId: oauthInitiatingUserId });
      return res.status(403).render('error', { message: 'Verification session expired. Please try again.' });
    }
    
    if (!oauthInitiatingUserId || oauthInitiatingUserId !== req.session.userId) {
        logger.error('User mismatch in OAuth callback.', {
            initiatingUser: oauthInitiatingUserId,
            currentUser: req.session.userId
        });
        return res.status(403).render('error', { message: 'User session mismatch. Please ensure you are logged in with the correct account.' });
    }
    const userId = oauthInitiatingUserId;

    if (diditError) {
      logger.error('Didit OAuth flow returned an error', { userId, error: diditError, description: diditErrorDescription });
      await storage.updateUserProfile(userId, { verificationStatus: 'failed', verificationFailureReason: `Didit error: ${diditErrorDescription || diditError}` });
      return res.render('verification-result', { success: false, status:'error', message: `Verification failed: ${diditErrorDescription || diditError}` });
    }

    if (!code || typeof code !== 'string') {
      logger.error('No authorization code in Didit callback', { userId, query: req.query });
      return res.render('verification-result', { success: false, status:'error', message: 'Verification process did not return an authorization code.' });
    }

    const callbackUrl = `${req.protocol}://${req.get('host')}/api/verification/result`; // Must be the same as used in /initiate
    const tokenResponse = await diditConnector.exchangeCodeForToken(code, callbackUrl);

    const verificationData = await diditConnector.getUserVerificationData(tokenResponse.access_token);

    // Determine verification success based on data from Didit
    const isVerified = verificationData.email_verified === true || !!verificationData.id;

    if (isVerified) {
      await storage.updateUser(userId, { verificationStatus: 'verified' }); // Update main user record
      await storage.updateUserProfile(userId, {
        verificationStatus: 'verified',
        verificationId: verificationData.id || verificationData.sub,
        verifiedAt: new Date(),
        verificationProvider: 'didit',
        verificationDetails: verificationData.raw_data,
        verificationFailureReason: null, // Clear any previous failure reason
      });
      logger.info('User successfully verified with Didit OAuth', { userId, diditUserId: verificationData.id || verificationData.sub });
      res.render('verification-result', {
        success: true,
        status: 'success',
        message: 'Your identity has been successfully verified via Didit.',
        details: verificationData
      });
    } else {
      logger.warn('User data from Didit did not meet verification criteria', { userId, verificationData });
      await storage.updateUser(userId, { verificationStatus: 'failed' }); // Update main user record
      await storage.updateUserProfile(userId, {
        verificationStatus: 'failed',
        verificationFailureReason: 'Didit verification data did not meet criteria (e.g., email not verified).',
        verificationId: verificationData.id || verificationData.sub,
        verificationDetails: verificationData.raw_data,
      });
      res.render('verification-result', {
        success: false,
        status: 'error',
        message: 'Verification with Didit was completed, but the returned data did not meet all criteria (e.g., email not verified). Please contact support.',
      });
    }

  } catch (error: any) {
    logger.error('Error processing Didit OAuth verification result', {
      userId: req.session.diditOAuthUserId || req.session.userId,
      errorMessage: error.message,
      errorDetails: error.response?.data,
      stack: error.stack
    });
    res.status(500).render('error', { message: `An error occurred while processing your verification result: ${error.message}` });
  }
});

// Route for admin to test connection to Didit API
router.get('/admin/test-connection', ensureAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
  try {
    // const userId = req.session.userId; // ensureAdmin should handle session validity
    // if (!userId) {
    //   return res.status(401).json({ error: 'Unauthorized' });
    // }
    // No need to re-check role if ensureAdmin does it.
    // const user = await storage.getUser(userId);
    // if (!user || user.role !== 'admin') {
    //   return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    // }

    // Initialize the Didit connector with latest config (it does this internally on use if not initialized)
    // await diditConnector.initializeConfig();
    
    const result = await diditConnector.testConnection();
    
    return res.json(result);
  } catch (error) {
    logger.error('Error testing Didit connection from admin', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ 
      success: false, 
      message: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }
});

// Route to get admin settings for Didit
router.get('/admin/settings', ensureAuthenticated, ensureAdmin, async (req: Request, res: Response) => {
  try {
    // ensureAdmin handles session and role check
    const clientIdSetting = await storage.getSystemSetting('didit_client_id');
    const clientSecretSetting = await storage.getSystemSetting('didit_client_secret');
    const baseUrlSetting = await storage.getSystemSetting('didit_base_url');
    const authUrlSetting = await storage.getSystemSetting('didit_auth_url');
    const tokenUrlSetting = await storage.getSystemSetting('didit_token_url');
    const enabledSetting = await storage.getSystemSetting('didit_enabled');
    
    return res.json({
      clientId: clientIdSetting?.settingValue || '',
      clientSecretExists: !!clientSecretSetting?.settingValue, // Don't send the secret itself
      baseUrl: baseUrlSetting?.settingValue || '',
      authUrl: authUrlSetting?.settingValue || '',
      tokenUrl: tokenUrlSetting?.settingValue || '',
      enabled: enabledSetting?.settingValue === 'true' || false,
    });
  } catch (error) {
    logger.error('Error retrieving Didit admin settings', { error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: 'Failed to retrieve Didit settings' });
  }
});

// Route to update admin settings for Didit
router.put('/admin/settings', ensureAuthenticated, ensureAdmin, express.json(), async (req: Request, res: Response) => {
  try {
    // ensureAdmin handles session and role check
    const { clientId, clientSecret, baseUrl, authUrl, tokenUrl, enabled } = req.body;

    // Zod schema for validation
    const settingsSchema = z.object({
        clientId: z.string().optional(), // Optional: allow empty if disabling, or if already set and not changing
        clientSecret: z.string().optional(), // Optional: allow empty if not changing
        baseUrl: z.string().url().optional().or(z.literal('')), // Allow empty or valid URL
        authUrl: z.string().url().optional().or(z.literal('')),
        tokenUrl: z.string().url().optional().or(z.literal('')),
        enabled: z.boolean(),
      });

    const validationResult = settingsSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid settings data', details: validationResult.error.flatten() });
    }
    
    const validatedData = validationResult.data;

    if (validatedData.enabled) {
      if (!validatedData.clientId) return res.status(400).json({ error: "Client ID is required when enabling Didit."});
      if (!validatedData.baseUrl) return res.status(400).json({ error: "Base URL is required when enabling Didit."});
      if (!validatedData.authUrl) return res.status(400).json({ error: "Auth URL is required when enabling Didit."});
      if (!validatedData.tokenUrl) return res.status(400).json({ error: "Token URL is required when enabling Didit."});

      const currentSecret = await storage.getSystemSetting('didit_client_secret');
      if (!validatedData.clientSecret && !currentSecret?.settingValue) {
        return res.status(400).json({ error: "Client Secret is required when enabling Didit and no secret is currently stored."});
      }
    }

    // Update settings using validatedData
    await storage.updateSystemSetting('didit_client_id', validatedData.clientId || '', req.session.userId);
    if (validatedData.clientSecret) { // Only update secret if a new one is provided and not empty
      await storage.updateSystemSetting('didit_client_secret', validatedData.clientSecret, req.session.userId);
    }
    await storage.updateSystemSetting('didit_base_url', validatedData.baseUrl || '', req.session.userId);
    await storage.updateSystemSetting('didit_auth_url', validatedData.authUrl || '', req.session.userId);
    await storage.updateSystemSetting('didit_token_url', validatedData.tokenUrl || '', req.session.userId);
    await storage.updateSystemSetting('didit_enabled', validatedData.enabled.toString(), req.session.userId);

    await diditConnector.initializeConfig(); // Re-initialize the connector with new settings

    logger.info('Didit admin settings updated by user', { userId: req.session.userId, enabled: validatedData.enabled });
    return res.json({ success: true, message: 'Didit settings updated successfully.' });
  } catch (error) {
    logger.error('Error updating Didit admin settings', { userId: req.session.userId, error: error instanceof Error ? error.message : String(error) });
    return res.status(500).json({ error: 'Failed to update Didit settings' });
  }
});

export default router;