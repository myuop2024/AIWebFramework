import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { db } from '../db';
import { ensureAuthenticated } from '../middleware/auth';
import { 
  projects, 
  tasks, 
  milestones, 
  projectMembers, 
  taskCategories,
  taskComments,
  taskAttachments,
  taskHistory,
  users,
  insertProjectSchema,
  insertTaskSchema,
  insertMilestoneSchema,
  insertProjectMemberSchema,
  insertTaskCategorySchema,
  insertTaskCommentSchema,
  insertTaskHistorySchema,
  projectStatusEnum,
  taskStatusEnum,
  taskPriorityEnum
} from '@shared/schema';
import { eq, and, isNull, or, not, desc, asc, sql, inArray } from 'drizzle-orm';

export const projectManagementRouter = Router();

// We're using the global ensureAuthenticated middleware instead of a local one
// This provides consistent authentication behavior across the application

// Get users for project assignments
projectManagementRouter.get('/users', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('Fetching users for project management');
    
    // Only select necessary user information for dropdown selection
    const usersList = await db.select({
      id: users.id,
      username: users.username,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email
    })
    .from(users)
    // No filter needed - show all users since isActive might not be available in all user tables
    .orderBy(asc(users.lastName), asc(users.firstName));
    
    console.log(`Found ${usersList.length} active users`);
    
    res.json(usersList);
  } catch (error) {
    console.error('Error fetching users for project management:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get all projects (with filtering)
projectManagementRouter.get('/projects', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { status, search, userId } = req.query;
    
    let query = db.select().from(projects).where(eq(projects.deleted, false));
    
    // Apply filters
    if (status && Object.values(projectStatusEnum.enumValues).includes(status as any)) {
      query = query.where(eq(projects.status, status as any));
    }
    
    if (userId) {
      const userIdNum = parseInt(userId as string);
      if (!isNaN(userIdNum)) {
        // Get projects where user is a member
        const projectIds = await db.select({ id: projectMembers.projectId })
          .from(projectMembers)
          .where(eq(projectMembers.userId, userIdNum));
        
        if (projectIds.length > 0) {
          query = query.where(inArray(projects.id, projectIds.map(p => p.id)));
        } else {
          // User is not a member of any project
          return res.json([]);
        }
      }
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(
        or(
          sql`${projects.name} ILIKE ${searchTerm}`,
          sql`${projects.description} ILIKE ${searchTerm}`
        )
      );
    }
    
    // Add ordering
    query = query.orderBy(desc(projects.updatedAt));
    
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

// Special route to handle the "new" endpoint - redirects to the POST /projects endpoint
projectManagementRouter.patch('/projects/new', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('Received PATCH to /projects/new, redirecting to POST /projects');
    console.log('Request body:', JSON.stringify(req.body));
    const userId = req.session.userId;
    console.log('User ID from session:', userId);
    
    // Parse and validate the request body
    const validatedData = insertProjectSchema.parse({
      ...req.body,
      ownerId: userId,
    });
    console.log('Validated project data:', JSON.stringify(validatedData));
    
    // Insert the project
    const [createdProject] = await db.insert(projects).values(validatedData).returning();
    console.log('Project created successfully with ID:', createdProject.id);
    
    // Add the creator as a project member with role 'owner'
    await db.insert(projectMembers).values({
      projectId: createdProject.id,
      userId: userId,
      role: 'owner',
    });
    console.log(`Added user ${userId} as project owner for project ${createdProject.id}`);
    
    res.status(200).json(createdProject);
  } catch (error) {
    console.error('Error creating project via PATCH /projects/new:', error);
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', JSON.stringify(error.errors));
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// For consistency also handle GET /projects/new
projectManagementRouter.get('/projects/new', ensureAuthenticated, (req: Request, res: Response) => {
  console.log('GET request to /projects/new - returning empty object');
  res.json({}); 
});

// Get a specific project by ID
projectManagementRouter.get('/projects/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    const [project] = await db.select().from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.deleted, false)
      ));
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Get project members
    const members = await db.select({
      id: projectMembers.id,
      userId: projectMembers.userId,
      role: projectMembers.role,
      joinedAt: projectMembers.joinedAt,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username,
        email: users.email
      }
    })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(and(
      eq(projectMembers.projectId, projectId),
      eq(projectMembers.isActive, true)
    ));
    
    // Get milestones 
    const projectMilestones = await db.select().from(milestones)
      .where(eq(milestones.projectId, projectId))
      .orderBy(asc(milestones.sortOrder));
    
    // Get task counts by status
    const taskStats = await db.select({
      status: tasks.status,
      count: sql<number>`count(*)`,
    })
    .from(tasks)
    .where(eq(tasks.projectId, projectId))
    .groupBy(tasks.status);
    
    const result = {
      ...project,
      members,
      milestones: projectMilestones,
      taskStats: Object.fromEntries(taskStats.map(stat => [stat.status, stat.count]))
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project details' });
  }
});

