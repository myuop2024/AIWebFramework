import { Router } from 'express';
import { db } from '../db';
import { newsEntries, type News, type InsertNews, notifications, type Notification, type InsertNotification, users } from '@shared/schema';
import { ensureAuthenticated, hasPermission } from '../middleware/auth';
import { eq, desc, and, like, sql } from 'drizzle-orm';
import { getLatestJamaicanPoliticalNews } from '../services/news-service';
import * as logger from '../utils/logger';

const router = Router();

// GET /api/news - Get all news with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const category = req.query.category as string;
    const search = req.query.search as string;
    const published = req.query.published as string;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (category) {
      conditions.push(eq(newsEntries.category, category));
    }
    
    if (search) {
      conditions.push(
        sql`(${newsEntries.title} ILIKE ${`%${search}%`} OR ${newsEntries.content} ILIKE ${`%${search}%`})`
      );
    }
    
    if (published !== undefined) {
      conditions.push(eq(newsEntries.isPublished, published === 'true'));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get news with pagination
    const news = await db
      .select()
      .from(newsEntries)
      .where(whereClause)
      .orderBy(desc(newsEntries.createdAt))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(newsEntries)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      news,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });
  } catch (error) {
    logger.error('Error fetching news:', error);
    res.status(500).json({ error: 'Failed to fetch news' });
  }
});

// GET /api/news/latest - Get latest news (for dashboard)
router.get('/latest', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;

    const news = await db
      .select()
      .from(newsEntries)
      .where(eq(newsEntries.isPublished, true))
      .orderBy(desc(newsEntries.createdAt))
      .limit(limit)
      .catch(() => []); // Return empty array if table doesn't exist or query fails

    res.json(news || []);
  } catch (error) {
    logger.error('Error fetching latest news:', error);
    // Return empty array instead of error to prevent frontend crashes
    res.json([]);
  }
});

// GET /api/news/external - Get external Jamaican political news
router.get('/external', async (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const externalNews = await getLatestJamaicanPoliticalNews(days);
    res.json(externalNews);
  } catch (error) {
    logger.error('Error fetching external news:', error);
    res.status(500).json({ error: 'Failed to fetch external news' });
  }
});

// GET /api/news/categories - Get all news categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await db
      .selectDistinct({ category: newsEntries.category })
      .from(newsEntries)
      .where(eq(newsEntries.isPublished, true));
    
    res.json(categories.map(c => c.category));
  } catch (error) {
    logger.error('Error fetching news categories:', error);
    res.status(500).json({ error: 'Failed to fetch news categories' });
  }
});

// GET /api/news/:id - Get single news item
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid news ID' });
    }
    
    const news = await db
      .select()
      .from(newsEntries)
      .where(eq(newsEntries.id, id))
      .limit(1);
    
    if (news.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    res.json(news[0]);
  } catch (error) {
    logger.error('Error fetching news item:', error);
    res.status(500).json({ error: 'Failed to fetch news item' });
  }
});

// POST /api/news - Create new news item
router.post('/', ensureAuthenticated, hasPermission('news:create'), async (req, res) => {
  try {
    const { title, content, category, isPublished = true } = req.body;
    
    if (!title || !content || !category) {
      return res.status(400).json({ 
        error: 'Title, content, and category are required' 
      });
    }
    
    const newNews: InsertNews = {
      title,
      content,
      category,
      isPublished,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await db
      .insert(newsEntries)
      .values(newNews)
      .returning();
    
    logger.info('News created:', { id: result[0].id, title });
    res.status(201).json(result[0]);
  } catch (error) {
    logger.error('Error creating news:', error);
    res.status(500).json({ error: 'Failed to create news' });
  }
});

// PUT /api/news/:id - Update news item
router.put('/:id', ensureAuthenticated, hasPermission('news:edit'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, content, category, isPublished } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid news ID' });
    }
    
    // Check if news exists
    const existing = await db
      .select()
      .from(newsEntries)
      .where(eq(newsEntries.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    const updateData: Partial<InsertNews> = {
      updatedAt: new Date()
    };
    
    if (title !== undefined) updateData.title = title;
    if (content !== undefined) updateData.content = content;
    if (category !== undefined) updateData.category = category;
    if (isPublished !== undefined) updateData.isPublished = isPublished;
    
    const result = await db
      .update(newsEntries)
      .set(updateData)
      .where(eq(newsEntries.id, id))
      .returning();
    
    logger.info('News updated:', { id, title });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error updating news:', error);
    res.status(500).json({ error: 'Failed to update news' });
  }
});

