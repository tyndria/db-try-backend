import {isObjectIdValid} from '../../utils/objectId';

import Scheme from './model';
import Project from '../project/model';
import Field from '../field/model';
import {sendJson} from '../../utils/api';

export const getAll = (req, res, next) => {
	return Scheme.find()
		.then(sendJson(res))
		.catch(next);
};

export const save = async (req, res, next) => {
	const body = req.body;

	if (isObjectIdValid(body.schemeId)) {
		const scheme = await Scheme.findById(body.schemeId);

		if (scheme) {
			return update(req, res, next);
		}
	}
	return create(req, res, next);
};

/* TODO: refactor create and update functions */
export const create = async ({body}, res, next) => {
	let data;
	let code;
	try {
		const schemeProject = await Project.findById(body.projectId);
		const schemeBody = {
			projectId: schemeProject._id,
			fields: []
		};

		if (body.name) {
			schemeBody.name = body.name;
		}

		/* Field is object with key is id and value is object {type, name} */
		const fieldsToSave = body.fields;
		const keys = Object.keys(fieldsToSave);

		for (let i = 0; i < keys.length; i++) {
			try {
				const field = Field(fieldsToSave[keys[i]]);
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

			data = scheme;
		} catch (err) {
			data = err;
			code = 400;
		}
		sendJson(res, code)(data);
	} catch (err) {
		next(err);
	}
};

export const getByProjectId = ({params}, res, next) => {
	const projectId = params.projectId;
	return Scheme.find({projectId})
		.populate('fields')
		.then(sendJson(res))
		.catch(next);
};

export const update = async ({body}, res, next) => {
	let data;
	let code;
	try {
		const scheme = await Scheme.findById(body.schemeId);

		if (body.name) {
			scheme.name = body.name;
		}

		/* Field is object with key is id and value is object {type, name} */
		const fieldsToUpdate = body.fields;
		const fieldsIds = Object.keys(body.fields);

		for (let i = 0; i < fieldsIds.length; i++) {
			try {
				if (!isObjectIdValid(fieldsIds[i])) {
					const field = Field(fieldsToUpdate[fieldsIds[i]]);
					await field.save();
					scheme.fields.push(field._id);
				} else {
					const field = await Field.findById(fieldsIds[i]);
					await Field.update({_id: field._id}, fieldsToUpdate[fieldsIds[i]], {upsert: true});
				}
			} catch (err) {
				data = err;
				code = 400;
			}
		}

		try {
			await Scheme.update({_id: scheme.id}, scheme, {upsert: true});

			data = scheme;
		} catch (err) {
			data = err;
			code = 400;
		}
		sendJson(res, code)(data);
	} catch (err) {
    next(err);
  }
};

export const remove = async ({params}, res, next) => {
	const schemeId = params.schemeId;
	try {
    const scheme = await Scheme.findById(schemeId);
    for (let i = 0; i < scheme.fields.length; i ++) {
      await Field.findByIdAndRemove(scheme.fields[i]);
		}
		return scheme.remove().then(sendJson(res)).catch(next);
	} catch (err) {
    next(err);
  }
};
