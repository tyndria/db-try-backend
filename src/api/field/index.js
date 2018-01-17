import { Router } from 'express';

import * as controller from './controller';
import Field from './model';

const router = Router();

router.post('/', controller.create);

export { Field };
export default router;
