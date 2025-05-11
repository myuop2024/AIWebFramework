import express from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { 
  insertProjectSchema, 
  insertTaskSchema, 
  insertMilestoneSchema,
  insertTaskCategorySchema,
  insertTaskCommentSchema,
  insertProjectMemberSchema,
  insertTaskCategoryAssignmentSchema,
  insertTaskAttachmentSchema
} from '@shared/schema';
import { ensureAuthenticated, ensureAdmin, ensureSupervisor } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure multer for task attachment uploads
const attachmentStorage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(process.cwd(), 'uploads', 'tasks');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, 'task-attachment-' + uniqueSuffix + ext);
  }
});

const uploadAttachment = multer({ 
  storage: attachmentStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

const router = express.Router();

// Projects routes
router.get('/projects', ensureAuthenticated, async (req, res) => {
  try {
    const filters = {
      status: req.query.status as string | undefined,
      ownerId: req.query.ownerId ? parseInt(req.query.ownerId as string) : undefined,
      deleted: req.query.deleted === 'true' ? true : false
    };
    
    // Storage methods will be implemented later
    // const projects = await storage.getAllProjects(filters);
    // res.json(projects);
    
    // For now, return empty array until storage methods are implemented
    res.json([]);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ message: 'Failed to fetch projects' });
  }
});

router.get('/projects/:id', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const project = await storage.getProject(projectId);
    
    // For now, return empty object until storage methods are implemented
    // if (!project) {
    //   return res.status(404).json({ message: 'Project not found' });
    // }
    
    res.json({});
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ message: 'Failed to fetch project' });
  }
});

router.post('/projects', ensureSupervisor, async (req, res) => {
  try {
    const validatedData = insertProjectSchema.parse(req.body);
    // Storage methods will be implemented later
    // const newProject = await storage.createProject(validatedData);
    // res.status(201).json(newProject);
    
    // For now, return success message until storage methods are implemented
    res.status(201).json({ message: 'Project created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid project data', errors: error.errors });
    }
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Failed to create project' });
  }
});

router.patch('/projects/:id', ensureSupervisor, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const updatedProject = await storage.updateProject(projectId, req.body);
    
    // For now, return success message until storage methods are implemented
    // if (!updatedProject) {
    //   return res.status(404).json({ message: 'Project not found' });
    // }
    
    res.json({ message: 'Project updated successfully' });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ message: 'Failed to update project' });
  }
});

router.delete('/projects/:id', ensureSupervisor, async (req, res) => {
  try {
    const projectId = parseInt(req.params.id);
    const hardDelete = req.query.hard === 'true';
    // Storage methods will be implemented later
    // const result = await storage.deleteProject(projectId, hardDelete);
    
    // For now, return success message until storage methods are implemented
    // if (!result) {
    //   return res.status(404).json({ message: 'Project not found' });
    // }
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ message: 'Failed to delete project' });
  }
});

// Project members routes
router.get('/projects/:projectId/members', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    // Storage methods will be implemented later
    // const members = await storage.getProjectMembers(projectId);
    res.json([]);
  } catch (error) {
    console.error('Error fetching project members:', error);
    res.status(500).json({ message: 'Failed to fetch project members' });
  }
});

router.post('/projects/:projectId/members', ensureSupervisor, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const validatedData = insertProjectMemberSchema.parse({
      ...req.body,
      projectId
    });
    
    // Storage methods will be implemented later
    // const newMember = await storage.addProjectMember(validatedData);
    res.status(201).json({ message: 'Member added to project successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid member data', errors: error.errors });
    }
    console.error('Error adding project member:', error);
    res.status(500).json({ message: 'Failed to add project member' });
  }
});

router.patch('/project-members/:id', ensureSupervisor, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const updatedMember = await storage.updateProjectMember(memberId, req.body);
    
    // if (!updatedMember) {
    //   return res.status(404).json({ message: 'Project member not found' });
    // }
    
    res.json({ message: 'Project member updated successfully' });
  } catch (error) {
    console.error('Error updating project member:', error);
    res.status(500).json({ message: 'Failed to update project member' });
  }
});

