import { Router } from 'express';
import {requireAuth, verifyPermission} from "../../auth/middlewares"
import {permissions} from "../../constants/permissions";

import * as controller from './controller';
import Project from './model';

const router = Router();

router.get('/:userId', controller.getAll);
router.post('/', controller.create);
router.post('/run/:projectId', controller.run);

export { Project };
export default router;