// Create a new project
projectManagementRouter.post('/projects', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    console.log('Creating new project with data:', JSON.stringify(req.body));
    const userId = req.session.userId;
    console.log('User ID from session:', userId);
    
    // Handle date conversion - the client sends ISO strings, but the schema expects Date objects
    const bodyWithParsedDates = {
      ...req.body,
      ownerId: userId,
    };
    
    // Convert date strings to Date objects if they exist
    if (bodyWithParsedDates.startDate && typeof bodyWithParsedDates.startDate === 'string') {
      bodyWithParsedDates.startDate = new Date(bodyWithParsedDates.startDate);
      console.log('Converted startDate to Date object:', bodyWithParsedDates.startDate);
    }
    
    if (bodyWithParsedDates.endDate && typeof bodyWithParsedDates.endDate === 'string') {
      bodyWithParsedDates.endDate = new Date(bodyWithParsedDates.endDate);
      console.log('Converted endDate to Date object:', bodyWithParsedDates.endDate);
    }
    
    // Parse and validate the request body
    const validatedData = insertProjectSchema.parse(bodyWithParsedDates);
    console.log('Validated project data:', JSON.stringify(validatedData));
    
    // Insert the project
    const [createdProject] = await db.insert(projects).values(validatedData).returning();
    console.log('Project created successfully with ID:', createdProject.id);
    
    // Add the creator as a project member with role 'owner'
    await db.insert(projectMembers).values({
      projectId: createdProject.id,
      userId: userId,
      role: 'owner',
    });
    console.log(`Added user ${userId} as project owner for project ${createdProject.id}`);
    
    res.status(201).json(createdProject);
  } catch (error) {
    console.error('Error creating project:', error);
    if (error instanceof z.ZodError) {
      console.error('Validation errors:', JSON.stringify(error.errors));
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create project' });
  }
});

// Update a project
projectManagementRouter.patch('/projects/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // Check if project exists and user has permission
    const [project] = await db.select().from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.deleted, false)
      ));
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user is owner or has admin role
    const [membership] = await db.select().from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
        eq(projectMembers.isActive, true)
      ));
    
    if (!membership || (membership.role !== 'owner' && membership.role !== 'admin')) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    // Validate the update data
    const validatedData = insertProjectSchema.partial().parse(req.body);
    
    // Update the project
    const [updatedProject] = await db.update(projects)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId))
      .returning();
    
    res.json(updatedProject);
  } catch (error) {
    console.error('Error updating project:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update project' });
  }
});

// Soft delete a project
projectManagementRouter.delete('/projects/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // Check if project exists
    const [project] = await db.select().from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.deleted, false)
      ));
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check if user is owner
    const [membership] = await db.select().from(projectMembers)
      .where(and(
        eq(projectMembers.projectId, projectId),
        eq(projectMembers.userId, userId),
        eq(projectMembers.role, 'owner')
      ));
    
    if (!membership) {
      return res.status(403).json({ message: 'Permission denied' });
    }
    
    // Soft delete the project
    await db.update(projects)
      .set({
        deleted: true,
        updatedAt: new Date()
      })
      .where(eq(projects.id, projectId));
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// Get all tasks for a project
projectManagementRouter.get('/projects/:id/tasks', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const { status } = req.query;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    let query = db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      assigneeId: tasks.assigneeId,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      sortOrder: tasks.sortOrder,
      projectId: tasks.projectId,
      milestoneId: tasks.milestoneId,
      parentTaskId: tasks.parentTaskId,
      assignee: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username
      }
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.projectId, projectId));
    
    // Apply status filter if provided
    if (status && Object.values(taskStatusEnum.enumValues).includes(status as any)) {
      query = query.where(eq(tasks.status, status as any));
    }
    
    // Order tasks by sort order and then by creation date
    query = query.orderBy(asc(tasks.sortOrder), desc(tasks.createdAt));
    
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Create a new task in a project
projectManagementRouter.post('/projects/:id/tasks', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // Check if project exists
    const [project] = await db.select().from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.deleted, false)
      ));
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Validate task data
    const validatedData = insertTaskSchema.parse({
      ...req.body,
      projectId,
      reporterId: userId
    });
    
    // Create the task
    const [createdTask] = await db.insert(tasks).values(validatedData).returning();
    
    res.status(201).json(createdTask);
  } catch (error) {
    console.error('Error creating task:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create task' });
  }
});

