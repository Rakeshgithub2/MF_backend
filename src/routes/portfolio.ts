import { Router } from 'express';
import { authenticate } from '../middlewares/auth';
import {
  getPortfolios,
  getPortfolioById,
  createPortfolio,
  updatePortfolio,
  deletePortfolio,
  getPortfolioSummary,
} from '../controllers/portfolio';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get portfolio summary (aggregated data)
router.get('/summary', getPortfolioSummary);

// Get all portfolios
router.get('/', getPortfolios);

// Get portfolio by ID
router.get('/:id', getPortfolioById);

// Create new portfolio
router.post('/', createPortfolio);

// Update portfolio
router.put('/:id', updatePortfolio);

// Delete portfolio
router.delete('/:id', deletePortfolio);

export default router;
