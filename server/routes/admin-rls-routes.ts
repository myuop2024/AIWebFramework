import { Router } from 'express';
import { ensureAdmin } from '../middleware/auth';
import { db } from '../db';
import logger from '../utils/logger';

const router = Router();

// Get RLS status and policies
router.get('/status', ensureAdmin, async (req, res) => {
  try {
    // Check if RLS is enabled on tables
    const rlsStatusQuery = `
      SELECT 
        schemaname,
        tablename,
        rowsecurity
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND rowsecurity = true;
    `;
    
    const rlsStatus = await db.execute(rlsStatusQuery);

    // Get all RLS policies
    const policiesQuery = `
      SELECT 
        schemaname,
        tablename,
        policyname,
        permissive,
        roles,
        cmd,
        qual
      FROM pg_policies
      WHERE schemaname = 'public'
      ORDER BY tablename, policyname;
    `;
    
    const policies = await db.execute(policiesQuery);

    // Get current user context from session variables
    const userContextQuery = `
      SELECT 
        current_setting('app.current_user_id', true) as current_user_id,
        current_setting('app.current_user_role', true) as current_user_role;
    `;
    
    const userContext = await db.execute(userContextQuery);

    res.json({
      enabled: rlsStatus.length > 0,
      tables: rlsStatus,
      policies: policies,
      userContext: userContext[0] || { current_user_id: null, current_user_role: null }
    });
  } catch (error) {
    logger.error('Error fetching RLS status:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RLS status'
    });
  }
});

// Test RLS policies
router.post('/test', ensureAdmin, async (req, res) => {
  try {
    const { userId, userRole, testQuery } = req.body;

    if (!userId || !userRole) {
      return res.status(400).json({
        success: false,
        message: 'User ID and role are required for testing'
      });
    }

    // Set user context for testing
    await db.execute(`SELECT set_config('app.current_user_id', $1, false)`, [userId.toString()]);
    await db.execute(`SELECT set_config('app.current_user_role', $1, false)`, [userRole]);

    let testResult;
    if (testQuery) {
      // Execute test query with RLS context
      testResult = await db.execute(testQuery);
    } else {
      // Default test: count accessible records in main tables
      const testQueries = [
        'SELECT COUNT(*) as count, \'users\' as table_name FROM users',
        'SELECT COUNT(*) as count, \'reports\' as table_name FROM reports',
        'SELECT COUNT(*) as count, \'assignments\' as table_name FROM assignments',
        'SELECT COUNT(*) as count, \'polling_stations\' as table_name FROM polling_stations'
      ];

      testResult = [];
      for (const query of testQueries) {
        try {
          const result = await db.execute(query);
          testResult.push(result[0]);
        } catch (error) {
          testResult.push({
            table_name: query.split('\'')[1],
            count: 'ERROR',
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }
    }

    res.json({
      success: true,
      testContext: { userId, userRole },
      result: testResult
    });
  } catch (error) {
    logger.error('Error testing RLS policies:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test RLS policies',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Get RLS performance metrics
router.get('/metrics', ensureAdmin, async (req, res) => {
  try {
    // Get query performance stats for RLS-enabled tables
    const metricsQuery = `
      SELECT 
        schemaname,
        relname as table_name,
        seq_scan,
        seq_tup_read,
        idx_scan,
        idx_tup_fetch,
        n_tup_ins,
        n_tup_upd,
        n_tup_del
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY relname;
    `;
    
    const metrics = await db.execute(metricsQuery);

    // Get active RLS policies count
    const policyCountQuery = `
      SELECT 
        COUNT(*) as total_policies,
        COUNT(DISTINCT tablename) as protected_tables
      FROM pg_policies
      WHERE schemaname = 'public';
    `;
    
    const policyCounts = await db.execute(policyCountQuery);

    res.json({
      success: true,
      tableMetrics: metrics,
      summary: policyCounts[0] || { total_policies: 0, protected_tables: 0 }
    });
  } catch (error) {
    logger.error('Error fetching RLS metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch RLS metrics'
    });
  }
});

export default router;