import { Router } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ensureAdmin, ensureAuthenticated } from "../middleware/auth";

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
roleRouter.get("/admin/roles", ensureAuthenticated, ensureAdmin, async (req, res) => {
  try {
    const roles = await storage.getAllRoles();
    res.json(roles);
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({ message: "Failed to fetch roles" });
  }
});

// Get role by ID
roleRouter.get("/admin/roles/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
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
    console.error("Error fetching role:", error);
    res.status(500).json({ message: "Failed to fetch role" });
  }
});

// Create new role
roleRouter.post("/admin/roles", ensureAuthenticated, ensureAdmin, async (req, res) => {
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
    console.error("Error creating role:", error);
    res.status(500).json({ message: "Failed to create role" });
  }
});

// Update role
roleRouter.patch("/admin/roles/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
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
        message: "System roles cannot be renamed or have their descriptions modified" 
      });
    }

    const validatedData = updateRoleSchema.parse(req.body);
    
    const updatedRole = await storage.updateRole(roleId, validatedData);
    if (!updatedRole) {
      return res.status(404).json({ message: "Role not found" });
    }

    res.json(updatedRole);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Validation error", errors: error.errors });
    }
    console.error("Error updating role:", error);
    res.status(500).json({ message: "Failed to update role" });
  }
});

// Delete role
roleRouter.delete("/admin/roles/:id", ensureAuthenticated, ensureAdmin, async (req, res) => {
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

    // Prevent deletion of system roles
    if (existingRole.isSystem) {
      return res.status(403).json({ message: "System roles cannot be deleted" });
    }

    const success = await storage.deleteRole(roleId);
    if (!success) {
      return res.status(404).json({ message: "Role not found or could not be deleted" });
    }

    res.status(204).send();
  } catch (error) {
    console.error("Error deleting role:", error);
    res.status(500).json({ message: "Failed to delete role" });
  }
});

export default roleRouter;