// Get a specific task
projectManagementRouter.get('/tasks/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    const [task] = await db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
      reporterId: tasks.reporterId,
      milestoneId: tasks.milestoneId,
      parentTaskId: tasks.parentTaskId,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      estimatedHours: tasks.estimatedHours,
      actualHours: tasks.actualHours,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
      sortOrder: tasks.sortOrder,
      metadata: tasks.metadata,
      stationId: tasks.stationId,
      assignee: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username
      }
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Get comments
    const comments = await db.select({
      id: taskComments.id,
      content: taskComments.content,
      createdAt: taskComments.createdAt,
      isPrivate: taskComments.isPrivate,
      user: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username
      }
    })
    .from(taskComments)
    .innerJoin(users, eq(taskComments.userId, users.id))
    .where(eq(taskComments.taskId, taskId))
    .orderBy(asc(taskComments.createdAt));
    
    // Get attachments
    const attachments = await db.select().from(taskAttachments)
      .where(eq(taskAttachments.taskId, taskId));
    
    const result = {
      ...task,
      comments,
      attachments
    };
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Failed to fetch task details' });
  }
});

// Update a task
projectManagementRouter.patch('/tasks/:id', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    // Check if task exists
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Validate update data
    const validatedData = insertTaskSchema.partial().parse(req.body);
    
    // Update the task
    const [updatedTask] = await db.update(tasks)
      .set({
        ...validatedData,
        updatedAt: new Date()
      })
      .where(eq(tasks.id, taskId))
      .returning();
    
    // Save task history
    if (Object.keys(validatedData).length > 0) {
      // Create history records for each changed field
      const changedFields = Object.keys(validatedData).filter(
        field => validatedData[field as keyof typeof validatedData] !== task[field as keyof typeof task]
      );
      
      // Only add history records if task has changed
      if (changedFields.length > 0) {
        const historyData = changedFields.map(field => ({
          taskId: taskId,
          userId: userId,
          field: field,
          oldValue: JSON.stringify(task[field as keyof typeof task]),
          newValue: JSON.stringify(validatedData[field as keyof typeof validatedData])
        }));
        
        if (historyData.length > 0) {
          await db.insert(taskHistory).values(historyData);
        }
      }
    }
    
    res.json(updatedTask);
  } catch (error) {
    console.error('Error updating task:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to update task' });
  }
});

