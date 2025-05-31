import request from 'supertest'; // Using supertest for HTTP requests if available, or mock express req/res
import express, { Express } from 'express';
import adminAppSettingsRoutes, { AI_SETTING_KEYS } from './admin-app-settings';
import { db } from '../db'; // Mocked
import { requireAdmin } from '../middleware/auth'; // Mocked

// Mock dependencies
jest.mock('../db', () => ({
  db: {
    select: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    onConflictDoUpdate: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([]), // Default for returning clauses
    // Add other Drizzle functions if needed
  }
}));

jest.mock('../middleware/auth', () => ({
  requireAdmin: (req: any, res: any, next: () => void) => {
    // Simulate admin access by attaching a mock user
    req.user = { id: 1, role: 'admin' };
    next();
  },
}));

const app: Express = express();
app.use(express.json());
app.use('/api/admin', adminAppSettingsRoutes); // Mount the router like in server/routes.ts

describe('Admin App Settings Routes - AI Features', () => {
  let mockDbSelect: jest.Mock;
  let mockDbInsert: jest.Mock;

  beforeEach(() => {
    mockDbSelect = db.select as jest.Mock;
    mockDbSelect.mockImplementation(() => ({
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      // Default to empty array for GET
      mockResolvedValue: [],
    }));

    mockDbInsert = db.insert as jest.Mock;
    mockDbInsert.mockImplementation(() => ({
        values: jest.fn().mockReturnThis(),
        onConflictDoUpdate: jest.fn().mockResolvedValue([]), // Default for PUT
    }));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/admin/settings/ai-features', () => {
    it('should return all AI feature settings from the database', async () => {
      const mockSettingsData = [
        { settingKey: 'AI_FEATURE_TREND_EXPLANATIONS', settingValue: { enabled: true } },
        { settingKey: 'AI_MODEL_SUMMARIZATION', settingValue: { modelId: 'test/summarizer' } },
      ];
      // Specific mock for this test case for the 'where' clause
      mockDbSelect().where = jest.fn().mockResolvedValue(mockSettingsData);


      const response = await request(app).get('/api/admin/settings/ai-features');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        AI_FEATURE_TREND_EXPLANATIONS: { enabled: true },
        AI_MODEL_SUMMARIZATION: { modelId: 'test/summarizer' },
      });
      expect(mockDbSelect().where).toHaveBeenCalledWith(expect.anything()); // Check that where was called with inArray
    });

    it('should return empty object if no settings are found', async () => {
       mockDbSelect().where = jest.fn().mockResolvedValue([]);

      const response = await request(app).get('/api/admin/settings/ai-features');
      expect(response.status).toBe(200);
      expect(response.body).toEqual({});
    });
  });

  describe('PUT /api/admin/settings/ai-features', () => {
    it('should update valid AI feature settings', async () => {
      const newSettings = {
        AI_FEATURE_TREND_EXPLANATIONS: { enabled: false },
        AI_MODEL_TEXT_GENERATION: { modelId: 'new/text-gen-model' },
        AI_FEATURE_HOTSPOT_ANALYSIS: { enabled: true, criticalReportThreshold: 5 },
      };

      // Mock the onConflictDoUpdate to simulate successful update
      (db.insert('').values('').onConflictDoUpdate as jest.Mock).mockResolvedValue([{
          settingKey: 'AI_FEATURE_TREND_EXPLANATIONS',
          settingValue: { enabled: false }
      }]);


      const response = await request(app)
        .put('/api/admin/settings/ai-features')
        .send(newSettings);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('AI feature settings updated successfully.');
      expect(db.insert(systemSettings).values).toHaveBeenCalledTimes(3); // Called for each valid key in newSettings
      expect(db.insert(systemSettings).values).toHaveBeenCalledWith(expect.objectContaining({
        settingKey: 'AI_FEATURE_TREND_EXPLANATIONS',
        settingValue: { enabled: false },
      }));
      expect(db.insert(systemSettings).values).toHaveBeenCalledWith(expect.objectContaining({
        settingKey: 'AI_MODEL_TEXT_GENERATION',
        settingValue: { modelId: 'new/text-gen-model' },
      }));
       expect(db.insert(systemSettings).values).toHaveBeenCalledWith(expect.objectContaining({
        settingKey: 'AI_FEATURE_HOTSPOT_ANALYSIS',
        settingValue: { enabled: true, criticalReportThreshold: 5 },
      }));
    });

    it('should return 400 for invalid setting structure', async () => {
      const invalidSettings = {
        AI_FEATURE_TREND_EXPLANATIONS: { enabled: 'not-a-boolean' }, // Invalid type
      };
      const response = await request(app)
        .put('/api/admin/settings/ai-features')
        .send(invalidSettings);
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid AI settings data.');
    });

    it('should return 400 for invalid criticalReportThreshold type', async () => {
      const invalidSettings = {
        AI_FEATURE_HOTSPOT_ANALYSIS: { enabled: true, criticalReportThreshold: "five" }, // Invalid type
      };
      const response = await request(app)
        .put('/api/admin/settings/ai-features')
        .send(invalidSettings);
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Invalid data for one or more settings');
    });


    it('should ignore unknown keys', async () => {
        const settingsWithUnknownKey = {
            AI_FEATURE_TREND_EXPLANATIONS: { enabled: true },
            UNKNOWN_FEATURE_KEY: { enabled: false }
        };
        const response = await request(app)
            .put('/api/admin/settings/ai-features')
            .send(settingsWithUnknownKey);

        expect(response.status).toBe(200);
        expect(db.insert(systemSettings).values).toHaveBeenCalledTimes(1);
        expect(db.insert(systemSettings).values).toHaveBeenCalledWith(expect.objectContaining({
            settingKey: 'AI_FEATURE_TREND_EXPLANATIONS',
            settingValue: { enabled: true },
        }));
    });
  });
});
