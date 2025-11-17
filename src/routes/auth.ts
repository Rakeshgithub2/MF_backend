import { Router } from 'express';
import { register, login, refreshTokens } from '../controllers/auth';
import {
  redirectToGoogle,
  handleGoogleCallback,
} from '../controllers/googleAuth';

const router = Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh', refreshTokens);

// Google OAuth
router.get('/google', redirectToGoogle);
router.get('/google/callback', handleGoogleCallback);

export default router;
