import { Router } from 'express';
import { sendMagicLink, verifyMagicLink } from '../controllers/magicLinkAuth';

const router = Router();

// Send magic link to email
router.post('/send', sendMagicLink);

// Verify magic link token
router.get('/verify', verifyMagicLink);

export default router;
