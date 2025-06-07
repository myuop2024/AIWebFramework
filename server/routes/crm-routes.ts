import express from 'express';
import CRMContact from '../models/crmContact';
import Observer from '../models/observer';
import InteractionNote from '../models/interactionNote';
import AuditLog from '../models/auditLog';
import axios from 'axios'; // For Hugging Face API calls
import { google } from 'googleapis'; // For Google Sheets API
// import User from '../models/user'; // If you have a User model
import { hasRoleMiddleware } from '../middleware/auth'; // Use the generic role middleware
import json2csv from 'json2csv'; // For CSV export
const { Parser: Json2csvParser } = json2csv;
import { apiRateLimit } from '../middleware/security'; // Import rate limiting middleware

const router = express.Router();

// Middleware: Only allow admin and Parish Coordinator
router.use(hasRoleMiddleware(['admin', 'parish_coordinator']));

// Helper: Check if user is admin
function isAdmin(req) {
  return req.user && req.user.role === 'admin';
}

// CRMContact CRUD
router.get('/contacts', apiRateLimit, async (req, res) => {
  let contacts = await CRMContact.findAll();
  // If not admin, remove sensitive fields
  if (!isAdmin(req)) {
    contacts = contacts.map(contact => {
      const { ssn, notes, ...safe } = contact.toJSON();
      return safe;
    });
  }
  res.json(contacts);
});

router.post('/contacts', apiRateLimit, async (req, res) => {
  // Only admin can set sensitive fields
  const data = { ...req.body };
  if (!isAdmin(req)) {
    delete data.ssn;
    delete data.notes;
  }
  const contact = await CRMContact.create(data);
  await AuditLog.create({ action: 'create_contact', userId: req.user.id, targetId: contact.id });
  res.status(201).json(contact);
});

router.put('/contacts/:id', apiRateLimit, async (req, res) => {
  const contact = await CRMContact.findByPk(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  // Only admin can update sensitive fields
  const data = { ...req.body };
  if (!isAdmin(req)) {
    delete data.ssn;
    delete data.notes;
  }
  await contact.update(data);
  await AuditLog.create({ action: 'update_contact', userId: req.user.id, targetId: contact.id });
  res.json(contact);
});

router.delete('/contacts/:id', apiRateLimit, async (req, res) => {
  const contact = await CRMContact.findByPk(req.params.id);
  if (!contact) return res.status(404).json({ error: 'Not found' });
  await contact.destroy();
  await AuditLog.create({ action: 'delete_contact', userId: req.user.id, targetId: contact.id });
  res.status(204).end();
});

// Observer CRUD
router.get('/observers', apiRateLimit, async (req, res) => {
  const observers = await Observer.findAll({ include: [CRMContact] });
  res.json(observers);
});

router.post('/observers', apiRateLimit, async (req, res) => {
  const observer = await Observer.create(req.body);
  await AuditLog.create({ action: 'create_observer', userId: req.user.id, targetId: observer.id });
  res.status(201).json(observer);
});

router.put('/observers/:id', apiRateLimit, async (req, res) => {
  const observer = await Observer.findByPk(req.params.id);
  if (!observer) return res.status(404).json({ error: 'Not found' });
  await observer.update(req.body);
  await AuditLog.create({ action: 'update_observer', userId: req.user.id, targetId: observer.id });
  res.json(observer);
});

router.delete('/observers/:id', apiRateLimit, async (req, res) => {
  const observer = await Observer.findByPk(req.params.id);
  if (!observer) return res.status(404).json({ error: 'Not found' });
  await observer.destroy();
  await AuditLog.create({ action: 'delete_observer', userId: req.user.id, targetId: observer.id });
  res.status(204).end();
});

// Link observer to user profile
router.put('/observers/:id/link-user', apiRateLimit, async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: 'Missing userId' });
  const observer = await Observer.findByPk(id);
  if (!observer) return res.status(404).json({ error: 'Observer not found' });
  await observer.update({ userId });
  res.json({ success: true });
});

// InteractionNote CRUD
router.get('/contacts/:contactId/notes', apiRateLimit, async (req, res) => {
  const notes = await InteractionNote.findAll({ where: { crmContactId: req.params.contactId } });
  res.json(notes);
});

router.post('/contacts/:contactId/notes', apiRateLimit, async (req, res) => {
  const note = await InteractionNote.create({ ...req.body, crmContactId: req.params.contactId, createdBy: req.user.id });
  await AuditLog.create({ action: 'create_note', userId: req.user.id, targetId: note.id });
  res.status(201).json(note);
});

