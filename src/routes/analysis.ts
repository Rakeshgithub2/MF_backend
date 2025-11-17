/**
 * Analysis Routes
 * Fund Overlap, SIP Optimizer, Fund Manager Track
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { formatResponse } from '../utils/response';
import {
  analyzeFundOverlap,
  OverlapAnalysisInput,
} from '../services/fundOverlapService';
import {
  optimizeSipDate,
  SipOptimizerInput,
} from '../services/sipOptimizerService';
import {
  getFundManagerTrack,
  ManagerTrackInput,
} from '../services/fundManagerTrackService';

const router = Router();

// ==================== FUND OVERLAP ANALYSIS ====================

const overlapSchema = z.object({
  fundIds: z.array(z.string()).min(2).max(10),
});

/**
 * @route   POST /api/analysis/fund-overlap
 * @desc    Analyze overlap between multiple funds
 * @body    { fundIds: string[] }
 */
router.post('/fund-overlap', async (req: Request, res: Response) => {
  try {
    const { fundIds } = overlapSchema.parse(req.body);

    const input: OverlapAnalysisInput = { fundIds };
    const result = await analyzeFundOverlap(input);

    return res.json(
      formatResponse(result, 'Fund overlap analysis completed successfully')
    );
  } catch (error) {
    console.error('Fund overlap analysis error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to analyze fund overlap',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== SIP DATE OPTIMIZER ====================

const sipOptimizerSchema = z.object({
  fundId: z.string(),
  analysisMonths: z.number().min(12).max(60).optional(),
});

/**
 * @route   POST /api/analysis/sip-optimizer
 * @desc    Find optimal SIP date based on historical NAV data
 * @body    { fundId: string, analysisMonths?: number }
 */
router.post('/sip-optimizer', async (req: Request, res: Response) => {
  try {
    const { fundId, analysisMonths } = sipOptimizerSchema.parse(req.body);

    const input: SipOptimizerInput = {
      fundId,
      analysisMonths: analysisMonths || 36,
    };

    const result = await optimizeSipDate(input);

    return res.json(
      formatResponse(result, 'SIP date optimization completed successfully')
    );
  } catch (error) {
    console.error('SIP optimizer error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to optimize SIP date',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== FUND MANAGER TRACK RECORD ====================

const managerTrackSchema = z.object({
  fundId: z.string(),
});

/**
 * @route   POST /api/analysis/manager-track
 * @desc    Get comprehensive track record of fund manager
 * @body    { fundId: string }
 */
router.post('/manager-track', async (req: Request, res: Response) => {
  try {
    const { fundId } = managerTrackSchema.parse(req.body);

    const input: ManagerTrackInput = { fundId };
    const result = await getFundManagerTrack(input);

    return res.json(
      formatResponse(result, 'Fund manager track record retrieved successfully')
    );
  } catch (error) {
    console.error('Manager track error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        statusCode: 400,
        message: 'Validation error',
        errors: error.errors,
      });
    }

    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to get fund manager track record',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// ==================== BATCH ANALYSIS ====================

/**
 * @route   POST /api/analysis/batch
 * @desc    Run multiple analyses in one request
 * @body    { fundIds: string[], analyses: string[] }
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { fundIds, analyses } = req.body;

    if (!fundIds || !Array.isArray(fundIds) || fundIds.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message: 'fundIds array is required',
      });
    }

    if (!analyses || !Array.isArray(analyses) || analyses.length === 0) {
      return res.status(400).json({
        statusCode: 400,
        message:
          'analyses array is required (e.g., ["overlap", "sip-optimizer", "manager-track"])',
      });
    }

    const results: any = {};

    // Fund Overlap
    if (analyses.includes('overlap') && fundIds.length >= 2) {
      try {
        results.overlap = await analyzeFundOverlap({ fundIds });
      } catch (error) {
        results.overlap = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // SIP Optimizer (for first fund)
    if (analyses.includes('sip-optimizer') && fundIds.length > 0) {
      try {
        results.sipOptimizer = await optimizeSipDate({
          fundId: fundIds[0],
          analysisMonths: 36,
        });
      } catch (error) {
        results.sipOptimizer = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    // Manager Track (for first fund)
    if (analyses.includes('manager-track') && fundIds.length > 0) {
      try {
        results.managerTrack = await getFundManagerTrack({
          fundId: fundIds[0],
        });
      } catch (error) {
        results.managerTrack = {
          error: error instanceof Error ? error.message : 'Unknown error',
        };
      }
    }

    return res.json(
      formatResponse(results, 'Batch analysis completed successfully')
    );
  } catch (error) {
    console.error('Batch analysis error:', error);
    return res.status(500).json({
      statusCode: 500,
      message: 'Failed to complete batch analysis',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
