import { Router } from 'express';
import authRoutes from './auth.js';
import storeRoutes from './stores.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);

export default router;
