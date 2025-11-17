import { Router } from 'express';
import {
  getFundRiskMetrics,
  compareRiskMetrics,
} from '../controllers/riskMetrics';

const router = Router();

// Get risk metrics for a specific fund
router.get('/funds/:fundId/risk-metrics', getFundRiskMetrics);

// Compare risk metrics across multiple funds
router.post('/risk-metrics/compare', compareRiskMetrics);

export default router;
