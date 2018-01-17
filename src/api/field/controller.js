import Field from './model';
import {sendJson} from "../../utils/api"

export const create = async ({ body }, res, next) => {
	return Field(body)
		.save()
		.then(sendJson(res))
		.catch(next);
};