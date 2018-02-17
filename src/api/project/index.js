import { Router } from 'express';

import * as controller from './controller';
import Project from './model';

const router = Router();

router.get('/', controller.getAll);
router.post('/', controller.create);
router.get('/run/:projectId', controller.run);

export { Project };
export default router;
