import { Router, Request, Response } from 'express';
import { db } from '../db';
import { systemSettings, users } from '../../shared/schema'; // Adjusted path
import { eq, inArray } from 'drizzle-orm';
import { requireAdmin } from '../middleware/auth';
import { z } from 'zod';
import { fromZodError } from 'zod-validation-error';


const router = Router();

const HUGGINGFACE_API_KEY_DB_KEY = 'HUGGINGFACE_API_KEY';

// --- Hugging Face API Key Management ---
router.get('/settings/huggingface-api-key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const setting = await db.select().from(systemSettings).where(eq(systemSettings.settingKey, HUGGINGFACE_API_KEY_DB_KEY)).limit(1);
    if (setting.length > 0 && setting[0].settingValue && (setting[0].settingValue as any).apiKey) {
      res.json({ apiKeyExists: true });
    } else {
      res.json({ apiKeyExists: false });
    }
  } catch (error: any) {
    console.error('Error fetching Hugging Face API key status:', error);
    res.status(500).json({ message: 'Failed to fetch API key status', error: error.message });
  }
});

router.post('/settings/huggingface-api-key', requireAdmin, async (req: Request, res: Response) => {
  const { apiKey } = req.body;
  const userId = (req as any).user?.id;
  if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
    return res.status(400).json({ message: 'API key is required and must be a non-empty string.' });
  }
  if (!apiKey.startsWith('hf_')) {
      return res.status(400).json({ message: 'Invalid Hugging Face API key format. It should start with "hf_".' });
  }
  try {
    const valueToStore = { apiKey: apiKey };
    await db.insert(systemSettings)
      .values({
        settingKey: HUGGINGFACE_API_KEY_DB_KEY,
        settingValue: valueToStore,
        description: 'Hugging Face API Key for AI Analytics',
        updatedBy: userId
      })
      .onConflictDoUpdate({
        target: systemSettings.settingKey,
        set: { settingValue: valueToStore, updatedAt: new Date(), updatedBy: userId }
      });
    res.status(200).json({ message: 'API Key saved successfully.' });
  } catch (error: any) {
    console.error('Error saving Hugging Face API key:', error);
    if (error.message.includes('violates foreign key constraint') && error.message.includes('system_settings_updated_by_fkey')) {
        return res.status(400).json({ message: 'Invalid user ID for tracking update.', error: error.message });
    }
    res.status(500).json({ message: 'Failed to save API key', error: error.message });
  }
});

router.delete('/settings/huggingface-api-key', requireAdmin, async (req: Request, res: Response) => {
  try {
    const result = await db.delete(systemSettings).where(eq(systemSettings.settingKey, HUGGINGFACE_API_KEY_DB_KEY)).returning();
    if (result.rowCount > 0) {
        res.status(200).json({ message: 'API Key deleted successfully.' });
    } else {
        res.status(404).json({ message: 'API Key not found or already deleted.' });
    }
  } catch (error: any) {
    console.error('Error deleting Hugging Face API key:', error);
    res.status(500).json({ message: 'Failed to delete API key', error: error.message });
  }
});


// --- AI Feature Settings Management ---

// Define Zod schema for individual AI feature settings for validation
const AiFeatureToggleSchema = z.object({ enabled: z.boolean() });
const AiHotspotAnalysisSchema = z.object({ enabled: z.boolean(), criticalReportThreshold: z.number().min(1).max(100) });
const AiModelSelectionSchema = z.object({ modelId: z.string().min(1) });

// Overall AI settings schema
const AiSettingsSchema = z.object({
  AI_FEATURE_TREND_EXPLANATIONS: AiFeatureToggleSchema.optional(),
  AI_FEATURE_HOTSPOT_ANALYSIS: AiHotspotAnalysisSchema.optional(),
  AI_FEATURE_INSIGHT_ACTIONS: AiFeatureToggleSchema.optional(),
  AI_MODEL_TEXT_CLASSIFICATION: AiModelSelectionSchema.optional(),
  AI_MODEL_TEXT_GENERATION: AiModelSelectionSchema.optional(),
  AI_MODEL_SUMMARIZATION: AiModelSelectionSchema.optional(),
  AI_MODEL_QUESTION_ANSWERING: AiModelSelectionSchema.optional(),
  AI_MODEL_ZERO_SHOT_CLASSIFICATION: AiModelSelectionSchema.optional(),
});