router.delete('/project-members/:id', ensureSupervisor, async (req, res) => {
  try {
    const memberId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const result = await storage.removeProjectMember(memberId);
    
    // if (!result) {
    //   return res.status(404).json({ message: 'Project member not found' });
    // }
    
    res.json({ message: 'Member removed from project successfully' });
  } catch (error) {
    console.error('Error removing project member:', error);
    res.status(500).json({ message: 'Failed to remove project member' });
  }
});

// Tasks routes
router.get('/projects/:projectId/tasks', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const filters = {
      status: req.query.status as string | undefined,
      assigneeId: req.query.assigneeId ? parseInt(req.query.assigneeId as string) : undefined,
      milestoneId: req.query.milestoneId ? parseInt(req.query.milestoneId as string) : undefined,
      priority: req.query.priority as string | undefined
    };
    
    // Storage methods will be implemented later
    // const tasks = await storage.getTasksForProject(projectId, filters);
    res.json([]);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

router.get('/tasks/:id', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const task = await storage.getTask(taskId);
    
    // if (!task) {
    //   return res.status(404).json({ message: 'Task not found' });
    // }
    
    res.json({});
  } catch (error) {
    console.error('Error fetching task:', error);
    res.status(500).json({ message: 'Failed to fetch task' });
  }
});

router.get('/my-tasks', ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.session.userId!;
    const filters = {
      status: req.query.status as string | undefined,
      projectId: req.query.projectId ? parseInt(req.query.projectId as string) : undefined
    };
    
    // Storage methods will be implemented later
    // const tasks = await storage.getTasksForUser(userId, filters);
    res.json([]);
  } catch (error) {
    console.error('Error fetching user tasks:', error);
    res.status(500).json({ message: 'Failed to fetch tasks' });
  }
});

router.post('/projects/:projectId/tasks', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const validatedData = insertTaskSchema.parse({
      ...req.body,
      projectId,
      reporterId: req.session.userId
    });
    
    // Storage methods will be implemented later
    // const newTask = await storage.createTask(validatedData);
    res.status(201).json({ message: 'Task created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid task data', errors: error.errors });
    }
    console.error('Error creating task:', error);
    res.status(500).json({ message: 'Failed to create task' });
  }
});

router.patch('/tasks/:id', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    const userId = req.session.userId!;
    // Storage methods will be implemented later
    // const updatedTask = await storage.updateTask(taskId, req.body, userId);
    
    // if (!updatedTask) {
    //   return res.status(404).json({ message: 'Task not found' });
    // }
    
    res.json({ message: 'Task updated successfully' });
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ message: 'Failed to update task' });
  }
});

router.delete('/tasks/:id', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const result = await storage.deleteTask(taskId);
    
    // if (!result) {
    //   return res.status(404).json({ message: 'Task not found' });
    // }
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error deleting task:', error);
    res.status(500).json({ message: 'Failed to delete task' });
  }
});

// Task categories routes
router.get('/projects/:projectId/categories', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    // Storage methods will be implemented later
    // const categories = await storage.getTaskCategoriesForProject(projectId);
    res.json([]);
  } catch (error) {
    console.error('Error fetching task categories:', error);
    res.status(500).json({ message: 'Failed to fetch task categories' });
  }
});

router.get('/task-categories/global', ensureAuthenticated, async (req, res) => {
  try {
    // Storage methods will be implemented later
    // const categories = await storage.getGlobalTaskCategories();
    res.json([]);
  } catch (error) {
    console.error('Error fetching global task categories:', error);
    res.status(500).json({ message: 'Failed to fetch global task categories' });
  }
});

router.post('/task-categories', ensureSupervisor, async (req, res) => {
  try {
    const validatedData = insertTaskCategorySchema.parse(req.body);
    // Storage methods will be implemented later
    // const newCategory = await storage.createTaskCategory(validatedData);
    res.status(201).json({ message: 'Task category created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid category data', errors: error.errors });
    }
    console.error('Error creating task category:', error);
    res.status(500).json({ message: 'Failed to create task category' });
  }
});