// Get tasks with filtering (for My Tasks page)
projectManagementRouter.get('/tasks', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const userId = req.session.userId;
    const { view = 'assigned', status, priority, page = '1', search, month } = req.query;
    const pageSize = 10;
    const pageNumber = parseInt(page as string) || 1;
    const offset = (pageNumber - 1) * pageSize;
    
    // If month is provided, return all tasks for that month (not paginated)
    if (month && typeof month === 'string' && /^\d{4}-\d{2}$/.test(month)) {
      const [year, monthNum] = month.split('-').map(Number);
      const startDate = new Date(year, monthNum - 1, 1);
      const endDate = new Date(year, monthNum, 0, 23, 59, 59, 999); // End of month
      let query = db.select({
        id: tasks.id,
        title: tasks.title,
        description: tasks.description,
        status: tasks.status,
        priority: tasks.priority,
        projectId: tasks.projectId,
        assigneeId: tasks.assigneeId,
        reporterId: tasks.reporterId,
        milestoneId: tasks.milestoneId,
        startDate: tasks.startDate,
        dueDate: tasks.dueDate,
        createdAt: tasks.createdAt,
        completedAt: tasks.completedAt,
        project: {
          id: projects.id,
          name: projects.name,
          color: projects.color
        },
        assignee: {
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          username: users.username
        }
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(and(
        eq(projects.deleted, false),
        eq(tasks.assigneeId, userId),
        sql`${tasks.dueDate} >= ${startDate} AND ${tasks.dueDate} <= ${endDate}`
      ))
      .orderBy(desc(tasks.dueDate));
      const tasksResult = await query;
      return res.json(tasksResult);
    }

    // Build base query
    let query = db.select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      status: tasks.status,
      priority: tasks.priority,
      projectId: tasks.projectId,
      assigneeId: tasks.assigneeId,
      reporterId: tasks.reporterId,
      milestoneId: tasks.milestoneId,
      startDate: tasks.startDate,
      dueDate: tasks.dueDate,
      createdAt: tasks.createdAt,
      completedAt: tasks.completedAt,
      project: {
        id: projects.id,
        name: projects.name,
        code: projects.code
      },
      assignee: {
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        username: users.username
      }
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(eq(projects.deleted, false));
    
    // Apply view filter
    if (view === 'assigned') {
      query = query.where(eq(tasks.assigneeId, userId));
    } else if (view === 'created') {
      query = query.where(eq(tasks.reporterId, userId));
    }
    
    // Apply status filter
    if (status && status !== 'all' && Object.values(taskStatusEnum.enumValues).includes(status as any)) {
      query = query.where(eq(tasks.status, status as any));
    }
    
    // Apply priority filter
    if (priority && priority !== 'all' && Object.values(taskPriorityEnum.enumValues).includes(priority as any)) {
      query = query.where(eq(tasks.priority, priority as any));
    }
    
    // Apply search filter
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(
        or(
          sql`${tasks.title} ILIKE ${searchTerm}`,
          sql`${tasks.description} ILIKE ${searchTerm}`
        )
      );
    }
    
    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .where(eq(projects.deleted, false));
    
    // Apply the same filters to count query
    if (view === 'assigned') {
      countQuery.where(eq(tasks.assigneeId, userId));
    } else if (view === 'created') {
      countQuery.where(eq(tasks.reporterId, userId));
    }
    
    if (status && status !== 'all' && Object.values(taskStatusEnum.enumValues).includes(status as any)) {
      countQuery.where(eq(tasks.status, status as any));
    }
    
    if (priority && priority !== 'all' && Object.values(taskPriorityEnum.enumValues).includes(priority as any)) {
      countQuery.where(eq(tasks.priority, priority as any));
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      countQuery.where(
        or(
          sql`${tasks.title} ILIKE ${searchTerm}`,
          sql`${tasks.description} ILIKE ${searchTerm}`
        )
      );
    }
    
    // Execute queries
    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Add pagination and ordering
    query = query.limit(pageSize).offset(offset)
      .orderBy(desc(tasks.updatedAt));
    
    const tasksResult = await query;
    
    res.json({
      tasks: tasksResult,
      page: pageNumber,
      pageSize,
      totalCount,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

// Get milestones with filtering
projectManagementRouter.get('/milestones', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const { status, project, page = '1', search } = req.query;
    const pageSize = 12; // For card grid layout
    const pageNumber = parseInt(page as string) || 1;
    const offset = (pageNumber - 1) * pageSize;
    
    // Build base query
    let query = db.select({
      id: milestones.id,
      name: milestones.name,
      description: milestones.description,
      projectId: milestones.projectId,
      dueDate: milestones.dueDate,
      completedAt: milestones.completedAt,
      status: milestones.status,
      createdAt: milestones.createdAt,
      updatedAt: milestones.updatedAt,
      sortOrder: milestones.sortOrder,
      project: {
        id: projects.id,
        name: projects.name,
        status: projects.status
      }
    })
    .from(milestones)
    .innerJoin(projects, eq(milestones.projectId, projects.id))
    .where(eq(projects.deleted, false));
    
    // Apply status filter
    if (status && status !== 'all') {
      query = query.where(eq(milestones.status, status as string));
    }
    
    // Apply project filter
    if (project && project !== 'all') {
      const projectId = parseInt(project as string);
      if (!isNaN(projectId)) {
        query = query.where(eq(milestones.projectId, projectId));
      }
    }
    
    // Apply search filter
    if (search) {
      const searchTerm = `%${search}%`;
      query = query.where(
        or(
          sql`${milestones.name} ILIKE ${searchTerm}`,
          sql`${milestones.description} ILIKE ${searchTerm}`
        )
      );
    }
    
    // Get total count for pagination
    const countQuery = db.select({ count: sql<number>`count(*)` })
      .from(milestones)
      .innerJoin(projects, eq(milestones.projectId, projects.id))
      .where(eq(projects.deleted, false));
    
    // Apply the same filters to count query
    if (status && status !== 'all') {
      countQuery.where(eq(milestones.status, status as string));
    }
    
    if (project && project !== 'all') {
      const projectId = parseInt(project as string);
      if (!isNaN(projectId)) {
        countQuery.where(eq(milestones.projectId, projectId));
      }
    }
    
    if (search) {
      const searchTerm = `%${search}%`;
      countQuery.where(
        or(
          sql`${milestones.name} ILIKE ${searchTerm}`,
          sql`${milestones.description} ILIKE ${searchTerm}`
        )
      );
    }
    
    // Execute count query
    const [countResult] = await countQuery;
    const totalCount = countResult?.count || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    
    // Add pagination and ordering
    query = query.limit(pageSize).offset(offset)
      .orderBy(asc(milestones.dueDate));
    
    const milestonesResult = await query;
    
    // For each milestone, get associated tasks to calculate progress
    const enhancedMilestones = await Promise.all(milestonesResult.map(async (milestone) => {
      const milestoneTasks = await db.select()
        .from(tasks)
        .where(eq(tasks.milestoneId, milestone.id));
      
      return {
        ...milestone,
        tasks: milestoneTasks
      };
    }));
    
    res.json({
      milestones: enhancedMilestones,
      page: pageNumber,
      pageSize,
      totalCount,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ message: 'Failed to fetch milestones' });
  }
});

projectManagementRouter.post('/tasks/:id/comments', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.session.userId;
    
    if (isNaN(taskId)) {
      return res.status(400).json({ message: 'Invalid task ID' });
    }
    
    // Check if task exists
    const [task] = await db.select().from(tasks).where(eq(tasks.id, taskId));
    
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }
    
    // Validate comment data
    const validatedData = insertTaskCommentSchema.parse({
      ...req.body,
      taskId,
      userId
    });
    
    // Create the comment
    const [comment] = await db.insert(taskComments).values(validatedData).returning();
    
    // Get the user info for the response
    const [userInfo] = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      username: users.username
    })
    .from(users)
    .where(eq(users.id, userId));
    
    const result = {
      ...comment,
      user: userInfo
    };
    
    res.status(201).json(result);
  } catch (error) {
    console.error('Error creating comment:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create comment' });
  }
});

