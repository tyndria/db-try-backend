import { Router } from 'express';
import projectRoutes from 'api/project';

const router = Router();

router.use('/projects', projectRoutes);

export default router;