router.patch('/task-categories/:id', ensureSupervisor, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const updatedCategory = await storage.updateTaskCategory(categoryId, req.body);
    
    // if (!updatedCategory) {
    //   return res.status(404).json({ message: 'Task category not found' });
    // }
    
    res.json({ message: 'Task category updated successfully' });
  } catch (error) {
    console.error('Error updating task category:', error);
    res.status(500).json({ message: 'Failed to update task category' });
  }
});

router.delete('/task-categories/:id', ensureSupervisor, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const result = await storage.deleteTaskCategory(categoryId);
    
    // if (!result) {
    //   return res.status(404).json({ message: 'Task category not found' });
    // }
    
    res.json({ message: 'Task category deleted successfully' });
  } catch (error) {
    console.error('Error deleting task category:', error);
    res.status(500).json({ message: 'Failed to delete task category' });
  }
});

// Task category assignments
router.get('/tasks/:taskId/categories', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    // Storage methods will be implemented later
    // const categories = await storage.getTaskCategories(taskId);
    res.json([]);
  } catch (error) {
    console.error('Error fetching task categories:', error);
    res.status(500).json({ message: 'Failed to fetch task categories' });
  }
});

router.post('/tasks/:taskId/categories', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const categoryId = parseInt(req.body.categoryId);
    
    const validatedData = insertTaskCategoryAssignmentSchema.parse({
      taskId,
      categoryId
    });
    
    // Storage methods will be implemented later
    // const assignment = await storage.assignCategoryToTask(validatedData);
    res.status(201).json({ message: 'Category assigned to task successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid category assignment data', errors: error.errors });
    }
    console.error('Error assigning category to task:', error);
    res.status(500).json({ message: 'Failed to assign category to task' });
  }
});

router.delete('/tasks/:taskId/categories/:categoryId', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const categoryId = parseInt(req.params.categoryId);
    
    // Storage methods will be implemented later
    // const result = await storage.removeCategoryFromTask(taskId, categoryId);
    
    // if (!result) {
    //   return res.status(404).json({ message: 'Category assignment not found' });
    // }
    
    res.json({ message: 'Category removed from task successfully' });
  } catch (error) {
    console.error('Error removing category from task:', error);
    res.status(500).json({ message: 'Failed to remove category from task' });
  }
});

// Milestones routes
router.get('/projects/:projectId/milestones', ensureAuthenticated, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    // Storage methods will be implemented later
    // const milestones = await storage.getMilestonesForProject(projectId);
    res.json([]);
  } catch (error) {
    console.error('Error fetching milestones:', error);
    res.status(500).json({ message: 'Failed to fetch milestones' });
  }
});

router.get('/milestones/:id', ensureAuthenticated, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const milestone = await storage.getMilestone(milestoneId);
    
    // if (!milestone) {
    //   return res.status(404).json({ message: 'Milestone not found' });
    // }
    
    res.json({});
  } catch (error) {
    console.error('Error fetching milestone:', error);
    res.status(500).json({ message: 'Failed to fetch milestone' });
  }
});

router.post('/projects/:projectId/milestones', ensureSupervisor, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const validatedData = insertMilestoneSchema.parse({
      ...req.body,
      projectId
    });
    
    // Storage methods will be implemented later
    // const newMilestone = await storage.createMilestone(validatedData);
    res.status(201).json({ message: 'Milestone created successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid milestone data', errors: error.errors });
    }
    console.error('Error creating milestone:', error);
    res.status(500).json({ message: 'Failed to create milestone' });
  }
});

router.patch('/milestones/:id', ensureSupervisor, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const updatedMilestone = await storage.updateMilestone(milestoneId, req.body);
    
    // if (!updatedMilestone) {
    //   return res.status(404).json({ message: 'Milestone not found' });
    // }
    
    res.json({ message: 'Milestone updated successfully' });
  } catch (error) {
    console.error('Error updating milestone:', error);
    res.status(500).json({ message: 'Failed to update milestone' });
  }
});

