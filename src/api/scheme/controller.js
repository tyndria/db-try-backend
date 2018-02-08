import Scheme from './model';
import Project from '../project/model';
import Field from '../field/model';
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

export const update = async ({ body }, res, next) => {
	let data;
	let code;
	try {
		const schemeProject = await Project.findById(body.projectId);
		const schemeBody = {
			projectId: schemeProject._id,
			fields: []
		};

		if(body.name) {
			schemeBody.name = body.name;
		}

		const fieldsToSave = body.fields;

		/*  TODO: fields array consists of object with id as a key */
		for (let i = 0; i < fieldsToSave.length; i ++) {
			try {
				const field = Field(fieldsToSave[i]);
				await field.save();
				schemeBody.fields.push(field._id);
			} catch (err) {
				data = err;
				code = 400;
			}
		}

		try {
			const scheme = Scheme(schemeBody);
			await scheme.save();
			if (schemeProject) {
				schemeProject.schemas.push(scheme._id);
				await schemeProject.save
			}
		} catch (err) {
			data = err;
			code = 400;
		}
		sendJson(res, code)(data);
	} catch (err) {
		next(err);
	}
};