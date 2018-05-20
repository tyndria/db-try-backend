import Logs from './model';
import Scheme from '../scheme/model';
import {sendJson} from '../../utils/api';

export const create = async ({body}, res, next) => {
  return Logs(body)
    .save()
    .then(sendJson(res))
    .catch(next);
};

export const get = async ({params: {projectId}}, res, next) => {
  const schemas = await Scheme.find({projectId});
  const schemasName = schemas.map(scheme => scheme.name);
  return Logs
    .find({coll: {$in: schemasName}})
    .then(sendJson(res))
    .catch(next);
};