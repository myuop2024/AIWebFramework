import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ensureAdmin, ensureAuthenticated, hasPermission } from "../middleware/auth";
import logger from "../utils/logger";
import { type Group, type GroupMembership } from "@shared/schema";

const groupRouter = Router();

// Create group schema
const createGroupSchema = z.object({
  name: z.string().min(2, { message: "Group name must be at least 2 characters" }),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  members: z.array(z.number()).optional(),
});

// Update group schema
const updateGroupSchema = z.object({
  name: z.string().min(2, { message: "Group name must be at least 2 characters" }).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  members: z.array(z.number()).optional(),
});

// Add/Remove member schema
const membershipSchema = z.object({
  userId: z.number(),
});

// Get all groups
groupRouter.get("/admin/groups", ensureAuthenticated, hasPermission('groups:view'), async (req, res) => {
  try {
    const groups = await storage.getAllGroups();
    res.json(groups);
  } catch (error) {
    logger.error("Error fetching groups:", error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to fetch groups", details: error instanceof Error ? error.message : String(error) });
  }
});

// Get group by ID
groupRouter.get("/admin/groups/:id", ensureAuthenticated, hasPermission('groups:view'), async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const group = await storage.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: "Group not found" });
    }

    res.json(group);
  } catch (error) {
    logger.error("Error fetching group:", error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to fetch group", details: error instanceof Error ? error.message : String(error) });
  }
});

// Create new group
groupRouter.post("/admin/groups", ensureAuthenticated, hasPermission('groups:create'), async (req, res) => {
  try {
    const validatedData = createGroupSchema.parse(req.body);
    
    const group = await storage.createGroup({
      name: validatedData.name,
      description: validatedData.description || "",
      permissions: validatedData.permissions || [],
      createdBy: req.user?.id,
    });

    // Add members if provided
    if (validatedData.members && validatedData.members.length > 0) {
      await storage.addGroupMembers(group.id, validatedData.members, req.user?.id);
    }

    // Return group with members
    const groupWithMembers = await storage.getGroupById(group.id);
    res.status(201).json(groupWithMembers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    logger.error("Error creating group:", error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to create group", details: error instanceof Error ? error.message : String(error) });
  }
});

// Update group
groupRouter.patch("/admin/groups/:id", ensureAuthenticated, hasPermission('groups:edit'), async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const existingGroup = await storage.getGroupById(groupId);
    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    const validatedData = updateGroupSchema.parse(req.body);

    // Handle group info updates
    const updatePayload: Partial<Omit<Group, 'id' | 'createdAt' | 'updatedAt' | 'createdBy'>> = {};
    if (validatedData.name) updatePayload.name = validatedData.name;
    if (validatedData.description !== undefined) updatePayload.description = validatedData.description;
    if (validatedData.permissions !== undefined) updatePayload.permissions = validatedData.permissions;

    let updatedGroup = existingGroup;
    if (Object.keys(updatePayload).length > 0) {
      updatedGroup = await storage.updateGroup(groupId, updatePayload);
      if (!updatedGroup) {
        return res.status(404).json({ message: "Group not found or failed to update" });
      }
    }

    // Handle member updates
    if (validatedData.members !== undefined) {
      await storage.setGroupMembers(groupId, validatedData.members, req.user?.id);
    }

    // Return updated group with members
    const groupWithMembers = await storage.getGroupById(groupId);
    res.json(groupWithMembers);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    logger.error(`Error updating group ${req.params.id}:`, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to update group", details: error instanceof Error ? error.message : String(error) });
  }
});

// Delete group
groupRouter.delete("/admin/groups/:id", ensureAuthenticated, hasPermission('groups:delete'), async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const existingGroup = await storage.getGroupById(groupId);
    if (!existingGroup) {
      return res.status(404).json({ message: "Group not found" });
    }

    const success = await storage.deleteGroup(groupId);
    if (success) {
      res.status(204).send();
    } else {
      return res.status(404).json({ message: "Group not found or could not be deleted" });
    }
  } catch (error) {
    logger.error(`Error deleting group ${req.params.id}:`, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to delete group", details: error instanceof Error ? error.message : String(error) });
  }
});

// Add member to group
groupRouter.post("/admin/groups/:id/members", ensureAuthenticated, hasPermission('groups:edit'), async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const validatedData = membershipSchema.parse(req.body);

    const membership = await storage.addGroupMember(groupId, validatedData.userId, req.user?.id);
    res.status(201).json(membership);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    logger.error(`Error adding member to group ${req.params.id}:`, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to add member to group", details: error instanceof Error ? error.message : String(error) });
  }
});

// Remove member from group
groupRouter.delete("/admin/groups/:id/members/:userId", ensureAuthenticated, hasPermission('groups:edit'), async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);
    
    if (isNaN(groupId) || isNaN(userId)) {
      return res.status(400).json({ message: "Invalid group ID or user ID" });
    }

    const success = await storage.removeGroupMember(groupId, userId);
    if (success) {
      res.status(204).send();
    } else {
      return res.status(404).json({ message: "Membership not found" });
    }
  } catch (error) {
    logger.error(`Error removing member from group ${req.params.id}:`, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to remove member from group", details: error instanceof Error ? error.message : String(error) });
  }
});

// Get group members
groupRouter.get("/admin/groups/:id/members", ensureAuthenticated, hasPermission('groups:view'), async (req, res) => {
  try {
    const groupId = parseInt(req.params.id);
    if (isNaN(groupId)) {
      return res.status(400).json({ message: "Invalid group ID" });
    }

    const members = await storage.getGroupMembers(groupId);
    res.json(members);
  } catch (error) {
    logger.error(`Error fetching group members for group ${req.params.id}:`, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to fetch group members", details: error instanceof Error ? error.message : String(error) });
  }
});

export default groupRouter; 