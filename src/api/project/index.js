import { Router } from 'express';

import * as controller from './controller';
import Project from './model';

const router = Router();

router.get('/', controller.getAll);

export { Project };
export default router;
