import { Router } from 'express';
import * as authController from '../controllers/auth.js';
import * as oauthController from '../controllers/oauth.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { registerSchema, loginSchema } from '../validators/index.js';

const router = Router();

// Email/Password Auth
router.post('/register', validate(registerSchema), authController.register);
router.post('/login', validate(loginSchema), authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/logout', authController.logout);
router.post('/logout-all', authenticate, authController.logoutAll);

// User Info
router.get('/me', authenticate, authController.getCurrentUser);
router.get('/onboarding-status', authenticate, authController.checkOnboarding);

// Google OAuth
router.get('/google', oauthController.googleAuth);
router.get('/google/callback', oauthController.googleCallback);

// Apple OAuth
router.get('/apple', oauthController.appleAuth);
router.post('/apple/callback', oauthController.appleCallback);

export default router;