router.delete('/milestones/:id', ensureSupervisor, async (req, res) => {
  try {
    const milestoneId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const result = await storage.deleteMilestone(milestoneId);
    
    // if (!result) {
    //   return res.status(404).json({ message: 'Milestone not found' });
    // }
    
    res.json({ message: 'Milestone deleted successfully' });
  } catch (error) {
    console.error('Error deleting milestone:', error);
    res.status(500).json({ message: 'Failed to delete milestone' });
  }
});

// Task comments routes
router.get('/tasks/:taskId/comments', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    // Storage methods will be implemented later
    // const comments = await storage.getTaskComments(taskId);
    res.json([]);
  } catch (error) {
    console.error('Error fetching task comments:', error);
    res.status(500).json({ message: 'Failed to fetch task comments' });
  }
});

router.post('/tasks/:taskId/comments', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    const userId = req.session.userId!;
    
    const validatedData = insertTaskCommentSchema.parse({
      ...req.body,
      taskId,
      userId
    });
    
    // Storage methods will be implemented later
    // const newComment = await storage.addTaskComment(validatedData);
    res.status(201).json({ message: 'Comment added to task successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid comment data', errors: error.errors });
    }
    console.error('Error adding task comment:', error);
    res.status(500).json({ message: 'Failed to add task comment' });
  }
});

router.patch('/task-comments/:id', ensureAuthenticated, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const updatedComment = await storage.updateTaskComment(commentId, req.body);
    
    // if (!updatedComment) {
    //   return res.status(404).json({ message: 'Task comment not found' });
    // }
    
    res.json({ message: 'Task comment updated successfully' });
  } catch (error) {
    console.error('Error updating task comment:', error);
    res.status(500).json({ message: 'Failed to update task comment' });
  }
});

router.delete('/task-comments/:id', ensureAuthenticated, async (req, res) => {
  try {
    const commentId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const result = await storage.deleteTaskComment(commentId);
    
    // if (!result) {
    //   return res.status(404).json({ message: 'Task comment not found' });
    // }
    
    res.json({ message: 'Task comment deleted successfully' });
  } catch (error) {
    console.error('Error deleting task comment:', error);
    res.status(500).json({ message: 'Failed to delete task comment' });
  }
});

// Task attachments routes
router.get('/tasks/:taskId/attachments', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    // Storage methods will be implemented later
    // const attachments = await storage.getTaskAttachments(taskId);
    res.json([]);
  } catch (error) {
    console.error('Error fetching task attachments:', error);
    res.status(500).json({ message: 'Failed to fetch task attachments' });
  }
});

router.post('/tasks/:taskId/attachments', ensureAuthenticated, uploadAttachment.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const taskId = parseInt(req.params.taskId);
    const userId = req.session.userId!;
    
    const attachmentData = {
      taskId,
      userId,
      filename: req.file.filename,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      description: req.body.description || ''
    };
    
    const validatedData = insertTaskAttachmentSchema.parse(attachmentData);
    
    // Storage methods will be implemented later
    // const newAttachment = await storage.addTaskAttachment(validatedData);
    
    res.status(201).json({ message: 'Attachment added successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid attachment data', errors: error.errors });
    }
    console.error('Error adding task attachment:', error);
    res.status(500).json({ message: 'Failed to add task attachment' });
  }
});

router.delete('/task-attachments/:id', ensureAuthenticated, async (req, res) => {
  try {
    const attachmentId = parseInt(req.params.id);
    // Storage methods will be implemented later
    // const result = await storage.deleteTaskAttachment(attachmentId);
    
    // if (!result) {
    //   return res.status(404).json({ message: 'Task attachment not found' });
    // }
    
    res.json({ message: 'Task attachment deleted successfully' });
  } catch (error) {
    console.error('Error deleting task attachment:', error);
    res.status(500).json({ message: 'Failed to delete task attachment' });
  }
});

// Task history routes
router.get('/tasks/:taskId/history', ensureAuthenticated, async (req, res) => {
  try {
    const taskId = parseInt(req.params.taskId);
    // Storage methods will be implemented later
    // const history = await storage.getTaskHistory(taskId);
    res.json([]);
  } catch (error) {
    console.error('Error fetching task history:', error);
    res.status(500).json({ message: 'Failed to fetch task history' });
  }
});

export default router;