// DELETE /api/news/:id - Delete news item
router.delete('/:id', ensureAuthenticated, hasPermission('news:delete'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid news ID' });
    }
    
    // Check if news exists
    const existing = await db
      .select()
      .from(newsEntries)
      .where(eq(newsEntries.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    await db
      .delete(newsEntries)
      .where(eq(newsEntries.id, id));
    
    logger.info('News deleted:', { id });
    res.json({ message: 'News deleted successfully' });
  } catch (error) {
    logger.error('Error deleting news:', error);
    res.status(500).json({ error: 'Failed to delete news' });
  }
});

// POST /api/news/:id/publish - Toggle publish status
router.post('/:id/publish', ensureAuthenticated, hasPermission('news:publish'), async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid news ID' });
    }
    
    // Get current status
    const existing = await db
      .select()
      .from(newsEntries)
      .where(eq(newsEntries.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'News not found' });
    }
    
    const newStatus = !existing[0].isPublished;
    
    const result = await db
      .update(newsEntries)
      .set({ 
        isPublished: newStatus,
        updatedAt: new Date()
      })
      .where(eq(newsEntries.id, id))
      .returning();
    
    logger.info('News publish status toggled:', { id, published: newStatus });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error toggling news publish status:', error);
    res.status(500).json({ error: 'Failed to toggle publish status' });
  }
});

// Notifications API
router.post('/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const { title, message, userId, type } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and message are required' });
    }
    if (!userId) {
      // Broadcast: insert for all users
      const allUsers = await db.select({ id: users.id }).from(users);
      const notifs = allUsers.map(u => ({
        title,
        message,
        userId: u.id,
        type: type || null,
        createdAt: new Date(),
      }));
      const result = await db.insert(notifications).values(notifs).returning();
      return res.status(201).json({ success: true, count: result.length });
    } else {
      // Single user
      const newNotif: InsertNotification = {
        title,
        message,
        userId,
        type: type || null,
        createdAt: new Date(),
      };
      const result = await db.insert(notifications).values(newNotif).returning();
      return res.status(201).json(result[0]);
    }
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

router.get('/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    const isAdmin = req.user.role === 'admin';
    const where = isAdmin ? undefined : (n: typeof notifications) => n.userId.eq(userId).or(n.userId.isNull());
    const notifs = await db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(notifications.createdAt.desc());
    res.json(notifs);
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

router.patch('/notifications/:id/read', ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });
    const userId = req.user.id;
    // Only allow marking as read if the user owns the notification or it's broadcast
    const notif = await db.select().from(notifications).where(notifications.id.eq(id)).limit(1);
    if (!notif.length || (notif[0].userId && notif[0].userId !== userId)) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    await db.update(notifications).set({ read: true }).where(notifications.id.eq(id));
    res.json({ success: true });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

router.patch('/notifications/read-all', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    // Mark all notifications for this user (including broadcasts) as read
    const result = await db.update(notifications)
      .set({ read: true })
      .where(
        notifications.userId.eq(userId).or(notifications.userId.isNull())
      );
    res.json({ success: true, count: result.rowCount || 0 });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all as read' });
  }
});

router.delete('/notifications/:id', ensureAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ error: 'Invalid notification ID' });
    const userId = req.user.id;
    // Only allow deleting if the user owns the notification or it's broadcast
    const notif = await db.select().from(notifications).where(notifications.id.eq(id)).limit(1);
    if (!notif.length || (notif[0].userId && notif[0].userId !== userId)) {
      return res.status(403).json({ error: 'Not allowed' });
    }
    await db.delete(notifications).where(notifications.id.eq(id));
    res.json({ success: true });
  } catch (error) {
    logger.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

router.delete('/notifications', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user.id;
    // Delete all notifications for this user (including broadcasts)
    const result = await db.delete(notifications)
      .where(
        notifications.userId.eq(userId).or(notifications.userId.isNull())
      );
    res.json({ success: true, count: result.rowCount || 0 });
  } catch (error) {
    logger.error('Error deleting all notifications:', error);
    res.status(500).json({ error: 'Failed to delete all notifications' });
  }
});

export default router;