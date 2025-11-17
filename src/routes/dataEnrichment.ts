import { Router } from 'express';
import {
  getAllFunds,
  enrichSingleFund,
  bulkEnrichFunds,
  enrichTopFunds,
  searchAndEnrichFunds,
} from '../controllers/dataEnrichment';

const router = Router();

/**
 * @route   GET /api/data-enrichment/funds/all
 * @desc    Get all available funds from MFAPI
 * @access  Public
 */
router.get('/funds/all', getAllFunds);

/**
 * @route   GET /api/data-enrichment/funds/:schemeCode
 * @desc    Enrich single fund by scheme code
 * @access  Public
 */
router.get('/funds/:schemeCode', enrichSingleFund);

/**
 * @route   POST /api/data-enrichment/bulk
 * @desc    Bulk enrich multiple funds
 * @body    { schemeCodes: string[], batchSize?: number }
 * @access  Public
 */
router.post('/bulk', bulkEnrichFunds);

/**
 * @route   POST /api/data-enrichment/top-funds
 * @desc    Enrich top Indian mutual funds
 * @access  Public
 */
router.post('/top-funds', enrichTopFunds);

/**
 * @route   GET /api/data-enrichment/search
 * @desc    Search and enrich funds by name
 * @query   query (string), limit (number, default 10)
 * @access  Public
 */
router.get('/search', searchAndEnrichFunds);

export default router;
