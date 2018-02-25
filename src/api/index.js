import { Router } from 'express';
import schemeRoutes from 'api/scheme';
import projectRoutes from 'api/project';
import userRoutes from 'api/user';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/schemas', schemeRoutes);
router.use('/users', userRoutes);

export default router;
