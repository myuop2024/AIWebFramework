import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ensureAdmin, ensureAuthenticated, hasPermission } from "../middleware/auth";
import logger from "../utils/logger";
import { type Role } from "@shared/schema";

const roleRouter = Router();

// Create role schema
const createRoleSchema = z.object({
  name: z.string().min(2, { message: "Role name must be at least 2 characters" }),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

// Update role schema
const updateRoleSchema = z.object({
  name: z.string().min(2, { message: "Role name must be at least 2 characters" }).optional(),
  description: z.string().optional(),
  permissions: z.array(z.string()).optional(),
});

// Get all roles
roleRouter.get("/admin/roles", ensureAuthenticated, hasPermission('roles:view'), async (req, res) => {
  try {
    const roles = await storage.getAllRoles();
    res.json(roles);
  } catch (error) {
    logger.error("Error fetching roles:", error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to fetch roles", details: error instanceof Error ? error.message : String(error) });
  }
});

// Get role by ID
roleRouter.get("/admin/roles/:id", ensureAuthenticated, hasPermission('roles:view'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      return res.status(400).json({ message: "Invalid role ID" });
    }

    const role = await storage.getRoleById(roleId);
    if (!role) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(role);
  } catch (error) {
    logger.error("Error fetching role:", error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to fetch role", details: error instanceof Error ? error.message : String(error) });
  }
});

// Create new role
roleRouter.post("/admin/roles", ensureAuthenticated, hasPermission('roles:create'), async (req, res) => {
  try {
    const validatedData = createRoleSchema.parse(req.body);
    
    const role = await storage.createRole({
      name: validatedData.name,
      description: validatedData.description || "",
      permissions: validatedData.permissions || [],
      isSystem: false,
    });

    res.status(201).json(role);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    logger.error("Error creating role:", error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to create role", details: error instanceof Error ? error.message : String(error) });
  }
});

// Update role
roleRouter.patch("/admin/roles/:id", ensureAuthenticated, hasPermission('roles:edit'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      return res.status(400).json({ message: "Invalid role ID" });
    }

    // Check if the role exists
    const existingRole = await storage.getRoleById(roleId);
    if (!existingRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Prevent modification of system roles (except permissions)
    if (existingRole.isSystem && (req.body.name || req.body.description !== undefined)) {
      return res.status(403).json({ 
        message: "System roles cannot be renamed or have their descriptions modified directly via this endpoint logic. Only permissions can be changed for system roles through storage.updateRole."
      });
    }

    const validatedData = updateRoleSchema.parse(req.body);

    // Construct the update payload explicitly
    const updatePayload: Partial<Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'isSystem'>> & { permissions?: string[] } = {};
    if (validatedData.name) updatePayload.name = validatedData.name;
    if (validatedData.description !== undefined) updatePayload.description = validatedData.description;
    if (validatedData.permissions !== undefined) updatePayload.permissions = validatedData.permissions;

    // Only pass defined fields to updateRole to avoid accidentally overwriting with undefined
    if (Object.keys(updatePayload).length === 0) {
      return res.status(400).json({ message: "No update data provided." });
    }
    
    const updatedRole = await storage.updateRole(roleId, updatePayload);
    if (!updatedRole) {
      // This case might occur if updateRole returns undefined (e.g., role not found by storage.updateRole itself)
      return res.status(404).json({ message: "Role not found or failed to update" });
    }

    res.json(updatedRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    logger.error(`Error updating role ${req.params.id}:`, error instanceof Error ? error : new Error(String(error)));
    res.status(500).json({ message: "Failed to update role", details: error instanceof Error ? error.message : String(error) });
  }
});

// Delete role
roleRouter.delete("/admin/roles/:id", ensureAuthenticated, hasPermission('roles:delete'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    if (isNaN(roleId)) {
      return res.status(400).json({ message: "Invalid role ID" });
    }

    // Check if the role exists
    const existingRole = await storage.getRoleById(roleId);
    if (!existingRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    // Prevent deletion of system roles - this is an early check, storage.deleteRole also enforces this.
    if (existingRole.isSystem) {
      return res.status(403).json({ message: "System roles cannot be deleted" });
    }

    // The storage.deleteRole method now throws specific errors for system roles or roles in use.
    const success = await storage.deleteRole(roleId);
    if (success) { // This will likely not be reached if deleteRole throws on failure conditions it handles
      res.status(204).send();
    } else {
      // This path might be less common if deleteRole throws.
      // Consider the case where it might return false without throwing (e.g. role not found initially by its own getRoleById).
      return res.status(404).json({ message: "Role not found or could not be deleted" });
    }
  } catch (error) {
    logger.error(`Error deleting role ${req.params.id}:`, error instanceof Error ? error : new Error(String(error)));
    // Handle specific errors thrown by storage.deleteRole
    if (error instanceof Error && (error.message.includes("System roles cannot be deleted") || error.message.includes("Cannot delete role"))) {
        return res.status(403).json({ message: error.message });
    }
    res.status(500).json({ message: "Failed to delete role", details: error instanceof Error ? error.message : String(error) });
  }
});

export default roleRouter;