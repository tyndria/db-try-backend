import { Router } from 'express';

import * as controller from './controller';
import Logs from './model';

const router = Router();

router.get('/', controller.getAll);
router.post('/', controller.create);

export { Logs };
export default router;