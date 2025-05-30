import { Router } from 'express';
import { db } from '../db';
import { events, eventParticipation, users, type Event, type InsertEvent, type EventParticipation, type InsertEventParticipation } from '@shared/schema';
import { eq, desc, and, gte, lte, sql, asc } from 'drizzle-orm';
import * as logger from '../utils/logger';

const router = Router();

// GET /api/events - Get all events with pagination and filtering
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const eventType = req.query.eventType as string;
    const location = req.query.location as string;
    const startDate = req.query.startDate as string;
    const endDate = req.query.endDate as string;
    const upcoming = req.query.upcoming as string;
    
    const offset = (page - 1) * limit;
    
    // Build where conditions
    const conditions = [];
    
    if (eventType) {
      conditions.push(eq(events.eventType, eventType));
    }
    
    if (location) {
      conditions.push(sql`${events.location} ILIKE ${`%${location}%`}`);
    }
    
    if (startDate) {
      conditions.push(gte(events.startTime, new Date(startDate)));
    }
    
    if (endDate) {
      conditions.push(lte(events.startTime, new Date(endDate)));
    }
    
    if (upcoming === 'true') {
      conditions.push(gte(events.startTime, new Date()));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    // Get events with pagination
    const eventsList = await db
      .select()
      .from(events)
      .where(whereClause)
      .orderBy(asc(events.startTime))
      .limit(limit)
      .offset(offset);
    
    // Get total count for pagination
    const totalResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(events)
      .where(whereClause);
    
    const total = totalResult[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      events: eventsList,
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
    logger.error('Error fetching events:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// GET /api/events/upcoming - Get upcoming events (for dashboard)
router.get('/upcoming', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const now = new Date();

    // Check if events table exists and has data
    const upcomingEvents = await db
      .select()
      .from(events)
      .where(gte(events.startTime, now))
      .orderBy(asc(events.startTime))
      .limit(limit)
      .catch(() => []); // Return empty array if table doesn't exist or query fails

    res.json(upcomingEvents || []);
  } catch (error) {
    logger.error('Error fetching upcoming events:', error);
    // Return empty array instead of error to prevent frontend crashes
    res.json([]);
  }
});

// GET /api/events/types - Get all event types
router.get('/types', async (req, res) => {
  try {
    const types = await db
      .selectDistinct({ eventType: events.eventType })
      .from(events);
    
    res.json(types.map(t => t.eventType));
  } catch (error) {
    logger.error('Error fetching event types:', error);
    res.status(500).json({ error: 'Failed to fetch event types' });
  }
});

// GET /api/events/:id - Get single event with participants
router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // Get event details
    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    
    if (event.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Get participants
    const participants = await db
      .select({
        id: eventParticipation.id,
        userId: eventParticipation.userId,
        status: eventParticipation.status,
        completionStatus: eventParticipation.completionStatus,
        certificateUrl: eventParticipation.certificateUrl,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email
      })
      .from(eventParticipation)
      .leftJoin(users, eq(eventParticipation.userId, users.id))
      .where(eq(eventParticipation.eventId, id));
    
    res.json({
      ...event[0],
      participants
    });
  } catch (error) {
    logger.error('Error fetching event:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// POST /api/events - Create new event
router.post('/', async (req, res) => {
  try {
    const { title, description, eventType, location, startTime, endTime } = req.body;
    
    if (!title || !eventType || !startTime) {
      return res.status(400).json({ 
        error: 'Title, event type, and start time are required' 
      });
    }
    
    const newEvent: InsertEvent = {
      title,
      description,
      eventType,
      location,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null
    };
    
    const result = await db
      .insert(events)
      .values(newEvent)
      .returning();
    
    logger.info('Event created:', { id: result[0].id, title });
    res.status(201).json(result[0]);
  } catch (error) {
    logger.error('Error creating event:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { title, description, eventType, location, startTime, endTime } = req.body;
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // Check if event exists
    const existing = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    const updateData: Partial<InsertEvent> = {};
    
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (eventType !== undefined) updateData.eventType = eventType;
    if (location !== undefined) updateData.location = location;
    if (startTime !== undefined) updateData.startTime = new Date(startTime);
    if (endTime !== undefined) updateData.endTime = endTime ? new Date(endTime) : null;
    
    const result = await db
      .update(events)
      .set(updateData)
      .where(eq(events.id, id))
      .returning();
    
    logger.info('Event updated:', { id, title });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error updating event:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - Delete event
router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // Check if event exists
    const existing = await db
      .select()
      .from(events)
      .where(eq(events.id, id))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Delete event participation records first
    await db
      .delete(eventParticipation)
      .where(eq(eventParticipation.eventId, id));
    
    // Delete the event
    await db
      .delete(events)
      .where(eq(events.id, id));
    
    logger.info('Event deleted:', { id });
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    logger.error('Error deleting event:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

// POST /api/events/:id/register - Register user for event
router.post('/:id/register', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const { userId } = req.body;
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'User ID is required' });
    }
    
    // Check if event exists
    const event = await db
      .select()
      .from(events)
      .where(eq(events.id, eventId))
      .limit(1);
    
    if (event.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    // Check if user is already registered
    const existingRegistration = await db
      .select()
      .from(eventParticipation)
      .where(and(
        eq(eventParticipation.eventId, eventId),
        eq(eventParticipation.userId, userId)
      ))
      .limit(1);
    
    if (existingRegistration.length > 0) {
      return res.status(400).json({ error: 'User already registered for this event' });
    }
    
    const registration: InsertEventParticipation = {
      userId,
      eventId,
      status: 'registered'
    };
    
    const result = await db
      .insert(eventParticipation)
      .values(registration)
      .returning();
    
    logger.info('User registered for event:', { eventId, userId });
    res.status(201).json(result[0]);
  } catch (error) {
    logger.error('Error registering for event:', error);
    res.status(500).json({ error: 'Failed to register for event' });
  }
});

// PUT /api/events/:id/participants/:userId - Update participant status
router.put('/:id/participants/:userId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.params.userId;
    const { status, completionStatus, certificateUrl } = req.body;
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // Check if participation exists
    const existing = await db
      .select()
      .from(eventParticipation)
      .where(and(
        eq(eventParticipation.eventId, eventId),
        eq(eventParticipation.userId, userId)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Participation not found' });
    }
    
    const updateData: Partial<InsertEventParticipation> = {};
    
    if (status !== undefined) updateData.status = status;
    if (completionStatus !== undefined) updateData.completionStatus = completionStatus;
    if (certificateUrl !== undefined) updateData.certificateUrl = certificateUrl;
    
    const result = await db
      .update(eventParticipation)
      .set(updateData)
      .where(and(
        eq(eventParticipation.eventId, eventId),
        eq(eventParticipation.userId, userId)
      ))
      .returning();
    
    logger.info('Participant status updated:', { eventId, userId, status });
    res.json(result[0]);
  } catch (error) {
    logger.error('Error updating participant status:', error);
    res.status(500).json({ error: 'Failed to update participant status' });
  }
});

// DELETE /api/events/:id/participants/:userId - Remove participant
router.delete('/:id/participants/:userId', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    const userId = req.params.userId;
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    // Check if participation exists
    const existing = await db
      .select()
      .from(eventParticipation)
      .where(and(
        eq(eventParticipation.eventId, eventId),
        eq(eventParticipation.userId, userId)
      ))
      .limit(1);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Participation not found' });
    }
    
    await db
      .delete(eventParticipation)
      .where(and(
        eq(eventParticipation.eventId, eventId),
        eq(eventParticipation.userId, userId)
      ));
    
    logger.info('Participant removed from event:', { eventId, userId });
    res.json({ message: 'Participant removed successfully' });
  } catch (error) {
    logger.error('Error removing participant:', error);
    res.status(500).json({ error: 'Failed to remove participant' });
  }
});

// GET /api/events/:id/participants - Get event participants
router.get('/:id/participants', async (req, res) => {
  try {
    const eventId = parseInt(req.params.id);
    
    if (isNaN(eventId)) {
      return res.status(400).json({ error: 'Invalid event ID' });
    }
    
    const participants = await db
      .select({
        id: eventParticipation.id,
        userId: eventParticipation.userId,
        status: eventParticipation.status,
        completionStatus: eventParticipation.completionStatus,
        certificateUrl: eventParticipation.certificateUrl,
        userName: sql<string>`${users.firstName} || ' ' || ${users.lastName}`,
        userEmail: users.email,
        userRole: users.role
      })
      .from(eventParticipation)
      .leftJoin(users, eq(eventParticipation.userId, users.id))
      .where(eq(eventParticipation.eventId, eventId));
    
    res.json(participants);
  } catch (error) {
    logger.error('Error fetching event participants:', error);
    res.status(500).json({ error: 'Failed to fetch event participants' });
  }
});

export default router;