// AI-powered profile linking suggestions
router.post('/contacts/suggestions', apiRateLimit, async (req, res) => {
  const { contacts, users } = req.body;
  if (!contacts || !users) return res.status(400).json({ error: 'Missing contacts or users' });

  // NOTE: Replace with your Hugging Face API key
  const HF_API_KEY = process.env.HF_API_KEY || 'YOUR_HF_API_KEY';
  const modelUrl = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

  const suggestions = [];

  for (const contact of contacts) {
    let bestMatch = null;
    let bestScore = 0;
    for (const user of users) {
      const contactStr = `${contact.name} ${contact.email} ${contact.phone}`;
      const userStr = `${user.name} ${user.email} ${user.phone}`;
      try {
        const response = await axios.post(
          modelUrl,
          { inputs: { source_sentence: contactStr, sentences: [userStr] } },
          { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
        );
        const score = Array.isArray(response.data) ? response.data[0]?.score || 0 : 0;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = user;
        }
      } catch (err) {
        // Ignore errors for individual calls
      }
    }
    if (bestScore > 0.8 && bestMatch) {
      suggestions.push({
        contactId: contact.id,
        suggestedUserId: bestMatch.id,
        score: bestScore
      });
    }
  }
  res.json({ suggestions });
});

// AI-powered observer-to-user profile linking suggestions
router.post('/observers/suggestions', apiRateLimit, async (req, res) => {
  const { observers, users } = req.body;
  if (!observers || !users) return res.status(400).json({ error: 'Missing observers or users' });

  const HF_API_KEY = process.env.HF_API_KEY || 'YOUR_HF_API_KEY';
  const modelUrl = 'https://api-inference.huggingface.co/models/sentence-transformers/all-MiniLM-L6-v2';

  const suggestions = [];

  for (const observer of observers) {
    let bestMatch = null;
    let bestScore = 0;
    for (const user of users) {
      const observerStr = `${observer.CRMContact?.name || ''} ${observer.CRMContact?.email || ''} ${observer.CRMContact?.phone || ''}`;
      const userStr = `${user.firstName || ''} ${user.lastName || ''} ${user.email || ''} ${user.phoneNumber || ''}`;
      try {
        const response = await axios.post(
          modelUrl,
          { inputs: { source_sentence: observerStr, sentences: [userStr] } },
          { headers: { Authorization: `Bearer ${HF_API_KEY}` } }
        );
        const score = Array.isArray(response.data) ? response.data[0]?.score || 0 : 0;
        if (score > bestScore) {
          bestScore = score;
          bestMatch = user;
        }
      } catch (err) {
        // Ignore errors for individual calls
      }
    }
    if (bestScore > 0.8 && bestMatch) {
      suggestions.push({
        observerId: observer.id,
        suggestedUserId: bestMatch.id,
        score: bestScore
      });
    }
  }
  res.json({ suggestions });
});

// Import data from Google Sheets
router.post('/import-google-sheet', apiRateLimit, async (req, res) => {
  const { sheetId, range } = req.body;
  if (!sheetId) return res.status(400).json({ error: 'Missing sheetId' });

  // You need to set up Google API credentials and store them securely
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: sheetId,
      range: range || 'Sheet1',
    });
    const rows = response.data.values || [];
    res.json({ rows });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch Google Sheet', details: err.message });
  }
});

// Export contacts as CSV
router.get('/contacts/export/csv', apiRateLimit, async (req, res) => {
  const contacts = await CRMContact.findAll();
  const fields = ['id', 'name', 'email', 'phone', 'address', 'linkedUserId', 'notes', 'createdAt', 'updatedAt'];
  const parser = new Json2csvParser({ fields });
  const csv = parser.parse(contacts.map(c => c.toJSON()));
  res.header('Content-Type', 'text/csv');
  res.attachment('crm_contacts.csv');
  res.send(csv);
});

// Export observers as CSV
router.get('/observers/export/csv', apiRateLimit, async (req, res) => {
  const observers = await Observer.findAll({ include: [CRMContact] });
  const fields = ['id', 'crmContactId', 'parish', 'role', 'status', 'createdAt', 'updatedAt', 'contactName'];
  const data = observers.map(o => ({
    ...o.toJSON(),
    contactName: o.CRMContact?.name || '',
  }));
  const parser = new Json2csvParser({ fields });
  const csv = parser.parse(data);
  res.header('Content-Type', 'text/csv');
  res.attachment('crm_observers.csv');
  res.send(csv);
});

// Get audit logs
router.get('/audit-logs', apiRateLimit, async (req, res) => {
  const logs = await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
  res.json(logs);
});

// Audit Log Export (admin only)
router.get('/audit-logs/export', apiRateLimit, (req, res, next) => {
  if (!isAdmin(req)) return res.status(403).json({ error: 'Forbidden' });
  next();
}, async (req, res) => {
  const logs = await AuditLog.findAll();
  const parser = new Json2csvParser();
  const csv = parser.parse(logs.map(log => log.toJSON()));
  res.header('Content-Type', 'text/csv');
  res.attachment('audit-logs.csv');
  res.send(csv);
});

export default router; 