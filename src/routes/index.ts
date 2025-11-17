import { Router } from 'express';
import authRoutes from './auth';
import magicLinkRoutes from './magicLink';
import twoFactorRoutes from './twoFactor';
import fundsRoutes from './funds';
import usersRoutes from './users';
import watchlistRoutes from './watchlist';
import portfolioRoutes from './portfolio';
import marketIndicesRoutes from './marketIndices';
import newsRoutes from './news';
import adminRoutes from './admin';
import calculatorRoutes from './calculator';
import comparisonRoutes from './comparison';
import taxRoutes from './tax';
import mlRoutes from './ml';
import dataEnrichmentRoutes from './dataEnrichment';
import fundManagerRoutes from './fundManager';
import analysisRoutes from './analysis';
import goalsRoutes from './goals';

const router = Router();

router.use('/auth', authRoutes);
router.use('/auth/magic-link', magicLinkRoutes);
router.use('/auth/2fa', twoFactorRoutes);
router.use('/funds', fundsRoutes);
router.use('/users', usersRoutes);
router.use('/watchlist', watchlistRoutes);
router.use('/portfolio', portfolioRoutes);
router.use('/goals', goalsRoutes);
router.use('/market-indices', marketIndicesRoutes);
router.use('/news', newsRoutes);
router.use('/admin', adminRoutes);
router.use('/calculator', calculatorRoutes);
router.use('/comparison', comparisonRoutes);
router.use('/tax', taxRoutes);
router.use('/ml', mlRoutes);
router.use('/ai', mlRoutes); // AI routes share ML router
router.use('/data-enrichment', dataEnrichmentRoutes); // Fund data enrichment from MFAPI
router.use('/fund-managers', fundManagerRoutes); // Fund manager population
router.use('/analysis', analysisRoutes); // Advanced analysis: overlap, SIP optimizer, manager track

export default router;
