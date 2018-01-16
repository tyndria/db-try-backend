import { Router } from 'express';
import schemeRoutes from 'api/scheme';
import projectRoutes from 'api/project';

const router = Router();

router.use('/projects', projectRoutes);
router.use('/schemas', schemeRoutes);

export default router;
