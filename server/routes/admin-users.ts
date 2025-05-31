import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { ensureAuthenticated as isAuthenticated, ensureAdmin as isAdmin } from '../middleware/auth';
import { decryptProfileFields, encryptUserFields, decryptUserFields } from '../../services/encryption-service'; // Updated path

const router = Router();

// Schema for verification status update
const verificationStatusSchema = z.object({
  verificationStatus: z.enum(['pending', 'verified', 'rejected'])
});

// Get all users
router.get('/api/admin/users', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const usersFromDb = await storage.getAllUsers();
    
    // Decrypt each user
    const decryptedUsers = usersFromDb.map(user => decryptUserFields(user, (req.user as any)?.role));

    // For security, filter out sensitive information like password hashes
    // and use decrypted values
    const safeUsers = decryptedUsers.map(user => ({
      id: user.id,
      username: user.username,
      email: user.email, // Now decrypted
      firstName: user.firstName || '', // Now decrypted
      lastName: user.lastName || '', // Now decrypted
      role: user.role,
      observerId: user.observerId, // Now decrypted
      // Map verificationStatus to match the client expectations
      verificationStatus: user.verificationStatus || 'pending',
      // Also provide isActive for backwards compatibility
      isActive: user.verificationStatus === 'verified',
      // Add training status with default
      trainingStatus: user.trainingStatus || 'not_started',
      // Add phone number if available
      phoneNumber: user.phoneNumber || null, // Now decrypted
      createdAt: user.createdAt || new Date()
    }));
    
    res.json(safeUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    let userFromDb = await storage.getUser(userId);
    if (!userFromDb) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt user fields from users table
    userFromDb = decryptUserFields(userFromDb, (req.user as any)?.role);
    
    // Get user profile
    let profileFromDb = await storage.getUserProfile(userId);

    // Decrypt profile fields
    profileFromDb = decryptProfileFields(profileFromDb, (req.user as any)?.role);
    
    // Return user with profile, using decrypted values
    const safeUser = {
      id: userFromDb.id,
      username: userFromDb.username,
      email: userFromDb.email, // Now decrypted
      firstName: userFromDb.firstName || '', // Now decrypted
      lastName: userFromDb.lastName || '', // Now decrypted
      role: userFromDb.role,
      observerId: userFromDb.observerId, // Now decrypted
      phoneNumber: userFromDb.phoneNumber, // Now decrypted
      // Handle missing fields with defaults
      isActive: userFromDb.verificationStatus === 'verified',
      // Add proper verification status in response
      verificationStatus: userFromDb.verificationStatus || 'pending',
      createdAt: userFromDb.createdAt || new Date(),
      profile: profileFromDb || null
    };
    
    res.json(safeUser);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user details' });
  }
});

// Update user
router.patch('/api/admin/users/:id', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate input
    const updateSchema = z.object({
      username: z.string().optional(),
      email: z.string().email().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      role: z.string().optional(),
      isActive: z.boolean().optional(),
    });
    
    const validationResult = updateSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ error: 'Invalid input', details: validationResult.error });
    }
    
    const updateDataFromRequest = validationResult.data;

    // Encrypt user fields before sending to storage.updateUser
    const encryptedUpdateData = encryptUserFields(updateDataFromRequest as Record<string, any>);
    
    // Update user
    let updatedUser = await storage.updateUser(userId, encryptedUpdateData);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt user for response
    updatedUser = decryptUserFields(updatedUser, (req.user as any)?.role);
    
    res.json({
      id: updatedUser.id,
      username: updatedUser.username,
      email: updatedUser.email, // Decrypted
      firstName: updatedUser.firstName || '', // Decrypted
      lastName: updatedUser.lastName || '', // Decrypted
      role: updatedUser.role,
      observerId: updatedUser.observerId, // Decrypted
      phoneNumber: updatedUser.phoneNumber, // Decrypted
      // Handle missing fields with defaults
      isActive: updatedUser.verificationStatus === 'verified',
      verificationStatus: updatedUser.verificationStatus || 'pending'
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Get user documents for verification
router.get('/api/admin/users/:id/documents', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Check if the user exists
    let userFromDb = await storage.getUser(userId);
    if (!userFromDb) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Decrypt user fields
    userFromDb = decryptUserFields(userFromDb, (req.user as any)?.role);
    
    // Get all documents for this user
    let documentsFromDb = await storage.getDocumentsByUserId(userId);

    // Decrypt ocrText in documents if present
    const userRole = (req.user as any)?.role;
    const decryptedDocuments = documentsFromDb.map(doc =>
      decryptFields(doc, userRole, "ocr_text_iv", "is_ocr_text_encrypted")
    );
    
    // Get user profile for additional verification data
    let profileFromDb = await storage.getUserProfile(userId);

    // Decrypt profile fields
    profileFromDb = decryptProfileFields(profileFromDb, (req.user as any)?.role);
    
    // Return the documents and profile info using decrypted user data
    res.json({
      user: {
        id: userFromDb.id,
        firstName: userFromDb.firstName, // Decrypted
        lastName: userFromDb.lastName, // Decrypted
        email: userFromDb.email, // Decrypted
        verificationStatus: userFromDb.verificationStatus
      },
      documents: decryptedDocuments, // Use decrypted documents
      profile: profileFromDb
    });
  } catch (error) {
    console.error('Error fetching user documents:', error);
    res.status(500).json({ error: 'Failed to fetch user documents' });
  }
});

// Update user verification status
router.post('/api/admin/users/:id/verify', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Validate input
    const validationResult = verificationStatusSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Invalid verification status',
        details: validationResult.error
      });
    }
    
    const { verificationStatus } = validationResult.data;
    
    // Get user to update
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user verification status
    let updatedUser = await storage.updateUser(userId, { verificationStatus });
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update verification status' });
    }

    // Decrypt user for response (though only verificationStatus is expected to change)
    updatedUser = decryptUserFields(updatedUser, (req.user as any)?.role);
    
    // Return updated user info
    res.json({
      id: updatedUser.id,
      verificationStatus: updatedUser.verificationStatus, // This field is not encrypted
      message: `User verification status updated to ${verificationStatus}`
    });
  } catch (error) {
    console.error('Error updating verification status:', error);
    res.status(500).json({ error: 'Failed to update verification status' });
  }
});

// Disable/Enable user
router.patch('/api/admin/users/:id/toggle-status', isAuthenticated, isAdmin, async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
      return res.status(400).json({ error: 'Invalid user ID' });
    }
    
    // Get current user to toggle status
    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Get current status and toggle it
    const currentStatus = user.verificationStatus === 'verified';
    const newVerificationStatus = currentStatus ? 'pending' : 'verified';
    
    // Update with the new status
    let updatedUser = await storage.updateUser(userId, {
      verificationStatus: newVerificationStatus 
    });
    
    if (!updatedUser) {
      return res.status(500).json({ error: 'Failed to update user status' });
    }

    // Decrypt user for response
    updatedUser = decryptUserFields(updatedUser, (req.user as any)?.role);
    
    // For response, map verification status to isActive
    const isActive = updatedUser.verificationStatus === 'verified'; // This field is not encrypted
    
    res.json({
      id: updatedUser.id,
      isActive: isActive,
      // Potentially include other decrypted fields if needed by client, e.g. updatedUser.email
      message: isActive ? 'User account activated' : 'User account deactivated'
    });
  } catch (error) {
    console.error('Error toggling user status:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

export default router;