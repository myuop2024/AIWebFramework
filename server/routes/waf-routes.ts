import { Router } from 'express';
import { WAFEngine } from '../middleware/waf';
import { ensureAdmin } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Global WAF instance (will be initialized in server setup)
let wafEngine: WAFEngine;

export function setWAFEngine(engine: WAFEngine) {
  wafEngine = engine;
}

// Get WAF statistics and configuration
router.get('/stats', ensureAdmin, (req, res) => {
  try {
    const stats = wafEngine.getStats();
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting WAF stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve WAF statistics'
    });
  }
});

// Update WAF configuration
router.patch('/config', ensureAdmin, (req, res) => {
  try {
    const { config } = req.body;
    
    if (!config) {
      return res.status(400).json({
        success: false,
        message: 'Configuration object is required'
      });
    }

    wafEngine.updateConfig(config);
    
    logger.info('WAF configuration updated by admin', {
      userId: (req as any).user?.id,
      config
    });

    res.json({
      success: true,
      message: 'WAF configuration updated successfully'
    });
  } catch (error) {
    logger.error('Error updating WAF config:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update WAF configuration'
    });
  }
});

// Block an IP address
router.post('/block-ip', ensureAdmin, (req, res) => {
  try {
    const { ip, reason } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }

    // Basic IP validation
    const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid IP address format'
      });
    }

    wafEngine.blockIP(ip);

    logger.warn('IP address manually blocked by admin', {
      userId: (req as any).user?.id,
      blockedIP: ip,
      reason: reason || 'Manual block by admin'
    });

    res.json({
      success: true,
      message: `IP address ${ip} has been blocked`
    });
  } catch (error) {
    logger.error('Error blocking IP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to block IP address'
    });
  }
});

// Unblock an IP address
router.post('/unblock-ip', ensureAdmin, (req, res) => {
  try {
    const { ip } = req.body;

    if (!ip) {
      return res.status(400).json({
        success: false,
        message: 'IP address is required'
      });
    }

    wafEngine.unblockIP(ip);

    logger.info('IP address unblocked by admin', {
      userId: (req as any).user?.id,
      unblockedIP: ip
    });

    res.json({
      success: true,
      message: `IP address ${ip} has been unblocked`
    });
  } catch (error) {
    logger.error('Error unblocking IP:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unblock IP address'
    });
  }
});

// Get blocked IPs list
router.get('/blocked-ips', ensureAdmin, (req, res) => {
  try {
    const stats = wafEngine.getStats();
    res.json({
      success: true,
      data: {
        blockedIPs: stats.blockedIPs,
        total: stats.blockedIPs.length
      }
    });
  } catch (error) {
    logger.error('Error getting blocked IPs:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve blocked IPs'
    });
  }
});

// Get suspicious activity report
router.get('/suspicious-activity', ensureAdmin, (req, res) => {
  try {
    const stats = wafEngine.getStats();
    
    // Convert suspicious activity to array format for easier frontend handling
    const suspiciousActivity = Object.entries(stats.suspiciousActivity).map(([ip, activity]) => ({
      ip,
      count: activity.count,
      lastSeen: new Date(activity.lastSeen).toISOString(),
      threat_level: activity.count > 5 ? 'HIGH' : activity.count > 2 ? 'MEDIUM' : 'LOW'
    }));

    res.json({
      success: true,
      data: {
        suspiciousActivity: suspiciousActivity.sort((a, b) => b.count - a.count),
        total: suspiciousActivity.length
      }
    });
  } catch (error) {
    logger.error('Error getting suspicious activity:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve suspicious activity'
    });
  }
});

// Test WAF rules (for testing specific inputs)
router.post('/test-rules', ensureAdmin, (req, res) => {
  try {
    const { testInput } = req.body;

    if (!testInput) {
      return res.status(400).json({
        success: false,
        message: 'Test input is required'
      });
    }

    // Create a mock request for testing
    const mockReq = {
      body: { test: testInput },
      query: {},
      params: {},
      originalUrl: '/test',
      method: 'POST',
      headers: {},
      connection: {}
    } as any;

    // Test the WAF rules
    const wafMiddleware = wafEngine.middleware();
    let blocked = false;
    let blockReason = '';

    const mockRes = {
      status: () => ({
        json: (data: any) => {
          blocked = true;
          blockReason = data.error || 'Request blocked';
          return mockRes;
        }
      })
    } as any;

    const mockNext = () => {
      // Request passed WAF
    };

    wafMiddleware(mockReq, mockRes, mockNext);

    res.json({
      success: true,
      data: {
        input: testInput,
        blocked,
        reason: blockReason,
        passed: !blocked
      }
    });
  } catch (error) {
    logger.error('Error testing WAF rules:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test WAF rules'
    });
  }
});

// Get WAF security events (this would integrate with your logging system)
router.get('/security-events', ensureAdmin, (req, res) => {
  try {
    const { limit = 50, severity } = req.query;

    // This is a placeholder - you would integrate with your actual logging system
    // For now, return a simple response indicating the feature needs log integration
    res.json({
      success: true,
      data: {
        events: [],
        total: 0,
        message: 'Security events are logged but require log aggregation service integration'
      }
    });
  } catch (error) {
    logger.error('Error getting security events:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve security events'
    });
  }
});

export default router;