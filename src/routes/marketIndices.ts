import express from 'express';
import { getMarketIndices } from '../controllers/marketIndices';

const router = express.Router();

// GET /api/market-indices - Get live market indices data
router.get('/', getMarketIndices);

export default router;