// Create a milestone for a project
projectManagementRouter.post('/projects/:id/milestones', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: 'Invalid project ID' });
    }
    
    // Check if project exists
    const [project] = await db.select().from(projects)
      .where(and(
        eq(projects.id, projectId),
        eq(projects.deleted, false)
      ));
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Validate milestone data
    const validatedData = insertMilestoneSchema.parse({
      ...req.body,
      projectId
    });
    
    // Create the milestone
    const [milestone] = await db.insert(milestones).values(validatedData).returning();
    
    res.status(201).json(milestone);
  } catch (error) {
    console.error('Error creating milestone:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid data', errors: error.errors });
    }
    res.status(500).json({ message: 'Failed to create milestone' });
  }
});

// Analytics endpoint for projects
projectManagementRouter.get('/analytics/projects', ensureAuthenticated, async (req: Request, res: Response) => {
  try {
    // Get total projects count
    const [totalProjects] = await db.select({
      count: sql<number>`count(*)`
    })
    .from(projects)
    .where(eq(projects.deleted, false));
    
    // Get completed projects count
    const [completedProjects] = await db.select({
      count: sql<number>`count(*)`
    })
    .from(projects)
    .where(and(
      eq(projects.deleted, false),
      eq(projects.status, 'completed')
    ));
    
    // Get total tasks count
    const [totalTasks] = await db.select({
      count: sql<number>`count(*)`
    })
    .from(tasks);
    
    // Get completed tasks count
    const [completedTasks] = await db.select({
      count: sql<number>`count(*)`
    })
    .from(tasks)
    .where(eq(tasks.status, 'done'));
    
    // Get tasks by status
    const tasksByStatus = await db.select({
      status: tasks.status,
      count: sql<number>`count(*)`
    })
    .from(tasks)
    .groupBy(tasks.status);
    
    // Get tasks by priority
    const tasksByPriority = await db.select({
      priority: tasks.priority,
      count: sql<number>`count(*)`
    })
    .from(tasks)
    .groupBy(tasks.priority);
    
    // Get active users count (users with task assignments)
    const [activeUsers] = await db.select({
      count: sql<number>`count(distinct ${tasks.assigneeId})`
    })
    .from(tasks)
    .where(not(isNull(tasks.assigneeId)));
    
    // Format the data for the frontend
    const statusData = tasksByStatus.map(item => ({
      name: item.status === 'backlog' ? 'Backlog' :
           item.status === 'to_do' ? 'To Do' :
           item.status === 'in_progress' ? 'In Progress' :
           item.status === 'in_review' ? 'In Review' :
           'Done',
      value: Number(item.count),
      color: item.status === 'backlog' ? '#94a3b8' :
            item.status === 'to_do' ? '#60a5fa' :
            item.status === 'in_progress' ? '#f59e0b' :
            item.status === 'in_review' ? '#a78bfa' :
            '#10b981'
    }));
    
    const priorityData = tasksByPriority.map(item => ({
      name: item.priority === 'low' ? 'Low' :
           item.priority === 'medium' ? 'Medium' :
           item.priority === 'high' ? 'High' :
           'Urgent',
      value: Number(item.count),
      color: item.priority === 'low' ? '#94a3b8' :
            item.priority === 'medium' ? '#60a5fa' :
            item.priority === 'high' ? '#f59e0b' :
            '#ef4444'
    }));
    
    // Get top users by task completions
    const userAssignmentData = await db.execute<{
      name: string;
      completed: number;
      inProgress: number;
      todo: number;
    }>(sql`
      SELECT 
        CONCAT(u.first_name, ' ', LEFT(u.last_name, 1), '.') AS name,
        COUNT(CASE WHEN t.status = 'done' THEN 1 ELSE NULL END) AS completed,
        COUNT(CASE WHEN t.status = 'in_progress' THEN 1 ELSE NULL END) AS "inProgress",
        COUNT(CASE WHEN t.status IN ('backlog', 'to_do') THEN 1 ELSE NULL END) AS todo
      FROM tasks t
      JOIN users u ON t.assignee_id = u.id
      WHERE t.assignee_id IS NOT NULL
      GROUP BY u.id, u.first_name, u.last_name
      ORDER BY completed DESC
      LIMIT 5
    `);
    
    // Get weekly tasks and completion data
    const sixWeeksAgo = new Date();
    sixWeeksAgo.setDate(sixWeeksAgo.getDate() - 6 * 7); // Go back 6 weeks
    
    // Get data for task creation and completion by week
    const weeklyTaskData = await db.execute<{
      week_name: string;
      week_start: string;
      tasks: number;
      completed: number;
    }>(sql`
      WITH weeks AS (
        SELECT 
          generate_series(
            date_trunc('week', ${sixWeeksAgo}::timestamp),
            date_trunc('week', current_date),
            '1 week'::interval
          ) AS week_start
      ),
      task_counts AS (
        SELECT 
          date_trunc('week', created_at) AS week_start,
          COUNT(*) AS tasks_created
        FROM tasks
        WHERE created_at >= ${sixWeeksAgo}::timestamp
        GROUP BY week_start
      ),
      completion_counts AS (
        SELECT 
          date_trunc('week', completed_at) AS week_start,
          COUNT(*) AS tasks_completed
        FROM tasks
        WHERE 
          completed_at IS NOT NULL AND
          completed_at >= ${sixWeeksAgo}::timestamp
        GROUP BY week_start
      )
      SELECT 
        to_char(w.week_start, 'Mon DD') AS week_name,
        w.week_start::text,
        COALESCE(tc.tasks_created, 0) AS tasks,
        COALESCE(cc.tasks_completed, 0) AS completed
      FROM weeks w
      LEFT JOIN task_counts tc ON w.week_start = tc.week_start
      LEFT JOIN completion_counts cc ON w.week_start = cc.week_start
      ORDER BY w.week_start
    `);
    
    // Format the weekly data
    const progressData = Array.isArray(weeklyTaskData) ? weeklyTaskData.map((week: {
      week_name: string;
      week_start: string;
      tasks: number;
      completed: number;
    }) => ({
      name: week.week_name,
      tasks: Number(week.tasks),
      completed: Number(week.completed)
    })) : [];
    
    res.json({
      totalProjects: Number(totalProjects.count),
      completedProjects: Number(completedProjects.count),
      totalTasks: Number(totalTasks.count),
      completedTasks: Number(completedTasks.count),
      activeUsers: Number(activeUsers.count),
      statusData,
      priorityData,
      progressData,
      userAssignmentData
    });
  } catch (error) {
    console.error('Error fetching project analytics:', error);
    res.status(500).json({ message: 'Failed to fetch analytics' });
  }
});

export default projectManagementRouter;