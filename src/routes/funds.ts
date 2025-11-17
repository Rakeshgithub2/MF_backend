import { Router } from 'express';
import {
  getFunds,
  getFundById,
  getFundNavs,
} from '../controllers/funds.simple';

const router = Router();

// Search endpoint (alias for getFunds with query parameter)
router.get('/search', getFunds);

router.get('/', getFunds);
router.get('/:id', getFundById);
router.get('/:id/navs', getFundNavs);

export default router;
