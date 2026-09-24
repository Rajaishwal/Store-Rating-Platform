import { Router } from 'express';
import authRoutes from './auth.js';
import storeRoutes from './stores.js';
import adminRoutes from './admin.js';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

router.use('/auth', authRoutes);
router.use('/stores', storeRoutes);
router.use('/admin', adminRoutes);

export default router;
