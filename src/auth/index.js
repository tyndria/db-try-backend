import {Router} from 'express';
import {BadRequestError} from 'utils/api';

import {serializeUser} from 'api/user';
import {requireFields} from 'utils/validation';
import {sendJson} from 'utils/api';

import passport, {authenticate} from './passport';

const router = Router();

router.post('/login', requireFields('email', 'password'), (req, res, next) =>
	authenticate('local-login', req, res, next)
		.then(serializeUser)
		.then(sendJson(res))
		.catch(next)
);
router.post('/register', requireFields('email', 'password'), (req, res, next) => {
	const {password} = req.body;

	if (password.length < 7) {
		return next(new BadRequestError({password: 'The password should consist of at least 6 symbols'}));
	}

	return authenticate('local-register', req, res, next)
		.then(serializeUser)
		.then(sendJson(res))
		.catch(next);
});

router.get('/logout', (req, res) => {
	req.logOut();
	res.sendStatus(200);
});

export {passport};

export default router;
