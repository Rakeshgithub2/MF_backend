/**
 * ML & AI Routes
 * Routes for smart scoring, risk analysis, predictions, and AI chat
 */

import { Router, Request, Response } from 'express';
import { computeSmartScore, compareFunds } from '../ml/smartScore';
import { analyzeRisk, generateRiskProfile } from '../ml/riskAnalysis';
import { predictPerformance } from '../ml/performancePrediction';
import { generateChatResponse, searchFundsForQuery } from '../ai/chatService';

const router = Router();

/**
 * POST /api/ml/smart-score
 * Calculate smart score for a fund
 */
router.post('/smart-score', async (req: Request, res: Response) => {
  try {
    const input = req.body;

    if (!input || typeof input !== 'object') {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    const result = computeSmartScore(input);

    res.json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    console.error('Smart score error:', error);
    res.status(500).json({
      error: 'Failed to calculate smart score',
      message: error.message,
    });
  }
});

/**
 * POST /api/ml/risk-analysis
 * Analyze risk metrics for a fund
 */
router.post('/risk-analysis', async (req: Request, res: Response) => {
  try {
    const { returns, marketReturns, riskFreeRate } = req.body;

    if (!Array.isArray(returns) || returns.length === 0) {
      return res.status(400).json({ error: 'Returns array is required' });
    }

    const metrics = analyzeRisk(
      returns,
      marketReturns || [],
      riskFreeRate || 6.5
    );

    const profile = generateRiskProfile(metrics);

    res.json({
      success: true,
      data: {
        metrics,
        profile,
      },
    });
  } catch (error: any) {
    console.error('Risk analysis error:', error);
    res.status(500).json({
      error: 'Failed to analyze risk',
      message: error.message,
    });
  }
});

/**
 * POST /api/ml/predict-performance
 * Predict future performance based on historical NAV
 */
router.post('/predict-performance', async (req: Request, res: Response) => {
  try {
    const { navHistory } = req.body;

    if (!Array.isArray(navHistory) || navHistory.length === 0) {
      return res.status(400).json({ error: 'NAV history is required' });
    }

    const prediction = predictPerformance(navHistory);

    res.json({
      success: true,
      data: prediction,
    });
  } catch (error: any) {
    console.error('Prediction error:', error);
    res.status(500).json({
      error: 'Failed to predict performance',
      message: error.message,
    });
  }
});

/**
 * POST /api/ml/compare-funds
 * Compare two funds using ML scoring
 */
router.post('/compare-funds', async (req: Request, res: Response) => {
  try {
    const { fund1, fund2 } = req.body;

    if (!fund1 || !fund2) {
      return res
        .status(400)
        .json({ error: 'Two funds required for comparison' });
    }

    const comparison = compareFunds(fund1, fund2);

    res.json({
      success: true,
      data: comparison,
    });
  } catch (error: any) {
    console.error('Fund comparison error:', error);
    res.status(500).json({
      error: 'Failed to compare funds',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai/chat
 * AI-powered chat assistant with RAG
 */
router.post('/chat', async (req: Request, res: Response) => {
  try {
    const { query, context } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required' });
    }

    const response = await generateChatResponse(query, context);

    res.json({
      success: true,
      data: response,
    });
  } catch (error: any) {
    console.error('Chat error:', error);
    res.status(500).json({
      error: 'Failed to generate response',
      message: error.message,
    });
  }
});

/**
 * POST /api/ai/search-funds
 * Search for relevant funds based on natural language query
 */
router.post('/search-funds', async (req: Request, res: Response) => {
  try {
    const { query, funds } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query string is required' });
    }

    if (!Array.isArray(funds)) {
      return res.status(400).json({ error: 'Funds array is required' });
    }

    const results = await searchFundsForQuery(query, funds);

    res.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Fund search error:', error);
    res.status(500).json({
      error: 'Failed to search funds',
      message: error.message,
    });
  }
});

export default router;
