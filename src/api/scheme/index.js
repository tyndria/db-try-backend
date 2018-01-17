import { Router } from 'express';

import * as controller from './controller';
import Scheme from './model';

const router = Router();

router.get('/', controller.getAll);
router.post('/', controller.create);

export { Scheme };
export default router;