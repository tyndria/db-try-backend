import Project, { serializeProject } from './model';
import { sendJson } from '../../utils/api';

export const getAll = (req, res, next) => {
	return Project.find()
		.populate('schemas')
		.then(projects => projects.map(serializeProject))
		.then(sendJson(res))
		.catch(next);
};

export const create = async ({ body }, res, next) => {
	return Project(body)
		.save()
		.then(serializeProject)
		.then(sendJson(res))
		.catch(next);
};