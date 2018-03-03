import { Router } from 'express';
import schemeRoutes from 'api/scheme';
import projectRoutes from 'api/project';
import userRoutes from 'api/user';
import authRoutes from 'auth';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/schemas', schemeRoutes);
router.use('/users', userRoutes);
router.use('/auth', authRoutes);

export default router;
