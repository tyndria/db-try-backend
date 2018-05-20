import { Router } from 'express';

import * as controller from './controller';
import Logs from './model';

const router = Router();

router.get('/:projectId', controller.get);
router.post('/', controller.create);

export { Logs };
export default router;