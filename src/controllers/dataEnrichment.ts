import { Request, Response } from 'express';
import { fundDataEnrichmentService } from '../services/fundDataEnrichment';

/**
 * Get all available funds from MFAPI
 */
export const getAllFunds = async (req: Request, res: Response) => {
  try {
    const funds = await fundDataEnrichmentService.fetchAllFunds();

    res.json({
      success: true,
      total: funds.length,
      data: funds,
    });
  } catch (error) {
    console.error('Error fetching all funds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch funds list',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Enrich single fund by scheme code
 */
export const enrichSingleFund = async (req: Request, res: Response) => {
  try {
    const { schemeCode } = req.params;

    if (!schemeCode) {
      return res.status(400).json({
        success: false,
        message: 'Scheme code is required',
      });
    }

    const enrichedData =
      await fundDataEnrichmentService.enrichFundData(schemeCode);

    if (!enrichedData) {
      return res.status(404).json({
        success: false,
        message: `No data found for scheme code: ${schemeCode}`,
      });
    }

    res.json({
      success: true,
      data: enrichedData,
    });
  } catch (error) {
    console.error('Error enriching fund:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enrich fund data',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Bulk enrich multiple funds
 * POST body: { schemeCodes: string[], batchSize?: number }
 */
export const bulkEnrichFunds = async (req: Request, res: Response) => {
  try {
    const { schemeCodes, batchSize = 10 } = req.body;

    if (
      !schemeCodes ||
      !Array.isArray(schemeCodes) ||
      schemeCodes.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message: 'schemeCodes array is required and must not be empty',
      });
    }

    // Start async processing (don't wait for completion)
    res.json({
      success: true,
      message: `Bulk enrichment started for ${schemeCodes.length} funds`,
      status: 'processing',
    });

    // Process in background
    fundDataEnrichmentService
      .bulkEnrichAndSave(schemeCodes, batchSize)
      .then((result) => {
        console.log('Bulk enrichment completed:', result);
      })
      .catch((error) => {
        console.error('Bulk enrichment failed:', error);
      });
  } catch (error) {
    console.error('Error starting bulk enrichment:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to start bulk enrichment',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Enrich top Indian funds (popular funds from major AMCs)
 */
export const enrichTopFunds = async (req: Request, res: Response) => {
  try {
    // Top Indian mutual fund scheme codes (from MFAPI)
    const topFunds = [
      '120503', // HDFC Top 100 Fund
      '120716', // HDFC Flexi Cap Fund
      '119551', // HDFC Balanced Advantage Fund
      '118989', // ICICI Prudential Bluechip Fund
      '120305', // ICICI Prudential Equity & Debt Fund
      '119598', // SBI Bluechip Fund
      '119226', // SBI Magnum Multi Cap Fund
      '100490', // Axis Bluechip Fund
      '120391', // Axis Midcap Fund
      '122639', // Mirae Asset Large Cap Fund
      '125497', // Mirae Asset Emerging Bluechip Fund
      '101305', // Kotak Standard Multicap Fund
      '119791', // Aditya Birla Sun Life Frontline Equity
      '118989', // Nippon India Large Cap Fund
      '101311', // DSP Equity Fund
      '118537', // Tata Large Cap Fund
      '100489', // UTI Nifty Index Fund
      '122639', // Parag Parikh Flexi Cap Fund
      '146788', // Quant Active Fund
    ];

    res.json({
      success: true,
      message: `Enrichment started for ${topFunds.length} top funds`,
      status: 'processing',
    });

    // Process in background
    fundDataEnrichmentService
      .bulkEnrichAndSave(topFunds, 5)
      .then((result) => {
        console.log('Top funds enrichment completed:', result);
      })
      .catch((error) => {
        console.error('Top funds enrichment failed:', error);
      });
  } catch (error) {
    console.error('Error enriching top funds:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enrich top funds',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};

/**
 * Search and enrich funds by name
 */
export const searchAndEnrichFunds = async (req: Request, res: Response) => {
  try {
    const { query, limit = 10 } = req.query;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required',
      });
    }

    // Get all funds
    const allFunds = await fundDataEnrichmentService.fetchAllFunds();

    // Filter by query
    const matchingFunds = allFunds
      .filter((f) => f.schemeName.toLowerCase().includes(query.toLowerCase()))
      .slice(0, parseInt(limit as string));

    if (matchingFunds.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No funds found matching: ${query}`,
      });
    }

    // Extract scheme codes
    const schemeCodes = matchingFunds.map((f) => f.schemeCode);

    res.json({
      success: true,
      message: `Enrichment started for ${matchingFunds.length} matching funds`,
      funds: matchingFunds,
      status: 'processing',
    });

    // Process in background
    fundDataEnrichmentService
      .bulkEnrichAndSave(schemeCodes, 5)
      .then((result) => {
        console.log('Search enrichment completed:', result);
      })
      .catch((error) => {
        console.error('Search enrichment failed:', error);
      });
  } catch (error) {
    console.error('Error in search and enrich:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search and enrich funds',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
