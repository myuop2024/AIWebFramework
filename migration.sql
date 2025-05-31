-- Migration script to update foreign key data types and remove redundant column
-- Generated based on changes to shared/schema.ts

-- Change data type of userId in documents table
ALTER TABLE documents ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of userId in assignments table
ALTER TABLE assignments ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of userId in reports table
ALTER TABLE reports ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of reviewedBy in reports table
ALTER TABLE reports ALTER COLUMN "reviewed_by" TYPE INTEGER USING "reviewed_by"::integer;

-- Change data type of userId in eventParticipation table
ALTER TABLE "event_participation" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of senderId in messages table
ALTER TABLE messages ALTER COLUMN "sender_id" TYPE INTEGER USING "sender_id"::integer;

-- Change data type of receiverId in messages table
ALTER TABLE messages ALTER COLUMN "receiver_id" TYPE INTEGER USING "receiver_id"::integer;

-- Change data type of createdBy in formTemplates table
ALTER TABLE "form_templates" ALTER COLUMN "created_by" TYPE INTEGER USING "created_by"::integer;

-- Change data type of createdBy in registrationForms table
ALTER TABLE "registration_forms" ALTER COLUMN "created_by" TYPE INTEGER USING "created_by"::integer;

-- Change data type of importedBy in userImportLogs table
ALTER TABLE "user_import_logs" ALTER COLUMN "imported_by" TYPE INTEGER USING "imported_by"::integer;

-- Change data type of userId in trainingProgress table
ALTER TABLE "training_progress" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of userId in externalUserMappings table
ALTER TABLE "external_user_mappings" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of userId in photoApprovals table
ALTER TABLE "photo_approvals" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of approvedBy in photoApprovals table
ALTER TABLE "photo_approvals" ALTER COLUMN "approved_by" TYPE INTEGER USING "approved_by"::integer;

-- Change data type of userId in errorLogs table
ALTER TABLE "error_logs" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of resolvedBy in errorLogs table
ALTER TABLE "error_logs" ALTER COLUMN "resolved_by" TYPE INTEGER USING "resolved_by"::integer;

-- Change data type of createdBy in projects table
ALTER TABLE projects ALTER COLUMN "created_by" TYPE INTEGER USING "created_by"::integer;

-- Change data type of createdBy in milestones table
ALTER TABLE milestones ALTER COLUMN "created_by" TYPE INTEGER USING "created_by"::integer;

-- Change data type of assignedTo in tasks table
ALTER TABLE tasks ALTER COLUMN "assigned_to" TYPE INTEGER USING "assigned_to"::integer;

-- Change data type of createdBy in tasks table
ALTER TABLE tasks ALTER COLUMN "created_by" TYPE INTEGER USING "created_by"::integer;

-- Change data type of userId in projectMembers table
ALTER TABLE "project_members" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of userId in taskComments table
ALTER TABLE "task_comments" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of userId in taskAttachments table
ALTER TABLE "task_attachments" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Change data type of userId in taskHistory table
ALTER TABLE "task_history" ALTER COLUMN "user_id" TYPE INTEGER USING "user_id"::integer;

-- Remove redundant pollingStationId column from reports table
ALTER TABLE reports DROP COLUMN "polling_station_id";

-- End of migration script
