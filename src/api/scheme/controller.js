import Scheme from './model';
import { sendJson } from '../../utils/api';

export const getAll = (req, res, next) => {
	return Scheme.find()
		.then(sendJson(res))
		.catch(next);
};

export const create = async ({ body }, res, next) => {
	return Scheme(body)
		.save()
		.then(sendJson(res))
		.catch(next);
};