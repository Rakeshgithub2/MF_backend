import { Router } from 'express';
import { populateAllManagersHandler } from '../controllers/fundManager';

const router = Router();

/**
 * @route   POST /api/fund-managers/populate
 * @desc    Populate all funds with realistic manager data
 * @access  Public (should be protected in production)
 */
router.post('/populate', populateAllManagersHandler);

export default router;
