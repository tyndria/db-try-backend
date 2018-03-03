import { Router } from 'express';

import * as controller from './controller';
import Scheme from './model';

const router = Router();

router.get('/', controller.getAll);
/* request 'save' unite request create and update */
router.put('/save', controller.save);

router.post('/', controller.create);
router.put('/', controller.update);

router.get('/:projectId', controller.getByProjectId);

export { Scheme };
export default router;