export const AI_SETTING_KEYS = [
  'AI_FEATURE_TREND_EXPLANATIONS',
  'AI_FEATURE_HOTSPOT_ANALYSIS',
  'AI_FEATURE_INSIGHT_ACTIONS',
  'AI_MODEL_TEXT_CLASSIFICATION',
  'AI_MODEL_TEXT_GENERATION',
  'AI_MODEL_SUMMARIZATION',
  'AI_MODEL_QUESTION_ANSWERING',
  'AI_MODEL_ZERO_SHOT_CLASSIFICATION',
] as const;


// GET all AI feature settings
router.get('/settings/ai-features', requireAdmin, async (req: Request, res: Response) => {
  try {
    const settingsRecords = await db
      .select()
      .from(systemSettings)
      .where(inArray(systemSettings.settingKey, AI_SETTING_KEYS));

    const settingsMap: Partial<z.infer<typeof AiSettingsSchema>> = {};
    settingsRecords.forEach(record => {
      if (AI_SETTING_KEYS.includes(record.settingKey as typeof AI_SETTING_KEYS[number])) {
        // Type assertion for safety, though inArray should guarantee this
        (settingsMap as any)[record.settingKey] = record.settingValue;
      }
    });

    res.json(settingsMap);
  } catch (error: any) {
    console.error('Error fetching AI feature settings:', error);
    res.status(500).json({ message: 'Failed to fetch AI feature settings', error: error.message });
  }
});

// PUT - Update multiple AI feature settings
router.put('/settings/ai-features', requireAdmin, async (req: Request, res: Response) => {
  const userId = (req as any).user?.id;
  try {
    const parseResult = AiSettingsSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: 'Invalid AI settings data.', errors: fromZodError(parseResult.error).message });
    }
    const settingsToUpdate = parseResult.data;

    const updatePromises = Object.entries(settingsToUpdate).map(async ([key, value]) => {
      if (value !== undefined && AI_SETTING_KEYS.includes(key as typeof AI_SETTING_KEYS[number])) {
        // Validate individual setting structure before saving
        let description = 'AI Feature Setting';
        switch(key) {
            case 'AI_FEATURE_TREND_EXPLANATIONS': AiFeatureToggleSchema.parse(value); description = 'Controls AI-powered trend explanations.'; break;
            case 'AI_FEATURE_HOTSPOT_ANALYSIS': AiHotspotAnalysisSchema.parse(value); description = 'Controls AI-powered hotspot analysis and its threshold.'; break;
            case 'AI_FEATURE_INSIGHT_ACTIONS': AiFeatureToggleSchema.parse(value); description = 'Controls AI-powered suggested actions for insights.'; break;
            case 'AI_MODEL_TEXT_CLASSIFICATION': AiModelSelectionSchema.parse(value); description = 'Selected model for text classification tasks.'; break;
            case 'AI_MODEL_TEXT_GENERATION': AiModelSelectionSchema.parse(value); description = 'Selected model for text generation tasks.'; break;
            case 'AI_MODEL_SUMMARIZATION': AiModelSelectionSchema.parse(value); description = 'Selected model for summarization tasks.'; break;
            case 'AI_MODEL_QUESTION_ANSWERING': AiModelSelectionSchema.parse(value); description = 'Selected model for question answering tasks.'; break;
            case 'AI_MODEL_ZERO_SHOT_CLASSIFICATION': AiModelSelectionSchema.parse(value); description = 'Selected model for zero-shot classification tasks.'; break;
        }

        return db.insert(systemSettings)
          .values({
            settingKey: key,
            settingValue: value, // Value is already an object here
            description: description,
            updatedBy: userId
          })
          .onConflictDoUpdate({
            target: systemSettings.settingKey,
            set: { settingValue: value, updatedAt: new Date(), updatedBy: userId }
          });
      }
    });

    await Promise.all(updatePromises.filter(p => p !== undefined));

    res.status(200).json({ message: 'AI feature settings updated successfully.' });
  } catch (error: any) {
    console.error('Error updating AI feature settings:', error);
    if (error instanceof z.ZodError) { // Catch validation errors from individual parsers
        return res.status(400).json({ message: 'Invalid data for one or more settings.', errors: fromZodError(error).message });
    }
    res.status(500).json({ message: 'Failed to update AI feature settings', error: error.message });
  }
});


export default router;
