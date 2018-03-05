import { Router } from 'express';
import User, { serializeUser } from './model';

const router = Router();

export { User, serializeUser } ;

export default router;
