import { Router } from 'express';
import { z } from 'zod';
import ErrorLogger from '../services/error-logger';

const router = Router();

// Define validation schema for client error logs
const clientErrorSchema = z.object({
  message: z.string(),
  source: z.string(),
  level: z.enum(['error', 'warning', 'info']).default('error'),
  url: z.string().optional(),
  stack: z.string().optional(),
  userAgent: z.string().optional(),
  context: z.record(z.any()).optional(),
  code: z.string().optional(),
});

/**
 * POST /api/log-error
 * Endpoint for client-side error logging
 */
router.post('/log-error', async (req, res) => {
  try {
    // Validate request body
    const result = clientErrorSchema.safeParse(req.body);
    
    if (!result.success) {
      return res.status(400).json({ 
        message: 'Invalid error data',
        errors: result.error.format() 
      });
    }
    
    const errorData = result.data;
    
    // Log the error using our service
    await ErrorLogger.logError({
      message: errorData.message,
      source: errorData.source,
      level: errorData.level,
      error: errorData.stack ? new Error(errorData.message) : undefined,
      userId: req.user?.id,
      request: req,
      context: {
        ...errorData.context,
        clientData: errorData
      }
    });
    
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error in log-error endpoint:', error);
    return res.status(500).json({ message: 'Failed to log error' });
  }
});

/**
 * GET /api/log-error/test
 * Test endpoint that intentionally throws an error
 * This is for testing server-side error logging
 */
router.get('/log-error/test', (req, res) => {
  throw new Error('This is a test error from the API');
});

export default router;