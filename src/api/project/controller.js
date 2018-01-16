import Project from './model';
import { sendJson } from '../../utils/api';

export const getAll = (req, res, next) => {
	return Project.find({ active: true })
		.populate('schemas')
		.then(sendJson(res))
		.catch(next);
};

export const create = async ({ body }, res, next) => {
	return Project(body)
		.save()
		.then(sendJson(res))
		.catch(next);
};