import express from 'express';
import rateLimit from 'express-rate-limit';
import { Express } from '../types';
import { getWords, getWord } from '../controllers/words';
import { getExamples, getExample } from '../controllers/examples';
import { getDeveloper, postDeveloper } from '../controllers/developers';
import { getStats } from '../controllers/stats';
import validId from '../middleware/validId';
import validateDeveloperBody from '../middleware/validateDeveloperBody';
import validateApiKey from '../middleware/validateApiKey';
import validateAdminApiKey from '../middleware/validateAdminApiKey';
import attachRedisClient from '../middleware/attachRedisClient';
import analytics from '../middleware/analytics';
import { login } from '../controllers/auth/login';
import { logout } from '../controllers/auth/logout';
import { isAuthenticated } from '../middleware/authenticated';

const router = express.Router();

const FIFTEEN_MINUTES = 15 * 60 * 1000;
const REQUESTS_PER_MS = 20;
const createDeveloperLimiter: Express.MiddleWare = rateLimit({
  windowMs: FIFTEEN_MINUTES,
  max: REQUESTS_PER_MS,
});

// Google Analytics
router.use(analytics);

router.get('/words', validateApiKey, attachRedisClient, getWords);
router.get('/words/:id', validateApiKey, validId, attachRedisClient, getWord);
router.get('/examples', validateApiKey, attachRedisClient, getExamples);
router.get('/examples/:id', validateApiKey, validId, attachRedisClient, getExample);

router.post('/developers', createDeveloperLimiter, validateDeveloperBody, postDeveloper);
router.get('/developers/account', attachRedisClient, getDeveloper);

router.get('/stats', validateAdminApiKey, attachRedisClient, getStats);
router.post('/login', login);
router.post('/logout', isAuthenticated, logout);

export default router;
