import { Router } from 'express';
import {
  enable2FA,
  verify2FA,
  disable2FA,
  verify2FALogin,
} from '../controllers/twoFactorAuth';
import { authenticate } from '../middlewares/auth';

const router = Router();

// Enable 2FA (requires authentication)
router.post('/enable', authenticate, enable2FA);

// Verify 2FA setup (requires authentication)
router.post('/verify', authenticate, verify2FA);

// Disable 2FA (requires authentication)
router.post('/disable', authenticate, disable2FA);

// Verify 2FA during login (no auth required)
router.post('/verify-login', verify2FALogin);

export default router;
