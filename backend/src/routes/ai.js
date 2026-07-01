import express from 'express';
import { generateCode, getMessages } from '../services/ai.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.use(authenticate);

router.post('/:projectId/generate', generateCode);
router.get('/:projectId/messages', getMessages);

export default router;
